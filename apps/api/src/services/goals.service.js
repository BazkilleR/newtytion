import { DEFAULT_GOALS } from "@fitness/shared";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { goals } from "../db/schema/index.js";

/** The user's goals, or sensible defaults until they set their own. */
export async function getGoals(userId) {
  const [row] = await db.select().from(goals).where(eq(goals.userId, userId));
  if (!row) return { ...DEFAULT_GOALS };
  return { kcalTarget: row.kcalTarget, proteinTargetG: row.proteinTargetG };
}

/** Insert or update in one statement (goals.user_id is the primary key). */
export async function upsertGoals(userId, input) {
  const [row] = await db
    .insert(goals)
    .values({ userId, ...input })
    .onConflictDoUpdate({ target: goals.userId, set: { ...input, updatedAt: new Date() } })
    .returning();
  return { kcalTarget: row.kcalTarget, proteinTargetG: row.proteinTargetG };
}
