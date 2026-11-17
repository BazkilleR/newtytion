import { describe, expect, it } from "@jest/globals";
import { createUser, createExercise as insertExercise } from "../../test/factories.js";
import {
  createExercise,
  findVisibleExercise,
  getExerciseHistory,
  listExercises,
  toExercise,
} from "./exercises.service.js";

describe("exercises", () => {
  it("lists global + own exercises by muscle group then name, hiding others'", async () => {
    const me = await createUser();
    const other = await createUser();
    await insertExercise(null, { name: "Squat", muscleGroup: "quads" });
    await insertExercise(null, { name: "Bench Press", muscleGroup: "chest" });
    await insertExercise(null, { name: "Incline Press", muscleGroup: "chest" });
    await insertExercise(other.id, { name: "Their Curl", muscleGroup: "biceps" });
    await createExercise(me.id, {
      name: "My Sled Push",
      muscleGroup: "glutes",
      secondaryMuscles: ["quads", "calves"],
    });

    const list = await listExercises(me.id);
    expect(list.map((e) => e.name)).toEqual([
      "Bench Press",
      "Incline Press",
      "Squat",
      "My Sled Push",
    ]);
    expect(list.at(-1)).toMatchObject({ isCustom: true, secondaryMuscles: ["quads", "calves"] });
    expect(list[0].secondaryMuscles).toEqual([]);
  });
});

describe("createExercise", () => {
  it("creates a custom exercise, with no secondary muscles by default", async () => {
    const me = await createUser();
    const ex = await createExercise(me.id, { name: "Hip Thrust", muscleGroup: "glutes" });
    expect(ex).toEqual({
      id: expect.any(String),
      name: "Hip Thrust",
      muscleGroup: "glutes",
      secondaryMuscles: [],
      isCustom: true,
    });
  });
});

describe("findVisibleExercise", () => {
  it("finds global and own exercises, never another user's or a missing one", async () => {
    const me = await createUser();
    const other = await createUser();
    const global = await insertExercise(null);
    const mine = await insertExercise(me.id);
    const theirs = await insertExercise(other.id);

    expect((await findVisibleExercise(me.id, global.id)).id).toBe(global.id);
    expect((await findVisibleExercise(me.id, mine.id)).id).toBe(mine.id);
    expect(await findVisibleExercise(me.id, theirs.id)).toBeNull();
    expect(await findVisibleExercise(me.id, "00000000-0000-4000-8000-000000000000")).toBeNull();
  });
});

describe("toExercise", () => {
  it("hides user_id and exposes isCustom instead", () => {
    const row = { id: "x", name: "Row", muscleGroup: "lats", secondaryMuscles: [], userId: null };
    expect(toExercise(row)).toEqual({
      id: "x",
      name: "Row",
      muscleGroup: "lats",
      secondaryMuscles: [],
      isCustom: false,
    });
    expect(toExercise({ ...row, userId: "u1" }).isCustom).toBe(true);
  });
});

describe("getExerciseHistory", () => {
  it("returns no points for an exercise never trained", async () => {
    const me = await createUser();
    const ex = await insertExercise(null, { name: "Squat" });
    expect(await getExerciseHistory(me.id, ex.id)).toEqual({
      exercise: expect.objectContaining({ id: ex.id, name: "Squat" }),
      points: [],
    });
  });
});
