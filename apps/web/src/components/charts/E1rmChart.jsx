import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDayLabel } from "@/lib/format.js";
import { ChartTooltip } from "./ChartTooltip.jsx";
import {
  axisProps,
  dateToTs,
  evenTicks,
  formatTick,
  niceTicks,
  paddedDomain,
} from "./chart-utils.js";

const SERIES = { label: "e1RM", kind: "line", color: "var(--viz-series-1)" };

function TooltipContent({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <ChartTooltip
      title={formatDayLabel(p.logDate)}
      rows={[{ ...SERIES, value: `${p.e1rmKg} kg`, label: `from ${p.weightKg} × ${p.reps}` }]}
    />
  );
}

/** Label only the best point (the PR) — never every point. */
function PrLabel({ x, y, index, value, prIndex }) {
  if (index !== prIndex) return null;
  return (
    <text
      x={x}
      y={y}
      dy={-12}
      textAnchor="middle"
      fontSize={12}
      fill="var(--foreground)"
      fontWeight={600}
    >
      PR {value}
    </text>
  );
}

/** Single series (best estimated 1RM per training day): no legend box, the title names it. */
export function E1rmChart({ points }) {
  const data = points.map((p) => ({ ...p, ts: dateToTs(p.logDate) }));
  const prIndex = data.reduce((best, p, i) => (p.e1rmKg > data[best].e1rmKg ? i : best), 0);
  const xDomain = [data[0].ts, data.at(-1).ts];
  const y = niceTicks(
    paddedDomain(
      points.map((p) => p.e1rmKg),
      1,
      2.5,
    ),
    6,
  );

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 24, right: 16, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={xDomain}
            ticks={evenTicks(...xDomain, 4)}
            tickFormatter={formatTick}
            padding={{ left: 8, right: 8 }}
            {...axisProps}
          />
          <YAxis domain={y.domain} ticks={y.ticks} width={44} {...axisProps} axisLine={false} />
          <Tooltip
            content={<TooltipContent />}
            cursor={{ stroke: "var(--viz-axis)", strokeWidth: 1 }}
            isAnimationActive={false}
          />
          <Line
            dataKey="e1rmKg"
            stroke={SERIES.color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={{ r: 4, fill: SERIES.color, stroke: "var(--card)", strokeWidth: 2 }}
            activeDot={{ r: 5, fill: SERIES.color, stroke: "var(--card)", strokeWidth: 2 }}
            isAnimationActive={false}
            label={<PrLabel prIndex={prIndex} />}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
