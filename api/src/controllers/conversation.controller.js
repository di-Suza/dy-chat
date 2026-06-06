import {
  addGroupMembers,
  createGroupConversation,
  createDirectConversation,
  deleteGroupConversation,
  leaveGroupConversation,
  listConversationMessages,
  listUserConversations,
  markConversationMessagesSeen,
  removeGroupMember,
  updateGroupConversation,
  serializeConversationForUser
} from "../services/conversation.service.js";
import { uploadGroupImageToImageKit } from "../services/imageKit.service.js";
import {
  emitConversationCreated,
  emitConversationRemoved,
  emitConversationUpdated,
  emitMessageCreated,
  emitMessagesSeen
} from "../services/realtime.service.js";
import { serializeMessage } from "../utils/serializeMessage.js";
import { serializeUser } from "../utils/serializeUser.js";

// Returns the authenticated user's visible conversation list.
export const getConversations = async (req, res) => {
  const result = await listUserConversations({
    userId: req.user._id
  });

  res.json({
    conversations: result.conversations,
    status: true
  });
};

// Creates or reveals a one-to-one conversation for the current user.
export const startDirectConversation = async (req, res) => {
  const result = await createDirectConversation({
    participantId: req.body.participantId,
    userId: req.user._id
  });

  emitConversationCreated({
    conversation: result.conversation,
    userId: req.user._id
  });

  res.status(201).json({
    conversation: result.conversation,
    status: true
  });
};

const parseParticipantIds = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().startsWith("[")) {
    return JSON.parse(value);
  }

  return value ? [value] : [];
};

// Creates a group chat and immediately adds it to every selected member's inbox.
export const startGroupConversation = async (req, res) => {
  const avatar = req.file
    ? await uploadGroupImageToImageKit({
        file: req.file,
        userId: req.user._id
      })
    : null;
  const result = await createGroupConversation({
    avatar,
    name: req.body.name,
    participantIds: parseParticipantIds(req.body.participantIds),
    userId: req.user._id
  });

  result.conversationsByUser.forEach((item) => {
    emitConversationCreated({
      conversation: item.conversation,
      userId: item.userId
    });
  });

  res.status(201).json({
    conversation: result.conversationsByUser.find(
      (item) => item.userId === req.user._id.toString()
    )?.conversation,
    status: true
  });
};

// Returns messages for one conversation after participant access is verified.
export const getConversationMessages = async (req, res) => {
  const result = await listConversationMessages({
    conversationId: req.params.conversationId,
    userId: req.user._id
  });

  res.json({
    messages: result.messages.map(serializeMessage),
    status: true
  });
};

// Marks incoming unread messages as seen and notifies conversation participants.
export const markConversationSeen = async (req, res) => {
  const result = await markConversationMessagesSeen({
    conversationId: req.params.conversationId,
    userId: req.user._id
  });

  emitMessagesSeen({
    conversationId: result.conversation._id.toString(),
    seenBy: serializeUser(req.user),
    userIds: result.participantIds
  });

  await Promise.all(
    result.participantIds.map(async (participantId) => {
      const conversation = await serializeConversationForUser({
        conversation: result.conversation,
        userId: participantId
      });

      emitConversationUpdated({
        conversation,
        userId: participantId
      });
    })
  );

  res.json({
    matchedCount: result.matchedCount,
    status: true
  });
};

// Removes the current user from a group and notifies remaining members.
export const leaveConversationGroup = async (req, res) => {
  const result = await leaveGroupConversation({
    conversationId: req.params.conversationId,
    userId: req.user._id
  });

  emitConversationRemoved({
    conversationId: result.conversationId,
    userId: result.removedUserId
  });

  result.participantIds.forEach((participantId) => {
    if (result.message) {
      emitMessageCreated({
        message: result.message,
        userId: participantId
      });
    }
  });

  result.conversationsByUser.forEach((item) => {
    emitConversationUpdated({
      conversation: item.conversation,
      userId: item.userId
    });
  });

  res.json({
    conversationId: result.conversationId,
    status: true
  });
};

// Updates group name/avatar and notifies every current member.
export const updateConversationGroup = async (req, res) => {
  const avatar = req.file
    ? await uploadGroupImageToImageKit({
        file: req.file,
        userId: req.user._id
      })
    : null;
  const result = await updateGroupConversation({
    avatar,
    conversationId: req.params.conversationId,
    name: req.body.name,
    userId: req.user._id
  });

  result.conversationsByUser.forEach((item) => {
    emitConversationUpdated({
      conversation: item.conversation,
      userId: item.userId
    });
  });

  res.json({
    conversation: result.conversationsByUser.find(
      (item) => item.userId === req.user._id.toString()
    )?.conversation,
    status: true
  });
};

// Adds selected users to a group and emits create/update events.
export const addConversationGroupMembers = async (req, res) => {
  const result = await addGroupMembers({
    conversationId: req.params.conversationId,
    participantIds: parseParticipantIds(req.body.participantIds),
    userId: req.user._id
  });

  result.conversationsByUser.forEach((item) => {
    const emit = result.newParticipantIds.includes(item.userId)
      ? emitConversationCreated
      : emitConversationUpdated;

    emit({
      conversation: item.conversation,
      userId: item.userId
    });
  });

  res.json({
    conversation: result.conversationsByUser.find(
      (item) => item.userId === req.user._id.toString()
    )?.conversation,
    status: true
  });
};

// Removes one member from a group and removes it from that user's inbox.
export const removeConversationGroupMember = async (req, res) => {
  const result = await removeGroupMember({
    conversationId: req.params.conversationId,
    memberId: req.params.memberId,
    userId: req.user._id
  });

  emitConversationRemoved({
    conversationId: result.conversationId,
    userId: result.removedUserId
  });

  result.conversationsByUser.forEach((item) => {
    emitConversationUpdated({
      conversation: item.conversation,
      userId: item.userId
    });
  });

  res.json({
    conversation: result.conversationsByUser.find(
      (item) => item.userId === req.user._id.toString()
    )?.conversation,
    status: true
  });
};

// Deletes the full group conversation for all members.
export const deleteConversationGroup = async (req, res) => {
  const result = await deleteGroupConversation({
    conversationId: req.params.conversationId,
    userId: req.user._id
  });

  result.participantIds.forEach((participantId) => {
    emitConversationRemoved({
      conversationId: result.conversationId,
      userId: participantId
    });
  });

  res.json({
    conversationId: result.conversationId,
    status: true
  });
};
