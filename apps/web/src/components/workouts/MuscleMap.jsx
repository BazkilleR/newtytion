import {
  heatLevel,
  MUSCLE_GROUP_LABELS,
  MUSCLE_HEAT_THRESHOLDS,
  setsPerWeek,
} from "@fitness/shared";
import { useState } from "react";
import { cn } from "@/lib/utils.js";
import { BACK, FRONT, HEAD, SILHOUETTE } from "./muscle-map-shapes.js";

const LEVELS = {
  high: { label: "A lot", range: `${MUSCLE_HEAT_THRESHOLDS.high}+` },
  medium: {
    label: "Medium",
    range: `${MUSCLE_HEAT_THRESHOLDS.medium}–${MUSCLE_HEAT_THRESHOLDS.high - 1}`,
  },
  low: { label: "Little", range: `1–${MUSCLE_HEAT_THRESHOLDS.medium - 1}` },
  none: { label: "None", range: "0" },
};

const fill = (level) => `var(--heat-${level})`;
const formatSets = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const MIRROR = "translate(100 0) scale(-1 1)";

function Figure({ muscles, x, stats, active, onActivate }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <g fill="var(--heat-body)">
        <ellipse {...HEAD} />
        {SILHOUETTE.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      {Object.entries(muscles).map(([muscle, d]) => {
        const { sets, level } = stats[muscle];
        const isActive = active === muscle;
        return (
          // biome-ignore lint/a11y/noStaticElementInteractions: the list below is the accessible view
          <g
            key={muscle}
            fill={fill(level)}
            stroke={isActive ? "var(--foreground)" : "var(--card)"}
            strokeWidth={isActive ? 1.2 : 0.8}
            strokeLinejoin="round"
            className="cursor-pointer"
            onPointerEnter={() => onActivate(muscle)}
            onClick={() => onActivate(muscle)}
          >
            <title>{`${MUSCLE_GROUP_LABELS[muscle]}: ${formatSets(sets)} sets`}</title>
            <path d={d} />
            <path d={d} transform={MIRROR} />
          </g>
        );
      })}
    </g>
  );
}

/**
 * Front/back body figures colored by weekly sets per muscle over the last
 * `days` days, plus a legend and a text list (color is never the only cue).
 * `data`: [{ muscle, sets }] from GET /workouts/muscle-sets.
 */
export function MuscleMap({ data, days }) {
  const [active, setActive] = useState(null);
  const stats = Object.fromEntries(
    data.map(({ muscle, sets }) => [
      muscle,
      { sets, perWeek: setsPerWeek(sets, days), level: heatLevel(sets, days) },
    ]),
  );
  const trained = data.filter((d) => d.sets > 0).sort((a, b) => b.sets - a.sets);
  const current = active && stats[active];

  return (
    <div className="grid gap-3">
      <p className="min-h-5 text-center text-sm" aria-live="polite">
        {current ? (
          <>
            <span className="font-medium">{MUSCLE_GROUP_LABELS[active]}</span>
            <span className="text-muted-foreground">
              {" "}
              · {formatSets(current.sets)} sets ·{" "}
              {formatSets(Math.round(current.perWeek * 10) / 10)}
              /week · {LEVELS[current.level].label}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">Tap a muscle for details</span>
        )}
      </p>

      <figure className="grid gap-1">
        <svg
          viewBox="0 0 210 206"
          role="img"
          aria-label="Muscles trained, front and back"
          className="mx-auto w-full max-w-xs"
          onPointerLeave={() => setActive(null)}
        >
          <Figure muscles={FRONT} x={0} stats={stats} active={active} onActivate={setActive} />
          <Figure muscles={BACK} x={110} stats={stats} active={active} onActivate={setActive} />
        </svg>
        <figcaption className="mx-auto grid w-full max-w-xs grid-cols-2 text-center text-xs text-muted-foreground">
          <span>Front</span>
          <span>Back</span>
        </figcaption>
      </figure>

      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {Object.entries(LEVELS).map(([level, { label, range }]) => (
          <li key={level} className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm" style={{ background: fill(level) }} />
            {label} <span className="tabular-nums">({range})</span>
          </li>
        ))}
        <li className="basis-full text-center">sets per week</li>
      </ul>

      {trained.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          No sets logged in this range yet.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border text-sm">
          {trained.map(({ muscle, sets }) => {
            const { perWeek, level } = stats[muscle];
            return (
              <li
                key={muscle}
                className={cn("flex items-center gap-2 px-3 py-2", active === muscle && "bg-muted")}
              >
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ background: fill(level) }}
                />
                <span className="font-medium">{MUSCLE_GROUP_LABELS[muscle]}</span>
                <span className="text-xs text-muted-foreground">{LEVELS[level].label}</span>
                <span className="ml-auto tabular-nums text-muted-foreground">
                  {formatSets(sets)} sets · {formatSets(Math.round(perWeek * 10) / 10)}/wk
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
