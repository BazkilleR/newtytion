import { addDays, suggestMacroTargets, todayIn } from "@fitness/shared";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { auth } from "../auth.js";
import { db } from "./client.js";
import {
  bodyLogs,
  exercises,
  foods,
  goals,
  mealEntries,
  user,
  workoutSets,
  workouts,
} from "./schema/index.js";

export const DEMO_EMAIL = "demo@example.com";
export const DEMO_PASSWORD = "demo-password";

/** Small deterministic PRNG so the demo data is the same on every run. */
function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const roundTo = (n, step) => Math.round(n / step) * step;

/**
 * Three sessions a week (Mon / Wed / Fri) with linear progression. Each lift
 * appears on one day only, so its e1RM history is one clean point per week.
 */
const WEEKLY_PLAN = [
  {
    dayOffset: 0,
    lifts: [
      { name: "Back Squat", startKg: 60, kgPerWeek: 2.5, reps: 5, sets: 3 },
      { name: "Barbell Bench Press", startKg: 40, kgPerWeek: 1.25, reps: 8, sets: 3 },
    ],
  },
  {
    dayOffset: 2,
    lifts: [
      { name: "Deadlift", startKg: 80, kgPerWeek: 5, reps: 5, sets: 1 },
      { name: "Barbell Row", startKg: 40, kgPerWeek: 1.25, reps: 8, sets: 3 },
    ],
  },
  {
    dayOffset: 4,
    lifts: [
      { name: "Front Squat", startKg: 45, kgPerWeek: 2.5, reps: 6, sets: 3 },
      { name: "Incline Dumbbell Press", startKg: 16, kgPerWeek: 1, reps: 10, sets: 3 },
    ],
  },
];

async function globalIdsByName(table, names) {
  const rows = await db
    .select({ id: table.id, name: table.name })
    .from(table)
    .where(and(isNull(table.userId), inArray(table.name, names)));
  const ids = Object.fromEntries(rows.map((r) => [r.name, r.id]));
  for (const n of names) if (!ids[n]) throw new Error(`Run the normal seed first: missing "${n}"`);
  return ids;
}

/**
 * (Re)create demo@example.com with ~4 months of weigh-ins, 12 weeks of
 * progressive training and today's meals. Re-running replaces the demo user.
 */
export async function seedDemo() {
  const rand = mulberry32(42);
  const today = todayIn();

  // Delete + recreate: cascades remove all previous demo data.
  await db.delete(user).where(eq(user.email, DEMO_EMAIL));
  const { user: demo } = await auth.api.signUpEmail({
    body: { email: DEMO_EMAIL, password: DEMO_PASSWORD, name: "Demo" },
  });

  await db.insert(goals).values({
    userId: demo.id,
    kcalTarget: 2300,
    proteinTargetG: 150,
    ...suggestMacroTargets(2300, 150),
  });

  // Body weight: slow cut from ~78 kg with daily noise, ~15% of days skipped.
  const logs = [];
  for (let i = 120; i >= 0; i--) {
    if (i > 0 && rand() < 0.15) continue;
    const trend = 78 - (120 - i) * 0.03;
    logs.push({
      userId: demo.id,
      logDate: addDays(today, -i),
      weightKg: roundTo(trend + (rand() - 0.5) * 1.2, 0.1),
    });
  }
  await db.insert(bodyLogs).values(logs);

  // Training: Mon/Wed/Fri-ish for 12 weeks with linear progression.
  const ex = await globalIdsByName(
    exercises,
    WEEKLY_PLAN.flatMap(({ lifts }) => lifts.map((l) => l.name)),
  );
  for (let week = 0; week < 12; week++) {
    for (const { dayOffset, lifts } of WEEKLY_PLAN) {
      const logDate = addDays(today, -(11 - week) * 7 - 6 + dayOffset);
      if (logDate > today) continue;
      const [w] = await db
        .insert(workouts)
        .values({
          userId: demo.id,
          logDate,
          activityType: "weights",
          durationMin: 55 + Math.round(rand() * 20),
        })
        .returning();
      const rows = [];
      for (const { name, startKg, kgPerWeek, reps, sets } of lifts) {
        const weightKg = roundTo(startKg + kgPerWeek * week, 1.25);
        for (let setNo = 1; setNo <= sets; setNo++) {
          // Occasionally miss a rep on the last set
          const r = setNo === sets && rand() < 0.3 ? reps - 1 : reps;
          rows.push({ workoutId: w.id, exerciseId: ex[name], setNo, weightKg, reps: r });
        }
      }
      await db.insert(workoutSets).values(rows);
    }
  }
  await db.insert(workouts).values({
    userId: demo.id,
    logDate: addDays(today, -1),
    activityType: "judo",
    durationMin: 90,
    note: "Randori",
  });

  // Today's meals
  const food = await globalIdsByName(foods, [
    "Rolled oats",
    "Whey protein",
    "กะเพราไก่ (Basil chicken with rice)",
    "ไข่ดาว (Fried egg)",
  ]);
  await db.insert(mealEntries).values([
    {
      userId: demo.id,
      logDate: today,
      mealType: "breakfast",
      foodId: food["Rolled oats"],
      quantity: 1.5,
    },
    {
      userId: demo.id,
      logDate: today,
      mealType: "breakfast",
      foodId: food["Whey protein"],
      quantity: 1,
    },
    {
      userId: demo.id,
      logDate: today,
      mealType: "lunch",
      foodId: food["กะเพราไก่ (Basil chicken with rice)"],
      quantity: 1,
    },
    {
      userId: demo.id,
      logDate: today,
      mealType: "lunch",
      foodId: food["ไข่ดาว (Fried egg)"],
      quantity: 1,
    },
  ]);

  console.log(`demo user: ${DEMO_EMAIL} / ${DEMO_PASSWORD} (${logs.length} weigh-ins)`);
}
