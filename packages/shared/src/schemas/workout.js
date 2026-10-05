import { z } from "zod";
import { idSchema, isoDateSchema } from "./common.js";
import { exerciseSchema } from "./exercise.js";

export const ACTIVITY_TYPES = ["weights", "running", "judo", "other"];
export const activityTypeSchema = z.enum(ACTIVITY_TYPES);

export const createWorkoutInputSchema = z.object({
  logDate: isoDateSchema,
  activityType: activityTypeSchema,
  durationMin: z
    .number()
    .int()
    .min(0)
    .max(24 * 60)
    .nullable()
    .optional(),
  note: z.string().trim().max(1000).nullable().optional(),
});

export const updateWorkoutInputSchema = createWorkoutInputSchema.partial();

const weightKg = z.number().min(0).max(1000);
const reps = z.number().int().min(0).max(200);
const rpe = z.number().min(1).max(10).multipleOf(0.5).nullable();

/** set_no is assigned by the server (next number for that exercise in the workout). */
export const createSetInputSchema = z.object({
  exerciseId: idSchema,
  weightKg,
  reps,
  rpe: rpe.optional(),
});

export const updateSetInputSchema = z.object({
  weightKg: weightKg.optional(),
  reps: reps.optional(),
  rpe: rpe.optional(),
});

export const copyLastSessionInputSchema = z.object({ exerciseId: idSchema });

export const setParamsSchema = z.object({ id: idSchema, setId: idSchema });

export const workoutListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const lastSetsQuerySchema = z.object({
  /** Only look at sessions before this workout (the one being logged). */
  beforeWorkoutId: idSchema.optional(),
});

export const workoutSetSchema = z.object({
  id: idSchema,
  workoutId: idSchema,
  exerciseId: idSchema,
  setNo: z.number().int(),
  weightKg: z.number(),
  reps: z.number().int(),
  rpe: z.number().nullable(),
});

export const workoutSchema = z.object({
  id: idSchema,
  logDate: isoDateSchema,
  activityType: activityTypeSchema,
  durationMin: z.number().int().nullable(),
  note: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

export const workoutDetailSchema = workoutSchema.extend({
  /** Exercises in the order they were first added, each with its sets ordered by set_no */
  exercises: z.array(
    z.object({
      exercise: exerciseSchema,
      sets: z.array(workoutSetSchema),
    }),
  ),
});
