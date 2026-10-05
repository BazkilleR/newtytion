import { daysBetween } from "./date.js";

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Trailing calendar-window moving average.
 *
 * For each point on day d, averages every point whose date falls in
 * [d - (windowDays - 1), d]. The window is in *calendar days*, not "the last
 * 7 entries", so skipped weigh-ins don't stretch the window over two weeks.
 *
 * points: [{ logDate: "YYYY-MM-DD", weightKg }] in any order (one per day).
 * Returns the same points sorted by date, each with `avgKg`.
 */
/** The window used for body weight. */
export const WINDOW_DAYS = 7;

export function movingAverage(points, windowDays = WINDOW_DAYS) {
  const sorted = [...points].sort((a, b) => a.logDate.localeCompare(b.logDate));
  const result = [];
  let start = 0;
  let sum = 0;

  for (let i = 0; i < sorted.length; i++) {
    sum += sorted[i].weightKg;
    // Drop points that have fallen out of the window (two-pointer, O(n)).
    while (daysBetween(sorted[start].logDate, sorted[i].logDate) >= windowDays) {
      sum -= sorted[start].weightKg;
      start++;
    }
    result.push({ ...sorted[i], avgKg: round2(sum / (i - start + 1)) });
  }
  return result;
}
