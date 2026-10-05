import { describe, expect, it } from "vitest";
import { createUser, createExercise as insertExercise } from "../../test/factories.js";
import { createExercise, listExercises } from "./exercises.service.js";

describe("exercises", () => {
  it("lists global + own exercises by muscle group then name, hiding others'", async () => {
    const me = await createUser();
    const other = await createUser();
    await insertExercise(null, { name: "Squat", muscleGroup: "legs" });
    await insertExercise(null, { name: "Bench Press", muscleGroup: "chest" });
    await insertExercise(null, { name: "Incline Press", muscleGroup: "chest" });
    await insertExercise(other.id, { name: "Their Curl", muscleGroup: "arms" });
    await createExercise(me.id, { name: "My Sled Push", muscleGroup: "full_body" });

    const list = await listExercises(me.id);
    expect(list.map((e) => e.name)).toEqual([
      "Bench Press",
      "Incline Press",
      "Squat",
      "My Sled Push",
    ]);
    expect(list.at(-1).isCustom).toBe(true);
  });
});
