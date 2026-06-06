import { body, param } from "express-validator";

export const sendMessageValidation = [
  body("conversationId").isMongoId().withMessage("Valid conversation id is required"),
  body("type")
    .optional()
    .isIn(["text", "image", "file", "video", "audio"])
    .withMessage("Unsupported message type"),
  body("body").custom((value = "", { req }) => {
    const messageType = req.body.type || "text";

    if (value.length > 5000) {
      throw new Error("Message text must be at most 5000 characters");
    }

    if (messageType === "text" && !value.trim()) {
      throw new Error("Message text is required");
    }

    return true;
  }),
  body("clientTempId")
    .optional()
    .isString()
    .isLength({
      max: 120
    })
    .withMessage("Client temp id is too long")
];

export const messageIdParamValidation = [
  param("messageId").isMongoId().withMessage("Valid message id is required")
];
