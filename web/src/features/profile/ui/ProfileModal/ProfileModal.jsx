import { Camera, LogOut, ShieldX, Trash2, UserRound, X } from "lucide-react";

import { getAuthErrorMessage } from "../../../auth/lib/getAuthErrorMessage.js";
import { useProfileModal } from "./useProfileModal.js";
import "./profile.css";

const getInitials = (name = "") => {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return initials || "D";
};

export const ProfileModal = ({ isOpen, onClose, user }) => {
  const {
    avatarError,
    avatarSuccess,
    clearPasswordSuccess,
    clearProfileSuccess,
    fileInputRef,
    isRemovingAvatar,
    isUpdatingAvatar,
    isLoggingOut,
    isLoggingOutAll,
    onAvatarChange,
    onChooseAvatar,
    onLogout,
    onLogoutAll,
    onPasswordSubmit,
    onProfileSubmit,
    onRemoveAvatar,
    passwordError,
    passwordForm,
    passwordSuccess,
    profileError,
    profileForm,
    profileSuccess,
    updatePasswordState,
    updateProfileState
  } = useProfileModal({
    isOpen,
    onClose,
    user
  });

  if (!isOpen) {
    return null;
  }

  const avatarUrl = user?.avatar?.url;
  const profileErrors = profileForm.formState.errors;
  const passwordErrors = passwordForm.formState.errors;

  return (
    <div className="profile-modal-backdrop" role="presentation">
      <section
        className="profile-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        <header className="profile-modal-header">
          <div className="profile-title-wrap">
            <div className="profile-avatar">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" />
              ) : (
                <>
                  <UserRound size={20} strokeWidth={2.2} />
                  <span>{getInitials(user?.name)}</span>
                </>
              )}
            </div>
            <div>
              <h2 id="profile-modal-title">Profile</h2>
              <p>{user?.email}</p>
            </div>
          </div>
          <button
            className="profile-icon-button"
            type="button"
            aria-label="Close profile"
            title="Close"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <div className="profile-modal-body">
          <div className="profile-photo-section">
            <div className="profile-avatar profile-avatar-large">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" />
              ) : (
                <>
                  <UserRound size={26} strokeWidth={2.2} />
                  <span>{getInitials(user?.name)}</span>
                </>
              )}
            </div>

            <div className="profile-photo-content">
              <div className="profile-section-heading">
                <h3>Photo</h3>
              </div>
              <input
                ref={fileInputRef}
                className="profile-file-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={onAvatarChange}
              />
              <div className="profile-photo-actions">
                <button
                  className="profile-secondary-button"
                  type="button"
                  disabled={isUpdatingAvatar}
                  onClick={onChooseAvatar}
                >
                  <Camera size={17} />
                  <span>{isUpdatingAvatar ? "Uploading" : "Upload photo"}</span>
                </button>
                <button
                  className="profile-danger-button"
                  type="button"
                  disabled={!avatarUrl || isRemovingAvatar}
                  onClick={onRemoveAvatar}
                >
                  <Trash2 size={17} />
                  <span>{isRemovingAvatar ? "Removing" : "Remove"}</span>
                </button>
              </div>

              {avatarError ? (
                <p className="profile-alert profile-alert-error">
                  {getAuthErrorMessage(avatarError)}
                </p>
              ) : null}

              {avatarSuccess ? (
                <p className="profile-alert profile-alert-success">
                  Profile picture saved.
                </p>
              ) : null}
            </div>
          </div>

          <form className="profile-form" onSubmit={onProfileSubmit}>
            <div className="profile-section-heading">
              <h3>Account</h3>
            </div>

            <label className="profile-field">
              <span>Name</span>
              <input
                type="text"
                autoComplete="name"
                onInput={clearProfileSuccess}
                {...profileForm.register("name", {
                  required: "Name is required",
                  minLength: {
                    value: 2,
                    message: "Name must be at least 2 characters"
                  },
                  maxLength: {
                    value: 80,
                    message: "Name must be at most 80 characters"
                  }
                })}
              />
              {profileErrors.name ? (
                <small>{profileErrors.name.message}</small>
              ) : null}
            </label>

            <label className="profile-field">
              <span>Email</span>
              <input type="email" value={user?.email || ""} disabled />
            </label>

            {profileError ? (
              <p className="profile-alert profile-alert-error">
                {getAuthErrorMessage(profileError)}
              </p>
            ) : null}

            {profileSuccess ? (
              <p className="profile-alert profile-alert-success">
                Profile updated.
              </p>
            ) : null}

            <button
              className="profile-primary-button"
              type="submit"
              disabled={updateProfileState.isLoading}
            >
              {updateProfileState.isLoading ? "Saving" : "Save profile"}
            </button>
          </form>

          <form className="profile-form" onSubmit={onPasswordSubmit}>
            <div className="profile-section-heading">
              <h3>Password</h3>
            </div>

            <label className="profile-field">
              <span>Current password</span>
              <input
                type="password"
                autoComplete="current-password"
                onInput={clearPasswordSuccess}
                {...passwordForm.register("currentPassword", {
                  required: "Current password is required"
                })}
              />
              {passwordErrors.currentPassword ? (
                <small>{passwordErrors.currentPassword.message}</small>
              ) : null}
            </label>

            <label className="profile-field">
              <span>New password</span>
              <input
                type="password"
                autoComplete="new-password"
                onInput={clearPasswordSuccess}
                {...passwordForm.register("newPassword", {
                  required: "New password is required",
                  minLength: {
                    value: 6,
                    message: "New password must be at least 6 characters"
                  }
                })}
              />
              {passwordErrors.newPassword ? (
                <small>{passwordErrors.newPassword.message}</small>
              ) : null}
            </label>

            {passwordError ? (
              <p className="profile-alert profile-alert-error">
                {getAuthErrorMessage(passwordError)}
              </p>
            ) : null}

            {passwordSuccess ? (
              <p className="profile-alert profile-alert-success">
                Password updated.
              </p>
            ) : null}

            <button
              className="profile-primary-button"
              type="submit"
              disabled={updatePasswordState.isLoading}
            >
              {updatePasswordState.isLoading ? "Updating" : "Update password"}
            </button>
          </form>

          <div className="profile-session-actions">
            <button
              className="profile-secondary-button"
              type="button"
              disabled={isLoggingOut}
              onClick={onLogout}
            >
              <LogOut size={17} />
              <span>{isLoggingOut ? "Logging out" : "Logout"}</span>
            </button>
            <button
              className="profile-danger-button"
              type="button"
              disabled={isLoggingOutAll}
              onClick={onLogoutAll}
            >
              <ShieldX size={17} />
              <span>{isLoggingOutAll ? "Ending" : "End all sessions"}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
