"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { speak, stopSpeaking } from "@/lib/audio";
import { OTTO_OUTFITS, SHIRT_LABEL_MAX, TOMO_OUTFITS, cleanShirtLabel, type Outfit } from "@/lib/characters";
import { cuesFromText, mouthAt, type MouthCue } from "@/lib/lipsync";
import { OttoCharacter } from "./OttoCharacter";
import type { CharacterMood, CharacterReaction } from "./RiveCharacter";
import { TomoCharacter } from "./TomoCharacter";
import { YapCharacter } from "./YapCharacter";
import { cx } from "./ui";

const RATE = 0.95;
type Action = CharacterMood | "correct" | "wrong";
const ACTIONS: { id: Action; label: string }[] = [
  { id: "idle", label: "Idle" },
  { id: "talking", label: "Talk" },
  { id: "listening", label: "Listen" },
  { id: "thinking", label: "Think" },
  { id: "correct", label: "Correct" },
  { id: "wrong", label: "Wrong" },
];
const OUTFIT_NAMES: Record<Outfit, string> = { casual: "Casual", police: "Police", station: "Station", cafe: "Café", shop: "Shop" };

const chip = (on: boolean) =>
  cx("rounded-full px-4 py-2 text-sm font-extrabold ring-1 ring-ink/10 transition active:scale-95", on ? "bg-ink text-white" : "bg-white text-ink");

const NAMES = { yap: "Yap", tomo: "Tomo", otto: "Otto" } as const;
type Character = keyof typeof NAMES;

/** Dev preview for a character's .riv: plays every state the app uses (and Tomo's and Otto's outfits). */
export function CharacterPreview({ character }: { character: Character }) {
  const outfits = character === "otto" ? OTTO_OUTFITS : TOMO_OUTFITS;
  const [mood, setMood] = useState<CharacterMood>("idle");
  const [reaction, setReaction] = useState<CharacterReaction | null>(null);
  const [outfit, setOutfit] = useState<Outfit>("casual");
  const [shirtLabel, setShirtLabel] = useState(outfits.casual.label);
  const talk = useRef<{ cues: MouthCue[]; t0: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const name = NAMES[character];
  const line = `Hi! I'm ${name}. Let's practise some English together.`;

  const mouthSource = useCallback(() => {
    const s = talk.current;
    return s ? mouthAt(s.cues, (performance.now() - s.t0) / 1000) : 0;
  }, []);
  const stopTalking = useCallback(() => {
    clearTimeout(timer.current);
    talk.current = null;
    stopSpeaking();
  }, []);
  useEffect(() => stopTalking, [stopTalking]);

  function run(action: Action) {
    stopTalking();
    if (action === "correct" || action === "wrong") {
      setMood("idle");
      setReaction((r) => ({ kind: action, id: (r?.id ?? 0) + 1 }));
      return;
    }
    setMood(action);
    if (action === "talking") {
      // Browser speech gives no timings, so the mouth follows an estimate from the text.
      const timeline = cuesFromText(line, RATE);
      talk.current = { cues: timeline.cues, t0: performance.now() };
      speak(`${character}-preview`, line, { lang: "en-GB", rate: RATE });
      timer.current = setTimeout(() => {
        talk.current = null;
        setMood("idle");
      }, timeline.duration * 1000 + 200);
    }
  }

  const shared = { mood, mouthSource, reaction, className: "mx-auto w-full max-w-[360px]" };
  return (
    <div className="paper-bg min-h-dvh">
      <main className="mx-auto max-w-md px-5 pb-12 pt-8">
        <p className="flow-eyebrow">Character preview</p>
        <h1 className="mt-1 font-display text-[28px] font-extrabold leading-tight">{name}</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Plays <code>public/rive/{character}.riv</code> with the same values the app sends. Until that file exists you will
          see a still image. Compare each state with the prototype in <code>docs/rive</code>.
        </p>
        <div className="mt-5 rounded-[28px] bg-sakura-soft p-4">
          {character === "yap" && <YapCharacter {...shared} className={cx(shared.className, "aspect-[400/420]")} />}
          {character === "tomo" && (
            <TomoCharacter {...shared} outfit={outfit} shirtLabel={shirtLabel} className={cx(shared.className, "aspect-[400/480]")} />
          )}
          {character === "otto" && (
            <OttoCharacter {...shared} outfit={outfit} shirtLabel={shirtLabel} className={cx(shared.className, "aspect-[400/480]")} />
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Play a state">
          {ACTIONS.map((a) => (
            <button key={a.id} type="button" onClick={() => run(a.id)} aria-pressed={a.id === mood} className={chip(a.id === mood)}>
              {a.label}
            </button>
          ))}
        </div>
        {character !== "yap" && (
          <div className="mt-6 grid gap-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Outfit">
              {(Object.keys(outfits) as Outfit[]).map((o) => (
                <button
                  key={o}
                  type="button"
                  aria-pressed={o === outfit}
                  className={chip(o === outfit)}
                  onClick={() => {
                    setOutfit(o);
                    setShirtLabel(outfits[o].label);
                  }}
                >
                  {OUTFIT_NAMES[o]}
                </button>
              ))}
            </div>
            <label className="grid gap-1 text-sm font-extrabold">
              Shirt says
              <input
                className="flow-input uppercase"
                value={shirtLabel}
                maxLength={SHIRT_LABEL_MAX}
                onChange={(e) => setShirtLabel(cleanShirtLabel(e.target.value))}
              />
            </label>
          </div>
        )}
      </main>
    </div>
  );
}
