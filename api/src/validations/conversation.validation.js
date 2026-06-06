import { body, param } from "express-validator";

export const startDirectConversationValidation = [
  body("participantId").isMongoId().withMessage("Valid participant id is required")
];

export const conversationIdParamValidation = [
  param("conversationId").isMongoId().withMessage("Valid conversation id is required")
];

export const createGroupConversationValidation = [
  body("name")
    .trim()
    .isLength({
      min: 2,
      max: 80
    })
    .withMessage("Group name must be between 2 and 80 characters"),
  body("participantIds").custom((value) => {
    const ids = Array.isArray(value)
      ? value
      : typeof value === "string" && value.trim().startsWith("[")
        ? JSON.parse(value)
        : [value];

    if (!ids.length || ids.some((id) => !/^[a-f\d]{24}$/i.test(id))) {
      throw new Error("Valid participant ids are required");
    }

    return true;
  })
];

export const updateGroupConversationValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({
      min: 2,
      max: 80
    })
    .withMessage("Group name must be between 2 and 80 characters")
];

export const addGroupMembersValidation = [
  body("participantIds").custom((value) => {
    const ids = Array.isArray(value)
      ? value
      : typeof value === "string" && value.trim().startsWith("[")
        ? JSON.parse(value)
        : [value];

    if (!ids.length || ids.some((id) => !/^[a-f\d]{24}$/i.test(id))) {
      throw new Error("Valid participant ids are required");
    }

    return true;
  })
];

export const memberIdParamValidation = [
  param("memberId").isMongoId().withMessage("Valid member id is required")
];
