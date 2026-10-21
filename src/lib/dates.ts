/** Local-date helpers (streaks and daily challenges use the learner's own calendar day). */

export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function shiftKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return dateKey(new Date(y, m - 1, d + days));
}

/** Whole days since 1970-01-01 for a local date key (stable, timezone-safe). */
export function dayNumber(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/**
 * Current streak: consecutive active days ending today — or ending yesterday
 * if the learner hasn't played yet today (the streak isn't lost until a day is missed).
 */
export function computeStreak(activeDays: Iterable<string>, today: string = dateKey()): number {
  const set = new Set(activeDays);
  let cursor = set.has(today) ? today : shiftKey(today, -1);
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = shiftKey(cursor, -1);
  }
  return streak;
}
