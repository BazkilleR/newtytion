import { entryNutrition } from "@fitness/shared";
import { formatGrams, formatKcal } from "@/lib/format.js";

/** "870 kcal · P 42 g · C 97.5 g · F 33 g" for a food at a given quantity. */
export function NutritionPreview({ food, quantity }) {
  const n = entryNutrition(food, quantity);
  return (
    <p className="rounded-lg bg-muted px-3 py-2 text-sm tabular-nums">
      <span className="text-base font-semibold">{formatKcal(n.kcal)} kcal</span>
      <span className="text-muted-foreground">
        {" "}
        · P {formatGrams(n.proteinG)} g · C {formatGrams(n.carbG)} g · F {formatGrams(n.fatG)} g
      </span>
    </p>
  );
}
