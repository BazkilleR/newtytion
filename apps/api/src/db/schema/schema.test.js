import { randomUUID } from "node:crypto";
import { MEAL_TYPES, MUSCLE_GROUPS } from "@fitness/shared";
import { describe, expect, it } from "@jest/globals";
import { eq, sql } from "drizzle-orm";
import { createExercise, createFood, createUser } from "../../../test/factories.js";
import { pgErrorCode } from "../../lib/db-errors.js";
import { db } from "../client.js";
import {
  bodyLogs,
  exercises,
  foods,
  goals,
  mealEntries,
  refreshToken,
  user,
  workoutSets,
  workouts,
} from "./index.js";

const CHECK_VIOLATION = "23514";
const FOREIGN_KEY_VIOLATION = "23503";
const UNIQUE_VIOLATION = "23505";

/** Postgres error code the query fails with, or null if it succeeds. */
const failsWith = (query) => query.then(() => null, pgErrorCode);

const enumValues = async (name) =>
  (await db.execute(sql.raw(`select unnest(enum_range(null::${name}))::text as v`))).rows.map(
    (r) => r.v,
  );

async function workoutWithSet(userId, exerciseId, set = {}) {
  const [w] = await db.insert(workouts).values({ userId, logDate: "2026-10-06" }).returning();
  const [s] = await db
    .insert(workoutSets)
    .values({ workoutId: w.id, exerciseId, setNo: 1, weightKg: 60, reps: 5, ...set })
    .returning();
  return { workout: w, set: s };
}

describe("enums", () => {
  it("match the shared constants, in order (sorting relies on it)", async () => {
    expect(await enumValues("muscle_group")).toEqual(MUSCLE_GROUPS);
    expect(await enumValues("meal_type")).toEqual(MEAL_TYPES);
  });
});

describe("user deletion", () => {
  it("cascades to everything the user owns, leaving other users alone", async () => {
    const me = await createUser();
    const other = await createUser();
    for (const owner of [me, other]) {
      const food = await createFood(owner.id);
      const exercise = await createExercise(owner.id);
      await workoutWithSet(owner.id, exercise.id);
      await db.insert(mealEntries).values({
        userId: owner.id,
        foodId: food.id,
        logDate: "2026-10-06",
        mealType: "lunch",
        quantity: 1,
      });
      await db.insert(bodyLogs).values({ userId: owner.id, logDate: "2026-10-06", weightKg: 70 });
      await db.insert(goals).values({
        userId: owner.id,
        kcalTarget: 2000,
        proteinTargetG: 120,
        carbTargetG: 200,
        fatTargetG: 60,
      });
      await db
        .insert(refreshToken)
        .values({ id: randomUUID(), userId: owner.id, expiresAt: new Date() });
    }

    await db.delete(user).where(eq(user.id, me.id));

    const owned = async (table) => (await db.select().from(table)).map((r) => r.userId);
    for (const table of [foods, exercises, workouts, mealEntries, bodyLogs, goals, refreshToken]) {
      expect(await owned(table)).toEqual([other.id]);
    }
    expect(await db.select().from(workoutSets)).toHaveLength(1);
  });
});

describe("foods", () => {
  it("allows only one global food per name, but users may reuse a global name", async () => {
    const me = await createUser();
    await createFood(null, { name: "Rice" });
    expect(await failsWith(createFood(null, { name: "Rice" }))).toBe(UNIQUE_VIOLATION);
    expect(await failsWith(createFood(me.id, { name: "Rice" }))).toBeNull();
    expect(await failsWith(createFood(me.id, { name: "Rice" }))).toBeNull();
  });

  it("rejects negative nutrition and a non-positive serving size", async () => {
    for (const bad of [{ kcal: -1 }, { proteinG: -1 }, { carbG: -1 }, { fatG: -1 }]) {
      expect(await failsWith(createFood(null, bad))).toBe(CHECK_VIOLATION);
    }
    expect(await failsWith(createFood(null, { servingSize: 0 }))).toBe(CHECK_VIOLATION);
  });

  it("can't be deleted while a meal entry uses it", async () => {
    const me = await createUser();
    const food = await createFood(me.id);
    await db.insert(mealEntries).values({
      userId: me.id,
      foodId: food.id,
      logDate: "2026-10-06",
      mealType: "lunch",
      quantity: 1,
    });
    expect(await failsWith(db.delete(foods).where(eq(foods.id, food.id)))).toBe(
      FOREIGN_KEY_VIOLATION,
    );
  });

  it("returns numerics as JS numbers", async () => {
    const food = await createFood(null, { kcal: 123.4, servingSize: 0.5 });
    expect(food.kcal).toBe(123.4);
    expect(food.servingSize).toBe(0.5);
  });
});

describe("meal entries", () => {
  it("need a positive quantity", async () => {
    const me = await createUser();
    const food = await createFood(null);
    const entry = (quantity) =>
      db.insert(mealEntries).values({
        userId: me.id,
        foodId: food.id,
        logDate: "2026-10-06",
        mealType: "lunch",
        quantity,
      });
    expect(await failsWith(entry(0))).toBe(CHECK_VIOLATION);
    expect(await failsWith(entry(0.25))).toBeNull();
  });
});

describe("body logs", () => {
  it("allow one weigh-in per user per day, with a positive weight", async () => {
    const me = await createUser();
    const other = await createUser();
    const log = (userId, weightKg = 70) =>
      db.insert(bodyLogs).values({ userId, logDate: "2026-10-06", weightKg });
    await log(me.id);
    expect(await failsWith(log(me.id))).toBe(UNIQUE_VIOLATION);
    expect(await failsWith(log(other.id))).toBeNull();
    expect(
      await failsWith(
        db.insert(bodyLogs).values({ userId: me.id, logDate: "2026-10-07", weightKg: 0 }),
      ),
    ).toBe(CHECK_VIOLATION);
  });
});

describe("exercises", () => {
  it("allow only one global exercise per name", async () => {
    const me = await createUser();
    await createExercise(null, { name: "Squat" });
    expect(await failsWith(createExercise(null, { name: "Squat" }))).toBe(UNIQUE_VIOLATION);
    expect(await failsWith(createExercise(me.id, { name: "Squat" }))).toBeNull();
  });

  it("default to no secondary muscles", async () => {
    expect((await createExercise(null)).secondaryMuscles).toEqual([]);
  });

  it("can't be deleted while a set uses it", async () => {
    const me = await createUser();
    const exercise = await createExercise(null);
    await workoutWithSet(me.id, exercise.id);
    expect(await failsWith(db.delete(exercises).where(eq(exercises.id, exercise.id)))).toBe(
      FOREIGN_KEY_VIOLATION,
    );
  });
});

describe("workout sets", () => {
  it("are unique per workout, exercise and set number", async () => {
    const me = await createUser();
    const exercise = await createExercise(null);
    const { workout } = await workoutWithSet(me.id, exercise.id);
    const insert = (setNo) =>
      db
        .insert(workoutSets)
        .values({ workoutId: workout.id, exerciseId: exercise.id, setNo, weightKg: 60, reps: 5 });
    expect(await failsWith(insert(1))).toBe(UNIQUE_VIOLATION);
    expect(await failsWith(insert(2))).toBeNull();
  });

  it("reject negative values, set number 0 and an RPE outside 1..10", async () => {
    const me = await createUser();
    const exercise = await createExercise(null);
    const [w] = await db
      .insert(workouts)
      .values({ userId: me.id, logDate: "2026-10-06" })
      .returning();
    let setNo = 0;
    const insert = (values) =>
      db.insert(workoutSets).values({
        workoutId: w.id,
        exerciseId: exercise.id,
        setNo: ++setNo,
        weightKg: 60,
        reps: 5,
        ...values,
      });

    for (const bad of [{ weightKg: -1 }, { reps: -1 }, { setNo: 0 }, { rpe: 0.5 }, { rpe: 10.5 }]) {
      expect([bad, await failsWith(insert(bad))]).toEqual([bad, CHECK_VIOLATION]);
    }
    for (const ok of [{ weightKg: 0, reps: 0 }, { rpe: null }, { rpe: 1 }, { rpe: 10 }]) {
      expect([ok, await failsWith(insert(ok))]).toEqual([ok, null]);
    }
  });

  it("go with their workout", async () => {
    const me = await createUser();
    const exercise = await createExercise(null);
    const { workout } = await workoutWithSet(me.id, exercise.id);
    await db.delete(workouts).where(eq(workouts.id, workout.id));
    expect(await db.select().from(workoutSets)).toEqual([]);
  });
});
