import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.ts";
import { mealTypeEnum } from "./enums.ts";

// numeric keeps exact decimals in Postgres; mode "number" gives us a JS number
// instead of the string that `pg` returns for numerics by default.
const num = (precision: number, scale: number) => numeric({ precision, scale, mode: "number" });

/** Nutrition values are per one serving. user_id NULL = global (seeded) food. */
export const foods = pgTable(
  "foods",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text().references(() => user.id, { onDelete: "cascade" }),
    name: text().notNull(),
    kcal: num(7, 1).notNull(),
    proteinG: num(6, 1).notNull(),
    carbG: num(6, 1).notNull(),
    fatG: num(6, 1).notNull(),
    servingSize: num(7, 1).notNull(),
    servingUnit: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index().on(t.userId),
    // Global food names are unique, which also makes the seed idempotent.
    uniqueIndex("foods_global_name_uq").on(t.name).where(sql`${t.userId} is null`),
    check(
      "foods_nutrition_non_negative",
      sql`${t.kcal} >= 0 and ${t.proteinG} >= 0 and ${t.carbG} >= 0 and ${t.fatG} >= 0`,
    ),
    check("foods_serving_positive", sql`${t.servingSize} > 0`),
  ],
);

export const mealEntries = pgTable(
  "meal_entries",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // DATE in the user's local timezone; mode "string" avoids JS Date shifting it.
    logDate: date({ mode: "string" }).notNull(),
    mealType: mealTypeEnum().notNull(),
    // restrict: deleting a food that is in someone's history is an error, not silent data loss
    foodId: uuid()
      .notNull()
      .references(() => foods.id, { onDelete: "restrict" }),
    /** Number of servings */
    quantity: num(6, 2).notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index().on(t.userId, t.logDate),
    index().on(t.foodId),
    check("meal_entries_quantity_positive", sql`${t.quantity} > 0`),
  ],
);

export const goals = pgTable("goals", {
  userId: text()
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  kcalTarget: integer().notNull(),
  proteinTargetG: integer().notNull(),
  updatedAt: timestamp({ withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
