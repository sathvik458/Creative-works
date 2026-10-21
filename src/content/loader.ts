import "server-only";
import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import type { DailyFile, Story } from "./schema";
import { activeDailyFiles, loadDailyFiles } from "./dailyFiles";
import { formatValidation, validateStory, type ValidationResult } from "./validate";

/**
 * Loads every story in /content/stories/*.json. Adding a story = adding a file.
 * Stories are validated on load; any error throws (in dev you'll see it in the
 * error overlay, in `next build` the build fails), so broken content never ships.
 */
export const STORIES_DIR = path.join(process.cwd(), "content", "stories");

export function loadAndValidateAll(dir = STORIES_DIR): { file: string; result: ValidationResult }[] {
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort() : [];
  return files.map((file) => {
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    } catch (e) {
      return { file, result: { story: null, errors: [`${file}: invalid JSON — ${(e as Error).message}`], warnings: [] } };
    }
    return { file, result: validateStory(raw, file) };
  });
}

export const getAllStories = cache((): Story[] => {
  const results = loadAndValidateAll();
  const failed = results.filter((r) => r.result.errors.length);
  if (failed.length) {
    throw new Error(`Story validation failed:\n${formatValidation(failed)}`);
  }
  if (process.env.NODE_ENV === "development") {
    const warned = results.filter((r) => r.result.warnings.length);
    if (warned.length) console.warn(`[stories] content warnings:\n${formatValidation(warned)}`);
  }
  const stories = results.map((r) => r.result.story!);
  const ids = stories.map((s) => s.id);
  const dup = ids.find((id, i) => ids.indexOf(id) !== i);
  if (dup) throw new Error(`Two story files share the id "${dup}"`);
  return stories;
});

export function getStory(id: string): Story | undefined {
  return getAllStories().find((s) => s.id === id);
}

/**
 * Daily challenges (deterministic, local content), one file per target
 * language: content/daily/<lang>.json, keyed by the file's `language`.
 */
export const getDailyFiles = cache((): Record<string, DailyFile> => {
  const loads = loadDailyFiles();
  const failed = loads.filter((l) => l.errors.length);
  if (failed.length) throw new Error(`Daily challenge validation failed:\n${failed.flatMap((l) => l.errors).join("\n")}`);
  for (const l of loads) if (l.ignored) console.warn(`[daily] ${l.ignored}`);
  return activeDailyFiles(loads);
});
