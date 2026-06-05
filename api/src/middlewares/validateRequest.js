import { validationResult } from "express-validator";

import { ApiError } from "../utils/ApiError.js";

// Converts express-validator failures into a structured ApiError.
export const validateRequest = (req, _res, next) => {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  return next(
    new ApiError(400, "Validation failed", {
      errors: result.array().map((error) => ({
        field: error.path,
        message: error.msg
      }))
    })
  );
};
