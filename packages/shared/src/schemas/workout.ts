import { z } from "zod";
import { idSchema, isoDateSchema } from "./common.ts";
import { exerciseSchema } from "./exercise.ts";

export const ACTIVITY_TYPES = ["weights", "running", "judo", "other"] as const;
export const activityTypeSchema = z.enum(ACTIVITY_TYPES);
export type ActivityType = z.infer<typeof activityTypeSchema>;

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
export type CreateWorkoutInput = z.infer<typeof createWorkoutInputSchema>;

export const updateWorkoutInputSchema = createWorkoutInputSchema.partial();
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutInputSchema>;

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
export type CreateSetInput = z.infer<typeof createSetInputSchema>;

export const updateSetInputSchema = z.object({
  weightKg: weightKg.optional(),
  reps: reps.optional(),
  rpe: rpe.optional(),
});
export type UpdateSetInput = z.infer<typeof updateSetInputSchema>;

export const copyLastSessionInputSchema = z.object({ exerciseId: idSchema });
export type CopyLastSessionInput = z.infer<typeof copyLastSessionInputSchema>;

export const workoutSetSchema = z.object({
  id: idSchema,
  workoutId: idSchema,
  exerciseId: idSchema,
  setNo: z.number().int(),
  weightKg: z.number(),
  reps: z.number().int(),
  rpe: z.number().nullable(),
});
export type WorkoutSet = z.infer<typeof workoutSetSchema>;

export const workoutSchema = z.object({
  id: idSchema,
  logDate: isoDateSchema,
  activityType: activityTypeSchema,
  durationMin: z.number().int().nullable(),
  note: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type Workout = z.infer<typeof workoutSchema>;

export const workoutDetailSchema = workoutSchema.extend({
  /** Exercises in the order they were first added, each with its sets ordered by set_no */
  exercises: z.array(
    z.object({
      exercise: exerciseSchema,
      sets: z.array(workoutSetSchema),
    }),
  ),
});
export type WorkoutDetail = z.infer<typeof workoutDetailSchema>;
