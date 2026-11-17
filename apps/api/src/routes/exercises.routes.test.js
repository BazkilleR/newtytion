import { afterAll, beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { signUp } from "../../test/auth.js";
import { createExercise } from "../../test/factories.js";
import { client, listen } from "../../test/http.js";
import { createApp } from "../app.js";

let server;
let api;
let squat;

beforeAll(async () => {
  server = await listen(createApp());
});

afterAll(async () => {
  await server.close();
});

beforeEach(async () => {
  api = client(server.url, (await signUp(server.url)).cookie);
  squat = await createExercise(null, { name: "Squat", muscleGroup: "quads" });
});

const MISSING_ID = "00000000-0000-4000-8000-000000000000";

/** Log a workout on `logDate` with the given [weightKg, reps] sets of one exercise. */
async function session(as, logDate, exerciseId, sets) {
  const { body: workout } = await as.post("/api/workouts", { logDate });
  for (const [weightKg, reps] of sets) {
    await as.post(`/api/workouts/${workout.id}/sets`, { exerciseId, weightKg, reps });
  }
  return workout;
}

describe("GET /api/exercises", () => {
  it("lists global and own exercises", async () => {
    await api.post("/api/exercises", { name: "My Press", muscleGroup: "chest" });
    const res = await api.get("/api/exercises");
    expect(res.status).toBe(200);
    expect(res.body.map((e) => [e.name, e.isCustom])).toEqual([
      ["My Press", true],
      ["Squat", false],
    ]);
  });
});

describe("POST /api/exercises", () => {
  it("creates a custom exercise (201)", async () => {
    const res = await api.post("/api/exercises", {
      name: " Sled Push ",
      muscleGroup: "glutes",
      secondaryMuscles: ["quads", "calves"],
    });
    expect(res).toEqual({
      status: 201,
      body: {
        id: expect.any(String),
        name: "Sled Push",
        muscleGroup: "glutes",
        secondaryMuscles: ["quads", "calves"],
        isCustom: true,
      },
    });
  });

  it("validates muscles", async () => {
    for (const body of [
      { name: "X", muscleGroup: "neck" },
      { name: "X", muscleGroup: "chest", secondaryMuscles: ["chest"] },
      { name: "X", muscleGroup: "chest", secondaryMuscles: ["triceps", "triceps"] },
      { name: "", muscleGroup: "chest" },
    ]) {
      const res = await api.post("/api/exercises", body);
      expect([body, res.status]).toEqual([body, 400]);
    }
  });
});

describe("GET /api/exercises/performed", () => {
  it("is not mistaken for an id, and lists trained exercises", async () => {
    expect(await api.get("/api/exercises/performed")).toEqual({ status: 200, body: [] });

    await session(api, "2026-10-01", squat.id, [[60, 5]]);
    const res = await api.get("/api/exercises/performed");
    expect(res.body).toEqual([
      expect.objectContaining({ id: squat.id, lastDate: "2026-10-01", sessionCount: 1 }),
    ]);
  });
});

describe("GET /api/exercises/:id/history", () => {
  it("returns the best e1RM per day", async () => {
    await session(api, "2026-10-01", squat.id, [
      [60, 5],
      [100, 1],
    ]);
    const res = await api.get(`/api/exercises/${squat.id}/history`);
    expect(res.status).toBe(200);
    expect(res.body.exercise.name).toBe("Squat");
    expect(res.body.points).toEqual([
      { logDate: "2026-10-01", e1rmKg: 100, weightKg: 100, reps: 1 },
    ]);
  });

  it("404s for a missing or someone else's exercise, 400 for a bad id", async () => {
    const other = client(server.url, (await signUp(server.url)).cookie);
    const { body: theirs } = await other.post("/api/exercises", { name: "T", muscleGroup: "abs" });

    expect((await api.get(`/api/exercises/${theirs.id}/history`)).status).toBe(404);
    expect((await api.get(`/api/exercises/${MISSING_ID}/history`)).status).toBe(404);
    expect((await api.get("/api/exercises/abc/history")).status).toBe(400);
  });
});

describe("GET /api/exercises/:id/last-sets", () => {
  it("returns the latest session's sets, or only those before a given workout", async () => {
    const older = await session(api, "2026-10-01", squat.id, [[60, 5]]);
    const newer = await session(api, "2026-10-05", squat.id, [
      [65, 5],
      [65, 4],
    ]);

    const latest = await api.get(`/api/exercises/${squat.id}/last-sets`);
    expect(latest.status).toBe(200);
    expect(latest.body.workout).toEqual({ id: newer.id, logDate: "2026-10-05" });
    expect(latest.body.sets.map((s) => [s.setNo, s.weightKg, s.reps])).toEqual([
      [1, 65, 5],
      [2, 65, 4],
    ]);

    const before = await api.get(
      `/api/exercises/${squat.id}/last-sets?beforeWorkoutId=${newer.id}`,
    );
    expect(before.body.workout.id).toBe(older.id);
  });

  it("returns no workout when there is none", async () => {
    expect((await api.get(`/api/exercises/${squat.id}/last-sets`)).body).toEqual({
      workout: null,
      sets: [],
    });
  });

  it("validates beforeWorkoutId", async () => {
    expect(
      (await api.get(`/api/exercises/${squat.id}/last-sets?beforeWorkoutId=nope`)).status,
    ).toBe(400);
  });
});
