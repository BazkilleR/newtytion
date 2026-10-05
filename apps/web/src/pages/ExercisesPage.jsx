import { MUSCLE_GROUP_LABELS } from "@fitness/shared";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { formatDayLabel } from "@/lib/format.js";
import { useApi } from "@/lib/use-api.js";

/** Exercises the user has trained, most recent first, linking to their e1RM history. */
export function ExercisesPage() {
  const performed = useApi("/exercises/performed");

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-bold">Progress</h1>
      {performed.isLoading && !performed.data && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}
      {performed.error && <p className="text-sm text-destructive">{performed.error.message}</p>}
      {performed.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Log a weights workout and your exercises will show up here.
        </p>
      )}
      {performed.data?.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {performed.data.map((e) => (
            <li key={e.id}>
              <Link
                to={`/exercises/${e.id}`}
                className="flex min-h-14 items-center gap-3 px-3 py-2 hover:bg-muted"
              >
                <span className="flex-1">
                  <span className="block font-medium">{e.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {MUSCLE_GROUP_LABELS[e.muscleGroup]} · {e.sessionCount} session
                    {e.sessionCount === 1 ? "" : "s"} · last {formatDayLabel(e.lastDate)}
                  </span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
