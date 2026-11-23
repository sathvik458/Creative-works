import { describe, expect, it } from "vitest";
import {
  AZURE_VISEME_TO_MOUTH,
  MOUTH_SHAPES,
  cuesFromAzureVisemes,
  cuesFromRhubarb,
  cuesFromText,
  mouthAt,
  mouthFromShape,
  wordShapes,
} from "./lipsync";

describe("mouth shapes", () => {
  it("maps Rhubarb letters to the Rive mouth numbers", () => {
    expect(MOUTH_SHAPES).toHaveLength(9);
    expect(mouthFromShape("X")).toBe(0);
    expect(mouthFromShape("A")).toBe(1);
    expect(mouthFromShape("H")).toBe(8);
    expect(mouthFromShape("?")).toBe(0);
  });
});

describe("cuesFromRhubarb", () => {
  const json = {
    mouthCues: [
      { start: 0.27, end: 0.35, value: "D" },
      { start: 0.0, end: 0.27, value: "X" },
      { start: 0.35, end: 0.5, value: "A" },
    ],
  };

  it("sorts cues and closes the mouth at the end", () => {
    const cues = cuesFromRhubarb(json);
    expect(cues.map((c) => c.mouth)).toEqual([0, 4, 1, 0]);
    expect(cues[cues.length - 1].start).toBe(0.5);
  });

  it("finds the right mouth for a time", () => {
    const cues = cuesFromRhubarb(json);
    expect(mouthAt(cues, 0.1)).toBe(0);
    expect(mouthAt(cues, 0.3)).toBe(4);
    expect(mouthAt(cues, 0.4)).toBe(1);
    expect(mouthAt(cues, 2)).toBe(0);
  });
});

describe("Azure visemes", () => {
  it("covers all 22 viseme IDs with valid mouth numbers", () => {
    expect(AZURE_VISEME_TO_MOUTH).toHaveLength(22);
    for (const m of AZURE_VISEME_TO_MOUTH) {
      expect(m).toBeGreaterThanOrEqual(0);
      expect(m).toBeLessThanOrEqual(8);
    }
  });

  it("maps silence, p/b/m and f/v to rest, closed lips and teeth-on-lip", () => {
    const cues = cuesFromAzureVisemes([
      { visemeId: 18, audioOffsetMs: 300 },
      { visemeId: 0, audioOffsetMs: 0 },
      { visemeId: 21, audioOffsetMs: 150 },
    ]);
    expect(cues).toEqual([
      { start: 0, mouth: 0 },
      { start: 0.15, mouth: 1 },
      { start: 0.3, mouth: 7 },
    ]);
  });
});

describe("cuesFromText", () => {
  it("estimates shapes for a word, skipping repeats", () => {
    expect(wordShapes("Hello")).toEqual([2, 3, 8, 5]);
    expect(wordShapes("coffee")).toEqual([2, 5, 7, 2]);
    expect(wordShapes("make")).toEqual([1, 4, 2]); // silent final e
  });

  it("returns word positions and a duration that scales with speech rate", () => {
    const slow = cuesFromText("Hello, world.", 1);
    const fast = cuesFromText("Hello, world.", 2);
    expect(slow.words.map((w) => [w.index, w.length])).toEqual([[0, 5], [7, 5]]);
    expect(fast.duration).toBeCloseTo(slow.duration / 2, 5);
    expect(mouthAt(slow.cues, slow.duration + 1)).toBe(0);
  });

  it("starts and ends with a closed mouth", () => {
    const { cues, duration } = cuesFromText("Where is the station?");
    expect(mouthAt(cues, 0)).toBe(0);
    expect(mouthAt(cues, duration)).toBe(0);
    expect(cues.some((c) => c.mouth === 8)).toBe(true); // "th"
  });
});

describe("mouthAt", () => {
  it("returns the rest shape when there are no cues or before the first cue", () => {
    expect(mouthAt([], 1)).toBe(0);
    expect(mouthAt([{ start: 0.5, mouth: 4 }], 0.2)).toBe(0);
  });
});
