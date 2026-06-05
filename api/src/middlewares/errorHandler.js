import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

// Converts unknown/Mongoose errors into one consistent ApiError response shape.
const normalizeError = (error) => {
  if (error instanceof ApiError) {
    return error;
  }

  if (error.name === "ValidationError") {
    return new ApiError(400, "Validation failed", {
      errors: Object.values(error.errors).map((item) => ({
        field: item.path,
        message: item.message
      }))
    });
  }

  if (error.name === "CastError") {
    return new ApiError(400, "Invalid resource id");
  }

  if (error.code === 11000) {
    return new ApiError(409, "Resource already exists");
  }

  return new ApiError(500, "Internal server error");
};

// Sends unknown routes into the global error handler.
export const notFoundHandler = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
};

// Final Express error middleware that serializes safe API error responses.
export const globalErrorHandler = (error, _req, res, _next) => {
  const normalizedError = normalizeError(error);
  const isProduction = env.nodeEnv === "production";

  if (!isProduction || normalizedError.statusCode >= 500) {
    console.error(error);
  }

  res.status(normalizedError.statusCode).json({
    status: false,
    message: normalizedError.message,
    code: normalizedError.code,
    errors: normalizedError.errors,
    stack: isProduction ? undefined : error.stack
  });
};
