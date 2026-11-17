import { createExerciseInputSchema, createFoodInputSchema } from "@fitness/shared";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./client.js";
import { exercises, foods } from "./schema/index.js";
import { seedExercises } from "./seed-data/exercises.js";
import { seedFoods } from "./seed-data/foods.js";

/**
 * Idempotent: global rows are unique by name (partial unique index where
 * user_id is null), so re-running only inserts what's missing. Exercises also
 * update their muscles, so the seed file stays the source of truth for them.
 * Returns how many foods were inserted and exercises upserted.
 */
export async function seedGlobals() {
  // Validate seed rows with the same schemas the API uses, so a typo fails loudly.
  const foodRows = z.array(createFoodInputSchema).parse(seedFoods);
  const exerciseRows = z.array(createExerciseInputSchema).parse(seedExercises);

  const insertedFoods = await db
    .insert(foods)
    .values(foodRows)
    .onConflictDoNothing({ target: foods.name, where: sql`${foods.userId} is null` })
    .returning({ id: foods.id });

  const upsertedExercises = await db
    .insert(exercises)
    .values(exerciseRows)
    .onConflictDoUpdate({
      target: exercises.name,
      targetWhere: sql`${exercises.userId} is null`,
      set: {
        muscleGroup: sql`excluded.muscle_group`,
        secondaryMuscles: sql`excluded.secondary_muscles`,
      },
    })
    .returning({ id: exercises.id });

  return { foods: insertedFoods.length, exercises: upsertedExercises.length };
}
