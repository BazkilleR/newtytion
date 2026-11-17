import { DEFAULT_GOALS } from "@fitness/shared";
import { describe, expect, it } from "@jest/globals";
import { createFood, createUser } from "../../test/factories.js";
import { upsertGoals } from "./goals.service.js";
import {
  createMealEntry,
  deleteMealEntry,
  getDailyMeals,
  updateMealEntry,
} from "./meals.service.js";

const DAY = "2026-10-06";

async function setup() {
  const me = await createUser();
  const kaprao = await createFood(null, {
    name: "กะเพราไก่",
    kcal: 580,
    proteinG: 28,
    carbG: 65,
    fatG: 22,
  });
  const egg = await createFood(null, {
    name: "ไข่ดาว",
    kcal: 90,
    proteinG: 6.3,
    carbG: 0.4,
    fatG: 7,
  });
  return { me, kaprao, egg };
}

describe("getDailyMeals", () => {
  it("returns entries with food, totals and default goals", async () => {
    const { me, kaprao, egg } = await setup();
    await createMealEntry(me.id, {
      logDate: DAY,
      mealType: "lunch",
      foodId: kaprao.id,
      quantity: 1,
    });
    await createMealEntry(me.id, { logDate: DAY, mealType: "lunch", foodId: egg.id, quantity: 2 });

    const day = await getDailyMeals(me.id, DAY);
    expect(day.date).toBe(DAY);
    expect(day.entries).toHaveLength(2);
    expect(day.entries[0]).toMatchObject({
      mealType: "lunch",
      quantity: 1,
      food: { name: "กะเพราไก่" },
    });
    expect(day.totals).toEqual({ kcal: 760, proteinG: 40.6, carbG: 65.8, fatG: 36 });
    expect(day.goals).toEqual(DEFAULT_GOALS);
  });

  it("uses the user's own goals once set", async () => {
    const { me } = await setup();
    const mine = { kcalTarget: 2400, proteinTargetG: 160, carbTargetG: 280, fatTargetG: 67 };
    await upsertGoals(me.id, mine);
    expect((await getDailyMeals(me.id, DAY)).goals).toEqual(mine);
  });

  it("only includes that calendar day and that user", async () => {
    const { me, kaprao } = await setup();
    const other = await createUser();
    await createMealEntry(me.id, {
      logDate: "2026-10-05",
      mealType: "dinner",
      foodId: kaprao.id,
      quantity: 1,
    });
    await createMealEntry(other.id, {
      logDate: DAY,
      mealType: "dinner",
      foodId: kaprao.id,
      quantity: 1,
    });

    const day = await getDailyMeals(me.id, DAY);
    expect(day.entries).toEqual([]);
    expect(day.totals.kcal).toBe(0);
  });

  it("orders entries breakfast -> lunch -> dinner -> snack", async () => {
    const { me, egg } = await setup();
    for (const mealType of ["snack", "dinner", "breakfast", "lunch"]) {
      await createMealEntry(me.id, { logDate: DAY, mealType, foodId: egg.id, quantity: 1 });
    }
    const day = await getDailyMeals(me.id, DAY);
    expect(day.entries.map((e) => e.mealType)).toEqual(["breakfast", "lunch", "dinner", "snack"]);
  });
});

describe("createMealEntry", () => {
  it("logs a global or the user's own food and returns it with the food", async () => {
    const { me } = await setup();
    const shake = await createFood(me.id, { name: "My shake", kcal: 250 });
    const entry = await createMealEntry(me.id, {
      logDate: DAY,
      mealType: "snack",
      foodId: shake.id,
      quantity: 0.5,
    });
    expect(entry).toEqual({
      id: expect.any(String),
      logDate: DAY,
      mealType: "snack",
      quantity: 0.5,
      food: expect.objectContaining({ id: shake.id, name: "My shake", isCustom: true }),
    });
  });

  it("can't use another user's custom food", async () => {
    const { me } = await setup();
    const other = await createUser();
    const theirFood = await createFood(other.id);
    await expect(
      createMealEntry(me.id, {
        logDate: DAY,
        mealType: "lunch",
        foodId: theirFood.id,
        quantity: 1,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("updateMealEntry / deleteMealEntry", () => {
  it("updates quantity and meal type", async () => {
    const { me, kaprao } = await setup();
    const entry = await createMealEntry(me.id, {
      logDate: DAY,
      mealType: "lunch",
      foodId: kaprao.id,
      quantity: 1,
    });
    const updated = await updateMealEntry(me.id, entry.id, { quantity: 1.5, mealType: "dinner" });
    expect(updated).toMatchObject({ quantity: 1.5, mealType: "dinner" });
    expect((await getDailyMeals(me.id, DAY)).totals.kcal).toBe(870);
  });

  it("can't touch another user's entry", async () => {
    const { me, kaprao } = await setup();
    const other = await createUser();
    const theirs = await createMealEntry(other.id, {
      logDate: DAY,
      mealType: "lunch",
      foodId: kaprao.id,
      quantity: 1,
    });

    await expect(updateMealEntry(me.id, theirs.id, { quantity: 9 })).rejects.toMatchObject({
      status: 404,
    });
    await expect(deleteMealEntry(me.id, theirs.id)).rejects.toMatchObject({ status: 404 });
    expect((await getDailyMeals(other.id, DAY)).entries[0].quantity).toBe(1);
  });

  it("returns the entry unchanged for an empty update, but still 404s for others'", async () => {
    const { me, kaprao } = await setup();
    const other = await createUser();
    const entry = await createMealEntry(me.id, {
      logDate: DAY,
      mealType: "lunch",
      foodId: kaprao.id,
      quantity: 1,
    });
    expect(await updateMealEntry(me.id, entry.id, {})).toEqual(entry);
    await expect(updateMealEntry(other.id, entry.id, {})).rejects.toMatchObject({ status: 404 });
  });

  it("404s when deleting an entry that doesn't exist", async () => {
    const { me } = await setup();
    await expect(
      deleteMealEntry(me.id, "00000000-0000-4000-8000-000000000000"),
    ).rejects.toMatchObject({ status: 404, message: "Meal entry not found" });
  });

  it("deletes the user's own entry", async () => {
    const { me, kaprao } = await setup();
    const entry = await createMealEntry(me.id, {
      logDate: DAY,
      mealType: "lunch",
      foodId: kaprao.id,
      quantity: 1,
    });
    await deleteMealEntry(me.id, entry.id);
    expect((await getDailyMeals(me.id, DAY)).entries).toEqual([]);
  });
});
