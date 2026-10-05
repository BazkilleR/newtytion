import { describe, expect, it } from "vitest";
import { DEFAULT_SET, formatSet, groupSetsByExercise, nextSetDefaults } from "./workout.js";

const s = (weightKg, reps, extra = {}) => ({ weightKg, reps, ...extra });

describe("nextSetDefaults", () => {
  it("repeats the last set logged today", () => {
    expect(nextSetDefaults([s(60, 8), s(62.5, 6)], [s(55, 10)])).toEqual(s(62.5, 6));
  });

  it("falls back to the first set of the previous session", () => {
    expect(nextSetDefaults([], [s(57.5, 8), s(57.5, 7)])).toEqual(s(57.5, 8));
  });

  it("uses the default with no history", () => {
    expect(nextSetDefaults([])).toEqual(DEFAULT_SET);
  });

  it("only returns weight and reps", () => {
    expect(nextSetDefaults([s(60, 8, { id: "x", rpe: 8 })])).toEqual(s(60, 8));
  });
});

describe("formatSet", () => {
  it("drops trailing zeros", () => {
    expect(formatSet(s(60, 8))).toBe("60 × 8");
    expect(formatSet(s(62.5, 5))).toBe("62.5 × 5");
    expect(formatSet(s(1.25, 12))).toBe("1.25 × 12");
  });
});

describe("groupSetsByExercise", () => {
  it("keeps first-seen exercise order and set order", () => {
    const sets = [
      { id: 1, exerciseId: "squat" },
      { id: 2, exerciseId: "bench" },
      { id: 3, exerciseId: "squat" },
    ];
    const groups = groupSetsByExercise(sets);
    expect([...groups.keys()]).toEqual(["squat", "bench"]);
    expect(groups.get("squat").map((x) => x.id)).toEqual([1, 3]);
  });
});
