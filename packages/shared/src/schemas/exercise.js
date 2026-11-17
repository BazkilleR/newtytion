import { z } from "zod";
import { idSchema, isoDateSchema } from "./common.js";

export const MUSCLE_GROUP_LABELS = {
  chest: "Chest",
  shoulders: "Shoulders",
  triceps: "Triceps",
  biceps: "Biceps",
  forearms: "Forearms",
  traps: "Traps",
  lats: "Lats",
  lower_back: "Lower back",
  abs: "Abs",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
};

/** Display order: the exercise list and picker are sorted by this (it's also the DB enum order). */
export const MUSCLE_GROUPS = Object.keys(MUSCLE_GROUP_LABELS);
export const muscleGroupSchema = z.enum(MUSCLE_GROUPS);

export const createExerciseInputSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a name").max(100),
    /** Primary muscle: counts as a full set in muscle volume */
    muscleGroup: muscleGroupSchema,
    /** Muscles that also work: count as half a set each */
    secondaryMuscles: z.array(muscleGroupSchema).max(5).default([]),
  })
  .refine((e) => !e.secondaryMuscles.includes(e.muscleGroup), {
    message: "The primary muscle can't also be secondary",
    path: ["secondaryMuscles"],
  })
  .refine((e) => new Set(e.secondaryMuscles).size === e.secondaryMuscles.length, {
    message: "Secondary muscles must be unique",
    path: ["secondaryMuscles"],
  });

export const exerciseSchema = z.object({
  id: idSchema,
  name: z.string(),
  muscleGroup: muscleGroupSchema,
  secondaryMuscles: z.array(muscleGroupSchema),
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
