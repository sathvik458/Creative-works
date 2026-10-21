import type { Choice, Episode, Expression, Quality, Scene, Skill } from "@/content/schema";
import type { PlayState, Stats } from "@/engine/engine";

/**
 * Learning-oriented scoring. Every number describes the CHOICES made in one
 * playthrough — never the learner's ability.
 */

/** XP for exploring a choice the first time (replays don't farm XP). */
export const CHOICE_XP: Record<Quality, number> = { natural: 10, understandable: 6, awkward: 4, wrong: 3 };
export const XP = {
  newEnding: 25,
  repeatEnding: 5,
  quizCorrect: 5,
  mistakeReviewed: 10,
  dailyBase: 15,
  dailyNatural: 10,
  survivalRound: 5,
} as const;

export type Tally = { hit: number; total: number };
export type RunSummary = {
  naturalness: Tally;
  comprehension: Tally;
  politeness: Tally;
  bySkill: Partial<Record<Skill, Tally>>;
};

/** Finds the choice made at each history step. */
export function runChoices(episode: Episode, run: Pick<PlayState, "history">): { scene: Scene; choice: Choice }[] {
  return run.history.flatMap((h) => {
    const scene = episode.scenes[h.sceneId];
    const choice = scene?.choices?.find((c) => c.id === h.choiceId);
    return scene && choice ? [{ scene, choice }] : [];
  });
}

export function summarizeRun(episode: Episode, run: Pick<PlayState, "history">): RunSummary {
  const made = runChoices(episode, run);
  const tally = (pred: (x: { scene: Scene; choice: Choice }) => boolean, ok: (q: Quality) => boolean): Tally => {
    const rel = made.filter(pred);
    return { hit: rel.filter((x) => ok(x.choice.quality)).length, total: rel.length };
  };
  const natural = (q: Quality) => q === "natural";
  const bySkill: Partial<Record<Skill, Tally>> = {};
  for (const { scene } of made) {
    if (scene.skill && !bySkill[scene.skill]) bySkill[scene.skill] = tally((x) => x.scene.skill === scene.skill, natural);
  }
  return {
    naturalness: tally(() => true, natural),
    // "Understood" = the reply actually answered what was asked.
    comprehension: tally((x) => x.scene.skill === "comprehension", natural),
    politeness: tally((x) => x.scene.skill === "politeness", natural),
    bySkill,
  };
}

/** The natural/correct version of an answer (for feedback and the mistake journal). */
export function naturalVersion(scene: Scene | undefined, choice: Choice): Choice | undefined {
  if (!scene?.choices || choice.quality === "natural") return undefined;
  if (choice.better) return scene.choices.find((c) => c.id === choice.better);
  return scene.choices.find((c) => c.quality === "natural" && c.id !== choice.id);
}

/* ---------- NPC relationship state ---------- */

export type Mood = "impressed" | "friendly" | "neutral" | "confused" | "uneasy";

export const MOOD_META: Record<Mood, { label: string; emoji: string; expression: Expression | null; color: string }> = {
  impressed: { label: "Impressed", emoji: "🤩", expression: "happy", color: "#e09b00" },
  friendly: { label: "Friendly", emoji: "😊", expression: "smile", color: "#2fa565" },
  neutral: { label: "Neutral", emoji: "🙂", expression: null, color: "#5d5470" },
  confused: { label: "Confused", emoji: "😕", expression: null, color: "#3b8fd9" },
  uneasy: { label: "Uneasy", emoji: "😬", expression: "sad", color: "#e0465e" },
};

/**
 * How the NPCs currently feel, based only on what has already happened
 * (accumulated stats + the last choice) — it never hints at future endings.
 */
export function npcMood(stats: Stats, choicesMade: number, lastQuality?: Quality): Mood {
  if (stats.trust < 0) return "uneasy";
  if (lastQuality === "awkward" || lastQuality === "wrong") return "confused";
  if (choicesMade >= 2 && stats.fluency >= choicesMade * 1.6 && stats.trust >= choicesMade * 0.8) return "impressed";
  if (stats.trust >= 1) return "friendly";
  return "neutral";
}

/** NPC expression with mood applied: only "neutral" faces are tinted by mood. */
export function moodExpression(base: Expression, mood: Mood): Expression {
  if (base !== "neutral") return base;
  return MOOD_META[mood].expression ?? base;
}
