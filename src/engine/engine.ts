import type { Choice, Effects, Ending, Episode, Scene } from "@/content/schema";
import { evaluateCondition, type Stats } from "./conditions";

/**
 * Pure, framework-free game engine. Every function takes a state and returns a
 * new one — no mutation — so it is trivial to test, persist and rewind.
 */

export type { Stats } from "./conditions";

export type HistoryEntry = {
  /** Scene where the choice was made. */
  sceneId: string;
  choiceId: string;
  /** Stats just before the choice (used to rewind). */
  statsBefore: Stats;
};

export type PlayState = {
  episodeId: string;
  sceneId: string;
  stats: Stats;
  history: HistoryEntry[];
  /** Set once an ending is reached. */
  endingId: string | null;
};

export const INITIAL_STATS: Stats = { trust: 0, fluency: 0 };
const MAX_AUTO_HOPS = 50;

export class EngineError extends Error {}

export function getScene(episode: Episode, sceneId: string): Scene {
  const scene = episode.scenes[sceneId];
  if (!scene) throw new EngineError(`Scene "${sceneId}" not found in episode "${episode.id}"`);
  return scene;
}

export function getEnding(episode: Episode, endingId: string): Ending {
  const ending = episode.endings.find((e) => e.id === endingId);
  if (!ending) throw new EngineError(`Ending "${endingId}" not found in episode "${episode.id}"`);
  return ending;
}

export function applyEffects(stats: Stats, effects: Effects | undefined): Stats {
  return {
    trust: stats.trust + (effects?.trust ?? 0),
    fluency: stats.fluency + (effects?.fluency ?? 0),
  };
}

export function chosenSet(state: Pick<PlayState, "history">): Set<string> {
  return new Set(state.history.map((h) => h.choiceId));
}

/** What the player should see at the current scene once its lines are done. */
export type SceneExit =
  | { kind: "choices"; choices: Choice[] }
  | { kind: "next"; sceneId: string }
  | { kind: "ending"; endingId: string };

export function sceneExit(episode: Episode, state: PlayState): SceneExit {
  const scene = getScene(episode, state.sceneId);
  if (scene.choices?.length) return { kind: "choices", choices: scene.choices };
  if (scene.endingId) return { kind: "ending", endingId: scene.endingId };
  if (scene.next) return { kind: "next", sceneId: scene.next };
  if (scene.routes) {
    const ctx = { stats: state.stats, chosen: chosenSet(state) };
    for (const route of scene.routes) {
      if (route.else || (route.if && evaluateCondition(route.if, ctx))) {
        return route.endingId ? { kind: "ending", endingId: route.endingId } : { kind: "next", sceneId: route.next! };
      }
    }
    throw new EngineError(`No route matched in scene "${state.sceneId}" (missing else?)`);
  }
  throw new EngineError(`Scene "${state.sceneId}" has no exit (choices/next/routes/endingId)`);
}

/**
 * Moves to `sceneId`, then skips through any line-less routing scenes until we
 * land on a scene with something to show, or an ending.
 */
export function enterScene(episode: Episode, state: PlayState, sceneId: string): PlayState {
  let s: PlayState = { ...state, sceneId };
  for (let hops = 0; hops < MAX_AUTO_HOPS; hops++) {
    const scene = getScene(episode, s.sceneId);
    if (scene.lines.length > 0) return s;
    const exit = sceneExit(episode, s);
    if (exit.kind === "choices") return s;
    if (exit.kind === "ending") return { ...s, endingId: exit.endingId };
    s = { ...s, sceneId: exit.sceneId };
  }
  throw new EngineError(`Routing loop detected near scene "${s.sceneId}"`);
}

export function startEpisode(episode: Episode): PlayState {
  const base: PlayState = {
    episodeId: episode.id,
    sceneId: episode.startScene,
    stats: { ...INITIAL_STATS },
    history: [],
    endingId: null,
  };
  return enterScene(episode, base, episode.startScene);
}

/** Called when the current scene's lines are finished and it has no choices. */
export function advance(episode: Episode, state: PlayState): PlayState {
  if (state.endingId) return state;
  const exit = sceneExit(episode, state);
  switch (exit.kind) {
    case "choices":
      throw new EngineError(`Scene "${state.sceneId}" is waiting for a choice`);
    case "ending":
      return { ...state, endingId: exit.endingId };
    case "next":
      return enterScene(episode, state, exit.sceneId);
  }
}

export type ChoiceResult = { state: PlayState; choice: Choice; delta: Effects };

export function choose(episode: Episode, state: PlayState, choiceId: string): ChoiceResult {
  if (state.endingId) throw new EngineError("Episode already ended");
  const scene = getScene(episode, state.sceneId);
  const choice = scene.choices?.find((c) => c.id === choiceId);
  if (!choice) throw new EngineError(`Choice "${choiceId}" is not available in scene "${state.sceneId}"`);

  const afterChoice: PlayState = {
    ...state,
    stats: applyEffects(state.stats, choice.effects),
    history: [...state.history, { sceneId: state.sceneId, choiceId, statsBefore: state.stats }],
  };
  const next = choice.endingId
    ? { ...afterChoice, endingId: choice.endingId }
    : enterScene(episode, afterChoice, choice.next!);
  return { state: next, choice, delta: choice.effects ?? {} };
}

/** Rewinds to the choice point at `historyIndex` (the choice is undone). */
export function rewindTo(state: PlayState, historyIndex: number): PlayState {
  const entry = state.history[historyIndex];
  if (!entry) throw new EngineError(`No choice point #${historyIndex}`);
  return {
    episodeId: state.episodeId,
    sceneId: entry.sceneId,
    stats: { ...entry.statsBefore },
    history: state.history.slice(0, historyIndex),
    endingId: null,
  };
}

/**
 * Enumerates every possible playthrough (all choice combinations) and returns
 * the set of reachable ending ids. Used by tests and the validator.
 */
export function reachableEndings(episode: Episode, limit = 100_000): { endings: Set<string>; paths: number } {
  const endings = new Set<string>();
  let paths = 0;
  const walk = (state: PlayState) => {
    if (paths > limit) throw new EngineError("Too many paths to enumerate");
    if (state.endingId) {
      endings.add(state.endingId);
      paths++;
      return;
    }
    const exit = sceneExit(episode, state);
    if (exit.kind === "choices") {
      for (const c of exit.choices) walk(choose(episode, state, c.id).state);
    } else {
      walk(advance(episode, state));
    }
  };
  walk(startEpisode(episode));
  return { endings, paths };
}
