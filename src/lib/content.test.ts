import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { StorySchema } from "@/content/schema";
import { activeDailyFiles, loadDailyFiles } from "@/content/dailyFiles";
import { validateStory } from "@/content/validate";
import { pickDaily } from "./daily";
import { shiftKey } from "./dates";
import { LANGS, langMeta, sortLangs } from "./lang";
import { plural, withStop } from "./text";
import { findVocabRanges, plainText } from "./markup";
import { isSpeakable } from "./audio";

const storyDir = path.join(process.cwd(), "content", "stories");
const storyFiles = fs.readdirSync(storyDir).filter((f) => f.endsWith(".json"));

describe("every story: learning features (all languages)", () => {
  for (const file of storyFiles) {
    const raw = JSON.parse(fs.readFileSync(path.join(storyDir, file), "utf8"));
    const story = StorySchema.parse(raw);

    it(`${file}: validates with no errors or warnings`, () => {
      const r = validateStory(raw, file);
      expect(r.errors).toEqual([]);
      expect(r.warnings).toEqual([]);
    });

    it(`${file}: uses a supported language`, () => {
      expect(Object.keys(LANGS)).toContain(story.targetLanguage);
    });

    if (story.targetLanguage === "en") {
      it(`${file}: stress guides always write the pronoun "I" as a capital`, () => {
        const readings: string[] = [];
        const collect = (o: unknown): void => {
          if (Array.isArray(o)) o.forEach(collect);
          else if (o && typeof o === "object")
            for (const [k, v] of Object.entries(o)) {
              if (k === "reading" && typeof v === "string") readings.push(v);
              else collect(v);
            }
        };
        collect(story.episodes);
        expect(readings.length).toBeGreaterThan(50);
        for (const r of readings) expect(r, r).not.toMatch(/(?<![A-Za-z'’-])i(?=(['’](d|m|ll|ve))?(?![A-Za-z-]))/);
      });
    }

    for (const ep of story.episodes) {
      it(`${file} › ${ep.id}: review quiz (3+) and 5+ survival situations`, () => {
        expect(ep.review?.quiz.length).toBeGreaterThanOrEqual(3);
        expect(ep.survival?.length).toBeGreaterThanOrEqual(5);
      });
      it(`${file} › ${ep.id}: 8–15 new vocab items, each choice has why + skill`, () => {
        const n = story.vocab.filter((v) => v.episode === ep.id).length;
        expect(n).toBeGreaterThanOrEqual(8);
        expect(n).toBeLessThanOrEqual(15);
        for (const scene of Object.values(ep.scenes)) {
          if (!scene.choices) continue;
          expect(scene.skill).toBeDefined();
          for (const c of scene.choices) expect(c.why, c.id).toBeTruthy();
        }
      });
      it(`${file} › ${ep.id}: every spoken line is speakable in its language`, () => {
        for (const scene of Object.values(ep.scenes)) {
          for (const l of scene.lines) if (l.speaker !== "narrator") expect(isSpeakable(l.text, story.targetLanguage), l.text).toBe(true);
        }
      });
    }
  }
});

describe("daily challenge files", () => {
  for (const { file, data, errors, warnings } of loadDailyFiles().filter((d) => !d.ignored)) {
    it(`${file}: valid, one per language`, () => {
      expect(errors).toEqual([]);
      expect(warnings).toEqual([]);
      expect(file).toBe(`${data!.language}.json`);
    });
    if (data?.language === "en") {
      it(`${file}: stress guides always write the pronoun "I" as a capital`, () => {
        const readings = data.challenges.flatMap((c) => c.steps.flatMap((st) => [st.reading, ...st.choices.map((ch) => ch.reading)]));
        for (const r of readings) if (r) expect(r, r).not.toMatch(/(?<![A-Za-z'’-])i(?=(['’](d|m|ll|ve))?(?![A-Za-z-]))/);
      });
    }
    it(`${file}: deterministic and covers the whole set over ${data?.challenges.length} days`, () => {
      const list = data!.challenges;
      const ids = new Set(Array.from({ length: list.length }, (_, i) => pickDaily(list, shiftKey("2026-10-05", i)).id));
      expect(ids.size).toBe(list.length);
      for (const c of list) expect(c.steps.length).toBeLessThanOrEqual(2);
    });
  }
});

describe("daily file loading", () => {
  const ja = fs.readFileSync(path.join(process.cwd(), "content", "daily", "ja.json"), "utf8");
  const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "daily-"));

  it("skips an old challenges.json when ja.json covers the same language", () => {
    const dir = tmp();
    fs.writeFileSync(path.join(dir, "ja.json"), ja);
    const legacy = JSON.parse(ja);
    delete legacy.language; // the old file had no language field (defaults to "ja")
    fs.writeFileSync(path.join(dir, "challenges.json"), JSON.stringify(legacy));
    const loads = loadDailyFiles(dir);
    expect(loads.find((l) => l.file === "challenges.json")?.ignored).toMatch(/skipped/);
    expect(loads.every((l) => l.errors.length === 0)).toBe(true);
    expect(Object.keys(activeDailyFiles(loads))).toEqual(["ja"]);
  });

  it("reports a conflict when two files share a language and neither is named after it", () => {
    const dir = tmp();
    fs.writeFileSync(path.join(dir, "a.json"), ja);
    fs.writeFileSync(path.join(dir, "b.json"), ja);
    const loads = loadDailyFiles(dir);
    expect(loads.flatMap((l) => l.errors).join("\n")).toMatch(/more than one daily file/);
  });
});

describe("English support", () => {
  it("matches English vocab case-insensitively and on word boundaries", () => {
    const v = [{ id: "ex", term: "excuse me" }, { id: "line", term: "line" }];
    expect(findVocabRanges("Excuse me! Is this the Northern line?", v).map((r) => r.vocabId)).toEqual(["ex", "line"]);
    expect(findVocabRanges("I buy everything online.", v)).toEqual([]);
  });
  it("has no furigana and a stress-guide reading aid", () => {
    const en = langMeta("en");
    expect(en.hasFurigana).toBe(false);
    expect(en.readingLabel).toMatch(/stress/i);
    expect(en.speech).toBe("en-GB");
  });
  it("orders languages the same way everywhere", () => {
    expect(sortLangs(["en", "ja"])).toEqual(["ja", "en"]);
    expect(sortLangs(["xx", "en", "ja", "en"])).toEqual(["ja", "en", "xx"]);
  });
  it("pluralises counts and punctuates titles", () => {
    expect(plural(1, "saved phrase")).toBe("1 saved phrase");
    expect(plural(3, "word")).toBe("3 words");
    expect(withStop("Which exit?")).toBe("Which exit?");
    expect(withStop("Booking by phone")).toBe("Booking by phone.");
  });
  it("speaks English text but not stage directions", () => {
    expect(isSpeakable("Excuse me!", "en")).toBe(true);
    expect(isSpeakable("(nod politely)", "en")).toBe(false);
    expect(plainText("Mind the gap!")).toBe("Mind the gap!");
  });
});
