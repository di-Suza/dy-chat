import { Router } from "express";

import {
  deleteMessage,
  sendMessage
} from "../controllers/message.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  messageIdParamValidation,
  sendMessageValidation
} from "../validations/message.validation.js";

// Message router contains protected message create APIs.
export const messageRoutes = Router();

messageRoutes.post(
  "/",
  authenticate,
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
