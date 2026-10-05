import { progress } from "@fitness/shared";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Progress } from "@/components/ui/progress.jsx";
import { formatGrams, formatKcal } from "@/lib/format.js";

function GoalRow({ label, value, target, unit, format }) {
  const p = progress(value, target);
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums">
          <span className="text-base font-semibold">{format(value)}</span>
          <span className="text-muted-foreground">
            {" "}
            / {format(target)} {unit}
          </span>
        </span>
      </div>
      <Progress
        value={p.percent}
        aria-label={`${label} progress`}
        className="h-2.5"
        indicatorClassName={p.over ? "bg-destructive" : undefined}
      />
      <p className={p.over ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
        {p.over ? `${format(value - target)} ${unit} over` : `${format(p.remaining)} ${unit} left`}
      </p>
    </div>
  );
}

export function DailySummary({ totals, goals }) {
  return (
    <Card>
      <CardContent className="grid gap-4">
        <GoalRow
          label="Calories"
          value={totals.kcal}
          target={goals.kcalTarget}
          unit="kcal"
          format={formatKcal}
        />
        <GoalRow
          label="Protein"
          value={totals.proteinG}
          target={goals.proteinTargetG}
          unit="g"
          format={formatGrams}
        />
        <p className="text-xs text-muted-foreground tabular-nums">
          Carbs {formatGrams(totals.carbG)} g · Fat {formatGrams(totals.fatG)} g
        </p>
      </CardContent>
    </Card>
  );
}
