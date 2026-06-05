import { Navigate, Outlet } from "react-router-dom";

import {
  selectAuthStatus,
  selectCurrentUser
} from "../../features/auth/model/authSlice.js";
import { useAppSelector } from "../store/hooks.js";

export const PublicLayout = () => {
  const status = useAppSelector(selectAuthStatus);
  const user = useAppSelector(selectCurrentUser);

  if (status === "loading") {
    return <div className="app-loader" aria-label="Loading app" />;
  }

  if (user?._id || user?.id) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
};
