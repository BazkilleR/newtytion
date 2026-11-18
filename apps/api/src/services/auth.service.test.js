import { randomUUID } from "node:crypto";
import { describe, expect, it } from "@jest/globals";
import { eq } from "drizzle-orm";
import { createUser } from "../../test/factories.js";
import { db } from "../db/client.js";
import { refreshToken, user } from "../db/schema/index.js";
import { verifyPassword } from "../lib/password.js";
import { signRefreshToken, verifyAccessToken, verifyRefreshToken } from "../lib/tokens.js";
import {
  getUser,
  issueTokens,
  logIn,
  revokeRefreshToken,
  rotateRefreshToken,
  signUp,
} from "./auth.service.js";

const PASSWORD = "correct-horse-battery";
const newAccount = (overrides = {}) =>
  signUp({ name: "Malee", email: `${randomUUID()}@example.com`, password: PASSWORD, ...overrides });

const tokenRows = (userId) => db.select().from(refreshToken).where(eq(refreshToken.userId, userId));

/** Insert a refresh token row that expired a minute ago. */
async function insertExpiredToken(userId) {
  const id = randomUUID();
  await db.insert(refreshToken).values({ id, userId, expiresAt: new Date(Date.now() - 60_000) });
  return id;
}

describe("signUp", () => {
  it("creates a user and returns it without the password hash", async () => {
    const account = await newAccount({ name: "Somchai" });
    expect(account).toEqual({
      id: expect.any(String),
      name: "Somchai",
      email: account.email,
      createdAt: expect.any(Date),
    });

    const [row] = await db.select().from(user).where(eq(user.id, account.id));
    expect(row.passwordHash).not.toContain(PASSWORD);
    expect(await verifyPassword(row.passwordHash, PASSWORD)).toBe(true);
  });

  it("rejects a taken email with 409 EMAIL_TAKEN", async () => {
    const first = await newAccount();
    await expect(newAccount({ email: first.email })).rejects.toMatchObject({
      status: 409,
      code: "EMAIL_TAKEN",
    });
  });
});

describe("logIn", () => {
  it("returns the user for the right password", async () => {
    const account = await newAccount();
    expect(await logIn({ email: account.email, password: PASSWORD })).toEqual(account);
  });

  it("gives the same 401 for a wrong password and an unknown email", async () => {
    const account = await newAccount();
    const invalid = {
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password",
    };
    await expect(logIn({ email: account.email, password: "wrong-password" })).rejects.toMatchObject(
      invalid,
    );
    await expect(logIn({ email: "nobody@example.com", password: PASSWORD })).rejects.toMatchObject(
      invalid,
    );
  });

  it("still logs in an account whose password was hashed by Better Auth", async () => {
    // Made by Better Auth 1.7 for "demo-password", before the switch to JWT.
    const row = await createUser({
      passwordHash:
        "9fb6dabfa397fe87d8290e8d0c86b752:3183705f46b34a9e0b6bd855a35c7a306632855d75519b911d83a7ad5f0532aa24623104e25b8efd643418d9763d09f7bcae5d0cc0902885993132d65644beb7",
    });
    expect((await logIn({ email: row.email, password: "demo-password" })).id).toBe(row.id);
    await expect(logIn({ email: row.email, password: "demo-passw0rd" })).rejects.toMatchObject({
      status: 401,
    });
  });

  it("rejects an account whose hash no password matches", async () => {
    const row = await createUser(); // passwordHash: "unusable"
    await expect(logIn({ email: row.email, password: "unusable" })).rejects.toMatchObject({
      status: 401,
    });
  });
});

describe("getUser", () => {
  it("returns the public profile", async () => {
    const account = await newAccount();
    expect(await getUser(account.id)).toEqual(account);
  });

  it("404s for an unknown id", async () => {
    await expect(getUser("missing")).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
  });
});

describe("issueTokens", () => {
  it("returns an access token for the user and records the refresh token by its jti", async () => {
    const me = await createUser();
    const { accessToken, refreshToken: refresh } = await issueTokens(me.id);

    expect(verifyAccessToken(accessToken).sub).toBe(me.id);
    const payload = verifyRefreshToken(refresh);
    expect(payload.sub).toBe(me.id);

    const rows = await tokenRows(me.id);
    expect(rows.map((r) => r.id)).toEqual([payload.jti]);
    // Row expiry ≈ token expiry (30 days)
    expect(Math.abs(rows[0].expiresAt.getTime() / 1000 - payload.exp)).toBeLessThan(5);
  });

  it("allows several sessions (one row per device)", async () => {
    const me = await createUser();
    await issueTokens(me.id);
    await issueTokens(me.id);
    expect(await tokenRows(me.id)).toHaveLength(2);
  });

  it("drops the user's expired tokens, but not other users'", async () => {
    const me = await createUser();
    const other = await createUser();
    const mineExpired = await insertExpiredToken(me.id);
    const theirsExpired = await insertExpiredToken(other.id);

    await issueTokens(me.id);

    const mine = (await tokenRows(me.id)).map((r) => r.id);
    expect(mine).toHaveLength(1);
    expect(mine).not.toContain(mineExpired);
    expect((await tokenRows(other.id)).map((r) => r.id)).toEqual([theirsExpired]);
  });
});

describe("rotateRefreshToken", () => {
  it("trades a refresh token for a new pair, exactly once", async () => {
    const me = await createUser();
    const first = await issueTokens(me.id);

    const second = await rotateRefreshToken(first.refreshToken);
    expect(verifyAccessToken(second.accessToken).sub).toBe(me.id);
    expect(second.refreshToken).not.toBe(first.refreshToken);

    const rows = await tokenRows(me.id);
    expect(rows.map((r) => r.id)).toEqual([verifyRefreshToken(second.refreshToken).jti]);

    await expect(rotateRefreshToken(first.refreshToken)).rejects.toMatchObject({ status: 401 });
  });

  it("lets only one of two concurrent refreshes with the same token succeed", async () => {
    const me = await createUser();
    const { refreshToken: token } = await issueTokens(me.id);
    const results = await Promise.allSettled([
      rotateRefreshToken(token),
      rotateRefreshToken(token),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual(["fulfilled", "rejected"]);
  });

  it("rejects missing, invalid and access tokens", async () => {
    const me = await createUser();
    const { accessToken } = await issueTokens(me.id);
    for (const token of [undefined, "", "junk", accessToken]) {
      await expect(rotateRefreshToken(token)).rejects.toMatchObject({
        status: 401,
        code: "UNAUTHORIZED",
      });
    }
  });

  it("rejects a validly signed token whose row has expired", async () => {
    const me = await createUser();
    const tokenId = await insertExpiredToken(me.id);
    await expect(rotateRefreshToken(signRefreshToken(me.id, tokenId))).rejects.toMatchObject({
      status: 401,
    });
  });

  it("rejects a token whose subject doesn't own the row", async () => {
    const me = await createUser();
    const other = await createUser();
    const { refreshToken: mine } = await issueTokens(me.id);
    const forged = signRefreshToken(other.id, verifyRefreshToken(mine).jti);

    await expect(rotateRefreshToken(forged)).rejects.toMatchObject({ status: 401 });
    // The real owner's token still works
    await expect(rotateRefreshToken(mine)).resolves.toHaveProperty("accessToken");
  });
});

describe("revokeRefreshToken", () => {
  it("deletes the token's row so it can't be used again", async () => {
    const me = await createUser();
    const keep = await issueTokens(me.id);
    const revoke = await issueTokens(me.id);

    await revokeRefreshToken(revoke.refreshToken);

    expect((await tokenRows(me.id)).map((r) => r.id)).toEqual([
      verifyRefreshToken(keep.refreshToken).jti,
    ]);
    await expect(rotateRefreshToken(revoke.refreshToken)).rejects.toMatchObject({ status: 401 });
  });

  it("silently ignores missing or invalid tokens", async () => {
    await expect(revokeRefreshToken(undefined)).resolves.toBeUndefined();
    await expect(revokeRefreshToken("junk")).resolves.toBeUndefined();
  });
});
