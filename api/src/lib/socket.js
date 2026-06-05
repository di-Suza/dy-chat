import { Server } from "socket.io";

import { env } from "../config/env.js";

// Creates the Socket.IO server on top of the same HTTP server as Express.
export const createSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.clientUrl,
      credentials: true
    }
  });

  // Initial base connection events; auth/socket room logic will be added later.
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.emit("server:ready", {
      socketId: socket.id,
      message: "Connected to DyChat realtime server"
    });

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
};
