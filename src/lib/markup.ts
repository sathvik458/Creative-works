/**
 * Tiny text-markup helpers shared by the validator and the renderer.
 *
 *   "{駅|えき}はどこですか" → [{ base: "駅", ruby: "えき" }, { base: "はどこですか" }]
 */

export type Segment = { base: string; ruby?: string };

const RUBY_RE = /\{([^{}|]+)\|([^{}|]+)\}/g;

export function parseRuby(text: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(RUBY_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) segments.push({ base: text.slice(last, idx) });
    segments.push({ base: m[1], ruby: m[2] });
    last = idx + m[0].length;
  }
  if (last < text.length) segments.push({ base: text.slice(last) });
  return segments;
}

/** Text with furigana markup removed. */
export function plainText(text: string): string {
  return text.replace(RUBY_RE, "$1");
}

/** Text where kanji are replaced by their readings (useful for kana-only display). */
export function kanaText(text: string): string {
  return text.replace(RUBY_RE, "$2");
}

/** Returns a description of any malformed markup, or null if fine. */
export function markupError(text: string): string | null {
  const stripped = text.replace(RUBY_RE, "");
  if (/[{}]/.test(stripped)) return `unbalanced or malformed furigana markup in "${text}"`;
  return null;
}

export type VocabLike = { id: string; term: string; forms?: string[] };
export type VocabRange = { start: number; end: number; vocabId: string };

/** Lower-cases and unifies apostrophes without changing string length. */
function normalizeForMatch(s: string): string {
  const lower = s.toLowerCase();
  return (lower.length === s.length ? lower : s).replace(/[’‘]/g, "'");
}

const LATIN_EDGE = /[A-Za-z0-9\u00C0-\u024F]/;

/**
 * Finds where each referenced vocab entry appears in `plain`.
 * Longer surface forms win; ranges never overlap. Each vocab id is highlighted
 * at its first occurrence only, which keeps lines readable.
 * Matching ignores case, and Latin-script forms must match whole words
 * ("line" won't match inside "online"); Japanese forms match anywhere.
 */
export function findVocabRanges(plain: string, vocab: VocabLike[]): VocabRange[] {
  const candidates: { form: string; vocabId: string }[] = [];
  for (const v of vocab) {
    for (const form of [v.term, ...(v.forms ?? [])]) if (form) candidates.push({ form: normalizeForMatch(form), vocabId: v.id });
  }
  candidates.sort((a, b) => b.form.length - a.form.length);
  const hay = normalizeForMatch(plain);

  const ranges: VocabRange[] = [];
  const used = new Set<string>();
  for (const { form, vocabId } of candidates) {
    if (used.has(vocabId)) continue;
    const needsStartBoundary = LATIN_EDGE.test(form[0]);
    const needsEndBoundary = LATIN_EDGE.test(form[form.length - 1]);
    let from = 0;
    while (from <= hay.length) {
      const start = hay.indexOf(form, from);
      if (start === -1) break;
      const end = start + form.length;
      const okStart = !needsStartBoundary || start === 0 || !LATIN_EDGE.test(hay[start - 1]);
      const okEnd = !needsEndBoundary || end === hay.length || !LATIN_EDGE.test(hay[end]);
      const overlaps = ranges.some((r) => start < r.end && end > r.start);
      if (okStart && okEnd && !overlaps) {
        ranges.push({ start, end, vocabId });
        used.add(vocabId);
        break;
      }
      from = start + 1;
    }
  }
  return ranges.sort((a, b) => a.start - b.start);
}

export type RenderPiece = { base: string; ruby?: string; vocabId?: string; start: number };

/**
 * Splits furigana segments along vocab-range boundaries so the renderer can
 * wrap highlighted words. Ruby segments are atomic (never split).
 */
export function buildPieces(text: string, vocab: VocabLike[]): RenderPiece[] {
  const segments = parseRuby(text);
  const plain = segments.map((s) => s.base).join("");
  const ranges = findVocabRanges(plain, vocab);
  const vocabAt = (pos: number) => ranges.find((r) => pos >= r.start && pos < r.end)?.vocabId;

  const pieces: RenderPiece[] = [];
  let pos = 0;
  for (const seg of segments) {
    if (seg.ruby) {
      // Ruby segments are atomic: tag them if any vocab range overlaps them.
      const end = pos + seg.base.length;
      const hit = ranges.find((r) => r.start < end && r.end > pos)?.vocabId;
      pieces.push({ base: seg.base, ruby: seg.ruby, vocabId: hit, start: pos });
      pos += seg.base.length;
      continue;
    }
    // Split plain segment at range boundaries.
    let chunkStart = 0;
    for (let i = 1; i <= seg.base.length; i++) {
      const prevVocab = vocabAt(pos + i - 1);
      const nextVocab = i < seg.base.length ? vocabAt(pos + i) : Symbol("end");
      if (prevVocab !== nextVocab) {
        pieces.push({ base: seg.base.slice(chunkStart, i), vocabId: prevVocab, start: pos + chunkStart });
        chunkStart = i;
      }
    }
    pos += seg.base.length;
  }
  return pieces;
}
