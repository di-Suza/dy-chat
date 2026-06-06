import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      default: ""
    },
    name: {
      type: String,
      default: ""
    },
    mimeType: {
      type: String,
      default: ""
    },
    size: {
      type: Number,
      default: 0
    }
  },
  {
    _id: false
  }
);

const readReceiptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    _id: false
  }
);

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    body: {
      type: String,
      default: "",
      trim: true,
      maxlength: 5000
    },
    type: {
      type: String,
      enum: ["text", "image", "file", "video", "audio", "system"],
      default: "text"
    },
    attachments: {
      type: [attachmentSchema],
      default: []
    },
    readBy: {
      type: [readReceiptSchema],
      default: []
    },
    clientTempId: {
      type: String,
      default: ""
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

messageSchema.index({
  conversation: 1,
  createdAt: 1
});
messageSchema.index({
  conversation: 1,
  sender: 1
});

// Message stores chat content, media metadata, system events, and read receipts.
export const Message = mongoose.model("Message", messageSchema);
