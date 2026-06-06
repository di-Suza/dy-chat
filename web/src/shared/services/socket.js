import { io } from "socket.io-client";

const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  return apiUrl.replace(/\/api\/?$/, "");
};

let socket = null;

export const connectSocket = () => {
  if (socket?.connected) {
    return socket;
  }

  if (!socket) {
    socket = io(getSocketUrl(), {
      autoConnect: false,
      withCredentials: true
    });
  }

  socket.connect();
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (!socket) {
    return;
  }

  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
};

export const emitTypingStart = (conversationId) => {
  socket?.emit("typing:start", {
    conversationId
  });
};

export const emitTypingStop = (conversationId) => {
  socket?.emit("typing:stop", {
    conversationId
  });
};
