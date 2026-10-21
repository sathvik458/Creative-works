"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { DailyFile, Episode, Level, Story } from "@/content/schema";
import { dateKey } from "@/lib/dates";
import { langMeta } from "@/lib/lang";
import { plural } from "@/lib/text";
import { progressKey, useGame, useHydrated, useStreak, vocabKey } from "@/store/game";
import { dailyRecordKey } from "./mini/DailyChallenge";
import { LangProvider } from "./lang";
import { LanguageSwitcher, useCurrentLanguage } from "./LanguageSwitcher";
import { Flashcards, type Card } from "./Notebook";
import { MicroQuiz } from "./player/MicroQuiz";
import { LevelBadge, PageShell, Sheet, cx } from "./ui";

/**
 * Practice hub: every exercise type from the MVP in one place, for the
 * language you're learning: Daily Challenge, episode micro-reviews,
 * Survival Mode, mistake reviews and flashcards.
 */
export function Practice({ stories: allStories, dailyFiles }: { stories: Story[]; dailyFiles: Record<string, DailyFile> }) {
  const hydrated = useHydrated();
  const languages = [...new Set(allStories.map((s) => s.targetLanguage))];
  const lang = useCurrentLanguage(languages);
  const meta = langMeta(lang);
  const stories = allStories.filter((s) => s.targetLanguage === lang);

  const progress = useGame((s) => s.progress);
  const quiz = useGame((s) => s.quiz);
  const survival = useGame((s) => s.survival);
  const mistakes = useGame((s) => s.mistakes);
  const vocab = useGame((s) => s.vocab);
  const phrases = useGame((s) => s.phrases);
  const daily = useGame((s) => s.daily);
  const streak = useStreak();
  const xp = useGame((s) => s.xp);

  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(dateKey()), []);
  const [quizFor, setQuizFor] = useState<{ story: Story; episode: Episode } | null>(null);
  const [cards, setCards] = useState<Card[] | null>(null);

  const storyIds = useMemo(() => new Set(stories.map((s) => s.id)), [stories]);
  const doneToday = today ? (daily[dailyRecordKey(lang, today)] ?? (lang === "ja" ? daily[today] : undefined)) : undefined;
  const hasDaily = !!dailyFiles[lang]?.challenges.length;

  const openMistakes = Object.values(mistakes)
    .filter((m) => storyIds.has(m.storyId) && !m.reviewed)
    .sort((a, b) => b.lastAt - a.lastAt);

  const learningWords = stories.flatMap((s) =>
    s.vocab
      .filter((v) => vocab[vocabKey(s.id, v.id)] && !vocab[vocabKey(s.id, v.id)].known)
      .map<Card>((v) => ({
        id: `${s.id}:${v.id}`,
        front: v.term,
        reading: `${v.reading}${v.romaji ? ` · ${v.romaji}` : ""}`,
        back: v.meaning,
        speak: meta.hasFurigana ? v.reading : v.term,
        lang,
        speech: s.speechLang,
        storyId: s.id,
        vocabId: v.id,
      })),
  );
  const phraseCards = Object.values(phrases)
    .filter((p) => (p.lang ?? (p.storyId ? allStories.find((s) => s.id === p.storyId)?.targetLanguage : "ja") ?? "ja") === lang)
    .map<Card>((p) => ({ id: p.id, front: p.text, reading: p.reading, back: p.translation, speak: p.text, lang }));

  return (
    <PageShell>
      <h1 className="font-display text-[26px] font-extrabold">🏋️ Practice</h1>
      <p className="mt-1 text-sm text-ink-soft">Short exercises for the {meta.name} you’ve met in stories. Pick one, it only takes a minute.</p>
      {hydrated && <LanguageSwitcher languages={languages} className="mt-3" />}

      {hydrated && (
        <div className="mt-4 flex gap-2">
          <Mini icon="🔥" value={streak} label="day streak" />
          <Mini icon="⭐" value={xp} label="XP" />
          <Mini icon="🔁" value={openMistakes.length} label="mistakes to review" />
        </div>
      )}

      {/* Daily */}
      {hasDaily && (
        <Link
          href="/daily"
          className={cx(
            "mt-5 flex items-center gap-3 rounded-3xl p-4 shadow-sm ring-1 transition active:scale-[0.99]",
            doneToday ? "bg-white ring-ink/5" : "bg-gradient-to-r from-butter to-tangerine/70 ring-transparent",
          )}
        >
          <span className="text-3xl">{doneToday ? "✅" : "☀️"}</span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[16px] font-extrabold">Daily Challenge</span>
            <span className="block text-xs font-bold text-ink-soft">
              {hydrated && doneToday ? `Done today · ${doneToday.natural}/${doneToday.total} natural · +${doneToday.xp} XP` : "One quick situation · 30–60 seconds · XP"}
            </span>
          </span>
          <span className="font-display font-extrabold">→</span>
        </Link>
      )}

      {/* Review mistakes + flashcards */}
      <Section title="Quick review">
        <div className="grid grid-cols-1 gap-2">
          <ActionCard
            icon="🔁"
            title="Replay a mistake"
            desc={openMistakes.length ? `${openMistakes.length} waiting. Replay the situation and fix it.` : "No open mistakes. Nice!"}
            href={
              openMistakes[0]
                ? `/play/${openMistakes[0].storyId}/${openMistakes[0].episodeId}?review=${encodeURIComponent(openMistakes[0].id)}`
                : undefined
            }
            secondaryHref={openMistakes.length > 1 ? "/notebook?tab=mistakes" : undefined}
            secondaryLabel="See all"
          />
          <ActionCard
            icon="🃏"
            title="Word flashcards"
            desc={learningWords.length ? `${plural(learningWords.length, "word")} you’re still learning` : "Meet words in a story first."}
            onClick={learningWords.length ? () => setCards(learningWords) : undefined}
          />
          <ActionCard
            icon="💬"
            title="Phrase flashcards"
            desc={phraseCards.length ? `${plural(phraseCards.length, "saved phrase")}` : "Tap ☆ on any line to save phrases."}
            onClick={phraseCards.length ? () => setCards(phraseCards) : undefined}
          />
        </div>
      </Section>

      {/* Episode exercises */}
      {stories.map((story) => (
        <Section key={story.id} title={story.title}>
          <ul className="grid grid-cols-1 gap-2">
            {story.episodes.map((ep, i) => {
              const key = progressKey(story.id, ep.id);
              const done = (progress[key]?.endings.length ?? 0) > 0;
              const q = quiz[key];
              const sv = survival[key];
              const level = (ep.level ?? story.level) as Level;
              return (
                <li key={ep.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-ink/5">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-paper-2 font-display font-extrabold">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-display text-[16px] font-extrabold">{ep.title}</span>
                    <LevelBadge level={level} />
                  </div>
                  {!hydrated ? null : done ? (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {ep.review && (
                        <button
                          type="button"
                          onClick={() => setQuizFor({ story, episode: ep })}
                          className="rounded-2xl bg-ink px-3 py-2.5 text-left text-white active:scale-[0.98]"
                        >
                          <span className="block font-display text-sm font-extrabold">🧠 3-question review</span>
                          <span className="block text-[11px] text-white/75">{q ? `Best ${q.best}/${q.total}` : "Not tried yet"}</span>
                        </button>
                      )}
                      {(ep.survival?.length ?? 0) >= 5 && (
                        <Link href={`/survival/${story.id}/${ep.id}`} className="rounded-2xl bg-plum px-3 py-2.5 text-white active:scale-[0.98]">
                          <span className="block font-display text-sm font-extrabold">⚡ Survival Mode</span>
                          <span className="block text-[11px] text-white/75">{sv ? `Best ${sv.best}/${sv.total}` : "New situations · 3 lives"}</span>
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-ink/5 px-3 py-2.5">
                      <span className="text-xs font-bold text-ink-soft">🔒 Reach any ending to unlock this episode’s review and Survival Mode.</span>
                      <Link href={`/play/${story.id}/${ep.id}`} className="shrink-0 rounded-full bg-sakura px-3 py-1.5 font-display text-xs font-extrabold text-white">
                        Play
                      </Link>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      ))}

      <Sheet
        open={!!quizFor}
        onClose={() => setQuizFor(null)}
        title={
          <>
            <h2 className="font-display text-lg font-extrabold">🧠 {quizFor?.episode.title}</h2>
            <button type="button" onClick={() => setQuizFor(null)} className="rounded-full bg-ink/5 px-3 py-1.5 text-sm font-bold" aria-label="Close review">
              ✕
            </button>
          </>
        }
      >
        {quizFor?.episode.review && (
          <LangProvider lang={quizFor.story.targetLanguage} speech={quizFor.story.speechLang}>
            <MicroQuiz key={quizFor.episode.id} quiz={quizFor.episode.review.quiz} quizKey={progressKey(quizFor.story.id, quizFor.episode.id)} />
          </LangProvider>
        )}
      </Sheet>
      <Flashcards cards={cards} onClose={() => setCards(null)} />
    </PageShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 font-display text-sm font-extrabold uppercase tracking-widest text-ink-soft">{title}</h2>
      {children}
    </section>
  );
}

function Mini({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div className="flex-1 rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-ink/5">
      <div className="font-display text-lg font-extrabold leading-none">
        <span className="mr-1 text-base">{icon}</span>
        {value}
      </div>
      <div className="mt-0.5 text-[10px] font-bold text-ink-soft">{label}</div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  desc,
  href,
  onClick,
  secondaryHref,
  secondaryLabel,
}: {
  icon: string;
  title: string;
  desc: string;
  href?: string;
  onClick?: () => void;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  const enabled = !!href || !!onClick;
  const body = (
    <>
      <span className="text-2xl">{icon}</span>
      <span className="mt-1 block font-display text-[15px] font-extrabold">{title}</span>
      <span className="block text-xs text-ink-soft">{desc}</span>
    </>
  );
  const cls = cx(
    "block rounded-3xl bg-white p-4 text-left shadow-sm ring-1 ring-ink/5 transition",
    enabled ? "active:scale-[0.98] hover:ring-sakura" : "opacity-60",
  );
  return (
    <div className="relative">
      {href ? (
        <Link href={href} className={cls}>
          {body}
        </Link>
      ) : (
        <button type="button" onClick={onClick} disabled={!enabled} className={cx(cls, "w-full")}>
          {body}
        </button>
      )}
      {secondaryHref && (
        <Link href={secondaryHref} className="absolute right-3 top-3 rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-bold text-ink-soft">
          {secondaryLabel}
        </Link>
      )}
    </div>
  );
}
