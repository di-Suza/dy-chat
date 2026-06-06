import {
  deleteConversationMessage,
  sendConversationMessage
} from "../services/message.service.js";
import {
  emitConversationUpdated,
  emitMessageDeleted,
  emitMessageCreated
} from "../services/realtime.service.js";

// Saves a message, updates conversation metadata, and emits realtime updates.
export const sendMessage = async (req, res) => {
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
