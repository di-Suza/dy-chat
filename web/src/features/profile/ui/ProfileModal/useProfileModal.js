import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import {
  useLogoutAllMutation,
  useLogoutMutation,
  useRemoveAvatarMutation,
  useUpdateAvatarMutation,
  useUpdatePasswordMutation,
  useUpdateProfileMutation
} from "../../../auth/api/authApi.js";

export const useProfileModal = ({ isOpen, onClose, user }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [updateAvatar, updateAvatarState] = useUpdateAvatarMutation();
  const [removeAvatar, removeAvatarState] = useRemoveAvatarMutation();
  const [updateProfile, updateProfileState] = useUpdateProfileMutation();
  const [updatePassword, updatePasswordState] = useUpdatePasswordMutation();
  const [logout, logoutState] = useLogoutMutation();
  const [logoutAll, logoutAllState] = useLogoutAllMutation();

  const profileForm = useForm({
    defaultValues: {
      name: user?.name || ""
    }
  });

  const passwordForm = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: ""
    }
  });

  useEffect(() => {
    if (isOpen) {
      profileForm.reset({
        name: user?.name || ""
      });
      passwordForm.reset({
        currentPassword: "",
        newPassword: ""
      });
      setAvatarSuccess(false);
      setProfileSuccess(false);
      setPasswordSuccess(false);
    }
  }, [isOpen, passwordForm, profileForm, user?.name]);

  useEffect(() => {
    if (!avatarSuccess) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setAvatarSuccess(false);
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [avatarSuccess]);

  useEffect(() => {
    if (!profileSuccess) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setProfileSuccess(false);
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [profileSuccess]);

  useEffect(() => {
    if (!passwordSuccess) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setPasswordSuccess(false);
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [passwordSuccess]);

  const onProfileSubmit = profileForm.handleSubmit(async (values) => {
    try {
      await updateProfile({
        name: values.name.trim()
      }).unwrap();
      setProfileSuccess(true);
    } catch (_error) {
      // RTK Query exposes the renderable error state from the mutation result.
    }
  });

  const onChooseAvatar = () => {
    setAvatarSuccess(false);
    fileInputRef.current?.click();
  };

  const onAvatarChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setAvatarSuccess(false);

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      await updateAvatar(formData).unwrap();
      setAvatarSuccess(true);
    } catch (_error) {
      // RTK Query exposes the renderable error state from the mutation result.
    } finally {
      event.target.value = "";
    }
  };

  const onRemoveAvatar = async () => {
    if (!user?.avatar?.url) {
      return;
    }

    setAvatarSuccess(false);

    const shouldContinue = window.confirm("Remove profile picture?");

    if (!shouldContinue) {
      return;
    }

    try {
      await removeAvatar().unwrap();
      setAvatarSuccess(true);
    } catch (_error) {
      // RTK Query exposes the renderable error state from the mutation result.
    }
  };

  const onPasswordSubmit = passwordForm.handleSubmit(async (values) => {
    try {
      await updatePassword(values).unwrap();
      passwordForm.reset({
        currentPassword: "",
        newPassword: ""
      });
      setPasswordSuccess(true);
    } catch (_error) {
      // RTK Query exposes the renderable error state from the mutation result.
    }
  });

  const onLogout = async () => {
    try {
      await logout().unwrap();
      onClose();
      navigate("/login", {
        replace: true
      });
    } catch (_error) {
      // Auth guard will handle expired sessions; keep modal open on network errors.
    }
  };

  const onLogoutAll = async () => {
    const shouldContinue = window.confirm("End all active sessions?");

    if (!shouldContinue) {
      return;
    }

    try {
      await logoutAll().unwrap();
      onClose();
      navigate("/login", {
        replace: true
      });
    } catch (_error) {
      // Auth guard will handle expired sessions; keep modal open on network errors.
    }
  };

  return {
    avatarError: updateAvatarState.error || removeAvatarState.error,
    avatarSuccess,
    clearProfileSuccess: () => setProfileSuccess(false),
    clearPasswordSuccess: () => setPasswordSuccess(false),
    fileInputRef,
    isRemovingAvatar: removeAvatarState.isLoading,
    isUpdatingAvatar: updateAvatarState.isLoading,
    isLoggingOut: logoutState.isLoading,
    isLoggingOutAll: logoutAllState.isLoading,
    onAvatarChange,
    onChooseAvatar,
    onLogout,
    onLogoutAll,
    onPasswordSubmit,
    onProfileSubmit,
    onRemoveAvatar,
    passwordError: updatePasswordState.error,
    passwordForm,
    passwordSuccess,
    profileSuccess,
    profileError: updateProfileState.error,
    profileForm,
    updatePasswordState,
    updateProfileState
  };
};
