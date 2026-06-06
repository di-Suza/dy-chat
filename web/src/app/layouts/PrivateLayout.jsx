import { useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";

import {
  selectAuthStatus,
  selectCurrentUser
} from "../../features/auth/model/authSlice.js";
import { ProfileModal } from "../../features/profile/ui/ProfileModal/ProfileModal.jsx";
import { UserSearchModal } from "../../features/users/ui/UserSearchModal/UserSearchModal.jsx";
import { useSocketConnection } from "../hooks/useSocketConnection.js";
import { useAppSelector } from "../store/hooks.js";
import { AppSidebar } from "./AppSidebar.jsx";

export const PrivateLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const status = useAppSelector(selectAuthStatus);
  const user = useAppSelector(selectCurrentUser);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUserSearchOpen, setIsUserSearchOpen] = useState(false);

  useSocketConnection(user?._id || user?.id);

  if (status === "idle" || status === "loading") {
    return <div className="app-loader" aria-label="Loading app" />;
  }

  if (!user?._id && !user?.id) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="app-layout">
      <AppSidebar
        user={user}
        onChatsClick={() => navigate("/app")}
        onProfileClick={() => setIsProfileOpen(true)}
        onSearchClick={() => setIsUserSearchOpen(true)}
      />
      <main className="app-main">
        <Outlet
          context={{
            openUserSearch: () => setIsUserSearchOpen(true)
          }}
        />
      </main>
      <UserSearchModal
        isOpen={isUserSearchOpen}
        onClose={() => setIsUserSearchOpen(false)}
      />
      <ProfileModal
        isOpen={isProfileOpen}
        user={user}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
};
