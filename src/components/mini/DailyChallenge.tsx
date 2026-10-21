"use client";

import { useEffect, useMemo, useState } from "react";
import type { DailyFile, MiniChoice } from "@/content/schema";
import { resolveAids } from "@/lib/aids";
import { pickDaily } from "@/lib/daily";
import { dateKey } from "@/lib/dates";
import { langMeta } from "@/lib/lang";
import { XP } from "@/lib/scoring";
import { withStop } from "@/lib/text";
import { useGame, useHydrated, useStreak } from "@/store/game";
import { useSfx } from "../audio";
import { LangProvider } from "../lang";
import { LanguageSwitcher, useCurrentLanguage } from "../LanguageSwitcher";
import { Button, PageShell } from "../ui";
import { MiniChoices, MiniFeedback, MiniStage, bestChoice } from "./MiniScene";

type Phase = "intro" | "step" | "feedback" | "done";

/** Daily key per language (older Japanese records were stored under the bare date). */
export function dailyRecordKey(lang: string, day: string) {
  return `${lang}:${day}`;
}

export function DailyChallenge({ files }: { files: Record<string, DailyFile> }) {
  const languages = Object.keys(files);
  const lang = useCurrentLanguage(languages);
  return <DailyForLanguage key={lang} lang={lang} data={files[lang]} languages={languages} />;
}

function DailyForLanguage({ lang, data, languages }: { lang: string; data?: DailyFile; languages: string[] }) {
  const hydrated = useHydrated();
  const settings = useGame((s) => s.settings);
  const profile = useGame((s) => s.profile);
  const records = useGame((s) => s.daily);
  const recordDaily = useGame((s) => s.recordDaily);
  const addXp = useGame((s) => s.addXp);
  const streak = useStreak();
  const sfx = useSfx();

  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(dateKey()), []);
  const challenge = useMemo(() => (today && data?.challenges.length ? pickDaily(data.challenges, today) : null), [today, data]);
  const characters = useMemo(() => new Map((data?.characters ?? []).map((c) => [c.id, c])), [data]);
  const doneToday = today ? (records[dailyRecordKey(lang, today)] ?? (lang === "ja" ? records[today] : undefined)) : undefined;

  const [phase, setPhase] = useState<Phase>("intro");
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<MiniChoice[]>([]);
  const [practice, setPractice] = useState(false);
  const [earned, setEarned] = useState(0);

  if (!hydrated || !today) return <PageShell>{null}</PageShell>;
  if (!challenge) {
    return (
      <PageShell>
        <p className="mt-10 text-center text-ink-soft">No daily challenges available.</p>
      </PageShell>
    );
  }

  const level = settings.level === "story" ? profile.approxLevel : settings.level;
  const aids = resolveAids(level, settings.aids);
  const step = challenge.steps[stepIdx];
  const last = answers[answers.length - 1];

  const pick = (c: MiniChoice) => {
    setAnswers((a) => [...a, c]);
    sfx(c.quality === "natural" ? "natural" : c.quality === "understandable" ? "okay" : "oops");
    setPhase("feedback");
  };

  const next = () => {
    if (stepIdx + 1 < challenge.steps.length) {
      setStepIdx(stepIdx + 1);
      setPhase("step");
      return;
    }
    const natural = answers.filter((a) => a.quality === "natural").length;
    if (!practice && !doneToday) {
      const xp = XP.dailyBase + natural * XP.dailyNatural;
      addXp(xp);
      setEarned(xp);
      recordDaily(dailyRecordKey(lang, today), { challengeId: challenge.id, natural, total: challenge.steps.length, xp });
      sfx("unlock");
    }
    setPhase("done");
  };

  const restart = (asPractice: boolean) => {
    setPractice(asPractice);
    setAnswers([]);
    setStepIdx(0);
    setEarned(0);
    setPhase("step");
  };

  return (
    <LangProvider lang={lang} speech={data?.speechLang}>
    <PageShell>
      <LanguageSwitcher languages={languages} className="mb-3" />
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-[26px] font-extrabold">☀️ Daily Challenge</h1>
          <p className="text-sm text-ink-soft">One quick situation a day · about 45 seconds</p>
        </div>
        <div className="rounded-2xl bg-white px-3 py-2 text-center shadow-sm ring-1 ring-ink/5">
          <div className="font-display text-xl font-extrabold text-tangerine">🔥 {streak}</div>
          <div className="text-[10px] font-bold text-ink-soft">day streak</div>
        </div>
      </div>

      {phase === "intro" && (
        <div className="animate-rise rounded-3xl bg-white p-5 shadow-sm ring-1 ring-ink/5">
          <div className="text-xs font-bold uppercase tracking-widest text-sakura">Today · {today}</div>
          <h2 className="mt-1 font-display text-2xl font-extrabold">{challenge.title}</h2>
          <p className="mt-2 text-[15px] text-ink">{challenge.context}</p>
          <p className="mt-2 text-xs font-bold text-ink-soft">
            {challenge.steps.length} {challenge.steps.length === 1 ? "choice" : "choices"} · up to +
            {XP.dailyBase + challenge.steps.length * XP.dailyNatural} XP
          </p>
          {doneToday ? (
            <div className="mt-4 rounded-2xl bg-[#e3f7eb] p-3 text-sm font-bold text-q-natural">
              ✓ Done for today: {doneToday.natural}/{doneToday.total} natural · +{doneToday.xp} XP. Come back tomorrow for a new one!
            </div>
          ) : null}
          <Button className="mt-4 w-full" onClick={() => restart(!!doneToday)} variant={doneToday ? "secondary" : "primary"}>
            {doneToday ? "Practice again (no XP)" : "Start today’s challenge"}
          </Button>
        </div>
      )}

      {(phase === "step" || phase === "feedback") && step && (
        <div className="scale-text grid gap-3">
          <p className="rounded-2xl bg-white/70 px-3 py-2 text-sm text-ink-soft ring-1 ring-ink/5">
            <span className="font-bold text-ink">{withStop(challenge.title)}</span> {challenge.context}
          </p>
          <MiniStage
            step={step}
            background={challenge.background}
            characters={characters}
            aids={aids}
            expressionOverride={phase === "feedback" ? last?.quality : null}
          />
          {phase === "step" && <MiniChoices choices={step.choices} aids={aids} onPick={pick} />}
          {phase === "feedback" && last && (
            <MiniFeedback
              choice={last}
              better={last.quality === "natural" ? undefined : bestChoice(step.choices)}
              source="Daily Challenge"
              onNext={next}
              nextLabel={stepIdx + 1 < challenge.steps.length ? "Next →" : "Finish"}
            />
          )}
        </div>
      )}

      {phase === "done" && (
        <div className="animate-pop rounded-3xl bg-ink p-6 text-center text-white">
          <div className="text-4xl">{langMeta(lang).celebrate}</div>
          <h2 className="mt-1 font-display text-2xl font-extrabold">Challenge complete</h2>
          <p className="mt-1 text-white/80">
            {answers.filter((a) => a.quality === "natural").length} of {answers.length} answers sounded natural.
          </p>
          {earned > 0 && <div className="mt-3 inline-block rounded-full bg-butter px-4 py-1.5 font-display font-extrabold text-ink">+{earned} XP</div>}
          {practice && <p className="mt-2 text-xs text-white/70">Practice round, so no XP this time.</p>}
          <p className="mt-3 text-sm font-bold text-butter">🔥 {streak}-day streak</p>
          <div className="mt-4 grid gap-2">
            <Button href="/" variant="primary">
              Back to stories
            </Button>
            <button type="button" onClick={() => restart(true)} className="rounded-2xl py-2 font-display text-sm font-extrabold text-white/80">
              ↺ Practice again
            </button>
          </div>
        </div>
      )}
    </PageShell>
    </LangProvider>
  );
}
