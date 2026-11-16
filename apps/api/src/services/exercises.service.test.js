import { describe, expect, it } from "@jest/globals";
import { createUser, createExercise as insertExercise } from "../../test/factories.js";
import { createExercise, listExercises } from "./exercises.service.js";

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
