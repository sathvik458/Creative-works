import type { MiniScenario } from "@/content/schema";
import { dayNumber } from "./dates";

/** Deterministic daily pick: consecutive days walk through the whole set. */
export function pickDaily<T extends MiniScenario>(challenges: T[], key: string): T {
  const n = challenges.length;
  const idx = ((dayNumber(key) % n) + n) % n;
  return challenges[idx];
}

/** Fisher–Yates shuffle (Survival Mode uses truly random order). */
export function shuffle<T>(items: T[], rand: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
