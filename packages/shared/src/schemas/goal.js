import { z } from "zod";

export const goalsSchema = z.object({
  kcalTarget: z.number().int().min(0).max(10_000),
  proteinTargetG: z.number().int().min(0).max(1000),
});

export const DEFAULT_GOALS = { kcalTarget: 2000, proteinTargetG: 120 };
