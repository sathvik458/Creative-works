import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { StorySchema } from "@/content/schema";
import { validateDaily } from "@/content/validate";
import { choose, startEpisode, advance, sceneExit } from "@/engine/engine";
import { computeStreak, dateKey, dayNumber, shiftKey } from "./dates";
import { pickDaily, shuffle } from "./daily";
import { MOOD_META, moodExpression, naturalVersion, npcMood, summarizeRun } from "./scoring";
import { isSpeakable, speechText } from "./audio";

const story = StorySchema.parse(JSON.parse(fs.readFileSync(path.join(process.cwd(), "content/stories/first-week-in-tokyo.json"), "utf8")));
const ep1 = story.episodes[0];

describe("dates & streaks", () => {
  it("shifts keys across month boundaries", () => {
    expect(shiftKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(dayNumber("2026-01-02") - dayNumber("2026-01-01")).toBe(1);
  });
  it("counts consecutive days ending today or yesterday", () => {
    const today = "2026-10-05";
    expect(computeStreak([], today)).toBe(0);
    expect(computeStreak(["2026-10-05"], today)).toBe(1);
    expect(computeStreak(["2026-10-03", "2026-10-04", "2026-10-05"], today)).toBe(3);
    // Not played yet today: the streak isn't broken until a whole day is missed.
    expect(computeStreak(["2026-10-03", "2026-10-04"], today)).toBe(2);
    expect(computeStreak(["2026-10-01", "2026-10-02"], today)).toBe(0);
  });
  it("formats local date keys", () => {
    expect(dateKey(new Date(2026, 0, 9))).toBe("2026-01-09");
  });
});

describe("daily challenge", () => {
  const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content/daily/ja.json"), "utf8"));
  const { data, errors } = validateDaily(raw);
  it("content is valid", () => {
    expect(errors).toEqual([]);
    expect(data!.challenges.length).toBeGreaterThanOrEqual(7);
  });
  it("is deterministic per day and rotates through the set", () => {
    const list = data!.challenges;
    expect(pickDaily(list, "2026-10-05").id).toBe(pickDaily(list, "2026-10-05").id);
    const ids = new Set(Array.from({ length: list.length }, (_, i) => pickDaily(list, shiftKey("2026-10-05", i)).id));
    expect(ids.size).toBe(list.length);
  });
  it("each challenge is 1–2 steps (30–60s)", () => {
    for (const c of data!.challenges) expect(c.steps.length).toBeLessThanOrEqual(2);
  });
});

describe("shuffle", () => {
  it("keeps every item", () => {
    expect(shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("scoring", () => {
  it("summarizes a run by naturalness / comprehension / politeness", () => {
    let s = startEpisode(ep1);
    const picks = ["e1_c1a", "e1_c2a", "e1_c3b", "e1_c4a", "e1_c5a"];
    for (const id of picks) {
      while (sceneExit(ep1, s).kind !== "choices") s = advance(ep1, s);
      s = choose(ep1, s, id).state;
    }
    const sum = summarizeRun(ep1, s);
    expect(sum.naturalness).toEqual({ hit: 4, total: 5 });
    expect(sum.comprehension).toEqual({ hit: 1, total: 2 }); // c3b misunderstood, c5a understood
    expect(sum.politeness).toEqual({ hit: 2, total: 2 });
  });
  it("finds the natural version of a mistake", () => {
    const scene = ep1.scenes.s1;
    const wrong = scene.choices!.find((c) => c.id === "e1_c1b")!;
    expect(naturalVersion(scene, wrong)?.id).toBe("e1_c1a");
    expect(naturalVersion(scene, scene.choices!.find((c) => c.id === "e1_c1a")!)).toBeUndefined();
  });
  it("derives NPC mood only from past stats", () => {
    expect(npcMood({ trust: -1, fluency: 3 }, 2)).toBe("uneasy");
    expect(npcMood({ trust: 1, fluency: 0 }, 1, "wrong")).toBe("confused");
    expect(npcMood({ trust: 3, fluency: 6 }, 3)).toBe("impressed");
    expect(npcMood({ trust: 1, fluency: 1 }, 2)).toBe("friendly");
    expect(npcMood({ trust: 0, fluency: 0 }, 0)).toBe("neutral");
    expect(moodExpression("neutral", "impressed")).toBe(MOOD_META.impressed.expression);
    expect(moodExpression("surprised", "impressed")).toBe("surprised");
  });
});

describe("demo content: learning features", () => {
  for (const ep of story.episodes) {
    it(`${ep.id} has a review with 3 quiz questions and valid answers`, () => {
      expect(ep.review?.quiz.length).toBeGreaterThanOrEqual(3);
      for (const q of ep.review!.quiz) expect(q.answer).toBeLessThan(q.options.length);
    });
    it(`${ep.id} has ≥5 survival situations, each with a natural option`, () => {
      expect(ep.survival!.length).toBeGreaterThanOrEqual(5);
      for (const m of ep.survival!) expect(m.steps[0].choices.some((c) => c.quality === "natural")).toBe(true);
    });
    it(`${ep.id}: every choice has a Why? explanation and every choice point a skill`, () => {
      for (const scene of Object.values(ep.scenes)) {
        if (!scene.choices) continue;
        expect(scene.skill).toBeDefined();
        for (const c of scene.choices) expect(c.why, c.id).toBeTruthy();
      }
    });
  }
});

describe("speech text", () => {
  it("speaks furigana readings and skips stage directions", () => {
    expect(speechText("{五番線|ごばんせん}ですね。")).toBe("ごばんせんですね。");
    expect(isSpeakable("（{軽|かる}く{会釈|えしゃく}する）")).toBe(false);
    expect(isSpeakable("すみません！")).toBe(true);
  });
});
