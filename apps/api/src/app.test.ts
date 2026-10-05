import type { ApiErrorBody } from "@fitness/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listen } from "../test/http.ts";
import { createApp } from "./app.ts";
import { pool } from "./db/client.ts";

let server: Awaited<ReturnType<typeof listen>>;

beforeAll(async () => {
  server = await listen(createApp());
});

afterAll(async () => {
  await server.close();
  await pool.end();
});

describe("app", () => {
  it("reports health including the database", async () => {
    const res = await fetch(`${server.url}/api/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok", db: "ok" });
  });

  it("returns the standard error shape for unknown routes", async () => {
    const res = await fetch(`${server.url}/api/nope`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Route GET /nope not found" },
    });
  });

  it("rejects malformed JSON with INVALID_JSON", async () => {
    const res = await fetch(`${server.url}/api/health`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as ApiErrorBody).error.code).toBe("INVALID_JSON");
  });
});
