import { z } from "zod";

export const goalsSchema = z.object({
  kcalTarget: z.number({ error: "Enter a number" }).int("Whole number").min(0).max(10_000),
  proteinTargetG: z.number({ error: "Enter a number" }).int("Whole number").min(0).max(1000),
});

export const DEFAULT_GOALS = { kcalTarget: 2000, proteinTargetG: 120 };
