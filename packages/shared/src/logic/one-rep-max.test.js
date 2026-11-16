import { describe, expect, it } from "@jest/globals";
import { bestE1rmPerDay, epley1rm } from "./one-rep-max.js";

describe("epley1rm", () => {
  it.each([
    [100, 5, 116.7],
    [60, 10, 80],
    [62.5, 3, 68.8],
    [140, 1, 140], // a single is the 1RM
    [100, 0, 0],
    [0, 10, 0],
  ])("%d kg × %d -> %d", (w, r, expected) => {
    expect(epley1rm(w, r)).toBe(expected);
  });
});

describe("bestE1rmPerDay", () => {
  it("keeps the best set of each day, sorted by date", () => {
    const points = bestE1rmPerDay([
      { logDate: "2026-10-02", weightKg: 60, reps: 5 },
      { logDate: "2026-09-28", weightKg: 55, reps: 5 },
      { logDate: "2026-10-02", weightKg: 65, reps: 3 },
      { logDate: "2026-10-02", weightKg: 20, reps: 10 },
    ]);
    expect(points).toEqual([
      { logDate: "2026-09-28", e1rmKg: 64.2, weightKg: 55, reps: 5 },
      { logDate: "2026-10-02", e1rmKg: 71.5, weightKg: 65, reps: 3 },
    ]);
  });

  it("breaks ties in favour of the heavier set", () => {
    // 60 × 10 = 80 and 75 × 2 = 80
    const [p] = bestE1rmPerDay([
      { logDate: "2026-10-01", weightKg: 60, reps: 10 },
      { logDate: "2026-10-01", weightKg: 75, reps: 2 },
    ]);
    expect(p).toMatchObject({ weightKg: 75, reps: 2 });
  });

  it("ignores zero-rep sets and empty input", () => {
    expect(bestE1rmPerDay([{ logDate: "2026-10-01", weightKg: 100, reps: 0 }])).toEqual([]);
    expect(bestE1rmPerDay([])).toEqual([]);
  });
});
