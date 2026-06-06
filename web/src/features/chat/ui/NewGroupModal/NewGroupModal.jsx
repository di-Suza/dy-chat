import { Search, UserRound, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useSearchUsersQuery } from "../../../users/api/usersApi.js";
import { useCreateGroupConversationMutation } from "../../api/chatApi.js";
import "./newGroup.css";

const searchDebounceMs = 300;

const getInitials = (name = "") => {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return initials || "D";
};

export const NewGroupModal = ({ isOpen, onClose, onCreated }) => {
  const inputRef = useRef(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [groupName, setGroupName] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [createGroupConversation, createState] =
    useCreateGroupConversationMutation();

  useEffect(() => {
    if (!isOpen) {
      setAvatarFile(null);
      setAvatarPreview("");
      setGroupName("");
      setSearchValue("");
      setDebouncedSearchValue("");
      setSelectedUsers([]);
      return;
    }

    const timeoutId = window.setTimeout(() => inputRef.current?.focus(), 0);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchValue(searchValue.trim());
    }, searchDebounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [searchValue]);

  useEffect(() => {
    if (!avatarFile) {
      return undefined;
    }

    const previewUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [avatarFile]);

  const searchState = useSearchUsersQuery(debouncedSearchValue, {
    skip: !isOpen || debouncedSearchValue.length === 0
  });
  const users = searchState.data?.users || [];
  const selectedUserIds = useMemo(
    () => new Set(selectedUsers.map((user) => user._id || user.id)),
    [selectedUsers]
  );
  const canSubmit =
    groupName.trim().length >= 2 &&
    selectedUsers.length > 0 &&
    !createState.isLoading;

  if (!isOpen) {
    return null;
  }

  const toggleUser = (user) => {
    const userId = user._id || user.id;

    setSelectedUsers((current) => {
      if (current.some((item) => (item._id || item.id) === userId)) {
        return current.filter((item) => (item._id || item.id) !== userId);
      }

      return [...current, user];
    });
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    const formData = new FormData();
    formData.append("name", groupName.trim());
    formData.append(
      "participantIds",
      JSON.stringify(selectedUsers.map((user) => user._id || user.id))
    );

    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    try {
      const result = await createGroupConversation(formData).unwrap();
      onCreated?.(result.conversation?._id);
      onClose();
    } catch (_error) {
      // RTK Query exposes errors through createState.
    }
  };

  return (
    <div className="new-group-backdrop" role="presentation">
      <section
        className="new-group-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-group-title"
      >
        <header className="new-group-header">
          <h2 id="new-group-title">New Group</h2>
          <button type="button" aria-label="Close" title="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <form className="new-group-form" onSubmit={onSubmit}>
          <div className="new-group-top">
            <label className="new-group-avatar">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" />
              ) : (
                <UsersRound size={26} />
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) =>
                  setAvatarFile(event.target.files?.[0] || null)
                }
              />
            </label>

            <label className="new-group-name">
              <span>Group name</span>
              <input
                ref={inputRef}
                type="text"
                value={groupName}
                maxLength={80}
                placeholder="Enter group name"
                onChange={(event) => setGroupName(event.target.value)}
              />
            </label>
          </div>

          {selectedUsers.length ? (
            <div className="new-group-selected">
              {selectedUsers.map((user) => (
                <button
                  type="button"
                  key={user._id || user.id}
                  onClick={() => toggleUser(user)}
                >
                  {user.name}
                  <X size={13} />
                </button>
              ))}
            </div>
          ) : null}

          <label className="new-group-search">
            <Search size={18} />
            <input
              type="search"
              value={searchValue}
              placeholder="Search users to add"
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </label>

          <div className="new-group-results">
            {searchState.isFetching ? (
              <div className="new-group-state">Searching users</div>
            ) : null}

            {!searchState.isFetching &&
            debouncedSearchValue &&
            users.length === 0 ? (
              <div className="new-group-state">No users found</div>
            ) : null}

            {users.map((user) => {
              const userId = user._id || user.id;
              const isSelected = selectedUserIds.has(userId);

              return (
                <button
                  type="button"
                  className="new-group-user"
                  key={userId}
                  onClick={() => toggleUser(user)}
                >
                  <span className="new-group-user-avatar">
                    {user.avatar?.url ? (
                      <img src={user.avatar.url} alt="" />
                    ) : (
                      <>
                        <UserRound size={18} />
                        <em>{getInitials(user.name)}</em>
                      </>
                    )}
                  </span>
                  <span>
                    <strong>{user.name}</strong>
                    <small>{user.email}</small>
                  </span>
                  <i className={isSelected ? "is-selected" : ""} />
                </button>
              );
            })}
          </div>

          {createState.error ? (
            <p className="new-group-error">
              {createState.error?.data?.message || "Unable to create group"}
            </p>
          ) : null}

          <button className="new-group-submit" type="submit" disabled={!canSubmit}>
            {createState.isLoading ? "Creating" : "Create group"}
          </button>
        </form>
      </section>
    </div>
  );
};
