import { useEffect } from "react";

import { useMarkConversationSeenMutation } from "../api/chatApi.js";
import {
  chatApi,
  removeConversationFromList,
  upsertConversationInList
} from "../api/chatApi.js";
import {
  clearTypingUser,
  selectActiveConversationId,
  setActiveConversationId,
  setTypingUser
} from "../model/chatSlice.js";
import { selectCurrentUser } from "../../auth/model/authSlice.js";
import { useAppDispatch, useAppSelector } from "../../../app/store/hooks.js";
import { connectSocket } from "../../../shared/services/socket.js";

const getSenderId = (message) => message.sender?._id || message.sender;

const addOrReplaceMessage = (draft, message) => {
  if (!draft?.messages) {
    return;
  }

  const existingIndex = draft.messages.findIndex(
    (item) =>
      item._id === message._id ||
      (message.clientTempId && item.clientTempId === message.clientTempId)
  );

  if (existingIndex >= 0) {
    draft.messages[existingIndex] = message;
    return;
  }

  draft.messages.push(message);
};

export const useChatRealtime = () => {
  const dispatch = useAppDispatch();
  const activeConversationId = useAppSelector(selectActiveConversationId);
  const user = useAppSelector(selectCurrentUser);
  const [markConversationSeen] = useMarkConversationSeenMutation();

  useEffect(() => {
    if (!user?._id) {
      return undefined;
    }

    const socket = connectSocket();

    const handleConversation = ({ conversation }) => {
      dispatch(
        chatApi.util.updateQueryData("getConversations", undefined, (draft) => {
          upsertConversationInList(draft, conversation);
        })
      );
    };

    const handleMessage = ({ message }) => {
      const conversationId = message.conversation;

      dispatch(
        chatApi.util.updateQueryData("getMessages", conversationId, (draft) => {
          addOrReplaceMessage(draft, message);
        })
      );

      if (
        conversationId === activeConversationId &&
        getSenderId(message) !== user._id
      ) {
        markConversationSeen(conversationId);
      }
    };

    const handleConversationRemoved = ({ conversationId }) => {
      dispatch(
        chatApi.util.updateQueryData("getConversations", undefined, (draft) => {
          removeConversationFromList(draft, conversationId);
        })
      );

      if (conversationId === activeConversationId) {
        dispatch(setActiveConversationId(null));
      }
    };

    const handleMessageDeleted = ({ conversation, message }) => {
      const conversationId = message.conversation;

      dispatch(
        chatApi.util.updateQueryData("getMessages", conversationId, (draft) => {
          const index = draft.messages?.findIndex((item) => item._id === message._id);

          if (index >= 0) {
            draft.messages[index] = message;
          }
        })
      );

      if (conversation) {
        dispatch(
          chatApi.util.updateQueryData("getConversations", undefined, (draft) => {
            upsertConversationInList(draft, conversation);
          })
        );
      }
    };

    const handleMessagesSeen = ({ conversationId, seenBy }) => {
      dispatch(
        chatApi.util.updateQueryData("getMessages", conversationId, (draft) => {
          draft.messages?.forEach((message) => {
            const senderId = getSenderId(message);
            const hasReceipt = message.readBy?.some(
              (receipt) => receipt.user === seenBy._id
            );

            if (senderId !== seenBy._id && !hasReceipt) {
              message.readBy = [
                ...(message.readBy || []),
                {
                  readAt: new Date().toISOString(),
                  user: seenBy._id
                }
              ];
            }
          });
        })
      );
    };

    const handleTypingStarted = ({ conversationId, user: typingUser }) => {
      if (typingUser?._id === user._id) {
        return;
      }

      dispatch(
        setTypingUser({
          conversationId,
          user: typingUser
        })
      );
    };

    const handleTypingStopped = ({ conversationId, user: typingUser }) => {
      dispatch(
        clearTypingUser({
          conversationId,
          userId: typingUser?._id
        })
      );
    };

    const handlePresence = ({ isOnline, lastSeen, userId }) => {
      dispatch(
        chatApi.util.updateQueryData("getConversations", undefined, (draft) => {
          draft.conversations?.forEach((conversation) => {
            conversation.participants?.forEach((participant) => {
              if (participant._id === userId) {
                participant.isOnline = isOnline;
                participant.lastSeen = lastSeen;
              }
            });

            if (conversation.otherParticipant?._id === userId) {
              conversation.otherParticipant.isOnline = isOnline;
              conversation.otherParticipant.lastSeen = lastSeen;
            }
          });
        })
      );
    };

    socket.on("conversation:created", handleConversation);
    socket.on("conversation:removed", handleConversationRemoved);
    socket.on("conversation:updated", handleConversation);
    socket.on("message:deleted", handleMessageDeleted);
    socket.on("message:new", handleMessage);
    socket.on("messages:seen", handleMessagesSeen);
    socket.on("typing:started", handleTypingStarted);
    socket.on("typing:stopped", handleTypingStopped);
    socket.on("user:presence", handlePresence);

    return () => {
      socket.off("conversation:created", handleConversation);
      socket.off("conversation:removed", handleConversationRemoved);
      socket.off("conversation:updated", handleConversation);
      socket.off("message:deleted", handleMessageDeleted);
      socket.off("message:new", handleMessage);
      socket.off("messages:seen", handleMessagesSeen);
      socket.off("typing:started", handleTypingStarted);
      socket.off("typing:stopped", handleTypingStopped);
      socket.off("user:presence", handlePresence);
    };
  }, [activeConversationId, dispatch, markConversationSeen, user?._id]);
};
