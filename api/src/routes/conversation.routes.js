import { Router } from "express";

import {
  addConversationGroupMembers,
  deleteConversationGroup,
  getConversationMessages,
  getConversations,
  leaveConversationGroup,
  markConversationSeen,
  removeConversationGroupMember,
  startDirectConversation,
  startGroupConversation,
  updateConversationGroup
} from "../controllers/conversation.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { uploadGroupImage } from "../middlewares/uploadImage.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  addGroupMembersValidation,
  conversationIdParamValidation,
  createGroupConversationValidation,
  memberIdParamValidation,
  updateGroupConversationValidation,
  startDirectConversationValidation
} from "../validations/conversation.validation.js";

// Conversation router contains protected one-to-one chat APIs.
export const conversationRoutes = Router();

conversationRoutes.get("/", authenticate, getConversations);

conversationRoutes.post(
  "/direct",
  authenticate,
  startDirectConversationValidation,
  validateRequest,
  startDirectConversation
);

conversationRoutes.post(
  "/groups",
  authenticate,
  uploadGroupImage,
  createGroupConversationValidation,
  validateRequest,
  startGroupConversation
);

conversationRoutes.get(
  "/:conversationId/messages",
  authenticate,
  conversationIdParamValidation,
  validateRequest,
  getConversationMessages
);

conversationRoutes.post(
  "/:conversationId/seen",
  authenticate,
  conversationIdParamValidation,
  validateRequest,
  markConversationSeen
);

conversationRoutes.post(
  "/:conversationId/leave",
  authenticate,
  conversationIdParamValidation,
  validateRequest,
  leaveConversationGroup
);

conversationRoutes.patch(
  "/:conversationId/group",
  authenticate,
  uploadGroupImage,
  conversationIdParamValidation,
  updateGroupConversationValidation,
  validateRequest,
  updateConversationGroup
);

conversationRoutes.post(
  "/:conversationId/members",
  authenticate,
  conversationIdParamValidation,
  addGroupMembersValidation,
  validateRequest,
  addConversationGroupMembers
);

conversationRoutes.delete(
  "/:conversationId/members/:memberId",
  authenticate,
  conversationIdParamValidation,
  memberIdParamValidation,
  validateRequest,
  removeConversationGroupMember
);

conversationRoutes.delete(
  "/:conversationId/group",
  authenticate,
  conversationIdParamValidation,
  validateRequest,
  deleteConversationGroup
);
