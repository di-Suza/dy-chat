import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Message.js";
import { ApiError } from "../utils/ApiError.js";
import { serializeMessage } from "../utils/serializeMessage.js";
import {
  createSignedImageKitUrl,
  deleteImageKitFile
} from "./imageKit.service.js";
import {
  getConversationForParticipant,
  serializeConversationForUser
} from "./conversation.service.js";

const mediaMessageTypes = new Set(["image", "file", "video", "audio"]);

const getAttachmentKind = (mimeType = "") => {
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType.startsWith("video/")) {
    return "video";
  }

  if (mimeType.startsWith("audio/")) {
    return "audio";
  }

  return "file";
};

const createMessagePreview = ({ body, type }) => {
  if (type === "text") {
    return body.length > 120 ? `${body.slice(0, 120)}...` : body;
  }

  return `${type[0].toUpperCase()}${type.slice(1)} message`;
};

// Saves a message and updates conversation visibility/last-message metadata.
export const sendConversationMessage = async ({
  attachment = null,
  body = "",
  clientTempId = "",
  conversationId,
  senderId,
  type = "text"
}) => {
  const trimmedBody = body.trim();

  const messageType = attachment?.kind || type;

  if (messageType === "text" && !trimmedBody) {
    throw new ApiError(400, "Message text is required");
  }

  if (!mediaMessageTypes.has(messageType) && messageType !== "text") {
    throw new ApiError(400, "Unsupported message type");
  }

  if (messageType !== "text" && !attachment) {
    throw new ApiError(400, "Attachment file is required");
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
    attachments: attachment ? [attachment] : [],
    type: messageType
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
          type: messageType
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

// Returns a short-lived signed URL for a private attachment after access checks.
export const getMessageAttachmentAccessUrl = async ({
  attachmentId,
  messageId,
  userId
}) => {
  const message = await Message.findById(messageId);

  if (!message || message.isDeleted) {
    throw new ApiError(404, "Attachment not found");
  }

  await getConversationForParticipant({
    conversationId: message.conversation,
    userId
  });

  const attachment = message.attachments.id(attachmentId);

  if (!attachment) {
    throw new ApiError(404, "Attachment not found");
  }

  return {
    expiresIn: 300,
    url: createSignedImageKitUrl({
      expireSeconds: 300,
      path: attachment.path
    })
  };
};

export const createAttachmentPayload = ({ file, uploadedFile }) => {
  return {
    kind: getAttachmentKind(file.mimetype),
    mimeType: file.mimetype,
    name: file.originalname || "attachment",
    path: uploadedFile.path,
    publicId: uploadedFile.publicId,
    size: file.size || 0
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

  const attachmentPublicIds = (message.attachments || [])
    .map((attachment) => attachment.publicId)
    .filter(Boolean);

  message.attachments = [];
  message.body = "";
  message.deletedAt = new Date();
  message.isDeleted = true;
  await message.save();

  await Promise.all(attachmentPublicIds.map(deleteImageKitFile));

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
