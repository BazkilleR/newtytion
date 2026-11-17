import { describe, expect, it } from "@jest/globals";
import { eq, isNull } from "drizzle-orm";
import { createExercise, createFood, createUser } from "../../test/factories.js";
import { db } from "./client.js";
import { exercises, foods } from "./schema/index.js";
import { seedExercises } from "./seed-data/exercises.js";
import { seedFoods } from "./seed-data/foods.js";
import { seedGlobals } from "./seed-globals.js";

const globalNames = async (table) =>
  (await db.select({ name: table.name }).from(table).where(isNull(table.userId)))
    .map((r) => r.name)
    .sort();
const sorted = (rows) => rows.map((r) => r.name).sort();

describe("seedGlobals", () => {
  it("inserts every seed food and exercise as a global row", async () => {
    expect(await seedGlobals()).toEqual({
      foods: seedFoods.length,
      exercises: seedExercises.length,
    });
    expect(await globalNames(foods)).toEqual(sorted(seedFoods));
    expect(await globalNames(exercises)).toEqual(sorted(seedExercises));
  });

  it("is idempotent: a second run adds no foods and duplicates nothing", async () => {
    await seedGlobals();
    // Exercises are upserted, so they all count again.
    expect(await seedGlobals()).toEqual({ foods: 0, exercises: seedExercises.length });
    expect(await db.select().from(foods)).toHaveLength(seedFoods.length);
    expect(await db.select().from(exercises)).toHaveLength(seedExercises.length);
  });

  it("keeps a renamed or edited global food as it is", async () => {
    const [seed] = seedFoods;
    await createFood(null, { ...seed, kcal: 1 });
    await seedGlobals();
    const [row] = await db.select().from(foods).where(eq(foods.name, seed.name));
    expect(row.kcal).toBe(1);
  });

  it("resets a global exercise's muscles to the seed file", async () => {
    const seed = seedExercises.find((e) => e.secondaryMuscles?.length);
    await createExercise(null, { name: seed.name, muscleGroup: "calves", secondaryMuscles: [] });

    await seedGlobals();

    const [row] = await db.select().from(exercises).where(eq(exercises.name, seed.name));
    expect(row.muscleGroup).toBe(seed.muscleGroup);
    expect(row.secondaryMuscles).toEqual(seed.secondaryMuscles);
  });

  it("leaves users' custom rows with the same name alone", async () => {
    const me = await createUser();
    const [food] = seedFoods;
    const [exercise] = seedExercises;
    await createFood(me.id, { name: food.name, kcal: 1 });
    await createExercise(me.id, { name: exercise.name, muscleGroup: "calves" });

    await seedGlobals();

    const mine = (table) => db.select().from(table).where(eq(table.userId, me.id));
    expect((await mine(foods)).map((r) => [r.name, r.kcal])).toEqual([[food.name, 1]]);
    expect((await mine(exercises)).map((r) => [r.name, r.muscleGroup])).toEqual([
      [exercise.name, "calves"],
    ]);
    expect(await globalNames(foods)).toContain(food.name);
  });
});
