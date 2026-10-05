/** What the "next set" inputs start at when nothing better is known. */
export const DEFAULT_SET = { weightKg: 20, reps: 8 };

/**
 * Prefill for the next set of an exercise, so logging is usually one tap:
 * 1. repeat the last set done today (the lifter's current working weight),
 * 2. otherwise start from the first set of the previous session,
 * 3. otherwise a sensible empty-bar default.
 */
export function nextSetDefaults(currentSets, lastSessionSets = []) {
  const source = currentSets.at(-1) ?? lastSessionSets[0] ?? DEFAULT_SET;
  return { weightKg: source.weightKg, reps: source.reps };
}

/** "60 × 8" — weight is in kg, trailing .0 dropped. */
export function formatSet({ weightKg, reps }) {
  return `${Number(weightKg.toFixed(2))} × ${reps}`;
}

/** Group a flat, ordered list of sets by exercise, keeping first-seen order. */
export function groupSetsByExercise(sets) {
  const groups = new Map();
  for (const set of sets) {
    if (!groups.has(set.exerciseId)) groups.set(set.exerciseId, []);
    groups.get(set.exerciseId).push(set);
  }
  return groups;
}
