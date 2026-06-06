import { serializeUser } from "./serializeUser.js";

const serializeReadReceipt = (receipt) => {
  return {
    readAt: receipt.readAt,
    user: receipt.user?._id?.toString?.() || receipt.user?.toString?.() || receipt.user
  };
};

const serializeAttachment = (attachment) => {
  return {
    _id: attachment._id?.toString?.(),
    kind: attachment.kind || "file",
    mimeType: attachment.mimeType || "",
    name: attachment.name || "",
    size: attachment.size || 0
  };
};

// Converts a message document into the safe frontend payload shape.
export const serializeMessage = (message) => {
  if (!message) {
    return null;
  }

  return {
    _id: message._id?.toString(),
    attachments: (message.attachments || []).map(serializeAttachment),
    body: message.body,
    clientTempId: message.clientTempId,
    conversation:
      message.conversation?._id?.toString?.() ||
      message.conversation?.toString?.() ||
      message.conversation,
    createdAt: message.createdAt,
    deletedAt: message.deletedAt,
    isDeleted: Boolean(message.isDeleted),
    readBy: (message.readBy || []).map(serializeReadReceipt),
    sender:
      typeof message.sender === "object" && message.sender?._id
        ? serializeUser(message.sender)
        : message.sender?.toString?.() || message.sender,
    type: message.type,
    updatedAt: message.updatedAt
  };
};
