import {
  Camera,
  Search,
  Trash2,
  UserMinus,
  UserRound,
  UsersRound,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useSearchUsersQuery } from "../../../users/api/usersApi.js";
import {
  useAddGroupMembersMutation,
  useDeleteGroupConversationMutation,
  useRemoveGroupMemberMutation,
  useUpdateGroupConversationMutation
} from "../../api/chatApi.js";
import { setActiveConversationId } from "../../model/chatSlice.js";
import { useAppDispatch } from "../../../../app/store/hooks.js";
import "./groupDetails.css";

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

const Avatar = ({ name, url }) => (
  <span className="group-details-user-avatar">
    {url ? (
      <img src={url} alt="" />
    ) : (
      <>
        <UserRound size={18} />
        <em>{getInitials(name)}</em>
      </>
    )}
  </span>
);

export const GroupDetailsModal = ({ conversation, isOpen, onClose, user }) => {
  const dispatch = useAppDispatch();
  const nameInputRef = useRef(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [groupName, setGroupName] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [updateGroupConversation, updateState] =
    useUpdateGroupConversationMutation();
  const [addGroupMembers, addState] = useAddGroupMembersMutation();
  const [removeGroupMember, removeState] = useRemoveGroupMemberMutation();
  const [deleteGroupConversation, deleteState] =
    useDeleteGroupConversationMutation();

  const participantIds = useMemo(
    () => new Set((conversation?.participants || []).map((member) => member._id)),
    [conversation?.participants]
  );
  const selectedUserIds = useMemo(
    () => new Set(selectedUsers.map((member) => member._id || member.id)),
    [selectedUsers]
  );
  const isAdmin = Boolean(
    conversation?.admins?.some((adminId) => adminId === user?._id)
  );
  const isSaving =
    updateState.isLoading ||
    addState.isLoading ||
    removeState.isLoading ||
    deleteState.isLoading;

  useEffect(() => {
    if (!isOpen || !conversation) {
      setAvatarFile(null);
      setAvatarPreview("");
      setGroupName("");
      setSearchValue("");
      setDebouncedSearchValue("");
      setSelectedUsers([]);
      return;
    }

    setGroupName(conversation.name || "");
    setAvatarPreview(conversation.avatar?.url || "");

    const timeoutId = window.setTimeout(() => nameInputRef.current?.focus(), 0);

    return () => window.clearTimeout(timeoutId);
  }, [conversation, isOpen]);

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
    skip: !isOpen || !isAdmin || debouncedSearchValue.length === 0
  });
  const users = (searchState.data?.users || []).filter(
    (searchUser) => !participantIds.has(searchUser._id || searchUser.id)
  );

  if (!isOpen || !conversation) {
    return null;
  }

  const toggleUser = (selectedUser) => {
    const selectedUserId = selectedUser._id || selectedUser.id;

    setSelectedUsers((current) => {
      if (current.some((item) => (item._id || item.id) === selectedUserId)) {
        return current.filter((item) => (item._id || item.id) !== selectedUserId);
      }

      return [...current, selectedUser];
    });
  };

  const onSaveDetails = async () => {
    if (!isAdmin || isSaving) {
      return;
    }

    const formData = new FormData();
    formData.append("name", groupName.trim());

    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    await updateGroupConversation({
      conversationId: conversation._id,
      formData
    }).unwrap();
  };

  const onAddMembers = async () => {
    if (!selectedUsers.length || isSaving) {
      return;
    }

    await addGroupMembers({
      conversationId: conversation._id,
      participantIds: selectedUsers.map((member) => member._id || member.id)
    }).unwrap();
    setSelectedUsers([]);
    setSearchValue("");
  };

  const onRemoveMember = async (member) => {
    const memberId = member._id || member.id;
    const shouldRemove = window.confirm(`Remove ${member.name} from this group?`);

    if (!shouldRemove) {
      return;
    }

    await removeGroupMember({
      conversationId: conversation._id,
      memberId
    }).unwrap();
  };

  const onDeleteGroup = async () => {
    const shouldDelete = window.confirm("Delete this group for every member?");

    if (!shouldDelete) {
      return;
    }

    await deleteGroupConversation(conversation._id).unwrap();
    dispatch(setActiveConversationId(null));
    onClose();
  };

  return (
    <div className="group-details-backdrop" role="presentation">
      <section
        className="group-details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-details-title"
      >
        <header className="group-details-header">
          <h2 id="group-details-title">Group Details</h2>
          <button type="button" aria-label="Close" title="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="group-details-body">
          <section className="group-details-identity">
            <label className={`group-details-avatar ${isAdmin ? "" : "is-readonly"}`}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="" />
              ) : (
                <UsersRound size={30} />
              )}
              {isAdmin ? <Camera className="group-details-camera" size={16} /> : null}
              {isAdmin ? (
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) =>
                    setAvatarFile(event.target.files?.[0] || null)
                  }
                />
              ) : null}
            </label>

            <label className="group-details-name">
              <span>Group name</span>
              <input
                ref={nameInputRef}
                type="text"
                value={groupName}
                readOnly={!isAdmin}
                maxLength={80}
                onChange={(event) => setGroupName(event.target.value)}
              />
            </label>

            {isAdmin ? (
              <button
                className="group-details-save"
                type="button"
                disabled={groupName.trim().length < 2 || isSaving}
                onClick={onSaveDetails}
              >
                {updateState.isLoading ? "Saving" : "Save changes"}
              </button>
            ) : null}
          </section>

          <section className="group-details-section">
            <div className="group-details-section-title">
              <strong>Members</strong>
              <span>{conversation.participants?.length || 0}</span>
            </div>

            <div className="group-details-members">
              {conversation.participants?.map((member) => {
                const memberId = member._id || member.id;
                const memberIsAdmin = conversation.admins?.includes(memberId);
                const isSelf = memberId === user?._id;

                return (
                  <div className="group-details-member" key={memberId}>
                    <Avatar name={member.name} url={member.avatar?.url} />
                    <span>
                      <strong>{member.name}</strong>
                      <small>{memberIsAdmin ? "Admin" : member.email}</small>
                    </span>

                    {isAdmin && !isSelf ? (
                      <button
                        type="button"
                        aria-label={`Remove ${member.name}`}
                        title="Remove member"
                        disabled={isSaving}
                        onClick={() => onRemoveMember(member)}
                      >
                        <UserMinus size={17} />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          {isAdmin ? (
            <section className="group-details-section">
              <div className="group-details-section-title">
                <strong>Add members</strong>
              </div>

              {selectedUsers.length ? (
                <div className="group-details-selected">
                  {selectedUsers.map((selectedUser) => (
                    <button
                      type="button"
                      key={selectedUser._id || selectedUser.id}
                      onClick={() => toggleUser(selectedUser)}
                    >
                      {selectedUser.name}
                      <X size={13} />
                    </button>
                  ))}
                </div>
              ) : null}

              <label className="group-details-search">
                <Search size={18} />
                <input
                  type="search"
                  value={searchValue}
                  placeholder="Search users to add"
                  onChange={(event) => setSearchValue(event.target.value)}
                />
              </label>

              <div className="group-details-results">
                {searchState.isFetching ? (
                  <div className="group-details-state">Searching users</div>
                ) : null}

                {!searchState.isFetching &&
                debouncedSearchValue &&
                users.length === 0 ? (
                  <div className="group-details-state">No users found</div>
                ) : null}

                {users.map((searchUser) => {
                  const searchUserId = searchUser._id || searchUser.id;
                  const isSelected = selectedUserIds.has(searchUserId);

                  return (
                    <button
                      className="group-details-result"
                      type="button"
                      key={searchUserId}
                      onClick={() => toggleUser(searchUser)}
                    >
                      <Avatar name={searchUser.name} url={searchUser.avatar?.url} />
                      <span>
                        <strong>{searchUser.name}</strong>
                        <small>{searchUser.email}</small>
                      </span>
                      <i className={isSelected ? "is-selected" : ""} />
                    </button>
                  );
                })}
              </div>

              <button
                className="group-details-save"
                type="button"
                disabled={!selectedUsers.length || isSaving}
                onClick={onAddMembers}
              >
                {addState.isLoading ? "Adding" : "Add selected"}
              </button>
            </section>
          ) : null}

          {isAdmin ? (
            <button
              className="group-details-danger"
              type="button"
              disabled={isSaving}
              onClick={onDeleteGroup}
            >
              <Trash2 size={17} />
              <span>{deleteState.isLoading ? "Deleting" : "Delete group"}</span>
            </button>
          ) : null}

          {updateState.error || addState.error || removeState.error || deleteState.error ? (
            <p className="group-details-error">
              {(updateState.error ||
                addState.error ||
                removeState.error ||
                deleteState.error)?.data?.message || "Unable to update group"}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
};
