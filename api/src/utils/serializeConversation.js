import { serializeMessage } from "./serializeMessage.js";
import { serializeUser } from "./serializeUser.js";

const normalizeId = (value) => {
  return value?._id?.toString?.() || value?.toString?.() || value;
};

const serializeParticipant = (participant) => {
  return typeof participant === "object" && participant?._id
    ? serializeUser(participant)
    : participant?.toString?.() || participant;
};

// Converts a conversation document into the safe current-user-specific payload.
export const serializeConversation = (
  conversation,
  { currentUserId, unreadCount = 0 } = {}
) => {
  const participants = (conversation.participants || []).map(serializeParticipant);
  const currentId = normalizeId(currentUserId);
  const otherParticipant =
    participants.find((participant) => normalizeId(participant) !== currentId) ||
    null;

  return {
    _id: conversation._id?.toString(),
    admins: (conversation.admins || []).map(normalizeId),
    avatar: conversation.avatar || {
      publicId: "",
      url: ""
    },
    createdAt: conversation.createdAt,
    lastMessage:
      typeof conversation.lastMessage === "object" && conversation.lastMessage?._id
        ? serializeMessage(conversation.lastMessage)
        : conversation.lastMessage || null,
    lastMessageAt: conversation.lastMessageAt,
    lastMessagePreview: conversation.lastMessagePreview,
    lastMessageSender:
      conversation.lastMessageSender?._id?.toString?.() ||
      conversation.lastMessageSender?.toString?.() ||
      conversation.lastMessageSender,
    name: conversation.name || "",
    otherParticipant,
    participants,
    type: conversation.type,
    unreadCount,
    updatedAt: conversation.updatedAt
  };
};
