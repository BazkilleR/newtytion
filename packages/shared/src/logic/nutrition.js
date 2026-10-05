import { MEAL_TYPES } from "../schemas/meal.js";

const round1 = (n) => Math.round(n * 10) / 10;

/** Nutrition for `quantity` servings of `food` (values in foods are per serving). */
export function entryNutrition(food, quantity) {
  return {
    kcal: round1(food.kcal * quantity),
    proteinG: round1(food.proteinG * quantity),
    carbG: round1(food.carbG * quantity),
    fatG: round1(food.fatG * quantity),
  };
}

/**
 * Sum of all entries ({ food, quantity }). Sums raw values and rounds once
 * at the end so rounding errors don't accumulate.
 */
export function sumDailyTotals(entries) {
  const totals = { kcal: 0, proteinG: 0, carbG: 0, fatG: 0 };
  for (const { food, quantity } of entries) {
    totals.kcal += food.kcal * quantity;
    totals.proteinG += food.proteinG * quantity;
    totals.carbG += food.carbG * quantity;
    totals.fatG += food.fatG * quantity;
  }
  return {
    kcal: round1(totals.kcal),
    proteinG: round1(totals.proteinG),
    carbG: round1(totals.carbG),
    fatG: round1(totals.fatG),
  };
}

/** { breakfast: [...], lunch: [...], dinner: [...], snack: [...] } — every key always present. */
export function groupByMealType(entries) {
  const groups = Object.fromEntries(MEAL_TYPES.map((t) => [t, []]));
  for (const entry of entries) groups[entry.mealType]?.push(entry);
  return groups;
}

/**
 * Progress toward a target. `percent` is capped at 100 for progress bars;
 * `over` tells the UI to show it differently once the target is exceeded.
 */
export function progress(value, target) {
  if (!target || target <= 0) return { percent: 0, remaining: 0, over: false };
  return {
    percent: Math.min(100, Math.round((value / target) * 100)),
    remaining: round1(Math.max(0, target - value)),
    over: value > target,
  };
}

const hourFormatters = new Map();

/** Sensible default meal for "now" in the user's timezone. */
export function suggestMealType(now = new Date(), timeZone = "Asia/Bangkok") {
  let fmt = hourFormatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" });
    hourFormatters.set(timeZone, fmt);
  }
  const hour = Number(fmt.format(now));
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 17 && hour < 22) return "dinner";
  return "snack";
}
