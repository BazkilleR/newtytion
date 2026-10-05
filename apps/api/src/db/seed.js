import { createExerciseInputSchema, createFoodInputSchema } from "@fitness/shared";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db, pool } from "./client.js";
import { exercises, foods } from "./schema/index.js";
import { seedExercises } from "./seed-data/exercises.js";
import { seedFoods } from "./seed-data/foods.js";
import { seedDemo } from "./seed-demo.js";

// Idempotent: global rows are unique by name (partial unique index where
// user_id is null), so re-running only inserts what's missing.
async function seedGlobals() {
  // Validate seed rows with the same schemas the API uses, so a typo fails loudly.
  const foodRows = z.array(createFoodInputSchema).parse(seedFoods);
  const exerciseRows = z.array(createExerciseInputSchema).parse(seedExercises);

  const insertedFoods = await db
    .insert(foods)
    .values(foodRows)
    .onConflictDoNothing({ target: foods.name, where: sql`${foods.userId} is null` })
    .returning({ id: foods.id });

  const insertedExercises = await db
    .insert(exercises)
    .values(exerciseRows)
    .onConflictDoNothing({ target: exercises.name, where: sql`${exercises.userId} is null` })
    .returning({ id: exercises.id });

  console.log(
    `foods: ${insertedFoods.length} inserted (${seedFoods.length} in seed)\n` +
      `exercises: ${insertedExercises.length} inserted (${seedExercises.length} in seed)`,
  );
}

try {
  await seedGlobals();
  // `pnpm db:seed --demo` also creates a demo user with sample data
  if (process.argv.includes("--demo")) await seedDemo();
} finally {
  await pool.end();
}
