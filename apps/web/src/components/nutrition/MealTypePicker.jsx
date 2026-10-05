import { MEAL_TYPES } from "@fitness/shared";
import { MEAL_LABELS } from "@/lib/format.js";
import { cn } from "@/lib/utils.js";

/** Segmented control for breakfast / lunch / dinner / snack. */
export function MealTypePicker({ value, onChange }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">Meal</legend>
      <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1">
        {MEAL_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            aria-pressed={value === type}
            onClick={() => onChange(type)}
            className={cn(
              "h-10 rounded-md text-sm transition-colors",
              value === type
                ? "bg-background font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {MEAL_LABELS[type]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
