import {
  createAttachmentPayload,
  deleteConversationMessage,
  getMessageAttachmentAccessUrl,
  sendConversationMessage
} from "../services/message.service.js";
import { getConversationForParticipant } from "../services/conversation.service.js";
import { uploadChatAttachmentToImageKit } from "../services/imageKit.service.js";
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

const createPendingAttachmentPayload = (file) => {
  if (!file) {
    return [];
  }

  return [
    {
      _id: `pending-attachment-${Date.now()}`,
      kind: getAttachmentKind(file.mimetype),
      mimeType: file.mimetype,
      name: file.originalname || "attachment",
      size: file.size || 0
    }
  ];
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
    type: req.file ? getAttachmentKind(req.file.mimetype) : req.body.type
  });
  pendingMessage.attachments = createPendingAttachmentPayload(req.file);

  participantIds.forEach((participantId) => {
    emitMessageCreated({
      message: pendingMessage,
      userId: participantId
    });
  });

  const uploadedFile = req.file
    ? await uploadChatAttachmentToImageKit({
        file: req.file,
        userId: req.user._id
      })
    : null;
  const attachment = req.file
    ? createAttachmentPayload({
        file: req.file,
        uploadedFile
      })
    : null;

  const result = await sendConversationMessage({
    attachment,
    body: req.body.body,
    clientTempId: req.body.clientTempId,
    conversationId: req.body.conversationId,
    senderId: req.user._id,
    type: req.file ? attachment.kind : req.body.type
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

// Returns a short-lived signed URL only after conversation participant access.
export const getAttachmentAccessUrl = async (req, res) => {
  const result = await getMessageAttachmentAccessUrl({
    attachmentId: req.params.attachmentId,
    messageId: req.params.messageId,
    userId: req.user._id
  });

  res.json({
    status: true,
    ...result
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
