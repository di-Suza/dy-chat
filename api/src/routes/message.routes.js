import { Router } from "express";

import {
  deleteMessage,
  getAttachmentAccessUrl,
  sendMessage
} from "../controllers/message.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { uploadChatAttachment } from "../middlewares/uploadImage.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  attachmentIdParamValidation,
  messageIdParamValidation,
  sendMessageValidation
} from "../validations/message.validation.js";

// Message router contains protected message create APIs.
export const messageRoutes = Router();

messageRoutes.post(
  "/",
  authenticate,
  uploadChatAttachment,
  sendMessageValidation,
  validateRequest,
  sendMessage
);

messageRoutes.delete(
  "/:messageId",
  authenticate,
  messageIdParamValidation,
  validateRequest,
  deleteMessage
);

messageRoutes.get(
  "/:messageId/attachments/:attachmentId/url",
  authenticate,
  messageIdParamValidation,
  attachmentIdParamValidation,
  validateRequest,
  getAttachmentAccessUrl
);
