import { describe, expect, it } from "vitest";
import { MUSCLE_GROUPS } from "../schemas/exercise.js";
import { heatLevel, setsPerMuscle, setsPerWeek } from "./muscle-volume.js";

const byMuscle = (list) => Object.fromEntries(list.map((r) => [r.muscle, r.sets]));

describe("setsPerMuscle", () => {
  it("returns every muscle in display order, zero when untrained", () => {
    const result = setsPerMuscle([]);
    expect(result.map((r) => r.muscle)).toEqual(MUSCLE_GROUPS);
    expect(result.every((r) => r.sets === 0)).toBe(true);
  });

  it("counts primary sets in full and secondary sets at half", () => {
    const totals = byMuscle(
      setsPerMuscle([
        { muscleGroup: "chest", secondaryMuscles: ["triceps", "shoulders"], sets: 4 },
        { muscleGroup: "triceps", secondaryMuscles: [], sets: 3 },
      ]),
    );
    expect(totals.chest).toBe(4);
    expect(totals.triceps).toBe(5);
    expect(totals.shoulders).toBe(2);
    expect(totals.quads).toBe(0);
  });

  it("adds up several exercises for the same muscle", () => {
    const totals = byMuscle(
      setsPerMuscle([
        { muscleGroup: "quads", secondaryMuscles: ["glutes"], sets: 5 },
        { muscleGroup: "quads", secondaryMuscles: [], sets: 3 },
      ]),
    );
    expect(totals.quads).toBe(8);
    expect(totals.glutes).toBe(2.5);
  });
});

describe("setsPerWeek", () => {
  it("scales to 7 days", () => {
    expect(setsPerWeek(10, 7)).toBe(10);
    expect(setsPerWeek(30, 30)).toBe(7);
    expect(setsPerWeek(20, 14)).toBe(10);
  });
});

describe("heatLevel", () => {
  it("is none without sets", () => {
    expect(heatLevel(0, 7)).toBe("none");
  });

  it("steps up at 10 and 20 sets per week", () => {
    expect(heatLevel(0.5, 7)).toBe("low");
    expect(heatLevel(9.5, 7)).toBe("low");
    expect(heatLevel(10, 7)).toBe("medium");
    expect(heatLevel(19.5, 7)).toBe("medium");
    expect(heatLevel(20, 7)).toBe("high");
  });

  it("uses the weekly rate for longer ranges", () => {
    // 20 sets over 30 days is under 5 per week
    expect(heatLevel(20, 30)).toBe("low");
    expect(heatLevel(20, 14)).toBe("medium");
    expect(heatLevel(90, 30)).toBe("high");
  });
});
