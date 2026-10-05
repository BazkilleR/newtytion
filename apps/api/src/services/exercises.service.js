import { bestE1rmPerDay } from "@fitness/shared";
import { and, asc, countDistinct, desc, eq, isNull, max, or } from "drizzle-orm";
import { db } from "../db/client.js";
import { exercises, workoutSets, workouts } from "../db/schema/index.js";
import { notFound } from "../lib/errors.js";

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

/** Exercises the user has logged sets for, most recently trained first. */
export async function listPerformedExercises(userId) {
  const rows = await db
    .select({
      exercise: exercises,
      lastDate: max(workouts.logDate),
      sessionCount: countDistinct(workouts.id),
    })
    .from(workoutSets)
    .innerJoin(workouts, eq(workoutSets.workoutId, workouts.id))
    .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
    .where(eq(workouts.userId, userId))
    .groupBy(exercises.id)
    .orderBy(desc(max(workouts.logDate)), asc(exercises.name));

  return rows.map((r) => ({
    ...toExercise(r.exercise),
    lastDate: r.lastDate,
    sessionCount: r.sessionCount,
  }));
}

/** Best estimated 1RM (Epley) per training day for one exercise. */
export async function getExerciseHistory(userId, exerciseId) {
  const exercise = await findVisibleExercise(userId, exerciseId);
  if (!exercise) throw notFound("Exercise");

  const sets = await db
    .select({ logDate: workouts.logDate, weightKg: workoutSets.weightKg, reps: workoutSets.reps })
    .from(workoutSets)
    .innerJoin(workouts, eq(workoutSets.workoutId, workouts.id))
    .where(and(eq(workouts.userId, userId), eq(workoutSets.exerciseId, exerciseId)));

  return { exercise: toExercise(exercise), points: bestE1rmPerDay(sets) };
}
