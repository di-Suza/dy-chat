import {
  deleteConversationMessage,
  sendConversationMessage
} from "../services/message.service.js";
import { getConversationForParticipant } from "../services/conversation.service.js";
import {
  emitConversationUpdated,
  emitMessageDeleted,
  emitMessageCreated
} from "../services/realtime.service.js";
import { serializeUser } from "../utils/serializeUser.js";

const getParticipantIds = (conversation) => {
  return conversation.participants.map((participant) =>
    participant._id?.toString?.() || participant.toString()
  );
};

const createPendingMessagePayload = ({ body, clientTempId, conversationId, sender, type }) => {
  const createdAt = new Date().toISOString();

  return {
    _id: clientTempId || `pending-${Date.now()}`,
    body: body?.trim?.() || "",
    clientTempId: clientTempId || "",
    conversation: conversationId,
    createdAt,
    isPending: true,
    readBy: [
      {
        readAt: createdAt,
        user: sender._id.toString()
      }
    ],
    sender: serializeUser(sender),
    type: type || "text",
    updatedAt: createdAt
  };
};

// Emits a pending message quickly, then saves and emits the final DB-backed message.
export const sendMessage = async (req, res) => {
  const conversation = await getConversationForParticipant({
    conversationId: req.body.conversationId,
    userId: req.user._id
  });
  const participantIds = getParticipantIds(conversation);
  const pendingMessage = createPendingMessagePayload({
    body: req.body.body,
    clientTempId: req.body.clientTempId,
    conversationId: req.body.conversationId,
    sender: req.user,
    type: req.body.type
  });

  participantIds.forEach((participantId) => {
    emitMessageCreated({
      message: pendingMessage,
      userId: participantId
    });
  });

  const result = await sendConversationMessage({
    body: req.body.body,
    clientTempId: req.body.clientTempId,
    conversationId: req.body.conversationId,
    senderId: req.user._id,
    type: req.body.type
  });

  result.participantIds.forEach((participantId) => {
    emitMessageCreated({
      message: result.message,
      userId: participantId
    });
  });

  result.conversationsByUser.forEach((item) => {
    emitConversationUpdated({
      conversation: item.conversation,
      userId: item.userId
    });
  });

  res.status(201).json({
    conversation: result.conversationsByUser.find(
      (item) => item.userId === req.user._id.toString()
    )?.conversation,
    message: result.message,
    status: true
  });
};

// Deletes one sender-owned message for every participant in realtime.
export const deleteMessage = async (req, res) => {
  const result = await deleteConversationMessage({
    messageId: req.params.messageId,
    userId: req.user._id
  });

  result.participantIds.forEach((participantId) => {
    const conversation = result.conversationsByUser.find(
      (item) => item.userId === participantId
    )?.conversation;

    emitMessageDeleted({
      conversation,
      message: result.message,
      userId: participantId
    });
  });

  result.conversationsByUser.forEach((item) => {
    emitConversationUpdated({
      conversation: item.conversation,
      userId: item.userId
    });
  });

  res.json({
    message: result.message,
    status: true
  });
};
