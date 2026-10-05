const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Estimated one-rep max (Epley): weight × (1 + reps / 30).
 * A single is already a 1RM, so reps = 1 returns the weight itself
 * (Epley would say 103%). Zero reps estimates nothing.
 */
export function epley1rm(weightKg, reps) {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return round1(weightKg * (1 + reps / 30));
}

/**
 * One point per training day: that day's best estimated 1RM and the set that
 * produced it. Input: sets with { logDate, weightKg, reps }. Output sorted by date.
 * Ties keep the heavier set (more reliable estimate than a high-rep one).
 */
export function bestE1rmPerDay(sets) {
  const byDay = new Map();
  for (const { logDate, weightKg, reps } of sets) {
    const e1rmKg = epley1rm(weightKg, reps);
    if (e1rmKg === 0) continue;
    const best = byDay.get(logDate);
    if (!best || e1rmKg > best.e1rmKg || (e1rmKg === best.e1rmKg && weightKg > best.weightKg)) {
      byDay.set(logDate, { logDate, e1rmKg, weightKg, reps });
    }
  }
  return [...byDay.values()].sort((a, b) => a.logDate.localeCompare(b.logDate));
}
