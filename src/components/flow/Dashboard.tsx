"use client";
import Link from "next/link";
import type { Story } from "@/content/schema";
import { useGame, useHydrated, useStreak } from "@/store/game";
import { usePreview } from "@/store/preview";
import { PageShell, Button } from "../ui";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { Brand, ProfileMenu } from "./shared";
import { Splash, hasPassedSplash } from "./Splash";
import { Welcome } from "./OnboardingFlow";
export function Dashboard({ stories }: { stories: Story[] }) {
  const hydrated = useHydrated(),
    profile = useGame((s) => s.profile),
    progress = useGame((s) => s.progress),
    phrases = useGame((s) => s.phrases),
    vocab = useGame((s) => s.vocab),
    xp = useGame((s) => s.xp),
    streak = useStreak();
  const name = usePreview((s) => s.name);
  const available = stories.filter(
    (s) => s.targetLanguage === profile.targetLanguage,
  );
  const story =
    available.find((s) =>
      s.episodes.some((e) => progress[`${s.id}/${e.id}`]?.current),
    ) ??
    available[0] ??
    stories[0];
  const episode =
    story.episodes.find((e) => progress[`${story.id}/${e.id}`]?.current) ??
    story.episodes.find(
      (e) => !progress[`${story.id}/${e.id}`]?.endings.length,
    ) ??
    story.episodes[0];
  const current = progress[`${story.id}/${episode.id}`]?.current;
  const endings = Object.values(progress).reduce(
      (n, p) => n + p.endings.length,
      0,
    ),
    completed = Object.values(progress).filter(
      (p) => p.endings.length > 0,
    ).length;
  const latest = Object.values(phrases)
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(0, 2);
  const recentWords = stories
    .flatMap((s) =>
      s.vocab
        .filter((v) => vocab[`${s.id}:${v.id}`])
        .map((v) => ({
          term: v.term,
          meaning: v.meaning,
          at: vocab[`${s.id}:${v.id}`].firstSeen,
        })),
    )
    .sort((a, b) => b.at - a.at)
    .slice(0, 2);
  if (!hydrated) return <div className="paper-bg min-h-dvh" />;
  if (!hasPassedSplash()) return <Splash />;
  if (!profile.onboarded) return <Welcome />;
  return (
    <PageShell>
      <header className="mb-5">
        <div className="flex items-center justify-between gap-2">
          <Brand />
          <ProfileMenu />
        </div>
        <h1 className="mt-6 font-display text-[26px] font-extrabold">
          {name
            ? `Hello, ${name.split(" ")[0]}.`
            : "A little more confident, every day."}
        </h1>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">
          A familiar face. A new conversation. Pick up where you left off.
        </p>
        <LanguageSwitcher
          languages={stories.map((s) => s.targetLanguage)}
          className="mt-4"
        />
      </header>
      <div className="mb-5 grid grid-cols-4 gap-2">
        {[
          ["⭐", xp, "XP"],
          ["🔥", streak, "day streak"],
          ["🏁", endings, "endings"],
          ["📒", Object.keys(vocab).length, "words"],
        ].map(([icon, value, label]) => (
          <div
            className="rounded-2xl bg-white px-2 py-3 text-center ring-1 ring-ink/5 shadow-sm"
            key={label}
          >
            <p className="font-display text-lg font-extrabold">
              <span className="mr-1 text-sm">{icon}</span>
              {value}
            </p>
            <p className="mt-0.5 text-[10px] font-bold text-ink-soft">
              {label}
            </p>
          </div>
        ))}
      </div>
      <h2 className="flow-section-title">Continue learning</h2>
      <Link
        href={`/play/${story.id}/${episode.id}${current ? "" : "?new=1"}`}
        className="mb-5 flex items-center gap-3 overflow-hidden rounded-3xl bg-ink p-3 pr-4 text-white shadow-lg"
      >
        <img
          src={story.coverImage}
          alt=""
          className="h-24 w-20 shrink-0 rounded-2xl object-cover"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-butter">
            {current ? "YOUR STORY IS WAITING" : "A GOOD PLACE TO START"}
          </span>
          <span className="mt-1 block font-display text-xl font-extrabold leading-tight">
            {episode.title}
          </span>
          <span className="mt-2 block truncate text-xs text-white/75">
            {story.title} · Episode {story.episodes.indexOf(episode) + 1}
          </span>
          {current && (
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/20">
              <span
                className="block h-full rounded-full bg-butter"
                style={{
                  width: `${Math.max(5, (current.history.length / 5) * 100)}%`,
                }}
              />
            </span>
          )}
        </span>
        <span className="text-xl">→</span>
      </Link>
      <Link
        href="/speak"
        className="mb-6 flex items-center gap-3 rounded-3xl border border-sakura/15 bg-sakura-soft p-4 shadow-[0_3px_0_#c5dbd4]"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sakura text-2xl text-white">
          🎙
        </span>
        <span className="flex-1">
          <span className="block font-display text-lg font-extrabold">
            Speak a little
          </span>
          <span className="mt-0.5 block text-xs text-ink-soft">
            One familiar face. One everyday moment.
          </span>
        </span>
        <span className="font-bold text-sakura">→</span>
      </Link>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flow-section-title !mb-0">A few words to keep</h2>
        <Link href="/notebook" className="text-xs font-bold text-sakura">
          Your notebook →
        </Link>
      </div>
      {latest.length || recentWords.length ? (
        <div className="mb-6 grid gap-2">
          {latest.map((p) => (
            <Link
              href="/notebook?tab=phrases"
              key={p.id}
              className="flow-card !p-4"
            >
              <p className="font-display text-sm font-extrabold">
                {p.text.replace(/\{([^|{}]+)\|[^{}]+\}/g, "$1")}
              </p>
              <p className="mt-1 text-xs text-ink-soft">{p.translation}</p>
            </Link>
          ))}
          {recentWords.map((w) => (
            <Link href="/notebook" key={w.term} className="flow-card !p-4">
              <p className="font-display text-lg font-extrabold">{w.term}</p>
              <p className="mt-1 text-xs text-ink-soft">{w.meaning}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flow-card mb-6 text-center">
          <span className="text-2xl">🌱</span>
          <p className="mt-2 font-display text-sm font-extrabold">
            Your first words are waiting.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            Play a story and tap a word. The useful ones will find a home here.
          </p>
        </div>
      )}
      <h2 className="flow-section-title">Your story so far</h2>
      <div className="flow-card">
        <div className="flex justify-between text-sm">
          <span className="font-bold">Episodes explored</span>
          <span className="text-ink-soft">
            {completed} / {stories.reduce((n, s) => n + s.episodes.length, 0)}
          </span>
        </div>
        <div className="my-3 h-2 overflow-hidden rounded-full bg-ink/5">
          <div
            className="h-full rounded-full bg-sakura"
            style={{
              width: `${(completed / stories.reduce((n, s) => n + s.episodes.length, 0)) * 100}%`,
            }}
          />
        </div>
        <p className="text-xs leading-relaxed text-ink-soft">
          Every conversation is a little practice. There’s no rush to get it
          perfect.
        </p>
      </div>
      <Button href="/stories" variant="secondary" className="mt-5 w-full">
        Explore all stories →
      </Button>
    </PageShell>
  );
}
