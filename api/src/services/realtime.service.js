let ioInstance = null;

const onlineUserConnections = new Map();

export const socketEvents = {
  conversationCreated: "conversation:created",
  conversationRemoved: "conversation:removed",
  conversationUpdated: "conversation:updated",
  messageDeleted: "message:deleted",
  messageNew: "message:new",
  messagesSeen: "messages:seen",
  typingStarted: "typing:started",
  typingStopped: "typing:stopped",
  userPresence: "user:presence"
};

export const getUserRoom = (userId) => `user:${userId}`;

// Stores the Socket.IO server instance for service-level emits.
export const registerRealtimeServer = (io) => {
  ioInstance = io;
};

export const getRealtimeServer = () => ioInstance;

// Tracks a connected socket id for the authenticated user.
export const addUserConnection = ({ socketId, userId }) => {
  const userKey = userId.toString();
  const sockets = onlineUserConnections.get(userKey) || new Set();
  const wasOffline = sockets.size === 0;

  sockets.add(socketId);
  onlineUserConnections.set(userKey, sockets);

  return {
    isFirstConnection: wasOffline
  };
};

// Removes a socket id and tells callers whether the user fully went offline.
export const removeUserConnection = ({ socketId, userId }) => {
  const userKey = userId.toString();
  const sockets = onlineUserConnections.get(userKey);

  if (!sockets) {
    return {
      isLastConnection: true
    };
  }

  sockets.delete(socketId);

  if (sockets.size === 0) {
    onlineUserConnections.delete(userKey);
    return {
      isLastConnection: true
    };
  }

  onlineUserConnections.set(userKey, sockets);
  return {
    isLastConnection: false
  };
};

export const isUserOnline = (userId) => {
  return onlineUserConnections.has(userId.toString());
};

// Emits one event to every active socket for one user.
export const emitToUser = ({ event, payload, userId }) => {
  if (!ioInstance) {
    return;
  }

  ioInstance.to(getUserRoom(userId)).emit(event, payload);
};

// Emits one event to multiple users.
export const emitToUsers = ({ event, payload, userIds }) => {
  userIds.forEach((userId) => {
    emitToUser({
      event,
      payload,
      userId
    });
  });
};

export const emitConversationCreated = ({ conversation, userId }) => {
  emitToUser({
    event: socketEvents.conversationCreated,
    payload: {
      conversation
    },
    userId
  });
};

export const emitConversationUpdated = ({ conversation, userId }) => {
  emitToUser({
    event: socketEvents.conversationUpdated,
    payload: {
      conversation
    },
    userId
  });
};

export const emitConversationRemoved = ({ conversationId, userId }) => {
  emitToUser({
    event: socketEvents.conversationRemoved,
    payload: {
      conversationId
    },
    userId
  });
};

export const emitMessageCreated = ({ message, userId }) => {
  emitToUser({
    event: socketEvents.messageNew,
    payload: {
      message
    },
    userId
  });
};

export const emitMessageDeleted = ({ conversation, message, userId }) => {
  emitToUser({
    event: socketEvents.messageDeleted,
    payload: {
      conversation,
      message
    },
    userId
  });
};

export const emitMessagesSeen = ({ conversationId, seenBy, userIds }) => {
  emitToUsers({
    event: socketEvents.messagesSeen,
    payload: {
      conversationId,
      seenBy
    },
    userIds
  });
};

export const emitTypingStarted = ({ conversationId, user, userIds }) => {
  emitToUsers({
    event: socketEvents.typingStarted,
    payload: {
      conversationId,
      user
    },
    userIds
  });
};

export const emitTypingStopped = ({ conversationId, user, userIds }) => {
  emitToUsers({
    event: socketEvents.typingStopped,
    payload: {
      conversationId,
      user
    },
    userIds
  });
};

export const emitUserPresence = ({ isOnline, lastSeen, userId, userIds }) => {
  emitToUsers({
    event: socketEvents.userPresence,
    payload: {
      isOnline,
      lastSeen,
      userId: userId.toString()
    },
    userIds
  });
};
