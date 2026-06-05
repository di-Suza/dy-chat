import { env } from "../config/env.js";
import { RefreshSession } from "../models/RefreshSession.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { isTokenJtiBlacklisted } from "../services/tokenBlacklist.service.js";

// Protects routes by validating the access cookie, active session, and user account.
export const authenticate = async (req, _res, next) => {
  const token = req.cookies?.[env.accessTokenCookieName];

  if (!token) {
    throw new ApiError(401, "Access token is missing");
  }

  const payload = verifyAccessToken(token);
  const isBlacklisted = await isTokenJtiBlacklisted({
    jti: payload.jti,
    type: "access"
  });

  if (isBlacklisted) {
    throw new ApiError(401, "Access token is no longer valid");
  }

  const session = await RefreshSession.findOne({
    _id: payload.sessionId,
    user: payload.userId
  });

  if (!session) {
    throw new ApiError(401, "Session is no longer active");
  }

  if (session.accessTokenJti !== payload.jti) {
    throw new ApiError(401, "Access token is no longer current");
  }

  const user = await User.findById(payload.userId);

  if (!user) {
    throw new ApiError(401, "User no longer exists");
  }

  req.user = user;
  req.auth = {
    accessExpiresAt: new Date(payload.exp * 1000),
    accessJti: payload.jti,
    sessionId: payload.sessionId,
    userId: payload.userId
  };

  next();
};
