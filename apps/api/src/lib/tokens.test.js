import { randomUUID } from "node:crypto";
import { describe, expect, it } from "@jest/globals";
import jwt from "jsonwebtoken";
import { env } from "../env.js";
import {
  ACCESS_TOKEN_TTL_SEC,
  REFRESH_TOKEN_TTL_SEC,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "./tokens.js";

const USER_ID = "user-123";
const base64url = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");

describe("TTL constants", () => {
  it("are 15 minutes for access and 30 days for refresh", () => {
    expect(ACCESS_TOKEN_TTL_SEC).toBe(900);
    expect(REFRESH_TOKEN_TTL_SEC).toBe(2_592_000);
  });
});

describe("access tokens", () => {
  it("round-trip the user id with a 15 minute expiry", () => {
    const payload = verifyAccessToken(signAccessToken(USER_ID));
    expect(payload).toMatchObject({ sub: USER_ID });
    expect(payload.exp - payload.iat).toBe(ACCESS_TOKEN_TTL_SEC);
    expect(payload.jti).toBeUndefined();
  });

  it("are signed with HS256", () => {
    const { header } = jwt.decode(signAccessToken(USER_ID), { complete: true });
    expect(header.alg).toBe("HS256");
  });
});

describe("refresh tokens", () => {
  it("round-trip the user id and token id with a 30 day expiry", () => {
    const tokenId = randomUUID();
    const payload = verifyRefreshToken(signRefreshToken(USER_ID, tokenId));
    expect(payload).toMatchObject({ sub: USER_ID, jti: tokenId });
    expect(payload.exp - payload.iat).toBe(REFRESH_TOKEN_TTL_SEC);
  });
});

describe("verification", () => {
  it("never accepts one token type as the other", () => {
    expect(verifyRefreshToken(signAccessToken(USER_ID))).toBeNull();
    expect(verifyAccessToken(signRefreshToken(USER_ID, randomUUID()))).toBeNull();
  });

  it("returns null for a missing token", () => {
    for (const token of [undefined, null, ""]) {
      expect(verifyAccessToken(token)).toBeNull();
      expect(verifyRefreshToken(token)).toBeNull();
    }
  });

  it("returns null for garbage and tampered tokens", () => {
    expect(verifyAccessToken("not.a.jwt")).toBeNull();

    const [header, , signature] = signAccessToken(USER_ID).split(".");
    const forgedPayload = base64url({ sub: "someone-else", exp: 9_999_999_999 });
    expect(verifyAccessToken(`${header}.${forgedPayload}.${signature}`)).toBeNull();
  });

  it("returns null for an expired token", () => {
    const expired = jwt.sign({ exp: Math.floor(Date.now() / 1000) - 1 }, env.JWT_ACCESS_SECRET, {
      subject: USER_ID,
    });
    expect(verifyAccessToken(expired)).toBeNull();
  });

  it("rejects the `none` algorithm", () => {
    const unsigned = `${base64url({ alg: "none", typ: "JWT" })}.${base64url({
      sub: USER_ID,
      exp: Math.floor(Date.now() / 1000) + 60,
    })}.`;
    expect(verifyAccessToken(unsigned)).toBeNull();
  });

  it("rejects other HMAC algorithms even with the right secret (algorithm is pinned)", () => {
    const hs512 = jwt.sign({}, env.JWT_ACCESS_SECRET, {
      algorithm: "HS512",
      subject: USER_ID,
      expiresIn: 60,
    });
    expect(verifyAccessToken(hs512)).toBeNull();
  });
});
