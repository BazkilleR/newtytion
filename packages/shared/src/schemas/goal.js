import { z } from "zod";

const target = (max) => z.number({ error: "Enter a number" }).int("Whole number").min(0).max(max);

export const goalsSchema = z.object({
  kcalTarget: target(10_000),
  proteinTargetG: target(1000),
  carbTargetG: target(2000),
  fatTargetG: target(1000),
});

const KCAL_PER_G = { protein: 4, carb: 4, fat: 9 };
/** Share of calories from fat when suggesting targets (common middle ground). */
const FAT_SHARE = 0.25;

/**
 * Suggest carb/fat targets for a calorie and protein goal: 25% of calories
 * from fat, the rest (after protein) from carbs. Never negative.
 */
export function suggestMacroTargets(kcalTarget, proteinTargetG) {
  const fatTargetG = Math.round((kcalTarget * FAT_SHARE) / KCAL_PER_G.fat);
  const carbKcal = kcalTarget - proteinTargetG * KCAL_PER_G.protein - fatTargetG * KCAL_PER_G.fat;
  return { carbTargetG: Math.max(0, Math.round(carbKcal / KCAL_PER_G.carb)), fatTargetG };
}

export const DEFAULT_GOALS = {
  kcalTarget: 2000,
  proteinTargetG: 120,
  ...suggestMacroTargets(2000, 120),
};
