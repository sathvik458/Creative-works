"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Level } from "@/content/schema";
import type { PlayState } from "@/engine/engine";
import type { AidOverrides } from "@/lib/aids";
import { computeStreak, dateKey } from "@/lib/dates";
import { STORAGE_KEY, storage } from "./storage";

export type TextSpeed = "slow" | "normal" | "fast" | "instant";
export type TextSize = "s" | "m" | "l" | "xl";
export type AudioRate = 0.75 | 1;

export type AudioSettings = {
  /** Show Listen buttons and allow speech. */
  enabled: boolean;
  rate: AudioRate;
  /** Speak each new Japanese line automatically. */
  autoplay: boolean;
};

export type Settings = {
  /** Hint level. "story" = use each episode's own level. */
  level: "story" | Level;
  aids: AidOverrides;
  textSpeed: TextSpeed;
  audio: AudioSettings;
  /** Short synthesized sound effects (choice chimes etc.). */
  sfx: boolean;
  textSize: TextSize;
  reduceMotion: boolean;
  highContrast: boolean;
};

export type Profile = {
  onboarded: boolean;
  targetLanguage: string;
  /** Self-reported approximate level, used to recommend where to start. */
  approxLevel: Level;
};

export type EpisodeProgress = {
  /** In-progress playthrough (resume point). */
  current: PlayState | null;
  /** The most recently finished playthrough (for the choice map / jump back). */
  lastRun: PlayState | null;
  /** Ending ids discovered, in discovery order. */
  endings: string[];
  /** Every choice id the player has ever picked (choice map shows explored branches). */
  choicesSeen: string[];
  plays: number;
};

export type VocabRecord = {
  storyId: string;
  vocabId: string;
  firstSeen: number;
  timesSeen: number;
  known: boolean;
};

export type MistakeRecord = {
  id: string;
  storyId: string;
  episodeId: string;
  sceneId: string;
  choiceId: string;
  /** Play state right before the choice — "Review" replays from here. */
  snapshot: PlayState;
  count: number;
  firstAt: number;
  lastAt: number;
  reviewed: boolean;
  reviewedAt?: number;
};

export type PhraseRecord = {
  id: string;
  text: string;
  reading: string;
  translation: string;
  /** Where it came from, e.g. "First Week in Tokyo · The Lost Ticket". */
  source: string;
  storyId?: string;
  /** Target language of the phrase (for the right voice). */
  lang?: string;
  /** Who said it / the situation. */
  context?: string;
  savedAt: number;
};

export type QuizRecord = {
  best: number;
  last: number;
  total: number;
  attempts: number;
  at: number;
};
export type DailyRecord = {
  challengeId: string;
  natural: number;
  total: number;
  xp: number;
  at: number;
};
export type SurvivalRecord = {
  best: number;
  runs: number;
  last: number;
  total: number;
};

type GameData = {
  progress: Record<string, EpisodeProgress>;
  vocab: Record<string, VocabRecord>;
  mistakes: Record<string, MistakeRecord>;
  phrases: Record<string, PhraseRecord>;
  quiz: Record<string, QuizRecord>;
  daily: Record<string, DailyRecord>;
  survival: Record<string, SurvivalRecord>;
  xp: number;
  activeDays: string[];
  settings: Settings;
  profile: Profile;
};

type GameActions = {
  saveCurrent: (
    storyId: string,
    episodeId: string,
    state: PlayState | null,
  ) => void;
  /** Records a choice; returns true the first time this choice is ever picked. */
  recordChoice: (
    storyId: string,
    episodeId: string,
    choiceId: string,
  ) => boolean;
  /** Finishes a run; returns true if the ending is newly discovered. */
  finishRun: (storyId: string, episodeId: string, state: PlayState) => boolean;
  /** Adds words to the notebook; returns ids that were new. */
  seeVocab: (storyId: string, vocabIds: string[]) => string[];
  setKnown: (storyId: string, vocabId: string, known: boolean) => void;
  removeWord: (storyId: string, vocabId: string) => void;
  recordMistake: (
    m: Omit<MistakeRecord, "id" | "count" | "firstAt" | "lastAt" | "reviewed">,
  ) => void;
  /** Returns true if this review newly clears the mistake. */
  markMistakeReviewed: (id: string) => boolean;
  togglePhrase: (p: Omit<PhraseRecord, "id" | "savedAt">) => boolean;
  recordQuiz: (key: string, score: number, total: number) => void;
  recordDaily: (key: string, r: Omit<DailyRecord, "at">) => void;
  recordSurvival: (key: string, score: number, total: number) => boolean;
  addXp: (amount: number) => void;
  setSettings: (patch: Partial<Settings>) => void;
  setAid: (patch: AidOverrides) => void;
  setAudio: (patch: Partial<AudioSettings>) => void;
  setProfile: (patch: Partial<Profile>) => void;
  resetProgress: () => void;
};

export const DEFAULT_SETTINGS: Settings = {
  level: "story",
  aids: {},
  textSpeed: "normal",
  audio: { enabled: true, rate: 1, autoplay: false },
  sfx: true,
  textSize: "m",
  reduceMotion: false,
  highContrast: false,
};

export const DEFAULT_PROFILE: Profile = {
  onboarded: false,
  targetLanguage: "ja",
  approxLevel: 1,
};

const emptyProgress = (): EpisodeProgress => ({
  current: null,
  lastRun: null,
  endings: [],
  choicesSeen: [],
  plays: 0,
});

export const progressKey = (storyId: string, episodeId: string) =>
  `${storyId}/${episodeId}`;
export const vocabKey = (storyId: string, vocabId: string) =>
  `${storyId}:${vocabId}`;
export const mistakeKey = (
  storyId: string,
  episodeId: string,
  choiceId: string,
) => `${storyId}/${episodeId}/${choiceId}`;

/** Stable id for a phrase (same text = same entry). */
export function phraseId(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (h * 33) ^ text.charCodeAt(i);
  return `p${(h >>> 0).toString(36)}`;
}

const EMPTY_DATA = (): Omit<GameData, "settings" | "profile"> => ({
  progress: {},
  vocab: {},
  mistakes: {},
  phrases: {},
  quiz: {},
  daily: {},
  survival: {},
  xp: 0,
  activeDays: [],
});

export const useGame = create<GameData & GameActions>()(
  persist(
    (set, get) => {
      const updateEp = (
        storyId: string,
        episodeId: string,
        fn: (p: EpisodeProgress) => EpisodeProgress,
      ) =>
        set((s) => {
          const key = progressKey(storyId, episodeId);
          return {
            progress: {
              ...s.progress,
              [key]: fn(s.progress[key] ?? emptyProgress()),
            },
          };
        });

      return {
        ...EMPTY_DATA(),
        settings: DEFAULT_SETTINGS,
        profile: DEFAULT_PROFILE,

        saveCurrent: (storyId, episodeId, state) =>
          updateEp(storyId, episodeId, (p) => ({ ...p, current: state })),

        recordChoice: (storyId, episodeId, choiceId) => {
          const seen =
            get().progress[progressKey(storyId, episodeId)]?.choicesSeen ?? [];
          if (seen.includes(choiceId)) return false;
          updateEp(storyId, episodeId, (p) => ({
            ...p,
            choicesSeen: [...p.choicesSeen, choiceId],
          }));
          return true;
        },

        finishRun: (storyId, episodeId, state) => {
          const before = get().progress[progressKey(storyId, episodeId)];
          const isNew =
            !!state.endingId &&
            !(before?.endings ?? []).includes(state.endingId);
          updateEp(storyId, episodeId, (p) => ({
            ...p,
            current: null,
            lastRun: state,
            plays: p.plays + 1,
            endings: isNew ? [...p.endings, state.endingId!] : p.endings,
          }));
          return isNew;
        },

        seeVocab: (storyId, vocabIds) => {
          const now = Date.now();
          const vocab = { ...get().vocab };
          const added: string[] = [];
          for (const id of vocabIds) {
            const key = vocabKey(storyId, id);
            const rec = vocab[key];
            if (rec) vocab[key] = { ...rec, timesSeen: rec.timesSeen + 1 };
            else {
              vocab[key] = {
                storyId,
                vocabId: id,
                firstSeen: now,
                timesSeen: 1,
                known: false,
              };
              added.push(id);
            }
          }
          set({ vocab });
          return added;
        },

        removeWord: (storyId, vocabId) =>
          set((s) => {
            const vocab = { ...s.vocab };
            delete vocab[vocabKey(storyId, vocabId)];
            return { vocab };
          }),

        setKnown: (storyId, vocabId, known) =>
          set((s) => {
            const key = vocabKey(storyId, vocabId);
            const rec = s.vocab[key] ?? {
              storyId,
              vocabId,
              firstSeen: Date.now(),
              timesSeen: 1,
              known,
            };
            return { vocab: { ...s.vocab, [key]: { ...rec, known } } };
          }),

        recordMistake: (m) =>
          set((s) => {
            const id = mistakeKey(m.storyId, m.episodeId, m.choiceId);
            const prev = s.mistakes[id];
            const now = Date.now();
            return {
              mistakes: {
                ...s.mistakes,
                [id]: prev
                  ? {
                      ...prev,
                      ...m,
                      count: prev.count + 1,
                      lastAt: now,
                      reviewed: false,
                    }
                  : {
                      ...m,
                      id,
                      count: 1,
                      firstAt: now,
                      lastAt: now,
                      reviewed: false,
                    },
              },
            };
          }),

        markMistakeReviewed: (id) => {
          const m = get().mistakes[id];
          if (!m || m.reviewed) return false;
          set((s) => ({
            mistakes: {
              ...s.mistakes,
              [id]: { ...m, reviewed: true, reviewedAt: Date.now() },
            },
          }));
          return true;
        },

        togglePhrase: (p) => {
          const id = phraseId(p.text);
          const exists = !!get().phrases[id];
          set((s) => {
            const phrases = { ...s.phrases };
            if (exists) delete phrases[id];
            else phrases[id] = { ...p, id, savedAt: Date.now() };
            return { phrases };
          });
          return !exists;
        },

        recordQuiz: (key, score, total) =>
          set((s) => {
            const prev = s.quiz[key];
            return {
              quiz: {
                ...s.quiz,
                [key]: {
                  best: Math.max(prev?.best ?? 0, score),
                  last: score,
                  total,
                  attempts: (prev?.attempts ?? 0) + 1,
                  at: Date.now(),
                },
              },
            };
          }),

        recordDaily: (key, r) =>
          set((s) => ({
            daily: { ...s.daily, [key]: { ...r, at: Date.now() } },
          })),

        recordSurvival: (key, score, total) => {
          const prev = get().survival[key];
          const isBest = score > (prev?.best ?? -1);
          set((s) => ({
            survival: {
              ...s.survival,
              [key]: {
                best: Math.max(prev?.best ?? 0, score),
                runs: (prev?.runs ?? 0) + 1,
                last: score,
                total,
              },
            },
          }));
          return isBest;
        },

        addXp: (amount) =>
          set((s) => {
            const today = dateKey();
            const activeDays = s.activeDays.includes(today)
              ? s.activeDays
              : [...s.activeDays, today].slice(-120);
            return { xp: s.xp + Math.max(0, amount), activeDays };
          }),

        setSettings: (patch) =>
          set((s) => {
            const next = { ...s.settings, ...patch };
            // Changing the level resets manual aid overrides so the level's defaults show.
            if (
              patch.level !== undefined &&
              patch.level !== s.settings.level &&
              patch.aids === undefined
            )
              next.aids = {};
            return { settings: next };
          }),

        setAid: (patch) =>
          set((s) => ({
            settings: { ...s.settings, aids: { ...s.settings.aids, ...patch } },
          })),

        setAudio: (patch) =>
          set((s) => ({
            settings: {
              ...s.settings,
              audio: { ...s.settings.audio, ...patch },
            },
          })),

        setProfile: (patch) =>
          set((s) => ({ profile: { ...s.profile, ...patch } })),

        resetProgress: () => set({ ...EMPTY_DATA() }),
      };
    },
    {
      name: STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => storage),
      skipHydration: true,
      partialize: (s) => ({
        progress: s.progress,
        vocab: s.vocab,
        mistakes: s.mistakes,
        phrases: s.phrases,
        quiz: s.quiz,
        daily: s.daily,
        survival: s.survival,
        xp: s.xp,
        activeDays: s.activeDays,
        settings: s.settings,
        profile: s.profile,
      }),
      // v1 → v2: keep progress/vocab/settings and add the new collections.
      migrate: (persisted) => {
        const old = (persisted ?? {}) as Partial<GameData>;
        return {
          ...EMPTY_DATA(),
          ...old,
          settings: {
            ...DEFAULT_SETTINGS,
            ...(old.settings ?? {}),
            audio: {
              ...DEFAULT_SETTINGS.audio,
              ...(old.settings?.audio ?? {}),
            },
          },
          profile: { ...DEFAULT_PROFILE, ...(old.profile ?? {}) },
        } as GameData;
      },
      // Fill in any new settings fields for stores written by this same version.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<GameData>;
        return {
          ...current,
          ...p,
          settings: {
            ...DEFAULT_SETTINGS,
            ...(p.settings ?? {}),
            audio: { ...DEFAULT_SETTINGS.audio, ...(p.settings?.audio ?? {}) },
          },
          profile: { ...DEFAULT_PROFILE, ...(p.profile ?? {}) },
        };
      },
    },
  ),
);

/** True once persisted data has been loaded on the client. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useGame.persist.hasHydrated());
  useEffect(() => {
    const unsub = useGame.persist.onFinishHydration(() => setHydrated(true));
    if (!useGame.persist.hasHydrated()) void useGame.persist.rehydrate();
    else setHydrated(true);
    return unsub;
  }, []);
  return hydrated;
}

export function useEpisodeProgress(
  storyId: string,
  episodeId: string,
): EpisodeProgress {
  return useGame((s) => s.progress[progressKey(storyId, episodeId)]) ?? EMPTY;
}
const EMPTY: EpisodeProgress = emptyProgress();

export function useStreak(): number {
  const days = useGame((s) => s.activeDays);
  return computeStreak(days);
}
