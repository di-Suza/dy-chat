import { query } from "express-validator";

// Validation chain for protected user search query input.
export const searchUsersValidation = [
  query("q")
    .trim()
    .isLength({
      min: 1,
      max: 80
    })
    .withMessage("Search query must be 1 to 80 characters")
];
