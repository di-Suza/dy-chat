import mongoose from "mongoose";

// Stores user profile, credential hash, and future chat presence fields.
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    avatar: {
      url: {
        type: String,
        default: ""
      },
      publicId: {
        type: String,
        default: ""
      }
    },
    isOnline: {
      type: Boolean,
      default: false
    },
    lastSeen: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// User model is the source of truth for account data.
export const User = mongoose.model("User", userSchema);
