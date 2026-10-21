"use client";

import { Fragment, useMemo } from "react";
import type { Vocab } from "@/content/schema";
import { buildPieces } from "@/lib/markup";

/**
 * Renders target-language text with optional furigana and tappable vocab.
 * `visibleChars` drives the typewriter effect; hidden characters are still laid
 * out (transparent) so the dialogue box never jumps around.
 */
export function RichText({
  text,
  vocab = [],
  furigana,
  visibleChars = Number.POSITIVE_INFINITY,
  onVocab,
}: {
  text: string;
  vocab?: Vocab[];
  furigana: boolean;
  visibleChars?: number;
  onVocab?: (vocabId: string) => void;
}) {
  const pieces = useMemo(() => buildPieces(text, vocab), [text, vocab]);

  return (
    <>
      {pieces.map((p, i) => {
        const shown = Math.max(0, Math.min(p.base.length, visibleChars - p.start));
        let content: React.ReactNode;
        if (p.ruby) {
          const visible = shown > 0;
          content = furigana ? (
            <ruby style={visible ? undefined : { opacity: 0 }}>
              {p.base}
              <rt>{p.ruby}</rt>
            </ruby>
          ) : (
            <span style={visible ? undefined : { opacity: 0 }}>{p.base}</span>
          );
        } else if (shown >= p.base.length) {
          content = p.base;
        } else {
          content = (
            <>
              {p.base.slice(0, shown)}
              <span style={{ opacity: 0 }}>{p.base.slice(shown)}</span>
            </>
          );
        }

        if (p.vocabId && onVocab) {
          const id = p.vocabId;
          return (
            <span
              key={i}
              role="button"
              tabIndex={0}
              className="vocab-word"
              onClick={(e) => {
                e.stopPropagation();
                onVocab(id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onVocab(id);
                }
              }}
            >
              {content}
            </span>
          );
        }
        return <Fragment key={i}>{content}</Fragment>;
      })}
    </>
  );
}
