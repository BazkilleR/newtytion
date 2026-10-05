import { addDays, movingAverage, WINDOW_DAYS } from "@fitness/shared";
import { and, asc, between, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { bodyLogs } from "../db/schema/index.js";
import { notFound } from "../lib/errors.js";

/**
 * Weigh-ins in [from, to] with a 7-day moving average. We read 6 extra days
 * before `from` so the first points in the range get a full window too.
 */
export async function listBodyLogs(userId, { from, to }) {
  const rows = await db
    .select({ logDate: bodyLogs.logDate, weightKg: bodyLogs.weightKg })
    .from(bodyLogs)
    .where(
      and(
        eq(bodyLogs.userId, userId),
        between(bodyLogs.logDate, addDays(from, -(WINDOW_DAYS - 1)), to),
      ),
    )
    .orderBy(asc(bodyLogs.logDate));

  return movingAverage(rows, WINDOW_DAYS).filter((p) => p.logDate >= from);
}

/** One weigh-in per day: logging again the same day replaces it. */
export async function upsertBodyLog(userId, logDate, { weightKg }) {
  const [row] = await db
    .insert(bodyLogs)
    .values({ userId, logDate, weightKg })
    .onConflictDoUpdate({
      target: [bodyLogs.userId, bodyLogs.logDate],
      set: { weightKg, updatedAt: new Date() },
    })
    .returning({ logDate: bodyLogs.logDate, weightKg: bodyLogs.weightKg });
  return row;
}

export async function deleteBodyLog(userId, logDate) {
  const deleted = await db
    .delete(bodyLogs)
    .where(and(eq(bodyLogs.userId, userId), eq(bodyLogs.logDate, logDate)))
    .returning({ id: bodyLogs.id });
  if (deleted.length === 0) throw notFound("Weigh-in");
}
