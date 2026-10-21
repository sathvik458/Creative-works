"use client";
import { useState } from "react";
import type { Story } from "@/content/schema";
import { useGame, vocabKey } from "@/store/game";
import { Button, Sheet } from "../ui";
export function AddWord({ stories }: { stories: Story[] }) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState("");
  const vocab = useGame((s) => s.vocab),
    see = useGame((s) => s.seeVocab);
  const words = stories
    .flatMap((s) => s.vocab.map((v) => ({ story: s, word: v })))
    .filter(({ word: v }) =>
      `${v.term} ${v.meaning} ${v.reading}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
  return (
    <>
      <Button
        variant="secondary"
        className="!px-3 !py-2 !text-xs"
        onClick={() => setOpen(true)}
      >
        ＋ Add word
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="A word to keep">
        <h2 className="font-display text-xl font-extrabold">
          Add to your notebook
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          Pick a word from the stories. Its reading and meaning come with it.
        </p>
        <input
          autoFocus
          type="search"
          aria-label="Find a word to save"
          placeholder="Search words or meanings…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flow-input my-4"
        />
        <div className="grid max-h-80 gap-2 overflow-y-auto">
          {words.map(({ story, word }) => (
            <button
              type="button"
              key={story.id + word.id}
              disabled={!!vocab[vocabKey(story.id, word.id)]}
              onClick={() => {
                see(story.id, [word.id]);
                setOpen(false);
              }}
              className="flex items-center gap-2 rounded-2xl bg-white p-3 text-left ring-1 ring-ink/10 disabled:opacity-50"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-display font-extrabold">
                  {word.term}
                </span>
                <span className="mt-1 block text-xs text-ink-soft">
                  {word.meaning}
                </span>
              </span>
              <span className="text-xs font-bold text-sakura">
                {vocab[vocabKey(story.id, word.id)] ? "Saved ✓" : "Save ＋"}
              </span>
            </button>
          ))}
          {!words.length && (
            <p className="py-5 text-center text-sm text-ink-soft">
              No matching words. Try another search.
            </p>
          )}
        </div>
      </Sheet>
    </>
  );
}
