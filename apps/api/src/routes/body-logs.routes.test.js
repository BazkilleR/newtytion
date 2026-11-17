import { afterAll, beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { signUp } from "../../test/auth.js";
import { client, listen } from "../../test/http.js";
import { createApp } from "../app.js";

let server;
let api;

beforeAll(async () => {
  server = await listen(createApp());
});

afterAll(async () => {
  await server.close();
});

beforeEach(async () => {
  api = client(server.url, (await signUp(server.url)).cookie);
});

const range = (from, to) => `/api/body-logs?from=${from}&to=${to}`;

describe("PUT /api/body-logs/:date", () => {
  it("sets the weight for that day, replacing an earlier one", async () => {
    expect(await api.put("/api/body-logs/2026-10-06", { weightKg: 72.4 })).toEqual({
      status: 200,
      body: { logDate: "2026-10-06", weightKg: 72.4 },
    });
    await api.put("/api/body-logs/2026-10-06", { weightKg: 72.1 });
    expect((await api.get(range("2026-10-06", "2026-10-06"))).body).toEqual([
      { logDate: "2026-10-06", weightKg: 72.1, avgKg: 72.1 },
    ]);
  });

  it("validates the date and weight", async () => {
    expect((await api.put("/api/body-logs/06-10-2026", { weightKg: 72 })).status).toBe(400);
    expect((await api.put("/api/body-logs/2026-02-30", { weightKg: 72 })).status).toBe(400);
    for (const weightKg of [19, 401, "72", null]) {
      const res = await api.put("/api/body-logs/2026-10-06", { weightKg });
      expect([weightKg, res.status]).toEqual([weightKg, 400]);
    }
  });
});

describe("GET /api/body-logs", () => {
  it("returns weigh-ins in the range with a 7-day moving average", async () => {
    for (const [date, weightKg] of [
      ["2026-09-30", 70],
      ["2026-10-01", 72],
      ["2026-10-02", 74],
      ["2026-10-09", 80],
    ]) {
      await api.put(`/api/body-logs/${date}`, { weightKg });
    }
    const res = await api.get(range("2026-10-01", "2026-10-03"));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { logDate: "2026-10-01", weightKg: 72, avgKg: 71 },
      { logDate: "2026-10-02", weightKg: 74, avgKg: 72 },
    ]);
  });

  it("requires a valid from/to range", async () => {
    for (const path of [
      "/api/body-logs",
      "/api/body-logs?from=2026-10-01",
      range("2026-10-07", "2026-10-01"),
      range("yesterday", "2026-10-01"),
    ]) {
      const res = await api.get(path);
      expect([path, res.status]).toEqual([path, 400]);
    }
  });
});

describe("DELETE /api/body-logs/:date", () => {
  it("deletes that day's weigh-in (204), then 404s", async () => {
    await api.put("/api/body-logs/2026-10-06", { weightKg: 72 });
    expect(await api.delete("/api/body-logs/2026-10-06")).toEqual({ status: 204, body: null });
    expect((await api.get(range("2026-10-06", "2026-10-06"))).body).toEqual([]);
    expect((await api.delete("/api/body-logs/2026-10-06")).status).toBe(404);
  });

  it("can't delete another user's weigh-in", async () => {
    const other = client(server.url, (await signUp(server.url)).cookie);
    await other.put("/api/body-logs/2026-10-06", { weightKg: 90 });
    expect((await api.delete("/api/body-logs/2026-10-06")).status).toBe(404);
    expect((await other.get(range("2026-10-06", "2026-10-06"))).body).toHaveLength(1);
  });

  it("validates the date", async () => {
    expect((await api.delete("/api/body-logs/today")).status).toBe(400);
  });
});
