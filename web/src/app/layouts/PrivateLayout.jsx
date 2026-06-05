import { Navigate, Outlet, useLocation } from "react-router-dom";

import {
  selectAuthStatus,
  selectCurrentUser
} from "../../features/auth/model/authSlice.js";
import { useAppSelector } from "../store/hooks.js";

export const PrivateLayout = () => {
  const location = useLocation();
  const status = useAppSelector(selectAuthStatus);
  const user = useAppSelector(selectCurrentUser);

  if (status === "idle" || status === "loading") {
    return <div className="app-loader" aria-label="Loading app" />;
  }

  if (!user?._id && !user?.id) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};
