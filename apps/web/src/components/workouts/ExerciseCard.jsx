import { formatSet, nextSetDefaults } from "@fitness/shared";
import { Copy, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { NumberStepper } from "@/components/NumberStepper.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { api } from "@/lib/api.js";
import { formatDayLabel } from "@/lib/format.js";
import { useApi } from "@/lib/use-api.js";
import { EditSetDialog } from "./EditSetDialog.jsx";

/**
 * One exercise in the logger: logged sets, a "next set" row prefilled so the
 * usual action is a single tap on "Log set", and "Copy last session".
 */
export function ExerciseCard({
  workoutId,
  exercise,
  sets,
  onSetsAdded,
  onSetUpdated,
  onSetDeleted,
}) {
  const last = useApi(`/exercises/${exercise.id}/last-sets`, {
    query: { beforeWorkoutId: workoutId },
  });
  const lastSets = last.data?.sets ?? [];

  const [next, setNext] = useState(() => nextSetDefaults(sets, lastSets));
  // Re-prefill after each logged/deleted set and once last session arrives.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only on count change or history load
  useEffect(() => {
    setNext(nextSetDefaults(sets, lastSets));
  }, [sets.length, last.data]);

  const [pending, setPending] = useState(null); // "log" | "copy"
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);

  async function run(kind, request) {
    setPending(kind);
    setError(null);
    try {
      onSetsAdded(exercise, await request());
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(null);
    }
  }

  const logSet = () =>
    run("log", async () => [
      await api(`/workouts/${workoutId}/sets`, {
        method: "POST",
        body: { exerciseId: exercise.id, ...next },
      }),
    ]);

  const copyLast = () =>
    run("copy", () =>
      api(`/workouts/${workoutId}/copy-last`, {
        method: "POST",
        body: { exerciseId: exercise.id },
      }),
    );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{exercise.name}</CardTitle>
        <Button asChild variant="ghost" size="icon-lg">
          <Link to={`/exercises/${exercise.id}`} aria-label={`${exercise.name} progress`}>
            <TrendingUp />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3">
        {lastSets.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Last time ({formatDayLabel(last.data.workout.logDate)}):{" "}
            {lastSets.map(formatSet).join(" · ")}
          </p>
        )}

        {sets.length > 0 && (
          <ol className="divide-y rounded-lg border">
            {sets.map((set, i) => (
              <li key={set.id}>
                <button
                  type="button"
                  onClick={() => setEditing({ set, position: i + 1 })}
                  className="flex h-12 w-full items-center gap-3 px-3 text-left tabular-nums hover:bg-muted"
                >
                  <span className="w-6 text-sm text-muted-foreground">{i + 1}</span>
                  <span className="flex-1 font-medium">
                    {formatSet(set)}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      kg × reps
                    </span>
                  </span>
                  {set.rpe !== null && (
                    <span className="text-xs text-muted-foreground">RPE {set.rpe}</span>
                  )}
                </button>
              </li>
            ))}
          </ol>
        )}

        {sets.length === 0 && lastSets.length > 0 && (
          <Button
            variant="secondary"
            className="h-12 text-base"
            onClick={copyLast}
            disabled={pending !== null}
          >
            <Copy />{" "}
            {pending === "copy" ? "Copying…" : `Copy last session (${lastSets.length} sets)`}
          </Button>
        )}

        <div className="grid gap-2">
          <NumberStepper
            label="Weight"
            unit="kg"
            value={next.weightKg}
            onChange={(weightKg) => setNext((n) => ({ ...n, weightKg }))}
            step={2.5}
            min={0}
            max={1000}
          />
          <NumberStepper
            label="Reps"
            value={next.reps}
            onChange={(reps) => setNext((n) => ({ ...n, reps }))}
            step={1}
            min={0}
            max={200}
          />
        </div>
        <Button className="h-14 text-base" onClick={logSet} disabled={pending !== null}>
          {pending === "log" ? "Saving…" : `Log set ${sets.length + 1}`}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>

      <EditSetDialog
        workoutId={workoutId}
        set={editing?.set ?? null}
        position={editing?.position}
        exerciseName={exercise.name}
        onClose={() => setEditing(null)}
        onUpdated={onSetUpdated}
        onDeleted={onSetDeleted}
      />
    </Card>
  );
}
