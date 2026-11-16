import { describe, expect, it } from "@jest/globals";
import { DEFAULT_GOALS, goalsSchema, suggestMacroTargets } from "./goal.js";

describe("suggestMacroTargets", () => {
  it("puts 25% of calories in fat and the rest after protein in carbs", () => {
    // fat: 2000 * 0.25 / 9 = 55.6 -> 56 g; carbs: (2000 - 480 - 504) / 4 = 254 g
    expect(suggestMacroTargets(2000, 120)).toEqual({ carbTargetG: 254, fatTargetG: 56 });
  });

  it("never suggests negative carbs", () => {
    expect(suggestMacroTargets(1000, 250).carbTargetG).toBe(0);
  });

  it("produces defaults that pass validation", () => {
    expect(goalsSchema.parse(DEFAULT_GOALS)).toEqual({
      kcalTarget: 2000,
      proteinTargetG: 120,
      carbTargetG: 254,
      fatTargetG: 56,
    });
  });
});
