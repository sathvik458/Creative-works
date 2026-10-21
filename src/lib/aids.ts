import type { Level } from "@/content/schema";

export type TranslationMode = "show" | "tap" | "off";
export type Aids = { furigana: boolean; romaji: boolean; translation: TranslationMode };

/** Level → default display aids (see spec §7). */
export const LEVEL_DEFAULTS: Record<Level, Aids> = {
  1: { furigana: true, romaji: true, translation: "show" },
  2: { furigana: true, romaji: false, translation: "tap" },
  3: { furigana: false, romaji: false, translation: "off" },
};

export const LEVEL_INFO: Record<Level, { label: string; blurb: string }> = {
  1: { label: "Level 1", blurb: "Reading aid and translation (or simpler English) shown. Short sentences; wrong options are clearly wrong." },
  2: { label: "Level 2", blurb: "Reading aid on, translation (or simpler English) hidden until you tap. Common forms; plausible near-misses." },
  3: { label: "Level 3", blurb: "No aids by default; tap words for help. Natural, casual speech; subtle register traps." },
};

export type AidOverrides = Partial<Aids>;

export function resolveAids(level: Level, overrides: AidOverrides): Aids {
  return { ...LEVEL_DEFAULTS[level], ...stripUndefined(overrides) };
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}
