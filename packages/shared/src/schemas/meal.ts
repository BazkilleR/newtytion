import { z } from "zod";
import { idSchema, isoDateSchema } from "./common.ts";
import { foodSchema } from "./food.ts";
import { goalsSchema } from "./goal.ts";

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export const mealTypeSchema = z.enum(MEAL_TYPES);
export type MealType = z.infer<typeof mealTypeSchema>;

/** Number of servings of the food (e.g. 1.5 plates). */
export const quantitySchema = z.number().positive().max(100);

export const createMealEntryInputSchema = z.object({
  logDate: isoDateSchema,
  mealType: mealTypeSchema,
  foodId: idSchema,
  quantity: quantitySchema,
});
export type CreateMealEntryInput = z.infer<typeof createMealEntryInputSchema>;

export const updateMealEntryInputSchema = z.object({
  mealType: mealTypeSchema.optional(),
  quantity: quantitySchema.optional(),
});
export type UpdateMealEntryInput = z.infer<typeof updateMealEntryInputSchema>;

export const dailyMealsQuerySchema = z.object({ date: isoDateSchema });

export const mealEntrySchema = z.object({
  id: idSchema,
  logDate: isoDateSchema,
  mealType: mealTypeSchema,
  quantity: z.number(),
  food: foodSchema,
});
export type MealEntry = z.infer<typeof mealEntrySchema>;

export const nutritionTotalsSchema = z.object({
  kcal: z.number(),
  proteinG: z.number(),
  carbG: z.number(),
  fatG: z.number(),
});
export type NutritionTotals = z.infer<typeof nutritionTotalsSchema>;

export const dailyMealsSchema = z.object({
  date: isoDateSchema,
  entries: z.array(mealEntrySchema),
  totals: nutritionTotalsSchema,
  goals: goalsSchema,
});
export type DailyMeals = z.infer<typeof dailyMealsSchema>;
