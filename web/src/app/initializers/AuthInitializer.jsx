import { useGetMeQuery } from "../../features/auth/api/authApi.js";
import {
  selectCurrentUser,
  selectIsLoggedOut
} from "../../features/auth/model/authSlice.js";
import { useAppSelector } from "../store/hooks.js";

export const AuthInitializer = ({ children }) => {
  const user = useAppSelector(selectCurrentUser);
  const isLoggedOut = useAppSelector(selectIsLoggedOut);

  const { isLoading } = useGetMeQuery(undefined, {
    refetchOnMountOrArgChange: true,
    skip: Boolean(user) || isLoggedOut
  });

  if (isLoading) {
    return <div className="app-loader" aria-label="Loading app" />;
  }

  return children;
};
