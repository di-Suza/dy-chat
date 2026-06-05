import { Mutex } from "async-mutex";

import { clearUser } from "../../features/auth/model/authSlice.js";
import { baseApi } from "./baseApi.js";
import { baseQuery } from "./baseQuery.js";

const mutex = new Mutex();

const authRoutes = ["/auth/login", "/auth/register"];

const getRequestUrl = (args) => {
  if (typeof args === "string") {
    return args;
  }

  return args?.url || "";
};

const clearAuthSession = (apiInstance) => {
  apiInstance.dispatch(clearUser());
  apiInstance.dispatch(baseApi.util.resetApiState());
};

export const baseQueryWithAuthGuard = async (args, apiInstance, extraOptions) => {
  await mutex.waitForUnlock();

  let result = await baseQuery(args, apiInstance, extraOptions);
  const url = getRequestUrl(args);
  const isAuthRoute = authRoutes.some((route) => url.includes(route));
  const isRefreshRoute = url.includes("/auth/refresh");
  const isLoggedOut = apiInstance.getState().auth.isLoggedOut;

  if (!result?.error) {
    return result;
  }

  if (isLoggedOut && !isAuthRoute) {
    return result;
  }

  if (isRefreshRoute) {
    clearAuthSession(apiInstance);
    return result;
  }

  if (result.error.status !== 401 || isAuthRoute) {
    return result;
  }

  if (!mutex.isLocked()) {
    const release = await mutex.acquire();

    try {
      const refreshResult = await baseQuery(
        {
          url: "/auth/refresh",
          method: "POST"
        },
        apiInstance,
        extraOptions
      );

      if (refreshResult?.data) {
        result = await baseQuery(args, apiInstance, extraOptions);
      } else {
        clearAuthSession(apiInstance);
      }
    } finally {
      release();
    }

    return result;
  }

  await mutex.waitForUnlock();

  if (apiInstance.getState().auth.isLoggedOut) {
    return result;
  }

  return baseQuery(args, apiInstance, extraOptions);
};
