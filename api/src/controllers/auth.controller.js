import { env } from "../config/env.js";
import {
  loginUser,
  logoutAllSessions,
  logoutSession,
  refreshAuthSession,
  registerUser
} from "../services/auth.service.js";
import { clearAuthCookies, setAuthCookies } from "../utils/cookies.js";
import { serializeUser } from "../utils/serializeUser.js";

// Captures request metadata so each refresh session can be tied to a device/browser.
const getRequestMeta = (req) => {
  return {
    ip: req.ip,
    userAgent: req.get("user-agent") || ""
  };
};

// Registers a new account, creates a refresh session, sets auth cookies, and returns user data.
export const register = async (req, res) => {
  const result = await registerUser(req.body, getRequestMeta(req));

  setAuthCookies(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken
  });

  res.status(201).json({
    status: true,
    message: "Registered successfully",
    user: result.user
  });
};

// Logs in an existing user, creates a new device session, sets cookies, and returns user data.
export const login = async (req, res) => {
  const result = await loginUser(req.body, getRequestMeta(req));

  setAuthCookies(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken
  });

  res.json({
    status: true,
    message: "Logged in successfully",
    user: result.user
  });
};

// Uses the refresh cookie to mint a new access cookie and continue the current session.
export const refresh = async (req, res) => {
  const refreshTokenValue = req.cookies?.[env.refreshTokenCookieName];
  const result = await refreshAuthSession(refreshTokenValue, getRequestMeta(req));

  setAuthCookies(res, {
    accessToken: result.accessToken
  });

  res.json({
    status: true,
    message: "Session refreshed",
    user: result.user
  });
};

// Returns the authenticated user after the auth middleware validates the access cookie.
export const getMe = async (req, res) => {
  res.json({
    status: true,
    user: serializeUser(req.user)
  });
};

// Logs out only the current session by blacklisting its token JTIs and deleting its session doc.
export const logout = async (req, res) => {
  await logoutSession({
    accessExpiresAt: req.auth.accessExpiresAt,
    accessJti: req.auth.accessJti,
    refreshTokenValue: req.cookies?.[env.refreshTokenCookieName],
    sessionId: req.auth.sessionId,
    userId: req.auth.userId
  });

  clearAuthCookies(res);

  res.json({
    status: true,
    message: "Logged out successfully"
  });
};

// Logs out every session for the authenticated user by deleting all refresh session docs.
export const logoutAll = async (req, res) => {
  await logoutAllSessions({
    accessExpiresAt: req.auth.accessExpiresAt,
    accessJti: req.auth.accessJti,
    userId: req.auth.userId
  });

  clearAuthCookies(res);

  res.json({
    status: true,
    message: "Logged out from all devices"
  });
};
