import { sql } from "drizzle-orm";
import { db, pool } from "./client.ts";
import { exercises, foods } from "./schema/index.ts";
import { seedExercises } from "./seed-data/exercises.ts";
import { seedFoods } from "./seed-data/foods.ts";

// Idempotent: global rows are unique by name (partial unique index where
// user_id is null), so re-running only inserts what's missing.
async function seedGlobals() {
  const insertedFoods = await db
    .insert(foods)
    .values(seedFoods)
    .onConflictDoNothing({ target: foods.name, where: sql`${foods.userId} is null` })
    .returning({ id: foods.id });

  const insertedExercises = await db
    .insert(exercises)
    .values(seedExercises)
    .onConflictDoNothing({ target: exercises.name, where: sql`${exercises.userId} is null` })
    .returning({ id: exercises.id });

  console.log(
    `foods: ${insertedFoods.length} inserted (${seedFoods.length} in seed)\n` +
      `exercises: ${insertedExercises.length} inserted (${seedExercises.length} in seed)`,
  );
}

try {
  await seedGlobals();
} finally {
  await pool.end();
}
