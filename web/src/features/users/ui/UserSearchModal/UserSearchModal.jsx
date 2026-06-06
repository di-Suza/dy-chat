import { MessageCircle, Search, UserRound, X } from "lucide-react";

import { useStartDirectConversationMutation } from "../../../chat/api/chatApi.js";
import { useUserSearchModal } from "./useUserSearchModal.js";
import "./userSearch.css";

const getInitials = (name = "") => {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return initials || "D";
};

const getSearchErrorMessage = (error) => {
  return error?.data?.message || "Unable to search users";
};

export const UserSearchModal = ({ isOpen, onClose }) => {
  const [startDirectConversation, startDirectConversationState] =
    useStartDirectConversationMutation();
  const {
    inputRef,
    isSearching,
    searchError,
    searchValue,
    setSearchValue,
    showEmptyState,
    users
  } = useUserSearchModal({
    isOpen
  });

  if (!isOpen) {
    return null;
  }

  const onStartChat = async (userId) => {
    try {
      await startDirectConversation(userId).unwrap();

      onClose();
    } catch (_error) {
      // RTK Query exposes errors through the mutation state.
    }
  };

  return (
    <div className="user-search-backdrop" role="presentation">
      <section
        className="user-search-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-search-title"
      >
        <header className="user-search-header">
          <h2 id="user-search-title">Search users</h2>
          <button
            className="user-search-icon-button"
            type="button"
            aria-label="Close search"
            title="Close"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <div className="user-search-input-wrap">
          <Search size={19} />
          <input
            ref={inputRef}
            type="search"
            value={searchValue}
            placeholder="Search by name or email"
            onChange={(event) => setSearchValue(event.target.value)}
          />
        </div>

        <div className="user-search-results">
          {searchError ? (
            <p className="user-search-alert">
              {getSearchErrorMessage(searchError)}
            </p>
          ) : null}

          {isSearching ? (
            <div className="user-search-loading" aria-label="Searching users" />
          ) : null}

          {showEmptyState ? (
            <p className="user-search-empty">No users found.</p>
          ) : null}

          {users.map((user) => {
            const avatarUrl = user.avatar?.url;

            return (
              <div className="user-search-row" key={user._id || user.id}>
                <div className="user-search-avatar">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" />
                  ) : (
                    <>
                      <UserRound size={20} strokeWidth={2.2} />
                      <span>{getInitials(user.name)}</span>
                    </>
                  )}
                </div>

                <div className="user-search-info">
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                </div>

                <button
                  className="user-search-start-button"
                  type="button"
                  disabled={startDirectConversationState.isLoading}
                  onClick={() => onStartChat(user._id || user.id)}
                >
                  <MessageCircle size={17} />
                  <span>
                    {startDirectConversationState.isLoading
                      ? "Starting"
                      : "Start chat"}
                  </span>
                </button>
              </div>
            );
          })}

          {startDirectConversationState.error ? (
            <p className="user-search-alert">Unable to start chat.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
};
