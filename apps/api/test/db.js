import { sql } from "drizzle-orm";
import { db } from "../src/db/client.js";

/**
 * Wipe everything between tests. Deleting users cascades to sessions,
 * accounts and all user-owned rows; foods/exercises are listed explicitly so
 * the global (user_id IS NULL) rows that tests create are removed too.
 */
export async function resetDb() {
  await db.execute(sql`truncate table "user", "verification", "foods", "exercises" cascade`);
}
