"use client";

import { create } from "zustand";
import { langMeta } from "./lang";
import { kanaText, plainText } from "./markup";

/**
 * Text-to-speech via the browser's Web Speech API (no audio files, no server).
 * Japanese is spoken from the kana readings so kanji are pronounced correctly;
 * English uses a British voice when one is installed.
 */

type SpeechState = { speakingKey: string | null };
export const useSpeechState = create<SpeechState>(() => ({ speakingKey: null }));

const voiceCache = new Map<string, SpeechSynthesisVoice | null>();
let speechRequest = 0;
let pendingSpeech: ReturnType<typeof setTimeout> | undefined;
// Retain the utterance while native speech events are pending.
let activeUtterance: SpeechSynthesisUtterance | null = null;

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  if (voiceCache.has(lang)) return voiceCache.get(lang)!;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null; // voices not loaded yet; try again next time
  const norm = (v: SpeechSynthesisVoice) => v.lang.replace("_", "-").toLowerCase();
  const exact = voices.filter((v) => norm(v) === lang.toLowerCase());
  const family = voices.filter((v) => norm(v).startsWith(lang.slice(0, 2).toLowerCase()));
  const preferred = langMeta(lang.slice(0, 2)).voices;
  const byName = (list: SpeechSynthesisVoice[]) => preferred.map((n) => list.find((v) => v.name.includes(n))).find(Boolean);
  const voice = byName(exact) ?? exact[0] ?? byName(family) ?? family[0] ?? null;
  voiceCache.set(lang, voice);
  return voice;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.addEventListener?.("voiceschanged", () => voiceCache.clear());
}

/** Text to feed the synthesizer: furigana readings, minus stage directions like （会釈する） or (nod). */
export function speechText(markup: string): string {
  return kanaText(markup)
    .replace(/（[^）]*）/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[「」『』]/g, "")
    .replace(/〜/g, "")
    .trim();
}

/** True if a line contains something worth speaking in that language (not just a gesture). */
export function isSpeakable(markup: string, lang = "ja"): boolean {
  const text = speechText(markup);
  if (!plainText(markup).length) return false;
  if (lang.startsWith("ja")) return /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(text);
  return /\p{L}/u.test(text);
}

export function speak(key: string, markup: string, opts: { rate?: number; lang?: string } = {}) {
  if (!speechSupported()) return;
  const synth = window.speechSynthesis;
  stopSpeaking();
  const request = speechRequest;
  const text = speechText(markup);
  if (!text) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = opts.lang ?? "ja-JP";
  u.rate = opts.rate ?? 1;
  const voice = pickVoice(u.lang);
  if (voice) u.voice = voice;
  u.onstart = () => {
    if (request === speechRequest) useSpeechState.setState({ speakingKey: key });
  };
  u.onend = u.onerror = () => {
    if (request !== speechRequest) return;
    activeUtterance = null;
    useSpeechState.setState({ speakingKey: null });
  };
  activeUtterance = u;
  // Safari sometimes needs a tick after cancel() before speak().
  pendingSpeech = setTimeout(() => {
    pendingSpeech = undefined;
    if (request !== speechRequest || activeUtterance !== u) return;
    try {
      synth.speak(u);
    } catch {
      activeUtterance = null;
      useSpeechState.setState({ speakingKey: null });
    }
  }, 30);
}

export function stopSpeaking() {
  speechRequest += 1;
  if (pendingSpeech !== undefined) clearTimeout(pendingSpeech);
  pendingSpeech = undefined;
  activeUtterance = null;
  useSpeechState.setState({ speakingKey: null });
  if (speechSupported()) window.speechSynthesis.cancel();
}
