import fs from "node:fs";
import path from "node:path";
import type { DailyFile } from "./schema";
import { validateDaily } from "./validate";

export const DAILY_DIR = path.join(process.cwd(), "content", "daily");

export type DailyLoad = {
  file: string;
  data: DailyFile | null;
  errors: string[];
  warnings: string[];
  /** Why this file is skipped, when another file already covers its language. */
  ignored?: string;
};

/**
 * Reads and validates content/daily/*.json. Each file covers one language (its
 * `language` field, "ja" when missing). If two files cover the same language,
 * the one named `<language>.json` wins and the other is skipped with a notice,
 * so an old `challenges.json` left next to `ja.json` after an update can't
 * break the app. Two same-language files where neither has that name is an error.
 */
export function loadDailyFiles(dir = DAILY_DIR): DailyLoad[] {
  if (!fs.existsSync(dir)) return [];
  const loads: DailyLoad[] = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((file) => {
      const name = `daily/${file}`;
      try {
        const { data, errors, warnings } = validateDaily(JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")), name);
        return { file, data, errors, warnings };
      } catch (e) {
        return { file, data: null, errors: [`${name}: invalid JSON — ${(e as Error).message}`], warnings: [] };
      }
    });

  const byLanguage = new Map<string, DailyLoad[]>();
  for (const load of loads) {
    if (load.data) byLanguage.set(load.data.language, [...(byLanguage.get(load.data.language) ?? []), load]);
  }
  for (const [language, group] of byLanguage) {
    if (group.length < 2) continue;
    const keep = group.find((l) => l.file === `${language}.json`);
    for (const load of group) {
      if (load === keep) continue;
      if (keep) load.ignored = `daily/${load.file} is skipped because daily/${keep.file} already covers "${language}". You can delete it.`;
      else load.errors.push(`daily/${load.file}: more than one daily file uses the language "${language}". Name the one to use ${language}.json.`);
    }
  }
  return loads;
}

/** The daily challenge sets in use, keyed by language. */
export function activeDailyFiles(loads: DailyLoad[]): Record<string, DailyFile> {
  const out: Record<string, DailyFile> = {};
  for (const load of loads) if (load.data && !load.ignored && !load.errors.length) out[load.data.language] = load.data;
  return out;
}
