import { useEffect } from "react";

import { connectSocket, disconnectSocket } from "../../shared/services/socket.js";

export const useSocketConnection = (userId) => {
  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    connectSocket();

    return () => {
      disconnectSocket();
    };
  }, [userId]);
};
