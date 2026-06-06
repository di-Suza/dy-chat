import { env } from "../config/env.js";
import { RefreshSession } from "../models/RefreshSession.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { isTokenJtiBlacklisted } from "../services/tokenBlacklist.service.js";

const parseCookieHeader = (cookieHeader = "") => {
  return cookieHeader.split(";").reduce((cookies, item) => {
    const [rawKey, ...rawValueParts] = item.trim().split("=");

    if (!rawKey) {
      return cookies;
    }

    cookies[rawKey] = decodeURIComponent(rawValueParts.join("="));
    return cookies;
  }, {});
};

// Authenticates Socket.IO connections with the HTTP-only access cookie.
export const socketAuthenticate = async (socket, next) => {
  try {
    const cookies = parseCookieHeader(socket.handshake.headers.cookie);
    const token = cookies[env.accessTokenCookieName];

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

    socket.user = user;
    socket.authContext = {
      accessJti: payload.jti,
      sessionId: payload.sessionId,
      userId: payload.userId
    };

    next();
  } catch (error) {
    next(new Error(error.message || "Socket authentication failed"));
  }
};
