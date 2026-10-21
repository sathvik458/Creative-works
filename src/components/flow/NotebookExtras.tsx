"use client";
import { useState } from "react";
import Link from "next/link";
import { usePreview } from "@/store/preview";
import { Button } from "../ui";
import { RichText } from "../RichText";
export function NotebookExtras({
  tab,
  query,
  storyFilter = "all",
}: {
  tab: "notes" | "bookmarks";
  query: string;
  storyFilter?: string;
}) {
  const store = usePreview(),
    [editing, setEditing] = useState<string | null>(null),
    [title, setTitle] = useState(""),
    [text, setText] = useState("");
  const q = query.toLowerCase();
  const notes = store.notes.filter((n) =>
      `${n.title} ${n.text}`.toLowerCase().includes(q),
    ),
    marks = store.bookmarks.filter(
      (b) =>
        `${b.text} ${b.source}`.toLowerCase().includes(q) &&
        (storyFilter === "all" || b.href.startsWith(`/play/${storyFilter}/`)),
    );
  return (
    <div>
      {tab === "notes" ? (
        <>
          <Button
            className="mb-3 w-full"
            onClick={() => {
              setEditing("new");
              setTitle("");
              setText("");
            }}
          >
            ＋ Add a personal note
          </Button>
          {editing && (
            <form
              className="flow-card mb-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                store.saveNote({
                  id: editing === "new" ? crypto.randomUUID() : editing,
                  title: title.trim(),
                  text: text.trim(),
                  updatedAt: Date.now(),
                });
                setEditing(null);
              }}
            >
              <label className="block text-xs font-bold">
                Title
                <input
                  className="flow-input mt-2"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={100}
                  placeholder="Something I want to remember"
                />
              </label>
              <label className="block text-xs font-bold">
                Your note
                <textarea
                  aria-label="Your note"
                  className="flow-input mt-2"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  required
                  rows={4}
                  maxLength={4000}
                  placeholder="A phrase, a small discovery, a question…"
                />
              </label>
              <div className="flex gap-2">
                <button type="submit" className="flow-primary">
                  Save note
                </button>
                <button
                  className="flow-secondary"
                  type="button"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
          <div className="grid gap-3">
            {notes.map((n) => (
              <article key={n.id} className="flow-card">
                <h2 className="font-display text-base font-extrabold">
                  {n.title}
                </h2>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-soft">
                  {n.text}
                </p>
                <div className="mt-3 flex gap-4">
                  <button
                    className="min-h-10 text-xs font-bold text-sakura"
                    onClick={() => {
                      setEditing(n.id);
                      setTitle(n.title);
                      setText(n.text);
                    }}
                  >
                    Edit note
                  </button>
                  <button
                    className="min-h-10 text-xs font-bold text-q-wrong"
                    onClick={() => store.removeNote(n.id)}
                  >
                    Remove note
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!notes.length && !editing && (
            <Empty
              title={
                query
                  ? "No notes match your search."
                  : "A little space for your discoveries."
              }
              text="Save your own reminders, language questions and small wins here."
            />
          )}
        </>
      ) : (
        <>
          <div className="grid gap-3">
            {marks.map((b) => (
              <article key={b.id} className="flow-card">
                <p className="font-display text-lg font-bold">
                  <RichText text={b.text} furigana={b.lang === "ja"} />
                </p>
                <p className="mt-2 text-xs text-ink-soft">{b.source}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Link
                    href={b.href}
                    className="min-h-10 py-2 text-sm font-bold text-sakura"
                  >
                    Return to the story →
                  </Link>
                  <button
                    className="min-h-10 text-xs font-bold text-ink-soft"
                    onClick={() => store.bookmark(b)}
                  >
                    Remove bookmark
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!marks.length && (
            <Empty
              title={
                query
                  ? "No bookmarks match your search."
                  : "A line worth coming back to."
              }
              text="Tap the bookmark beside a line in the story player. It will be waiting here."
            />
          )}
        </>
      )}
    </div>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="flow-card text-center">
      <div className="text-3xl">📑</div>
      <h2 className="mt-3 font-display text-lg font-extrabold">{title}</h2>
      <p className="my-3 text-sm leading-relaxed text-ink-soft">{text}</p>
      <Button variant="secondary" href="/stories">
        Find a story
      </Button>
    </div>
  );
}
export function BookmarkLine({
  id,
  text,
  source,
  href,
  lang,
}: {
  id: string;
  text: string;
  source: string;
  href: string;
  lang: string;
}) {
  const marks = usePreview((s) => s.bookmarks),
    bookmark = usePreview((s) => s.bookmark);
  const saved = marks.some((b) => b.id === id);
  return (
    <button
      type="button"
      aria-label={saved ? "Remove story bookmark" : "Bookmark story line"}
      aria-pressed={saved}
      title={saved ? "Remove bookmark" : "Bookmark this line"}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-sm text-sakura ring-1 ring-ink/10"
      onClick={(e) => {
        e.stopPropagation();
        bookmark({ id, text, source, href, lang });
      }}
    >
      {saved ? "▣" : "▢"}
    </button>
  );
}
