import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router";
import { E1rmChart } from "@/components/charts/E1rmChart.jsx";
import { StatTile } from "@/components/charts/StatTile.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { formatDayLabel } from "@/lib/format.js";
import { useApi } from "@/lib/use-api.js";

export function ExerciseHistoryPage() {
  const { exerciseId } = useParams();
  const history = useApi(`/exercises/${exerciseId}/history`);
  const points = history.data?.points ?? [];
  const best = points.reduce((b, p) => (!b || p.e1rmKg > b.e1rmKg ? p : b), null);
  const latest = points.at(-1);

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon-lg">
          <Link to="/exercises" aria-label="Back to progress">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">{history.data?.exercise.name ?? "Exercise"}</h1>
      </div>

      {history.error && <p className="text-sm text-destructive">{history.error.message}</p>}
      {history.isLoading && !history.data && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}
      {history.data && points.length === 0 && (
        <p className="text-sm text-muted-foreground">No sets logged for this exercise yet.</p>
      )}

      {points.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <StatTile
              label="Best e1RM"
              value={best.e1rmKg}
              unit="kg"
              detail={`${best.weightKg} × ${best.reps} · ${formatDayLabel(best.logDate)}`}
            />
            <StatTile
              label="Latest e1RM"
              value={latest.e1rmKg}
              unit="kg"
              detail={`${latest.weightKg} × ${latest.reps} · ${formatDayLabel(latest.logDate)}`}
            />
          </div>

          {points.length >= 2 ? (
            <Card>
              <CardHeader>
                <CardTitle>Estimated 1RM per session</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Best set of each day, Epley: weight × (1 + reps ÷ 30). Less accurate above ~10
                  reps.
                </p>
              </CardHeader>
              <CardContent>
                <E1rmChart points={points} />
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground">Log one more session to see a trend.</p>
          )}

          <details className="rounded-xl ring-1 ring-foreground/10">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
              Show as table
            </summary>
            <table className="w-full text-sm tabular-nums">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-normal">Date</th>
                  <th className="px-2 py-2 text-right font-normal">Best set</th>
                  <th className="px-4 py-2 text-right font-normal">e1RM</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...points].reverse().map((p) => (
                  <tr key={p.logDate}>
                    <td className="px-4 py-2">{formatDayLabel(p.logDate)}</td>
                    <td className="px-2 py-2 text-right">
                      {p.weightKg} × {p.reps}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">{p.e1rmKg} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </div>
  );
}
