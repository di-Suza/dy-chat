import { Router } from "express";

import {
  getMe,
  login,
  logout,
  logoutAll,
  refresh,
  register
} from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  loginValidation,
  registerValidation
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

// Logs out only the browser/device represented by the current refresh cookie.
authRoutes.post("/logout", authenticate, logout);

// Logs out all devices for the current user.
authRoutes.post("/logout-all", authenticate, logoutAll);
