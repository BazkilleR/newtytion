import { z } from "zod";
import { idSchema, isoDateSchema } from "./common.js";

export const MUSCLE_GROUPS = ["chest", "back", "shoulders", "arms", "legs", "core", "full_body"];
export const muscleGroupSchema = z.enum(MUSCLE_GROUPS);

export const createExerciseInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  muscleGroup: muscleGroupSchema,
});

export const exerciseSchema = createExerciseInputSchema.extend({
  id: idSchema,
  isCustom: z.boolean(),
});

export const exerciseHistoryPointSchema = z.object({
  logDate: isoDateSchema,
  /** Best estimated 1RM (Epley) of the day, kg */
  e1rmKg: z.number(),
  /** The set that produced it */
  weightKg: z.number(),
  reps: z.number().int(),
});
