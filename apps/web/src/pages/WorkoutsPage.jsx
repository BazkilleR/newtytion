import { ACTIVITY_TYPES, todayIn } from "@fitness/shared";
import { Dumbbell } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button.jsx";
import { api } from "@/lib/api.js";
import { ACTIVITY_LABELS, formatDayLabel } from "@/lib/format.js";
import { useApi } from "@/lib/use-api.js";

function summary(w) {
  if (w.activityType === "weights" && w.setCount > 0) {
    return `${w.exerciseCount} exercise${w.exerciseCount === 1 ? "" : "s"} · ${w.setCount} sets`;
  }
  return w.durationMin ? `${w.durationMin} min` : "";
}

export function WorkoutsPage() {
  const navigate = useNavigate();
  const workouts = useApi("/workouts");
  const [starting, setStarting] = useState(null);
  const [error, setError] = useState(null);

  async function start(activityType) {
    setStarting(activityType);
    setError(null);
    try {
      const w = await api("/workouts", {
        method: "POST",
        body: { logDate: todayIn(), activityType },
      });
      navigate(`/workouts/${w.id}`);
    } catch (err) {
      setError(err.message);
      setStarting(null);
    }
  }

  return (
    <div className="grid gap-5">
      <h1 className="text-xl font-bold">Workouts</h1>

      <section className="grid gap-2">
        <Button
          className="h-16 text-lg"
          onClick={() => start("weights")}
          disabled={starting !== null}
        >
          <Dumbbell className="size-5" />{" "}
          {starting === "weights" ? "Starting…" : "Start weights workout"}
        </Button>
        <div className="grid grid-cols-3 gap-2">
          {ACTIVITY_TYPES.filter((t) => t !== "weights").map((t) => (
            <Button
              key={t}
              variant="outline"
              className="h-12"
              onClick={() => start(t)}
              disabled={starting !== null}
            >
              {ACTIVITY_LABELS[t]}
            </Button>
          ))}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>

      <section className="grid gap-2">
        <h2 className="font-semibold">Recent</h2>
        {workouts.isLoading && !workouts.data && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {workouts.error && <p className="text-sm text-destructive">{workouts.error.message}</p>}
        {workouts.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">No workouts yet.</p>
        )}
        {workouts.data?.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {workouts.data.map((w) => (
              <li key={w.id}>
                <Link
                  to={`/workouts/${w.id}`}
                  className="flex min-h-14 items-center justify-between gap-3 px-3 py-2 hover:bg-muted"
                >
                  <span>
                    <span className="block font-medium">{ACTIVITY_LABELS[w.activityType]}</span>
                    <span className="text-xs text-muted-foreground">{summary(w)}</span>
                  </span>
                  <span className="text-sm text-muted-foreground">{formatDayLabel(w.logDate)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
