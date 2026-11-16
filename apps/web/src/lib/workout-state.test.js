import { describe, expect, it } from "@jest/globals";
import { addSets, removeSet, replaceSet, withPendingExercises } from "./workout-state.js";

const squat = { id: "squat", name: "Squat" };
const bench = { id: "bench", name: "Bench" };
const set = (id, exerciseId, reps = 5) => ({ id, exerciseId, reps });

const detail = {
  id: "w1",
  exercises: [{ exercise: squat, sets: [set("s1", "squat")] }],
};

describe("workout state", () => {
  it("adds sets to an existing exercise or creates a new group", () => {
    const a = addSets(detail, squat, [set("s2", "squat")]);
    expect(a.exercises[0].sets.map((s) => s.id)).toEqual(["s1", "s2"]);

    const b = addSets(detail, bench, [set("b1", "bench")]);
    expect(b.exercises.map((g) => g.exercise.id)).toEqual(["squat", "bench"]);
    expect(detail.exercises).toHaveLength(1); // not mutated
  });

  it("replaces a set by id", () => {
    const updated = replaceSet(detail, set("s1", "squat", 8));
    expect(updated.exercises[0].sets[0].reps).toBe(8);
  });

  it("removes a set and drops empty exercises", () => {
    expect(removeSet(detail, "s1").exercises).toEqual([]);
  });

  it("appends pending exercises that have no sets yet, without duplicates", () => {
    const list = withPendingExercises(detail, [squat, bench]);
    expect(list.map((g) => [g.exercise.id, g.sets.length])).toEqual([
      ["squat", 1],
      ["bench", 0],
    ]);
  });
});
