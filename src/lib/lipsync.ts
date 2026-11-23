/**
 * Lip sync for the Yap Rive character.
 *
 * The Rive file only needs one number, `mouth` (0-8), while Yap talks. This module turns the
 * timing sources we have into mouth cues, and finds the cue for the current audio time.
 * Mouth shapes follow Rhubarb Lip Sync: X A B C D E F G H (see docs/rive/RIVE_BUILD_GUIDE.md).
 */

export const MOUTH_SHAPES = ["X", "A", "B", "C", "D", "E", "F", "G", "H"] as const;
export type MouthShape = (typeof MOUTH_SHAPES)[number];

/** Show `mouth` from `start` (seconds from the start of the audio) until the next cue. */
export type MouthCue = { start: number; mouth: number };

/** Rhubarb shape letter → mouth number. Unknown letters become the rest shape (0). */
export function mouthFromShape(shape: string): number {
  const i = MOUTH_SHAPES.indexOf(shape as MouthShape);
  return i < 0 ? 0 : i;
}

type RhubarbJson = { mouthCues: { start: number; end: number; value: string }[] };

/** Cues from Rhubarb's JSON output (`rhubarb -f json ...`), for pre-made audio files. */
export function cuesFromRhubarb(json: RhubarbJson): MouthCue[] {
  const sorted = [...json.mouthCues].sort((a, b) => a.start - b.start);
  const cues = sorted.map((c) => ({ start: c.start, mouth: mouthFromShape(c.value) }));
  const last = sorted[sorted.length - 1];
  if (last) cues.push({ start: last.end, mouth: 0 });
  return cues;
}

/**
 * Azure text-to-speech viseme ID (0-21) → mouth number.
 * 0 silence · 1 æ ə ʌ · 2 ɑ · 3 ɔ · 4 ɛ ʊ · 5 ɝ · 6 j i ɪ · 7 w u · 8 o · 9 aʊ · 10 ɔɪ · 11 aɪ ·
 * 12 h · 13 ɹ · 14 l · 15 s z · 16 ʃ tʃ dʒ ʒ · 17 ð · 18 f v · 19 d t n θ · 20 k g ŋ · 21 p b m
 */
export const AZURE_VISEME_TO_MOUTH: readonly number[] = [0, 3, 4, 5, 3, 5, 2, 6, 5, 4, 5, 4, 3, 5, 8, 2, 2, 8, 7, 2, 2, 1];

/** Cues from Azure Speech SDK `VisemeReceived` events (offset converted to milliseconds). */
export function cuesFromAzureVisemes(events: { visemeId: number; audioOffsetMs: number }[]): MouthCue[] {
  return [...events]
    .sort((a, b) => a.audioOffsetMs - b.audioOffsetMs)
    .map((e) => ({ start: e.audioOffsetMs / 1000, mouth: AZURE_VISEME_TO_MOUTH[e.visemeId] ?? 0 }));
}

export type TextTimeline = {
  cues: MouthCue[];
  /** Where each word sits in the text and when it is (roughly) spoken, for caption highlighting. */
  words: { index: number; length: number; start: number; end: number }[];
  duration: number;
};

const DIGRAPHS: Record<string, number> = {
  th: 8, sh: 2, ch: 2, ph: 7, wh: 6, oo: 6, ou: 5, ow: 6, ee: 2, ea: 2,
  ai: 3, ay: 3, oa: 5, oi: 5, oy: 5, qu: 6, ng: 2, ck: 2, ll: 8,
};
const SINGLE: Record<string, number> = { a: 4, e: 3, i: 3, o: 5, u: 3, y: 2, w: 6, m: 1, b: 1, p: 1, f: 7, v: 7, l: 8, r: 5 };
const OPEN_SHAPES = new Set([3, 4, 5, 6]);

/** Rough letters → mouth shapes for one English word. */
export function wordShapes(word: string): number[] {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  const out: number[] = [];
  for (let i = 0; i < w.length; ) {
    const two = w.slice(i, i + 2);
    if (two in DIGRAPHS) {
      out.push(DIGRAPHS[two]);
      i += 2;
      continue;
    }
    const c = w[i];
    if (!(c === "e" && i === w.length - 1 && w.length > 3)) out.push(c in SINGLE ? SINGLE[c] : 2); // skip a silent final e
    i += 1;
  }
  return out.filter((m, i) => i === 0 || m !== out[i - 1]);
}

/**
 * Estimated cues for browser speech, which reports no timings. Approximate by design:
 * use Rhubarb or Azure visemes wherever real audio timing exists.
 */
export function cuesFromText(text: string, rate = 1): TextTimeline {
  const k = 1 / rate;
  const cues: MouthCue[] = [];
  const words: TextTimeline["words"] = [];
  let t = 0.12 * k;
  for (const m of text.matchAll(/([A-Za-z'’]+)|([,;:])|([.!?]+)/g)) {
    if (m[1]) {
      const start = t;
      const shapes = wordShapes(m[1]);
      for (const s of shapes) {
        cues.push({ start: t, mouth: s });
        t += (OPEN_SHAPES.has(s) ? 0.095 : 0.062) * k;
      }
      if (!shapes.length) t += 0.09 * k;
      words.push({ index: m.index ?? 0, length: m[1].length, start, end: t });
      cues.push({ start: t, mouth: 0 });
      t += 0.045 * k;
    } else {
      cues.push({ start: t, mouth: 0 });
      t += (m[2] ? 0.2 : 0.36) * k;
    }
  }
  cues.push({ start: t, mouth: 0 });
  return { cues, words, duration: t };
}

/** The mouth number to show at `time` seconds. Cues must be sorted by start. */
export function mouthAt(cues: MouthCue[], time: number): number {
  let lo = 0;
  let hi = cues.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].start <= time) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found < 0 ? 0 : cues[found].mouth;
}
