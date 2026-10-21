"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Story, Vocab } from "@/content/schema";
import { AddWord } from "./flow/AddWord";
import { NotebookExtras } from "./flow/NotebookExtras";
import { usePreview } from "@/store/preview";
import { QUALITY_META } from "@/lib/config";
import { plainText } from "@/lib/markup";
import { langMeta } from "@/lib/lang";
import { naturalVersion } from "@/lib/scoring";
import {
  useGame,
  useHydrated,
  vocabKey,
  type MistakeRecord,
  type PhraseRecord,
} from "@/store/game";
import { ListenButton, SavePhraseButton, useSfx } from "./audio";
import { Gloss } from "./Gloss";
import { LangProvider } from "./lang";
import { RichText } from "./RichText";
import { VocabSheet } from "./VocabSheet";
import { Button, PageShell, Sheet, cx } from "./ui";

type Tab = "words" | "phrases" | "mistakes" | "known" | "bookmarks" | "notes";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "words", label: "Words", icon: "🔤" },
  { id: "phrases", label: "Phrases", icon: "💬" },
  { id: "bookmarks", label: "Bookmarks", icon: "▢" },
  { id: "notes", label: "Notes", icon: "✎" },
  { id: "mistakes", label: "Mistakes", icon: "🔁" },
  { id: "known", label: "Known", icon: "★" },
];

type WordEntry = {
  storyId: string;
  storyTitle: string;
  vocab: Vocab;
  known: boolean;
  firstSeen: number;
};
export type Card = {
  id: string;
  front: string;
  reading: string;
  back: string;
  speak: string;
  lang: string;
  speech?: string;
  storyId?: string;
  vocabId?: string;
};

export function Notebook({ stories }: { stories: Story[] }) {
  const hydrated = useHydrated();
  const bookmarks = usePreview((s) => s.bookmarks);
  const notes = usePreview((s) => s.notes);
  const records = useGame((s) => s.vocab);
  const phrases = useGame((s) => s.phrases);
  const mistakes = useGame((s) => s.mistakes);
  const setKnown = useGame((s) => s.setKnown);
  const removeWord = useGame((s) => s.removeWord);

  const [tab, setTab] = useState<Tab>("words");
  const [query, setQuery] = useState("");
  const [storyFilter, setStoryFilter] = useState("all");
  const [learningOnly, setLearningOnly] = useState(false);
  const [open, setOpen] = useState<{ storyId: string; vocab: Vocab } | null>(
    null,
  );
  const [cards, setCards] = useState<Card[] | null>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get(
      "tab",
    ) as Tab | null;
    if (t && TABS.some((x) => x.id === t)) setTab(t);
  }, []);

  const storyById = useMemo(
    () => new Map(stories.map((s) => [s.id, s])),
    [stories],
  );
  const langOf = (storyId?: string, explicit?: string) =>
    explicit ?? storyById.get(storyId ?? "")?.targetLanguage ?? "ja";
  const speechOf = (storyId?: string) =>
    storyById.get(storyId ?? "")?.speechLang;
  const spokenWord = (w: WordEntry) =>
    langMeta(langOf(w.storyId)).hasFurigana ? w.vocab.reading : w.vocab.term;
  const q = query.trim().toLowerCase();
  const matches = (...fields: (string | undefined)[]) =>
    !q || fields.some((f) => f?.toLowerCase().includes(q));
  const inStory = (id?: string) => storyFilter === "all" || id === storyFilter;

  const words = useMemo(() => {
    const list: WordEntry[] = [];
    for (const s of stories) {
      for (const v of s.vocab) {
        const rec = records[vocabKey(s.id, v.id)];
        if (rec)
          list.push({
            storyId: s.id,
            storyTitle: s.title,
            vocab: v,
            known: rec.known,
            firstSeen: rec.firstSeen,
          });
      }
    }
    return list.sort((a, b) => b.firstSeen - a.firstSeen);
  }, [stories, records]);

  const wordMatches = (w: WordEntry) =>
    inStory(w.storyId) &&
    matches(w.vocab.term, w.vocab.reading, w.vocab.romaji, w.vocab.meaning);
  const learningWords = words.filter((w) => !w.known && wordMatches(w));
  const allWords = words.filter(wordMatches);
  const shownWords =
    tab === "known"
      ? words.filter((w) => w.known && wordMatches(w))
      : learningOnly
        ? learningWords
        : allWords;

  const phraseList = Object.values(phrases)
    .filter((p) => inStory(p.storyId) || (storyFilter === "all" && !p.storyId))
    .filter((p) =>
      matches(plainText(p.text), p.reading, p.translation, p.source),
    )
    .sort((a, b) => b.savedAt - a.savedAt);

  const mistakeList = Object.values(mistakes)
    .filter((m) => inStory(m.storyId))
    .filter((m) => {
      const ep = storyById
        .get(m.storyId)
        ?.episodes.find((e) => e.id === m.episodeId);
      const c = ep?.scenes[m.sceneId]?.choices?.find(
        (x) => x.id === m.choiceId,
      );
      return (
        !!c && matches(plainText(c.text), c.reading, c.translation, ep?.title)
      );
    })
    .sort(
      (a, b) => Number(a.reviewed) - Number(b.reviewed) || b.lastAt - a.lastAt,
    );

  const counts = {
    bookmarks: bookmarks.length,
    notes: notes.length,
    words: words.length,
    phrases: Object.keys(phrases).length,
    mistakes: Object.values(mistakes).filter((m) => !m.reviewed).length,
    known: words.filter((w) => w.known).length,
  };

  const reviewWords = (list: WordEntry[]) =>
    setCards(
      list.map((w) => ({
        id: `${w.storyId}:${w.vocab.id}`,
        front: w.vocab.term,
        reading: `${w.vocab.reading}${w.vocab.romaji ? ` · ${w.vocab.romaji}` : ""}`,
        back: w.vocab.meaning,
        speak: spokenWord(w),
        lang: langOf(w.storyId),
        speech: speechOf(w.storyId),
        storyId: w.storyId,
        vocabId: w.vocab.id,
      })),
    );
  const reviewPhrases = (list: PhraseRecord[]) =>
    setCards(
      list.map((p) => ({
        id: p.id,
        front: p.text,
        reading: p.reading,
        back: p.translation,
        speak: p.text,
        lang: langOf(p.storyId, p.lang),
        speech: speechOf(p.storyId),
      })),
    );

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-[26px] font-extrabold">📒 Notebook</h1>
        <AddWord stories={stories} />
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        Words you meet, phrases you save and mistakes worth another look.
        Everything stays on this device.
      </p>

      {/* Tabs */}
      <div
        className="no-scrollbar mt-4 flex overflow-x-auto gap-1 rounded-2xl bg-ink/5 p-1"
        role="tablist"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              "flex min-w-[70px] flex-1 flex-col items-center rounded-xl px-2 py-2 font-display text-[12px] font-extrabold transition",
              tab === t.id ? "bg-white text-ink shadow" : "text-ink-soft",
            )}
          >
            <span className="text-base leading-none">{t.icon}</span>
            <span>
              {t.label}
              {hydrated && counts[t.id] > 0 && (
                <span className="ml-1 text-[10px] text-sakura">
                  {counts[t.id]}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Search + filters */}
      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-ink/5">
        <span aria-hidden>🔎</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your notebook…"
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-soft/70"
          aria-label="Search the notebook"
        />
      </div>
      <div
        className={cx(
          "no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4",
          tab === "notes" && "hidden",
        )}
      >
        <Chip
          active={storyFilter === "all"}
          onClick={() => setStoryFilter("all")}
        >
          All stories
        </Chip>
        {stories.map((s) => (
          <Chip
            key={s.id}
            active={storyFilter === s.id}
            onClick={() => setStoryFilter(s.id)}
          >
            {s.title}
          </Chip>
        ))}
        {tab === "words" && (
          <Chip
            active={learningOnly}
            onClick={() => setLearningOnly((v) => !v)}
          >
            {learningOnly ? "✓ " : ""}Learning only
          </Chip>
        )}
      </div>

      {!hydrated ? null : (
        <div className="mt-4">
          {(tab === "notes" || tab === "bookmarks") && (
            <NotebookExtras tab={tab} query={query} storyFilter={storyFilter} />
          )}
          {(tab === "words" || tab === "known") && (
            <>
              {shownWords.length > 0 && (
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-ink-soft">
                    {shownWords.length}{" "}
                    {shownWords.length === 1 ? "word" : "words"}
                  </span>
                  <Button
                    variant="secondary"
                    className="!px-3 !py-1.5 !text-sm"
                    onClick={() => reviewWords(shownWords)}
                  >
                    🃏 Review {Math.min(shownWords.length, 20)}
                  </Button>
                </div>
              )}
              {words.length === 0 ? (
                <Empty
                  icon="🌱"
                  title="No words yet"
                  text="Play an episode. Words you meet (and tap) collect here."
                  cta
                />
              ) : shownWords.length === 0 ? (
                <Empty
                  icon={tab === "known" ? "☆" : "🎉"}
                  title={
                    tab === "known" ? "No known words yet" : "Nothing here"
                  }
                  text={
                    tab === "known"
                      ? "Mark words as known when you’re confident."
                      : "Nothing matches this filter."
                  }
                />
              ) : (
                <ul className="grid grid-cols-1 gap-2">
                  {shownWords.map((e) => (
                    <li
                      key={`${e.storyId}:${e.vocab.id}`}
                      className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-ink/5"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpen({ storyId: e.storyId, vocab: e.vocab })
                        }
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="font-display text-xl font-extrabold">
                            {e.vocab.term}
                          </span>
                          <span className="truncate text-xs text-ink-soft">
                            {e.vocab.reading}
                          </span>
                        </div>
                        <div className="truncate text-sm text-ink">
                          {e.vocab.meaning}
                        </div>
                        {storyFilter === "all" && stories.length > 1 && (
                          <div className="text-[11px] font-bold text-ink-soft">
                            {e.storyTitle}
                          </div>
                        )}
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${e.vocab.term} from notebook`}
                        onClick={() => removeWord(e.storyId, e.vocab.id)}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-ink/5"
                      >
                        ×
                      </button>
                      <LangProvider
                        lang={langOf(e.storyId)}
                        speech={speechOf(e.storyId)}
                      >
                        <ListenButton
                          id={`nb:${e.storyId}:${e.vocab.id}`}
                          text={spokenWord(e)}
                          size="sm"
                        />
                      </LangProvider>
                      <button
                        type="button"
                        onClick={() =>
                          setKnown(e.storyId, e.vocab.id, !e.known)
                        }
                        className={cx(
                          "shrink-0 rounded-full px-3 py-1.5 font-display text-xs font-extrabold transition active:scale-95",
                          e.known
                            ? "bg-matcha text-white"
                            : "bg-paper-2 text-ink-soft",
                        )}
                        aria-pressed={e.known}
                      >
                        {e.known ? "★ Known" : "☆ Learning"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {tab === "phrases" && (
            <>
              {phraseList.length > 0 && (
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-ink-soft">
                    {phraseList.length} saved
                  </span>
                  <Button
                    variant="secondary"
                    className="!px-3 !py-1.5 !text-sm"
                    onClick={() => reviewPhrases(phraseList)}
                  >
                    🃏 Review {Math.min(phraseList.length, 20)}
                  </Button>
                </div>
              )}
              {Object.keys(phrases).length === 0 ? (
                <Empty
                  icon="💬"
                  title="No saved phrases"
                  text="Tap ☆ on any line or answer while playing to save the whole phrase here."
                  cta
                />
              ) : phraseList.length === 0 ? (
                <Empty
                  icon="🔎"
                  title="No matches"
                  text="Try another search or story."
                />
              ) : (
                <ul className="grid grid-cols-1 gap-2">
                  {phraseList.map((p) => {
                    const pl = langMeta(langOf(p.storyId, p.lang));
                    return (
                      <LangProvider
                        key={p.id}
                        lang={pl.code}
                        speech={speechOf(p.storyId)}
                      >
                        <li className="flex items-start gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-ink/5">
                          <div className="min-w-0 flex-1">
                            <div
                              className={cx(
                                "font-display text-[17px] font-bold",
                                pl.hasFurigana ? "leading-[2]" : "leading-snug",
                              )}
                            >
                              <RichText
                                text={p.text}
                                furigana={pl.hasFurigana}
                              />
                            </div>
                            {(p.reading || p.translation) && (
                              <Gloss
                                reading={p.reading}
                                translation={p.translation}
                              />
                            )}
                            <div className="mt-1 text-[11px] font-bold text-ink-soft">
                              {p.source}
                              {p.context && <> · {p.context}</>}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col gap-1.5">
                            <ListenButton
                              id={`nbp:${p.id}`}
                              text={p.text}
                              size="sm"
                            />
                            <SavePhraseButton size="sm" phrase={p} />
                          </div>
                        </li>
                      </LangProvider>
                    );
                  })}
                </ul>
              )}
            </>
          )}

          {tab === "mistakes" && (
            <>
              {Object.keys(mistakes).length === 0 ? (
                <Empty
                  icon="✨"
                  title="No mistakes yet"
                  text="Awkward or wrong answers you pick in stories are saved here so you can replay the situation later."
                  cta
                />
              ) : mistakeList.length === 0 ? (
                <Empty
                  icon="🔎"
                  title="No matches"
                  text="Try another search or story."
                />
              ) : (
                <ul className="grid grid-cols-1 gap-3">
                  {mistakeList.map((m) => {
                    const st = storyById.get(m.storyId);
                    return (
                      <LangProvider
                        key={m.id}
                        lang={st?.targetLanguage ?? "ja"}
                        speech={st?.speechLang}
                      >
                        <MistakeCard m={m} story={st} />
                      </LangProvider>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      <LangProvider
        lang={langOf(open?.storyId)}
        speech={speechOf(open?.storyId)}
      >
        <VocabSheet
          storyId={open?.storyId ?? ""}
          vocab={open?.vocab ?? null}
          onClose={() => setOpen(null)}
        />
      </LangProvider>
      <Flashcards cards={cards} onClose={() => setCards(null)} />
    </PageShell>
  );
}

function MistakeCard({ m, story }: { m: MistakeRecord; story?: Story }) {
  const [whyOpen, setWhyOpen] = useState(false);
  const episode = story?.episodes.find((e) => e.id === m.episodeId);
  const scene = episode?.scenes[m.sceneId];
  const choice = scene?.choices?.find((c) => c.id === m.choiceId);
  if (!story || !episode || !scene || !choice) return null;
  const better = naturalVersion(scene, choice);
  const fur = langMeta(story.targetLanguage).hasFurigana;
  const prompt = scene.lines.at(-1);
  const q = QUALITY_META[choice.quality];
  const char = prompt
    ? story.characters.find((c) => c.id === prompt.speaker)
    : undefined;

  return (
    <li
      className={cx(
        "rounded-3xl bg-white p-4 shadow-sm ring-1",
        m.reviewed ? "ring-q-natural/40" : "ring-ink/5",
      )}
    >
      <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
        <span className="truncate text-ink-soft">
          {episode.title} · {story.title}
        </span>
        {m.reviewed ? (
          <span className="shrink-0 rounded-full bg-[#e3f7eb] px-2 py-0.5 text-q-natural">
            ✓ Reviewed
          </span>
        ) : (
          <span
            className="shrink-0 rounded-full px-2 py-0.5"
            style={{ color: q.color, background: q.bg }}
          >
            {q.label}
            {m.count > 1 && ` ×${m.count}`}
          </span>
        )}
      </div>

      {prompt && (
        <div className="mt-2 rounded-2xl bg-ink/5 px-3 py-2 text-[13px]">
          <span className="font-bold text-ink-soft">Context: </span>
          {prompt.speaker === "narrator" ? (
            <span className="italic">{prompt.text}</span>
          ) : (
            <>
              <span className="font-bold">{char?.name ?? "You"}: </span>
              <RichText text={prompt.text} furigana={false} />
              {prompt.translation && (
                <span className="text-ink-soft">
                  {" "}
                  ({fur ? `“${prompt.translation}”` : prompt.translation})
                </span>
              )}
            </>
          )}
        </div>
      )}

      <div className="mt-2 flex items-start gap-2 rounded-2xl bg-[#ffe5ea]/60 px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-q-wrong">
            You said
          </div>
          <div
            className={cx(
              "font-display text-[16px] font-bold",
              fur ? "leading-[2]" : "leading-snug",
            )}
          >
            <RichText text={choice.text} furigana={fur} />
          </div>
          <Gloss reading={choice.reading} translation={choice.translation} />
        </div>
        <ListenButton id={`mk:${m.id}:said`} text={choice.text} size="sm" />
      </div>
      {better && (
        <div className="mt-2 flex items-start gap-2 rounded-2xl bg-[#e3f7eb] px-3 py-2">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-q-natural">
              Natural version
            </div>
            <div
              className={cx(
                "font-display text-[16px] font-bold",
                fur ? "leading-[2]" : "leading-snug",
              )}
            >
              <RichText text={better.text} furigana={fur} />
            </div>
            <Gloss reading={better.reading} translation={better.translation} />
          </div>
          <div className="flex shrink-0 flex-col gap-1.5">
            <ListenButton
              id={`mk:${m.id}:better`}
              text={better.text}
              size="sm"
            />
            <SavePhraseButton
              size="sm"
              phrase={{
                text: better.text,
                reading: better.reading,
                translation: better.translation,
                source: `${story.title} · ${episode.title}`,
                storyId: story.id,
                context: "Natural version (from a mistake)",
              }}
            />
          </div>
        </div>
      )}

      <p className="mt-2 text-[14px] leading-relaxed">💡 {choice.feedback}</p>
      {choice.why && (
        <>
          <button
            type="button"
            onClick={() => setWhyOpen((o) => !o)}
            className="mt-1 text-[13px] font-extrabold text-plum"
            aria-expanded={whyOpen}
          >
            {whyOpen ? "▾ Why?" : "▸ Why?"}
          </button>
          {whyOpen && (
            <p className="mt-1 rounded-2xl bg-plum/5 p-3 text-[14px] leading-relaxed">
              {choice.why}
            </p>
          )}
        </>
      )}

      <Link
        href={`/play/${story.id}/${episode.id}?review=${encodeURIComponent(m.id)}`}
        className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-sky px-4 py-2.5 font-display font-extrabold text-white shadow-[0_3px_0_#2f7fc0] active:translate-y-0.5"
      >
        🔁{" "}
        {m.reviewed ? "Replay this situation" : "Review: replay this situation"}
      </Link>
    </li>
  );
}

export function Flashcards({
  cards,
  onClose,
}: {
  cards: Card[] | null;
  onClose: () => void;
}) {
  const setKnown = useGame((s) => s.setKnown);
  const sfx = useSfx();
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const deck = useMemo(() => (cards ?? []).slice(0, 20), [cards]);
  const deckLang =
    deck.length && deck.every((c) => c.lang === deck[0].lang)
      ? deck[0].lang
      : undefined;

  useEffect(() => {
    setIdx(0);
    setFlipped(false);
    setKnownCount(0);
  }, [cards]);

  const card = deck[idx];
  const advance = (known: boolean) => {
    if (card?.storyId && card.vocabId && known)
      setKnown(card.storyId, card.vocabId, true);
    if (known) setKnownCount((k) => k + 1);
    sfx(known ? "natural" : "flip");
    setFlipped(false);
    setIdx((i) => i + 1);
  };

  return (
    <Sheet
      open={!!cards}
      onClose={onClose}
      title={
        <>
          <h2 className="font-display text-xl font-extrabold">🃏 Review</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-ink/5 px-3 py-1.5 text-sm font-bold"
            aria-label="Close review"
          >
            ✕
          </button>
        </>
      }
    >
      {card ? (
        <LangProvider lang={card.lang} speech={card.speech}>
          <div>
            <div className="mb-2 text-center text-xs font-bold text-ink-soft">
              {idx + 1} / {deck.length}
            </div>
            <button
              type="button"
              onClick={() => {
                setFlipped((f) => !f);
                sfx("flip");
              }}
              className="grid min-h-48 w-full place-items-center rounded-3xl bg-white p-6 text-center shadow-md ring-1 ring-ink/5"
              aria-label={flipped ? "Hide answer" : "Show answer"}
            >
              <div>
                <div
                  className={cx(
                    "font-display text-3xl font-extrabold",
                    langMeta(card.lang).hasFurigana
                      ? "leading-[2]"
                      : "leading-snug",
                  )}
                >
                  <RichText
                    text={card.front}
                    furigana={flipped && langMeta(card.lang).hasFurigana}
                  />
                </div>
                {flipped ? (
                  <div className="mt-2 animate-fade">
                    <div className="text-sm italic text-ink-soft">
                      {card.reading}
                    </div>
                    <div className="mt-1 text-lg font-bold">{card.back}</div>
                  </div>
                ) : (
                  <div className="mt-3 text-xs font-bold text-ink-soft">
                    Tap to reveal
                  </div>
                )}
              </div>
            </button>
            <div className="mt-3 flex justify-center">
              <ListenButton id={`fc:${card.id}`} text={card.speak} />
            </div>
            {flipped && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => advance(false)}>
                  Still learning
                </Button>
                <Button onClick={() => advance(true)}>
                  {card.vocabId ? "★ I know it" : "Got it"}
                </Button>
              </div>
            )}
          </div>
        </LangProvider>
      ) : (
        <div className="py-6 text-center">
          <div className="text-4xl">
            {deckLang ? langMeta(deckLang).celebrate : "🎉"}
          </div>
          <p className="mt-2 font-display text-lg font-extrabold">
            Review complete
          </p>
          <p className="text-sm text-ink-soft">
            {knownCount} of {deck.length} felt solid.
          </p>
          <Button className="mt-4" onClick={onClose}>
            Done
          </Button>
        </div>
      )}
    </Sheet>
  );
}

function Empty({
  icon,
  title,
  text,
  cta,
}: {
  icon: string;
  title: string;
  text: string;
  cta?: boolean;
}) {
  return (
    <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-ink/5">
      <div className="text-4xl">{icon}</div>
      <h2 className="mt-2 font-display text-lg font-extrabold">{title}</h2>
      <p className="mt-1 text-sm text-ink-soft">{text}</p>
      {cta && (
        <Button href="/stories" className="mt-4">
          Find a story
        </Button>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "shrink-0 rounded-full px-3.5 py-1.5 font-display text-sm font-bold transition",
        active
          ? "bg-ink text-white"
          : "bg-white text-ink-soft ring-1 ring-ink/10",
      )}
    >
      {children}
    </button>
  );
}
