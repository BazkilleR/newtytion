import {
  addDays,
  groupByMealType,
  isoDateSchema,
  MEAL_TYPES,
  sumDailyTotals,
  todayIn,
} from "@fitness/shared";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { DailySummary } from "@/components/nutrition/DailySummary.jsx";
import { EditEntryDialog } from "@/components/nutrition/EditEntryDialog.jsx";
import { Button } from "@/components/ui/button.jsx";
import { formatDayLabel, formatKcal, formatServing, MEAL_LABELS } from "@/lib/format.js";
import { useApi } from "@/lib/use-api.js";

/** The selected day lives in the URL (?date=YYYY-MM-DD) so back/refresh/share keep it. */
function useSelectedDate() {
  const [searchParams, setSearchParams] = useSearchParams();
  const today = todayIn();
  const param = searchParams.get("date");
  const date = isoDateSchema.safeParse(param).success ? param : today;
  const setDate = (d) => setSearchParams(d === today ? {} : { date: d });
  return { date, today, setDate };
}

function DateNav({ date, today, setDate }) {
  const label = formatDayLabel(date, today);
  return (
    <div className="flex items-center justify-between">
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label="Previous day"
        onClick={() => setDate(addDays(date, -1))}
      >
        <ChevronLeft />
      </Button>
      <div className="text-center">
        <h1>
          {/* A transparent native date input covers the label: tapping opens the
              phone's date picker; on desktop showPicker() opens the calendar
              from anywhere on the label, not just the tiny icon. */}
          <label className="relative inline-flex h-10 cursor-pointer items-center rounded-lg px-2 text-xl font-bold hover:bg-muted focus-within:ring-3 focus-within:ring-ring/50">
            {label}
            <input
              type="date"
              required
              aria-label="Choose a date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker();
                } catch {
                  // Older browsers: the native control still opens on tap.
                }
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </h1>
        {date !== today && (
          <button
            type="button"
            className="text-xs text-muted-foreground underline"
            onClick={() => setDate(today)}
          >
            Back to today
          </button>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label="Next day"
        onClick={() => setDate(addDays(date, 1))}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}

function MealSection({ mealType, entries, date, onSelect }) {
  const subtotal = sumDailyTotals(entries).kcal;
  return (
    <section className="grid gap-1">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">
          {MEAL_LABELS[mealType]}
          {entries.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">
              {formatKcal(subtotal)} kcal
            </span>
          )}
        </h2>
        <Button asChild variant="ghost" size="lg" className="h-10">
          <Link
            to={`/food/add?date=${date}&meal=${mealType}`}
            aria-label={`Add food to ${MEAL_LABELS[mealType]}`}
          >
            <Plus /> Add
          </Link>
        </Button>
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing logged</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onSelect(entry)}
                className="flex min-h-14 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted"
              >
                <span className="min-w-0">
                  <span className="block truncate">{entry.food.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatServing(entry.food, entry.quantity)}
                  </span>
                </span>
                <span className="shrink-0 text-sm tabular-nums">
                  {formatKcal(entry.food.kcal * entry.quantity)} kcal
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function TodayPage() {
  const { date, today, setDate } = useSelectedDate();
  const day = useApi("/meals", { query: { date } });
  const [editing, setEditing] = useState(null);

  // Show the previous day's data while the next one loads (no flicker),
  // but only once we have something for *some* day.
  const data = day.data;
  const groups = data ? groupByMealType(data.entries) : null;

  return (
    <div className="grid gap-5">
      <DateNav date={date} today={today} setDate={setDate} />

      {day.error && !data && (
        <div className="grid gap-2 rounded-lg border border-destructive/50 p-3 text-sm">
          <p className="text-destructive">{day.error.message}</p>
          <Button variant="outline" onClick={day.refetch}>
            Try again
          </Button>
        </div>
      )}

      {!data && !day.error && <p className="text-sm text-muted-foreground">Loading…</p>}

      {data && (
        <div className={day.isLoading ? "grid gap-5 opacity-60 transition-opacity" : "grid gap-5"}>
          <DailySummary totals={data.totals} goals={data.goals} />
          {MEAL_TYPES.map((type) => (
            <MealSection
              key={type}
              mealType={type}
              entries={groups[type]}
              date={date}
              onSelect={setEditing}
            />
          ))}
        </div>
      )}

      <EditEntryDialog entry={editing} onClose={() => setEditing(null)} onChanged={day.refetch} />
    </div>
  );
}
