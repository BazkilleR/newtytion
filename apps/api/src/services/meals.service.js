import { sumDailyTotals } from "@fitness/shared";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { foods, mealEntries } from "../db/schema/index.js";
import { notFound } from "../lib/errors.js";
import { findVisibleFood, toFood } from "./foods.service.js";
import { getGoals } from "./goals.service.js";

function toMealEntry({ entry, food }) {
  return {
    id: entry.id,
    logDate: entry.logDate,
    mealType: entry.mealType,
    quantity: entry.quantity,
    food: toFood(food),
  };
}

const entryWithFood = () =>
  db
    .select({ entry: mealEntries, food: foods })
    .from(mealEntries)
    .innerJoin(foods, eq(mealEntries.foodId, foods.id));

/** Everything the Today page needs in one request. */
export async function getDailyMeals(userId, date) {
  const rows = await entryWithFood()
    .where(and(eq(mealEntries.userId, userId), eq(mealEntries.logDate, date)))
    // Postgres sorts enums in declaration order: breakfast, lunch, dinner, snack
    .orderBy(asc(mealEntries.mealType), asc(mealEntries.createdAt));

  const entries = rows.map(toMealEntry);
  return {
    date,
    entries,
    totals: sumDailyTotals(entries),
    goals: await getGoals(userId),
  };
}

async function getMealEntry(userId, entryId) {
  const [row] = await entryWithFood().where(
    and(eq(mealEntries.id, entryId), eq(mealEntries.userId, userId)),
  );
  if (!row) throw notFound("Meal entry");
  return toMealEntry(row);
}

export async function createMealEntry(userId, input) {
  // Can't log another user's custom food, even by guessing its id.
  const food = await findVisibleFood(userId, input.foodId);
  if (!food) throw notFound("Food");

  const [entry] = await db
    .insert(mealEntries)
    .values({ ...input, userId })
    .returning();
  return toMealEntry({ entry, food });
}

export async function updateMealEntry(userId, entryId, input) {
  if (Object.keys(input).length > 0) {
    const updated = await db
      .update(mealEntries)
      .set(input)
      .where(and(eq(mealEntries.id, entryId), eq(mealEntries.userId, userId)))
      .returning({ id: mealEntries.id });
    if (updated.length === 0) throw notFound("Meal entry");
  }
  return getMealEntry(userId, entryId);
}

export async function deleteMealEntry(userId, entryId) {
  const deleted = await db
    .delete(mealEntries)
    .where(and(eq(mealEntries.id, entryId), eq(mealEntries.userId, userId)))
    .returning({ id: mealEntries.id });
  if (deleted.length === 0) throw notFound("Meal entry");
}
