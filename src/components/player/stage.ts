import type { Episode, Expression, Line, Scene } from "@/content/schema";
import { NARRATOR, PLAYER } from "@/content/schema";
import type { PlayState } from "@/engine/engine";

/** Who is on stage, with which expression, and who is talking. */
export type Stage = { cast: string[]; expr: Record<string, Expression>; speaker: string | null };

export const EMPTY_STAGE: Stage = { cast: [], expr: {}, speaker: null };

const isCharacter = (speaker: string) => speaker !== NARRATOR && speaker !== PLAYER;

export function enterSceneStage(stage: Stage, scene: Scene): Stage {
  if (!scene.cast) return { ...stage, speaker: null };
  const expr: Record<string, Expression> = {};
  for (const id of scene.cast) expr[id] = stage.expr[id] ?? "neutral";
  return { cast: [...scene.cast], expr, speaker: null };
}

export function applyLine(stage: Stage, line: Line): Stage {
  if (!isCharacter(line.speaker)) return { ...stage, speaker: line.speaker };
  let cast = stage.cast;
  if (!cast.includes(line.speaker)) {
    cast = cast.length >= 2 ? [cast[cast.length - 1], line.speaker] : [...cast, line.speaker];
  }
  return {
    cast,
    expr: { ...stage.expr, [line.speaker]: line.expression ?? stage.expr[line.speaker] ?? "neutral" },
    speaker: line.speaker,
  };
}

export function setExpression(stage: Stage, id: string | null, expression: Expression): Stage {
  if (!id) return stage;
  return { ...stage, expr: { ...stage.expr, [id]: expression } };
}

/** The character who should react to the player's choice. */
export function reactor(stage: Stage): string | null {
  if (stage.speaker && stage.cast.includes(stage.speaker)) return stage.speaker;
  return stage.cast[stage.cast.length - 1] ?? null;
}

/**
 * Rebuilds the stage + background for a saved/rewound state by replaying the
 * scenes in the play history (used on resume and when jumping to a choice).
 */
export function reconstruct(
  episode: Episode,
  play: PlayState,
  upToLine: number | "all",
): { stage: Stage; background: string | undefined } {
  let stage = EMPTY_STAGE;
  let background: string | undefined;
  for (const h of play.history) {
    const scene = episode.scenes[h.sceneId];
    if (!scene) continue;
    background = scene.background ?? background;
    stage = enterSceneStage(stage, scene);
    for (const l of scene.lines) stage = applyLine(stage, l);
    const choice = scene.choices?.find((c) => c.id === h.choiceId);
    for (const l of choice?.reaction ?? []) stage = applyLine(stage, l);
  }
  const scene = episode.scenes[play.sceneId];
  if (scene) {
    background = scene.background ?? background;
    stage = enterSceneStage(stage, scene);
    const lines = upToLine === "all" ? scene.lines : scene.lines.slice(0, upToLine + 1);
    for (const l of lines) stage = applyLine(stage, l);
  }
  background ??= firstBackground(episode);
  return { stage, background };
}

export function firstBackground(episode: Episode): string | undefined {
  return episode.scenes[episode.startScene]?.background ?? Object.values(episode.scenes).find((s) => s.background)?.background;
}

/** Deterministic shuffle so the "natural" answer isn't always first. */
export function seededOrder<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  return items
    .map((item) => ({ item, k: rand() }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.item);
}
