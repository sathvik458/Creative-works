"use client";

import { langMeta, sortLangs } from "@/lib/lang";
import { useGame } from "@/store/game";
import { useSfx } from "./audio";
import { cx } from "./ui";

/** "I'm learning: 🇯🇵 Japanese | 🇬🇧 English" — switches the course shown across the app. */
export function LanguageSwitcher({ languages, className }: { languages: string[]; className?: string }) {
  const current = useCurrentLanguage(languages);
  const setProfile = useGame((s) => s.setProfile);
  const sfx = useSfx();
  if (languages.length < 2) return null;
  return (
    <div className={cx("flex items-center gap-2", className)} role="radiogroup" aria-label="Language you're learning">
      <span className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">Learning</span>
      <div className="inline-flex rounded-full bg-ink/5 p-1">
        {sortLangs(languages).map((code) => {
          const m = langMeta(code);
          const active = code === current;
          return (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                if (!active) sfx("flip");
                setProfile({ targetLanguage: code });
              }}
              className={cx(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 font-display text-sm font-extrabold transition",
                active ? "bg-white text-ink shadow" : "text-ink-soft",
              )}
            >
              <span aria-hidden>{m.flag}</span>
              {m.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The learner's current target language, falling back to the first one that has content. */
export function useCurrentLanguage(languages: string[]): string {
  const target = useGame((s) => s.profile.targetLanguage);
  return languages.includes(target) ? target : (sortLangs(languages)[0] ?? "ja");
}
