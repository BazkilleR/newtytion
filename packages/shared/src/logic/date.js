/**
 * Date helpers for "calendar dates in the user's timezone".
 *
 * A log_date is a plain "YYYY-MM-DD" string. We never round-trip it through a
 * JS Date in local time, because `new Date("2026-10-06")` is UTC midnight and
 * shifts to the previous day in negative-offset timezones.
 */

export const APP_TIMEZONE = "Asia/Bangkok";

const formatters = new Map();

function formatterFor(timeZone) {
  let fmt = formatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    formatters.set(timeZone, fmt);
  }
  return fmt;
}

/** The calendar date (YYYY-MM-DD) that `instant` falls on in `timeZone`. */
export function toLocalDate(instant, timeZone = APP_TIMEZONE) {
  const parts = formatterFor(timeZone).formatToParts(instant);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Today's calendar date in `timeZone`. */
export function todayIn(timeZone = APP_TIMEZONE, now = new Date()) {
  return toLocalDate(now, timeZone);
}

function parseIsoDate(date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new RangeError(`Invalid ISO date: ${date}`);
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

/** Pure calendar arithmetic, done in UTC so DST/offsets can't interfere. */
export function addDays(date, days) {
  const { y, m, d } = parseIsoDate(date);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from, to) {
  const a = parseIsoDate(from);
  const b = parseIsoDate(to);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
}
