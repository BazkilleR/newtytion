import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import jwt from "jsonwebtoken";
import { cookieHeader, signUp } from "../../test/auth.js";
import { listen } from "../../test/http.js";
import { createApp } from "../app.js";
import { env } from "../env.js";

let server;

beforeAll(async () => {
  server = await listen(createApp());
});

afterAll(async () => {
  await server.close();
});

const post = (path, { cookie, body } = {}) =>
  fetch(`${server.url}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie && { cookie }) },
    body: body && JSON.stringify(body),
  });

const getMe = (cookie) => fetch(`${server.url}/api/me`, { headers: cookie ? { cookie } : {} });

/** Value of one cookie from a Cookie header built by cookieHeader(). */
const cookieValue = (cookie, name) =>
  cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);

describe("requireAuth", () => {
  it("rejects requests without a token", async () => {
    const res = await getMe();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: "You need to log in" },
    });
  });

  it("rejects a forged or wrongly signed access token", async () => {
    expect((await getMe("access_token=forged.value")).status).toBe(401);

    const { user } = await signUp(server.url);
    const wrongKey = jwt.sign({}, "x".repeat(32), { subject: user.id, expiresIn: 60 });
    expect((await getMe(`access_token=${wrongKey}`)).status).toBe(401);
  });

  it("rejects an expired access token", async () => {
    const { user } = await signUp(server.url);
    const expired = jwt.sign({ exp: Math.floor(Date.now() / 1000) - 10 }, env.JWT_ACCESS_SECRET, {
      subject: user.id,
    });
    expect((await getMe(`access_token=${expired}`)).status).toBe(401);
  });

  it("does not accept a refresh token as an access token", async () => {
    const { cookie } = await signUp(server.url);
    const refresh = cookieValue(cookie, "refresh_token");
    expect((await getMe(`access_token=${refresh}`)).status).toBe(401);
  });

  it("lets a signed-up user through and exposes only their own profile", async () => {
    const { cookie, user } = await signUp(server.url, { name: "Somchai" });
    const res = await getMe(cookie);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: user.id, name: "Somchai", email: user.email });
  });

  it("returns 404 for unknown routes once logged in (401 before, so routes aren't leaked)", async () => {
    const { cookie } = await signUp(server.url);
    expect((await fetch(`${server.url}/api/nope`)).status).toBe(401);
    const res = await fetch(`${server.url}/api/nope`, { headers: { cookie } });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });
});

describe("auth routes", () => {
  it("sets httpOnly access and refresh cookies on sign-up, without the password hash", async () => {
    const res = await post("/api/auth/signup", {
      body: { name: "Malee", email: "Malee@Example.com", password: "long-enough" },
    });
    expect(res.status).toBe(201);
    const { user } = await res.json();
    expect(user).toEqual({
      id: expect.any(String),
      name: "Malee",
      email: "malee@example.com",
      createdAt: expect.any(String),
    });

    const [access, refresh] = res.headers.getSetCookie();
    expect(access).toMatch(/^access_token=.+; Max-Age=900; Path=\/api; .*HttpOnly; SameSite=Lax/);
    expect(refresh).toMatch(/^refresh_token=.+; Max-Age=2592000; Path=\/api\/auth; .*HttpOnly/);
  });

  it("rejects a duplicate email with 409 EMAIL_TAKEN", async () => {
    const { user } = await signUp(server.url);
    const res = await post("/api/auth/signup", {
      body: { name: "Again", email: user.email, password: "long-enough" },
    });
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("EMAIL_TAKEN");
  });

  it("validates the sign-up body", async () => {
    const res = await post("/api/auth/signup", {
      body: { name: "", email: "nope", password: "short" },
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("logs in with the right password, and rejects a wrong password or unknown email", async () => {
    const { user, password } = await signUp(server.url);

    const login = await post("/api/auth/login", { body: { email: user.email, password } });
    expect(login.status).toBe(200);
    expect((await login.json()).user.id).toBe(user.id);
    expect((await getMe(cookieHeader(login))).status).toBe(200);

    for (const body of [
      { email: user.email, password: "wrong-password" },
      { email: "nobody@example.com", password },
    ]) {
      const res = await post("/api/auth/login", { body });
      expect(res.status).toBe(401);
      // Same error either way, so it doesn't reveal which emails exist.
      expect((await res.json()).error).toEqual({
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }
  });

  it("refresh rotates the tokens: the new pair works, the old refresh token doesn't", async () => {
    const { cookie } = await signUp(server.url);

    const refresh = await post("/api/auth/refresh", { cookie });
    expect(refresh.status).toBe(204);
    const rotated = cookieHeader(refresh);
    expect(cookieValue(rotated, "refresh_token")).not.toBe(cookieValue(cookie, "refresh_token"));
    expect((await getMe(rotated)).status).toBe(200);

    // Reusing the old refresh token fails...
    expect((await post("/api/auth/refresh", { cookie })).status).toBe(401);
    // ...and the new one still works once.
    expect((await post("/api/auth/refresh", { cookie: rotated })).status).toBe(204);
  });

  it("refresh rejects a missing or forged refresh token", async () => {
    expect((await post("/api/auth/refresh")).status).toBe(401);
    expect((await post("/api/auth/refresh", { cookie: "refresh_token=forged" })).status).toBe(401);
  });

  it("logout clears the cookies and revokes the refresh token", async () => {
    const { cookie } = await signUp(server.url);

    const logout = await post("/api/auth/logout", { cookie });
    expect(logout.status).toBe(204);
    expect(logout.headers.getSetCookie()).toEqual([
      expect.stringMatching(/^access_token=; Path=\/api; Expires=Thu, 01 Jan 1970/),
      expect.stringMatching(/^refresh_token=; Path=\/api\/auth; Expires=Thu, 01 Jan 1970/),
    ]);

    expect((await post("/api/auth/refresh", { cookie })).status).toBe(401);
  });

  it("logout without a session still succeeds", async () => {
    expect((await post("/api/auth/logout")).status).toBe(204);
  });
});
