"use client";

import type { Episode } from "@/content/schema";
import { NARRATOR } from "@/content/schema";
import type { PlayState } from "@/engine/engine";
import type { Aids } from "@/lib/aids";
import { ENDING_TYPE_META, QUALITY_META } from "@/lib/config";
import { RichText } from "../RichText";
import { Sheet, cx } from "../ui";

/**
 * Timeline of the choice points reached in a run. Each node shows the option
 * picked, other options (explored ones are marked), and lets you rewind there.
 */
export function ChoiceMap({
  open,
  onClose,
  episode,
  run,
  choicesSeen,
  aids,
  onJump,
  ended,
}: {
  open: boolean;
  onClose: () => void;
  episode: Episode;
  run: PlayState;
  choicesSeen: string[];
  aids: Aids;
  onJump: (historyIndex: number) => void;
  ended: boolean;
}) {
  const ending = run.endingId ? episode.endings.find((e) => e.id === run.endingId) : undefined;
  const totalChoicePoints = Object.values(episode.scenes).filter((s) => s.choices?.length).length;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      labelledBy="choice-map-title"
      title={
        <>
          <div>
            <h2 id="choice-map-title" className="font-display text-xl font-extrabold">
              🗺️ Choice map
            </h2>
            <p className="text-xs font-bold text-ink-soft">
              Tap a choice point to rewind there and try another answer.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-ink/5 px-3 py-1.5 text-sm font-bold" aria-label="Close map">
            ✕
          </button>
        </>
      }
    >
      {run.history.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center text-sm text-ink-soft ring-1 ring-ink/5">
          No choices made yet. Your path will appear here as you play.
        </div>
      ) : (
        <ol className="relative ml-3 border-l-[3px] border-dashed border-ink/15 pl-5">
          {run.history.map((h, i) => {
            const scene = episode.scenes[h.sceneId];
            const prompt = scene?.lines.at(-1);
            return (
              <li key={`${h.sceneId}-${i}`} className="relative mb-4">
                <span className="absolute -left-[34px] top-2 grid h-6 w-6 place-items-center rounded-full bg-sakura font-display text-xs font-extrabold text-white ring-4 ring-paper">
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => onJump(i)}
                  className="w-full rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-ink/5 transition hover:ring-sakura active:scale-[0.99]"
                >
                  {prompt && (
                    <div className="mb-2 text-[13px] text-ink-soft">
                      {prompt.speaker === NARRATOR ? (
                        <span className="italic">{prompt.text}</span>
                      ) : (
                        <span className="font-display font-bold text-ink">
                          <RichText text={prompt.text} furigana={aids.furigana} />
                        </span>
                      )}
                    </div>
                  )}
                  <ul className="space-y-1">
                    {scene?.choices?.map((c) => {
                      const picked = c.id === h.choiceId;
                      const explored = choicesSeen.includes(c.id);
                      const q = QUALITY_META[c.quality];
                      return (
                        <li
                          key={c.id}
                          className={cx(
                            "flex items-center gap-2 rounded-xl px-2 py-1 text-[14px]",
                            picked ? "bg-sakura-soft font-bold text-ink" : "text-ink-soft",
                          )}
                        >
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: explored ? q.color : "transparent", border: `2px solid ${explored ? q.color : "#c9c3d3"}` }}
                            title={explored ? q.label : "Not tried yet"}
                          />
                          <span className="min-w-0 flex-1 truncate">{explored ? <RichText text={c.text} furigana={false} /> : "？？？"}</span>
                          {picked && <span className="shrink-0 text-[11px] font-extrabold text-sakura">YOU</span>}
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-2 text-right font-display text-xs font-extrabold text-sakura">↺ Rewind here</div>
                </button>
              </li>
            );
          })}
          <li className="relative">
            <span className="absolute -left-[34px] top-1 grid h-6 w-6 place-items-center rounded-full bg-ink text-xs text-white ring-4 ring-paper">
              {ending ? ENDING_TYPE_META[ending.type].icon : "…"}
            </span>
            <div className="rounded-2xl bg-ink/5 p-3 text-sm font-bold text-ink-soft">
              {ended && ending ? (
                <>
                  Ending reached: <span className="text-ink">{ending.title}</span>
                </>
              ) : (
                <>You are here ({run.history.length}/{totalChoicePoints} choice points)</>
              )}
            </div>
          </li>
        </ol>
      )}
      <p className="mt-4 flex flex-wrap gap-3 text-[11px] font-bold text-ink-soft">
        {Object.entries(QUALITY_META).map(([k, q]) => (
          <span key={k} className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: q.color }} /> {q.label}
          </span>
        ))}
      </p>
    </Sheet>
  );
}
