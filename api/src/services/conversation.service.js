import mongoose from "mongoose";

import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Message.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { serializeConversation } from "../utils/serializeConversation.js";
import { serializeMessage } from "../utils/serializeMessage.js";
import { deleteImageKitFile } from "./imageKit.service.js";

const userPopulateFields = "name email avatar isOnline lastSeen createdAt updatedAt";

const normalizeId = (value) => {
  return value?._id?.toString?.() || value?.toString?.() || value;
};

const createDirectKey = (userA, userB) => {
  return [normalizeId(userA), normalizeId(userB)].sort().join(":");
};

const isSameId = (left, right) => normalizeId(left) === normalizeId(right);

const populateConversation = (query) => {
  return query
    .populate("participants", userPopulateFields)
    .populate({
      path: "lastMessage",
      populate: {
        path: "sender",
        select: userPopulateFields
      }
    });
};

const assertGroupAdmin = (conversation, userId) => {
  const isAdmin = (conversation.admins || []).some((adminId) =>
    isSameId(adminId, userId)
  );

  if (!isAdmin) {
    throw new ApiError(403, "Only group admins can manage this group");
  }
};

const getUnreadCountsForUser = async ({ conversationIds, userId }) => {
  if (!conversationIds.length) {
    return new Map();
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const counts = await Message.aggregate([
    {
      $match: {
        conversation: {
          $in: conversationIds.map((id) => new mongoose.Types.ObjectId(id))
        },
        sender: {
          $ne: userObjectId
        },
        readBy: {
          $not: {
            $elemMatch: {
              user: userObjectId
            }
          }
        }
      }
    },
    {
      $group: {
        _id: "$conversation",
        count: {
          $sum: 1
        }
      }
    }
  ]);

  return new Map(counts.map((item) => [item._id.toString(), item.count]));
};

export const serializeConversationForUser = async ({ conversation, userId }) => {
  const unreadCounts = await getUnreadCountsForUser({
    conversationIds: [conversation._id],
    userId
  });

  return serializeConversation(conversation, {
    currentUserId: userId,
    unreadCount: unreadCounts.get(conversation._id.toString()) || 0
  });
};

// Finds all conversations visible in the authenticated user's sidebar.
export const listUserConversations = async ({ userId }) => {
  const conversations = await populateConversation(
    Conversation.find({
      visibleTo: userId
    }).sort({
      lastMessageAt: -1,
      updatedAt: -1
    })
  );
  const unreadCounts = await getUnreadCountsForUser({
    conversationIds: conversations.map((conversation) => conversation._id),
    userId
  });

  return {
    conversations: conversations.map((conversation) =>
      serializeConversation(conversation, {
        currentUserId: userId,
        unreadCount: unreadCounts.get(conversation._id.toString()) || 0
      })
    )
  };
};

// Creates or reveals a direct conversation only for the user who clicked Start chat.
export const createDirectConversation = async ({ participantId, userId }) => {
  const currentUserId = normalizeId(userId);
  const otherUserId = normalizeId(participantId);

  if (currentUserId === otherUserId) {
    throw new ApiError(400, "You cannot start a chat with yourself");
  }

  const participant = await User.findById(otherUserId);

  if (!participant) {
    throw new ApiError(404, "User not found");
  }

  const directKey = createDirectKey(currentUserId, otherUserId);
  let conversation = await Conversation.findOneAndUpdate(
    {
      directKey
    },
    {
      $addToSet: {
        visibleTo: currentUserId
      }
    },
    {
      new: true
    }
  );

  if (!conversation) {
    try {
      conversation = await Conversation.create({
        createdBy: currentUserId,
        directKey,
        participants: [currentUserId, otherUserId],
        type: "direct",
        visibleTo: [currentUserId]
      });
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }

      conversation = await Conversation.findOneAndUpdate(
        {
          directKey
        },
        {
          $addToSet: {
            visibleTo: currentUserId
          }
        },
        {
          new: true
        }
      );
    }
  }

  const populatedConversation = await populateConversation(
    Conversation.findById(conversation._id)
  );

  return {
    conversation: await serializeConversationForUser({
      conversation: populatedConversation,
      userId: currentUserId
    })
  };
};

// Creates a group conversation with the creator as admin and all members visible.
export const createGroupConversation = async ({
  avatar = null,
  name,
  participantIds,
  userId
}) => {
  const currentUserId = normalizeId(userId);
  const uniqueParticipantIds = [
    ...new Set(
      [currentUserId, ...(participantIds || []).map(normalizeId)].filter(Boolean)
    )
  ];

  if (uniqueParticipantIds.length < 2) {
    throw new ApiError(400, "Select at least one group member");
  }

  const users = await User.find({
    _id: {
      $in: uniqueParticipantIds
    }
  }).select("_id");

  if (users.length !== uniqueParticipantIds.length) {
    throw new ApiError(404, "One or more users were not found");
  }

  const conversation = await Conversation.create({
    admins: [currentUserId],
    avatar: avatar || undefined,
    createdBy: currentUserId,
    name: name.trim(),
    participants: uniqueParticipantIds,
    type: "group",
    visibleTo: uniqueParticipantIds
  });

  const populatedConversation = await populateConversation(
    Conversation.findById(conversation._id)
  );

  return {
    conversationsByUser: await Promise.all(
      uniqueParticipantIds.map(async (participantId) => ({
        conversation: await serializeConversationForUser({
          conversation: populatedConversation,
          userId: participantId
        }),
        userId: participantId
      }))
    ),
    participantIds: uniqueParticipantIds
  };
};

// Loads one conversation if the user is a participant.
export const getConversationForParticipant = async ({ conversationId, userId }) => {
  const conversation = await populateConversation(
    Conversation.findOne({
      _id: conversationId,
      participants: userId
    })
  );

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  return conversation;
};

// Returns all messages for a conversation after participant access is verified.
export const listConversationMessages = async ({ conversationId, userId }) => {
  await getConversationForParticipant({
    conversationId,
    userId
  });

  const messages = await Message.find({
    conversation: conversationId
  })
    .populate("sender", userPopulateFields)
    .sort({
      createdAt: 1
    });

  return {
    messages
  };
};

// Marks all incoming unread messages as seen for the current user.
export const markConversationMessagesSeen = async ({ conversationId, userId }) => {
  const conversation = await getConversationForParticipant({
    conversationId,
    userId
  });
  const seenAt = new Date();
  const result = await Message.updateMany(
    {
      conversation: conversation._id,
      readBy: {
        $not: {
          $elemMatch: {
            user: userId
          }
        }
      },
      sender: {
        $ne: userId
      }
    },
    {
      $push: {
        readBy: {
          readAt: seenAt,
          user: userId
        }
      }
    }
  );

  const populatedConversation = await populateConversation(
    Conversation.findById(conversation._id)
  );

  return {
    conversation: populatedConversation,
    matchedCount: result.matchedCount,
    participantIds: conversation.participants.map(normalizeId),
    seenAt
  };
};

// Removes the current user from a group and creates a visible system message.
export const leaveGroupConversation = async ({ conversationId, userId }) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
    type: "group"
  }).populate("participants", userPopulateFields);

  if (!conversation) {
    throw new ApiError(404, "Group conversation not found");
  }

  const leavingUser = await User.findById(userId).select(userPopulateFields);
  const remainingParticipantIds = conversation.participants
    .map(normalizeId)
    .filter((participantId) => participantId !== normalizeId(userId));

  if (!remainingParticipantIds.length) {
    await Conversation.deleteOne({
      _id: conversation._id
    });

    return {
      conversationId: conversation._id.toString(),
      conversationsByUser: [],
      message: null,
      participantIds: [],
      removedUserId: normalizeId(userId)
    };
  }

  const systemMessage = await Message.create({
    body: `${leavingUser?.name || "A user"} left this group`,
    conversation: conversation._id,
    readBy: [normalizeId(userId), ...remainingParticipantIds].map((participantId) => ({
      readAt: new Date(),
      user: participantId
    })),
    sender: userId,
    type: "system"
  });

  const remainingAdmins = (conversation.admins || [])
    .map(normalizeId)
    .filter((adminId) => adminId !== normalizeId(userId));
  const nextAdmins = remainingAdmins.length
    ? remainingAdmins
    : [remainingParticipantIds[0]];

  await Conversation.updateOne(
    {
      _id: conversation._id
    },
    {
      $pull: {
        participants: userId,
        visibleTo: userId
      },
      $set: {
        admins: nextAdmins,
        lastMessage: systemMessage._id,
        lastMessageAt: systemMessage.createdAt,
        lastMessagePreview: systemMessage.body,
        lastMessageSender: userId
      }
    }
  );

  const populatedMessage = await Message.findById(systemMessage._id).populate(
    "sender",
    userPopulateFields
  );
  const updatedConversation = await populateConversation(
    Conversation.findById(conversation._id)
  );

  return {
    conversationId: conversation._id.toString(),
    conversationsByUser: await Promise.all(
      remainingParticipantIds.map(async (participantId) => ({
        conversation: await serializeConversationForUser({
          conversation: updatedConversation,
          userId: participantId
        }),
        userId: participantId
      }))
    ),
    message: serializeMessage(populatedMessage),
    participantIds: remainingParticipantIds,
    removedUserId: normalizeId(userId)
  };
};

// Updates group name/avatar after verifying the current user is an admin.
export const updateGroupConversation = async ({
  avatar = null,
  conversationId,
  name,
  userId
}) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
    type: "group"
  });

  if (!conversation) {
    throw new ApiError(404, "Group conversation not found");
  }

  assertGroupAdmin(conversation, userId);

  const oldAvatarPublicId = conversation.avatar?.publicId;

  if (name !== undefined) {
    conversation.name = name.trim();
  }

  if (avatar) {
    conversation.avatar = avatar;
  }

  await conversation.save();

  if (avatar && oldAvatarPublicId && oldAvatarPublicId !== avatar.publicId) {
    await deleteImageKitFile(oldAvatarPublicId);
  }

  const updatedConversation = await populateConversation(
    Conversation.findById(conversation._id)
  );
  const participantIds = updatedConversation.participants.map(normalizeId);

  return {
    conversationsByUser: await Promise.all(
      participantIds.map(async (participantId) => ({
        conversation: await serializeConversationForUser({
          conversation: updatedConversation,
          userId: participantId
        }),
        userId: participantId
      }))
    ),
    participantIds
  };
};

// Adds new members to an existing group and makes it visible in their sidebar.
export const addGroupMembers = async ({ conversationId, participantIds, userId }) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
    type: "group"
  });

  if (!conversation) {
    throw new ApiError(404, "Group conversation not found");
  }

  assertGroupAdmin(conversation, userId);

  const existingParticipantIds = new Set(conversation.participants.map(normalizeId));
  const newParticipantIds = [
    ...new Set((participantIds || []).map(normalizeId).filter(Boolean))
  ].filter((participantId) => !existingParticipantIds.has(participantId));

  if (!newParticipantIds.length) {
    throw new ApiError(400, "Select at least one new member");
  }

  const users = await User.find({
    _id: {
      $in: newParticipantIds
    }
  }).select("_id");

  if (users.length !== newParticipantIds.length) {
    throw new ApiError(404, "One or more users were not found");
  }

  await Conversation.updateOne(
    {
      _id: conversation._id
    },
    {
      $addToSet: {
        participants: {
          $each: newParticipantIds
        },
        visibleTo: {
          $each: newParticipantIds
        }
      }
    }
  );

  const updatedConversation = await populateConversation(
    Conversation.findById(conversation._id)
  );
  const allParticipantIds = updatedConversation.participants.map(normalizeId);

  return {
    conversationsByUser: await Promise.all(
      allParticipantIds.map(async (participantId) => ({
        conversation: await serializeConversationForUser({
          conversation: updatedConversation,
          userId: participantId
        }),
        userId: participantId
      }))
    ),
    existingParticipantIds: allParticipantIds.filter(
      (participantId) => !newParticipantIds.includes(participantId)
    ),
    newParticipantIds
  };
};

// Removes one member from a group after admin verification.
export const removeGroupMember = async ({ conversationId, memberId, userId }) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
    type: "group"
  });

  if (!conversation) {
    throw new ApiError(404, "Group conversation not found");
  }

  assertGroupAdmin(conversation, userId);

  if (isSameId(memberId, userId)) {
    throw new ApiError(400, "Use leave group to remove yourself");
  }

  const isMember = conversation.participants.some((participantId) =>
    isSameId(participantId, memberId)
  );

  if (!isMember) {
    throw new ApiError(404, "Member not found in this group");
  }

  const nextAdmins = (conversation.admins || [])
    .map(normalizeId)
    .filter((adminId) => adminId !== normalizeId(memberId));

  await Conversation.updateOne(
    {
      _id: conversation._id
    },
    {
      $pull: {
        admins: memberId,
        participants: memberId,
        visibleTo: memberId
      },
      $set: {
        admins: nextAdmins.length ? nextAdmins : [normalizeId(userId)]
      }
    }
  );

  const updatedConversation = await populateConversation(
    Conversation.findById(conversation._id)
  );
  const participantIds = updatedConversation.participants.map(normalizeId);

  return {
    conversationId: conversation._id.toString(),
    conversationsByUser: await Promise.all(
      participantIds.map(async (participantId) => ({
        conversation: await serializeConversationForUser({
          conversation: updatedConversation,
          userId: participantId
        }),
        userId: participantId
      }))
    ),
    participantIds,
    removedUserId: normalizeId(memberId)
  };
};

// Permanently deletes a group for every member after admin verification.
export const deleteGroupConversation = async ({ conversationId, userId }) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
    type: "group"
  });

  if (!conversation) {
    throw new ApiError(404, "Group conversation not found");
  }

  assertGroupAdmin(conversation, userId);

  const participantIds = conversation.participants.map(normalizeId);
  const avatarPublicId = conversation.avatar?.publicId;

  await Message.deleteMany({
    conversation: conversation._id
  });
  await Conversation.deleteOne({
    _id: conversation._id
  });

  if (avatarPublicId) {
    await deleteImageKitFile(avatarPublicId);
  }

  return {
    conversationId: conversation._id.toString(),
    participantIds
  };
};

// Returns participant ids after verifying the user belongs to the conversation.
export const getConversationParticipantIds = async ({ conversationId, userId }) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId
  }).select("participants");

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  return conversation.participants.map(normalizeId);
};

// Finds users who should receive this user's presence changes.
export const getPresenceRecipientIds = async (userId) => {
  const conversations = await Conversation.find({
    participants: userId
  }).select("participants");
  const recipients = new Set();

  conversations.forEach((conversation) => {
    conversation.participants.forEach((participantId) => {
      const participantKey = normalizeId(participantId);

      if (participantKey !== normalizeId(userId)) {
        recipients.add(participantKey);
      }
    });
  });

  return [...recipients];
};
