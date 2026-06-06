import { MessageCircle, Search, UserRound } from "lucide-react";

import { useGetConversationsQuery } from "../../features/chat/api/chatApi.js";

const getInitials = (name = "") => {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return initials || "D";
};

export const AppSidebar = ({ onChatsClick, onProfileClick, onSearchClick, user }) => {
  const avatarUrl = user?.avatar?.url;
  const { data } = useGetConversationsQuery();
  const unseenChatCount =
    data?.conversations?.filter((conversation) => conversation.unreadCount > 0)
      .length || 0;

  return (
    <aside className="app-sidebar" aria-label="App navigation">
      <nav className="app-sidebar-nav" aria-label="Primary navigation">
        <button
          className="app-nav-button is-active"
          type="button"
          aria-label="Chats"
          title="Chats"
          onClick={onChatsClick}
        >
          <MessageCircle size={21} strokeWidth={2.25} />
          {unseenChatCount ? <span>{unseenChatCount}</span> : null}
        </button>
        <button
          className="app-nav-button"
          type="button"
          aria-label="Search users"
          title="Search users"
          onClick={onSearchClick}
        >
          <Search size={21} strokeWidth={2.25} />
        </button>
      </nav>

      <button
        className="app-sidebar-profile"
        type="button"
        aria-label="Open profile"
        title="Open profile"
        onClick={onProfileClick}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" />
        ) : (
          <span className="app-sidebar-avatar-fallback">
            <UserRound size={17} strokeWidth={2.2} />
            <span>{getInitials(user?.name)}</span>
          </span>
        )}
      </button>
    </aside>
  );
};
