/** "YYYY-MM-DD" -> UTC midnight ms, so the x-axis is real time (gaps stay gaps). */
export const dateToTs = (date) => Date.parse(`${date}T00:00:00Z`);

const tickFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
export const formatTick = (ts) => tickFormatter.format(new Date(ts));

const DAY = 86_400_000;

/** `count` evenly spaced day-aligned ticks across [min, max]. */
export function evenTicks(min, max, count = 4) {
  if (max <= min) return [min];
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => Math.round((min + step * i) / DAY) * DAY);
}

/** Y domain padded and snapped to `step`, so ticks are clean numbers. */
export function paddedDomain(values, step = 0.5, pad = 0.5) {
  if (values.length === 0) return [0, 1];
  const lo = Math.floor((Math.min(...values) - pad) / step) * step;
  const hi = Math.ceil((Math.max(...values) + pad) / step) * step;
  return [lo, hi];
}

const NICE_STEPS = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100];

/**
 * Round-number y ticks: the smallest 1-2-2.5-5 step that fits the domain in
 * at most `maxTicks` ticks, and the domain widened to whole steps.
 * Returns { domain, ticks }.
 */
export function niceTicks([lo, hi], maxTicks = 5) {
  // Count intervals after snapping outward to whole steps, not before.
  const span = (s) => Math.ceil(hi / s) - Math.floor(lo / s);
  const step = NICE_STEPS.find((s) => span(s) <= maxTicks - 1) ?? NICE_STEPS.at(-1);
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const ticks = [];
  for (let t = start; t <= end + step / 1000; t += step) ticks.push(Math.round(t * 100) / 100);
  return { domain: [ticks[0], ticks.at(-1)], ticks };
}

/** Shared axis/grid styling: recessive hairlines, muted tick text. */
export const axisProps = {
  axisLine: { stroke: "var(--viz-axis)" },
  tickLine: false,
  tick: { fill: "var(--viz-tick)", fontSize: 12 },
};
