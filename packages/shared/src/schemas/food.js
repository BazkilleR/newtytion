import { z } from "zod";
import { idSchema } from "./common.js";

const macro = z.number().min(0).max(1000);

export const createFoodInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  kcal: z.number().min(0).max(10_000),
  proteinG: macro,
  carbG: macro,
  fatG: macro,
  servingSize: z.number().positive().max(10_000),
  servingUnit: z.string().trim().min(1).max(20),
});

export const updateFoodInputSchema = createFoodInputSchema.partial();

export const foodSearchQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const foodSchema = createFoodInputSchema.extend({
  id: idSchema,
  /** true = created by the current user, false = global (seeded) food */
  isCustom: z.boolean(),
});
