import { describe, expect, it } from "vitest";
import { createExercise, createUser } from "../../test/factories.js";
import { getExerciseHistory, listPerformedExercises } from "./exercises.service.js";
import { addSet, createWorkout } from "./workouts.service.js";

async function session(userId, logDate, exerciseId, sets) {
  const w = await createWorkout(userId, { logDate, activityType: "weights" });
  for (const [weightKg, reps] of sets) await addSet(userId, w.id, { exerciseId, weightKg, reps });
  return w;
}

describe("exercise history", () => {
  it("returns the best e1RM per day, oldest first, for this user only", async () => {
    const me = await createUser();
    const other = await createUser();
    const squat = await createExercise(null, { name: "Squat" });

    await session(me.id, "2026-10-02", squat.id, [
      [60, 5],
      [65, 3],
    ]);
    await session(me.id, "2026-09-28", squat.id, [[55, 5]]);
    await session(other.id, "2026-10-01", squat.id, [[200, 1]]);

    const { exercise, points } = await getExerciseHistory(me.id, squat.id);
    expect(exercise.name).toBe("Squat");
    expect(points).toEqual([
      { logDate: "2026-09-28", e1rmKg: 64.2, weightKg: 55, reps: 5 },
      { logDate: "2026-10-02", e1rmKg: 71.5, weightKg: 65, reps: 3 },
    ]);
  });

  it("404s for another user's custom exercise", async () => {
    const me = await createUser();
    const other = await createUser();
    const theirs = await createExercise(other.id);
    await expect(getExerciseHistory(me.id, theirs.id)).rejects.toMatchObject({ status: 404 });
  });

  it("lists performed exercises, most recently trained first", async () => {
    const me = await createUser();
    const squat = await createExercise(null, { name: "Squat" });
    const bench = await createExercise(null, { name: "Bench" });
    await createExercise(null, { name: "Never done" });

    await session(me.id, "2026-10-01", squat.id, [[60, 5]]);
    await session(me.id, "2026-10-04", squat.id, [[60, 5]]);
    await session(me.id, "2026-10-03", bench.id, [[40, 8]]);

    const list = await listPerformedExercises(me.id);
    expect(list.map((e) => [e.name, e.lastDate, e.sessionCount])).toEqual([
      ["Squat", "2026-10-04", 2],
      ["Bench", "2026-10-03", 1],
    ]);
  });
});
