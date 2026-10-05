import { z } from "zod";

export const goalsSchema = z.object({
  kcalTarget: z.number().int().min(0).max(10_000),
  proteinTargetG: z.number().int().min(0).max(1000),
});
export type Goals = z.infer<typeof goalsSchema>;

export const DEFAULT_GOALS: Goals = { kcalTarget: 2000, proteinTargetG: 120 };
