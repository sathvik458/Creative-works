import { z } from "zod";

/**
 * Content schema for Language Stories.
 *
 * Every story lives in /content/stories/<id>.json and is validated with these
 * schemas (shape) plus `validateStory` in ./validate.ts (graph + reference checks).
 *
 * Text markup inside `text` fields:
 *   {漢字|かんじ}   → base text with a furigana reading (rendered as <ruby>)
 * Vocab highlighting is automatic: each id in `vocabRefs` is matched against
 * the line's plain text using the vocab entry's `term` or any of its `forms`.
 */

export const EXPRESSIONS = ["neutral", "smile", "happy", "confused", "surprised", "sad"] as const;
export const ExpressionSchema = z.enum(EXPRESSIONS);
export type Expression = z.infer<typeof ExpressionSchema>;

export const QUALITIES = ["natural", "understandable", "awkward", "wrong"] as const;
export const QualitySchema = z.enum(QUALITIES);
export type Quality = z.infer<typeof QualitySchema>;

export const ENDING_TYPES = ["best", "good", "awkward", "hidden"] as const;
export const EndingTypeSchema = z.enum(ENDING_TYPES);
export type EndingType = z.infer<typeof EndingTypeSchema>;

/** What a choice point mainly tests (drives the episode summary). */
export const SKILLS = ["politeness", "comprehension", "grammar", "culture", "vocabulary"] as const;
export const SkillSchema = z.enum(SKILLS);
export type Skill = z.infer<typeof SkillSchema>;

export const LevelSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type Level = z.infer<typeof LevelSchema>;

const id = z.string().min(1).regex(/^[A-Za-z0-9_-]+$/, "ids may only contain letters, digits, _ and -");

/** Placeholder look used to draw a sprite when no sprite image is provided. */
export const CharacterLookSchema = z.object({
  hair: z.string().default("#3b2a26"),
  hairStyle: z.enum(["short", "spiky", "bob", "long", "cap"]).default("short"),
  skin: z.string().default("#f6d3b8"),
  outfit: z.string().default("#5b7bd5"),
  accent: z.string().default("#ffffff"),
});
export type CharacterLook = z.infer<typeof CharacterLookSchema>;

export const CharacterSchema = z.object({
  id,
  name: z.string(),
  nameNative: z.string().optional(),
  role: z.string().optional(),
  color: z.string().default("#ff6f91"),
  /** Optional real art, keyed by expression. Falls back to the placeholder `look`. */
  sprites: z.partialRecord(ExpressionSchema, z.string()).optional(),
  look: CharacterLookSchema.optional(),
});
export type Character = z.infer<typeof CharacterSchema>;

export const VocabSchema = z.object({
  id,
  term: z.string(),
  /** Other surface forms that should also highlight this entry (conjugations, kanji/kana variants). */
  forms: z.array(z.string()).optional(),
  reading: z.string(),
  romaji: z.string().optional(),
  meaning: z.string(),
  pos: z.string(),
  example: z.string(),
  exampleTranslation: z.string().optional(),
  /** Episode that introduces this word (used for summaries/filters). */
  episode: z.string().optional(),
});
export type Vocab = z.infer<typeof VocabSchema>;

/** Special speakers that are not characters. */
export const NARRATOR = "narrator";
export const PLAYER = "you";

export const LineSchema = z.object({
  speaker: z.string(),
  expression: ExpressionSchema.optional(),
  text: z.string().min(1),
  /** Romanized reading of the whole line (target-language lines only). */
  reading: z.string().optional(),
  /** Translation into the learner's native language (target-language lines only). */
  translation: z.string().optional(),
  vocabRefs: z.array(z.string()).optional(),
});
export type Line = z.infer<typeof LineSchema>;

export const EffectsSchema = z.object({
  trust: z.number().int().optional(),
  fluency: z.number().int().optional(),
});
export type Effects = z.infer<typeof EffectsSchema>;

export const ChoiceSchema = z
  .object({
    id,
    text: z.string().min(1),
    reading: z.string(),
    translation: z.string(),
    quality: QualitySchema,
    effects: EffectsSchema.default({}),
    feedback: z.string().min(1),
    /** Longer, expandable "Why?" explanation: the grammar, register, vocab or culture point involved. */
    why: z.string().optional(),
    /** Id of the natural version of this answer (defaults to the first "natural" choice in the scene). */
    better: z.string().optional(),
    /** Expression the reacting character switches to (defaults by quality). */
    reactionExpression: ExpressionSchema.optional(),
    /** Short lines played right after the feedback (the NPC's reaction). */
    reaction: z.array(LineSchema).optional(),
    vocabRefs: z.array(z.string()).optional(),
    next: z.string().optional(),
    endingId: z.string().optional(),
  })
  .refine((c) => Boolean(c.next) !== Boolean(c.endingId), {
    message: "a choice needs exactly one of `next` or `endingId`",
  });
export type Choice = z.infer<typeof ChoiceSchema>;

export const RouteSchema = z
  .object({
    if: z.string().optional(),
    else: z.union([z.literal(true), z.string()]).optional(),
    next: z.string().optional(),
    endingId: z.string().optional(),
  })
  .transform((r) => {
    // Support the shorthand `{ "else": "s10b" }` from the spec.
    if (typeof r.else === "string") return { if: undefined, else: true as const, next: r.else, endingId: r.endingId };
    return r;
  })
  .refine((r) => Boolean(r.if) !== Boolean(r.else), { message: "a route needs exactly one of `if` or `else`" })
  .refine((r) => Boolean(r.next) !== Boolean(r.endingId), {
    message: "a route needs exactly one of `next` or `endingId`",
  });
export type Route = z.infer<typeof RouteSchema>;

export const SceneSchema = z.object({
  background: z.string().optional(),
  /** Characters on stage (max 2). Defaults to whoever spoke last. */
  cast: z.array(z.string()).max(2).optional(),
  /** What this choice point mainly tests (for the episode summary). */
  skill: SkillSchema.optional(),
  lines: z.array(LineSchema).default([]),
  choices: z.array(ChoiceSchema).min(2).max(4).optional(),
  next: z.string().optional(),
  routes: z.array(RouteSchema).min(1).optional(),
  endingId: z.string().optional(),
});
export type Scene = z.infer<typeof SceneSchema>;

export const EndingSchema = z.object({
  id,
  title: z.string(),
  titleNative: z.string().optional(),
  type: EndingTypeSchema,
  image: z.string().optional(),
  /** Character shown on the ending card. */
  character: z.string().optional(),
  expression: ExpressionSchema.optional(),
  summary: z.string(),
  teachingPoint: z.string(),
});
export type Ending = z.infer<typeof EndingSchema>;

/* ---------- Mini scenarios (Daily Challenge & Survival Mode) ---------- */

export const MiniChoiceSchema = z.object({
  id,
  text: z.string().min(1),
  reading: z.string(),
  translation: z.string(),
  quality: QualitySchema,
  feedback: z.string().min(1),
  why: z.string().optional(),
});
export type MiniChoice = z.infer<typeof MiniChoiceSchema>;

export const MiniStepSchema = z.object({
  speaker: z.string(),
  expression: ExpressionSchema.optional(),
  text: z.string().min(1),
  reading: z.string(),
  translation: z.string(),
  choices: z.array(MiniChoiceSchema).min(2).max(4),
});
export type MiniStep = z.infer<typeof MiniStepSchema>;

export const MiniScenarioSchema = z.object({
  id,
  title: z.string(),
  /** One or two sentences in the learner's language setting the scene. */
  context: z.string(),
  background: z.string().optional(),
  skill: SkillSchema.optional(),
  steps: z.array(MiniStepSchema).min(1).max(2),
});
export type MiniScenario = z.infer<typeof MiniScenarioSchema>;

/* ---------- Episode review (after the ending) ---------- */

export const ReviewSchema = z.object({
  phrases: z
    .array(z.object({ text: z.string(), reading: z.string(), translation: z.string(), note: z.string().optional() }))
    .min(1),
  grammar: z
    .array(
      z.object({
        title: z.string(),
        explanation: z.string(),
        example: z.string().optional(),
        exampleTranslation: z.string().optional(),
      }),
    )
    .min(1),
  quiz: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).min(2).max(4),
        answer: z.number().int().min(0),
        explanation: z.string(),
      }),
    )
    .min(3),
});
export type Review = z.infer<typeof ReviewSchema>;

export const EpisodeSchema = z.object({
  id,
  title: z.string(),
  titleNative: z.string().optional(),
  /** Overrides the story level for this episode. */
  level: LevelSchema.optional(),
  goal: z.string().optional(),
  synopsis: z.string().optional(),
  startScene: z.string(),
  scenes: z.record(z.string(), SceneSchema),
  endings: z.array(EndingSchema).min(1),
  review: ReviewSchema.optional(),
  /** Related-but-new situations used by Survival Mode (unlocked after any ending). */
  survival: z.array(MiniScenarioSchema).optional(),
});
export type Episode = z.infer<typeof EpisodeSchema>;

export const StorySchema = z.object({
  id,
  title: z.string(),
  titleNative: z.string().optional(),
  level: LevelSchema,
  targetLanguage: z.string(),
  nativeLanguage: z.string(),
  /** Optional speech voice override for Listen buttons, e.g. "en-GB" (defaults per language). */
  speechLang: z.string().optional(),
  synopsis: z.string(),
  coverImage: z.string(),
  accent: z.string().default("#ff6f91"),
  characters: z.array(CharacterSchema),
  vocab: z.array(VocabSchema),
  episodes: z.array(EpisodeSchema).min(1),
});
export type Story = z.infer<typeof StorySchema>;
/** Shape as written in JSON (before defaults are applied). */
export type StoryInput = z.input<typeof StorySchema>;

/* ---------- Daily challenges (content/daily/challenges.json) ---------- */

export const DailyFileSchema = z.object({
  /** Target language of these challenges (one file per language). */
  language: z.string().default("ja"),
  /** Optional speech voice override, e.g. "en-US". */
  speechLang: z.string().optional(),
  characters: z.array(CharacterSchema),
  challenges: z.array(MiniScenarioSchema).min(1),
});
export type DailyFile = z.infer<typeof DailyFileSchema>;
