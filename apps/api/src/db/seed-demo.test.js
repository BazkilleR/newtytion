import { todayIn } from "@fitness/shared";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { eq, inArray } from "drizzle-orm";
import { createUser } from "../../test/factories.js";
import { logIn } from "../services/auth.service.js";
import { getGoals } from "../services/goals.service.js";
import { getDailyMeals } from "../services/meals.service.js";
import { db } from "./client.js";
import { bodyLogs, user, workoutSets, workouts } from "./schema/index.js";
import { DEMO_EMAIL, DEMO_PASSWORD, seedDemo } from "./seed-demo.js";
import { seedGlobals } from "./seed-globals.js";

let consoleLog;
beforeEach(() => {
  consoleLog = jest.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  consoleLog.mockRestore();
});

/** Row counts of everything the demo user owns. */
async function demoSummary() {
  const [demo] = await db.select().from(user).where(eq(user.email, DEMO_EMAIL));
  const logs = await db.select().from(bodyLogs).where(eq(bodyLogs.userId, demo.id));
  const ws = await db.select().from(workouts).where(eq(workouts.userId, demo.id));
  const sets = ws.length
    ? await db
        .select()
        .from(workoutSets)
        .where(
          inArray(
            workoutSets.workoutId,
            ws.map((w) => w.id),
          ),
        )
    : [];
  return { demo, logs, workouts: ws, sets };
}

describe("seedDemo", () => {
  it("needs the global seed first", async () => {
    await expect(seedDemo()).rejects.toThrow("Run the normal seed first");
  });

  it("creates a demo account with goals, weigh-ins, workouts and today's meals", async () => {
    await seedGlobals();
    await seedDemo();
    const today = todayIn();

    const account = await logIn({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    expect(account.name).toBe("Demo");

    expect(await getGoals(account.id)).toMatchObject({ kcalTarget: 2300, proteinTargetG: 150 });

    const { logs, workouts: ws, sets } = await demoSummary();
    // 121 days back to today, ~15% skipped, today always logged
    expect(logs.length).toBeGreaterThan(80);
    expect(logs.length).toBeLessThanOrEqual(121);
    expect(logs.map((l) => l.logDate)).toContain(today);

    // 12 weeks x 3 sessions, minus any that would land after today
    expect(ws.length).toBeGreaterThanOrEqual(34);
    expect(ws.length).toBeLessThanOrEqual(36);
    expect(ws.every((w) => w.logDate <= today)).toBe(true);
    expect(sets.length).toBeGreaterThan(ws.length * 10);

    const meals = await getDailyMeals(account.id, today);
    expect(meals.entries.map((e) => e.mealType)).toEqual([
      "breakfast",
      "breakfast",
      "lunch",
      "lunch",
    ]);
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining(DEMO_EMAIL));
  });

  it("replaces the demo user on re-run with the same (deterministic) data", async () => {
    await seedGlobals();
    const someoneElse = await createUser();

    await seedDemo();
    const first = await demoSummary();
    await seedDemo();
    const second = await demoSummary();

    expect(second.demo.id).not.toBe(first.demo.id);
    expect(await db.select().from(user).where(eq(user.email, DEMO_EMAIL))).toHaveLength(1);
    const shape = (s) => ({
      logs: s.logs.map((l) => [l.logDate, l.weightKg]).sort(),
      workouts: s.workouts.map((w) => [w.logDate, w.durationMin]).sort(),
      sets: s.sets.length,
    });
    expect(shape(second)).toEqual(shape(first));

    // Other accounts are untouched
    expect(await db.select().from(user).where(eq(user.id, someoneElse.id))).toHaveLength(1);
  });
});
