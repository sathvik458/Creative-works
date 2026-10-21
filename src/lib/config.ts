/** Branding lives here — rename the app in one place. */
export const APP_NAME = "Language Stories";
export const APP_TAGLINE = "Your words change the story.";

export const ENDING_TYPE_META = {
  best: {
    label: "Best ending",
    short: "Best",
    color: "#855b17",
    bg: "#fff4d1",
    icon: "★",
  },
  good: {
    label: "Good ending",
    short: "Good",
    color: "#236446",
    bg: "#dcf5e6",
    icon: "✿",
  },
  awkward: {
    label: "Awkward ending",
    short: "Awkward",
    color: "#92551f",
    bg: "#ffe8d2",
    icon: "☂",
  },
  hidden: {
    label: "Hidden ending",
    short: "Hidden",
    color: "#594566",
    bg: "#eee8ef",
    icon: "✦",
  },
} as const;

export const QUALITY_META = {
  natural: { label: "Natural!", color: "#236446", bg: "#e3f7eb", emoji: "✨" },
  understandable: {
    label: "Understandable",
    color: "#295c79",
    bg: "#e2effb",
    emoji: "👍",
  },
  awkward: {
    label: "A bit awkward",
    color: "#92551f",
    bg: "#fff0e0",
    emoji: "😅",
  },
  wrong: { label: "Oops!", color: "#a73348", bg: "#ffe5ea", emoji: "💦" },
} as const;

export const QUALITY_EXPRESSION = {
  natural: "happy",
  understandable: "neutral",
  awkward: "confused",
  wrong: "surprised",
} as const;
