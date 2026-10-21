import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { EpisodeSchema, StorySchema, type Episode } from "@/content/schema";
import { validateStory } from "@/content/validate";
import { advance, choose, reachableEndings, rewindTo, sceneExit, startEpisode } from "./engine";
import { evaluateCondition, parseCondition } from "./conditions";

const mini: Episode = EpisodeSchema.parse({
  id: "ep",
  title: "Mini",
  startScene: "s1",
  scenes: {
    s1: {
      lines: [{ speaker: "narrator", text: "Hi" }],
      choices: [
        { id: "a", text: "A", reading: "a", translation: "a", quality: "natural", effects: { trust: 2, fluency: 2 }, feedback: "f", next: "s2" },
        { id: "b", text: "B", reading: "b", translation: "b", quality: "wrong", effects: { trust: -1 }, feedback: "f", next: "s2" },
        { id: "c", text: "C", reading: "c", translation: "c", quality: "awkward", feedback: "f", endingId: "instant" },
      ],
    },
    s2: { routes: [{ if: "trust >= 2", next: "good" }, { if: "chose:b", endingId: "bad" }, { else: true, next: "meh" }] },
    good: { lines: [{ speaker: "narrator", text: "Yay" }], endingId: "best" },
    meh: { lines: [{ speaker: "narrator", text: "Meh" }], next: "end" },
    end: { lines: [], endingId: "ok" },
  },
  endings: ["best", "ok", "bad", "instant"].map((id) => ({ id, title: id, type: "good", summary: "s", teachingPoint: "t" })),
});

describe("conditions", () => {
  const ctx = { stats: { trust: 3, fluency: 5 }, chosen: new Set(["x1"]) };
  it("evaluates comparisons", () => {
    expect(evaluateCondition("trust >= 3", ctx)).toBe(true);
    expect(evaluateCondition("trust > 3", ctx)).toBe(false);
    expect(evaluateCondition("fluency == 5", ctx)).toBe(true);
    expect(evaluateCondition("fluency != 5", ctx)).toBe(false);
    expect(evaluateCondition("trust<=-1", { ...ctx, stats: { trust: -2, fluency: 0 } })).toBe(true);
  });
  it("supports && / || with && binding tighter", () => {
    expect(evaluateCondition("trust >= 3 && fluency >= 6", ctx)).toBe(false);
    expect(evaluateCondition("trust >= 9 || fluency >= 5", ctx)).toBe(true);
    expect(evaluateCondition("trust >= 9 && fluency >= 0 || chose:x1", ctx)).toBe(true);
  });
  it("supports chose: and !chose:", () => {
    expect(evaluateCondition("chose:x1", ctx)).toBe(true);
    expect(evaluateCondition("!chose:x1", ctx)).toBe(false);
    expect(evaluateCondition("chose:nope", ctx)).toBe(false);
  });
  it("rejects garbage", () => {
    expect(() => parseCondition("charm >= 3")).toThrow();
    expect(() => parseCondition("")).toThrow();
  });
});

describe("engine", () => {
  it("starts at the start scene with zero stats", () => {
    const s = startEpisode(mini);
    expect(s.sceneId).toBe("s1");
    expect(s.stats).toEqual({ trust: 0, fluency: 0 });
    expect(sceneExit(mini, s).kind).toBe("choices");
  });

  it("applies effects, records history and follows conditional routes", () => {
    const { state, delta } = choose(mini, startEpisode(mini), "a");
    expect(delta).toEqual({ trust: 2, fluency: 2 });
    expect(state.stats).toEqual({ trust: 2, fluency: 2 });
    expect(state.history).toEqual([{ sceneId: "s1", choiceId: "a", statsBefore: { trust: 0, fluency: 0 } }]);
    // s2 is a pure routing scene, so we land straight on "good"
    expect(state.sceneId).toBe("good");
    expect(advance(mini, state).endingId).toBe("best");
  });

  it("routes can end directly via endingId, and chose: works", () => {
    const { state } = choose(mini, startEpisode(mini), "b");
    expect(state.endingId).toBe("bad");
  });

  it("choices can end directly", () => {
    expect(choose(mini, startEpisode(mini), "c").state.endingId).toBe("instant");
  });

  it("follows next through empty scenes to an ending", () => {
    const s = startEpisode(mini);
    const viaElse = { ...choose(mini, s, "b").state };
    expect(viaElse.endingId).toBe("bad");
    // Force the else-path: no stats, no chose:b
    const forced = advance(mini, { ...s, sceneId: "meh" });
    expect(forced.endingId).toBe("ok");
  });

  it("rejects invalid choices and choosing after an ending", () => {
    const s = startEpisode(mini);
    expect(() => choose(mini, s, "zzz")).toThrow();
    const ended = choose(mini, s, "c").state;
    expect(() => choose(mini, ended, "a")).toThrow();
  });

  it("rewinds to a previous choice point", () => {
    const afterA = choose(mini, startEpisode(mini), "a").state;
    const rewound = rewindTo(afterA, 0);
    expect(rewound.sceneId).toBe("s1");
    expect(rewound.stats).toEqual({ trust: 0, fluency: 0 });
    expect(rewound.history).toHaveLength(0);
    expect(rewound.endingId).toBeNull();
    expect(choose(mini, rewound, "b").state.endingId).toBe("bad");
  });

  it("enumerates reachable endings", () => {
    expect([...reachableEndings(mini).endings].sort()).toEqual(["bad", "best", "instant"]);
  });
});

describe("validator", () => {
  const goodRaw = {
    id: "t", title: "T", level: 1, targetLanguage: "ja", nativeLanguage: "en", synopsis: "s", coverImage: "/x.svg",
    characters: [{ id: "npc", name: "N" }],
    vocab: [{ id: "v_eki", term: "駅", reading: "えき", meaning: "station", pos: "noun", example: "駅" }],
    episodes: [{
      id: "ep", title: "E", startScene: "s1",
      scenes: {
        s1: {
          lines: [{ speaker: "npc", text: "{駅|えき}です", reading: "eki desu", translation: "station", vocabRefs: ["v_eki"] }],
          choices: [
            { id: "a", text: "x", reading: "x", translation: "x", quality: "natural", feedback: "f", endingId: "e1" },
            { id: "b", text: "y", reading: "y", translation: "y", quality: "wrong", feedback: "f", endingId: "e2" },
          ],
        },
      },
      endings: [
        { id: "e1", title: "1", type: "best", summary: "s", teachingPoint: "t" },
        { id: "e2", title: "2", type: "awkward", summary: "s", teachingPoint: "t" },
      ],
    }],
  };
  const clone = () => JSON.parse(JSON.stringify(goodRaw));

  it("accepts a valid story", () => {
    expect(validateStory(goodRaw).errors).toEqual([]);
  });
  it("catches broken scene links", () => {
    const raw = clone();
    raw.episodes[0].scenes.s1.choices[0] = { ...raw.episodes[0].scenes.s1.choices[0], endingId: undefined, next: "nowhere" };
    expect(validateStory(raw).errors.join("\n")).toMatch(/missing scene "nowhere"/);
  });
  it("catches unreachable scenes", () => {
    const raw = clone();
    raw.episodes[0].scenes.orphan = { lines: [{ speaker: "narrator", text: "?" }], endingId: "e1" };
    expect(validateStory(raw).errors.join("\n")).toMatch(/orphan: scene is unreachable/);
  });
  it("catches missing vocab ids and vocab not present in text", () => {
    const raw = clone();
    raw.episodes[0].scenes.s1.lines[0].vocabRefs = ["v_nope"];
    expect(validateStory(raw).errors.join("\n")).toMatch(/unknown vocab id "v_nope"/);
    const raw2 = clone();
    raw2.episodes[0].scenes.s1.lines[0].text = "です";
    expect(validateStory(raw2).errors.join("\n")).toMatch(/does not appear in text/);
  });
  it("catches unknown speakers, bad conditions and unreachable endings", () => {
    const raw = clone();
    raw.episodes[0].scenes.s1.lines[0].speaker = "ghost";
    raw.episodes[0].endings.push({ id: "e3", title: "3", type: "hidden", summary: "s", teachingPoint: "t" });
    const errors = validateStory(raw).errors.join("\n");
    expect(errors).toMatch(/unknown speaker "ghost"/);
    expect(errors).toMatch(/ending "e3" is never referenced/);
  });
});

describe("demo content", () => {
  const dir = path.join(process.cwd(), "content", "stories");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));

  it("has at least one story", () => expect(files.length).toBeGreaterThan(0));

  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    it(`${file} passes validation`, () => {
      const r = validateStory(raw, file);
      expect(r.errors).toEqual([]);
    });
    const story = StorySchema.parse(raw);
    for (const ep of story.episodes) {
      it(`${file} › ${ep.id}: every ending is reachable and there are 3+ distinct endings`, () => {
        const { endings } = reachableEndings(ep);
        expect(endings.size).toBeGreaterThanOrEqual(3);
        expect([...endings].sort()).toEqual(ep.endings.map((e) => e.id).sort());
      });
      it(`${file} › ${ep.id}: has 3–5 choice points on every path`, () => {
        const counts = new Set<number>();
        const walk = (s: ReturnType<typeof startEpisode>) => {
          if (s.endingId) return counts.add(s.history.length);
          const exit = sceneExit(ep, s);
          if (exit.kind === "choices") exit.choices.forEach((c) => walk(choose(ep, s, c.id).state));
          else walk(advance(ep, s));
        };
        walk(startEpisode(ep));
        for (const n of counts) {
          expect(n).toBeGreaterThanOrEqual(3);
          expect(n).toBeLessThanOrEqual(5);
        }
      });
    }
  }
});
