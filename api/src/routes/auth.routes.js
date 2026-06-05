import { Router } from "express";

import {
  getMe,
  login,
  logout,
  logoutAll,
  refresh,
  register,
  removeAvatar,
  updateAvatar,
  updatePassword,
  updateProfile
} from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { uploadProfileImage } from "../middlewares/uploadImage.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  loginValidation,
  registerValidation,
  updatePasswordValidation,
  updateProfileValidation
} from "../validations/auth.validation.js";

// Auth router groups all cookie-based authentication endpoints under /api/auth.
export const authRoutes = Router();

// Creates an account, validates body, and sets access/refresh cookies.
authRoutes.post("/register", registerValidation, validateRequest, register);

// Authenticates credentials, creates a session document, and sets auth cookies.
authRoutes.post("/login", loginValidation, validateRequest, login);

// Refreshes an expired access cookie using the refresh cookie.
authRoutes.post("/refresh", refresh);

// Returns the current authenticated user.
authRoutes.get("/me", authenticate, getMe);

// Updates the authenticated user's editable profile fields.
authRoutes.patch(
  "/profile",
  authenticate,
  updateProfileValidation,
  validateRequest,
  updateProfile
);

// Updates the authenticated user's password using the current password.
authRoutes.patch(
  "/password",
  authenticate,
  updatePasswordValidation,
  validateRequest,
  updatePassword
);

// Uploads or replaces the authenticated user's profile picture.
authRoutes.patch("/avatar", authenticate, uploadProfileImage, updateAvatar);

// Removes the authenticated user's profile picture.
authRoutes.delete("/avatar", authenticate, removeAvatar);

// Logs out only the browser/device represented by the current refresh cookie.
authRoutes.post("/logout", authenticate, logout);

// Logs out all devices for the current user.
authRoutes.post("/logout-all", authenticate, logoutAll);
