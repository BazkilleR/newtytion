import { createExerciseInputSchema, createFoodInputSchema, MUSCLE_GROUPS } from "@fitness/shared";
import { describe, expect, it } from "@jest/globals";
import { seedExercises } from "./exercises.js";
import { seedFoods } from "./foods.js";

const duplicates = (names) => names.filter((n, i) => names.indexOf(n) !== i);

describe("seed foods", () => {
  it.each(seedFoods.map((f) => [f.name, f]))("%s is a valid food", (_name, food) => {
    // Strict equality: the schema must not trim or default anything away.
    expect(createFoodInputSchema.parse(food)).toEqual(food);
  });

  it("have unique names (global names are unique in the DB)", () => {
    expect(duplicates(seedFoods.map((f) => f.name))).toEqual([]);
  });
});

describe("seed exercises", () => {
  it.each(seedExercises.map((e) => [e.name, e]))("%s is a valid exercise", (_name, exercise) => {
    expect(createExerciseInputSchema.parse(exercise)).toEqual({
      secondaryMuscles: [],
      ...exercise,
    });
  });

  it("have unique names (global names are unique in the DB)", () => {
    expect(duplicates(seedExercises.map((e) => e.name))).toEqual([]);
  });

  it("train every muscle group as a primary muscle", () => {
    const primary = new Set(seedExercises.map((e) => e.muscleGroup));
    expect(MUSCLE_GROUPS.filter((m) => !primary.has(m))).toEqual([]);
  });
});
