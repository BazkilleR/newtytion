import { env } from "../env.js";
import { ACCESS_TOKEN_TTL_SEC, REFRESH_TOKEN_TTL_SEC } from "./tokens.js";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

// httpOnly: page JavaScript can't read the tokens, so XSS can't steal them.
// sameSite "lax": the browser doesn't send them on cross-site POSTs (CSRF).
const base = { httpOnly: true, sameSite: "lax", secure: env.NODE_ENV === "production" };
const accessOptions = { ...base, path: "/api" };
// Only the auth endpoints need the refresh token, so other requests don't carry it.
const refreshOptions = { ...base, path: "/api/auth" };

export function setAuthCookies(res, { accessToken, refreshToken }) {
  res.cookie(ACCESS_COOKIE, accessToken, { ...accessOptions, maxAge: ACCESS_TOKEN_TTL_SEC * 1000 });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...refreshOptions,
    maxAge: REFRESH_TOKEN_TTL_SEC * 1000,
  });
}

export function clearAuthCookies(res) {
  res.clearCookie(ACCESS_COOKIE, accessOptions);
  res.clearCookie(REFRESH_COOKIE, refreshOptions);
}
