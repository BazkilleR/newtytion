// Pure updates for the workout detail returned by GET /workouts/:id, so the
// logger can apply server responses locally instead of refetching each time.

/** Append sets (all for `exercise`), creating the exercise group if needed. */
export function addSets(detail, exercise, newSets) {
  const exists = detail.exercises.some((g) => g.exercise.id === exercise.id);
  const exercises = exists
    ? detail.exercises.map((g) =>
        g.exercise.id === exercise.id ? { ...g, sets: [...g.sets, ...newSets] } : g,
      )
    : [...detail.exercises, { exercise, sets: newSets }];
  return { ...detail, exercises };
}

export function replaceSet(detail, updated) {
  return {
    ...detail,
    exercises: detail.exercises.map((g) => ({
      ...g,
      sets: g.sets.map((s) => (s.id === updated.id ? updated : s)),
    })),
  };
}

/** Remove a set; an exercise left with no sets disappears from the workout. */
export function removeSet(detail, setId) {
  return {
    ...detail,
    exercises: detail.exercises
      .map((g) => ({ ...g, sets: g.sets.filter((s) => s.id !== setId) }))
      .filter((g) => g.sets.length > 0),
  };
}

/**
 * Exercises shown in the logger: those with sets (from the server) followed by
 * ones the user just added that have no sets yet (local only until first set).
 */
export function withPendingExercises(detail, pending) {
  const logged = new Set(detail.exercises.map((g) => g.exercise.id));
  return [
    ...detail.exercises,
    ...pending.filter((e) => !logged.has(e.id)).map((exercise) => ({ exercise, sets: [] })),
  ];
}
