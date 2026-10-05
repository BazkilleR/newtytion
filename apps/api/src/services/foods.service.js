import { and, asc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { foods } from "../db/schema/index.js";
import { PG_FOREIGN_KEY_VIOLATION, pgErrorCode } from "../lib/db-errors.js";
import { conflict, forbidden, notFound } from "../lib/errors.js";

/** A user can see global foods and their own — never other users' custom foods. */
const visibleTo = (userId) => or(isNull(foods.userId), eq(foods.userId, userId));

/** Escape LIKE wildcards so searching for "%" or "_" matches them literally. */
const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** DB row -> API shape. Hides user_id; exposes whether it's the user's own. */
export function toFood(row) {
  return {
    id: row.id,
    name: row.name,
    kcal: row.kcal,
    proteinG: row.proteinG,
    carbG: row.carbG,
    fatG: row.fatG,
    servingSize: row.servingSize,
    servingUnit: row.servingUnit,
    isCustom: row.userId !== null,
  };
}

export async function searchFoods(userId, { q, limit }) {
  const conditions = [visibleTo(userId)];
  if (q) conditions.push(ilike(foods.name, `%${escapeLike(q)}%`));

  const rows = await db
    .select()
    .from(foods)
    .where(and(...conditions))
    // The user's own foods first (false sorts before true), then alphabetical
    .orderBy(sql`${foods.userId} is null`, asc(foods.name))
    .limit(limit);

  return rows.map(toFood);
}

/** Raw row of a food the user is allowed to see, or null. */
export async function findVisibleFood(userId, foodId) {
  const [row] = await db
    .select()
    .from(foods)
    .where(and(eq(foods.id, foodId), visibleTo(userId)));
  return row ?? null;
}

export async function createFood(userId, input) {
  const [row] = await db
    .insert(foods)
    .values({ ...input, userId })
    .returning();
  return toFood(row);
}

/** Visible-but-global -> 403, invisible (other user's or missing) -> 404. */
async function findOwnFoodOrThrow(userId, foodId) {
  const food = await findVisibleFood(userId, foodId);
  if (!food) throw notFound("Food");
  if (food.userId === null) throw forbidden("Built-in foods can't be changed");
  return food;
}

export async function updateFood(userId, foodId, input) {
  const food = await findOwnFoodOrThrow(userId, foodId);
  if (Object.keys(input).length === 0) return toFood(food);

  const [row] = await db
    .update(foods)
    .set(input)
    .where(and(eq(foods.id, foodId), eq(foods.userId, userId)))
    .returning();
  return toFood(row);
}

export async function deleteFood(userId, foodId) {
  await findOwnFoodOrThrow(userId, foodId);
  try {
    await db.delete(foods).where(and(eq(foods.id, foodId), eq(foods.userId, userId)));
  } catch (err) {
    // meal_entries.food_id is ON DELETE RESTRICT: keep history intact
    if (pgErrorCode(err) === PG_FOREIGN_KEY_VIOLATION) {
      throw conflict("FOOD_IN_USE", "This food is used in your meal log and can't be deleted");
    }
    throw err;
  }
}
