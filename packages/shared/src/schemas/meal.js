import { z } from "zod";
import { idSchema, isoDateSchema } from "./common.js";
import { foodSchema } from "./food.js";
import { goalsSchema } from "./goal.js";

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
export const mealTypeSchema = z.enum(MEAL_TYPES);

/** Number of servings of the food (e.g. 1.5 plates). */
export const quantitySchema = z.number().positive().max(100);

export const createMealEntryInputSchema = z.object({
  logDate: isoDateSchema,
  mealType: mealTypeSchema,
  foodId: idSchema,
  quantity: quantitySchema,
});

export const updateMealEntryInputSchema = z.object({
  mealType: mealTypeSchema.optional(),
  quantity: quantitySchema.optional(),
});

export const dailyMealsQuerySchema = z.object({ date: isoDateSchema });

export const mealEntrySchema = z.object({
  id: idSchema,
  logDate: isoDateSchema,
  mealType: mealTypeSchema,
  quantity: z.number(),
  food: foodSchema,
});

export const nutritionTotalsSchema = z.object({
  kcal: z.number(),
  proteinG: z.number(),
  carbG: z.number(),
  fatG: z.number(),
});

export const dailyMealsSchema = z.object({
  date: isoDateSchema,
  entries: z.array(mealEntrySchema),
  totals: nutritionTotalsSchema,
  goals: goalsSchema,
});
