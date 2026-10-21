"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePreview } from "@/store/preview";
import { useGame } from "@/store/game";
import { stopSpeaking } from "@/lib/audio";
import { cx } from "../ui";
export function Brand() {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5">
      <img src="/icon.svg" alt="" className="h-10 w-10 animate-pop" />
      <span className="font-display text-[23px] font-extrabold leading-tight tracking-tight">
        Language Stories
      </span>
    </Link>
  );
}
export function PreviewHydration() {
  useEffect(() => {
    void usePreview.persist.rehydrate();
  }, []);
  return null;
}
export function ProfileMenu() {
  const [open, setOpen] = useState(false),
    [confirm, setConfirm] = useState(false);
  const name = usePreview((s) => s.name);
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  return (
    <div className="relative" ref={root}>
      <button
        className="profile-avatar"
        type="button"
        aria-label="Open profile menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {name ? name.trim().charAt(0).toUpperCase() : "☺"}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-52 rounded-2xl border border-ink/10 bg-paper p-2 shadow-xl">
          <div className="border-b border-ink/10 px-3 py-2">
            <p className="font-display text-sm font-extrabold">
              {name || "Your little corner"}
            </p>
            <p className="text-[11px] text-ink-soft">
              Learning, one story at a time.
            </p>
          </div>
          {[
            ["/profile", "Your profile"],
            ["/settings", "Settings"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="block rounded-xl px-3 py-3 text-sm font-bold hover:bg-ink/5"
            >
              {label}
            </Link>
          ))}
          <button
            type="button"
            className="w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-q-wrong hover:bg-ink/5"
            onClick={() => {
              setConfirm(true);
              setOpen(false);
            }}
          >
            Sign out
          </button>
        </div>
      )}
      {confirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="signout-title"
          className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-5"
        >
          <div className="w-full max-w-sm rounded-3xl bg-paper p-6 shadow-xl">
            <h2
              id="signout-title"
              className="font-display text-xl font-extrabold"
            >
              See you in the next story?
            </h2>
            <p className="my-3 text-sm leading-relaxed text-ink-soft">
              Sign out of this preview. Your learning progress and notebook will
              stay on this device.
            </p>
            <div className="flex gap-2">
              <button
                className="flow-primary flex-1"
                onClick={() => {
                  stopSpeaking();
                  usePreview.getState().update({ signedIn: false });
                  router.push("/welcome");
                  setConfirm(false);
                }}
              >
                Sign out
              </button>
              <button
                className="flow-secondary flex-1"
                onClick={() => setConfirm(false)}
              >
                Stay here
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export function FlowHeader({
  eyebrow,
  title,
  description,
  back,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  back?: string;
}) {
  return (
    <header className="mb-5">
      {back && (
        <Link
          href={back}
          className="mb-4 inline-flex min-h-11 items-center text-sm font-bold text-ink-soft"
        >
          ← Back
        </Link>
      )}
      {eyebrow && <p className="flow-eyebrow mb-1">{eyebrow}</p>}
      <h1 className="font-display text-[26px] font-extrabold leading-tight">
        {title}
      </h1>
      {description && (
        <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
          {description}
        </p>
      )}
    </header>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-ink-soft">
        {label}
      </span>
      {children}
    </label>
  );
}
export function LevelPicker({
  language,
  level,
  onChange,
}: {
  language: string;
  level: string;
  onChange: (v: string) => void;
}) {
  const english = ["A1", "A2", "B1", "B2", "C1", "C2"],
    japanese = ["N5", "N4", "N3", "N2", "N1"];
  const levels = language === "en" ? english : japanese;
  const descriptions: Record<string, string> = {
    A1: "Familiar words, first conversations",
    A2: "Everyday exchanges, a little more detail",
    B1: "Tell stories and explain your plans",
    B2: "Express opinions and compare ideas",
    C1: "Nuance, fluency and complex situations",
    C2: "Precision in demanding conversations",
    N5: "Everyday words and simple requests",
    N4: "Familiar situations and basic conversation",
    N3: "Everyday topics with more detail",
    N2: "Complex conversations and natural speech",
    N1: "Nuance, register and advanced expression",
  };
  return (
    <div className="grid gap-2">
      {levels.map((l, i) => (
        <button
          type="button"
          key={l}
          aria-pressed={level === l}
          onClick={() => onChange(l)}
          className={cx(
            "flex min-h-16 items-center gap-3 rounded-2xl bg-white p-3 text-left ring-2 transition",
            level === l ? "ring-sakura shadow-[0_3px_0_#c5dbd4]" : "ring-ink/5",
          )}
        >
          <span
            className={cx(
              "grid h-10 w-11 shrink-0 place-items-center rounded-xl font-display text-sm font-extrabold",
              level === l ? "bg-sakura text-white" : "bg-paper-2",
            )}
          >
            {l}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-sm font-extrabold">
              {i < 2
                ? "Building your foundation"
                : i < 4
                  ? "Finding your flow"
                  : "Expressing yourself fully"}
            </span>
            <span className="mt-0.5 block text-xs text-ink-soft">
              {descriptions[l]}
            </span>
          </span>
          <span
            className={cx(
              "h-5 w-5 shrink-0 rounded-full border-2",
              level === l
                ? "border-sakura bg-sakura shadow-[inset_0_0_0_3px_white]"
                : "border-ink/15",
            )}
          />
        </button>
      ))}
    </div>
  );
}
export function setLearningLevel(language: string, level: string) {
  usePreview
    .getState()
    .update(
      language === "en" ? { englishLevel: level } : { japaneseLevel: level },
    );
  const levels =
    language === "en"
      ? ["A1", "A2", "B1", "B2", "C1", "C2"]
      : ["N5", "N4", "N3", "N2", "N1"];
  useGame.getState().setProfile({
    targetLanguage: language,
    approxLevel: Math.min(3, Math.max(1, levels.indexOf(level) + 1)) as
      1 | 2 | 3,
  });
}

export function SignOutButton() {
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();
  return (
    <>
      <button
        className="w-full rounded-2xl bg-white px-4 py-4 text-left text-sm font-bold text-q-wrong ring-1 ring-ink/5"
        onClick={() => setConfirm(true)}
      >
        Sign out →
      </button>
      {confirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-signout-title"
          className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-5"
        >
          <div className="flow-card w-full max-w-sm">
            <h2
              id="settings-signout-title"
              className="font-display text-xl font-extrabold"
            >
              Ready to close this chapter?
            </h2>
            <p className="my-3 text-sm leading-relaxed text-ink-soft">
              Your progress and notebook will stay on this device.
            </p>
            <div className="flex gap-2">
              <button
                className="flow-primary flex-1"
                onClick={() => {
                  stopSpeaking();
                  usePreview.getState().update({ signedIn: false });
                  router.push("/welcome");
                  setConfirm(false);
                }}
              >
                Sign out
              </button>
              <button
                autoFocus
                className="flow-secondary flex-1"
                onClick={() => setConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
