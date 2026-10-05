import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { activityTypeEnum, muscleGroupEnum } from "./enums.js";

/** user_id NULL = global (seeded) exercise. */
export const exercises = pgTable(
  "exercises",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text().references(() => user.id, { onDelete: "cascade" }),
    name: text().notNull(),
    muscleGroup: muscleGroupEnum().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index().on(t.userId),
    uniqueIndex("exercises_global_name_uq").on(t.name).where(sql`${t.userId} is null`),
  ],
);

export const workouts = pgTable(
  "workouts",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    logDate: date({ mode: "string" }).notNull(),
    activityType: activityTypeEnum().notNull(),
    durationMin: integer(),
    note: text(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index().on(t.userId, t.logDate)],
);

/** No user_id here: ownership is always checked through the parent workout. */
export const workoutSets = pgTable(
  "workout_sets",
  {
    id: uuid().primaryKey().defaultRandom(),
    workoutId: uuid()
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    exerciseId: uuid()
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    setNo: integer().notNull(),
    weightKg: numeric({ precision: 6, scale: 2, mode: "number" }).notNull(),
    reps: integer().notNull(),
    rpe: numeric({ precision: 3, scale: 1, mode: "number" }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique().on(t.workoutId, t.exerciseId, t.setNo),
    index().on(t.exerciseId),
    check("workout_sets_values", sql`${t.weightKg} >= 0 and ${t.reps} >= 0 and ${t.setNo} >= 1`),
    check("workout_sets_rpe_range", sql`${t.rpe} is null or (${t.rpe} >= 1 and ${t.rpe} <= 10)`),
  ],
);
