import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Message.js";
import { ApiError } from "../utils/ApiError.js";
import { serializeMessage } from "../utils/serializeMessage.js";
import {
  getConversationForParticipant,
  serializeConversationForUser
} from "./conversation.service.js";

const mediaMessageTypes = new Set(["image", "file", "video", "audio"]);

const createMessagePreview = ({ body, type }) => {
  if (type === "text") {
    return body.length > 120 ? `${body.slice(0, 120)}...` : body;
  }

  return `${type[0].toUpperCase()}${type.slice(1)} message`;
};

// Saves a message and updates conversation visibility/last-message metadata.
export const sendConversationMessage = async ({
  body = "",
  clientTempId = "",
  conversationId,
  senderId,
  type = "text"
}) => {
  const trimmedBody = body.trim();

  if (type === "text" && !trimmedBody) {
    throw new ApiError(400, "Message text is required");
  }

  if (!mediaMessageTypes.has(type) && type !== "text") {
    throw new ApiError(400, "Unsupported message type");
  }

  const conversation = await getConversationForParticipant({
    conversationId,
    userId: senderId
  });

  const message = await Message.create({
    body: trimmedBody,
    clientTempId,
    conversation: conversation._id,
    readBy: [
      {
        readAt: new Date(),
        user: senderId
      }
    ],
    sender: senderId,
    type
  });

  const participantIds = conversation.participants.map((participant) =>
    participant._id?.toString?.() || participant.toString()
  );

  await Conversation.updateOne(
    {
      _id: conversation._id
    },
    {
      $addToSet: {
        visibleTo: {
          $each: participantIds
        }
      },
      $set: {
        lastMessage: message._id,
        lastMessageAt: message.createdAt,
        lastMessagePreview: createMessagePreview({
          body: trimmedBody,
          type
        }),
        lastMessageSender: senderId
      }
    }
  );

  const populatedMessage = await Message.findById(message._id).populate(
    "sender",
    "name email avatar isOnline lastSeen createdAt updatedAt"
  );
  const updatedConversation = await Conversation.findById(conversation._id)
    .populate("participants", "name email avatar isOnline lastSeen createdAt updatedAt")
    .populate({
      path: "lastMessage",
      populate: {
        path: "sender",
        select: "name email avatar isOnline lastSeen createdAt updatedAt"
      }
    });

  return {
    conversation: updatedConversation,
    conversationsByUser: await Promise.all(
      participantIds.map(async (participantId) => ({
        conversation: await serializeConversationForUser({
          conversation: updatedConversation,
          userId: participantId
        }),
        userId: participantId
      }))
    ),
    message: serializeMessage(populatedMessage),
    participantIds
  };
};

// Marks a sender-owned message as deleted for everyone in the conversation.
export const deleteConversationMessage = async ({ messageId, userId }) => {
  const message = await Message.findOne({
    _id: messageId,
    sender: userId
  });

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  const conversation = await getConversationForParticipant({
    conversationId: message.conversation,
    userId
  });

  if (message.type === "system") {
    throw new ApiError(400, "System messages cannot be deleted");
  }

  message.attachments = [];
  message.body = "";
  message.deletedAt = new Date();
  message.isDeleted = true;
  await message.save();

  const participantIds = conversation.participants.map((participant) =>
    participant._id?.toString?.() || participant.toString()
  );

  const lastMessageId =
    conversation.lastMessage?._id?.toString?.() ||
    conversation.lastMessage?.toString?.();

  if (lastMessageId === message._id.toString()) {
    await Conversation.updateOne(
      {
        _id: conversation._id
      },
      {
        $set: {
          lastMessagePreview: "Message deleted"
        }
      }
    );
  }

  const populatedMessage = await Message.findById(message._id).populate(
    "sender",
    "name email avatar isOnline lastSeen createdAt updatedAt"
  );
  const updatedConversation = await Conversation.findById(conversation._id)
    .populate("participants", "name email avatar isOnline lastSeen createdAt updatedAt")
    .populate({
      path: "lastMessage",
      populate: {
        path: "sender",
        select: "name email avatar isOnline lastSeen createdAt updatedAt"
      }
    });

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
    message: serializeMessage(populatedMessage),
    participantIds
  };
};
