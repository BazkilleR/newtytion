import { MUSCLE_GROUPS } from "../schemas/exercise.js";

/** A set counts in full for the exercise's primary muscle and half for each secondary one. */
export const SECONDARY_MUSCLE_WEIGHT = 0.5;

/** Weekly working sets per muscle where the heat level steps up. */
export const MUSCLE_HEAT_THRESHOLDS = { medium: 10, high: 20 };

/**
 * Sets per muscle from per-exercise set counts.
 * `rows`: [{ muscleGroup, secondaryMuscles, sets }]
 * Returns every muscle in display order (0 when untrained): [{ muscle, sets }]
 */
export function setsPerMuscle(rows) {
  const totals = new Map(MUSCLE_GROUPS.map((m) => [m, 0]));
  for (const { muscleGroup, secondaryMuscles = [], sets } of rows) {
    totals.set(muscleGroup, totals.get(muscleGroup) + sets);
    for (const m of secondaryMuscles) {
      totals.set(m, totals.get(m) + sets * SECONDARY_MUSCLE_WEIGHT);
    }
  }
  return [...totals].map(([muscle, sets]) => ({ muscle, sets }));
}

/** Sets done over `days` days, scaled to a 7-day week. */
export function setsPerWeek(sets, days) {
  return (sets * 7) / days;
}

/** "none" | "low" | "medium" | "high", from the weekly rate over a `days`-long range. */
export function heatLevel(sets, days) {
  if (sets <= 0) return "none";
  const weekly = setsPerWeek(sets, days);
  if (weekly >= MUSCLE_HEAT_THRESHOLDS.high) return "high";
  if (weekly >= MUSCLE_HEAT_THRESHOLDS.medium) return "medium";
  return "low";
}
