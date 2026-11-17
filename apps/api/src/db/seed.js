import { pool } from "./client.js";
import { seedExercises } from "./seed-data/exercises.js";
import { seedFoods } from "./seed-data/foods.js";
import { seedDemo } from "./seed-demo.js";
import { seedGlobals } from "./seed-globals.js";

try {
  const count = await seedGlobals();
  console.log(
    `foods: ${count.foods} inserted (${seedFoods.length} in seed)\n` +
      `exercises: ${count.exercises} upserted (${seedExercises.length} in seed)`,
  );
  // `pnpm db:seed --demo` also creates a demo user with sample data
  if (process.argv.includes("--demo")) await seedDemo();
} finally {
  await pool.end();
}
