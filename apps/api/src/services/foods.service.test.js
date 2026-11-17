import { describe, expect, it } from "@jest/globals";
import { createUser, createFood as insertFood } from "../../test/factories.js";
import { db } from "../db/client.js";
import { mealEntries } from "../db/schema/index.js";
import {
  createFood,
  deleteFood,
  findVisibleFood,
  searchFoods,
  toFood,
  updateFood,
} from "./foods.service.js";

const search = (userId, q) => searchFoods(userId, { q, limit: 50 });
const names = (list) => list.map((f) => f.name);

describe("searchFoods", () => {
  it("returns global foods and the user's own, never another user's", async () => {
    const me = await createUser();
    const other = await createUser();
    await insertFood(null, { name: "Global rice" });
    await insertFood(me.id, { name: "My shake" });
    await insertFood(other.id, { name: "Their secret" });

    const result = await search(me.id);
    expect(names(result)).toEqual(["My shake", "Global rice"]); // own first
    expect(result.map((f) => f.isCustom)).toEqual([true, false]);
  });

  it("matches substrings case-insensitively, including Thai", async () => {
    const me = await createUser();
    await insertFood(null, { name: "กะเพราไก่ (Basil chicken with rice)" });
    await insertFood(null, { name: "ข้าวผัด (Fried rice)" });

    expect(names(await search(me.id, "CHICKEN"))).toEqual(["กะเพราไก่ (Basil chicken with rice)"]);
    expect(names(await search(me.id, "ข้าวผัด"))).toEqual(["ข้าวผัด (Fried rice)"]);
    expect(await search(me.id, "pizza")).toEqual([]);
  });

  it("treats LIKE wildcards literally", async () => {
    const me = await createUser();
    await insertFood(null, { name: "Milk 100%" });
    await insertFood(null, { name: "Water" });
    expect(names(await search(me.id, "%"))).toEqual(["Milk 100%"]);
    expect(await search(me.id, "_")).toEqual([]);
  });

  it("respects the limit", async () => {
    const me = await createUser();
    for (const name of ["A", "B", "C"]) await insertFood(null, { name });
    expect(names(await searchFoods(me.id, { limit: 2 }))).toEqual(["A", "B"]);
  });
});

describe("findVisibleFood", () => {
  it("finds global and own foods, never another user's or a missing one", async () => {
    const me = await createUser();
    const other = await createUser();
    const global = await insertFood(null);
    const mine = await insertFood(me.id);
    const theirs = await insertFood(other.id);

    expect((await findVisibleFood(me.id, global.id)).id).toBe(global.id);
    expect((await findVisibleFood(me.id, mine.id)).id).toBe(mine.id);
    expect(await findVisibleFood(me.id, theirs.id)).toBeNull();
    expect(await findVisibleFood(me.id, "00000000-0000-4000-8000-000000000000")).toBeNull();
  });
});

describe("toFood", () => {
  it("hides user_id and createdAt, exposing isCustom instead", async () => {
    const me = await createUser();
    const row = await insertFood(me.id, { name: "Shake" });
    const food = toFood(row);
    expect(Object.keys(food).sort()).toEqual([
      "carbG",
      "fatG",
      "id",
      "isCustom",
      "kcal",
      "name",
      "proteinG",
      "servingSize",
      "servingUnit",
    ]);
    expect(food.isCustom).toBe(true);
    expect(toFood({ ...row, userId: null }).isCustom).toBe(false);
  });
});

describe("createFood", () => {
  it("creates a custom food owned by the user", async () => {
    const me = await createUser();
    const food = await createFood(me.id, {
      name: "Protein bar",
      kcal: 200,
      proteinG: 20,
      carbG: 22,
      fatG: 7,
      servingSize: 1,
      servingUnit: "bar",
    });
    expect(food).toMatchObject({ name: "Protein bar", kcal: 200, isCustom: true });
    expect(names(await search(me.id, "bar"))).toEqual(["Protein bar"]);
  });
});

describe("updateFood / deleteFood", () => {
  it("lets the owner edit and delete their food", async () => {
    const me = await createUser();
    const food = await insertFood(me.id, { kcal: 100 });

    expect((await updateFood(me.id, food.id, { kcal: 150 })).kcal).toBe(150);
    await deleteFood(me.id, food.id);
    expect(await search(me.id)).toEqual([]);
  });

  it("returns the food unchanged for an empty update", async () => {
    const me = await createUser();
    const food = await insertFood(me.id, { name: "Same", kcal: 100 });
    expect(await updateFood(me.id, food.id, {})).toMatchObject({ name: "Same", kcal: 100 });
  });

  it("checks ownership even for an empty update", async () => {
    const me = await createUser();
    const other = await createUser();
    const theirs = await insertFood(other.id);
    const global = await insertFood(null);
    await expect(updateFood(me.id, theirs.id, {})).rejects.toMatchObject({ status: 404 });
    await expect(updateFood(me.id, global.id, {})).rejects.toMatchObject({ status: 403 });
  });

  it("refuses to change global foods (403)", async () => {
    const me = await createUser();
    const food = await insertFood(null);
    await expect(updateFood(me.id, food.id, { kcal: 1 })).rejects.toMatchObject({ status: 403 });
    await expect(deleteFood(me.id, food.id)).rejects.toMatchObject({ status: 403 });
  });

  it("hides other users' foods (404, not 403)", async () => {
    const me = await createUser();
    const other = await createUser();
    const food = await insertFood(other.id);
    await expect(updateFood(me.id, food.id, { kcal: 1 })).rejects.toMatchObject({ status: 404 });
    await expect(deleteFood(me.id, food.id)).rejects.toMatchObject({ status: 404 });
  });

  it("won't delete a food that is in the meal log", async () => {
    const me = await createUser();
    const food = await insertFood(me.id);
    await db.insert(mealEntries).values({
      userId: me.id,
      foodId: food.id,
      logDate: "2026-10-06",
      mealType: "lunch",
      quantity: 1,
    });
    await expect(deleteFood(me.id, food.id)).rejects.toMatchObject({
      status: 409,
      code: "FOOD_IN_USE",
    });
  });
});
