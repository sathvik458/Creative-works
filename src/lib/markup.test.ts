import { describe, expect, it } from "vitest";
import { buildPieces, findVocabRanges, markupError, parseRuby, plainText } from "./markup";

describe("markup", () => {
  it("parses furigana", () => {
    expect(parseRuby("{駅|えき}はどこ")).toEqual([{ base: "駅", ruby: "えき" }, { base: "はどこ" }]);
    expect(plainText("{電車|でんしゃ}は{五番線|ごばんせん}です")).toBe("電車は五番線です");
  });
  it("flags malformed markup", () => {
    expect(markupError("{駅|えき")).not.toBeNull();
    expect(markupError("{駅|えき}です")).toBeNull();
  });
  it("finds vocab ranges, longest form first, no overlaps", () => {
    const ranges = findVocabRanges("よろしくお願いします", [
      { id: "a", term: "お願いします" },
      { id: "b", term: "よろしくお願いします" },
    ]);
    expect(ranges).toEqual([{ start: 0, end: 10, vocabId: "b" }]);
  });
  it("matches inside ruby segments (via forms) and splits plain text", () => {
    const pieces = buildPieces("{電車|でんしゃ}は{五番線|ごばんせん}です", [
      { id: "densha", term: "電車" },
      { id: "bansen", term: "番線" },
    ]);
    expect(pieces[0]).toMatchObject({ base: "電車", ruby: "でんしゃ", vocabId: "densha" });
    // 番線 sits inside the atomic ruby segment 五番線, so the whole segment is tagged
    expect(pieces.find((p) => p.base === "五番線")?.vocabId).toBe("bansen");
    expect(pieces.find((p) => p.base === "は")?.vocabId).toBeUndefined();
    const plain = buildPieces("きっぷをなくしました。", [{ id: "k", term: "きっぷ" }, { id: "n", term: "なくしました" }]);
    expect(plain.map((p) => [p.base, p.vocabId])).toEqual([
      ["きっぷ", "k"], ["を", undefined], ["なくしました", "n"], ["。", undefined],
    ]);
  });
  it("matches English case-insensitively, on whole words only", () => {
    const vocab = [
      { id: "line", term: "line" },
      { id: "ex", term: "excuse me" },
      { id: "dw", term: "doesn't work" },
    ];
    expect(findVocabRanges("Excuse me, it's online.", vocab)).toEqual([{ start: 0, end: 9, vocabId: "ex" }]);
    expect(findVocabRanges("Take the Northern line.", vocab)).toEqual([{ start: 18, end: 22, vocabId: "line" }]);
    // Curly apostrophes match straight ones.
    expect(findVocabRanges("My ticket doesn’t work.", vocab)).toEqual([{ start: 10, end: 22, vocabId: "dw" }]);
  });
});
