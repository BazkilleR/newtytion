import { ACCESS_COOKIE } from "../lib/auth-cookies.js";
import { unauthorized } from "../lib/errors.js";
import { verifyAccessToken } from "../lib/tokens.js";

/**
 * Verifies the access token cookie and exposes the user id as
 * `res.locals.userId`. Every route after this middleware must scope its
 * queries to that id — never to a user_id coming from the request body.
 *
 * No DB lookup: the JWT signature is the proof. When the token expires the
 * client calls POST /api/auth/refresh and retries.
 */
export function requireAuth(req, res, next) {
  const payload = verifyAccessToken(req.cookies[ACCESS_COOKIE]);
  if (!payload) throw unauthorized();
  res.locals.userId = payload.sub;
  next();
}
