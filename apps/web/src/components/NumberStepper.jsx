import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button.jsx";
import { cn } from "@/lib/utils.js";

const roundTo = (n, digits = 3) => Math.round(n * 10 ** digits) / 10 ** digits;

/**
 * Big −/+ buttons around an editable number. Built for thumbs at the gym:
 * most changes are one tap, typing is optional and only commits on blur/Enter.
 */
export function NumberStepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  label,
  unit,
  className,
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const clamp = (n) => Math.min(max, Math.max(min, roundTo(n)));

  function commitDraft() {
    const n = Number(draft);
    if (draft.trim() !== "" && Number.isFinite(n)) onChange(clamp(n));
    else setDraft(String(value));
  }

  return (
    <fieldset className={cn("grid gap-1.5", className)}>
      {label && <legend className="mb-1.5 text-sm font-medium">{label}</legend>}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="size-12 shrink-0"
          onClick={() => onChange(clamp(value - step))}
          disabled={value <= min}
          aria-label={`Decrease ${label ?? ""} by ${step}`}
        >
          <Minus className="size-5" />
        </Button>
        <div className="relative flex-1">
          <input
            inputMode="decimal"
            aria-label={label}
            className="h-12 w-full rounded-lg border border-input bg-transparent text-center text-xl font-semibold tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitDraft();
              }
            }}
          />
          {unit && (
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
              {unit}
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          className="size-12 shrink-0"
          onClick={() => onChange(clamp(value + step))}
          disabled={value >= max}
          aria-label={`Increase ${label ?? ""} by ${step}`}
        >
          <Plus className="size-5" />
        </Button>
      </div>
    </fieldset>
  );
}
