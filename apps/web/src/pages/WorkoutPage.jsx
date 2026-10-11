import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button.jsx";
import { ExerciseCard } from "@/components/workouts/ExerciseCard.jsx";
import { ExercisePicker } from "@/components/workouts/ExercisePicker.jsx";
import { WorkoutDetailsForm } from "@/components/workouts/WorkoutDetailsForm.jsx";
import { api } from "@/lib/api.js";
import { formatDayLabel } from "@/lib/format.js";
import { useApi } from "@/lib/use-api.js";
import { addSets, removeSet, replaceSet, withPendingExercises } from "@/lib/workout-state.js";

export function WorkoutPage() {
  const { workoutId } = useParams();
  const navigate = useNavigate();
  const detail = useApi(`/workouts/${workoutId}`);
  const [pendingExercises, setPendingExercises] = useState([]);
  const [picking, setPicking] = useState(false);

  if (detail.error && !detail.data) {
    return (
      <div className="grid gap-3">
        <p className="text-destructive">{detail.error.message}</p>
        <Button asChild variant="outline">
          <Link to="/workouts">Back to workouts</Link>
        </Button>
      </div>
    );
  }
  if (!detail.data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const workout = detail.data;
  const groups = withPendingExercises(workout, pendingExercises);

  async function handleDelete() {
    if (!window.confirm("Delete this workout and all its sets?")) return;
    await api(`/workouts/${workout.id}`, { method: "DELETE" });
    navigate("/workouts", { replace: true });
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon-lg">
          <Link to="/workouts" aria-label="Back to workouts">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Workout</h1>
          <p className="text-sm text-muted-foreground">{formatDayLabel(workout.logDate)}</p>
        </div>
        <Button variant="ghost" size="icon-lg" onClick={handleDelete} aria-label="Delete workout">
          <Trash2 />
        </Button>
      </div>

      {groups.map(({ exercise, sets }) => (
        <ExerciseCard
          key={exercise.id}
          workoutId={workout.id}
          exercise={exercise}
          sets={sets}
          onSetsAdded={(ex, newSets) => detail.setData((d) => addSets(d, ex, newSets))}
          onSetUpdated={(set) => detail.setData((d) => replaceSet(d, set))}
          onSetDeleted={(setId) => detail.setData((d) => removeSet(d, setId))}
        />
      ))}
      <Button
        variant="outline"
        className="h-14 border-dashed text-base"
        onClick={() => setPicking(true)}
      >
        <Plus /> Add exercise
      </Button>
      <ExercisePicker
        open={picking}
        onOpenChange={setPicking}
        excludeIds={groups.map((g) => g.exercise.id)}
        onPick={(exercise) => setPendingExercises((list) => [...list, exercise])}
      />

      <section className="grid gap-2">
        <h2 className="font-semibold">Details</h2>
        <WorkoutDetailsForm
          key={workout.id}
          workout={workout}
          onSaved={(updated) => detail.setData((d) => ({ ...d, ...updated }))}
        />
      </section>
    </div>
  );
}
