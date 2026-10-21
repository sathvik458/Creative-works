"use client";

import Link from "next/link";
import type { Story } from "@/content/schema";
import { ENDING_TYPE_META } from "@/lib/config";
import { progressKey, useGame, useHydrated } from "@/store/game";
import { Sprite } from "./Sprite";
import { Button, EndingDots, LevelBadge, PageShell, cx } from "./ui";

export function StoryDetail({ story }: { story: Story }) {
  const hydrated = useHydrated();
  const progress = useGame((s) => s.progress);
  const quiz = useGame((s) => s.quiz);
  const survival = useGame((s) => s.survival);

  return (
    <PageShell>
      <Link href="/stories" className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-ink-soft">
        ← Stories
      </Link>
      <div className="relative overflow-hidden rounded-[28px] shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={story.coverImage} alt="" className="h-56 w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
        <div className="absolute inset-x-5 bottom-4 text-white">
          {story.titleNative && <div className="font-display text-sm font-bold opacity-90">{story.titleNative}</div>}
          <h1 className="font-display text-3xl font-extrabold leading-tight">{story.title}</h1>
        </div>
      </div>

      <p className="mt-4 text-[15px] leading-relaxed">{story.synopsis}</p>

      <div className="no-scrollbar -mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {story.characters.map((c) => (
          <div key={c.id} className="w-24 shrink-0 rounded-2xl bg-white p-2 text-center shadow-sm ring-1 ring-ink/5">
            <div className="mx-auto h-20 w-16 overflow-hidden">
              <Sprite character={c} expression="happy" className="h-28 w-full" />
            </div>
            <div className="mt-1 truncate font-display text-[13px] font-extrabold" style={{ color: c.color }}>
              {c.name}
            </div>
            <div className="truncate text-[10px] font-bold text-ink-soft">{c.role}</div>
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-6 font-display text-sm font-extrabold uppercase tracking-widest text-ink-soft">Episodes</h2>
      <ol className="grid grid-cols-1 gap-3">
        {story.episodes.map((ep, i) => {
          const p = hydrated ? progress[progressKey(story.id, ep.id)] : undefined;
          const found = p?.endings ?? [];
          const level = ep.level ?? story.level;
          const choicePoints = Object.values(ep.scenes).filter((s) => s.choices).length;
          return (
            <li key={ep.id} className="rounded-3xl bg-white p-4 shadow-[0_4px_0_rgba(43,35,64,0.06)] ring-1 ring-ink/5">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-paper-2 font-display text-lg font-extrabold">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-extrabold leading-tight">{ep.title}</h3>
                    <LevelBadge level={level} />
                  </div>
                  {ep.titleNative && <div className="text-sm font-bold text-sakura">{ep.titleNative}</div>}
                  {ep.synopsis && <p className="mt-1 text-sm text-ink-soft">{ep.synopsis}</p>}
                  {ep.goal && (
                    <p className="mt-2 text-[13px] font-bold text-ink">
                      🎯 <span className="font-medium">{ep.goal}</span>
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-xs font-bold text-ink-soft">
                    <EndingDots found={found.length} total={ep.endings.length} />
                    {found.length}/{ep.endings.length} endings · {choicePoints} choices · ~4 min
                  </div>
                  {found.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {ep.endings.map((e) => {
                        const got = found.includes(e.id);
                        const m = ENDING_TYPE_META[e.type];
                        return (
                          <span
                            key={e.id}
                            className={cx("rounded-full px-2 py-0.5 text-[11px] font-bold", !got && "opacity-50")}
                            style={{ background: got ? m.bg : "rgba(43,35,64,0.06)", color: got ? m.color : "#8b84a0" }}
                          >
                            {got ? `${m.icon} ${e.title}` : "？？？"}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              {hydrated && (quiz[progressKey(story.id, ep.id)] || (ep.survival?.length ?? 0) >= 5) && (
                <div className="mt-3 flex flex-wrap gap-2 text-[12px] font-bold">
                  {quiz[progressKey(story.id, ep.id)] && (
                    <span className="rounded-full bg-ink/5 px-2.5 py-1 text-ink-soft">
                      🧠 Review best {quiz[progressKey(story.id, ep.id)].best}/{quiz[progressKey(story.id, ep.id)].total}
                    </span>
                  )}
                  {(ep.survival?.length ?? 0) >= 5 &&
                    (found.length > 0 ? (
                      <Link href={`/survival/${story.id}/${ep.id}`} className="rounded-full bg-plum px-2.5 py-1 text-white">
                        ⚡ Survival Mode
                        {survival[progressKey(story.id, ep.id)] && ` · best ${survival[progressKey(story.id, ep.id)].best}/${survival[progressKey(story.id, ep.id)].total}`}
                      </Link>
                    ) : (
                      <span className="rounded-full bg-ink/5 px-2.5 py-1 text-ink-soft">🔒 Survival: reach any ending</span>
                    ))}
                </div>
              )}
              <div className="mt-3 flex gap-2">
                {p?.current ? (
                  <>
                    <Button href={`/play/${story.id}/${ep.id}`} className="flex-1">
                      ▶ Continue
                    </Button>
                    <Button href={`/play/${story.id}/${ep.id}?new=1`} variant="secondary">
                      Restart
                    </Button>
                  </>
                ) : (
                  <Button href={`/play/${story.id}/${ep.id}?new=1`} className="flex-1" variant={p?.plays ? "secondary" : "primary"}>
                    {p?.plays ? "↺ Play again" : "▶ Play"}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </PageShell>
  );
}
