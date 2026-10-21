"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BookmarkLine } from "../flow/NotebookExtras";
import type { Choice, Effects, Episode, Line, Quality, Story, Vocab } from "@/content/schema";
import { NARRATOR, PLAYER } from "@/content/schema";
import { advance, choose, rewindTo, sceneExit, startEpisode, type PlayState } from "@/engine/engine";
import { resolveAids, type Aids } from "@/lib/aids";
import { langMeta } from "@/lib/lang";
import { isSpeakable, stopSpeaking, useSpeechState } from "@/lib/audio";
import { QUALITY_EXPRESSION, QUALITY_META } from "@/lib/config";
import { CHOICE_XP, MOOD_META, XP, moodExpression, naturalVersion, npcMood } from "@/lib/scoring";
import { useEpisodeProgress, useGame, useHydrated, type TextSpeed } from "@/store/game";
import { ListenButton, SavePhraseButton, SpeedToggle, useSfx, useSpeech } from "../audio";
import { Gloss, ReadingText, TranslationText } from "../Gloss";
import { LangProvider, useLang } from "../lang";
import { RichText } from "../RichText";
import { Sprite } from "../Sprite";
import { VocabSheet } from "../VocabSheet";
import { cx } from "../ui";
import { ChoiceMap } from "./ChoiceMap";
import { EndingScreen } from "./EndingScreen";
import {
  EMPTY_STAGE,
  applyLine,
  enterSceneStage,
  reactor,
  reconstruct,
  seededOrder,
  setExpression,
  type Stage,
} from "./stage";

type Phase =
  | { kind: "loading" }
  | { kind: "lines"; index: number }
  | { kind: "choices" }
  | { kind: "feedback"; choice: Choice; delta: Effects; next: PlayState; xp: number }
  | { kind: "reaction"; choice: Choice; index: number; next: PlayState }
  | { kind: "reviewResult"; choice: Choice; next: PlayState; cleared: boolean; xp: number }
  | { kind: "ending"; isNew: boolean; survivalUnlocked: boolean };

type Review = { mistakeId: string; snapshot: PlayState };

const CPS: Record<TextSpeed, number> = { slow: 22, normal: 45, fast: 90, instant: Number.POSITIVE_INFINITY };

export function Player({ story, episode }: { story: Story; episode: Episode }) {
  const hydrated = useHydrated();
  const settings = useGame((s) => s.settings);
  const saveCurrent = useGame((s) => s.saveCurrent);
  const recordChoice = useGame((s) => s.recordChoice);
  const finishRun = useGame((s) => s.finishRun);
  const seeVocab = useGame((s) => s.seeVocab);
  const setAid = useGame((s) => s.setAid);
  const addXp = useGame((s) => s.addXp);
  const recordMistake = useGame((s) => s.recordMistake);
  const markMistakeReviewed = useGame((s) => s.markMistakeReviewed);
  const progress = useEpisodeProgress(story.id, episode.id);
  const sfx = useSfx();
  const speech = useSpeech();
  const speakingKey = useSpeechState((s) => s.speakingKey);

  const [play, setPlay] = useState<PlayState | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [stage, setStage] = useState<Stage>(EMPTY_STAGE);
  const [background, setBackground] = useState<string | undefined>();
  const [visibleChars, setVisibleChars] = useState(0);
  const [revealed, setRevealed] = useState(false); // translation reveal for current line ("tap" mode)
  const [vocabOpen, setVocabOpen] = useState<Vocab | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [aidsOpen, setAidsOpen] = useState(false);
  const [runVocab, setRunVocab] = useState<{ seen: string[]; fresh: string[] }>({ seen: [], fresh: [] });
  const [runXp, setRunXp] = useState(0);
  const [statPulse, setStatPulse] = useState<Effects | null>(null);
  const [lastQuality, setLastQuality] = useState<Quality | undefined>();
  const [review, setReview] = useState<Review | null>(null);

  const epLevel = episode.level ?? story.level;
  const level = settings.level === "story" ? epLevel : settings.level;
  const meta = langMeta(story.targetLanguage);
  const speechLang = story.speechLang ?? meta.speech;
  const resolved = resolveAids(level, settings.aids);
  // Furigana only exists for languages written with ruby markup.
  const aids: Aids = { ...resolved, furigana: resolved.furigana && meta.hasFurigana };
  const vocabById = useMemo(() => new Map(story.vocab.map((v) => [v.id, v])), [story.vocab]);
  const charById = useMemo(() => new Map(story.characters.map((c) => [c.id, c])), [story.characters]);
  const episodeIndex = story.episodes.findIndex((e) => e.id === episode.id);
  const nextEpisode = story.episodes[episodeIndex + 1];
  const source = `${story.title} · ${episode.title}`;

  // ---------- derived: current line ----------
  const scene = play ? episode.scenes[play.sceneId] : undefined;
  const currentLine: Line | undefined =
    phase.kind === "lines"
      ? scene?.lines[phase.index]
      : phase.kind === "reaction"
        ? phase.choice.reaction?.[phase.index]
        : phase.kind === "choices" || phase.kind === "feedback"
          ? scene?.lines[scene.lines.length - 1]
          : undefined;
  const lineKey =
    phase.kind === "lines"
      ? `${play?.sceneId}:l${phase.index}`
      : phase.kind === "reaction"
        ? `${play?.sceneId}:${phase.choice.id}:r${phase.index}`
        : `${play?.sceneId}:static`;
  const lineLength = currentLine ? currentLine.text.replace(/\{([^{}|]+)\|[^{}|]+\}/g, "$1").length : 0;
  const typing = (phase.kind === "lines" || phase.kind === "reaction") && visibleChars < lineLength;

  // ---------- helpers ----------
  const addRunXp = useCallback(
    (n: number) => {
      if (n <= 0) return;
      addXp(n);
      setRunXp((x) => x + n);
    },
    [addXp],
  );

  const showLine = useCallback(
    (line: Line | undefined) => {
      stopSpeaking();
      setVisibleChars(0);
      setRevealed(false);
      if (!line) return;
      setStage((s) => applyLine(s, line));
      if (line.vocabRefs?.length) {
        const fresh = seeVocab(story.id, line.vocabRefs);
        setRunVocab((rv) => ({
          seen: [...rv.seen, ...line.vocabRefs!.filter((id) => !rv.seen.includes(id))],
          fresh: [...rv.fresh, ...fresh.filter((id) => !rv.fresh.includes(id))],
        }));
      }
      // Optional autoplay of target-language lines.
      if (line.speaker !== NARRATOR && useGame.getState().settings.audio.autoplay && isSpeakable(line.text, speechLang)) {
        speech.speak(`line:${line.text}`, line.text, speechLang);
      }
    },
    [seeVocab, story.id, speech, speechLang],
  );

  const endRun = useCallback(
    (state: PlayState) => {
      stopSpeaking();
      const before = useGame.getState().progress[`${story.id}/${episode.id}`]?.endings.length ?? 0;
      const isNew = finishRun(story.id, episode.id, state);
      addRunXp(isNew ? XP.newEnding : XP.repeatEnding);
      sfx("ending");
      setPlay(state);
      setPhase({ kind: "ending", isNew, survivalUnlocked: before === 0 && (episode.survival?.length ?? 0) >= 5 });
    },
    [finishRun, story.id, episode.id, episode.survival, addRunXp, sfx],
  );

  /** Enter the scene `state.sceneId` (state already resolved by the engine). */
  const enter = useCallback(
    (state: PlayState) => {
      if (state.endingId) {
        endRun(state);
        return;
      }
      setPlay(state);
      saveCurrent(story.id, episode.id, state);
      const sc = episode.scenes[state.sceneId];
      if (sc.background) setBackground(sc.background);
      setStage((s) => enterSceneStage(s, sc));
      if (sc.lines.length > 0) {
        setPhase({ kind: "lines", index: 0 });
        showLine(sc.lines[0]);
      } else {
        setPhase({ kind: "choices" });
      }
    },
    [endRun, saveCurrent, showLine, story.id, episode.id, episode.scenes],
  );

  const startFresh = useCallback(() => {
    setRunVocab({ seen: [], fresh: [] });
    setRunXp(0);
    setLastQuality(undefined);
    setReview(null);
    setStage(EMPTY_STAGE);
    enter(startEpisode(episode));
  }, [enter, episode]);

  /** Show the choice point of `state` directly (used by rewinds and mistake reviews). */
  const showChoicePoint = useCallback(
    (state: PlayState) => {
      stopSpeaking();
      const { stage: st, background: bg } = reconstruct(episode, state, "all");
      setStage(st);
      setBackground(bg);
      setPlay(state);
      setVisibleChars(Number.POSITIVE_INFINITY);
      setLastQuality(undefined);
      setPhase({ kind: "choices" });
      setMapOpen(false);
    },
    [episode],
  );

  const jumpTo = useCallback(
    (run: PlayState, historyIndex: number) => {
      const state = rewindTo(run, historyIndex);
      setReview(null);
      showChoicePoint(state);
      saveCurrent(story.id, episode.id, state);
    },
    [showChoicePoint, saveCurrent, story.id, episode.id],
  );

  // ---------- init (after persisted data is loaded) ----------
  const initialized = useRef(false);
  useEffect(() => {
    if (!hydrated || initialized.current) return;
    initialized.current = true;
    const params = new URLSearchParams(window.location.search);
    const clean = () => window.history.replaceState(null, "", window.location.pathname);
    const st = useGame.getState();
    const saved = st.progress[`${story.id}/${episode.id}`];

    // Mistake review: replay the exact situation from the Mistake Journal.
    const reviewId = params.get("review");
    const mistake = reviewId ? st.mistakes[reviewId] : undefined;
    if (mistake && episode.scenes[mistake.sceneId]) {
      setReview({ mistakeId: mistake.id, snapshot: mistake.snapshot });
      showChoicePoint(mistake.snapshot);
      clean();
      return;
    }

    const jump = params.get("jump");
    if (jump !== null && (saved?.current || saved?.lastRun)) {
      const run = saved.current ?? saved.lastRun!;
      const idx = Number(jump);
      if (run.history[idx]) {
        jumpTo(run, idx);
        clean();
        return;
      }
    }
    if (params.get("new") === null && saved?.current && episode.scenes[saved.current.sceneId]) {
      const cur = saved.current;
      const sc = episode.scenes[cur.sceneId];
      const { stage: stg, background: bg } = reconstruct(episode, cur, 0);
      setStage(stg);
      setBackground(bg);
      setPlay(cur);
      if (sc.lines.length) {
        setPhase({ kind: "lines", index: 0 });
        showLine(sc.lines[0]);
      } else setPhase({ kind: "choices" });
    } else {
      startFresh();
    }
    if (params.toString()) clean();
  }, [hydrated, story.id, episode, jumpTo, showLine, startFresh, showChoicePoint]);

  // Stop any speech when leaving the player.
  useEffect(() => () => stopSpeaking(), []);

  // ---------- typewriter ----------
  useEffect(() => {
    if (!typing) return;
    const narr = currentLine?.speaker === NARRATOR;
    const cps = CPS[settings.textSpeed] * (narr ? 1.8 : 1);
    if (!Number.isFinite(cps)) {
      setVisibleChars(Number.POSITIVE_INFINITY);
      return;
    }
    const step = Math.max(1, Math.round(cps / 30));
    const id = window.setInterval(() => setVisibleChars((v) => v + step), 1000 / 30);
    return () => window.clearInterval(id);
  }, [typing, lineKey, settings.textSpeed, currentLine?.speaker]);

  // ---------- flow ----------
  const afterChoice = useCallback(
    (choice: Choice, next: PlayState) => {
      if (review) {
        // In review mode, stop here and show how it went instead of continuing the story.
        const cleared = choice.quality === "natural";
        let xp = 0;
        if (cleared && markMistakeReviewed(review.mistakeId)) {
          xp = XP.mistakeReviewed;
          addRunXp(xp);
          sfx("unlock");
        }
        setPhase({ kind: "reviewResult", choice, next, cleared, xp });
        return;
      }
      enter(next);
    },
    [review, markMistakeReviewed, addRunXp, sfx, enter],
  );

  const tap = useCallback(() => {
    if (!play) return;
    if (typing) {
      setVisibleChars(Number.POSITIVE_INFINITY);
      return;
    }
    if (phase.kind === "lines") {
      const sc = episode.scenes[play.sceneId];
      const nextIndex = phase.index + 1;
      if (nextIndex < sc.lines.length) {
        setPhase({ kind: "lines", index: nextIndex });
        showLine(sc.lines[nextIndex]);
        return;
      }
      const exit = sceneExit(episode, play);
      if (exit.kind === "choices") {
        setPhase({ kind: "choices" });
        return;
      }
      const nextState = advance(episode, play);
      if (nextState.endingId) endRun(nextState);
      else enter(nextState);
      return;
    }
    if (phase.kind === "feedback") {
      if (phase.choice.reaction?.length) {
        setPhase({ kind: "reaction", choice: phase.choice, index: 0, next: phase.next });
        showLine(phase.choice.reaction[0]);
      } else afterChoice(phase.choice, phase.next);
      return;
    }
    if (phase.kind === "reaction") {
      const nextIndex = phase.index + 1;
      if (nextIndex < (phase.choice.reaction?.length ?? 0)) {
        setPhase({ ...phase, index: nextIndex });
        showLine(phase.choice.reaction![nextIndex]);
      } else afterChoice(phase.choice, phase.next);
    }
  }, [play, typing, phase, episode, showLine, endRun, enter, afterChoice]);

  const pick = useCallback(
    (choiceId: string) => {
      if (!play || phase.kind !== "choices") return;
      stopSpeaking();
      const { state, choice, delta } = choose(episode, play, choiceId);
      let xp = 0;
      if (!review) {
        // XP only the first time a choice is explored, so replays can't farm it.
        if (recordChoice(story.id, episode.id, choiceId)) {
          xp = CHOICE_XP[choice.quality];
          addRunXp(xp);
        }
        if (choice.quality === "awkward" || choice.quality === "wrong") {
          recordMistake({ storyId: story.id, episodeId: episode.id, sceneId: play.sceneId, choiceId, snapshot: play });
        }
      }
      sfx(choice.quality === "natural" ? "natural" : choice.quality === "understandable" ? "okay" : "oops");
      const who = reactor(stage);
      setStage((s) => setExpression(s, who, choice.reactionExpression ?? QUALITY_EXPRESSION[choice.quality]));
      setStatPulse(delta);
      window.setTimeout(() => setStatPulse(null), 1400);
      setLastQuality(choice.quality);
      // Show the post-choice stats immediately in the HUD.
      setPlay({ ...play, stats: state.stats });
      setPhase({ kind: "feedback", choice, delta, next: state, xp });
    },
    [play, phase.kind, episode, review, recordChoice, recordMistake, addRunXp, sfx, story.id, episode.id, stage],
  );

  // ---------- keyboard ----------
  const orderedChoices = useMemo(() => {
    if (!play || !scene?.choices) return [];
    return seededOrder(scene.choices, `${episode.id}:${play.sceneId}`);
  }, [play, scene, episode.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (vocabOpen || mapOpen || aidsOpen || phase.kind === "ending" || phase.kind === "reviewResult") return;
      if ((e.target as HTMLElement)?.closest?.("input, textarea")) return;
      if (phase.kind === "choices") {
        const n = Number(e.key);
        if (n >= 1 && n <= orderedChoices.length) pick(orderedChoices[n - 1].id);
        return;
      }
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        tap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase.kind, orderedChoices, pick, tap, vocabOpen, mapOpen, aidsOpen]);

  // ---------- render ----------
  if (!hydrated || !play || phase.kind === "loading") {
    return (
      <div className="grid h-dvh place-items-center bg-ink text-white">
        <div className="animate-bob font-display text-lg font-bold">Loading…</div>
      </div>
    );
  }

  const ending = play.endingId ? episode.endings.find((e) => e.id === play.endingId) : undefined;
  const lineVocab = (currentLine?.vocabRefs ?? []).map((id) => vocabById.get(id)!).filter(Boolean);
  const speaker = currentLine?.speaker;
  const speakerChar = speaker ? charById.get(speaker) : undefined;
  const isNarration = speaker === NARRATOR;
  const choicesVisible = phase.kind === "choices";
  const mood = npcMood(play.stats, play.history.length, lastQuality);
  const moodMeta = MOOD_META[mood];
  const focusNpc = charById.get(reactor(stage) ?? "");

  return (
    <LangProvider lang={story.targetLanguage} speech={speechLang}>
    <div className="relative mx-auto h-dvh max-w-[560px] select-none overflow-hidden bg-ink text-ink shadow-2xl">
      {/* Background */}
      {background && (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={background} src={background} alt="" className="absolute inset-0 h-full w-full animate-fade object-cover" draggable={false} />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/35 via-transparent to-ink/30" />

      {/* Tap layer */}
      <button type="button" aria-label="Continue" className="absolute inset-0 z-0 cursor-pointer" onClick={tap} disabled={choicesVisible} />

      {/* Sprites */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[22%] top-[10%] z-[1]">
        {stage.cast.map((id, i) => {
          const c = charById.get(id);
          if (!c) return null;
          const solo = stage.cast.length === 1;
          const talking = stage.speaker === id || solo;
          return (
            <div
              key={id}
              className="absolute bottom-0 h-full transition-all duration-300 ease-out"
              style={{
                left: solo ? "50%" : i === 0 ? "30%" : "70%",
                width: solo ? "74%" : "62%",
                transform: `translateX(-50%) scale(${talking ? 1 : 0.92})`,
                transformOrigin: "bottom center",
                filter: talking ? "none" : "brightness(0.72) saturate(0.8)",
                zIndex: talking ? 2 : 1,
              }}
            >
              <div className="h-full w-full animate-rise">
                <Sprite
                  character={c}
                  expression={moodExpression(stage.expr[id] ?? "neutral", mood)}
                  speaking={currentLine?.speaker === id && speakingKey === `line:${currentLine.text}`}
                  className="h-full w-full drop-shadow-[0_10px_20px_rgba(0,0,0,0.25)]"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Top HUD */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link
          href={review ? "/notebook?tab=mistakes" : `/story/${story.id}`}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/85 font-bold text-ink shadow backdrop-blur active:scale-95"
          aria-label={review ? "Back to Mistakes" : "Back to story"}
        >
          ←
        </Link>
        <div className="hc-panel min-w-0 flex-1 rounded-full bg-white/85 px-3 py-1.5 shadow backdrop-blur">
          <div className="truncate font-display text-[13px] font-extrabold leading-tight">
            {review && <span className="mr-1.5 rounded-full bg-sky px-1.5 py-px text-[10px] text-white">REVIEW</span>}
            {episode.title}
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-ink-soft">
            <StatPill icon="♥" label="Trust" value={play.stats.trust} delta={statPulse?.trust} color="text-sakura" />
            <StatPill icon="✦" label="Fluency" value={play.stats.fluency} delta={statPulse?.fluency} color="text-tangerine" />
            {focusNpc && (
              <span
                className="ml-auto inline-flex min-w-0 items-center gap-1 truncate rounded-full px-1.5 transition-colors"
                style={{ color: moodMeta.color, background: `${moodMeta.color}14` }}
                title={`${focusNpc.name} seems ${moodMeta.label.toLowerCase()}`}
                aria-label={`${focusNpc.name} seems ${moodMeta.label.toLowerCase()}`}
              >
                <span aria-hidden>{moodMeta.emoji}</span>
                <span className="truncate">{moodMeta.label}</span>
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAidsOpen((o) => !o)}
          className={cx(
            "grid h-10 w-10 place-items-center rounded-full font-display text-sm font-extrabold shadow backdrop-blur active:scale-95",
            aidsOpen ? "bg-ink text-white" : "bg-white/85 text-ink",
          )}
          aria-label="Reading aids and audio"
          aria-expanded={aidsOpen}
        >
          あA
        </button>
        <button
          type="button"
          onClick={() => setMapOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/85 text-lg shadow backdrop-blur active:scale-95"
          aria-label="Choice map"
        >
          🗺️
        </button>
      </header>

      {review && choicesVisible && (
        <div className="absolute inset-x-3 top-[4.5rem] z-10 animate-rise rounded-2xl bg-sky px-3 py-2 text-center text-[13px] font-bold text-white shadow-lg">
          🔁 Mistake review: try a more natural answer
        </div>
      )}

      {aidsOpen && <AidsPopover aids={aids} level={level} onChange={(patch) => setAid(patch)} onClose={() => setAidsOpen(false)} />}

      {/* Feedback */}
      {phase.kind === "feedback" && (
        <FeedbackCard
          choice={phase.choice}
          better={naturalVersion(scene, phase.choice)}
          delta={phase.delta}
          xp={phase.xp}
          aids={aids}
          source={source}
          storyId={story.id}
          onContinue={tap}
        />
      )}

      {phase.kind === "reviewResult" && (
        <ReviewResult
          cleared={phase.cleared}
          xp={phase.xp}
          onRetry={() => review && showChoicePoint(review.snapshot)}
          onContinue={() => {
            setReview(null);
            enter(phase.next);
          }}
        />
      )}

      {/* Bottom: choices + dialogue */}
      <div className="scale-text pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2.5 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {choicesVisible && (
          <div className="pointer-events-auto flex flex-col gap-2" role="group" aria-label="What do you say?">
            <div className="animate-fade self-start rounded-full bg-ink/80 px-3 py-1 font-display text-xs font-extrabold tracking-wide text-white">
              What do you say?
            </div>
            {orderedChoices.map((c, i) => (
              <ChoiceButton key={c.id} choice={c} index={i} aids={aids} onPick={() => pick(c.id)} />
            ))}
          </div>
        )}

        {currentLine && phase.kind !== "feedback" && (
          <div
            className={cx(
              "pointer-events-auto relative cursor-pointer rounded-3xl border-2 p-4 pt-5 shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition",
              isNarration ? "border-white/20 bg-ink/85 text-white backdrop-blur" : "hc-panel border-ink/10 bg-paper/95 backdrop-blur",
              choicesVisible && "opacity-90",
            )}
            onClick={choicesVisible ? undefined : tap}
          >
            {!isNarration && (
              <div
                className="absolute -top-3.5 left-4 rounded-full px-3 py-0.5 font-display text-sm font-extrabold text-white shadow"
                style={{ background: speaker === PLAYER ? "#2b2340" : (speakerChar?.color ?? "#ff6f91") }}
              >
                {speaker === PLAYER ? "You" : (speakerChar?.name ?? speaker)}
                {speakerChar?.nameNative && <span className="ml-1.5 text-xs font-bold opacity-80">{speakerChar.nameNative}</span>}
              </div>
            )}
            {!isNarration && !typing && (
              <div className="absolute -top-4 right-3 flex items-center gap-1.5">
                <BookmarkLine id={`${story.id}/${episode.id}/${lineKey}`} text={currentLine.text} source={source} href={`/play/${story.id}/${episode.id}`} lang={story.targetLanguage}/>
                <SpeedToggle />
                <ListenButton id={`line:${currentLine.text}`} text={currentLine.text} size="sm" />
                <SavePhraseButton
                  size="sm"
                  phrase={{
                    text: currentLine.text,
                    reading: currentLine.reading ?? "",
                    translation: currentLine.translation ?? "",
                    source,
                    storyId: story.id,
                    context: speaker === PLAYER ? "You said this" : `${speakerChar?.name ?? "Someone"} said this`,
                  }}
                />
              </div>
            )}
            <DialogueText
              line={currentLine}
              vocab={lineVocab}
              aids={aids}
              visibleChars={phase.kind === "choices" ? Number.POSITIVE_INFINITY : visibleChars}
              revealed={revealed}
              onReveal={() => setRevealed(true)}
              onVocab={(id) => setVocabOpen(vocabById.get(id) ?? null)}
              narration={isNarration}
              done={!typing}
            />
            {!typing && !choicesVisible && (
              <span className={cx("absolute bottom-2 right-4 animate-bob text-sm", isNarration ? "text-white/70" : "text-sakura")}>▼</span>
            )}
          </div>
        )}
      </div>

      {phase.kind === "ending" && ending && (
        <EndingScreen
          story={story}
          episode={episode}
          ending={ending}
          run={play}
          isNew={phase.isNew}
          survivalUnlocked={phase.survivalUnlocked}
          foundIds={progress.endings}
          newWords={runVocab.fresh}
          seenWords={runVocab.seen}
          runXp={runXp}
          nextEpisode={nextEpisode}
          onReplay={startFresh}
          onJump={(i) => jumpTo(play, i)}
          onOpenMap={() => setMapOpen(true)}
          onVocab={(id) => setVocabOpen(vocabById.get(id) ?? null)}
        />
      )}

      <ChoiceMap
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        episode={episode}
        run={play}
        choicesSeen={progress.choicesSeen}
        aids={aids}
        onJump={(i) => jumpTo(play, i)}
        ended={phase.kind === "ending"}
      />
      <VocabSheet storyId={story.id} vocab={vocabOpen} onClose={() => setVocabOpen(null)} />
    </div>
    </LangProvider>
  );
}

function StatPill({ icon, label, value, delta, color }: { icon: string; label: string; value: number; delta?: number; color: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5" title={label} aria-label={`${label} ${value}`}>
      <span className={color}>{icon}</span>
      <span className="tabular-nums text-ink">{value}</span>
      {delta ? (
        <span className={cx("ml-0.5 animate-rise font-display text-[11px] font-extrabold", delta > 0 ? "text-matcha" : "text-q-wrong")}>
          {delta > 0 ? `+${delta}` : delta}
        </span>
      ) : null}
    </span>
  );
}

function DialogueText({
  line,
  vocab,
  aids,
  visibleChars,
  revealed,
  onReveal,
  onVocab,
  narration,
  done,
}: {
  line: Line;
  vocab: Vocab[];
  aids: Aids;
  visibleChars: number;
  revealed: boolean;
  onReveal: () => void;
  onVocab: (id: string) => void;
  narration: boolean;
  done: boolean;
}) {
  if (narration) {
    return (
      <p className="min-h-[3.5rem] text-[15.5px] italic leading-relaxed">
        <RichText text={line.text} furigana={false} visibleChars={visibleChars} />
      </p>
    );
  }
  const { meta } = useLang();
  const showTranslation = aids.translation === "show" || (aids.translation === "tap" && revealed);
  return (
    <div className="min-h-[3.5rem] pr-3">
      <p className={cx("font-display text-[21px] font-bold text-ink", aids.furigana ? "leading-[2.1]" : "leading-relaxed")}>
        <RichText text={line.text} vocab={vocab} furigana={aids.furigana} visibleChars={visibleChars} onVocab={onVocab} />
      </p>
      <div className={cx("transition-opacity duration-300", done ? "opacity-100" : "opacity-0")}>
        {aids.romaji && line.reading && <ReadingText text={line.reading} className="mt-0.5 text-[13px]" />}
        {showTranslation && line.translation && <TranslationText text={line.translation} className="mt-1 text-[14px]" />}
        {aids.translation === "tap" && !revealed && line.translation && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReveal();
            }}
            className="mt-1.5 rounded-full bg-ink/5 px-2.5 py-0.5 text-[12px] font-bold text-ink-soft ring-1 ring-ink/10 active:scale-95"
          >
            {meta.revealLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function ChoiceButton({ choice, index, aids, onPick }: { choice: Choice; index: number; aids: Aids; onPick: () => void }) {
  return (
    <div
      className="hc-panel group flex w-full animate-rise items-center gap-2 rounded-2xl border-2 border-white/60 bg-white/95 pr-2 shadow-[0_4px_0_rgba(43,35,64,0.18)] backdrop-blur transition hover:-translate-y-0.5 hover:border-sakura"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <button type="button" onClick={onPick} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3 text-left active:translate-y-0.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sakura-soft font-display text-sm font-extrabold text-sakura group-hover:bg-sakura group-hover:text-white">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cx("block font-display text-[17px] font-bold text-ink", aids.furigana ? "leading-[2]" : "leading-snug")}>
            <RichText text={choice.text} furigana={aids.furigana} />
          </span>
          {aids.romaji && <ReadingText text={choice.reading} className="block text-[12.5px]" as="span" />}
          {aids.translation === "show" && <TranslationText text={choice.translation} className="block text-[13px]" as="span" />}
        </span>
      </button>
      <ListenButton id={`choice:${choice.id}`} text={choice.text} size="sm" label={`Listen to option ${index + 1}`} />
    </div>
  );
}

function FeedbackCard({
  choice,
  better,
  delta,
  xp,
  aids,
  source,
  storyId,
  onContinue,
}: {
  choice: Choice;
  better?: Choice;
  delta: Effects;
  xp: number;
  aids: Aids;
  source: string;
  storyId: string;
  onContinue: () => void;
}) {
  const q = QUALITY_META[choice.quality];
  const [whyOpen, setWhyOpen] = useState(false);
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  return (
    <div className="scale-text absolute inset-x-0 bottom-0 z-30 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" onClick={onContinue}>
      <div
        className="max-h-[78dvh] animate-pop cursor-pointer overflow-y-auto rounded-3xl border-2 bg-white p-4 shadow-[0_10px_40px_rgba(0,0,0,0.3)]"
        style={{ borderColor: q.color }}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full px-3 py-1 font-display text-sm font-extrabold" style={{ color: q.color, background: q.bg }}>
            {q.emoji} {q.label}
          </span>
          <span className="flex items-center gap-1.5 font-display text-sm font-extrabold">
            {!!delta.trust && <span className={delta.trust > 0 ? "text-sakura" : "text-q-wrong"}>♥ {delta.trust > 0 ? `+${delta.trust}` : delta.trust}</span>}
            {!!delta.fluency && (
              <span className={delta.fluency > 0 ? "text-tangerine" : "text-q-wrong"}>✦ {delta.fluency > 0 ? `+${delta.fluency}` : delta.fluency}</span>
            )}
            {xp > 0 && <span className="rounded-full bg-butter/60 px-2 py-0.5 text-[11px] text-ink">+{xp} XP</span>}
          </span>
        </div>

        <PhraseRow
          label="You said"
          text={choice.text}
          reading={choice.reading}
          translation={choice.translation}
          furigana={aids.furigana}
          listenId={`fb:said:${choice.id}`}
          phrase={{ text: choice.text, reading: choice.reading, translation: choice.translation, source, storyId, context: `Your answer (${q.label.toLowerCase()})` }}
          tone="paper"
        />
        {better && (
          <PhraseRow
            label="More natural"
            text={better.text}
            reading={better.reading}
            translation={better.translation}
            furigana={aids.furigana}
            listenId={`fb:better:${better.id}`}
            phrase={{ text: better.text, reading: better.reading, translation: better.translation, source, storyId, context: "The natural way to say it" }}
            tone="green"
          />
        )}

        <p className="mt-3 text-[15px] leading-relaxed text-ink">💡 {choice.feedback}</p>

        {choice.why && (
          <div className="mt-2" onClick={stop}>
            <button
              type="button"
              onClick={() => setWhyOpen((o) => !o)}
              aria-expanded={whyOpen}
              className="rounded-full bg-plum/10 px-3 py-1 font-display text-[13px] font-extrabold text-plum active:scale-95"
            >
              {whyOpen ? "▾ Why?" : "▸ Why?"}
            </button>
            {whyOpen && <p className="mt-2 animate-fade rounded-2xl bg-plum/5 p-3 text-[14px] leading-relaxed text-ink">{choice.why}</p>}
          </div>
        )}
        <div className="mt-3 text-right font-display text-xs font-extrabold text-ink-soft">Tap to continue ▶</div>
      </div>
    </div>
  );
}

function PhraseRow({
  label,
  text,
  reading,
  translation,
  furigana,
  listenId,
  phrase,
  tone,
}: {
  label: string;
  text: string;
  reading: string;
  translation: string;
  furigana: boolean;
  listenId: string;
  phrase: React.ComponentProps<typeof SavePhraseButton>["phrase"];
  tone: "paper" | "green";
}) {
  return (
    <div className={cx("mt-3 flex items-start gap-2 rounded-2xl px-3 py-2", tone === "green" ? "bg-[#e3f7eb]" : "bg-paper")}>
      <div className="min-w-0 flex-1">
        <div className={cx("text-[11px] font-bold uppercase tracking-wider", tone === "green" ? "text-q-natural" : "text-ink-soft")}>{label}</div>
        <div className={cx("font-display text-[18px] font-bold", furigana ? "leading-[2]" : "leading-snug")}>
          <RichText text={text} furigana={furigana} />
        </div>
        <Gloss reading={reading} translation={translation} />
      </div>
      <div className="flex shrink-0 flex-col gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
        <ListenButton id={listenId} text={text} size="sm" />
        <SavePhraseButton phrase={phrase} size="sm" />
      </div>
    </div>
  );
}

function ReviewResult({ cleared, xp, onRetry, onContinue }: { cleared: boolean; xp: number; onRetry: () => void; onContinue: () => void }) {
  return (
    <div className="absolute inset-0 z-40 grid place-items-end bg-ink/40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-[2px]">
      <div className="scale-text w-full animate-pop rounded-3xl bg-white p-5 text-center shadow-2xl">
        <div className="text-4xl">{cleared ? "🎉" : "🔁"}</div>
        <h2 className="mt-1 font-display text-xl font-extrabold">{cleared ? "Mistake reviewed!" : "Not quite yet"}</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {cleared
            ? "That's the natural way to say it. This mistake is now marked as reviewed."
            : "Good try. Read the explanation again and have another go."}
        </p>
        {xp > 0 && <div className="mt-2 inline-block rounded-full bg-butter/60 px-3 py-1 font-display text-sm font-extrabold">+{xp} XP</div>}
        <div className="mt-4 grid gap-2">
          {!cleared && (
            <button type="button" onClick={onRetry} className="rounded-2xl bg-sakura px-4 py-3 font-display font-extrabold text-white shadow-[0_4px_0_#154940]">
              ↺ Try again
            </button>
          )}
          <button type="button" onClick={onContinue} className="rounded-2xl bg-white px-4 py-3 font-display font-extrabold text-ink ring-2 ring-ink/10">
            ▶ Continue the story from here
          </button>
          <Link href="/notebook?tab=mistakes" className="rounded-2xl px-4 py-2 font-display text-sm font-extrabold text-ink-soft">
            Back to Mistakes
          </Link>
        </div>
      </div>
    </div>
  );
}

function AidsPopover({
  aids,
  level,
  onChange,
  onClose,
}: {
  aids: Aids;
  level: number;
  onChange: (patch: Partial<Aids>) => void;
  onClose: () => void;
}) {
  const { meta } = useLang();
  const audio = useGame((s) => s.settings.audio);
  const sfxOn = useGame((s) => s.settings.sfx);
  const setAudio = useGame((s) => s.setAudio);
  const setSettings = useGame((s) => s.setSettings);
  const nextTranslation = { show: "tap", tap: "off", off: "show" } as const;
  const tLabel = { show: "Always", tap: "Tap to reveal", off: "Hidden" } as const;
  return (
    <>
      <button type="button" aria-label="Close aids" className="absolute inset-0 z-20" onClick={onClose} />
      <div className="scale-text absolute right-3 top-16 z-30 w-72 animate-pop rounded-2xl bg-white p-3 shadow-2xl ring-1 ring-ink/10">
        <div className="mb-1 flex items-center justify-between">
          <span className="font-display text-sm font-extrabold">Reading aids</span>
          <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-bold text-ink-soft">Level {level} defaults</span>
        </div>
        {meta.hasFurigana && <AidRow label="Furigana ふりがな" on={aids.furigana} onClick={() => onChange({ furigana: !aids.furigana })} />}
        <AidRow label={meta.readingLabel} on={aids.romaji} onClick={() => onChange({ romaji: !aids.romaji })} />
        <button
          type="button"
          onClick={() => onChange({ translation: nextTranslation[aids.translation] })}
          className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-sm font-bold hover:bg-ink/5"
        >
          <span>{meta.translationLabel}</span>
          <span className="rounded-full bg-sky/15 px-2 py-0.5 text-xs text-sky">{tLabel[aids.translation]}</span>
        </button>
        <div className="mb-1 mt-2 border-t border-ink/5 pt-2 font-display text-sm font-extrabold">Audio</div>
        <AidRow label="🔊 Listen buttons" on={audio.enabled} onClick={() => setAudio({ enabled: !audio.enabled })} />
        <AidRow label="Autoplay lines" on={audio.autoplay} onClick={() => setAudio({ autoplay: !audio.autoplay, enabled: true })} />
        <button
          type="button"
          onClick={() => setAudio({ rate: audio.rate === 1 ? 0.75 : 1 })}
          className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-sm font-bold hover:bg-ink/5"
        >
          <span>Speech speed</span>
          <span className="rounded-full bg-sky/15 px-2 py-0.5 text-xs text-sky">{audio.rate === 1 ? "1×" : "0.75×"}</span>
        </button>
        <AidRow label="Sound effects" on={sfxOn} onClick={() => setSettings({ sfx: !sfxOn })} />
        <p className="mt-1 px-2 text-[11px] leading-snug text-ink-soft">
          {meta.hasFurigana ? "Tip: highlighted words can always be tapped for help." : `${meta.readingLabel}: ${meta.readingHint}. Highlighted words can always be tapped.`}
        </p>
      </div>
    </>
  );
}

function AidRow({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-sm font-bold hover:bg-ink/5"
    >
      <span>{label}</span>
      <span className={cx("relative h-6 w-11 shrink-0 rounded-full transition", on ? "bg-matcha" : "bg-ink/15")}>
        <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}
