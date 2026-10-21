"use client";

/**
 * Tiny synthesized sound effects (Web Audio API) — no audio files to ship.
 * Kept short and quiet so they support the story instead of interrupting it.
 */

export type Sfx = "tap" | "select" | "natural" | "okay" | "oops" | "ending" | "xp" | "unlock" | "flip";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(ac: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.08, slideTo?: number) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + start + dur);
  g.gain.setValueAtTime(0.0001, ac.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, ac.currentTime + start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur + 0.05);
}

export function playSfx(name: Sfx) {
  const ac = audio();
  if (!ac) return;
  try {
    switch (name) {
      case "tap":
        tone(ac, 660, 0, 0.05, "triangle", 0.03);
        break;
      case "select":
        tone(ac, 520, 0, 0.08, "triangle", 0.06, 780);
        break;
      case "flip":
        tone(ac, 400, 0, 0.07, "triangle", 0.04, 600);
        break;
      case "natural": // bright two-note chime
        tone(ac, 784, 0, 0.18, "sine", 0.08);
        tone(ac, 1175, 0.1, 0.3, "sine", 0.07);
        break;
      case "okay":
        tone(ac, 660, 0, 0.22, "sine", 0.07);
        break;
      case "oops": // gentle "boing" — playful, not punishing
        tone(ac, 420, 0, 0.28, "triangle", 0.07, 260);
        break;
      case "xp":
        tone(ac, 1318, 0, 0.08, "sine", 0.04);
        tone(ac, 1760, 0.06, 0.12, "sine", 0.035);
        break;
      case "unlock":
        [523, 659, 784].forEach((f, i) => tone(ac, f, i * 0.08, 0.2, "triangle", 0.06));
        break;
      case "ending":
        [523, 659, 784, 1047].forEach((f, i) => tone(ac, f, i * 0.11, 0.35, "sine", 0.07));
        tone(ac, 1568, 0.48, 0.5, "sine", 0.04);
        break;
    }
  } catch {
    /* audio is optional */
  }
}
