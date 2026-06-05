import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { jwtKeys } from "../config/jwtKeys.js";
import { ApiError } from "./ApiError.js";
import { createJti } from "./crypto.js";
import { durationToDate } from "./duration.js";

// Signs a JWT with the RSA private key so only this backend can mint valid tokens.
const signToken = ({ expiresIn, jti, payload }) => {
  return jwt.sign(payload, jwtKeys.privateKey, {
    algorithm: "RS256",
    expiresIn,
    jwtid: jti,
    subject: String(payload.userId)
  });
};

// Creates a short-lived access token for protected API authentication.
export const createAccessToken = ({ sessionId, userId }) => {
  const jti = createJti();
  const token = signToken({
    expiresIn: env.accessTokenExpiresIn,
    jti,
    payload: {
      sessionId: String(sessionId),
      type: "access",
      userId: String(userId)
    }
  });

  return {
    expiresAt: durationToDate(env.accessTokenExpiresIn),
    jti,
    token
  };
};

// Creates a long-lived refresh token tied to a refresh-session document.
export const createRefreshToken = ({ sessionId, userId }) => {
  const jti = createJti();
  const token = signToken({
    expiresIn: env.refreshTokenExpiresIn,
    jti,
    payload: {
      sessionId: String(sessionId),
      type: "refresh",
      userId: String(userId)
    }
  });

  return {
    expiresAt: durationToDate(env.refreshTokenExpiresIn),
    jti,
    token
  };
};

// Verifies an access token with the RSA public key and rejects wrong token types.
export const verifyAccessToken = (token) => {
  try {
    const payload = jwt.verify(token, jwtKeys.publicKey, {
      algorithms: ["RS256"]
    });

    if (payload.type !== "access") {
      throw new ApiError(401, "Invalid access token");
    }

    return payload;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(401, "Invalid or expired access token");
  }
};

// Verifies a refresh token with the RSA public key and rejects wrong token types.
export const verifyRefreshToken = (token) => {
  try {
    const payload = jwt.verify(token, jwtKeys.publicKey, {
      algorithms: ["RS256"]
    });

    if (payload.type !== "refresh") {
      throw new ApiError(401, "Invalid refresh token");
    }

    return payload;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(401, "Invalid or expired refresh token");
  }
};
