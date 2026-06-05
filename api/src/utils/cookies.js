import { env } from "../config/env.js";

// Shared secure cookie options for access and refresh token cookies.
const baseCookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: env.cookieSameSite,
  secure: env.cookieSecure
};

// Sets httpOnly auth cookies; frontend never reads these tokens directly.
export const setAuthCookies = (res, { accessToken, refreshToken }) => {
  if (accessToken) {
    res.cookie(env.accessTokenCookieName, accessToken.token, {
      ...baseCookieOptions,
      expires: accessToken.expiresAt
    });
  }

  if (refreshToken) {
    res.cookie(env.refreshTokenCookieName, refreshToken.token, {
      ...baseCookieOptions,
      expires: refreshToken.expiresAt
    });
  }
};

// Clears both auth cookies with the same options used while setting them.
export const clearAuthCookies = (res) => {
  const clearOptions = {
    ...baseCookieOptions,
    expires: new Date(0)
  };

  res.clearCookie(env.accessTokenCookieName, clearOptions);
  res.clearCookie(env.refreshTokenCookieName, clearOptions);
};
