import { useEffect, useMemo, useRef, useState } from "react";

import {
  useGetConversationsQuery,
  useGetMessagesQuery,
  useDeleteMessageMutation,
  useLeaveGroupConversationMutation,
  useMarkConversationSeenMutation,
  useSendMessageMutation
} from "../../api/chatApi.js";
import {
  selectActiveConversationId,
  selectTypingUsersByConversation,
  setActiveConversationId
} from "../../model/chatSlice.js";
import { useChatRealtime } from "../../hooks/useChatRealtime.js";
import { selectCurrentUser } from "../../../auth/model/authSlice.js";
import { useAppDispatch, useAppSelector } from "../../../../app/store/hooks.js";
import {
  emitTypingStart,
  emitTypingStop
} from "../../../../shared/services/socket.js";

const typingStopDelayMs = 900;

const formatTime = (value) => {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
};

const formatConversationTime = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  if (isToday) {
    return formatTime(date);
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric"
  }).format(date);
};

const formatLastSeen = (value) => {
  if (!value) {
    return "Offline";
  }

  return `Last seen ${formatConversationTime(value)}`;
};

const isGroupConversation = (conversation) => conversation?.type === "group";

const getConversationName = (conversation) => {
  if (isGroupConversation(conversation)) {
    return conversation?.name || "Group chat";
  }

  return conversation?.otherParticipant?.name || "Unknown user";
};

const getConversationAvatar = (conversation) => {
  if (isGroupConversation(conversation)) {
    return conversation?.avatar?.url || "";
  }

  return conversation?.otherParticipant?.avatar?.url || "";
};

const isOtherUserOnline = (conversation) => {
  if (isGroupConversation(conversation)) {
    return false;
  }

  return Boolean(conversation?.otherParticipant?.isOnline);
};

const getConversationStatus = (conversation) => {
  if (!conversation) {
    return "";
  }

  if (isGroupConversation(conversation)) {
    const count = conversation.participants?.length || 0;

    return `${count} ${count === 1 ? "member" : "members"}`;
  }

  if (conversation.otherParticipant?.isOnline) {
    return "Online";
  }

  return formatLastSeen(conversation.otherParticipant?.lastSeen);
};

const getSenderId = (message) => message.sender?._id || message.sender;

const isMessageReadByOther = ({ conversation, message, userId }) => {
  if (isGroupConversation(conversation)) {
    return false;
  }

  const otherUserId = conversation?.otherParticipant?._id;

  if (getSenderId(message) !== userId || !otherUserId) {
    return false;
  }

  return message.readBy?.some((receipt) => receipt.user === otherUserId);
};

export const useChatWorkspace = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const activeConversationId = useAppSelector(selectActiveConversationId);
  const typingByConversation = useAppSelector(selectTypingUsersByConversation);
  const typingStopTimeoutRef = useRef(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [conversationSearch, setConversationSearch] = useState("");
  const { data: conversationsData, isLoading: isLoadingConversations } =
    useGetConversationsQuery();
  const conversations = conversationsData?.conversations || [];
  const activeConversation =
    conversations.find((conversation) => conversation._id === activeConversationId) ||
    null;
  const { data: messagesData, isFetching: isFetchingMessages } =
    useGetMessagesQuery(activeConversationId, {
      skip: !activeConversationId
    });
  const [sendMessage, sendMessageState] = useSendMessageMutation();
  const [markConversationSeen] = useMarkConversationSeenMutation();
  const [leaveGroupConversation, leaveGroupConversationState] =
    useLeaveGroupConversationMutation();
  const [deleteMessage, deleteMessageState] = useDeleteMessageMutation();

  useChatRealtime();

  useEffect(() => {
    if (activeConversation?.unreadCount > 0) {
      markConversationSeen(activeConversation._id);
    }
  }, [activeConversation, markConversationSeen]);

  useEffect(() => {
    return () => {
      if (typingStopTimeoutRef.current) {
        window.clearTimeout(typingStopTimeoutRef.current);
      }
    };
  }, []);

  const filteredConversations = useMemo(() => {
    const searchTerm = conversationSearch.trim().toLowerCase();

    if (!searchTerm) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      const name = getConversationName(conversation).toLowerCase();
      const lastMessage = (conversation.lastMessagePreview || "").toLowerCase();

      return name.includes(searchTerm) || lastMessage.includes(searchTerm);
    });
  }, [conversationSearch, conversations]);

  const activeTypingUsers = useMemo(() => {
    if (!activeConversationId) {
      return [];
    }

    return Object.values(typingByConversation[activeConversationId] || {});
  }, [activeConversationId, typingByConversation]);

  const onSelectConversation = (conversationId) => {
    dispatch(setActiveConversationId(conversationId));
  };

  const onCloseConversation = () => {
    dispatch(setActiveConversationId(null));
  };

  const onDraftChange = (value) => {
    setDraftMessage(value);

    if (!activeConversationId) {
      return;
    }

    emitTypingStart(activeConversationId);

    if (typingStopTimeoutRef.current) {
      window.clearTimeout(typingStopTimeoutRef.current);
    }

    typingStopTimeoutRef.current = window.setTimeout(() => {
      emitTypingStop(activeConversationId);
    }, typingStopDelayMs);
  };

  const onSendMessage = async () => {
    const body = draftMessage.trim();

    if (!body || !activeConversationId || sendMessageState.isLoading) {
      return;
    }

    const clientTempId = `temp-${Date.now()}`;
    setDraftMessage("");
    emitTypingStop(activeConversationId);

    try {
      await sendMessage({
        body,
        clientTempId,
        conversationId: activeConversationId,
        type: "text"
      }).unwrap();
    } catch (_error) {
      setDraftMessage(body);
    }
  };

  const onLeaveGroup = async () => {
    if (!activeConversationId) {
      return;
    }

    await leaveGroupConversation(activeConversationId).unwrap();
    dispatch(setActiveConversationId(null));
  };

  const onDeleteMessage = async (messageId) => {
    if (!messageId || deleteMessageState.isLoading) {
      return;
    }

    await deleteMessage(messageId).unwrap();
  };

  return {
    activeConversation,
    activeConversationId,
    activeTypingUsers,
    conversationSearch,
    draftMessage,
    filteredConversations,
    formatConversationTime,
    formatTime,
    getConversationAvatar,
    getConversationName,
    getConversationStatus,
    isGroupConversation,
    isFetchingMessages,
    isLoadingConversations,
    isMessageReadByOther,
    isOtherUserOnline,
    leaveGroupConversationState,
    messages: messagesData?.messages || [],
    onCloseConversation,
    onDeleteMessage,
    onDraftChange,
    onLeaveGroup,
    onSelectConversation,
    onSendMessage,
    sendMessageState,
    setConversationSearch,
    user
  };
};
