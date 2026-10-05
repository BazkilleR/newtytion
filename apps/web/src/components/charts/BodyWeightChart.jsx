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
import { ChartLegend, ChartTooltip } from "./ChartTooltip.jsx";
import {
  axisProps,
  dateToTs,
  evenTicks,
  formatTick,
  niceTicks,
  paddedDomain,
} from "./chart-utils.js";

const DAILY = { label: "Daily weigh-in", kind: "dot", color: "var(--viz-muted-mark)" };
const AVERAGE = { label: "7-day average", kind: "line", color: "var(--viz-series-1)" };

function TooltipContent({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <ChartTooltip
      title={formatDayLabel(p.logDate)}
      rows={[
        { ...DAILY, label: "weigh-in", value: `${p.weightKg.toFixed(1)} kg` },
        { ...AVERAGE, label: "7-day avg", value: `${p.avgKg.toFixed(1)} kg` },
      ]}
    />
  );
}

/** Direct label on the last point of the average line only (selective labeling). */
function EndLabel({ x, y, index, value, lastIndex }) {
  if (index !== lastIndex) return null;
  return (
    <text x={x + 8} y={y} dy={4} fontSize={12} fill="var(--foreground)" fontWeight={600}>
      {value.toFixed(1)}
    </text>
  );
}

/**
 * Daily weigh-ins as recessive gray dots, the 7-day average as the one
 * emphasised line. x is real time over the selected range, so gaps show.
 */
export function BodyWeightChart({ points, from, to }) {
  const data = points.map((p) => ({ ...p, ts: dateToTs(p.logDate) }));
  const xDomain = [dateToTs(from), dateToTs(to)];
  const y = niceTicks(paddedDomain(points.flatMap((p) => [p.weightKg, p.avgKg])));

  return (
    <div className="grid gap-2">
      <ChartLegend items={[AVERAGE, DAILY]} />
      <div className="h-64 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 44, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={xDomain}
              ticks={evenTicks(...xDomain, 4)}
              tickFormatter={formatTick}
              {...axisProps}
            />
            <YAxis domain={y.domain} ticks={y.ticks} width={44} {...axisProps} axisLine={false} />
            <Tooltip
              content={<TooltipContent />}
              cursor={{ stroke: "var(--viz-axis)", strokeWidth: 1 }}
              isAnimationActive={false}
            />
            {/* Dots only: transparent stroke, 8px markers with a 2px surface ring */}
            <Line
              dataKey="weightKg"
              stroke="transparent"
              isAnimationActive={false}
              dot={{ r: 4, fill: DAILY.color, stroke: "var(--card)", strokeWidth: 2 }}
              activeDot={{ r: 5, fill: DAILY.color, stroke: "var(--card)", strokeWidth: 2 }}
            />
            <Line
              dataKey="avgKg"
              type="monotone"
              stroke={AVERAGE.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={{ r: 4, fill: AVERAGE.color, stroke: "var(--card)", strokeWidth: 2 }}
              isAnimationActive={false}
              label={<EndLabel lastIndex={data.length - 1} />}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
