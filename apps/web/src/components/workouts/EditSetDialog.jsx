import { useEffect, useState } from "react";
import { NumberStepper } from "@/components/NumberStepper.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import { api } from "@/lib/api.js";
import { cn } from "@/lib/utils.js";

const RPE_OPTIONS = [6, 7, 7.5, 8, 8.5, 9, 9.5, 10];

/** Edit weight/reps/RPE of a logged set, or delete it. `set` null = closed. */
export function EditSetDialog({
  workoutId,
  set,
  position,
  exerciseName,
  onClose,
  onUpdated,
  onDeleted,
}) {
  const [weightKg, setWeightKg] = useState(0);
  const [reps, setReps] = useState(0);
  const [rpe, setRpe] = useState(null);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (set) {
      setWeightKg(set.weightKg);
      setReps(set.reps);
      setRpe(set.rpe);
      setError(null);
    }
  }, [set]);

  async function run(kind, request, then) {
    setPending(kind);
    setError(null);
    try {
      then(await request());
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(null);
    }
  }

  const path = set ? `/workouts/${workoutId}/sets/${set.id}` : "";

  return (
    <Dialog open={set !== null} onOpenChange={(open) => !open && onClose()}>
      {set && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {exerciseName} · Set {position}
            </DialogTitle>
            <DialogDescription>Weight is in kg.</DialogDescription>
          </DialogHeader>
          <NumberStepper
            label="Weight"
            unit="kg"
            value={weightKg}
            onChange={setWeightKg}
            step={2.5}
            min={0}
            max={1000}
          />
          <NumberStepper label="Reps" value={reps} onChange={setReps} step={1} min={0} max={200} />
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">RPE (optional)</legend>
            <div className="flex flex-wrap gap-1.5">
              {RPE_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={rpe === value}
                  onClick={() => setRpe(rpe === value ? null : value)}
                  className={cn(
                    "h-10 min-w-10 rounded-lg border px-2 text-sm tabular-nums",
                    rpe === value && "border-foreground bg-foreground text-background",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </fieldset>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter className="grid grid-cols-2 gap-2">
            <Button
              variant="destructive"
              className="h-11"
              disabled={pending !== null}
              onClick={() =>
                run(
                  "delete",
                  () => api(path, { method: "DELETE" }),
                  () => onDeleted(set.id),
                )
              }
            >
              {pending === "delete" ? "Deleting…" : "Delete"}
            </Button>
            <Button
              className="h-11"
              disabled={pending !== null}
              onClick={() =>
                run(
                  "save",
                  () => api(path, { method: "PATCH", body: { weightKg, reps, rpe } }),
                  onUpdated,
                )
              }
            >
              {pending === "save" ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
