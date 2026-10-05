import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listen } from "../test/http.js";
import { createApp } from "./app.js";

let server;

beforeAll(async () => {
  server = await listen(createApp());
});

afterAll(async () => {
  await server.close();
});

describe("app", () => {
  it("reports health including the database", async () => {
    const res = await fetch(`${server.url}/api/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok", db: "ok" });
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
});
