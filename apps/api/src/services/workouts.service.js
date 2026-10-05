import { groupSetsByExercise } from "@fitness/shared";
import { and, asc, count, countDistinct, desc, eq, max, ne, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { exercises, workoutSets, workouts } from "../db/schema/index.js";
import { PG_UNIQUE_VIOLATION, pgErrorCode } from "../lib/db-errors.js";
import { AppError, conflict, notFound } from "../lib/errors.js";
import { findVisibleExercise, toExercise } from "./exercises.service.js";

function toWorkout(row) {
  return {
    id: row.id,
    logDate: row.logDate,
    activityType: row.activityType,
    durationMin: row.durationMin,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

function toSet(row) {
  return {
    id: row.id,
    workoutId: row.workoutId,
    exerciseId: row.exerciseId,
    setNo: row.setNo,
    weightKg: row.weightKg,
    reps: row.reps,
    rpe: row.rpe,
  };
}

// ---------------------------------------------------------------- workouts

/** Most recent first, with set/exercise counts for the list view. */
export async function listWorkouts(userId, { limit }) {
  const rows = await db
    .select({
      workout: workouts,
      setCount: count(workoutSets.id),
      exerciseCount: countDistinct(workoutSets.exerciseId),
    })
    .from(workouts)
    .leftJoin(workoutSets, eq(workoutSets.workoutId, workouts.id))
    .where(eq(workouts.userId, userId))
    .groupBy(workouts.id)
    .orderBy(desc(workouts.logDate), desc(workouts.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    ...toWorkout(r.workout),
    setCount: r.setCount,
    exerciseCount: r.exerciseCount,
  }));
}

export async function createWorkout(userId, input) {
  const [row] = await db
    .insert(workouts)
    .values({ ...input, userId })
    .returning();
  return toWorkout(row);
}

/** The workout row if it belongs to the user; 404 otherwise (no existence leak). */
async function findOwnWorkout(userId, workoutId) {
  const [row] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)));
  if (!row) throw notFound("Workout");
  return row;
}

export async function getWorkoutDetail(userId, workoutId) {
  const workout = await findOwnWorkout(userId, workoutId);

  const rows = await db
    .select({ set: workoutSets, exercise: exercises })
    .from(workoutSets)
    .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
    .where(eq(workoutSets.workoutId, workoutId))
    // created_at gives "order exercises were started"; set_no breaks ties for
    // sets inserted in the same transaction (copy last session).
    .orderBy(asc(workoutSets.createdAt), asc(workoutSets.setNo));

  const exerciseById = new Map(rows.map((r) => [r.exercise.id, r.exercise]));
  const grouped = groupSetsByExercise(rows.map((r) => toSet(r.set)));

  return {
    ...toWorkout(workout),
    exercises: [...grouped].map(([exerciseId, sets]) => ({
      exercise: toExercise(exerciseById.get(exerciseId)),
      sets: sets.sort((a, b) => a.setNo - b.setNo),
    })),
  };
}

export async function updateWorkout(userId, workoutId, input) {
  if (Object.keys(input).length === 0) return toWorkout(await findOwnWorkout(userId, workoutId));
  const [row] = await db
    .update(workouts)
    .set(input)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
    .returning();
  if (!row) throw notFound("Workout");
  return toWorkout(row);
}

/** Sets go with it (ON DELETE CASCADE). */
export async function deleteWorkout(userId, workoutId) {
  const deleted = await db
    .delete(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
    .returning({ id: workouts.id });
  if (deleted.length === 0) throw notFound("Workout");
}

// -------------------------------------------------------------------- sets

async function assertUsableExercise(userId, exerciseId) {
  const exercise = await findVisibleExercise(userId, exerciseId);
  if (!exercise) throw notFound("Exercise");
}

/**
 * set_no = (current max for this exercise in this workout) + 1, computed inside
 * the INSERT itself. Two taps at the same moment can still compute the same
 * number; the unique constraint rejects the loser and we simply retry.
 */
async function insertNextSet(workoutId, input, attempts = 5) {
  const nextSetNo = sql`(
    select coalesce(max(${workoutSets.setNo}), 0) + 1 from ${workoutSets}
    where ${workoutSets.workoutId} = ${workoutId} and ${workoutSets.exerciseId} = ${input.exerciseId}
  )`;
  try {
    const [row] = await db
      .insert(workoutSets)
      .values({ ...input, workoutId, setNo: nextSetNo })
      .returning();
    return row;
  } catch (err) {
    if (pgErrorCode(err) === PG_UNIQUE_VIOLATION && attempts > 1) {
      return insertNextSet(workoutId, input, attempts - 1);
    }
    throw err;
  }
}

export async function addSet(userId, workoutId, input) {
  await findOwnWorkout(userId, workoutId);
  await assertUsableExercise(userId, input.exerciseId);
  return toSet(await insertNextSet(workoutId, input));
}

export async function updateSet(userId, workoutId, setId, input) {
  await findOwnWorkout(userId, workoutId);
  if (Object.keys(input).length === 0) {
    const [row] = await db
      .select()
      .from(workoutSets)
      .where(and(eq(workoutSets.id, setId), eq(workoutSets.workoutId, workoutId)));
    if (!row) throw notFound("Set");
    return toSet(row);
  }
  const [row] = await db
    .update(workoutSets)
    .set(input)
    // workoutId in the WHERE: a set id from another (someone else's) workout won't match
    .where(and(eq(workoutSets.id, setId), eq(workoutSets.workoutId, workoutId)))
    .returning();
  if (!row) throw notFound("Set");
  return toSet(row);
}

export async function deleteSet(userId, workoutId, setId) {
  await findOwnWorkout(userId, workoutId);
  const deleted = await db
    .delete(workoutSets)
    .where(and(eq(workoutSets.id, setId), eq(workoutSets.workoutId, workoutId)))
    .returning({ id: workoutSets.id });
  if (deleted.length === 0) throw notFound("Set");
}

// ------------------------------------------------------- last session/copy

/**
 * The user's most recent workout containing `exerciseId`, and its sets for
 * that exercise. With `beforeWorkoutId`, only workouts that come before that
 * one (by log_date, then created_at) count — so the session being logged,
 * and anything logged "in the future", is ignored.
 */
export async function getLastSession(userId, exerciseId, { beforeWorkoutId } = {}) {
  const conditions = [eq(workouts.userId, userId), eq(workoutSets.exerciseId, exerciseId)];
  if (beforeWorkoutId) {
    // Compare in SQL: JS Dates only have millisecond precision, Postgres has microseconds.
    conditions.push(
      ne(workouts.id, beforeWorkoutId),
      sql`(${workouts.logDate}, ${workouts.createdAt}) < (
        select w.log_date, w.created_at from ${workouts} w
        where w.id = ${beforeWorkoutId} and w.user_id = ${userId}
      )`,
    );
  }

  const [previous] = await db
    .selectDistinct({ id: workouts.id, logDate: workouts.logDate, createdAt: workouts.createdAt })
    .from(workouts)
    .innerJoin(workoutSets, eq(workoutSets.workoutId, workouts.id))
    .where(and(...conditions))
    .orderBy(desc(workouts.logDate), desc(workouts.createdAt))
    .limit(1);

  if (!previous) return { workout: null, sets: [] };

  const sets = await db
    .select()
    .from(workoutSets)
    .where(and(eq(workoutSets.workoutId, previous.id), eq(workoutSets.exerciseId, exerciseId)))
    .orderBy(asc(workoutSets.setNo));

  return {
    workout: { id: previous.id, logDate: previous.logDate },
    sets: sets.map(toSet),
  };
}

/** Append copies of the previous session's sets (weight, reps, rpe) to this workout. */
export async function copyLastSession(userId, workoutId, exerciseId) {
  await findOwnWorkout(userId, workoutId);
  await assertUsableExercise(userId, exerciseId);

  const last = await getLastSession(userId, exerciseId, { beforeWorkoutId: workoutId });
  if (!last.workout) {
    throw new AppError(404, "NO_PREVIOUS_SESSION", "No earlier session with this exercise");
  }

  try {
    // One transaction: either every set is copied or none are.
    const rows = await db.transaction(async (tx) => {
      const [{ current }] = await tx
        .select({ current: max(workoutSets.setNo) })
        .from(workoutSets)
        .where(and(eq(workoutSets.workoutId, workoutId), eq(workoutSets.exerciseId, exerciseId)));
      const start = current ?? 0;

      return tx
        .insert(workoutSets)
        .values(
          last.sets.map((s, i) => ({
            workoutId,
            exerciseId,
            setNo: start + i + 1,
            weightKg: s.weightKg,
            reps: s.reps,
            rpe: s.rpe,
          })),
        )
        .returning();
    });
    return rows.sort((a, b) => a.setNo - b.setNo).map(toSet);
  } catch (err) {
    if (pgErrorCode(err) === PG_UNIQUE_VIOLATION) {
      throw conflict("SET_CONFLICT", "Sets were added at the same time, please try again");
    }
    throw err;
  }
}
