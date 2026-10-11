import { addDays, todayIn } from "@fitness/shared";
import { Dumbbell } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { RangePicker } from "@/components/charts/RangePicker.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { MuscleMap } from "@/components/workouts/MuscleMap.jsx";
import { api } from "@/lib/api.js";
import { formatDayLabel } from "@/lib/format.js";
import { useApi } from "@/lib/use-api.js";

const RANGES = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
];

function summary(w) {
  const parts = [];
  if (w.setCount > 0) {
    parts.push(`${w.exerciseCount} exercise${w.exerciseCount === 1 ? "" : "s"}`);
    parts.push(`${w.setCount} sets`);
  }
  if (w.durationMin) parts.push(`${w.durationMin} min`);
  return parts.join(" · ") || "No sets yet";
}

function MusclesCard() {
  const [days, setDays] = useState(7);
  const today = todayIn();
  const muscles = useApi("/workouts/muscle-sets", {
    query: { from: addDays(today, -(days - 1)), to: today },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Muscles trained</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <RangePicker options={RANGES} value={days} onChange={setDays} />
        {muscles.error && <p className="text-sm text-destructive">{muscles.error.message}</p>}
        {!muscles.data && !muscles.error && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {muscles.data && (
          // Refetch keeps the frame: dim the previous render instead of flashing.
          <div className={muscles.isLoading ? "opacity-60 transition-opacity" : undefined}>
            <MuscleMap data={muscles.data} days={days} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function WorkoutsPage() {
  const navigate = useNavigate();
  const workouts = useApi("/workouts");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  async function start() {
    setStarting(true);
    setError(null);
    try {
      const w = await api("/workouts", { method: "POST", body: { logDate: todayIn() } });
      navigate(`/workouts/${w.id}`);
    } catch (err) {
      setError(err.message);
      setStarting(false);
    }
  }

  return (
    <div className="grid gap-5">
      <h1 className="text-xl font-bold">Workouts</h1>

      <section className="grid gap-2">
        <Button className="h-16 text-lg" onClick={start} disabled={starting}>
          <Dumbbell className="size-5" /> {starting ? "Starting…" : "Start workout"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>

      <MusclesCard />

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
                    <span className="block font-medium">{formatDayLabel(w.logDate)}</span>
                    <span className="text-xs text-muted-foreground">{summary(w)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
