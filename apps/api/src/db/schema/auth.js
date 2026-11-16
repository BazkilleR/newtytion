import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  // "<hex salt>:<hex scrypt key>", see lib/password.js
  passwordHash: text().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp()
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

/**
 * One row per issued refresh token, keyed by the token's `jti`. Logging out or
 * refreshing deletes the row, so a refresh JWT only works once even though its
 * signature stays valid until it expires.
 */
export const refreshToken = pgTable(
  "refresh_token",
  {
    id: uuid().primaryKey(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (t) => [index().on(t.userId)],
);
