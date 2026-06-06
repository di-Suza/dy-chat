import { Server } from "socket.io";

import { env } from "../config/env.js";
import { socketAuthenticate } from "../middlewares/socketAuthenticate.js";
import { User } from "../models/User.js";
import {
  getConversationParticipantIds,
  getPresenceRecipientIds
} from "../services/conversation.service.js";
import {
  addUserConnection,
  emitTypingStarted,
  emitTypingStopped,
  emitUserPresence,
  getUserRoom,
  registerRealtimeServer,
  removeUserConnection
} from "../services/realtime.service.js";
import { serializeUser } from "../utils/serializeUser.js";

// Creates the Socket.IO server on top of the same HTTP server as Express.
export const createSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.clientUrl,
      credentials: true
    }
  });

  registerRealtimeServer(io);
  io.use(socketAuthenticate);

  io.on("connection", async (socket) => {
    const userId = socket.user._id.toString();
    const { isFirstConnection } = addUserConnection({
      socketId: socket.id,
      userId
    });

    socket.join(getUserRoom(userId));
    socket.emit("server:ready", {
      socketId: socket.id,
      user: serializeUser(socket.user)
    });

    try {
      if (isFirstConnection) {
        await User.findByIdAndUpdate(userId, {
          isOnline: true,
          lastSeen: null
        });
        emitUserPresence({
          isOnline: true,
          lastSeen: null,
          userId,
          userIds: await getPresenceRecipientIds(userId)
        });
      }
    } catch (error) {
      console.error("Socket presence update failed:", error);
    }

    socket.on("typing:start", async ({ conversationId }) => {
      try {
        const participantIds = await getConversationParticipantIds({
          conversationId,
          userId
        });

        emitTypingStarted({
          conversationId,
          user: serializeUser(socket.user),
          userIds: participantIds.filter((participantId) => participantId !== userId)
        });
      } catch (_error) {
        // Ignore typing events for conversations the socket user cannot access.
      }
    });

    socket.on("typing:stop", async ({ conversationId }) => {
      try {
        const participantIds = await getConversationParticipantIds({
          conversationId,
          userId
        });

        emitTypingStopped({
          conversationId,
          user: serializeUser(socket.user),
          userIds: participantIds.filter((participantId) => participantId !== userId)
        });
      } catch (_error) {
        // Ignore typing events for conversations the socket user cannot access.
      }
    });

    socket.on("disconnect", async () => {
      try {
        const { isLastConnection } = removeUserConnection({
          socketId: socket.id,
          userId
        });

        if (!isLastConnection) {
          return;
        }

        const lastSeen = new Date();
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen
        });
        emitUserPresence({
          isOnline: false,
          lastSeen,
          userId,
          userIds: await getPresenceRecipientIds(userId)
        });
      } catch (error) {
        console.error("Socket disconnect cleanup failed:", error);
      }
    });
  });

  return io;
};
