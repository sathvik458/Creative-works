"use client";
import { ExportLearning } from "./ExportLearning";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePreview } from "@/store/preview";
import { useGame, useHydrated } from "@/store/game";
import { setLearningLevel } from "./shared";
export function SettingsExtras() {
  const user = usePreview(),
    profile = useGame((s) => s.profile),
    ready = useHydrated();
  const [lang, setLang] = useState(profile.targetLanguage),
    [level, setLevel] = useState("N5"),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    if (ready) {
      setLang(profile.targetLanguage);
      setLevel(
        profile.targetLanguage === "ja"
          ? usePreview.getState().japaneseLevel
          : usePreview.getState().englishLevel,
      );
    }
  }, [ready, profile.targetLanguage]);
  return (
    <>
      <Link
        href="/profile"
        className="mt-4 flex min-h-14 items-center justify-between rounded-2xl bg-white p-4 font-display text-sm font-extrabold ring-1 ring-ink/5"
      >
        <span>☺ {user.name || "Your profile"}</span>
        <span>→</span>
      </Link>
      <section className="mt-6">
        <h2 className="flow-section-title">Language & learning</h2>
        <div className="flow-card space-y-4">
          <label className="block text-xs font-bold">
            Interface language
            <select
              aria-label="Interface language"
              value={user.interfaceLanguage}
              onChange={(e) =>
                user.update({ interfaceLanguage: e.target.value })
              }
              className="flow-input mt-2"
            >
              <option value="en">English</option>
              <option value="ja">日本語 · preview preference</option>
            </select>
          </label>
          <p className="text-[11px] leading-relaxed text-ink-soft">
            English is the implemented interface in this preview. Your language
            preference is saved for future localization.
          </p>
          <label className="block text-xs font-bold">
            Learning language
            <select
              aria-label="Learning language"
              value={lang}
              onChange={(e) => {
                setLang(e.target.value);
                setLevel(
                  e.target.value === "ja"
                    ? user.japaneseLevel
                    : user.englishLevel,
                );
                setSaved(false);
              }}
              className="flow-input mt-2"
            >
              <option value="ja">Japanese</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="block text-xs font-bold">
            Current level
            <select
              aria-label="Current level"
              value={level}
              onChange={(e) => {
                setLevel(e.target.value);
                setSaved(false);
              }}
              className="flow-input mt-2"
            >
              {(lang === "ja"
                ? ["N5", "N4", "N3", "N2", "N1"]
                : ["A1", "A2", "B1", "B2", "C1", "C2"]
              ).map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <button
            className="flow-primary w-full"
            onClick={() => {
              setLearningLevel(lang, level);
              setSaved(true);
            }}
          >
            Confirm preferences
          </button>
          {saved && (
            <p role="status" className="text-sm font-bold text-sakura">
              Preferences saved. Your progress is still here.
            </p>
          )}
        </div>
      </section>
      <section className="mt-6">
        <h2 className="flow-section-title">Appearance</h2>
        <div className="flow-card">
          <p className="mb-3 text-xs text-ink-soft">
            Same familiar story. A little easier on your eyes.
          </p>
          <div className="flex gap-2">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                aria-pressed={user.theme === t}
                onClick={() => user.update({ theme: t })}
                className={
                  user.theme === t
                    ? "flow-primary flex-1"
                    : "flow-secondary flex-1"
                }
              >
                {t === "light" ? "☀ Parchment" : "☾ Evening"}
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="mt-6">
        <h2 className="flow-section-title">A daily nudge</h2>
        <div className="flow-card">
          <button
            role="switch"
            aria-checked={user.reminder}
            className="flex min-h-11 w-full items-center justify-between gap-3 text-sm font-bold"
            onClick={() => user.update({ reminder: !user.reminder })}
          >
            <span>Daily practice reminder</span>
            <span
              className={
                "relative h-6 w-11 shrink-0 rounded-full " +
                (user.reminder ? "bg-sakura" : "bg-ink/15")
              }
            >
              <span
                className={
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white " +
                  (user.reminder ? "right-0.5" : "left-0.5")
                }
              />
            </span>
          </button>
          {user.reminder && (
            <label className="mt-3 flex items-center justify-between text-xs font-bold">
              A good time for you
              <input
                aria-label="Reminder time"
                type="time"
                className="flow-input !w-auto"
                value={user.reminderTime}
                onChange={(e) => user.update({ reminderTime: e.target.value })}
              />
            </label>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
            Preference preview only. This frontend does not schedule
            notifications.
          </p>
        </div>
      </section>
      <ExportLearning />
    </>
  );
}
