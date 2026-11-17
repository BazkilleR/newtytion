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
  squat = await createExercise(null, {
    name: "Squat",
    muscleGroup: "quads",
    secondaryMuscles: ["glutes"],
  });
});

const MISSING_ID = "00000000-0000-4000-8000-000000000000";
const newWorkout = async (logDate = "2026-10-06", extra = {}) =>
  (await api.post("/api/workouts", { logDate, ...extra })).body;
const addSet = async (workoutId, set) =>
  (await api.post(`/api/workouts/${workoutId}/sets`, { exerciseId: squat.id, ...set })).body;

describe("POST /api/workouts", () => {
  it("creates a workout (201)", async () => {
    const res = await api.post("/api/workouts", {
      logDate: "2026-10-06",
      durationMin: 60,
      note: "  Legs  ",
    });
    expect(res).toEqual({
      status: 201,
      body: {
        id: expect.any(String),
        logDate: "2026-10-06",
        durationMin: 60,
        note: "Legs",
        createdAt: expect.any(String),
      },
    });
  });

  it("validates the body", async () => {
    for (const body of [
      {},
      { logDate: "2026-13-01" },
      { logDate: "2026-10-06", durationMin: -5 },
      { logDate: "2026-10-06", durationMin: 1.5 },
    ]) {
      const res = await api.post("/api/workouts", body);
      expect([body, res.status]).toEqual([body, 400]);
    }
  });
});

describe("GET /api/workouts", () => {
  it("lists the user's workouts newest first with counts, up to `limit`", async () => {
    const older = await newWorkout("2026-10-01");
    await addSet(older.id, { weightKg: 60, reps: 5 });
    await newWorkout("2026-10-05");

    const res = await api.get("/api/workouts");
    expect(res.status).toBe(200);
    expect(res.body.map((w) => [w.logDate, w.setCount, w.exerciseCount])).toEqual([
      ["2026-10-05", 0, 0],
      ["2026-10-01", 1, 1],
    ]);
    expect((await api.get("/api/workouts?limit=1")).body).toHaveLength(1);
    expect((await api.get("/api/workouts?limit=0")).status).toBe(400);
  });
});

describe("GET /api/workouts/muscle-sets", () => {
  it("is not mistaken for an id, and counts sets per muscle", async () => {
    const w = await newWorkout("2026-10-06");
    await addSet(w.id, { weightKg: 60, reps: 5 });
    await addSet(w.id, { weightKg: 60, reps: 5 });

    const res = await api.get("/api/workouts/muscle-sets?from=2026-10-01&to=2026-10-07");
    expect(res.status).toBe(200);
    const sets = Object.fromEntries(res.body.map((r) => [r.muscle, r.sets]));
    expect(sets).toMatchObject({ quads: 2, glutes: 1, chest: 0 });
    expect(res.body).toHaveLength(13);
  });

  it("requires a valid range", async () => {
    expect((await api.get("/api/workouts/muscle-sets")).status).toBe(400);
    expect((await api.get("/api/workouts/muscle-sets?from=2026-10-07&to=2026-10-01")).status).toBe(
      400,
    );
  });
});

describe("GET / PATCH / DELETE /api/workouts/:id", () => {
  it("returns the detail with sets grouped by exercise", async () => {
    const w = await newWorkout();
    await addSet(w.id, { weightKg: 60, reps: 5 });
    await addSet(w.id, { weightKg: 65, reps: 3, rpe: 8.5 });

    const res = await api.get(`/api/workouts/${w.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: w.id, logDate: "2026-10-06" });
    expect(res.body.exercises).toHaveLength(1);
    expect(res.body.exercises[0].exercise.name).toBe("Squat");
    expect(res.body.exercises[0].sets.map((s) => [s.setNo, s.weightKg, s.reps, s.rpe])).toEqual([
      [1, 60, 5, null],
      [2, 65, 3, 8.5],
    ]);
  });

  it("updates and deletes the workout", async () => {
    const w = await newWorkout();
    const patched = await api.patch(`/api/workouts/${w.id}`, { note: "Felt strong" });
    expect(patched).toEqual({ status: 200, body: { ...w, note: "Felt strong" } });

    expect((await api.delete(`/api/workouts/${w.id}`)).status).toBe(204);
    expect((await api.get(`/api/workouts/${w.id}`)).status).toBe(404);
    expect((await api.delete(`/api/workouts/${w.id}`)).status).toBe(404);
  });

  it("hides other users' workouts", async () => {
    const w = await newWorkout();
    const other = client(server.url, (await signUp(server.url)).cookie);
    expect((await other.get(`/api/workouts/${w.id}`)).status).toBe(404);
    expect((await other.patch(`/api/workouts/${w.id}`, { note: "x" })).status).toBe(404);
    expect((await other.delete(`/api/workouts/${w.id}`)).status).toBe(404);
    expect((await api.get(`/api/workouts/${w.id}`)).status).toBe(200);
  });

  it("validates the id and patch body", async () => {
    expect((await api.get("/api/workouts/123")).status).toBe(400);
    const w = await newWorkout();
    expect((await api.patch(`/api/workouts/${w.id}`, { durationMin: "long" })).status).toBe(400);
  });
});

describe("/api/workouts/:id/sets", () => {
  it("adds sets (201) numbered per exercise", async () => {
    const w = await newWorkout();
    const res = await api.post(`/api/workouts/${w.id}/sets`, {
      exerciseId: squat.id,
      weightKg: 60,
      reps: 5,
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ workoutId: w.id, exerciseId: squat.id, setNo: 1 });
    expect((await addSet(w.id, { weightKg: 60, reps: 5 })).setNo).toBe(2);
  });

  it("validates the set", async () => {
    const w = await newWorkout();
    for (const set of [
      { weightKg: -1, reps: 5 },
      { weightKg: 60, reps: 2.5 },
      { weightKg: 60, reps: 5, rpe: 11 },
      { weightKg: 60, reps: 5, rpe: 7.3 },
    ]) {
      const res = await api.post(`/api/workouts/${w.id}/sets`, { exerciseId: squat.id, ...set });
      expect([set, res.status]).toEqual([set, 400]);
    }
  });

  it("404s for a missing workout or exercise", async () => {
    const w = await newWorkout();
    const set = { weightKg: 60, reps: 5 };
    expect(
      (await api.post(`/api/workouts/${MISSING_ID}/sets`, { exerciseId: squat.id, ...set })).status,
    ).toBe(404);
    expect(
      (await api.post(`/api/workouts/${w.id}/sets`, { exerciseId: MISSING_ID, ...set })).body.error
        .message,
    ).toBe("Exercise not found");
  });

  it("updates and deletes a set", async () => {
    const w = await newWorkout();
    const set = await addSet(w.id, { weightKg: 60, reps: 5 });
    const url = `/api/workouts/${w.id}/sets/${set.id}`;

    expect(await api.patch(url, { reps: 6, rpe: 9 })).toEqual({
      status: 200,
      body: { ...set, reps: 6, rpe: 9 },
    });
    expect((await api.patch(url, { rpe: null })).body.rpe).toBeNull();

    expect((await api.delete(url)).status).toBe(204);
    expect((await api.delete(url)).status).toBe(404);
    expect((await api.patch(url, { reps: 1 })).status).toBe(404);
  });

  it("only reaches a set through its own workout", async () => {
    const w1 = await newWorkout();
    const w2 = await newWorkout();
    const set = await addSet(w1.id, { weightKg: 60, reps: 5 });
    expect((await api.patch(`/api/workouts/${w2.id}/sets/${set.id}`, { reps: 1 })).status).toBe(
      404,
    );
    expect((await api.delete(`/api/workouts/${w2.id}/sets/${set.id}`)).status).toBe(404);
    expect((await api.delete(`/api/workouts/${w1.id}/sets/oops`)).status).toBe(400);
  });
});

describe("POST /api/workouts/:id/copy-last", () => {
  it("copies the previous session's sets (201)", async () => {
    const last = await newWorkout("2026-10-02");
    await addSet(last.id, { weightKg: 60, reps: 5, rpe: 7 });
    await addSet(last.id, { weightKg: 62.5, reps: 3 });
    const today = await newWorkout("2026-10-06");

    const res = await api.post(`/api/workouts/${today.id}/copy-last`, { exerciseId: squat.id });
    expect(res.status).toBe(201);
    expect(res.body.map((s) => [s.workoutId, s.setNo, s.weightKg, s.reps, s.rpe])).toEqual([
      [today.id, 1, 60, 5, 7],
      [today.id, 2, 62.5, 3, null],
    ]);
  });

  it("answers 404 NO_PREVIOUS_SESSION when there is nothing to copy", async () => {
    const today = await newWorkout();
    const res = await api.post(`/api/workouts/${today.id}/copy-last`, { exerciseId: squat.id });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NO_PREVIOUS_SESSION");
  });

  it("validates the body", async () => {
    const today = await newWorkout();
    expect((await api.post(`/api/workouts/${today.id}/copy-last`, {})).status).toBe(400);
  });
});
