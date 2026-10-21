"use client";

import { useState } from "react";
import { SignOutButton } from "./flow/shared";
import { SettingsExtras } from "./flow/SettingsExtras";
import type { Level } from "@/content/schema";
import { LEVEL_INFO, resolveAids, type TranslationMode } from "@/lib/aids";
import { langMeta } from "@/lib/lang";
import {
  useGame,
  useHydrated,
  type TextSize,
  type TextSpeed,
} from "@/store/game";
import { ListenButton, useSfx } from "./audio";
import { LangProvider } from "./lang";
import { RichText } from "./RichText";
import { Button, LevelBadge, PageShell, cx } from "./ui";

export function SettingsView() {
  const hydrated = useHydrated();
  const settings = useGame((s) => s.settings);
  const setSettings = useGame((s) => s.setSettings);
  const setAid = useGame((s) => s.setAid);
  const resetProgress = useGame((s) => s.resetProgress);
  const setAudio = useGame((s) => s.setAudio);
  const sfx = useSfx();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const profile = useGame((s) => s.profile);
  const previewLevel: Level = settings.level === "story" ? 1 : settings.level;
  const meta = langMeta(profile.targetLanguage);
  const SAMPLE = meta.sample;
  const resolvedAids = resolveAids(previewLevel, settings.aids);
  const aids = {
    ...resolvedAids,
    furigana: resolvedAids.furigana && meta.hasFurigana,
  };
  const hasOverrides = Object.values(settings.aids).some(
    (v) => v !== undefined,
  );

  if (!hydrated) return <PageShell>{null}</PageShell>;

  return (
    <PageShell>
      <h1 className="font-display text-[26px] font-extrabold">⚙️ Settings</h1>

      <SettingsExtras />
      <Section
        title="Hint level"
        hint="Controls which reading aids show by default. Each episode has its own level unless you override it here."
      >
        <div className="grid gap-2">
          <LevelOption
            active={settings.level === "story"}
            onClick={() => setSettings({ level: "story" })}
            title="Follow each episode"
            desc="Recommended. Episode 1 is Level 1, Episode 3 is Level 3, and so on."
          />
          {([1, 2, 3] as Level[]).map((l) => (
            <LevelOption
              key={l}
              active={settings.level === l}
              onClick={() => setSettings({ level: l })}
              title={
                <span className="flex items-center gap-2">
                  <LevelBadge level={l} /> {LEVEL_INFO[l].label} · ~
                  {meta.levels[l]}
                </span>
              }
              desc={LEVEL_INFO[l].blurb}
            />
          ))}
        </div>
      </Section>

      <Section
        title="Display aids"
        hint={`"Auto" follows the level. Changing the level resets these to Auto.`}
      >
        <div className="rounded-2xl bg-white p-1 ring-1 ring-ink/5">
          <TriRow
            label="Furigana ふりがな (Japanese)"
            value={settings.aids.furigana}
            onChange={(v) => setAid({ furigana: v })}
          />
          <TriRow
            label="Romaji / stress guide"
            value={settings.aids.romaji}
            onChange={(v) => setAid({ romaji: v })}
          />
          <div className="flex items-center justify-between gap-2 px-3 py-2.5">
            <span className="text-sm font-bold">
              Translation / simple English
            </span>
            <Segmented
              value={settings.aids.translation ?? "auto"}
              options={[
                ["auto", "Auto"],
                ["show", "Show"],
                ["tap", "Tap"],
                ["off", "Off"],
              ]}
              onChange={(v) =>
                setAid({
                  translation:
                    v === "auto" ? undefined : (v as TranslationMode),
                })
              }
            />
          </div>
        </div>
        {hasOverrides && (
          <button
            type="button"
            onClick={() => setSettings({ aids: {} })}
            className="mt-2 text-sm font-bold text-sakura"
          >
            ↺ Reset aids to level defaults
          </button>
        )}

        <div className="mt-3 rounded-2xl border-2 border-dashed border-ink/15 bg-paper p-4">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            Preview · {meta.name} ·{" "}
            {settings.level === "story"
              ? "Level 1 episode"
              : `Level ${settings.level}`}
          </div>
          <p
            className={cx(
              "font-display text-xl font-bold",
              aids.furigana ? "leading-[2.1]" : "leading-relaxed",
            )}
          >
            <RichText text={SAMPLE.text} furigana={aids.furigana} />
          </p>
          {aids.romaji && (
            <p
              className={cx(
                "text-[13px] text-ink-soft",
                meta.hasFurigana ? "italic" : "tracking-wide",
              )}
            >
              {meta.hasFurigana ? SAMPLE.reading : `🗣 ${SAMPLE.reading}`}
            </p>
          )}
          {aids.translation === "show" && (
            <p className="text-sm text-ink/80">
              {meta.hasFurigana
                ? `“${SAMPLE.translation}”`
                : `💬 ${SAMPLE.translation}`}
            </p>
          )}
          {aids.translation === "tap" && (
            <span className="mt-1 inline-block rounded-full bg-ink/5 px-2.5 py-0.5 text-xs font-bold text-ink-soft">
              {meta.revealLabel}
            </span>
          )}
        </div>
      </Section>

      <Section title="Text speed">
        <Segmented
          full
          value={settings.textSpeed}
          options={[
            ["slow", "Slow"],
            ["normal", "Normal"],
            ["fast", "Fast"],
            ["instant", "Instant"],
          ]}
          onChange={(v) => setSettings({ textSpeed: v as TextSpeed })}
        />
      </Section>

      <Section
        title="Audio"
        hint={`Spoken ${meta.name} uses your browser’s built-in voices (Web Speech API).`}
      >
        <div className="rounded-2xl bg-white p-1 ring-1 ring-ink/5">
          <Toggle
            label="🔊 Audio playback (Listen buttons)"
            on={settings.audio.enabled}
            onChange={(v) => setAudio({ enabled: v })}
          />
          <Toggle
            label="Autoplay each new line"
            on={settings.audio.autoplay}
            onChange={(v) =>
              setAudio({ autoplay: v, enabled: v || settings.audio.enabled })
            }
          />
          <div className="flex items-center justify-between gap-2 border-b border-ink/5 px-3 py-2.5">
            <span className="text-sm font-bold">Audio speed</span>
            <Segmented
              value={String(settings.audio.rate)}
              options={[
                ["0.75", "0.75×"],
                ["1", "1×"],
              ]}
              onChange={(v) => setAudio({ rate: v === "1" ? 1 : 0.75 })}
            />
          </div>
          <Toggle
            label="Sound effects"
            on={settings.sfx}
            onChange={(v) => {
              setSettings({ sfx: v });
              if (v) window.setTimeout(() => sfx("natural"), 30);
            }}
          />
        </div>
        <div className="mt-2 flex items-center gap-2 rounded-2xl bg-paper-2/60 px-3 py-2 text-sm">
          <span className="min-w-0 flex-1">
            Test:{" "}
            <span className="font-display font-bold">
              <RichText text={SAMPLE.text} furigana={false} />
            </span>
          </span>
          <LangProvider lang={meta.code}>
            <ListenButton id="settings:test" text={SAMPLE.text} size="sm" />
          </LangProvider>
        </div>
        {!settings.audio.enabled && (
          <p className="mt-1 text-xs text-ink-soft">
            Listen buttons are hidden while audio playback is off.
          </p>
        )}
      </Section>

      <Section title="Accessibility">
        <div className="rounded-2xl bg-white p-1 ring-1 ring-ink/5">
          <div className="flex items-center justify-between gap-2 border-b border-ink/5 px-3 py-2.5">
            <span className="text-sm font-bold">Text size</span>
            <Segmented
              value={settings.textSize}
              options={[
                ["s", "S"],
                ["m", "M"],
                ["l", "L"],
                ["xl", "XL"],
              ]}
              onChange={(v) => setSettings({ textSize: v as TextSize })}
            />
          </div>
          <Toggle
            label="Reduce animations"
            on={settings.reduceMotion}
            onChange={(v) => setSettings({ reduceMotion: v })}
          />
          <Toggle
            label="High contrast"
            on={settings.highContrast}
            onChange={(v) => setSettings({ highContrast: v })}
          />
        </div>
      </Section>

      <Section
        title="Progress"
        hint="Clears endings, saved playthroughs, notebook words, phrases, mistakes, XP and streaks on this device."
      >
        {resetDone ? (
          <p className="text-sm font-bold text-matcha">Progress reset ✓</p>
        ) : confirmReset ? (
          <div className="flex gap-2">
            <Button
              className="flex-1 !bg-q-wrong !shadow-[0_4px_0_#b3324a]"
              onClick={() => {
                resetProgress();
                setConfirmReset(false);
                setResetDone(true);
              }}
            >
              Yes, erase everything
            </Button>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setConfirmReset(true)}>
            🗑️ Reset progress
          </Button>
        )}
      </Section>

      <Section title="Account">
        <SignOutButton />
      </Section>
      <p className="mt-8 text-center text-xs text-ink-soft">
        {meta.aidSummary}
      </p>
    </PageShell>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="font-display text-base font-extrabold">{title}</h2>
      {hint && <p className="mb-2 text-xs text-ink-soft">{hint}</p>}
      <div className={cx(!hint && "mt-2")}>{children}</div>
    </section>
  );
}

function LevelOption({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: React.ReactNode;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "rounded-2xl bg-white p-3 text-left ring-2 transition active:scale-[0.99]",
        active ? "ring-sakura shadow-[0_3px_0_#c5dbd4]" : "ring-ink/5",
      )}
    >
      <div className="flex items-center justify-between gap-2 font-display text-[15px] font-extrabold">
        {title}
        <span
          className={cx(
            "h-5 w-5 shrink-0 rounded-full border-2",
            active
              ? "border-sakura bg-sakura shadow-[inset_0_0_0_3px_white]"
              : "border-ink/20",
          )}
        />
      </div>
      <p className="mt-1 text-xs text-ink-soft">{desc}</p>
    </button>
  );
}

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between gap-2 border-b border-ink/5 px-3 py-2.5 text-left last:border-b-0"
    >
      <span className="text-sm font-bold">{label}</span>
      <span
        className={cx(
          "relative h-6 w-11 shrink-0 rounded-full transition",
          on ? "bg-matcha" : "bg-ink/15",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
            on ? "left-[22px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

function TriRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | undefined;
  onChange: (v: boolean | undefined) => void;
}) {
  const cur = value === undefined ? "auto" : value ? "on" : "off";
  return (
    <div className="flex items-center justify-between gap-2 border-b border-ink/5 px-3 py-2.5">
      <span className="text-sm font-bold">{label}</span>
      <Segmented
        value={cur}
        options={[
          ["auto", "Auto"],
          ["on", "On"],
          ["off", "Off"],
        ]}
        onChange={(v) => onChange(v === "auto" ? undefined : v === "on")}
      />
    </div>
  );
}

function Segmented({
  value,
  options,
  onChange,
  full,
}: {
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
  full?: boolean;
}) {
  return (
    <div
      className={cx(
        "inline-flex rounded-full bg-ink/5 p-1",
        full && "flex w-full",
      )}
      role="radiogroup"
    >
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cx(
            "rounded-full px-3 py-1 text-xs font-bold transition",
            full && "flex-1 py-2 text-sm",
            value === v ? "bg-white text-ink shadow" : "text-ink-soft",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
