import { describe, expect, it } from "@jest/globals";
import { createExercise, createUser } from "../../test/factories.js";
import {
  addSet,
  copyLastSession,
  createWorkout,
  deleteSet,
  deleteWorkout,
  getLastSession,
  getMuscleSets,
  getWorkoutDetail,
  listWorkouts,
  updateSet,
  updateWorkout,
} from "./workouts.service.js";

const weights = (userId, logDate = "2026-10-06") => createWorkout(userId, { logDate });

async function setup() {
  const me = await createUser();
  const squat = await createExercise(null, { name: "Squat", muscleGroup: "quads" });
  const bench = await createExercise(null, { name: "Bench", muscleGroup: "chest" });
  return { me, squat, bench };
}

const brief = (sets) => sets.map((s) => [s.setNo, s.weightKg, s.reps]);

describe("workouts", () => {
  it("lists only the user's workouts, newest first, with counts", async () => {
    const { me, squat, bench } = await setup();
    const other = await createUser();
    const older = await weights(me.id, "2026-10-01");
    const newer = await weights(me.id, "2026-10-05");
    await createWorkout(me.id, { logDate: "2026-10-03", durationMin: 60 });
    await weights(other.id, "2026-10-06");

    await addSet(me.id, older.id, { exerciseId: squat.id, weightKg: 60, reps: 5 });
    await addSet(me.id, older.id, { exerciseId: squat.id, weightKg: 60, reps: 5 });
    await addSet(me.id, older.id, { exerciseId: bench.id, weightKg: 40, reps: 8 });

    const list = await listWorkouts(me.id, { limit: 30 });
    expect(list.map((w) => [w.logDate, w.durationMin])).toEqual([
      ["2026-10-05", null],
      ["2026-10-03", 60],
      ["2026-10-01", null],
    ]);
    expect(list[0]).toMatchObject({ id: newer.id, setCount: 0, exerciseCount: 0 });
    expect(list[2]).toMatchObject({ setCount: 3, exerciseCount: 2 });
  });

  it("returns detail grouped by exercise in the order they were started", async () => {
    const { me, squat, bench } = await setup();
    const w = await weights(me.id);
    await addSet(me.id, w.id, { exerciseId: bench.id, weightKg: 40, reps: 8 });
    await addSet(me.id, w.id, { exerciseId: squat.id, weightKg: 60, reps: 5 });
    await addSet(me.id, w.id, { exerciseId: bench.id, weightKg: 42.5, reps: 6, rpe: 8.5 });

    const detail = await getWorkoutDetail(me.id, w.id);
    expect(detail.exercises.map((e) => e.exercise.name)).toEqual(["Bench", "Squat"]);
    expect(brief(detail.exercises[0].sets)).toEqual([
      [1, 40, 8],
      [2, 42.5, 6],
    ]);
    expect(detail.exercises[0].sets[1].rpe).toBe(8.5);
  });

  it("hides other users' workouts and lets the owner edit/delete", async () => {
    const { me, squat } = await setup();
    const other = await createUser();
    const w = await weights(me.id);
    await addSet(me.id, w.id, { exerciseId: squat.id, weightKg: 60, reps: 5 });

    await expect(getWorkoutDetail(other.id, w.id)).rejects.toMatchObject({ status: 404 });
    await expect(updateWorkout(other.id, w.id, { note: "hacked" })).rejects.toMatchObject({
      status: 404,
    });
    await expect(deleteWorkout(other.id, w.id)).rejects.toMatchObject({ status: 404 });

    expect((await updateWorkout(me.id, w.id, { durationMin: 75, note: "Felt strong" })).note).toBe(
      "Felt strong",
    );
    await deleteWorkout(me.id, w.id);
    await expect(getWorkoutDetail(me.id, w.id)).rejects.toMatchObject({ status: 404 });
  });
});

describe("sets", () => {
  it("numbers sets per exercise", async () => {
    const { me, squat, bench } = await setup();
    const w = await weights(me.id);
    const a = await addSet(me.id, w.id, { exerciseId: squat.id, weightKg: 60, reps: 5 });
    const b = await addSet(me.id, w.id, { exerciseId: bench.id, weightKg: 40, reps: 8 });
    const c = await addSet(me.id, w.id, { exerciseId: squat.id, weightKg: 65, reps: 5 });
    expect([a.setNo, b.setNo, c.setNo]).toEqual([1, 1, 2]);
  });

  it("gives unique numbers even when sets are logged at the same moment", async () => {
    const { me, squat } = await setup();
    const w = await weights(me.id);
    const sets = await Promise.all(
      [1, 2, 3, 4].map(() => addSet(me.id, w.id, { exerciseId: squat.id, weightKg: 60, reps: 5 })),
    );
    expect(sets.map((s) => s.setNo).sort()).toEqual([1, 2, 3, 4]);
  });

  it("rejects other users' workouts and custom exercises", async () => {
    const { me, squat } = await setup();
    const other = await createUser();
    const theirWorkout = await weights(other.id);
    const theirExercise = await createExercise(other.id);
    const mine = await weights(me.id);

    await expect(
      addSet(me.id, theirWorkout.id, { exerciseId: squat.id, weightKg: 60, reps: 5 }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      addSet(me.id, mine.id, { exerciseId: theirExercise.id, weightKg: 60, reps: 5 }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("updates and deletes sets, but only through their own workout", async () => {
    const { me, squat } = await setup();
    const w1 = await weights(me.id);
    const w2 = await weights(me.id);
    const set = await addSet(me.id, w1.id, { exerciseId: squat.id, weightKg: 60, reps: 5 });

    expect(await updateSet(me.id, w1.id, set.id, { reps: 6, rpe: 9 })).toMatchObject({
      reps: 6,
      rpe: 9,
    });
    // Right owner, wrong workout in the URL
    await expect(updateSet(me.id, w2.id, set.id, { reps: 1 })).rejects.toMatchObject({
      status: 404,
    });
    await expect(deleteSet(me.id, w2.id, set.id)).rejects.toMatchObject({ status: 404 });

    await deleteSet(me.id, w1.id, set.id);
    expect((await getWorkoutDetail(me.id, w1.id)).exercises).toEqual([]);
  });
});

describe("last session", () => {
  it("finds the most recent earlier workout with that exercise", async () => {
    const { me, squat, bench } = await setup();
    const other = await createUser();

    const old = await weights(me.id, "2026-09-28");
    await addSet(me.id, old.id, { exerciseId: squat.id, weightKg: 55, reps: 5 });
    const last = await weights(me.id, "2026-10-02");
    await addSet(me.id, last.id, { exerciseId: squat.id, weightKg: 60, reps: 5 });
    await addSet(me.id, last.id, { exerciseId: squat.id, weightKg: 62.5, reps: 3 });
    const benchOnly = await weights(me.id, "2026-10-04"); // newer, but no squat
    await addSet(me.id, benchOnly.id, { exerciseId: bench.id, weightKg: 40, reps: 8 });
    const theirs = await weights(other.id, "2026-10-05"); // newer, but not mine
    await addSet(other.id, theirs.id, { exerciseId: squat.id, weightKg: 200, reps: 1 });

    const today = await weights(me.id, "2026-10-06");
    await addSet(me.id, today.id, { exerciseId: squat.id, weightKg: 65, reps: 5 }); // current session

    const result = await getLastSession(me.id, squat.id, { beforeWorkoutId: today.id });
    expect(result.workout).toEqual({ id: last.id, logDate: "2026-10-02" });
    expect(brief(result.sets)).toEqual([
      [1, 60, 5],
      [2, 62.5, 3],
    ]);
  });

  it("ignores workouts dated after the one being logged", async () => {
    const { me, squat } = await setup();
    const future = await weights(me.id, "2026-10-10");
    await addSet(me.id, future.id, { exerciseId: squat.id, weightKg: 100, reps: 1 });
    const backdated = await weights(me.id, "2026-10-01");

    expect(
      (await getLastSession(me.id, squat.id, { beforeWorkoutId: backdated.id })).workout,
    ).toBeNull();
  });

  it("copies the previous session's sets after any existing ones", async () => {
    const { me, squat } = await setup();
    const last = await weights(me.id, "2026-10-02");
    await addSet(me.id, last.id, { exerciseId: squat.id, weightKg: 60, reps: 5, rpe: 7 });
    await addSet(me.id, last.id, { exerciseId: squat.id, weightKg: 62.5, reps: 3, rpe: 9 });

    const today = await weights(me.id, "2026-10-06");
    await addSet(me.id, today.id, { exerciseId: squat.id, weightKg: 20, reps: 10 }); // warm-up

    const copied = await copyLastSession(me.id, today.id, squat.id);
    expect(brief(copied)).toEqual([
      [2, 60, 5],
      [3, 62.5, 3],
    ]);
    expect(copied.map((s) => s.rpe)).toEqual([7, 9]);

    const detail = await getWorkoutDetail(me.id, today.id);
    expect(brief(detail.exercises[0].sets)).toEqual([
      [1, 20, 10],
      [2, 60, 5],
      [3, 62.5, 3],
    ]);
  });

  it("says so when there is nothing to copy", async () => {
    const { me, squat } = await setup();
    const today = await weights(me.id);
    await expect(copyLastSession(me.id, today.id, squat.id)).rejects.toMatchObject({
      status: 404,
      code: "NO_PREVIOUS_SESSION",
    });
  });
});

describe("muscle sets", () => {
  const sets = (list) => Object.fromEntries(list.map((r) => [r.muscle, r.sets]));

  it("counts own sets in the range, secondary muscles at half", async () => {
    const me = await createUser();
    const other = await createUser();
    const bench = await createExercise(null, {
      name: "Bench",
      muscleGroup: "chest",
      secondaryMuscles: ["triceps", "shoulders"],
    });
    const pushdown = await createExercise(null, { name: "Pushdown", muscleGroup: "triceps" });

    const before = await weights(me.id, "2026-09-30");
    const first = await weights(me.id, "2026-10-01");
    const last = await weights(me.id, "2026-10-07");
    const after = await weights(me.id, "2026-10-08");
    const theirs = await weights(other.id, "2026-10-03");
    for (const w of [before, after]) {
      await addSet(me.id, w.id, { exerciseId: bench.id, weightKg: 60, reps: 8 });
    }
    await addSet(other.id, theirs.id, { exerciseId: bench.id, weightKg: 60, reps: 8 });
    await addSet(me.id, first.id, { exerciseId: bench.id, weightKg: 60, reps: 8 });
    await addSet(me.id, first.id, { exerciseId: bench.id, weightKg: 60, reps: 8 });
    await addSet(me.id, last.id, { exerciseId: bench.id, weightKg: 60, reps: 8 });
    await addSet(me.id, last.id, { exerciseId: pushdown.id, weightKg: 20, reps: 12 });
    await addSet(me.id, last.id, { exerciseId: pushdown.id, weightKg: 20, reps: 0 }); // failed

    const result = sets(await getMuscleSets(me.id, { from: "2026-10-01", to: "2026-10-07" }));
    expect(result.chest).toBe(3);
    expect(result.triceps).toBe(2.5);
    expect(result.shoulders).toBe(1.5);
    expect(result.quads).toBe(0);
  });
});
