"use client";

import { useEffect, useRef, useState } from "react";
import {
  RuntimeLoader,
  useRive,
  useViewModel,
  useViewModelInstance,
  useViewModelInstanceBoolean,
  useViewModelInstanceColor,
  useViewModelInstanceNumber,
  useViewModelInstanceString,
  useViewModelInstanceTrigger,
} from "@rive-app/react-canvas";
import { hexToRgb, type Appearance, type CharacterFile } from "@/lib/characters";
import { cx } from "./ui";

// Serve the Rive runtime ourselves (copied to public/ by scripts/copy-rive-wasm.mjs on install)
// rather than from a public CDN on every app start. Rive's CDN stays as the fallback.
RuntimeLoader.setWasmUrl("/rive/rive.wasm");

/** What the character is doing right now. Only one at a time. */
export type CharacterMood = "idle" | "talking" | "listening" | "thinking";

/** A one-shot reaction. Give each new reaction a new `id` so the same kind can play twice in a row. */
export type CharacterReaction = { kind: "correct" | "wrong"; id: number };

export type CharacterProps = {
  mood?: CharacterMood;
  /** Mouth shape 0-8 while talking. For per-frame lip sync, pass `mouthSource` instead. */
  mouth?: number;
  /** Called every animation frame while talking; return the current mouth shape (see lib/lipsync). */
  mouthSource?: () => number;
  reaction?: CharacterReaction | null;
  /** -1 to 1. Optional: only used if the Rive file binds eye direction. */
  lookX?: number;
  lookY?: number;
  /** Outfit, shirt label and colours, for characters whose Rive file has them (Tomo). */
  appearance?: Appearance;
  className?: string;
  label?: string;
};

const clampMouth = (m: number) => Math.max(0, Math.min(8, Math.round(m)));

// Checked once per file and page load, so a missing .riv shows the still image without console errors.
const fileChecks = new Map<string, Promise<boolean>>();
function riveFileExists(src: string): Promise<boolean> {
  let check = fileChecks.get(src);
  if (!check) {
    check = fetch(src, { method: "HEAD" })
      .then((r) => r.ok)
      .catch(() => false);
    fileChecks.set(src, check);
  }
  return check;
}

function Still({ file, className, label }: { file: CharacterFile; className?: string; label: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={file.still} alt={label} className={cx("object-contain", className)} draggable={false} />;
}

/**
 * Plays a character's Rive file through data binding. The view model properties are the contract in
 * docs/rive: mouth, talking, listening, thinking, correct, wrong (all characters), plus outfit,
 * shirtLabel, shirtColor, skinTone, hairColor, glasses (Tomo). Until the .riv exists, a still image is shown.
 */
export function RiveCharacter({ file, ...props }: CharacterProps & { file: CharacterFile }) {
  const [hasRive, setHasRive] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    riveFileExists(file.src).then((ok) => live && setHasRive(ok));
    return () => {
      live = false;
    };
  }, [file.src]);
  if (!hasRive) return <Still file={file} className={props.className} label={props.label ?? file.label} />;
  return <RivePlayer key={file.src} file={file} {...props} />;
}

function RivePlayer({
  file,
  mood = "idle",
  mouth = 0,
  mouthSource,
  reaction = null,
  lookX = 0,
  lookY = 0,
  appearance,
  className,
  label,
}: CharacterProps & { file: CharacterFile }) {
  const [failed, setFailed] = useState(false);
  const { rive, RiveComponent } = useRive({
    src: file.src,
    artboard: file.artboard,
    stateMachine: "Main",
    autoplay: true,
    autoBind: false,
    onLoadError: () => setFailed(true),
  });
  const viewModel = useViewModel(rive, { name: file.viewModel });
  const vm = useViewModelInstance(viewModel, { rive });

  const { setValue: setMouth } = useViewModelInstanceNumber("mouth", vm);
  const { setValue: setTalking } = useViewModelInstanceBoolean("talking", vm);
  const { setValue: setListening } = useViewModelInstanceBoolean("listening", vm);
  const { setValue: setThinking } = useViewModelInstanceBoolean("thinking", vm);
  const { setValue: setLookX } = useViewModelInstanceNumber("lookX", vm);
  const { setValue: setLookY } = useViewModelInstanceNumber("lookY", vm);
  const { trigger: fireCorrect } = useViewModelInstanceTrigger("correct", vm);
  const { trigger: fireWrong } = useViewModelInstanceTrigger("wrong", vm);
  // Look properties: setters do nothing when a file doesn't have the property.
  const { setValue: setOutfit } = useViewModelInstanceNumber("outfit", vm);
  const { setValue: setShirtLabel } = useViewModelInstanceString("shirtLabel", vm);
  const { setRgb: setShirtColor } = useViewModelInstanceColor("shirtColor", vm);
  const { setRgb: setSkinTone } = useViewModelInstanceColor("skinTone", vm);
  const { setRgb: setHairColor } = useViewModelInstanceColor("hairColor", vm);
  const { setValue: setGlasses } = useViewModelInstanceBoolean("glasses", vm);

  useEffect(() => {
    if (!vm) return;
    setTalking(mood === "talking");
    setListening(mood === "listening");
    setThinking(mood === "thinking");
  }, [vm, mood, setTalking, setListening, setThinking]);

  useEffect(() => {
    if (!vm) return;
    setLookX(lookX);
    setLookY(lookY);
  }, [vm, lookX, lookY, setLookX, setLookY]);

  const { outfit, shirtLabel, shirtColor, skinTone, hairColor, glasses } = appearance ?? {};
  useEffect(() => {
    if (!vm) return;
    if (outfit !== undefined) setOutfit(outfit);
    if (shirtLabel !== undefined) setShirtLabel(shirtLabel);
    if (glasses !== undefined) setGlasses(glasses);
    const colours: [string | undefined, (r: number, g: number, b: number) => void][] = [
      [shirtColor, setShirtColor],
      [skinTone, setSkinTone],
      [hairColor, setHairColor],
    ];
    for (const [hex, set] of colours) {
      const rgb = hexToRgb(hex);
      if (rgb) set(...rgb);
    }
  }, [vm, outfit, shirtLabel, shirtColor, skinTone, hairColor, glasses, setOutfit, setShirtLabel, setGlasses, setShirtColor, setSkinTone, setHairColor]);

  // Lip sync: a fixed `mouth` prop, or poll `mouthSource` each frame and only write changes.
  useEffect(() => {
    if (!vm) return;
    if (mood !== "talking") {
      setMouth(0);
      return;
    }
    if (!mouthSource) {
      setMouth(clampMouth(mouth));
      return;
    }
    let last = -1;
    let frame = requestAnimationFrame(function tick() {
      const next = clampMouth(mouthSource());
      if (next !== last) {
        setMouth(next);
        last = next;
      }
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [vm, mood, mouth, mouthSource, setMouth]);

  const played = useRef<number | null>(null);
  useEffect(() => {
    if (!vm || !reaction || played.current === reaction.id) return;
    played.current = reaction.id;
    if (reaction.kind === "correct") fireCorrect();
    else fireWrong();
  }, [vm, reaction, fireCorrect, fireWrong]);

  if (failed) return <Still file={file} className={className} label={label ?? file.label} />;
  return (
    <div role="img" aria-label={label ?? file.label} className={className}>
      <RiveComponent />
    </div>
  );
}
