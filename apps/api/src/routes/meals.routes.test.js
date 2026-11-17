import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { signUp } from "../../test/auth.js";
import { createFood } from "../../test/factories.js";
import { client, listen } from "../../test/http.js";
import { createApp } from "../app.js";

let server;

beforeAll(async () => {
  server = await listen(createApp());
});

afterAll(async () => {
  await server.close();
});

const json = (cookie, method, body) => ({
  method,
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify(body),
});

describe("meals routes", () => {
  it("logs, reads, updates and deletes an entry", async () => {
    const { cookie } = await signUp(server.url);
    const api = client(server.url, cookie);
    const food = await createFood(null, { name: "Rice", kcal: 200, proteinG: 4, carbG: 44 });

    const created = await api.post("/api/meals", {
      logDate: "2026-10-06",
      mealType: "lunch",
      foodId: food.id,
      quantity: 1.5,
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      logDate: "2026-10-06",
      mealType: "lunch",
      quantity: 1.5,
      food: { id: food.id, name: "Rice", isCustom: false },
    });
    const id = created.body.id;

    const day = await api.get("/api/meals?date=2026-10-06");
    expect(day.status).toBe(200);
    expect(day.body).toMatchObject({
      date: "2026-10-06",
      entries: [{ id }],
      totals: { kcal: 300, proteinG: 6, carbG: 66 },
      goals: { kcalTarget: expect.any(Number) },
    });

    const patched = await api.patch(`/api/meals/${id}`, { mealType: "dinner", quantity: 2 });
    expect(patched.status).toBe(200);
    expect(patched.body).toMatchObject({ id, mealType: "dinner", quantity: 2 });

    expect((await api.delete(`/api/meals/${id}`)).status).toBe(204);
    expect((await api.get("/api/meals?date=2026-10-06")).body.entries).toEqual([]);
    expect((await api.delete(`/api/meals/${id}`)).status).toBe(404);
  });

  it("404s when logging a food that doesn't exist", async () => {
    const { cookie } = await signUp(server.url);
    const res = await client(server.url, cookie).post("/api/meals", {
      logDate: "2026-10-06",
      mealType: "lunch",
      foodId: "00000000-0000-4000-8000-000000000000",
      quantity: 1,
    });
    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe("Food not found");
  });

  it("can't update or delete another user's entry", async () => {
    const alice = client(server.url, (await signUp(server.url)).cookie);
    const bob = client(server.url, (await signUp(server.url)).cookie);
    const food = await createFood(null);
    const { body: entry } = await alice.post("/api/meals", {
      logDate: "2026-10-06",
      mealType: "lunch",
      foodId: food.id,
      quantity: 1,
    });

    expect((await bob.patch(`/api/meals/${entry.id}`, { quantity: 9 })).status).toBe(404);
    expect((await bob.delete(`/api/meals/${entry.id}`)).status).toBe(404);
    expect((await alice.get("/api/meals?date=2026-10-06")).body.entries[0].quantity).toBe(1);
  });

  it("rejects an invalid patch", async () => {
    const api = client(server.url, (await signUp(server.url)).cookie);
    const food = await createFood(null);
    const { body: entry } = await api.post("/api/meals", {
      logDate: "2026-10-06",
      mealType: "lunch",
      foodId: food.id,
      quantity: 1,
    });
    for (const patch of [{ quantity: 0 }, { quantity: 101 }, { mealType: "brunch" }]) {
      expect((await api.patch(`/api/meals/${entry.id}`, patch)).status).toBe(400);
    }
  });

  it("ignores a userId in the body and logs to the session user", async () => {
    const alice = await signUp(server.url);
    const bob = await signUp(server.url);
    const food = await createFood(null);

    const res = await fetch(
      `${server.url}/api/meals`,
      json(alice.cookie, "POST", {
        userId: bob.user.id, // attempt to write into Bob's log
        logDate: "2026-10-06",
        mealType: "lunch",
        foodId: food.id,
        quantity: 1,
      }),
    );
    expect(res.status).toBe(201);

    const day = (cookie) =>
      fetch(`${server.url}/api/meals?date=2026-10-06`, { headers: { cookie } }).then((r) =>
        r.json(),
      );
    expect((await day(alice.cookie)).entries).toHaveLength(1);
    expect((await day(bob.cookie)).entries).toHaveLength(0);
  });

  it("returns VALIDATION_ERROR for bad input", async () => {
    const { cookie } = await signUp(server.url);

    const noDate = await fetch(`${server.url}/api/meals`, { headers: { cookie } });
    expect(noDate.status).toBe(400);
    expect((await noDate.json()).error.code).toBe("VALIDATION_ERROR");

    const bad = await fetch(
      `${server.url}/api/meals`,
      json(cookie, "POST", { logDate: "06/10/2026", mealType: "brunch", foodId: "x", quantity: 0 }),
    );
    expect(bad.status).toBe(400);
    const { error } = await bad.json();
    expect(error.message).toContain("logDate");
    expect(error.message).toContain("mealType");
  });

  it("returns 400 for a malformed id instead of a database error", async () => {
    const { cookie } = await signUp(server.url);
    const res = await fetch(`${server.url}/api/meals/not-a-uuid`, {
      method: "DELETE",
      headers: { cookie },
    });
    expect(res.status).toBe(400);
  });
});
