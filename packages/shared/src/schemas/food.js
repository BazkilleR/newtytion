import { z } from "zod";
import { idSchema } from "./common.js";

// Explicit messages because these also drive form errors in the web app.
const num = () => z.number({ error: "Enter a number" });
const macro = num().min(0, "Can't be negative").max(1000);

export const createFoodInputSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(100),
  kcal: num().min(0, "Can't be negative").max(10_000),
  proteinG: macro,
  carbG: macro,
  fatG: macro,
  servingSize: num().positive("Must be more than 0").max(10_000),
  servingUnit: z.string().trim().min(1, "Enter a unit, e.g. g or plate").max(20),
});

export const updateFoodInputSchema = createFoodInputSchema.partial();

export const foodSearchQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const foodSchema = createFoodInputSchema.extend({
  id: idSchema,
  /** true = created by the current user, false = global (seeded) food */
  isCustom: z.boolean(),
});
