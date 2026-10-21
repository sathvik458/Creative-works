"use client";
import { useEffect, useState } from "react";
import type { Story, MiniScenario, MiniChoice } from "@/content/schema";
import { plainText } from "@/lib/markup";
import { QUALITY_META } from "@/lib/config";
import { stopSpeaking, useSpeechState } from "@/lib/audio";
import { useGame } from "@/store/game";
import { Sprite } from "../Sprite";
import { RichText } from "../RichText";
import { LangProvider } from "../lang";
import { ListenButton, SavePhraseButton } from "../audio";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { PageShell, Button } from "../ui";
import { FlowHeader } from "./shared";
export function Speak({ stories }: { stories: Story[] }) {
  const lang = useGame((s) => s.profile.targetLanguage);
  const story = stories.find((s) => s.targetLanguage === lang) ?? stories[0];
  return (
    <LangProvider lang={story.targetLanguage} speech={story.speechLang}>
      <SpeakInner
        story={story}
        languages={stories.map((s) => s.targetLanguage)}
      />
    </LangProvider>
  );
}
function SpeakInner({
  story,
  languages,
}: {
  story: Story;
  languages: string[];
}) {
  const [scenario, setScenario] = useState<MiniScenario | null>(null),
    [phase, setPhase] = useState<"context" | "talk" | "feedback" | "done">(
      "context",
    ),
    [step, setStep] = useState(0),
    [text, setText] = useState(""),
    [result, setResult] = useState<MiniChoice | null>(null),
    [message, setMessage] = useState(""),
    [listening, setListening] = useState(false),
    [aids, setAids] = useState(true);
  const speakingKey = useSpeechState((s) => s.speakingKey);
  useEffect(() => () => stopSpeaking(), []);
  useEffect(() => {
    setScenario(null);
    setStep(0);
    setText("");
    setPhase("context");
    stopSpeaking();
  }, [story.id]);
  const scenarios = story.episodes.flatMap((e) =>
    (e.survival ?? [])
      .filter(
        (_, i, all) =>
          i === 0 || i === Math.floor(all.length / 2) || i === all.length - 1,
      )
      .map((sc) => ({ ...sc, episode: e.title })),
  );
  const line = scenario?.steps[step];
  const character = story.characters.find((c) => c.id === line?.speaker);
  const natural =
    line?.choices.find((c) => c.quality === "natural") ?? line?.choices[0];
  function pick(choice: MiniChoice) {
    stopSpeaking();
    setListening(false);
    setText(plainText(choice.text));
    setResult(choice);
    setMessage("");
    setPhase("feedback");
  }
  function check() {
    const norm = (s: string) =>
      plainText(s)
        .normalize("NFKC")
        .toLowerCase()
        .replace(/[\p{P}\p{S}\s]/gu, "");
    const match = line?.choices.find((c) => norm(c.text) === norm(text));
    if (match) pick(match);
    else
      setMessage(
        "This UI preview only has authored feedback for the example replies. Your answer hasn’t been marked wrong. Choose an example below to explore the feedback screen.",
      );
  }
  function retry() {
    stopSpeaking();
    setText("");
    setResult(null);
    setMessage("");
    setPhase("talk");
  }
  function chooseScenario(sc: MiniScenario) {
    stopSpeaking();
    setScenario(sc);
    setPhase("context");
    setStep(0);
    setText("");
    setResult(null);
    setMessage("");
    setListening(false);
  }
  return (
    <PageShell>
      {!scenario ? (
        <>
          <FlowHeader
            eyebrow="A LITTLE PRACTICE GOES A LONG WAY"
            title="Speak a little"
            description="Same familiar faces. A new chance to find your words."
          />
          <LanguageSwitcher languages={languages} />
          <div className="mb-4 mt-5 flex items-center justify-between">
            <h2 className="flow-section-title !mb-0">Pick a moment</h2>
            <span className="text-xs text-ink-soft">1–2 minute practices</span>
          </div>
          <div className="grid gap-3">
            {scenarios.map((sc) => {
              const c = story.characters.find(
                (c) => c.id === sc.steps[0].speaker,
              );
              return (
                <button
                  type="button"
                  key={sc.id}
                  onClick={() => chooseScenario(sc)}
                  className="flow-card flex gap-3 !p-3 text-left active:scale-[.99]"
                >
                  <span className="relative h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-paper-2">
                    {c && (
                      <Sprite
                        character={c}
                        expression="smile"
                        className="absolute -bottom-2 h-28 w-full"
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 self-center">
                    <span className="flow-eyebrow">
                      {c?.name} ·{" "}
                      {story.targetLanguage === "ja" ? "JAPANESE" : "ENGLISH"}
                    </span>
                    <span className="mt-1 block font-display text-lg font-extrabold">
                      {sc.title}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-ink-soft">
                      {sc.context}
                    </span>
                  </span>
                  <span className="self-center font-bold text-sakura">→</span>
                </button>
              );
            })}
          </div>
          <p className="mt-5 text-xs leading-relaxed text-ink-soft">
            Conversation UI preview: authored examples show feedback. The
            listening layout does not access your microphone or assess speech.
          </p>
        </>
      ) : (
        <>
          <button
            className="mb-4 min-h-11 text-sm font-bold text-ink-soft"
            onClick={() => {
              stopSpeaking();
              setScenario(null);
            }}
          >
            ← All scenarios
          </button>
          <div className="mb-3 flex items-center justify-between">
            <h1 className="font-display text-xl font-extrabold">
              {scenario.title}
            </h1>
            <span className="rounded-full bg-paper-2 px-3 py-1 text-xs font-bold">
              {phase === "done"
                ? "Practice complete"
                : `${step + 1} / ${scenario.steps.length}`}
            </span>
          </div>
          <div className="relative h-64 overflow-hidden rounded-[28px] bg-paper-2 shadow-[0_5px_0_rgba(43,35,64,.08)]">
            {scenario.background && (
              <img
                src={scenario.background}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            {character && (
              <Sprite
                character={character}
                expression={
                  phase === "feedback"
                    ? result?.quality === "natural"
                      ? "happy"
                      : "confused"
                    : phase === "done"
                      ? "happy"
                      : (line?.expression ?? "neutral")
                }
                speaking={speakingKey === `speak:${scenario.id}:${step}`}
                className="absolute -bottom-5 left-1/2 h-72 w-48 -translate-x-1/2"
              />
            )}
            <span className="absolute left-3 top-3 rounded-full bg-paper/95 px-3 py-1.5 text-xs font-bold">
              {character?.name} · {character?.role}
            </span>
          </div>
          {phase === "context" && (
            <div className="flow-card mt-4">
              <p className="flow-eyebrow">THE MOMENT</p>
              <p className="mt-2 text-sm leading-relaxed">{scenario.context}</p>
              <div className="my-4 border-t border-ink/10" />
              <p className="flow-eyebrow">YOUR GOAL</p>
              <p className="mt-2 text-sm text-ink-soft">
                Listen to {character?.name}, then give a{" "}
                {scenario.skill === "politeness"
                  ? "friendly, natural"
                  : "clear"}{" "}
                reply that fits the situation.
              </p>
              <Button className="mt-5 w-full" onClick={() => setPhase("talk")}>
                Start conversation →
              </Button>
            </div>
          )}
          {phase === "talk" && line && (
            <>
              <div className="flow-card mt-4">
                <div className="mb-3 flex items-center justify-between">
                  <p
                    className="font-display text-sm font-extrabold"
                    style={{ color: character?.color }}
                  >
                    {character?.name}
                  </p>
                  <ListenButton
                    id={`speak:${scenario.id}:${step}`}
                    text={line.text}
                  />
                </div>
                <p className="font-display text-xl font-bold leading-relaxed">
                  <RichText
                    text={line.text}
                    furigana={story.targetLanguage === "ja" && aids}
                  />
                </p>
                {aids && (
                  <>
                    <p className="mt-2 text-xs text-ink-soft">{line.reading}</p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {line.translation}
                    </p>
                  </>
                )}
                <button
                  className="mt-3 min-h-9 text-xs font-bold text-sakura"
                  onClick={() => setAids(!aids)}
                >
                  {aids ? "Hide reading help" : "Show reading help"}
                </button>
              </div>
              <h2 className="mb-3 mt-5 font-display text-base font-extrabold">
                Your turn
              </h2>
              <div className="flow-card">
                <label htmlFor="conversation-reply" className="sr-only">
                  Your conversation reply
                </label>
                <textarea
                  id="conversation-reply"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  className="flow-input resize-none"
                  placeholder={
                    story.targetLanguage === "ja"
                      ? "返事を書いてみよう…"
                      : "What would you say?"
                  }
                />
                {listening ? (
                  <div className="mt-3 rounded-2xl bg-sakura-soft p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🎙</span>
                      <span className="font-display text-sm font-extrabold">
                        Listening layout preview
                      </span>
                      <span
                        className="ml-auto flex h-6 items-center gap-1"
                        aria-hidden
                      >
                        {[8, 18, 12, 24, 14, 19].map((h, i) => (
                          <i
                            key={i}
                            className="w-1 rounded-full bg-sakura"
                            style={{ height: h }}
                          />
                        ))}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-ink-soft">
                      Microphone off. Type a reply to explore this screen.
                    </p>
                    <button
                      className="flow-secondary mt-3 w-full"
                      onClick={() => setListening(false)}
                    >
                      Finish preview
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <Button
                      className="flex-1"
                      disabled={!text.trim()}
                      onClick={check}
                    >
                      Check reply
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        stopSpeaking();
                        setListening(true);
                      }}
                    >
                      🎙 Voice preview
                    </Button>
                  </div>
                )}
                {message && (
                  <p
                    role="status"
                    className="mt-3 text-sm leading-relaxed text-ink-soft"
                  >
                    {message}
                  </p>
                )}
              </div>
              <p className="flow-eyebrow mb-3 mt-5">OR TRY AN EXAMPLE</p>
              <div className="grid gap-2">
                {line.choices.map((c, i) => (
                  <button
                    type="button"
                    className="flow-choice"
                    key={c.id}
                    onClick={() => pick(c)}
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-paper-2 text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="font-display text-[15px] font-bold">
                      <RichText
                        text={c.text}
                        furigana={story.targetLanguage === "ja" && aids}
                      />
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
          {phase === "feedback" && result && (
            <div className="flow-card mt-4">
              <span
                className="rounded-full px-3 py-1 text-xs font-bold"
                style={{
                  background: QUALITY_META[result.quality].bg,
                  color: QUALITY_META[result.quality].color,
                }}
              >
                {QUALITY_META[result.quality].emoji}{" "}
                {QUALITY_META[result.quality].label}
              </span>
              <p className="flow-eyebrow mt-5">YOUR RESPONSE</p>
              <p className="mt-2 font-display text-lg font-bold">{text}</p>
              <h2 className="mt-5 font-display text-base font-extrabold">
                A little thing to remember
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {result.feedback}
              </p>
              {result.why && (
                <details className="mt-3 text-sm text-ink-soft">
                  <summary className="min-h-9 cursor-pointer font-bold text-sakura">
                    Why does this work?
                  </summary>
                  <p className="leading-relaxed">{result.why}</p>
                </details>
              )}
              <div className="mt-4 rounded-2xl bg-sakura-soft p-4">
                <p className="flow-eyebrow">A NATURAL WAY TO SAY IT</p>
                <p className="mt-2 font-display text-lg font-bold">
                  <RichText
                    text={natural?.text ?? ""}
                    furigana={story.targetLanguage === "ja"}
                  />
                </p>
                <div className="mt-3 flex gap-2">
                  <ListenButton
                    id={`practice:${natural?.id}`}
                    text={natural?.text ?? ""}
                  />
                  <SavePhraseButton
                    phrase={{
                      text: natural?.text ?? "",
                      reading: natural?.reading ?? "",
                      translation: natural?.translation ?? "",
                      source: `Speak · ${scenario.title}`,
                      storyId: story.id,
                      lang: story.targetLanguage,
                    }}
                  />
                </div>
              </div>
              <p className="mt-3 text-[11px] text-ink-soft">
                Authored example feedback · pronunciation is not assessed.
              </p>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" onClick={retry}>
                  Try again
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    if (step + 1 < scenario.steps.length) {
                      setStep(step + 1);
                      retry();
                    } else {
                      stopSpeaking();
                      setPhase("done");
                    }
                  }}
                >
                  Continue →
                </Button>
              </div>
            </div>
          )}
          {phase === "done" && (
            <div className="flow-card mt-4 text-center">
              <span className="text-3xl">✿</span>
              <h2 className="mt-2 font-display text-2xl font-extrabold">
                A little practice. A step forward.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Keep a phrase in your notebook, try again, or meet someone in
                another situation.
              </p>
              <div className="mt-4 grid gap-2">
                <Button
                  onClick={() => {
                    setStep(0);
                    retry();
                  }}
                >
                  Try this conversation again
                </Button>
                <Button variant="secondary" onClick={() => setScenario(null)}>
                  Choose another moment
                </Button>
                <Button variant="secondary" href="/notebook?tab=phrases">
                  Open your notebook
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
