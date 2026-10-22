
"use client";

import { useEffect, useState } from "react";
import { useGame, useHydrated } from "@/store/game";
import { usePreview } from "@/store/preview";
import { PageShell, Button } from "../ui";
import {
  Field,
  FlowHeader,
  LevelPicker,
  setLearningLevel,
} from "./shared";

const AVATARS = [
  { id: "hani",  seed: "Hani" },
  { id: "mika",  seed: "Mika" },
  { id: "yuki",  seed: "Yuki" },
  { id: "rin",  seed: "Rin" },
  { id: "kai",  seed: "Kai" },
  { id: "haru",  seed: "Haru" },
  { id: "aoi",  seed: "Aoi" },
  { id: "sora",  seed: "Sora" },
  { id: "ren",  seed: "Ren" },
  { id: "mei",  seed: "Mei" },
  { id: "akari",  seed: "Akari" },
  { id: "noa",  seed: "Noa" },
];

function avatarUrl(seed: string) {
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;
}

export function Profile() {
  const ready = useHydrated();
  const user = usePreview();

  const profile = useGame((s) => s.profile);
  const progress = useGame((s) => s.progress);
  const xp = useGame((s) => s.xp);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [lang, setLang] = useState("ja");
  const [level, setLevel] = useState("N5");
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [avatar, setAvatar] = useState("hani");
  const [showAvatars, setShowAvatars] = useState(false);

  useEffect(() => {
    if (!ready) return;

    const preview = usePreview.getState();

    setName(preview.name);
    setEmail(preview.email);
    setMobile(preview.mobile);
    setLang(profile.targetLanguage);

    setLevel(
      profile.targetLanguage === "en"
        ? preview.englishLevel
        : preview.japaneseLevel,
    );

    const savedAvatar = localStorage.getItem(
      "yap-learn-profile-avatar",
    );

    if (savedAvatar && AVATARS.some((item) => item.id === savedAvatar)) {
      setAvatar(savedAvatar);
    }
  }, [ready, profile.targetLanguage]);

  function selectAvatar(selected: string) {
    setAvatar(selected);

    localStorage.setItem("yap-learn-profile-avatar", selected);

    // Close the popup as soon as an avatar is selected.
    setShowAvatars(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();

    user.update({ name, email, mobile });
    setLearningLevel(lang, level);

    setEditing(false);
    setMessage("Your profile is saved on this device.");
  }

  const completedEpisodes = Object.values(progress).filter(
    (p) => p.endings.length > 0,
  ).length;

  const endingsEarned = Object.values(progress).reduce(
    (total, p) => total + p.endings.length,
    0,
  );

  const currentLanguage =
    profile.targetLanguage === "ja" ? "Japanese" : "English";

  const currentLevel =
    profile.targetLanguage === "ja"
      ? user.japaneseLevel
      : user.englishLevel;

  const selectedAvatar =
    AVATARS.find((item) => item.id === avatar) ?? AVATARS[0];

  return (
    <PageShell>
      <FlowHeader
        back="/"
        eyebrow="YOUR LITTLE CORNER"
        title="Your profile"
        description="A few details that make this story yours."
      />

      {/* Matcha-green profile card */}
      <section className="mb-5 rounded-3xl bg-[#35765D] p-4 text-white shadow-[0_3px_0_rgba(43,35,64,0.07)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAvatars(true)}
            aria-label="Choose your profile avatar"
            aria-haspopup="dialog"
            aria-expanded={showAvatars}
            className="group relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full border-2 border-white/80 bg-[#E3EEE7] transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <img
              src={avatarUrl(selectedAvatar.seed)}
              alt={`${selectedAvatar.name} avatar`}
              className="h-full w-full object-cover"
            />

            <span className="absolute inset-x-0 bottom-0 bg-black/45 py-1 text-center text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
              Change
            </span>
          </button>

          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-lg font-extrabold">
              {user.name || "A curious storyteller"}
            </h2>

            <p className="mt-1 text-xs text-white/85">
              {currentLanguage} · {currentLevel}
            </p>

            <p className="mt-1 truncate text-xs text-white/85">
              {user.email || "Exploring as a guest"}
            </p>
          </div>
        </div>
      </section>

      {/* Avatar picker modal with blurred background */}
      {showAvatars && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#211C2B]/45 px-5 py-6 backdrop-blur-sm"
          onClick={() => setShowAvatars(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="avatar-picker-title"
            className="max-h-[85dvh] w-full max-w-sm overflow-y-auto rounded-3xl bg-[#FFF7EC] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2
                  id="avatar-picker-title"
                  className="font-display text-xl font-extrabold text-ink"
                >
                  Choose your avatar
                </h2>

                <p className="mt-1 text-sm text-ink-soft">
                  Pick a character that feels like you.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAvatars(false)}
                aria-label="Close avatar selection"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-xl text-ink-soft hover:bg-[#E3EEE7]"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {AVATARS.map((option) => {
                const isSelected = avatar === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => selectAvatar(option.id)}
                    aria-label={`Choose ${option.name} avatar`}
                    aria-pressed={isSelected}
                    className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-2 transition-all hover:-translate-y-0.5 ${
                      isSelected
                        ? "border-[#35765D] bg-[#E3EEE7]"
                        : "border-transparent bg-white hover:border-[#B8D4C3]"
                    }`}
                  >
                    <span className="relative block h-[76px] w-[76px] overflow-hidden rounded-full bg-[#E3EEE7]">
                      <img
                        src={avatarUrl(option.seed)}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />

                      {isSelected && (
                        <span className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-[#35765D] text-xs font-bold text-white">
                          ✓
                        </span>
                      )}
                    </span>

                    <span className="text-xs font-semibold text-ink">
                      {option.name}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-center text-xs text-ink-soft">
              Tap a character to select it.
            </p>
          </section>
        </div>
      )}

      {/* Learning progress */}
      <section
        aria-label="Your learning progress"
        className="mb-7 grid grid-cols-3 gap-2"
      >
        {[
          { emoji: "✨", value: xp, label: "XP earned" },
          {
            emoji: "📖",
            value: completedEpisodes,
            label: "Episodes",
          },
          {
            emoji: "🌟",
            value: endingsEarned,
            label: "Endings",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl bg-white px-2 py-3 text-center shadow-[0_2px_0_rgba(43,35,64,0.06)]"
          >
            <span className="text-lg" aria-hidden="true">
              {stat.emoji}
            </span>

            <p className="mt-1 font-display text-xl font-extrabold text-ink">
              {stat.value}
            </p>

            <p className="mt-0.5 text-[11px] text-ink-soft">
              {stat.label}
            </p>
          </div>
        ))}
      </section>

      {/* Personal details */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flow-section-title !mb-0">
          Personal details
        </h2>

        <button
          type="button"
          onClick={() => {
            setEditing((value) => !value);
            setMessage("");
          }}
          className="min-h-11 text-sm font-bold text-[#21645C]"
        >
          {editing ? "Cancel" : "Edit details"}
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
                const nextLang = e.target.value;

                setLang(nextLang);
                setLevel(
                  nextLang === "ja"
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
            <LevelPicker
              language={lang}
              level={level}
              onChange={setLevel}
            />
          </Field>

          <button className="flow-primary w-full" type="submit">
            Save changes
          </button>
        </form>
      ) : (
        <div className="flow-card !py-1">
          {[
            ["Name", user.name || "Not added"],
            ["Email", user.email || "Not added"],
            ["Mobile", user.mobile || "Not added"],
            ["Learning language", currentLanguage],
            ["Current level", currentLevel],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4 border-b border-ink/5 py-3 last:border-0"
            >
              <span className="text-sm text-ink-soft">
                {label}
              </span>

              <span className="break-all text-right text-sm font-semibold text-ink">
                {value}
              </span>
            </div>
          ))}
        </div>
      )}

      {message && (
        <p
          role="status"
          className="mt-3 text-sm font-semibold text-[#21645C]"
        >
          {message}
        </p>
      )}

      {/* Account links */}
      <section className="mt-6">
        <h2 className="flow-section-title">Account</h2>

        <div className="flow-card !py-1">
          {[
            {
              label: "Change password",
              href: "/change-password",
              emoji: "🔒",
            },
            {
              label: "Settings",
              href: "/settings",
              emoji: "⚙️",
            },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex min-h-12 items-center gap-3 border-b border-ink/5 py-3 last:border-0"
            >
              <span aria-hidden="true" className="text-lg">
                {item.emoji}
              </span>

              <span className="flex-1 text-sm font-semibold text-ink">
                {item.label}
              </span>

              <span aria-hidden="true" className="text-lg text-ink-soft">
                →
              </span>
            </a>
          ))}
        </div>
      </section>

      <p className="mt-5 text-center text-xs text-ink-soft">
        Your profile is saved in this frontend preview.
      </p>
    </PageShell>
  );
}

export function ChangePassword() {
  const [done, setDone] = useState(false);
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

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
            The confirmation screen is ready. This UI preview has not changed
            or stored a password.
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
              setError(
                "Your new passwords don’t match. Please try again.",
              );
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
