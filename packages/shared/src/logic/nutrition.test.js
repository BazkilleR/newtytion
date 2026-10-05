import { describe, expect, it } from "vitest";
import {
  entryNutrition,
  groupByMealType,
  progress,
  suggestMealType,
  sumDailyTotals,
} from "./nutrition.js";

const kaprao = { kcal: 580, proteinG: 28, carbG: 65, fatG: 22 };
const egg = { kcal: 90, proteinG: 6.3, carbG: 0.4, fatG: 7 };

describe("entryNutrition", () => {
  it("scales per-serving values by quantity", () => {
    expect(entryNutrition(kaprao, 1.5)).toEqual({ kcal: 870, proteinG: 42, carbG: 97.5, fatG: 33 });
  });
});

describe("sumDailyTotals", () => {
  it("is all zeros for an empty day", () => {
    expect(sumDailyTotals([])).toEqual({ kcal: 0, proteinG: 0, carbG: 0, fatG: 0 });
  });

  it("adds up entries and rounds to one decimal", () => {
    const totals = sumDailyTotals([
      { food: kaprao, quantity: 1 },
      { food: egg, quantity: 2 },
    ]);
    expect(totals).toEqual({ kcal: 760, proteinG: 40.6, carbG: 65.8, fatG: 36 });
  });

  it("does not accumulate floating point noise", () => {
    const tenth = { kcal: 0.1, proteinG: 0.1, carbG: 0.1, fatG: 0.1 };
    const entries = Array.from({ length: 3 }, () => ({ food: tenth, quantity: 1 }));
    expect(sumDailyTotals(entries).kcal).toBe(0.3);
  });
});

describe("groupByMealType", () => {
  it("always returns every meal type in order", () => {
    const groups = groupByMealType([
      { id: "a", mealType: "dinner" },
      { id: "b", mealType: "breakfast" },
      { id: "c", mealType: "dinner" },
    ]);
    expect(Object.keys(groups)).toEqual(["breakfast", "lunch", "dinner", "snack"]);
    expect(groups.dinner.map((e) => e.id)).toEqual(["a", "c"]);
    expect(groups.lunch).toEqual([]);
  });
});

describe("progress", () => {
  it("reports percent and remaining", () => {
    expect(progress(1500, 2000)).toEqual({ percent: 75, remaining: 500, over: false });
  });

  it("caps percent at 100 and flags going over", () => {
    expect(progress(2500, 2000)).toEqual({ percent: 100, remaining: 0, over: true });
  });

  it("handles a missing or zero target", () => {
    expect(progress(100, 0)).toEqual({ percent: 0, remaining: 0, over: false });
  });
});

describe("suggestMealType", () => {
  // Bangkok is UTC+7
  const bkk = (hh) => new Date(`2026-10-06T${String((hh + 17) % 24).padStart(2, "0")}:30:00Z`);

  it.each([
    [7, "breakfast"],
    [12, "lunch"],
    [16, "snack"],
    [19, "dinner"],
    [23, "snack"],
  ])("%i:30 in Bangkok -> %s", (hour, expected) => {
    expect(suggestMealType(bkk(hour))).toBe(expected);
  });
});
