"use client";

import type { Vocab } from "@/content/schema";
import { useGame, vocabKey } from "@/store/game";
import { ListenButton, SpeedToggle } from "./audio";
import { useLang } from "./lang";
import { Sheet, cx } from "./ui";

export function VocabCard({ storyId, vocab, compact }: { storyId: string; vocab: Vocab; compact?: boolean }) {
  const rec = useGame((s) => s.vocab[vocabKey(storyId, vocab.id)]);
  const setKnown = useGame((s) => s.setKnown);
  const known = rec?.known ?? false;
  const { meta } = useLang();
  // Japanese is spoken from the kana reading; other languages from the word itself.
  const spoken = meta.hasFurigana ? vocab.reading : vocab.term;

  return (
    <div className={cx(!compact && "space-y-4")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-4xl font-extrabold leading-tight text-ink">{vocab.term}</div>
          <div className={cx("mt-1 text-sm text-ink-soft", !meta.hasFurigana && "tracking-wide")}>
            {meta.hasFurigana ? vocab.reading : `🗣 ${vocab.reading}`}
            {vocab.romaji && <span className="ml-2 italic opacity-80">{vocab.romaji}</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <SpeedToggle />
          <ListenButton id={`vocab:${vocab.id}`} text={spoken} label={`Hear ${vocab.term}`} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-plum/10 px-2.5 py-0.5 text-xs font-bold text-plum">{vocab.pos}</span>
        <span className="text-[17px] font-bold text-ink">{vocab.meaning}</span>
      </div>
      <div className="rounded-2xl bg-white p-3.5 ring-1 ring-ink/5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Example</div>
        <div className="mt-1 flex items-start gap-2">
          <span className="min-w-0 flex-1 text-[17px] text-ink">{vocab.example}</span>
          <ListenButton id={`vocabex:${vocab.id}`} text={vocab.example} size="sm" label="Hear the example" />
        </div>
        {vocab.exampleTranslation && <div className="mt-0.5 text-sm italic text-ink-soft">{vocab.exampleTranslation}</div>}
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-matcha">✓ Saved to your notebook</span>
        <button
          type="button"
          onClick={() => setKnown(storyId, vocab.id, !known)}
          className={cx(
            "rounded-full px-3.5 py-1.5 font-display text-sm font-extrabold transition active:scale-95",
            known ? "bg-matcha text-white" : "bg-white text-ink ring-2 ring-ink/10",
          )}
        >
          {known ? "★ Known" : "☆ Mark as known"}
        </button>
      </div>
    </div>
  );
}

export function VocabSheet({
  storyId,
  vocab,
  onClose,
}: {
  storyId: string;
  vocab: Vocab | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!vocab} onClose={onClose}>
      {vocab && <VocabCard storyId={storyId} vocab={vocab} />}
    </Sheet>
  );
}
