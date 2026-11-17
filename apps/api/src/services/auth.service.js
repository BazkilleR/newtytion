import { randomUUID } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "../db/client.js";
import { refreshToken, user } from "../db/schema/index.js";
import { PG_UNIQUE_VIOLATION, pgErrorCode } from "../lib/db-errors.js";
import { AppError, conflict, notFound, unauthorized } from "../lib/errors.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import {
  REFRESH_TOKEN_TTL_SEC,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../lib/tokens.js";

const toUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  createdAt: row.createdAt,
});

const invalidCredentials = () =>
  new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");

// Hashed once, used when the email is unknown (see logIn).
let dummyHash;

export async function signUp({ name, email, password }) {
  const passwordHash = await hashPassword(password);
  try {
    const [row] = await db
      .insert(user)
      .values({ id: randomUUID(), name, email, passwordHash })
      .returning();
    return toUser(row);
  } catch (err) {
    if (pgErrorCode(err) === PG_UNIQUE_VIOLATION) {
      throw conflict("EMAIL_TAKEN", "An account with this email already exists");
    }
    throw err;
  }
}

export async function logIn({ email, password }) {
  const [row] = await db.select().from(user).where(eq(user.email, email));
  // Run scrypt even for an unknown email, so the response time doesn't reveal
  // which emails have an account.
  dummyHash ??= await hashPassword("dummy-password");
  const ok = await verifyPassword(row?.passwordHash ?? dummyHash, password);
  if (!row || !ok) throw invalidCredentials();
  return toUser(row);
}

export async function getUser(userId) {
  const [row] = await db.select().from(user).where(eq(user.id, userId));
  if (!row) throw notFound("User");
  return toUser(row);
}

/** New access + refresh token pair; the refresh token is recorded so it can be revoked. */
export async function issueTokens(userId) {
  const tokenId = randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SEC * 1000);
  // Housekeeping: drop this user's expired refresh tokens while we're here.
  await db
    .delete(refreshToken)
    .where(and(eq(refreshToken.userId, userId), lt(refreshToken.expiresAt, new Date())));
  await db.insert(refreshToken).values({ id: tokenId, userId, expiresAt });
  return {
    accessToken: signAccessToken(userId),
    refreshToken: signRefreshToken(userId, tokenId),
  };
}

/**
 * Rotation: trade a refresh token for a new pair. Deleting the old row is the
 * check itself, so a token that was already used, revoked or expired fails,
 * and two concurrent refreshes with the same token can't both succeed.
 */
export async function rotateRefreshToken(token) {
  const payload = verifyRefreshToken(token);
  if (!payload) throw unauthorized();

  const [row] = await db
    .delete(refreshToken)
    .where(
      and(
        eq(refreshToken.id, payload.jti),
        eq(refreshToken.userId, payload.sub),
        gt(refreshToken.expiresAt, new Date()),
      ),
    )
    .returning();
  if (!row) throw unauthorized();

  return issueTokens(row.userId);
}

/** Logout: forget the refresh token. Missing or invalid tokens are ignored. */
export async function revokeRefreshToken(token) {
  const payload = verifyRefreshToken(token);
  if (!payload) return;
  await db.delete(refreshToken).where(eq(refreshToken.id, payload.jti));
}
