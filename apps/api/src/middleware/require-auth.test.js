import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cookieHeader, signUp } from "../../test/auth.js";
import { listen } from "../../test/http.js";
import { createApp } from "../app.js";

const ORIGIN = process.env.BETTER_AUTH_URL;
let server;

beforeAll(async () => {
  server = await listen(createApp());
});

afterAll(async () => {
  await server.close();
});

describe("requireAuth", () => {
  it("rejects requests without a session", async () => {
    const res = await fetch(`${server.url}/api/me`);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: "You need to log in" },
    });
  });

  it("rejects a forged session cookie", async () => {
    const res = await fetch(`${server.url}/api/me`, {
      headers: { cookie: "better-auth.session_token=forged.value" },
    });
    expect(res.status).toBe(401);
  });

  it("lets a signed-up user through and exposes only their own profile", async () => {
    const { cookie, user } = await signUp(server.url, { name: "Somchai" });
    const res = await fetch(`${server.url}/api/me`, { headers: { cookie } });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: user.id, name: "Somchai", email: user.email });
  });

  it("works again after logging in, and stops working after logging out", async () => {
    const { user, password } = await signUp(server.url);

    const login = await fetch(`${server.url}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN },
      body: JSON.stringify({ email: user.email, password }),
    });
    expect(login.status).toBe(200);
    const cookie = cookieHeader(login);

    expect((await fetch(`${server.url}/api/me`, { headers: { cookie } })).status).toBe(200);

    const logout = await fetch(`${server.url}/api/auth/sign-out`, {
      method: "POST",
      headers: { cookie, origin: ORIGIN },
    });
    expect(logout.status).toBe(200);

    expect((await fetch(`${server.url}/api/me`, { headers: { cookie } })).status).toBe(401);
  });

  it("rejects a wrong password", async () => {
    const { user } = await signUp(server.url);
    const res = await fetch(`${server.url}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN },
      body: JSON.stringify({ email: user.email, password: "wrong-password" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown routes once logged in (401 before, so routes aren't leaked)", async () => {
    const { cookie } = await signUp(server.url);
    expect((await fetch(`${server.url}/api/nope`)).status).toBe(401);
    const res = await fetch(`${server.url}/api/nope`, { headers: { cookie } });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });
});
