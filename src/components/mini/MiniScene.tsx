"use client";

import { useState } from "react";
import type { Character, MiniChoice, MiniStep } from "@/content/schema";
import { NARRATOR } from "@/content/schema";
import type { Aids } from "@/lib/aids";
import { QUALITY_META } from "@/lib/config";
import { ListenButton, SavePhraseButton } from "../audio";
import { Gloss, ReadingText, TranslationText } from "../Gloss";
import { useLang } from "../lang";
import { RichText } from "../RichText";
import { Sprite } from "../Sprite";
import { cx } from "../ui";

/** Compact visual: background banner + character + the line they say. */
export function MiniStage({
  step,
  background,
  characters,
  aids,
  revealTranslation,
  expressionOverride,
}: {
  step: MiniStep;
  background?: string;
  characters: Map<string, Character>;
  aids: Aids;
  revealTranslation?: boolean;
  expressionOverride?: MiniChoice["quality"] | null;
}) {
  const ch = characters.get(step.speaker);
  const { meta } = useLang();
  const [tapReveal, setTapReveal] = useState(false);
  const furigana = (aids.furigana || !!revealTranslation) && meta.hasFurigana;
  const expr = expressionOverride
    ? ({ natural: "happy", understandable: "neutral", awkward: "confused", wrong: "surprised" } as const)[expressionOverride]
    : (step.expression ?? "neutral");
  const showTranslation = revealTranslation || aids.translation === "show" || (aids.translation === "tap" && tapReveal);

  return (
    <div className="overflow-hidden rounded-[28px] bg-ink shadow-lg">
      <div className="relative h-56">
        {background && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={background} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
        {ch && (
          <div className="absolute bottom-0 left-1/2 h-[92%] w-[60%] -translate-x-1/2">
            <Sprite key={expr} character={ch} expression={expr} className="h-full w-full animate-rise drop-shadow-[0_8px_16px_rgba(0,0,0,0.3)]" />
          </div>
        )}
        {step.speaker === NARRATOR && (
          <div className="absolute inset-x-0 bottom-3 text-center text-3xl" aria-hidden>
            📢
          </div>
        )}
      </div>
      <div className="hc-panel relative m-3 mt-0 -translate-y-6 rounded-3xl border-2 border-ink/10 bg-paper p-4 pt-5">
        <div
          className="absolute -top-3.5 left-4 rounded-full px-3 py-0.5 font-display text-sm font-extrabold text-white shadow"
          style={{ background: ch?.color ?? "#2b2340" }}
        >
          {ch ? ch.name : "Announcement"}
          {ch?.nameNative && <span className="ml-1.5 text-xs font-bold opacity-80">{ch.nameNative}</span>}
        </div>
        <div className="absolute -top-4 right-3">
          <ListenButton id={`mini:${step.text}`} text={step.text} size="sm" />
        </div>
        <p className={cx("font-display text-[20px] font-bold", furigana ? "leading-[2.1]" : "leading-relaxed")}>
          <RichText text={step.text} furigana={furigana} />
        </p>
        {(aids.romaji || revealTranslation) && <ReadingText text={step.reading} className="text-[13px]" />}
        {showTranslation && <TranslationText text={step.translation} className="mt-1 text-[14px]" />}
        {aids.translation === "tap" && !showTranslation && (
          <button
            type="button"
            onClick={() => setTapReveal(true)}
            className="mt-1.5 rounded-full bg-ink/5 px-2.5 py-0.5 text-[12px] font-bold text-ink-soft ring-1 ring-ink/10"
          >
            {meta.revealLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export function MiniChoices({
  choices,
  aids: rawAids,
  onPick,
  disabled,
}: {
  choices: MiniChoice[];
  aids: Aids;
  onPick: (c: MiniChoice) => void;
  disabled?: boolean;
}) {
  const { meta } = useLang();
  const aids = { ...rawAids, furigana: rawAids.furigana && meta.hasFurigana };
  return (
    <div className="grid grid-cols-1 gap-2" role="group" aria-label="What do you say?">
      {choices.map((c, i) => (
        <div
          key={c.id}
          className="hc-panel flex animate-rise items-center gap-2 rounded-2xl border-2 border-ink/5 bg-white pr-2 shadow-[0_4px_0_rgba(43,35,64,0.1)]"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPick(c)}
            className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3 text-left active:translate-y-0.5"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sakura-soft font-display text-sm font-extrabold text-sakura">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cx("block font-display text-[16px] font-bold", aids.furigana ? "leading-[2]" : "leading-snug")}>
                <RichText text={c.text} furigana={aids.furigana} />
              </span>
              {aids.romaji && <ReadingText text={c.reading} className="block text-[12px]" as="span" />}
              {aids.translation === "show" && <TranslationText text={c.translation} className="block text-[13px]" as="span" />}
            </span>
          </button>
          <ListenButton id={`minic:${c.id}:${c.text}`} text={c.text} size="sm" />
        </div>
      ))}
    </div>
  );
}

export function MiniFeedback({
  choice,
  better,
  source,
  extra,
  onNext,
  nextLabel,
}: {
  choice: MiniChoice;
  better?: MiniChoice;
  source: string;
  extra?: React.ReactNode;
  onNext: () => void;
  nextLabel: string;
}) {
  const q = QUALITY_META[choice.quality];
  const [whyOpen, setWhyOpen] = useState(false);
  return (
    <div className="animate-pop rounded-3xl border-2 bg-white p-4 shadow-lg" style={{ borderColor: q.color }} role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full px-3 py-1 font-display text-sm font-extrabold" style={{ color: q.color, background: q.bg }}>
          {q.emoji} {q.label}
        </span>
        {extra}
      </div>
      <Row label="You said" c={choice} source={source} green={false} />
      {better && better.id !== choice.id && <Row label="More natural" c={better} source={source} green />}
      <p className="mt-3 text-[15px] leading-relaxed">💡 {choice.feedback}</p>
      {choice.why && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setWhyOpen((o) => !o)}
            aria-expanded={whyOpen}
            className="rounded-full bg-plum/10 px-3 py-1 font-display text-[13px] font-extrabold text-plum"
          >
            {whyOpen ? "▾ Why?" : "▸ Why?"}
          </button>
          {whyOpen && <p className="mt-2 rounded-2xl bg-plum/5 p-3 text-[14px] leading-relaxed">{choice.why}</p>}
        </div>
      )}
      <button
        type="button"
        onClick={onNext}
        className="mt-4 w-full rounded-2xl bg-sakura px-4 py-3 font-display font-extrabold text-white shadow-[0_4px_0_#154940] active:translate-y-0.5"
      >
        {nextLabel}
      </button>
    </div>
  );
}

function Row({ label, c, source, green }: { label: string; c: MiniChoice; source: string; green: boolean }) {
  const { meta } = useLang();
  return (
    <div className={cx("mt-3 flex items-start gap-2 rounded-2xl px-3 py-2", green ? "bg-[#e3f7eb]" : "bg-paper")}>
      <div className="min-w-0 flex-1">
        <div className={cx("text-[11px] font-bold uppercase tracking-wider", green ? "text-q-natural" : "text-ink-soft")}>{label}</div>
        <div className={cx("font-display text-[17px] font-bold", meta.hasFurigana ? "leading-[2]" : "leading-snug")}>
          <RichText text={c.text} furigana={meta.hasFurigana} />
        </div>
        <Gloss reading={c.reading} translation={c.translation} />
      </div>
      <div className="flex shrink-0 flex-col gap-1.5 pt-1">
        <ListenButton id={`minifb:${label}:${c.text}`} text={c.text} size="sm" />
        <SavePhraseButton size="sm" phrase={{ text: c.text, reading: c.reading, translation: c.translation, source, context: label }} />
      </div>
    </div>
  );
}

export function bestChoice(choices: MiniChoice[]): MiniChoice | undefined {
  return choices.find((c) => c.quality === "natural");
}
