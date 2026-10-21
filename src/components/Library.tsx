"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Episode, Level, Story } from "@/content/schema";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";
import { dateKey } from "@/lib/dates";
import { langMeta } from "@/lib/lang";
import { progressKey, useGame, useHydrated, useStreak, type EpisodeProgress } from "@/store/game";
import { dailyRecordKey } from "./mini/DailyChallenge";
import { LanguageSwitcher, useCurrentLanguage } from "./LanguageSwitcher";
import { Welcome } from "./flow/OnboardingFlow";
import { LevelBadge, PageShell, cx } from "./ui";

const choicePoints = (ep: Episode) => Object.values(ep.scenes).filter((s) => s.choices?.length).length;

/** Where a learner is in a story: in-progress episode, else the first unfinished one. */
function storyStatus(story: Story, progress: Record<string, EpisodeProgress>, preferLevel?: Level) {
  const eps = story.episodes.map((ep) => ({ ep, p: progress[progressKey(story.id, ep.id)] }));
  const inProgress = eps.find((x) => x.p?.current);
  const firstUnplayed = eps.find((x) => !(x.p?.endings.length ?? 0));
  const preferred = preferLevel ? eps.find((x) => !(x.p?.endings.length ?? 0) && (x.ep.level ?? story.level) === preferLevel) : undefined;
  const pick = inProgress ?? preferred ?? firstUnplayed ?? eps[eps.length - 1];
  const totalEndings = story.episodes.reduce((n, e) => n + e.endings.length, 0);
  const found = eps.reduce((n, x) => n + (x.p?.endings.length ?? 0), 0);
  const completed = eps.filter((x) => (x.p?.endings.length ?? 0) > 0).length;
  return {
    episode: pick.ep,
    episodeIndex: story.episodes.indexOf(pick.ep),
    current: pick.p?.current ?? null,
    choicesDone: pick.p?.current?.history.length ?? 0,
    choiceTotal: choicePoints(pick.ep),
    inProgress: !!inProgress,
    totalEndings,
    found,
    completed,
    allDone: completed === story.episodes.length,
  };
}

export function Library({ stories: allStories, dailyLanguages }: { stories: Story[]; dailyLanguages: string[] }) {
  const hydrated = useHydrated();
  const languages = [...new Set(allStories.map((s) => s.targetLanguage))];
  const lang = useCurrentLanguage(languages);
  const stories = allStories.filter((s) => s.targetLanguage === lang);
  const progress = useGame((s) => s.progress);
  const vocab = useGame((s) => s.vocab);
  const mistakes = useGame((s) => s.mistakes);
  const xp = useGame((s) => s.xp);
  const daily = useGame((s) => s.daily);
  const profile = useGame((s) => s.profile);
  const streak = useStreak();
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(dateKey()), []);

  if (hydrated && !profile.onboarded) return <Welcome />;

  const vocabCount = Object.keys(vocab).length;
  const endingsFound = Object.values(progress).reduce((n, p) => n + p.endings.length, 0);
  const reviewed = Object.values(mistakes).filter((m) => m.reviewed).length;
  const doneToday = today ? (daily[dailyRecordKey(lang, today)] ?? (lang === "ja" ? daily[today] : undefined)) : undefined;

  // The "Continue learning" hero: any in-progress episode first, else the recommended next one.
  const statuses = stories.map((s) => ({ story: s, st: storyStatus(s, progress, profile.approxLevel) }));
  const hero = statuses.find((x) => x.st.inProgress) ?? statuses.find((x) => !x.st.allDone) ?? statuses[0];

  return (
    <PageShell>
      <header className="mb-4">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sakura text-xl text-white shadow-[0_3px_0_#154940]">📖</span>
          <h1 className="font-display text-[26px] font-extrabold leading-none tracking-tight">{APP_NAME}</h1>
        </div>
        <p className="mt-2 text-[15px] text-ink-soft">
          {APP_TAGLINE} Natural {langMeta(lang).name} moves the story forward, and mistakes take you somewhere funny.
        </p>
        {hydrated && <LanguageSwitcher languages={languages} className="mt-3" />}
      </header>

      {/* Light-touch progress strip */}
      {hydrated && (
        <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4" aria-label="Your progress">
          <Stat icon="⭐" value={xp} label="XP" />
          <Stat icon="🔥" value={streak} label={streak === 1 ? "day streak" : "day streak"} />
          <Stat icon="🏁" value={endingsFound} label="endings" />
          <Stat icon="📒" value={vocabCount} label="words" href="/notebook" />
          <Stat icon="🔁" value={reviewed} label="mistakes reviewed" href="/notebook?tab=mistakes" />
        </div>
      )}

      {/* Continue learning */}
      {hydrated && hero && (
        <Link
          href={`/play/${hero.story.id}/${hero.st.episode.id}${hero.st.inProgress ? "" : "?new=1"}`}
          className="group mb-3 flex items-center gap-3 overflow-hidden rounded-3xl bg-ink p-3 pr-4 text-white shadow-lg transition active:scale-[0.99]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hero.story.coverImage} alt="" className="h-20 w-16 shrink-0 rounded-2xl object-cover" />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-widest text-butter">
              {hero.st.inProgress ? "Continue learning" : hero.st.found ? "Up next" : "Recommended start"}
            </div>
            <div className="line-clamp-2 font-display text-lg font-extrabold leading-tight">
              Ep {hero.st.episodeIndex + 1}: {hero.st.episode.title}
            </div>
            <div className="truncate text-xs text-white/70">{hero.story.title}</div>
            {hero.st.inProgress ? (
              <div className="mt-1.5 flex items-center gap-2 text-[11px] font-bold text-white/80">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full rounded-full bg-butter" style={{ width: `${(hero.st.choicesDone / hero.st.choiceTotal) * 100}%` }} />
                </div>
                Choice {Math.min(hero.st.choicesDone + 1, hero.st.choiceTotal)}/{hero.st.choiceTotal}
              </div>
            ) : null}
          </div>
          <span className="shrink-0 rounded-full bg-sakura px-4 py-2 font-display text-sm font-extrabold shadow-[0_3px_0_#154940]">
            {hero.st.inProgress ? "Continue" : "Start"} ▶
          </span>
        </Link>
      )}

      {/* Daily challenge */}
      {hydrated && dailyLanguages.includes(lang) && (
        <Link
          href="/daily"
          className={cx(
            "mb-6 flex items-center gap-3 rounded-3xl p-4 shadow-sm ring-1 transition active:scale-[0.99]",
            doneToday ? "bg-white ring-ink/5" : "bg-gradient-to-r from-butter to-tangerine/70 ring-transparent",
          )}
        >
          <span className="text-3xl">{doneToday ? "✅" : "☀️"}</span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[16px] font-extrabold">Daily Challenge</span>
            <span className="block text-xs font-bold text-ink-soft">
              {doneToday ? `Done today · +${doneToday.xp} XP. See you tomorrow!` : "One quick situation, about 45 seconds"}
            </span>
          </span>
          <span className="font-display font-extrabold text-ink">→</span>
        </Link>
      )}

      <h2 className="mb-3 font-display text-sm font-extrabold uppercase tracking-widest text-ink-soft">Stories</h2>
      <div className="grid grid-cols-1 gap-4">
        {statuses.map(({ story, st }) => {
          const levels = [...new Set(story.episodes.map((e) => e.level ?? story.level))].sort() as Level[];
          const words = hydrated ? Object.values(vocab).filter((v) => v.storyId === story.id).length : 0;
          const wordTotal = story.vocab.length;
          return (
            <div key={story.id} className="overflow-hidden rounded-[28px] bg-white shadow-[0_6px_0_rgba(43,35,64,0.08)] ring-1 ring-ink/5">
              <Link href={`/story/${story.id}`} className="group relative block h-44 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={story.coverImage} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-transparent" />
                <div className="absolute left-3 top-3 flex gap-1">
                  {levels.map((l) => (
                    <LevelBadge key={l} level={l} />
                  ))}
                </div>
                <div className="absolute inset-x-4 bottom-3 text-white">
                  {story.titleNative && <div className="font-display text-sm font-bold opacity-90">{story.titleNative}</div>}
                  <div className="font-display text-2xl font-extrabold leading-tight drop-shadow">{story.title}</div>
                </div>
              </Link>
              <div className="p-4">
                {hydrated && (
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
                    <Info label="Current episode" value={`${st.episodeIndex + 1}. ${st.episode.title}`} />
                    <Info
                      label="Scene progress"
                      value={st.inProgress ? `Choice ${Math.min(st.choicesDone + 1, st.choiceTotal)} of ${st.choiceTotal}` : st.allDone ? "All episodes done ✓" : "Not started"}
                    />
                    <Info label="Endings discovered" value={`${st.found} / ${st.totalEndings}`} bar={st.found / st.totalEndings} />
                    <Info label="Vocabulary learned" value={`${words} / ${wordTotal}`} bar={words / wordTotal} />
                  </dl>
                )}
                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/play/${story.id}/${st.episode.id}${st.inProgress ? "" : "?new=1"}`}
                    className="flex-1 rounded-2xl bg-sakura px-4 py-2.5 text-center font-display font-extrabold text-white shadow-[0_3px_0_#154940] active:translate-y-0.5"
                  >
                    {st.inProgress ? "▶ Continue" : st.found ? "▶ Play next" : "▶ Start"}
                  </Link>
                  <Link href={`/story/${story.id}`} className="rounded-2xl px-4 py-2.5 font-display font-extrabold text-ink ring-2 ring-ink/10">
                    Episodes
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-3xl border-2 border-dashed border-ink/15 p-5 text-center text-sm text-ink-soft">
        <div className="text-2xl">✍️</div>
        More stories are on their way. For now, there’s another ending waiting to be discovered.
      </div>
    </PageShell>
  );
}

function Stat({ icon, value, label, href }: { icon: string; value: number; label: string; href?: string }) {
  const inner = (
    <>
      <span className="font-display text-lg font-extrabold leading-none">
        <span className="mr-1 text-base">{icon}</span>
        {value}
      </span>
      <span className="mt-0.5 block text-[10px] font-bold text-ink-soft">{label}</span>
    </>
  );
  const cls = "shrink-0 rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-ink/5";
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

function Info({ label, value, bar }: { label: string; value: string; bar?: number }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">{label}</dt>
      <dd className="truncate font-bold">{value}</dd>
      {bar !== undefined && (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/10">
          <div className="h-full rounded-full bg-sakura transition-all" style={{ width: `${Math.min(1, bar) * 100}%` }} />
        </div>
      )}
    </div>
  );
}
