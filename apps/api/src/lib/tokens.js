import jwt from "jsonwebtoken";
import { env } from "../env.js";

// Short-lived access token: requireAuth trusts it without a DB lookup, so a
// logged-out or deleted user keeps access for at most this long.
export const ACCESS_TOKEN_TTL_SEC = 15 * 60;
// 30 days: stay logged in on the gym phone.
export const REFRESH_TOKEN_TTL_SEC = 30 * 24 * 60 * 60;

// Pin the algorithm so a token can't pick its own (e.g. "none").
const ALGORITHM = "HS256";

export function signAccessToken(userId) {
  return jwt.sign({}, env.JWT_ACCESS_SECRET, {
    algorithm: ALGORITHM,
    subject: userId,
    expiresIn: ACCESS_TOKEN_TTL_SEC,
  });
}

export function signRefreshToken(userId, tokenId) {
  return jwt.sign({}, env.JWT_REFRESH_SECRET, {
    algorithm: ALGORITHM,
    subject: userId,
    jwtid: tokenId,
    expiresIn: REFRESH_TOKEN_TTL_SEC,
  });
}

// Separate secrets, so a refresh token is never accepted as an access token
// (or the other way round).
function verify(token, secret) {
  if (!token) return null;
  try {
    return jwt.verify(token, secret, { algorithms: [ALGORITHM] });
  } catch {
    // Expired, tampered or malformed: all mean "not logged in".
    return null;
  }
}

/** Payload `{ sub, iat, exp }`, or null if the token is missing or invalid. */
export const verifyAccessToken = (token) => verify(token, env.JWT_ACCESS_SECRET);

/** Payload `{ sub, jti, iat, exp }`, or null if the token is missing or invalid. */
export const verifyRefreshToken = (token) => verify(token, env.JWT_REFRESH_SECRET);
