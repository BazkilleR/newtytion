import { progress } from "@fitness/shared";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Progress } from "@/components/ui/progress.jsx";
import { formatGrams, formatKcal } from "@/lib/format.js";

function remainingText(value, target, p, unit, format) {
  return p.over ? `${format(value - target)} ${unit} over` : `${format(p.remaining)} ${unit} left`;
}

/** Calories: the headline row, full width. */
function KcalRow({ value, target }) {
  const p = progress(value, target);
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">Calories</span>
        <span>
          <span className="text-lg font-semibold">{formatKcal(value)}</span>
          <span className="text-muted-foreground tabular-nums"> / {formatKcal(target)} kcal</span>
        </span>
      </div>
      <Progress
        value={p.percent}
        aria-label="Calories progress"
        className="h-2.5"
        indicatorClassName={p.over ? "bg-destructive" : undefined}
      />
      <p className={p.over ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
        {remainingText(value, target, p, "kcal", formatKcal)}
      </p>
    </div>
  );
}

/**
 * Protein / carbs / fat: compact column, three side by side.
 * `minimum` targets (protein) are good to exceed; the others are ceilings.
 */
function MacroColumn({ label, value, target, minimum = false }) {
  const p = progress(value, target);
  const warn = p.over && !minimum;
  return (
    <div className="grid min-w-0 gap-1">
      <span className="text-xs font-medium">{label}</span>
      <span className="truncate">
        <span className="font-semibold">{formatGrams(value)}</span>
        <span className="text-xs text-muted-foreground tabular-nums"> / {target} g</span>
      </span>
      <Progress
        value={p.percent}
        aria-label={`${label} progress`}
        className="h-1.5"
        indicatorClassName={warn ? "bg-destructive" : undefined}
      />
      <span className={warn ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
        {p.over
          ? minimum
            ? "✓ goal reached"
            : `${formatGrams(value - target)} over`
          : `${formatGrams(p.remaining)} left`}
      </span>
    </div>
  );
}

export function DailySummary({ totals, goals }) {
  return (
    <Card>
      <CardContent className="grid gap-4">
        <KcalRow value={totals.kcal} target={goals.kcalTarget} />
        <div className="grid grid-cols-3 gap-3">
          <MacroColumn
            label="Protein"
            value={totals.proteinG}
            target={goals.proteinTargetG}
            minimum
          />
          <MacroColumn label="Carbs" value={totals.carbG} target={goals.carbTargetG} />
          <MacroColumn label="Fat" value={totals.fatG} target={goals.fatTargetG} />
        </div>
      </CardContent>
    </Card>
  );
}
