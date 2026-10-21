"use client";

import { useCallback, useEffect, useState } from "react";
import { isSpeakable, speak, speechSupported, stopSpeaking, useSpeechState } from "@/lib/audio";
import { playSfx, type Sfx } from "@/lib/sfx";
import { phraseId, useGame, type PhraseRecord } from "@/store/game";
import { useLang } from "./lang";
import { cx } from "./ui";

/** Sound effects that respect the user's setting. */
export function useSfx() {
  return useCallback((name: Sfx) => {
    if (useGame.getState().settings.sfx) playSfx(name);
  }, []);
}

/**
 * Speech helper that respects audio settings (enabled + rate). The voice comes
 * from the nearest <LangProvider>, or from an explicit `lang` argument.
 */
export function useSpeech() {
  const [supported, setSupported] = useState(false);
  useEffect(() => setSupported(speechSupported()), []);
  const enabled = useGame((s) => s.settings.audio.enabled);
  const { speech } = useLang();
  const speakText = useCallback(
    (key: string, markup: string, lang?: string) => {
      const { audio } = useGame.getState().settings;
      if (!audio.enabled) return;
      speak(key, markup, { rate: audio.rate, lang: lang ?? speech });
    },
    [speech],
  );
  return { available: supported && enabled, speak: speakText, stop: stopSpeaking, lang: speech };
}

/** 🔊 Listen / replay button. Tapping while it plays restarts from the beginning. */
export function ListenButton({
  id,
  text,
  size = "md",
  tone = "light",
  className,
  label = "Listen",
}: {
  id: string;
  text: string;
  size?: "sm" | "md";
  tone?: "light" | "dark";
  className?: string;
  label?: string;
}) {
  const { available, speak: say, lang } = useSpeech();
  const speaking = useSpeechState((s) => s.speakingKey === id);
  if (!available || !isSpeakable(text, lang)) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        say(id, text);
      }}
      aria-label={speaking ? `Replay: ${label}` : label}
      title={speaking ? "Replay" : "Listen"}
      className={cx(
        "grid shrink-0 place-items-center rounded-full transition active:scale-90",
        size === "sm" ? "h-8 w-8 text-sm" : "h-9 w-9 text-base",
        tone === "dark" ? "bg-white/15 text-white ring-1 ring-white/25" : "bg-white text-ink shadow-sm ring-1 ring-ink/10",
        speaking && "ring-2 ring-sakura",
        className,
      )}
    >
      {speaking ? <SpeakingBars /> : "🔊"}
    </button>
  );
}

function SpeakingBars() {
  return (
    <span className="flex h-3.5 items-end gap-[2px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-[3px] animate-eq rounded-full bg-sakura" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}

/** 1× / 0.75× speech-rate toggle (stored in settings). */
export function SpeedToggle({ className }: { className?: string }) {
  const rate = useGame((s) => s.settings.audio.rate);
  const enabled = useGame((s) => s.settings.audio.enabled);
  const setAudio = useGame((s) => s.setAudio);
  const [supported, setSupported] = useState(false);
  useEffect(() => setSupported(speechSupported()), []);
  if (!supported || !enabled) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setAudio({ rate: rate === 1 ? 0.75 : 1 });
      }}
      className={cx(
        "h-8 shrink-0 rounded-full bg-white px-2 font-display text-[11px] font-extrabold text-ink shadow-sm ring-1 ring-ink/10 active:scale-95",
        rate === 0.75 && "bg-sky text-white ring-sky",
        className,
      )}
      aria-label={`Speech speed ${rate === 1 ? "1x" : "0.75x"}. Tap to switch`}
      title="Speech speed"
    >
      {rate === 1 ? "1×" : "0.75×"}
    </button>
  );
}

/** ☆ Save / ★ saved toggle for the Phrase Bank. */
export function SavePhraseButton({
  phrase,
  size = "md",
  className,
}: {
  phrase: Omit<PhraseRecord, "id" | "savedAt">;
  size?: "sm" | "md";
  className?: string;
}) {
  const saved = useGame((s) => !!s.phrases[phraseId(phrase.text)]);
  const toggle = useGame((s) => s.togglePhrase);
  const sfx = useSfx();
  const { meta } = useLang();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (toggle({ ...phrase, lang: phrase.lang ?? meta.code })) sfx("select");
      }}
      aria-pressed={saved}
      aria-label={saved ? "Remove from Phrase Bank" : "Save to Phrase Bank"}
      title={saved ? "Saved to Phrase Bank" : "Save phrase"}
      className={cx(
        "grid shrink-0 place-items-center rounded-full shadow-sm ring-1 transition active:scale-90",
        size === "sm" ? "h-8 w-8 text-sm" : "h-9 w-9 text-base",
        saved ? "bg-butter text-ink ring-butter" : "bg-white text-ink-soft ring-ink/10",
        className,
      )}
    >
      {saved ? "★" : "☆"}
    </button>
  );
}
