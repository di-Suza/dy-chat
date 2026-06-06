import { Router } from "express";

import { searchUserList } from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { searchUsersValidation } from "../validations/user.validation.js";

// User router contains protected user discovery endpoints.
export const userRoutes = Router();

// Searches users by name/email for the navbar search modal.
userRoutes.get(
  "/search",
  authenticate,
  searchUsersValidation,
  validateRequest,
  searchUserList
);
