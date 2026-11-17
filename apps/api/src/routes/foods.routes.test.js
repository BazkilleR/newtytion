import { afterAll, beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { signUp } from "../../test/auth.js";
import { createFood } from "../../test/factories.js";
import { client, listen } from "../../test/http.js";
import { createApp } from "../app.js";

let server;
let api;
let me;

beforeAll(async () => {
  server = await listen(createApp());
});

afterAll(async () => {
  await server.close();
});

beforeEach(async () => {
  me = await signUp(server.url);
  api = client(server.url, me.cookie);
});

const SHAKE = {
  name: "Protein shake",
  kcal: 250,
  proteinG: 30,
  carbG: 20,
  fatG: 5,
  servingSize: 1,
  servingUnit: "glass",
};
const MISSING_ID = "00000000-0000-4000-8000-000000000000";

describe("GET /api/foods", () => {
  it("searches by name and limits the result", async () => {
    await createFood(null, { name: "Rice" });
    await createFood(null, { name: "Fried rice" });
    await createFood(null, { name: "Egg" });

    const res = await api.get("/api/foods?q=rice");
    expect(res.status).toBe(200);
    expect(res.body.map((f) => f.name)).toEqual(["Fried rice", "Rice"]);

    expect((await api.get("/api/foods?limit=1")).body).toHaveLength(1);
    expect((await api.get("/api/foods")).body).toHaveLength(3);
  });

  it("validates the query", async () => {
    for (const query of ["limit=0", "limit=101", "limit=abc", `q=${"x".repeat(101)}`]) {
      const res = await api.get(`/api/foods?${query}`);
      expect([query, res.status, res.body.error.code]).toEqual([query, 400, "VALIDATION_ERROR"]);
    }
  });
});

describe("POST /api/foods", () => {
  it("creates a custom food (201) that only its owner can see", async () => {
    const res = await api.post("/api/foods", { ...SHAKE, name: "  Protein shake  " });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(String), ...SHAKE, isCustom: true });

    const someoneElse = client(server.url, (await signUp(server.url)).cookie);
    expect((await someoneElse.get("/api/foods")).body).toEqual([]);
  });

  it("validates the body", async () => {
    const res = await api.post("/api/foods", { ...SHAKE, kcal: -1, servingSize: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("kcal");
    expect(res.body.error.message).toContain("servingSize");
  });
});

describe("PATCH /api/foods/:id", () => {
  it("updates only the given fields of the user's own food", async () => {
    const { body: food } = await api.post("/api/foods", SHAKE);
    const res = await api.patch(`/api/foods/${food.id}`, { kcal: 300 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ...food, kcal: 300 });
  });

  it("answers 403 for a global food and 404 for a missing or someone else's", async () => {
    const global = await createFood(null);
    const other = await signUp(server.url);
    const theirs = await client(server.url, other.cookie).post("/api/foods", SHAKE);

    expect((await api.patch(`/api/foods/${global.id}`, { kcal: 1 })).body.error.code).toBe(
      "FORBIDDEN",
    );
    expect((await api.patch(`/api/foods/${theirs.body.id}`, { kcal: 1 })).status).toBe(404);
    expect((await api.patch(`/api/foods/${MISSING_ID}`, { kcal: 1 })).status).toBe(404);
  });

  it("validates the id and body", async () => {
    expect((await api.patch("/api/foods/not-a-uuid", { kcal: 1 })).status).toBe(400);
    const { body: food } = await api.post("/api/foods", SHAKE);
    expect((await api.patch(`/api/foods/${food.id}`, { kcal: "lots" })).status).toBe(400);
  });
});

describe("DELETE /api/foods/:id", () => {
  it("deletes the user's own food (204), then 404s", async () => {
    const { body: food } = await api.post("/api/foods", SHAKE);
    const res = await api.delete(`/api/foods/${food.id}`);
    expect(res).toEqual({ status: 204, body: null });
    expect((await api.delete(`/api/foods/${food.id}`)).status).toBe(404);
  });

  it("answers 409 FOOD_IN_USE when the food is in the meal log", async () => {
    const { body: food } = await api.post("/api/foods", SHAKE);
    await api.post("/api/meals", {
      logDate: "2026-10-06",
      mealType: "snack",
      foodId: food.id,
      quantity: 1,
    });
    const res = await api.delete(`/api/foods/${food.id}`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("FOOD_IN_USE");
  });

  it("refuses to delete a global food", async () => {
    const global = await createFood(null);
    expect((await api.delete(`/api/foods/${global.id}`)).status).toBe(403);
  });
});
