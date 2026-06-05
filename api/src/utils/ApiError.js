// Custom operational API error used by controllers, services, and middleware.
export class ApiError extends Error {
  constructor(statusCode, message, options = {}) {
    super(message);

    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = options.code;
    this.errors = options.errors;
    this.isOperational = true;

    Error.captureStackTrace?.(this, this.constructor);
  }
}
