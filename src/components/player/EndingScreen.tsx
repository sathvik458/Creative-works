"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Ending, Episode, Story } from "@/content/schema";
import type { PlayState } from "@/engine/engine";
import { ENDING_TYPE_META } from "@/lib/config";
import { summarizeRun, type Tally } from "@/lib/scoring";
import { renderEndingCard, shareOrDownload } from "@/lib/shareCard";
import { ListenButton, SavePhraseButton } from "../audio";
import { useLang } from "../lang";
import { RichText } from "../RichText";
import { Button, EndingTypeBadge, cx } from "../ui";
import { MicroQuiz } from "./MicroQuiz";

export function EndingScreen({
  story,
  episode,
  ending,
  run,
  isNew,
  survivalUnlocked,
  foundIds,
  newWords,
  seenWords,
  runXp,
  nextEpisode,
  onReplay,
  onJump,
  onOpenMap,
  onVocab,
}: {
  story: Story;
  episode: Episode;
  ending: Ending;
  run: PlayState;
  isNew: boolean;
  survivalUnlocked: boolean;
  foundIds: string[];
  newWords: string[];
  seenWords: string[];
  runXp: number;
  nextEpisode?: Episode;
  onReplay: () => void;
  onJump: (historyIndex: number) => void;
  onOpenMap: () => void;
  onVocab: (id: string) => void;
}) {
  const meta = ENDING_TYPE_META[ending.type];
  const { meta: lang } = useLang();
  const total = episode.endings.length;
  const found = episode.endings.filter((e) => foundIds.includes(e.id)).length;
  const character = ending.character ? story.characters.find((c) => c.id === ending.character) : undefined;
  const vocabById = useMemo(() => new Map(story.vocab.map((v) => [v.id, v])), [story.vocab]);
  const summary = useMemo(() => summarizeRun(episode, run), [episode, run]);
  const source = `${story.title} · ${episode.title}`;

  const [card, setCard] = useState<{ blob: Blob; url: string } | null>(null);
  const [shareState, setShareState] = useState<"idle" | "working" | "shared" | "downloaded" | "error">("idle");

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    renderEndingCard({ story, episode, ending, character, found, total })
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setCard({ blob, url });
      })
      .catch(() => setShareState("error"));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [story, episode, ending, character, found, total]);

  const share = async () => {
    if (!card) return;
    setShareState("working");
    try {
      const res = await shareOrDownload(
        card.blob,
        `${story.id}-${episode.id}-${ending.id}.png`,
        `I got the “${ending.title}” ending in ${story.title} (${found}/${total} endings found)!`,
      );
      setShareState(res === "cancelled" ? "idle" : res);
    } catch {
      setShareState("error");
    }
  };

  const words = (newWords.length ? newWords : seenWords).map((id) => vocabById.get(id)).filter((v) => !!v);
  const survivalAvailable = (episode.survival?.length ?? 0) >= 5;

  return (
    <div className="absolute inset-0 z-40 overflow-y-auto bg-paper paper-bg">
      <div className="scale-text mx-auto max-w-md px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="mb-3 flex items-center justify-between">
          <Link href={`/story/${story.id}`} className="rounded-full bg-white px-3 py-1.5 text-sm font-bold shadow-sm ring-1 ring-ink/5">
            ← Story
          </Link>
          <span className="font-display text-sm font-extrabold tracking-[0.3em] text-ink-soft">{lang.endLabel}</span>
        </div>

        {/* Card preview */}
        <div className="relative animate-pop overflow-hidden rounded-[28px] shadow-xl ring-1 ring-ink/5" style={{ aspectRatio: "1080 / 1350", background: meta.bg }}>
          {card ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.url} alt={`Ending card: ${ending.title}`} className="h-full w-full" />
          ) : (
            <div className="grid h-full place-items-center font-display font-bold text-ink-soft">Drawing your card…</div>
          )}
          {isNew && (
            <span className="absolute right-3 top-3 animate-bob rounded-full bg-butter px-3 py-1 font-display text-xs font-extrabold text-ink shadow">
              NEW ENDING!
            </span>
          )}
        </div>
        <Button onClick={share} disabled={!card || shareState === "working"} className="mt-3 w-full">
          {shareState === "working" ? "Preparing…" : "📤 Share ending card"}
        </Button>
        {shareState === "downloaded" && <p className="mt-1 text-center text-xs font-bold text-matcha">Saved the card as a PNG ✓</p>}
        {shareState === "shared" && <p className="mt-1 text-center text-xs font-bold text-matcha">Shared ✓</p>}
        {shareState === "error" && <p className="mt-1 text-center text-xs font-bold text-q-wrong">Couldn’t create the image. Try again.</p>}

        {/* Ending + teaching point */}
        <div className="mt-5">
          <EndingTypeBadge type={ending.type} />
          <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight">{ending.title}</h1>
          {ending.titleNative && <div className="font-display text-lg font-bold text-sakura">{ending.titleNative}</div>}
          <p className="mt-2 text-[15px] leading-relaxed text-ink">{ending.summary}</p>
        </div>
        <div className="mt-4 rounded-2xl border-2 border-butter bg-[#fffaf0] p-4">
          <div className="font-display text-xs font-extrabold uppercase tracking-wider text-tangerine">💡 Teaching point</div>
          <p className="mt-1 text-[15px] leading-relaxed">{ending.teachingPoint}</p>
        </div>

        {/* Episode summary */}
        <section className="mt-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-base font-extrabold">This playthrough</h2>
            {runXp > 0 && <span className="rounded-full bg-butter/60 px-2.5 py-0.5 font-display text-xs font-extrabold">+{runXp} XP</span>}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <SummaryTile icon="✨" tally={summary.naturalness} label="choices sounded natural" />
            <SummaryTile icon="👂" tally={summary.comprehension} label="questions understood" />
            <SummaryTile
              icon="📒"
              value={`${seenWords.length}`}
              label={newWords.length ? `words met · ${newWords.length} new` : "words met"}
            />
            <SummaryTile icon="🏁" value={`${found}/${total}`} label="endings discovered" />
          </div>
          {summary.politeness.total > 0 && (
            <p className="mt-2 text-xs text-ink-soft">
              Politeness: {summary.politeness.hit} of {summary.politeness.total} register choices fit the situation.
            </p>
          )}
          <p className="mt-1 text-xs text-ink-soft">These describe this run’s choices, not you. Replay to explore other paths.</p>
        </section>

        {/* Fast replay */}
        <section className="mt-5">
          <h2 className="font-display text-base font-extrabold">Replay</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={onReplay}>
              ↺ From the start
            </Button>
            <Button variant="secondary" onClick={onOpenMap}>
              🗺️ Choice map
            </Button>
          </div>
          {run.history.length > 0 && (
            <>
              <p className="mt-3 text-xs font-bold text-ink-soft">Jump back to a choice (endings and words you found are kept):</p>
              <div className="no-scrollbar -mx-4 mt-1.5 flex gap-2 overflow-x-auto px-4 pb-1">
                {run.history.map((h, i) => {
                  const choice = episode.scenes[h.sceneId]?.choices?.find((c) => c.id === h.choiceId);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onJump(i)}
                      className="flex max-w-[11rem] shrink-0 items-center gap-2 rounded-2xl bg-white px-3 py-2 text-left shadow-sm ring-1 ring-ink/5 active:scale-95"
                    >
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sakura font-display text-xs font-extrabold text-white">
                        {i + 1}
                      </span>
                      <span className="truncate text-[13px] font-bold">{choice ? <RichText text={choice.text} furigana={false} /> : "…"}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {survivalAvailable && (
          <Link
            href={`/survival/${story.id}/${episode.id}`}
            className={cx(
              "mt-5 flex items-center gap-3 rounded-3xl p-4 text-white shadow-lg transition active:scale-[0.99]",
              survivalUnlocked ? "animate-pop bg-gradient-to-r from-plum to-sakura" : "bg-plum",
            )}
          >
            <span className="text-3xl">⚡</span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-lg font-extrabold">{survivalUnlocked ? "Survival Mode unlocked!" : "Survival Mode"}</span>
              <span className="block text-sm text-white/85">New situations, fewer hints, 3 lives. Can you survive?</span>
            </span>
            <span className="font-display font-extrabold">→</span>
          </Link>
        )}

        {/* Episode review */}
        {words.length > 0 && (
          <section className="mt-6">
            <h2 className="font-display text-base font-extrabold">{newWords.length ? `Vocabulary learned (${newWords.length})` : "Vocabulary in this run"}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {words.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onVocab(v.id)}
                  className="rounded-xl bg-white px-3 py-1.5 text-left shadow-sm ring-1 ring-ink/5 active:scale-95"
                >
                  <span className="font-display font-extrabold">{v.term}</span>
                  <span className="ml-1.5 text-xs text-ink-soft">{v.meaning.split(/[;(—]/)[0].trim()}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {episode.review && (
          <>
            <section className="mt-6">
              <h2 className="font-display text-base font-extrabold">Important phrases</h2>
              <ul className="mt-2 grid gap-2">
                {episode.review.phrases.map((p) => (
                  <li key={p.text} className="flex items-start gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-ink/5">
                    <div className="min-w-0 flex-1">
                      <div className={cx("font-display text-[17px] font-bold", lang.hasFurigana ? "leading-[2]" : "leading-snug")}>
                        <RichText text={p.text} furigana={lang.hasFurigana} />
                      </div>
                      <div className={cx("text-[13px] text-ink-soft", lang.hasFurigana ? "italic" : "tracking-wide")}>
                        {lang.hasFurigana ? p.reading : `🗣 ${p.reading}`}
                      </div>
                      <div className="text-[14px]">{lang.hasFurigana ? `“${p.translation}”` : `💬 ${p.translation}`}</div>
                      {p.note && <div className="mt-1 text-xs font-bold text-plum">{p.note}</div>}
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5">
                      <ListenButton id={`review:${p.text}`} text={p.text} size="sm" />
                      <SavePhraseButton
                        size="sm"
                        phrase={{ text: p.text, reading: p.reading, translation: p.translation, source, storyId: story.id, context: p.note }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-6">
              <h2 className="font-display text-base font-extrabold">Grammar points</h2>
              <div className="mt-2 grid gap-2">
                {episode.review.grammar.map((g) => (
                  <details key={g.title} className="group rounded-2xl bg-white p-3 shadow-sm ring-1 ring-ink/5">
                    <summary className="cursor-pointer list-none font-display text-[15px] font-extrabold">
                      <span className="mr-1 inline-block transition group-open:rotate-90">▸</span> {g.title}
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed">{g.explanation}</p>
                    {g.example && (
                      <div className="mt-2 rounded-xl bg-paper px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 font-display font-bold">{g.example}</span>
                          <ListenButton id={`grammar:${g.title}`} text={g.example} size="sm" />
                        </div>
                        {g.exampleTranslation && <div className="text-xs italic text-ink-soft">{g.exampleTranslation}</div>}
                      </div>
                    )}
                  </details>
                ))}
              </div>
            </section>

            <section className="mt-6">
              <MicroQuiz quiz={episode.review.quiz} quizKey={`${story.id}/${episode.id}`} />
            </section>
          </>
        )}

        {/* Endings found */}
        <section className="mt-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-base font-extrabold">Endings found</h2>
            <span className="font-display text-2xl font-extrabold text-sakura">
              {found}
              <span className="text-base text-ink-soft">/{total}</span>
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {episode.endings.map((e) => {
              const got = foundIds.includes(e.id);
              const m = ENDING_TYPE_META[e.type];
              const showType = got || e.type !== "hidden";
              return (
                <div
                  key={e.id}
                  className={cx(
                    "relative rounded-2xl p-3 ring-2 transition",
                    e.id === ending.id ? "ring-sakura" : "ring-transparent",
                    got ? "bg-white shadow-sm" : "bg-ink/5",
                  )}
                >
                  <div className="text-2xl" style={{ color: got ? m.color : "rgba(43,35,64,0.25)" }}>
                    {got ? m.icon : "?"}
                  </div>
                  <div className={cx("font-display text-sm font-extrabold leading-tight", !got && "text-ink/30")}>{got ? e.title : "？？？"}</div>
                  <div className="text-[11px] font-bold" style={{ color: got ? m.color : "rgba(43,35,64,0.35)" }}>
                    {showType ? m.short : "Secret"}
                  </div>
                </div>
              );
            })}
          </div>
          {found < total && <p className="mt-2 text-xs text-ink-soft">Try different answers. Every ending teaches something new.</p>}
        </section>

        <div className="mt-6 grid gap-2.5">
          {nextEpisode ? (
            <Button variant="dark" href={`/play/${story.id}/${nextEpisode.id}?new=1`}>
              Next episode: {nextEpisode.title} →
            </Button>
          ) : (
            <Button variant="dark" href={`/story/${story.id}`}>
              Back to the story
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryTile({ icon, tally, value, label }: { icon: string; tally?: Tally; value?: string; label: string }) {
  const text = value ?? (tally && tally.total > 0 ? `${tally.hit}/${tally.total}` : "—");
  const pct = tally && tally.total > 0 ? tally.hit / tally.total : null;
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-ink/5">
      <div className="flex items-center gap-1.5">
        <span aria-hidden>{icon}</span>
        <span className="font-display text-xl font-extrabold">{text}</span>
      </div>
      <div className="text-[11px] font-bold leading-tight text-ink-soft">{label}</div>
      {pct !== null && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/10">
          <div className="h-full rounded-full bg-matcha" style={{ width: `${pct * 100}%` }} />
        </div>
      )}
    </div>
  );
}
