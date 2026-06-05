import { MessageCircle, Search, UserRound } from "lucide-react";

const getInitials = (name = "") => {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return initials || "D";
};

export const AppHeader = ({ onProfileClick, onSearchClick, user }) => {
  const avatarUrl = user?.avatar?.url;

  return (
    <header className="app-header">
      <div className="app-header-brand">
        <span className="app-header-mark">
          <MessageCircle size={20} strokeWidth={2.3} />
        </span>
        <span>DyChat</span>
      </div>

      <button
        className="app-search-trigger"
        type="button"
        aria-label="Search users"
        title="Search users"
        onClick={onSearchClick}
      >
        <Search size={18} />
        <span>Search users</span>
      </button>

      <button
        className="app-profile-button"
        type="button"
        aria-label="Open profile"
        title="Open profile"
        onClick={onProfileClick}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" />
        ) : (
          <span className="app-avatar-fallback">
            <UserRound size={17} strokeWidth={2.2} />
            <span>{getInitials(user?.name)}</span>
          </span>
        )}
      </button>
    </header>
  );
};
