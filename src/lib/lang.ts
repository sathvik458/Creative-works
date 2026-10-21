import type { Level } from "@/content/schema";

/**
 * Per-language presentation rules. Stories declare `targetLanguage`; everything
 * that differs between languages (reading aids, labels, speech voice, level
 * names) is looked up here so screens stay language-agnostic.
 */
export type LangMeta = {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  /** BCP-47 tag for the Web Speech API. */
  speech: string;
  /** Preferred system voices, best first (matched by substring). */
  voices: string[];
  /** Whether {漢字|かな} ruby markup / furigana applies. */
  hasFurigana: boolean;
  /** What the line-level `reading` field contains, e.g. romaji or a stress guide. */
  readingLabel: string;
  readingHint: string;
  /** What the `translation` field contains. */
  translationLabel: string;
  /** Button that reveals the translation in "tap" mode. */
  revealLabel: string;
  /** Approximate level names (index 1–3). */
  levels: Record<Level, string>;
  /** Small decorative label on the ending screen. */
  endLabel: string;
  /** A sample line for previews (Settings, onboarding). */
  sample: { text: string; reading: string; translation: string };
  /** Icon for a finished review or challenge. */
  celebrate: string;
  /** What each level shows by default (Settings). */
  aidSummary: string;
};

export const LANGS: Record<string, LangMeta> = {
  ja: {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    flag: "🇯🇵",
    speech: "ja-JP",
    voices: ["Kyoko", "O-Ren", "Google 日本語", "Otoya", "Haruka", "Nanami"],
    hasFurigana: true,
    readingLabel: "Romaji",
    readingHint: "Japanese written in the Latin alphabet",
    translationLabel: "Translation",
    revealLabel: "訳 Show translation",
    levels: { 1: "JLPT N5", 2: "JLPT N4", 3: "JLPT N3" },
    endLabel: "おわり · THE END",
    sample: { text: "すみません、{駅|えき}はどこですか？", reading: "Sumimasen, eki wa doko desu ka?", translation: "Excuse me, where is the station?" },
    celebrate: "🌸",
    aidSummary: "Level defaults: L1 furigana + romaji + translation · L2 furigana, tap for translation · L3 no aids.",
  },
  en: {
    code: "en",
    name: "English",
    nativeName: "English",
    flag: "🇬🇧",
    speech: "en-GB",
    voices: ["Daniel", "Serena", "Kate", "Google UK English", "Arthur", "Martha", "Samantha", "Google US English"],
    hasFurigana: false,
    readingLabel: "Stress guide",
    readingHint: "CAPITALS show the syllables to stress (the word “I” is always a capital)",
    translationLabel: "Simple English",
    revealLabel: "💬 Say it simply",
    levels: { 1: "CEFR A1", 2: "CEFR A2", 3: "CEFR B1" },
    endLabel: "THE END",
    sample: { text: "Excuse me, where is the station?", reading: "ex-CUSE me, WHERE is the STA-tion?", translation: "I want to ask you something: where can I find the station?" },
    celebrate: "🎉",
    aidSummary: "Level defaults: L1 stress guide + simple English · L2 tap for simple English · L3 no aids. English stories never show a translation.",
  },
};

/** Languages shown in onboarding but not available yet. */
export const COMING_SOON = [
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
];

export function langMeta(code: string | undefined): LangMeta {
  return LANGS[code ?? "ja"] ?? LANGS.ja;
}

/** Puts language codes in one fixed order everywhere (the order of LANGS; unknown codes last). */
export function sortLangs(codes: Iterable<string>): string[] {
  const order = Object.keys(LANGS);
  const rank = (c: string) => (order.includes(c) ? order.indexOf(c) : order.length);
  return [...new Set(codes)].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/** Language-aware short gloss: Japanese shows romaji + “translation”; English shows stress + paraphrase. */
export function glossParts(code: string, reading?: string, translation?: string): { reading?: string; translation?: string } {
  const meta = langMeta(code);
  return {
    reading: reading || undefined,
    translation: translation ? (meta.hasFurigana ? `“${translation}”` : `= ${translation}`) : undefined,
  };
}
