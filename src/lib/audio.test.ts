import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { speak, stopSpeaking, useSpeechState } from "./audio";

describe("speech playback lifecycle", () => {
  let spoken: SpeechSynthesisUtterance[];
  beforeEach(() => {
    vi.useFakeTimers();
    spoken = [];
    class FakeUtterance { constructor(public text: string) {} }
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
    vi.stubGlobal("window", {
      SpeechSynthesisUtterance: FakeUtterance,
      speechSynthesis: { cancel: vi.fn(), getVoices: () => [], speak: (u: SpeechSynthesisUtterance) => spoken.push(u) },
    });
    stopSpeaking();
  });
  afterEach(() => {
    stopSpeaking();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it("animates only after playback actually starts and resets on completion", () => {
    speak("line:hello", "Hello", { lang: "en-GB" });
    expect(useSpeechState.getState().speakingKey).toBeNull();
    vi.advanceTimersByTime(30);
    expect(useSpeechState.getState().speakingKey).toBeNull();
    spoken[0].onstart?.({} as SpeechSynthesisEvent);
    expect(useSpeechState.getState().speakingKey).toBe("line:hello");
    spoken[0].onend?.({} as SpeechSynthesisEvent);
    expect(useSpeechState.getState().speakingKey).toBeNull();
  });
  it("does not start queued speech after a learner cancels or leaves", () => {
    speak("line:hello", "Hello");
    stopSpeaking();
    vi.advanceTimersByTime(100);
    expect(spoken).toHaveLength(0);
    expect(useSpeechState.getState().speakingKey).toBeNull();
  });
  it("ignores stale events when replaying the same line", () => {
    speak("line:hello", "Hello"); vi.advanceTimersByTime(30);
    const old = spoken[0];
    speak("line:hello", "Hello"); vi.advanceTimersByTime(30);
    spoken[1].onstart?.({} as SpeechSynthesisEvent);
    old.onend?.({} as SpeechSynthesisEvent);
    expect(useSpeechState.getState().speakingKey).toBe("line:hello");
    stopSpeaking();
    old.onstart?.({} as SpeechSynthesisEvent);
    expect(useSpeechState.getState().speakingKey).toBeNull();
  });
  it("resets speaking state on a playback error", () => {
    speak("line:hello", "Hello"); vi.advanceTimersByTime(30);
    spoken[0].onstart?.({} as SpeechSynthesisEvent);
    spoken[0].onerror?.({} as SpeechSynthesisErrorEvent);
    expect(useSpeechState.getState().speakingKey).toBeNull();
  });
});
