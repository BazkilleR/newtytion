import { describe, expect, it } from "@jest/globals";
import { movingAverage } from "./moving-average.js";

const p = (logDate, weightKg) => ({ logDate, weightKg });
const avgs = (points) => points.map((x) => x.avgKg);

describe("movingAverage", () => {
  it("averages a trailing 7-day window", () => {
    const daily = Array.from({ length: 9 }, (_, i) => p(`2026-10-0${i + 1}`, 70 + i));
    // Day 7 averages 70..76 = 73; day 8 averages 71..77 = 74; day 9 = 75
    expect(avgs(movingAverage(daily)).slice(6)).toEqual([73, 74, 75]);
  });

  it("averages whatever is available at the start", () => {
    expect(avgs(movingAverage([p("2026-10-01", 70), p("2026-10-02", 71)]))).toEqual([70, 70.5]);
  });

  it("uses calendar days, so gaps don't stretch the window", () => {
    const points = [p("2026-10-01", 80), p("2026-10-02", 80), p("2026-10-10", 70)];
    // Oct 1-2 are more than 6 days before Oct 10 -> only Oct 10 counts
    expect(avgs(movingAverage(points))).toEqual([80, 80, 70]);
  });

  it("includes exactly 7 days: d-6 .. d", () => {
    const points = [p("2026-10-01", 80), p("2026-10-07", 70), p("2026-10-08", 70)];
    expect(avgs(movingAverage(points))).toEqual([80, 75, 70]);
  });

  it("sorts unsorted input and keeps original fields", () => {
    const result = movingAverage([p("2026-10-02", 72), p("2026-10-01", 70)]);
    expect(result).toEqual([
      { logDate: "2026-10-01", weightKg: 70, avgKg: 70 },
      { logDate: "2026-10-02", weightKg: 72, avgKg: 71 },
    ]);
  });

  it("handles empty input and a custom window", () => {
    expect(movingAverage([])).toEqual([]);
    expect(avgs(movingAverage([p("2026-10-01", 70), p("2026-10-02", 72)], 1))).toEqual([70, 72]);
  });
});
