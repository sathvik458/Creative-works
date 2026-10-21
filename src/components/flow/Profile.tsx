"use client";
import { useEffect, useState } from "react";
import { useGame, useHydrated } from "@/store/game";
import { usePreview } from "@/store/preview";
import { PageShell, Button } from "../ui";
import { Field, FlowHeader, LevelPicker, setLearningLevel } from "./shared";
export function Profile() {
  const ready = useHydrated();
  const user = usePreview();
  const profile = useGame((s) => s.profile),
    progress = useGame((s) => s.progress),
    xp = useGame((s) => s.xp);
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [mobile, setMobile] = useState(""),
    [lang, setLang] = useState("ja"),
    [level, setLevel] = useState("N5"),
    [editing, setEditing] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (ready) {
      setName(usePreview.getState().name);
      setEmail(usePreview.getState().email);
      setMobile(usePreview.getState().mobile);
      setLang(profile.targetLanguage);
      setLevel(
        profile.targetLanguage === "en"
          ? usePreview.getState().englishLevel
          : usePreview.getState().japaneseLevel,
      );
    }
  }, [ready, profile.targetLanguage]);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    user.update({ name, email, mobile });
    setLearningLevel(lang, level);
    setEditing(false);
    setMessage("Your profile is saved on this device.");
  }
  return (
    <PageShell>
      <FlowHeader
        back="/"
        eyebrow="YOUR LITTLE CORNER"
        title="Your profile"
        description="A few details that make this story yours."
      />
      <div className="flow-card mb-5 flex items-center gap-4">
        <span className="profile-avatar !h-16 !w-16 !text-2xl">
          {user.name.charAt(0).toUpperCase() || "☺"}
        </span>
        <div className="min-w-0">
          <h2 className="truncate font-display text-lg font-extrabold">
            {user.name || "A curious storyteller"}
          </h2>
          <p className="text-xs text-ink-soft">
            {profile.targetLanguage === "ja" ? "Japanese" : "English"} ·{" "}
            {profile.targetLanguage === "ja"
              ? user.japaneseLevel
              : user.englishLevel}
          </p>
          <p className="mt-1 truncate text-xs text-ink-soft">
            {user.email || "Exploring as a guest"}
          </p>
        </div>
      </div>
      <div className="mb-6 grid grid-cols-3 gap-2">
        {[
          [xp, "XP earned"],
          [
            Object.values(progress).filter((p) => p.endings.length).length,
            "episodes",
          ],
          [
            Object.values(progress).reduce((n, p) => n + p.endings.length, 0),
            "endings",
          ],
        ].map(([n, l]) => (
          <div className="flow-card !p-3 text-center" key={l}>
            <p className="font-display text-xl font-extrabold">{n}</p>
            <p className="text-[10px] text-ink-soft">{l}</p>
          </div>
        ))}
      </div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flow-section-title !mb-0">Personal details</h2>
        <button
          type="button"
          onClick={() => {
            setEditing(!editing);
            setMessage("");
          }}
          className="min-h-11 text-sm font-bold text-sakura"
        >
          {editing ? "Cancel" : "Edit profile"}
        </button>
      </div>
      {editing ? (
        <form onSubmit={submit} className="flow-card space-y-4">
          <Field label="Name">
            <input
              className="flow-input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
            />
          </Field>
          <Field label="Email">
            <input
              className="flow-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Mobile number (optional)">
            <input
              className="flow-input"
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              maxLength={25}
            />
          </Field>
          <Field label="Learning language">
            <select
              className="flow-input"
              value={lang}
              onChange={(e) => {
                setLang(e.target.value);
                setLevel(
                  e.target.value === "ja"
                    ? user.japaneseLevel
                    : user.englishLevel,
                );
              }}
            >
              <option value="ja">Japanese</option>
              <option value="en">English</option>
            </select>
          </Field>
          <Field label="Current level">
            <LevelPicker language={lang} level={level} onChange={setLevel} />
          </Field>
          <button className="flow-primary w-full" type="submit">
            Save changes
          </button>
        </form>
      ) : (
        <div className="flow-card space-y-4">
          {[
            ["Name", user.name || "Not added"],
            ["Email", user.email || "Not added"],
            ["Mobile", user.mobile || "Not added"],
            [
              "Learning language",
              profile.targetLanguage === "ja" ? "Japanese" : "English",
            ],
            [
              "Current level",
              profile.targetLanguage === "ja"
                ? user.japaneseLevel
                : user.englishLevel,
            ],
          ].map(([l, v]) => (
            <div
              key={l}
              className="flex justify-between gap-3 border-b border-ink/5 pb-3 last:border-0 last:pb-0"
            >
              <span className="text-xs text-ink-soft">{l}</span>
              <span className="break-all text-right text-sm font-bold">
                {v}
              </span>
            </div>
          ))}
        </div>
      )}
      {message && (
        <p role="status" className="mt-3 text-sm font-bold text-sakura">
          {message}
        </p>
      )}
      <div className="mt-5 grid gap-2">
        <Button href="/change-password" variant="secondary">
          Change password →
        </Button>
        <Button href="/settings" variant="secondary">
          Settings →
        </Button>
      </div>
      <p className="mt-5 text-center text-xs text-ink-soft">
        Profile changes are local to this frontend preview.
      </p>
    </PageShell>
  );
}
export function ChangePassword() {
  const [done, setDone] = useState(false),
    [pass, setPass] = useState(""),
    [confirm, setConfirm] = useState(""),
    [error, setError] = useState("");
  return (
    <PageShell>
      <FlowHeader
        back="/profile"
        title="Change password"
        description="A preview of your account’s password settings."
      />
      {done ? (
        <div className="flow-card">
          <p className="font-display text-lg font-extrabold">
            That’s how it will look.
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            The confirmation screen is ready. This UI preview has not changed or
            stored a password.
          </p>
          <Button href="/profile" className="mt-4">
            Back to profile
          </Button>
        </div>
      ) : (
        <form
          className="flow-card space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (pass !== confirm) {
              setError("Your new passwords don’t match. Please try again.");
              return;
            }
            setPass("");
            setConfirm("");
            setDone(true);
          }}
        >
          <Field label="Current password">
            <input
              className="flow-input"
              type="password"
              required
              autoComplete="current-password"
            />
          </Field>
          <Field label="New password">
            <input
              className="flow-input"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </Field>
          <Field label="Confirm new password">
            <input
              className="flow-input"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
          {error && (
            <p role="alert" className="text-sm text-q-wrong">
              {error}
            </p>
          )}
          <button className="flow-primary w-full" type="submit">
            Update password
          </button>
          <p className="text-xs text-ink-soft">
            Frontend preview. No real password will be changed.
          </p>
        </form>
      )}
    </PageShell>
  );
}
