import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["direct", "group"],
      default: "direct"
    },
    directKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    name: {
      type: String,
      default: "",
      trim: true,
      maxlength: 80
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
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      }
    ],
    visibleTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null
    },
    lastMessageAt: {
      type: Date,
      default: null
    },
    lastMessagePreview: {
      type: String,
      default: ""
    },
    lastMessageSender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);

conversationSchema.index({
  participants: 1
});
conversationSchema.index({
  visibleTo: 1,
  lastMessageAt: -1,
  updatedAt: -1
});

// Conversation stores direct/group chat membership and per-user sidebar visibility.
export const Conversation = mongoose.model("Conversation", conversationSchema);
