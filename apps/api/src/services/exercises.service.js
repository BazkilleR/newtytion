import { and, asc, eq, isNull, or } from "drizzle-orm";
import { db } from "../db/client.js";
import { exercises } from "../db/schema/index.js";

const visibleTo = (userId) => or(isNull(exercises.userId), eq(exercises.userId, userId));

export function toExercise(row) {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscleGroup,
    isCustom: row.userId !== null,
  };
}

/** Global + own exercises, grouped by muscle group (enum order) then name. */
export async function listExercises(userId) {
  const rows = await db
    .select()
    .from(exercises)
    .where(visibleTo(userId))
    .orderBy(asc(exercises.muscleGroup), asc(exercises.name));
  return rows.map(toExercise);
}

export async function findVisibleExercise(userId, exerciseId) {
  const [row] = await db
    .select()
    .from(exercises)
    .where(and(eq(exercises.id, exerciseId), visibleTo(userId)));
  return row ?? null;
}

export async function createExercise(userId, input) {
  const [row] = await db
    .insert(exercises)
    .values({ ...input, userId })
    .returning();
  return toExercise(row);
}
