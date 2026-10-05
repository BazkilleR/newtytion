import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";
import { AppError } from "../lib/errors.js";

/**
 * Resolves the session from the request cookie and exposes the user id as
 * `res.locals.userId`. Every route after this middleware must scope its
 * queries to that id — never to a user_id coming from the request body.
 */
export async function requireAuth(req, res, next) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) {
    throw new AppError(401, "UNAUTHORIZED", "You need to log in");
  }
  res.locals.userId = session.user.id;
  res.locals.user = session.user;
  next();
}
