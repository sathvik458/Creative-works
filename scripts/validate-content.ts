/**
 * npm run validate — validates every story in content/stories and every
 * daily challenge file in content/daily.
 * Exits with code 1 on any error (warnings are printed but don't fail).
 */
import fs from "node:fs";
import path from "node:path";
import { loadDailyFiles } from "../src/content/dailyFiles";
import { formatValidation, validateStory } from "../src/content/validate";

const dir = path.join(process.cwd(), "content", "stories");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();

const results = files.map((file) => {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    return { file, result: validateStory(raw, file) };
  } catch (e) {
    return { file, result: { story: null, errors: [`invalid JSON — ${(e as Error).message}`], warnings: [] } };
  }
});

const dailyLoads = loadDailyFiles();
for (const d of dailyLoads) {
  if (d.ignored) {
    console.log(`ℹ ${d.ignored}`);
    continue;
  }
  results.push({ file: `daily/${d.file}`, result: { story: null, errors: d.errors, warnings: d.warnings } });
}
const dailyFiles = dailyLoads.filter((d) => !d.ignored);

console.log(formatValidation(results));
const errorCount = results.reduce((n, r) => n + r.result.errors.length, 0);
if (!files.length) {
  console.error("No stories found in content/stories");
  process.exit(1);
}
if (errorCount) {
  console.error(`\nStory validation failed with ${errorCount} error(s).`);
  process.exit(1);
}
console.log(`\nAll ${files.length} stor${files.length === 1 ? "y" : "ies"} and ${dailyFiles.length} daily challenge file${dailyFiles.length === 1 ? "" : "s"} valid.`);
