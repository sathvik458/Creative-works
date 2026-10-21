"use client";

import { useLang } from "./lang";
import { cx } from "./ui";

/** Line-level reading aid: romaji for Japanese, a stress guide for English. */
export function ReadingText({ text, className, as = "p" }: { text: string; className?: string; as?: "p" | "span" }) {
  const { meta } = useLang();
  const Tag = as;
  return (
    <Tag className={cx("font-medium text-ink-soft", meta.hasFurigana ? "italic" : "tracking-wide", className)}>
      {!meta.hasFurigana && <span aria-hidden className="mr-1 not-italic">🗣</span>}
      {text}
    </Tag>
  );
}

/** Translation (Japanese course) or simple-English paraphrase (English course). */
export function TranslationText({ text, className, as = "p" }: { text: string; className?: string; as?: "p" | "span" }) {
  const { meta } = useLang();
  const Tag = as;
  return <Tag className={cx("text-ink/75", className)}>{meta.hasFurigana ? `“${text}”` : `💬 ${text}`}</Tag>;
}

/** Compact reading + translation line used in feedback rows. */
export function Gloss({ reading, translation }: { reading: string; translation: string }) {
  const { meta } = useLang();
  if (meta.hasFurigana) {
    return (
      <div className="text-[13px] italic text-ink-soft">
        {reading} — “{translation}”
      </div>
    );
  }
  return (
    <div className="text-[13px] text-ink-soft">
      <div className="tracking-wide">🗣 {reading}</div>
      <div>💬 {translation}</div>
    </div>
  );
}
