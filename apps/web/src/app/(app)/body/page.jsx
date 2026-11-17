"use client";

import { addDays, todayIn } from "@fitness/shared";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { BodyWeightChart } from "@/components/charts/BodyWeightChart.jsx";
import { RangePicker } from "@/components/charts/RangePicker.jsx";
import { StatTile } from "@/components/charts/StatTile.jsx";
import { NumberStepper } from "@/components/NumberStepper.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { api } from "@/lib/api.js";
import { formatDayLabel } from "@/lib/format.js";
import { useApi } from "@/lib/use-api.js";

const RANGES = [
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 365, label: "1 year" },
];

const signed = (n) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n).toFixed(1)}`;

function LogWeightCard({ latest, onSaved }) {
  const today = todayIn();
  const [date, setDate] = useState(today);
  const [weightKg, setWeightKg] = useState(latest ?? 70);
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState(null); // null | "saving" | "saved" | Error
  // Prefill with the latest weigh-in once it loads, unless the user already changed it.
  useEffect(() => {
    if (!touched && latest !== undefined) setWeightKg(latest);
  }, [latest, touched]);

  async function save() {
    setStatus("saving");
    try {
      await api(`/body-logs/${date}`, { method: "PUT", body: { weightKg } });
      setStatus("saved");
      onSaved();
    } catch (err) {
      setStatus(err);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log weight</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <NumberStepper
          label="Weight"
          unit="kg"
          value={weightKg}
          onChange={(v) => {
            setTouched(true);
            setStatus(null);
            setWeightKg(v);
          }}
          step={0.1}
          min={20}
          max={400}
        />
        <div className="grid grid-cols-[1fr_auto] items-end gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="weigh-date">Date</Label>
            <Input
              id="weigh-date"
              type="date"
              max={today}
              className="h-11 text-base"
              value={date}
              onChange={(e) => {
                setStatus(null);
                setDate(e.target.value || today);
              }}
            />
          </div>
          <Button className="h-11 px-6" onClick={save} disabled={status === "saving"}>
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Save"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Saving again on the same day replaces that day's weight.
        </p>
        {status instanceof Error && <p className="text-sm text-destructive">{status.message}</p>}
      </CardContent>
    </Card>
  );
}

export default function BodyPage() {
  const [days, setDays] = useState(30);
  const today = todayIn();
  const from = addDays(today, -(days - 1));
  const logs = useApi("/body-logs", { query: { from, to: today } });
  const points = logs.data ?? [];
  const last = points.at(-1);
  // Average a week before the latest point, for the "vs last week" delta.
  const weekAgo = last && [...points].reverse().find((p) => p.logDate <= addDays(last.logDate, -7));

  async function remove(date) {
    if (!window.confirm(`Delete the weigh-in for ${formatDayLabel(date)}?`)) return;
    await api(`/body-logs/${date}`, { method: "DELETE" });
    logs.refetch();
  }

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-bold">Body weight</h1>

      <LogWeightCard latest={last?.weightKg} onSaved={logs.refetch} />

      <RangePicker options={RANGES} value={days} onChange={setDays} />

      {logs.error && <p className="text-sm text-destructive">{logs.error.message}</p>}
      {!logs.data && !logs.error && <p className="text-sm text-muted-foreground">Loading…</p>}

      {logs.data && points.length === 0 && (
        <p className="text-sm text-muted-foreground">No weigh-ins in this range yet.</p>
      )}

      {points.length > 0 && (
        // Refetch keeps the frame: dim the previous render instead of flashing a skeleton.
        <div className={logs.isLoading ? "grid gap-4 opacity-60 transition-opacity" : "grid gap-4"}>
          <div className="grid grid-cols-2 gap-2">
            <StatTile
              label="7-day average"
              value={last.avgKg.toFixed(1)}
              unit="kg"
              detail={
                weekAgo ? `${signed(last.avgKg - weekAgo.avgKg)} kg vs a week earlier` : undefined
              }
            />
            <StatTile
              label="Latest weigh-in"
              value={last.weightKg.toFixed(1)}
              unit="kg"
              detail={formatDayLabel(last.logDate)}
            />
          </div>

          <Card>
            <CardContent>
              <BodyWeightChart points={points} from={from} to={today} />
            </CardContent>
          </Card>

          {/* Table view: every value reachable without hovering the chart */}
          <details className="rounded-xl ring-1 ring-foreground/10">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
              Show as table
            </summary>
            <table className="w-full text-sm tabular-nums">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-normal">Date</th>
                  <th className="px-2 py-2 text-right font-normal">Weight</th>
                  <th className="px-2 py-2 text-right font-normal">7-day avg</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...points].reverse().map((p) => (
                  <tr key={p.logDate}>
                    <td className="px-4 py-1">{formatDayLabel(p.logDate)}</td>
                    <td className="px-2 py-1 text-right">{p.weightKg.toFixed(1)} kg</td>
                    <td className="px-2 py-1 text-right text-muted-foreground">
                      {p.avgKg.toFixed(1)} kg
                    </td>
                    <td className="pr-2 text-right">
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`Delete ${p.logDate}`}
                        onClick={() => remove(p.logDate)}
                      >
                        <Trash2 />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      )}
    </div>
  );
}
