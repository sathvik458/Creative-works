"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Episode, MiniChoice, MiniScenario, Story } from "@/content/schema";
import { resolveAids, type Aids } from "@/lib/aids";
import { langMeta } from "@/lib/lang";
import { shuffle } from "@/lib/daily";
import { XP } from "@/lib/scoring";
import { withStop } from "@/lib/text";
import { progressKey, useGame, useHydrated } from "@/store/game";
import { useSfx } from "../audio";
import { LangProvider } from "../lang";
import { Button, PageShell, cx } from "../ui";
import { MiniChoices, MiniFeedback, MiniStage, bestChoice } from "./MiniScene";

const ROUNDS = 5;
const LIVES = 3;
const HINTS = 2;
const POINTS: Record<MiniChoice["quality"], number> = { natural: 2, understandable: 1, awkward: 0, wrong: 0 };

type Round = { scenario: MiniScenario; choices: MiniChoice[] };
type Phase = "intro" | "round" | "feedback" | "over";

/**
 * Survival Mode: new-but-related situations from the episode, no translations,
 * randomized options, limited hints and 3 lives.
 */
export function SurvivalMode({ story, episode }: { story: Story; episode: Episode }) {
  const hydrated = useHydrated();
  const progress = useGame((s) => s.progress[progressKey(story.id, episode.id)]);
  const record = useGame((s) => s.survival[progressKey(story.id, episode.id)]);
  const recordSurvival = useGame((s) => s.recordSurvival);
  const addXp = useGame((s) => s.addXp);
  const sfx = useSfx();
  const characters = useMemo(() => new Map(story.characters.map((c) => [c.id, c])), [story.characters]);

  const [phase, setPhase] = useState<Phase>("intro");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [idx, setIdx] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [hints, setHints] = useState(HINTS);
  const [hintUsed, setHintUsed] = useState(false);
  const [score, setScore] = useState(0);
  const [last, setLast] = useState<MiniChoice | null>(null);
  const [result, setResult] = useState<{ xp: number; best: boolean } | null>(null);

  const pool = episode.survival ?? [];
  const meta = langMeta(story.targetLanguage);
  const unlocked = (progress?.endings.length ?? 0) > 0;
  const maxScore = ROUNDS * POINTS.natural;

  if (!hydrated) return <PageShell>{null}</PageShell>;

  if (!unlocked || pool.length < ROUNDS) {
    return (
      <PageShell>
        <Link href={`/story/${story.id}`} className="text-sm font-bold text-ink-soft">
          ← {story.title}
        </Link>
        <div className="mt-6 rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-ink/5">
          <div className="text-4xl">🔒</div>
          <h1 className="mt-2 font-display text-xl font-extrabold">Survival Mode is locked</h1>
          <p className="mt-1 text-sm text-ink-soft">Reach any ending of “{episode.title}” to unlock it.</p>
          <Button href={`/play/${story.id}/${episode.id}`} className="mt-4">
            ▶ Play the episode
          </Button>
        </div>
      </PageShell>
    );
  }

  const start = () => {
    setRounds(shuffle(pool).slice(0, ROUNDS).map((scenario) => ({ scenario, choices: shuffle(scenario.steps[0].choices) })));
    setIdx(0);
    setLives(LIVES);
    setHints(HINTS);
    setHintUsed(false);
    setScore(0);
    setLast(null);
    setResult(null);
    setPhase("round");
  };

  const round = rounds[idx];
  // Fewer hints: no translation, no romaji, no furigana, unless you spend a hint.
  const aids: Aids = resolveAids(3, {});

  const pick = (c: MiniChoice) => {
    setLast(c);
    const pts = POINTS[c.quality];
    setScore((s) => s + pts);
    if (pts === 0) setLives((l) => l - 1);
    sfx(c.quality === "natural" ? "natural" : c.quality === "understandable" ? "okay" : "oops");
    setPhase("feedback");
  };

  const finish = (finalScore: number) => {
    const survivedRounds = Math.min(rounds.length, idx + 1);
    const xp = survivedRounds * XP.survivalRound + (finalScore === maxScore ? 10 : 0);
    addXp(xp);
    const best = recordSurvival(progressKey(story.id, episode.id), finalScore, maxScore);
    setResult({ xp, best });
    sfx(best ? "unlock" : "ending");
    setPhase("over");
  };

  const next = () => {
    if (lives <= 0 || idx + 1 >= rounds.length) {
      finish(score);
      return;
    }
    setIdx(idx + 1);
    setHintUsed(false);
    setLast(null);
    setPhase("round");
  };

  return (
    <LangProvider lang={story.targetLanguage} speech={story.speechLang}>
    <PageShell>
      <div className="mb-3 flex items-center justify-between">
        <Link href={`/story/${story.id}`} className="text-sm font-bold text-ink-soft">
          ← {story.title}
        </Link>
        <span className="rounded-full bg-plum px-3 py-1 font-display text-xs font-extrabold text-white">⚡ SURVIVAL</span>
      </div>

      {phase === "intro" && (
        <div className="animate-rise rounded-3xl bg-gradient-to-br from-plum to-ink p-6 text-white shadow-lg">
          <h1 className="font-display text-2xl font-extrabold">Survival: {episode.title}</h1>
          <p className="mt-2 text-white/85">
            {ROUNDS} new situations related to this episode. No {meta.hasFurigana ? "translations" : "simple-English help"}, shuffled answers, and only {HINTS} hints.
          </p>
          <ul className="mt-3 space-y-1 text-sm text-white/85">
            <li>❤️ {LIVES} lives: awkward or wrong answers cost one</li>
            <li>✨ Natural = 2 pts · 👍 understandable = 1 pt</li>
            <li>💡 A hint shows {meta.hasFurigana ? "furigana and romaji, plus a translation of what they said" : "the stress guide, plus simpler words for what they said"}</li>
          </ul>
          {record && (
            <p className="mt-3 text-sm font-bold text-butter">
              Best: {record.best}/{record.total} · {record.runs} {record.runs === 1 ? "run" : "runs"}
            </p>
          )}
          <button
            type="button"
            onClick={start}
            className="mt-5 w-full rounded-2xl bg-butter px-4 py-3 font-display text-lg font-extrabold text-ink shadow-[0_4px_0_#d9a93a] active:translate-y-0.5"
          >
            Start
          </button>
        </div>
      )}

      {(phase === "round" || phase === "feedback") && round && (
        <div className="scale-text grid gap-3">
          <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-ink/5">
            <span className="font-display text-sm font-extrabold">
              Round {idx + 1}/{rounds.length}
            </span>
            <span className="text-lg tracking-wider" aria-label={`${lives} lives left`}>
              {Array.from({ length: LIVES }, (_, i) => (
                <span key={i} className={cx(i < lives ? "" : "opacity-25 grayscale")}>
                  ❤️
                </span>
              ))}
            </span>
            <span className="font-display text-sm font-extrabold text-tangerine">✦ {score}</span>
          </div>
          <p className="text-sm text-ink-soft">
            <span className="font-bold text-ink">{withStop(round.scenario.title)}</span> {round.scenario.context}
          </p>
          <MiniStage
            step={round.scenario.steps[0]}
            background={round.scenario.background}
            characters={characters}
            aids={aids}
            revealTranslation={hintUsed}
            expressionOverride={phase === "feedback" ? last?.quality : null}
          />
          {phase === "round" && (
            <>
              <MiniChoices choices={round.choices} aids={hintUsed ? { ...aids, furigana: true, romaji: true } : aids} onPick={pick} />
              <button
                type="button"
                disabled={hints === 0 || hintUsed}
                onClick={() => {
                  setHints((h) => h - 1);
                  setHintUsed(true);
                  sfx("flip");
                }}
                className="justify-self-center rounded-full bg-white px-4 py-2 font-display text-sm font-extrabold text-ink shadow-sm ring-1 ring-ink/10 disabled:opacity-40"
              >
                💡 Use a hint ({hints} left)
              </button>
            </>
          )}
          {phase === "feedback" && last && (
            <MiniFeedback
              choice={last}
              better={last.quality === "natural" ? undefined : bestChoice(round.scenario.steps[0].choices)}
              source={`Survival · ${episode.title}`}
              extra={
                <span className={cx("font-display text-sm font-extrabold", POINTS[last.quality] ? "text-tangerine" : "text-q-wrong")}>
                  {POINTS[last.quality] ? `+${POINTS[last.quality]} pts` : "−1 ❤️"}
                </span>
              }
              onNext={next}
              nextLabel={lives <= 0 ? "See results" : idx + 1 >= rounds.length ? "Finish" : "Next situation →"}
            />
          )}
        </div>
      )}

      {phase === "over" && result && (
        <div className="animate-pop rounded-3xl bg-ink p-6 text-center text-white">
          <div className="text-4xl">{lives > 0 ? "🏆" : "💫"}</div>
          <h2 className="mt-1 font-display text-2xl font-extrabold">{lives > 0 ? "You survived!" : "Out of lives"}</h2>
          <p className="mt-1 font-display text-3xl font-extrabold text-butter">
            {score}
            <span className="text-lg text-white/60">/{maxScore}</span>
          </p>
          {result.best && <p className="text-sm font-bold text-butter">New personal best!</p>}
          <div className="mt-3 inline-block rounded-full bg-butter px-4 py-1.5 font-display font-extrabold text-ink">+{result.xp} XP</div>
          <p className="mt-3 text-sm text-white/75">Every situation you met here also helps in the story. Phrases you saved are in your Notebook.</p>
          <div className="mt-4 grid gap-2">
            <button type="button" onClick={start} className="rounded-2xl bg-sakura px-4 py-3 font-display font-extrabold text-white shadow-[0_4px_0_#154940]">
              ↺ Try again (new mix)
            </button>
            <Link href={`/story/${story.id}`} className="py-2 font-display text-sm font-extrabold text-white/80">
              Back to the story
            </Link>
          </div>
        </div>
      )}
    </PageShell>
    </LangProvider>
  );
}
