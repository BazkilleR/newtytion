import { sql } from "drizzle-orm";
import { db } from "../src/db/client.js";

/**
 * Wipe all user data between tests. Deleting users cascades to sessions,
 * accounts and every user-owned row (custom foods, meals, workouts, ...).
 * Global seeded rows (user_id IS NULL) are kept.
 */
export async function resetDb() {
  await db.execute(sql`truncate table "user", "verification" cascade`);
}
