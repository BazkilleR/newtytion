import { sql } from "drizzle-orm";
import { check, date, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth.ts";

/** One weigh-in per user per local day (upserted). Always kg. */
export const bodyLogs = pgTable(
  "body_logs",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    logDate: date({ mode: "string" }).notNull(),
    weightKg: numeric({ precision: 5, scale: 2, mode: "number" }).notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    // The unique index also serves (user_id, log_date) range queries.
    unique().on(t.userId, t.logDate),
    check("body_logs_weight_positive", sql`${t.weightKg} > 0`),
  ],
);
