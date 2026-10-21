import { DailyFileSchema, NARRATOR, PLAYER, StorySchema, type DailyFile, type Episode, type Line, type MiniScenario, type Story } from "./schema";
import { findVocabRanges, markupError, plainText } from "@/lib/markup";
import { parseCondition, referencedChoices } from "@/engine/conditions";
import { reachableEndings } from "@/engine/engine";

export type ValidationResult = { story: Story | null; errors: string[]; warnings: string[] };

/**
 * Validates a raw story object: schema shape first, then references and graph
 * integrity (broken scene links, unreachable scenes, missing vocab ids, endings
 * that can never be reached, …).
 */
export function validateStory(raw: unknown, source = "story"): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const parsed = StorySchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${source}: ${issue.path.join(".") || "(root)"} — ${issue.message}`);
    }
    return { story: null, errors, warnings };
  }
  const story = parsed.data;
  const err = (msg: string) => errors.push(`${story.id}: ${msg}`);
  const warn = (msg: string) => warnings.push(`${story.id}: ${msg}`);

  const characterIds = new Set(story.characters.map((c) => c.id));
  const vocabById = new Map(story.vocab.map((v) => [v.id, v]));
  const vocabUses = new Map<string, number>(story.vocab.map((v) => [v.id, 0]));

  dupes(story.characters.map((c) => c.id)).forEach((d) => err(`duplicate character id "${d}"`));
  dupes(story.vocab.map((v) => v.id)).forEach((d) => err(`duplicate vocab id "${d}"`));
  dupes(story.episodes.map((e) => e.id)).forEach((d) => err(`duplicate episode id "${d}"`));

  const checkText = (where: string, text: string, vocabRefs: string[] | undefined, isTarget: boolean) => {
    const m = markupError(text);
    if (m) err(`${where}: ${m}`);
    for (const ref of vocabRefs ?? []) {
      const v = vocabById.get(ref);
      if (!v) {
        err(`${where}: unknown vocab id "${ref}"`);
        continue;
      }
      vocabUses.set(ref, (vocabUses.get(ref) ?? 0) + 1);
      if (findVocabRanges(plainText(text), [v]).length === 0) {
        err(`${where}: vocab "${ref}" (${v.term}) does not appear in text "${plainText(text)}" — add it to \`forms\``);
      }
    }
    if (!isTarget && vocabRefs?.length) warn(`${where}: narrator line has vocabRefs`);
  };

  const checkLine = (where: string, line: Line) => {
    const isNarrator = line.speaker === NARRATOR;
    if (!isNarrator && line.speaker !== PLAYER && !characterIds.has(line.speaker)) {
      err(`${where}: unknown speaker "${line.speaker}"`);
    }
    if (!isNarrator && (!line.reading || !line.translation)) {
      err(`${where}: spoken lines need both \`reading\` and \`translation\``);
    }
    checkText(where, line.text, line.vocabRefs, !isNarrator);
  };

  for (const ep of story.episodes) {
    validateEpisode(ep, { err, warn, checkLine, checkText, characterIds });
  }

  for (const [id, uses] of vocabUses) {
    if (uses === 0) warn(`vocab "${id}" is never used in any line or choice`);
    else if (uses < 2) warn(`vocab "${id}" is only used once (aim for 2+ uses)`);
  }

  return { story: errors.length ? null : story, errors, warnings };
}

type Ctx = {
  err: (m: string) => void;
  warn: (m: string) => void;
  checkLine: (where: string, line: Line) => void;
  checkText: (where: string, text: string, refs: string[] | undefined, isTarget: boolean) => void;
  characterIds: Set<string>;
};

function validateEpisode(ep: Episode, { err, warn, checkLine, checkText, characterIds }: Ctx) {
  const at = (s: string) => `${ep.id}/${s}`;
  const sceneIds = new Set(Object.keys(ep.scenes));
  const endingIds = new Set(ep.endings.map((e) => e.id));
  const choiceIds = new Set<string>();

  dupes(ep.endings.map((e) => e.id)).forEach((d) => err(`${at("endings")}: duplicate ending id "${d}"`));
  if (!sceneIds.has(ep.startScene)) err(`${at("startScene")}: scene "${ep.startScene}" does not exist`);

  const allChoiceIds = Object.values(ep.scenes).flatMap((s) => s.choices?.map((c) => c.id) ?? []);
  dupes(allChoiceIds).forEach((d) => err(`${at("choices")}: duplicate choice id "${d}"`));
  allChoiceIds.forEach((id) => choiceIds.add(id));

  const edges = new Map<string, string[]>();
  const endingRefs = new Set<string>();
  const sceneRef = (where: string, target: string) => {
    if (!sceneIds.has(target)) err(`${where}: links to missing scene "${target}"`);
  };
  const endingRef = (where: string, target: string) => {
    if (!endingIds.has(target)) err(`${where}: links to missing ending "${target}"`);
    endingRefs.add(target);
  };

  for (const [sid, scene] of Object.entries(ep.scenes)) {
    const where = at(sid);
    const out: string[] = [];
    const exits = [scene.choices, scene.next, scene.routes, scene.endingId].filter((x) => x !== undefined).length;
    if (exits !== 1) err(`${where}: a scene needs exactly one of choices / next / routes / endingId (found ${exits})`);

    for (const c of scene.cast ?? []) if (!characterIds.has(c)) err(`${where}: unknown cast member "${c}"`);
    scene.lines.forEach((l, i) => checkLine(`${where}.lines[${i}]`, l));

    for (const choice of scene.choices ?? []) {
      const cw = `${where}.${choice.id}`;
      checkText(cw, choice.text, choice.vocabRefs, true);
      choice.reaction?.forEach((l, i) => checkLine(`${cw}.reaction[${i}]`, l));
      if (choice.next) {
        sceneRef(cw, choice.next);
        out.push(choice.next);
      }
      if (choice.endingId) endingRef(cw, choice.endingId);
      if (choice.better && !scene.choices?.some((c) => c.id === choice.better)) {
        err(`${cw}: \`better\` points to "${choice.better}", which isn't a choice in this scene`);
      }
      if (!choice.why) warn(`${cw}: no "why" explanation`);
    }
    if (scene.choices && !scene.skill) warn(`${where}: choice point has no "skill" tag`);
    if (scene.choices && scene.choices.every((c) => c.quality !== "natural")) {
      warn(`${where}: no "natural" option in this choice point`);
    }
    if (scene.next) {
      sceneRef(where, scene.next);
      out.push(scene.next);
    }
    if (scene.endingId) endingRef(where, scene.endingId);
    if (scene.routes) {
      const last = scene.routes[scene.routes.length - 1];
      if (!last.else) err(`${where}: the last route must be an \`else\``);
      scene.routes.forEach((r, i) => {
        const rw = `${where}.routes[${i}]`;
        if (r.else && i !== scene.routes!.length - 1) err(`${rw}: \`else\` must be the last route`);
        if (r.if) {
          try {
            parseCondition(r.if);
            for (const cid of referencedChoices(r.if)) {
              if (!choiceIds.has(cid)) err(`${rw}: condition references unknown choice "${cid}"`);
            }
          } catch (e) {
            err(`${rw}: ${(e as Error).message}`);
          }
        }
        if (r.next) {
          sceneRef(rw, r.next);
          out.push(r.next);
        }
        if (r.endingId) endingRef(rw, r.endingId);
      });
    }
    edges.set(sid, out);
  }

  // Unreachable scenes (graph reachability from startScene).
  const seen = new Set<string>();
  const stack = [ep.startScene];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id) || !sceneIds.has(id)) continue;
    seen.add(id);
    stack.push(...(edges.get(id) ?? []));
  }
  for (const id of sceneIds) if (!seen.has(id)) err(`${at(id)}: scene is unreachable from "${ep.startScene}"`);
  for (const e of endingIds) if (!endingRefs.has(e)) err(`${at("endings")}: ending "${e}" is never referenced`);

  if (ep.review) {
    ep.review.quiz.forEach((q, i) => {
      if (q.answer >= q.options.length) err(`${at(`review.quiz[${i}]`)}: answer index ${q.answer} is out of range`);
    });
    ep.review.phrases.forEach((ph, i) => {
      const m = markupError(ph.text);
      if (m) err(`${at(`review.phrases[${i}]`)}: ${m}`);
    });
  } else warn(`${at("review")}: no episode review (phrases, grammar, quiz)`);
  if (ep.survival) {
    validateMinis(ep.survival, at("survival"), characterIds, err, warn);
    if (ep.survival.length < 5) warn(`${at("survival")}: Survival Mode needs at least 5 situations (has ${ep.survival.length})`);
  }

  // Play-through reachability (respects stat conditions). Only meaningful if the graph is sound.
  try {
    const { endings } = reachableEndings(ep);
    for (const e of endingIds) {
      if (!endings.has(e)) err(`${at("endings")}: ending "${e}" can't be reached by any combination of choices`);
    }
    if (endings.size < 3) warn(`${at("endings")}: only ${endings.size} distinct endings are reachable (aim for 3+)`);
  } catch (e) {
    err(`${at("playthrough")}: ${(e as Error).message}`);
  }
}

function validateMinis(
  minis: MiniScenario[],
  where: string,
  characterIds: Set<string>,
  err: (m: string) => void,
  warn: (m: string) => void,
) {
  dupes(minis.map((m) => m.id)).forEach((d) => err(`${where}: duplicate scenario id "${d}"`));
  for (const mini of minis) {
    mini.steps.forEach((step, i) => {
      const w = `${where}/${mini.id}.steps[${i}]`;
      if (step.speaker !== NARRATOR && !characterIds.has(step.speaker)) err(`${w}: unknown speaker "${step.speaker}"`);
      const m = markupError(step.text);
      if (m) err(`${w}: ${m}`);
      dupes(step.choices.map((c) => c.id)).forEach((d) => err(`${w}: duplicate choice id "${d}"`));
      if (!step.choices.some((c) => c.quality === "natural")) err(`${w}: needs at least one "natural" choice`);
      for (const c of step.choices) {
        const cm = markupError(c.text);
        if (cm) err(`${w}.${c.id}: ${cm}`);
        if (!c.why) warn(`${w}.${c.id}: no "why" explanation`);
      }
    });
  }
}

/** Validates content/daily/challenges.json. */
export function validateDaily(raw: unknown, source = "daily"): { data: DailyFile | null; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsed = DailyFileSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors.push(`${source}: ${issue.path.join(".") || "(root)"} — ${issue.message}`);
    return { data: null, errors, warnings };
  }
  const ids = new Set(parsed.data.characters.map((c) => c.id));
  validateMinis(parsed.data.challenges, source, ids, (m) => errors.push(m), (m) => warnings.push(m));
  return { data: errors.length ? null : parsed.data, errors, warnings };
}

function dupes(ids: string[]): string[] {
  const seen = new Set<string>();
  const d = new Set<string>();
  for (const id of ids) (seen.has(id) ? d : seen).add(id);
  return [...d];
}

export function formatValidation(results: { file: string; result: ValidationResult }[]): string {
  const lines: string[] = [];
  for (const { file, result } of results) {
    const status = result.errors.length ? "✗" : "✓";
    lines.push(`${status} ${file}  (${result.errors.length} errors, ${result.warnings.length} warnings)`);
    result.errors.forEach((e) => lines.push(`   error   ${e}`));
    result.warnings.forEach((w) => lines.push(`   warning ${w}`));
  }
  return lines.join("\n");
}
