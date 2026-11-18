import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { signUp } from "../../test/auth.js";
import { client, listen } from "../../test/http.js";
import { createApp } from "../app.js";

let server;

beforeAll(async () => {
  server = await listen(createApp());
});

afterAll(async () => {
  await server.close();
});

const PROTECTED = [
  ["GET", "/api/me"],
  ["GET", "/api/foods"],
  ["POST", "/api/foods"],
  ["GET", "/api/meals?date=2026-10-06"],
  ["POST", "/api/meals"],
  ["GET", "/api/goals"],
  ["PUT", "/api/goals"],
  ["GET", "/api/exercises"],
  ["GET", "/api/exercises/performed"],
  ["GET", "/api/workouts"],
  ["POST", "/api/workouts"],
  ["GET", "/api/workouts/muscle-sets?from=2026-10-01&to=2026-10-07"],
  ["GET", "/api/body-logs?from=2026-10-01&to=2026-10-07"],
  ["PUT", "/api/body-logs/2026-10-06"],
];

describe("api router", () => {
  it.each(PROTECTED)("requires a login for %s %s", async (method, path) => {
    const res = await fetch(`${server.url}${path}`, {
      method,
      headers: { "content-type": "application/json" },
      body: method === "GET" ? undefined : "{}",
    });
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHORIZED");
  });

  it("checks the login before validating the request", async () => {
    // Bad body and bad id, but no cookie: 401, not 400
    const { status } = await client(server.url).post("/api/workouts/not-a-uuid/sets", {});
    expect(status).toBe(401);
  });

  it("keeps health and auth public", async () => {
    const api = client(server.url);
    expect((await api.get("/api/health")).status).toBe(200);
    expect((await api.post("/api/auth/logout")).status).toBe(204);
    expect((await api.post("/api/auth/login", {})).status).toBe(400);
  });

  it("mounts every protected router for a logged-in user", async () => {
    const { cookie } = await signUp(server.url);
    const api = client(server.url, cookie);
    for (const path of [
      "/api/me",
      "/api/foods",
      "/api/meals?date=2026-10-06",
      "/api/goals",
      "/api/exercises",
      "/api/workouts",
      "/api/body-logs?from=2026-10-01&to=2026-10-07",
    ]) {
      expect([path, (await api.get(path)).status]).toEqual([path, 200]);
    }
  });
});

describe("app", () => {
  it("reports health including the database", async () => {
    const res = await client(server.url).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok", db: "ok" });
  });

  it("rejects malformed JSON with INVALID_JSON", async () => {
    const res = await fetch(`${server.url}/api/health`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_JSON");
  });

  it("answers unknown /api routes with 401 before login, so routes aren't leaked", async () => {
    expect((await fetch(`${server.url}/api/nope`)).status).toBe(401);
  });

  it("answers unknown /api routes with a JSON 404 once logged in", async () => {
    const { cookie } = await signUp(server.url);
    const res = await client(server.url, cookie).delete("/api/goals");
    expect(res).toEqual({
      status: 404,
      body: { error: { code: "NOT_FOUND", message: "Route DELETE /api/goals not found" } },
    });
  });

  it("doesn't advertise Express", async () => {
    const res = await fetch(`${server.url}/api/health`);
    expect(res.headers.get("x-powered-by")).toBeNull();
  });

  it("rejects bodies over 100kb", async () => {
    const { cookie } = await signUp(server.url);
    const res = await fetch(`${server.url}/api/foods`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ name: "x".repeat(120_000) }),
    });
    expect(res.status).toBe(413);
    expect((await res.json()).error.code).toBe("PAYLOAD_TOO_LARGE");
  });
});
