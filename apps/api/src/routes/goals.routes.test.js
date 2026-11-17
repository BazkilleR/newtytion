import { DEFAULT_GOALS } from "@fitness/shared";
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

const MINE = { kcalTarget: 2400, proteinTargetG: 160, carbTargetG: 280, fatTargetG: 67 };

describe("goals routes", () => {
  it("GET returns the defaults for a new user", async () => {
    expect(await api.get("/api/goals")).toEqual({ status: 200, body: DEFAULT_GOALS });
  });

  it("PUT saves the goals and GET returns them", async () => {
    expect(await api.put("/api/goals", MINE)).toEqual({ status: 200, body: MINE });
    expect((await api.get("/api/goals")).body).toEqual(MINE);

    const changed = { ...MINE, kcalTarget: 2200 };
    expect((await api.put("/api/goals", changed)).body).toEqual(changed);
  });

  it("PUT replaces the whole set, so every field is required", async () => {
    const { kcalTarget, ...partial } = MINE;
    const res = await api.put("/api/goals", partial);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("kcalTarget");
  });

  it("PUT rejects decimals and negatives", async () => {
    for (const bad of [{ kcalTarget: 2000.5 }, { proteinTargetG: -1 }, { fatTargetG: "60" }]) {
      expect((await api.put("/api/goals", { ...MINE, ...bad })).status).toBe(400);
    }
  });

  it("keeps goals per user", async () => {
    await api.put("/api/goals", MINE);
    const other = client(server.url, (await signUp(server.url)).cookie);
    expect((await other.get("/api/goals")).body).toEqual(DEFAULT_GOALS);
  });
});
