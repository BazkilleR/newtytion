import { z } from "zod";
import { idSchema, isoDateSchema } from "./common.ts";

export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "arms",
  "legs",
  "core",
  "full_body",
] as const;
export const muscleGroupSchema = z.enum(MUSCLE_GROUPS);
export type MuscleGroup = z.infer<typeof muscleGroupSchema>;

export const createExerciseInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  muscleGroup: muscleGroupSchema,
});
export type CreateExerciseInput = z.infer<typeof createExerciseInputSchema>;

export const exerciseSchema = createExerciseInputSchema.extend({
  id: idSchema,
  isCustom: z.boolean(),
});
export type Exercise = z.infer<typeof exerciseSchema>;

export const exerciseHistoryPointSchema = z.object({
  logDate: isoDateSchema,
  /** Best estimated 1RM (Epley) of the day, kg */
  e1rmKg: z.number(),
  /** The set that produced it */
  weightKg: z.number(),
  reps: z.number().int(),
});
export type ExerciseHistoryPoint = z.infer<typeof exerciseHistoryPointSchema>;
