import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { RefreshSession } from "../models/RefreshSession.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { createTokenHash } from "../utils/crypto.js";
import { serializeUser } from "../utils/serializeUser.js";
import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken
} from "../utils/tokens.js";
import {
  blacklistTokenJti,
  isTokenJtiBlacklisted
} from "./tokenBlacklist.service.js";

const passwordSaltRounds = 12;

// Builds both cookies' token objects for a new session id.
const buildSessionTokens = ({ sessionId, userId }) => {
  const accessToken = createAccessToken({
    sessionId,
    userId
  });
  const refreshToken = createRefreshToken({
    sessionId,
    userId
  });

  return {
    accessToken,
    refreshToken
  };
};

// Creates a refresh-session document and returns access/refresh tokens for cookies.
const createSession = async ({ meta, user }) => {
  const sessionId = new mongoose.Types.ObjectId();
  const { accessToken, refreshToken } = buildSessionTokens({
    sessionId,
    userId: user._id
  });

  await RefreshSession.create({
    _id: sessionId,
    user: user._id,
    refreshTokenHash: createTokenHash(refreshToken.token),
    refreshTokenJti: refreshToken.jti,
    accessTokenJti: accessToken.jti,
    accessTokenExpiresAt: accessToken.expiresAt,
    userAgent: meta.userAgent,
    ip: meta.ip,
    expiresAt: refreshToken.expiresAt
  });

  return {
    accessToken,
    refreshToken
  };
};

// Adds a session's current access and refresh token JTIs to blacklist storage.
const blacklistSession = async (session) => {
  if (!session) {
    return;
  }

  await Promise.all([
    blacklistTokenJti({
      expiresAt: session.expiresAt,
      jti: session.refreshTokenJti,
      type: "refresh"
    }),
    blacklistTokenJti({
      expiresAt: session.accessTokenExpiresAt,
      jti: session.accessTokenJti,
      type: "access"
    })
  ]);
};

// Loads a user or fails auth flows when the account was deleted.
const getUserOrThrow = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(401, "User no longer exists");
  }

  return user;
};

// Creates a user account, hashes the password, starts a session, and returns safe user data.
export const registerUser = async ({ email, name, password }, meta) => {
  const normalizedEmail = email.toLowerCase();
  const existingUser = await User.exists({
    email: normalizedEmail
  });

  if (existingUser) {
    throw new ApiError(409, "Email is already registered");
  }

  const passwordHash = await bcrypt.hash(password, passwordSaltRounds);
  const user = await User.create({
    email: normalizedEmail,
    name,
    passwordHash
  });
  const tokens = await createSession({
    meta,
    user
  });

  return {
    ...tokens,
    user: serializeUser(user)
  };
};

// Verifies email/password, creates a new session, and returns safe user data.
export const loginUser = async ({ email, password }, meta) => {
  const user = await User.findOne({
    email: email.toLowerCase()
  }).select("+passwordHash");

  const isPasswordValid =
    user && (await bcrypt.compare(password, user.passwordHash));

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  const tokens = await createSession({
    meta,
    user
  });

  return {
    ...tokens,
    user: serializeUser(user)
  };
};

// Validates the refresh cookie/session and rotates only the access token.
export const refreshAuthSession = async (refreshTokenValue, meta) => {
  if (!refreshTokenValue) {
    throw new ApiError(401, "Refresh token is missing");
  }

  const payload = verifyRefreshToken(refreshTokenValue);
  const isBlacklisted = await isTokenJtiBlacklisted({
    jti: payload.jti,
    type: "refresh"
  });

  if (isBlacklisted) {
    throw new ApiError(401, "Refresh token is no longer valid");
  }

  const session = await RefreshSession.findOne({
    _id: payload.sessionId,
    user: payload.userId,
    refreshTokenHash: createTokenHash(refreshTokenValue),
    refreshTokenJti: payload.jti
  });

  if (!session) {
    await blacklistTokenJti({
      expiresAt: payload.exp * 1000,
      jti: payload.jti,
      type: "refresh"
    });
    throw new ApiError(401, "Refresh session is no longer valid");
  }

  if (session.expiresAt <= new Date()) {
    await blacklistSession(session);
    await session.deleteOne();
    throw new ApiError(401, "Refresh session expired");
  }

  const user = await getUserOrThrow(payload.userId);
  const accessToken = createAccessToken({
    sessionId: session._id,
    userId: user._id
  });

  session.accessTokenJti = accessToken.jti;
  session.accessTokenExpiresAt = accessToken.expiresAt;
  session.lastUsedAt = new Date();
  session.ip = meta.ip;
  session.userAgent = meta.userAgent;
  await session.save();

  return {
    accessToken,
    user: serializeUser(user)
  };
};

// Removes one session and blacklists the tokens attached to that browser/device.
export const logoutSession = async ({
  accessExpiresAt,
  accessJti,
  refreshTokenValue,
  sessionId,
  userId
}) => {
  const query = {
    _id: sessionId,
    user: userId
  };

  if (refreshTokenValue) {
    query.refreshTokenHash = createTokenHash(refreshTokenValue);
  }

  const session = await RefreshSession.findOne(query);

  if (session) {
    await blacklistSession(session);
    await session.deleteOne();
  }

  await blacklistTokenJti({
    expiresAt: accessExpiresAt,
    jti: accessJti,
    type: "access"
  });
};

// Removes all sessions for a user and blacklists each known token JTI.
export const logoutAllSessions = async ({ accessExpiresAt, accessJti, userId }) => {
  const sessions = await RefreshSession.find({
    user: userId
  });

  await Promise.all(sessions.map((session) => blacklistSession(session)));
  await RefreshSession.deleteMany({
    user: userId
  });
  await blacklistTokenJti({
    expiresAt: accessExpiresAt,
    jti: accessJti,
    type: "access"
  });
};
