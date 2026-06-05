import mongoose from "mongoose";

// Stores one refresh-token session per browser/device login.
const refreshSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    refreshTokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    refreshTokenJti: {
      type: String,
      required: true,
      index: true
    },
    accessTokenJti: {
      type: String,
      required: true,
      index: true
    },
    accessTokenExpiresAt: {
      type: Date,
      required: true
    },
    userAgent: {
      type: String,
      default: ""
    },
    ip: {
      type: String,
      default: ""
    },
    lastUsedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// TTL index lets MongoDB remove expired refresh sessions automatically.
refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// RefreshSession powers logout-current, logout-all, and refresh-token rotation.
export const RefreshSession = mongoose.model(
  "RefreshSession",
  refreshSessionSchema
);
