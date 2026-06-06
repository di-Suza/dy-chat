import {
  CheckCheck,
  LogOut,
  Menu,
  MessageCircle,
  Paperclip,
  Phone,
  Search,
  Send,
  UserRound
} from "lucide-react";
import { useState } from "react";

import { setActiveConversationId } from "../../model/chatSlice.js";
import { useAppDispatch } from "../../../../app/store/hooks.js";
import { GroupDetailsModal } from "../GroupDetailsModal/GroupDetailsModal.jsx";
import { NewGroupModal } from "../NewGroupModal/NewGroupModal.jsx";
import { useChatWorkspace } from "./useChatWorkspace.js";
import "./chat.css";

const getInitials = (name = "") => {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return initials || "D";
};

const Avatar = ({ isOnline, name, size = "md", url }) => {
  return (
    <div className={`chat-avatar chat-avatar-${size}`}>
      {url ? (
        <img src={url} alt="" />
      ) : (
        <>
          <UserRound size={size === "lg" ? 24 : 18} strokeWidth={2.2} />
          <span>{getInitials(name)}</span>
        </>
      )}
      <i className={isOnline ? "is-online" : ""} />
    </div>
  );
};

export const ChatWorkspace = ({ onOpenUserSearch }) => {
  const dispatch = useAppDispatch();
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isGroupDetailsOpen, setIsGroupDetailsOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [panelMenu, setPanelMenu] = useState(null);
  const [messageMenu, setMessageMenu] = useState(null);
  const {
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
    isFetchingConversations,
    isFetchingMessages,
    isLoadingConversations,
    isMessageReadByOther,
    isOtherUserOnline,
    leaveGroupConversationState,
    messages,
    onCloseConversation,
    onDeleteMessage,
    onDraftChange,
    onLeaveGroup,
    onSelectConversation,
    onSendMessage,
    sendMessageState,
    setConversationSearch,
    user
  } = useChatWorkspace();
  const typingUserName = activeTypingUsers[0]?.name;
  const isActiveGroup = isGroupConversation(activeConversation);

  const openNewChat = () => {
    setIsActionMenuOpen(false);
    onOpenUserSearch?.();
  };

  const openNewGroup = () => {
    setIsActionMenuOpen(false);
    setIsNewGroupOpen(true);
  };

  const confirmLeaveGroup = async () => {
    const shouldLeave = window.confirm("Leave this group?");

    if (shouldLeave) {
      await onLeaveGroup();
    }
  };

  const onPanelContextMenu = (event) => {
    if (!activeConversation) {
      return;
    }

    event.preventDefault();
    setMessageMenu(null);
    setPanelMenu({
      x: event.clientX,
      y: event.clientY
    });
  };

  const onMessageContextMenu = (event, message, isSent) => {
    if (
      !isSent ||
      message.isDeleted ||
      message.isPending ||
      message.optimistic ||
      message.type === "system"
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setPanelMenu(null);
    setMessageMenu({
      message,
      x: event.clientX,
      y: event.clientY
    });
  };

  return (
    <section
      className="chat-workspace"
      aria-label="Messages"
      onClick={() => {
        setPanelMenu(null);
        setMessageMenu(null);
      }}
    >
      <aside className="chat-sidebar">
        <header className="chat-sidebar-header">
          <div>
            <span>Inbox</span>
            <h1>Messages</h1>
          </div>
          <div className="chat-sidebar-menu">
            <button
              className="chat-round-button"
              type="button"
              aria-label="Chat actions"
              title="Chat actions"
              onClick={() => setIsActionMenuOpen((value) => !value)}
            >
              <Menu size={19} />
            </button>

            {isActionMenuOpen ? (
              <div className="chat-action-dropdown">
                <button type="button" onClick={openNewChat}>
                  New Chat
                </button>
                <button type="button" onClick={openNewGroup}>
                  New Group
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <label className="chat-conversation-search">
          <Search size={17} />
          <input
            type="search"
            value={conversationSearch}
            placeholder="Search conversations"
            onChange={(event) => setConversationSearch(event.target.value)}
          />
        </label>

        <div className="chat-conversation-list">
          {isLoadingConversations || (isFetchingConversations && !filteredConversations.length) ? (
            <div className="chat-empty-list">Loading conversations</div>
          ) : filteredConversations.length ? (
            <>
              {isFetchingConversations ? (
                <div className="chat-list-refreshing">Refreshing chats</div>
              ) : null}
              {filteredConversations.map((conversation) => {
              const isActive = conversation._id === activeConversationId;
              const name = getConversationName(conversation);

              return (
                <button
                  className={`chat-conversation-item ${
                    isActive ? "is-active" : ""
                  }`}
                  type="button"
                  key={conversation._id}
                  onClick={() => onSelectConversation(conversation._id)}
                >
                  <Avatar
                    isOnline={isOtherUserOnline(conversation)}
                    name={name}
                    url={getConversationAvatar(conversation)}
                  />
                  <span className="chat-conversation-copy">
                    <strong>{name}</strong>
                    <small>
                      {conversation.lastMessagePreview || "No messages yet"}
                    </small>
                  </span>
                  <span className="chat-conversation-meta">
                    <time>
                      {formatConversationTime(
                        conversation.lastMessageAt || conversation.updatedAt
                      )}
                    </time>
                    {conversation.unreadCount ? (
                      <em>{conversation.unreadCount}</em>
                    ) : null}
                  </span>
                </button>
              );
            })}
            </>
          ) : (
            <div className="chat-empty-list">No chats yet</div>
          )}
        </div>
      </aside>

      {activeConversation ? (
        <section
          className="chat-panel"
          aria-label="Conversation"
          onContextMenu={onPanelContextMenu}
        >
          <header className="chat-panel-header">
            <button
              className={`chat-contact chat-contact-button ${
                isActiveGroup ? "is-clickable" : ""
              }`}
              type="button"
              disabled={!isActiveGroup}
              onClick={() => {
                if (isActiveGroup) {
                  setIsGroupDetailsOpen(true);
                }
              }}
            >
              <Avatar
                isOnline={isOtherUserOnline(activeConversation)}
                name={getConversationName(activeConversation)}
                size="lg"
                url={getConversationAvatar(activeConversation)}
              />
              <div>
                <h2>{getConversationName(activeConversation)}</h2>
                <p>
                  {typingUserName
                    ? `${typingUserName} is typing`
                    : getConversationStatus(activeConversation)}
                </p>
              </div>
            </button>

            <div className="chat-header-actions">
              {isActiveGroup ? (
                <button
                  type="button"
                  aria-label="Leave group"
                  title="Leave group"
                  disabled={leaveGroupConversationState.isLoading}
                  onClick={confirmLeaveGroup}
                >
                  <LogOut size={19} />
                </button>
              ) : (
                <button type="button" aria-label="Start call" title="Start call">
                  <Phone size={19} />
                </button>
              )}
            </div>
          </header>

          <div className="chat-message-list">
            {isFetchingMessages ? (
              <div className="chat-message-state">Loading messages</div>
            ) : messages.length ? (
              messages.map((message) => {
                const isSent = (message.sender?._id || message.sender) === user?._id;
                const senderName = message.sender?.name || "User";
                const isSystemMessage = message.type === "system";

                return (
                  <article
                    className={`chat-message ${
                      isSystemMessage
                        ? "is-system"
                        : isSent
                          ? "is-sent"
                          : "is-received"
                    }`}
                    key={message._id}
                    onContextMenu={(event) =>
                      onMessageContextMenu(event, message, isSent)
                    }
                  >
                    {isActiveGroup && !isSent && !isSystemMessage ? (
                      <strong className="chat-message-sender">{senderName}</strong>
                    ) : null}
                    <p>
                      {message.isDeleted
                        ? "This message was deleted"
                        : message.body || `${message.type} message`}
                    </p>
                    {!isSystemMessage ? (
                      <span>
                        {formatTime(message.createdAt)}
                        {isSent ? (
                          <CheckCheck
                            className={
                              isMessageReadByOther({
                                conversation: activeConversation,
                                message,
                                userId: user?._id
                              })
                                ? "is-read"
                                : ""
                            }
                            size={15}
                            aria-hidden="true"
                          />
                        ) : null}
                      </span>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <div className="chat-message-state">No messages yet</div>
            )}
          </div>

          <footer className="chat-composer-area">
            {typingUserName ? (
              <div className="chat-typing-indicator">
                <span>{typingUserName} is typing</span>
                <i />
                <i />
                <i />
              </div>
            ) : (
              <div className="chat-typing-spacer" />
            )}

            <form
              className="chat-composer"
              onSubmit={(event) => {
                event.preventDefault();
                onSendMessage();
              }}
            >
              <button type="button" aria-label="Attach files" title="Attach files">
                <Paperclip size={20} />
              </button>
              <input
                type="text"
                value={draftMessage}
                placeholder="Type a message"
                onChange={(event) => onDraftChange(event.target.value)}
              />
              <button
                type="submit"
                aria-label="Send message"
                title="Send message"
                disabled={sendMessageState.isLoading}
              >
                <Send size={20} />
              </button>
            </form>
          </footer>
        </section>
      ) : (
        <section className="chat-panel chat-panel-empty" aria-label="Conversation">
          <div className="chat-empty-panel">
            <MessageCircle size={42} strokeWidth={1.8} />
            <h2>Select a conversation</h2>
            <p>Choose a chat from the sidebar or start one from search.</p>
          </div>
        </section>
      )}

      {panelMenu ? (
        <div
          className="chat-context-menu"
          style={{
            left: panelMenu.x,
            top: panelMenu.y
          }}
        >
          <button type="button" onClick={onCloseConversation}>
            Close chat
          </button>
        </div>
      ) : null}

      {messageMenu ? (
        <div
          className="chat-context-menu"
          style={{
            left: messageMenu.x,
            top: messageMenu.y
          }}
        >
          <button
            type="button"
            onClick={() => onDeleteMessage(messageMenu.message._id)}
          >
            Unsend message
          </button>
        </div>
      ) : null}

      <NewGroupModal
        isOpen={isNewGroupOpen}
        onClose={() => setIsNewGroupOpen(false)}
        onCreated={(conversationId) => {
          if (conversationId) {
            dispatch(setActiveConversationId(conversationId));
          }
        }}
      />

      <GroupDetailsModal
        conversation={activeConversation}
        isOpen={isGroupDetailsOpen && isActiveGroup}
        user={user}
        onClose={() => setIsGroupDetailsOpen(false)}
      />
    </section>
  );
};
