"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGame, useHydrated } from "@/store/game";
import { usePreview } from "@/store/preview";
import { cx } from "../ui";
import { Brand, Field, LevelPicker, setLearningLevel } from "./shared";
const Input = "flow-input";

export function Welcome() {
  return (
    <div className="paper-bg min-h-dvh">
      <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-8 pt-6 sm:pt-8">
        {/* Brand */}
        <Brand />

        {/* Hero illustration */}
        <div className="mt-4 mb-4 overflow-hidden rounded-[28px] bg-paper-2">
          <img
            src="/images/covers/onboarding-hero.webp"
            alt="A cheerful reading mascot surrounded by books and plants, with a city view through an arched window"
            className="block h-auto w-full"
            fetchPriority="high"
          />
        </div>

        <div className="text-center">
        <p className="flow-eyebrow">
          SMALL STEPS. BIG CONVERSATIONS.
        </p>

        <h1 className=" mb-1 mt-1 font-display text-[32px] font-extrabold leading-tight">
          Real conversations
          <br />
          to a bigger you.
        </h1>

        <p className="mb-4 mt-3 text-[15px] leading-relaxed text-ink-soft">
          Meet the characters. Make a choice. Learn real language in the little
          moments that matter.
        </p>
      </div>
        {/* Actions */}
        <Link
          className="flow-primary text-center"
          href="/auth?mode=signup"
        >
          Start your story →
        </Link>

        <Link
          className="flow-secondary mt-3 text-center"
          href="/auth"
        >
          I already have an account
        </Link>

        <Link
  className="mt-2 py-3 text-center text-sm font-bold flow-eyebrow underline"
  href="/setup"
>
  Take a look around first
</Link>

        {/* Footer */}
        <p className="mt-auto pt-4 text-center text-[11px] leading-relaxed text-ink-soft">
          🌐 English through English · Japanese with English support
        </p>
      </main>
    </div>
  );
}



export function Auth() {
  const router = useRouter();
  const hydrated = useHydrated();
  const update = usePreview((s) => s.update);

  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [sent, setSent] = useState(false);
  const [googleNotice, setGoogleNotice] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "signup") {
      setMode("signup");
    }
  }, []);

  function changeMode(next: "signin" | "signup" | "reset") {
    setMode(next);
    setSent(false);
    setShow(false);
    setGoogleNotice(false);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (mode === "reset") {
      setSent(true);
      setPassword("");
      return;
    }

    update({ signedIn: true, email, ...(name ? { name } : {}) });
    setPassword("");

    if (mode === "signin") {
      useGame.getState().setProfile({ onboarded: true });
    }

    router.push(mode === "signin" ? "/" : "/setup");
  }

  return (
    <div className="paper-bg min-h-dvh">
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-6 pt-4 sm:px-7 sm:pt-7">
        {/* Back arrow */}
        <div className="mb-4">
          <Link
            href="/onboarding"
            aria-label="Back to onboarding"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sakura"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
          </Link>
        </div>

        {/* Centered heading */}
        <section className="mb-6 text-center">
          <h1 className="font-display text-[30px] font-extrabold leading-tight tracking-tight text-ink sm:text-[32px]">
            {mode === "reset"
              ? "Let’s get you back in."
              : mode === "signup"
                ? "A good place to begin."
                : "Welcome back."}
          </h1>

          <p className="mx-auto mt-3 max-w-xs text-[15px] leading-6 text-ink-soft">
            {mode === "signup"
              ? "A few words today. A little more confidence tomorrow."
              : mode === "reset"
                ? "Enter your email to preview password recovery."
                : "Your characters and unfinished adventures are waiting."}
          </p>
        </section>

        {/* Mode selector */}
        {mode !== "reset" && (
          <div
            className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-ink/5 p-1"
            role="group"
            aria-label="Authentication mode"
          >
            {(["signin", "signup"] as const).map((m) => (
              <button
                type="button"
                key={m}
                aria-pressed={mode === m}
                onClick={() => changeMode(m)}
                className={cx(
                  "min-h-11 rounded-xl px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sakura",
                  mode === m
                    ? "bg-white text-ink shadow-sm"
                    : "text-ink-soft hover:text-ink",
                )}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={submit}
          className="flow-card space-y-4 p-4 sm:p-5"
        >
          {mode === "signup" && (
            <Field label="Your name">
              <input
                autoComplete="name"
                required
                maxLength={60}
                className={Input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What should we call you?"
              />
            </Field>
          )}

          <Field label="Email address">
            <input
              type="email"
              autoComplete="email"
              required
              className={Input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </Field>

          {mode !== "reset" && (
            <Field label="Password">
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  required
                  minLength={mode === "signup" ? 8 : undefined}
                  className={`${Input} pr-12`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    mode === "signup"
                      ? "At least 8 characters"
                      : "Enter your password"
                  }
                />

                <button
                  type="button"
                  aria-label={show ? "Hide password" : "Show password"}
                  aria-pressed={show}
                  onClick={() => setShow((value) => !value)}
                  className="absolute inset-y-0 right-2 my-auto flex h-10 w-10 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sakura"
                >
                  {show ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.2 9.5 7-.4 1.1-1.2 2.4-2.4 3.5" />
                      <path d="M6.2 6.2C3.8 7.7 2.5 10 2.5 12c1 2.8 4.5 7 9.5 7 1 0 2-.2 2.9-.5" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </Field>
          )}

          {mode === "signin" && (
            <div className="-mt-1 flex justify-end">
              <button
                type="button"
                className="py-1 text-sm font-bold text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sakura"
                onClick={() => changeMode("reset")}
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            disabled={!hydrated}
            className="flow-primary min-h-12 w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
          >
            {mode === "reset"
              ? "Preview recovery link"
              : mode === "signup"
                ? "Create account →"
                : "Sign in →"}
          </button>

          {/* Google sign-in */}
          {mode !== "reset" && (
            <>
              <div className="flex items-center gap-3 py-1">
                <span className="h-px flex-1 bg-ink/10" />
                <span className="text-xs text-ink-soft">or continue with</span>
                <span className="h-px flex-1 bg-ink/10" />
              </div>

              <button
                type="button"
                onClick={() => setGoogleNotice(true)}
                className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-ink/15 bg-white px-4 text-sm font-bold text-ink transition-colors hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sakura"
              >
                <svg
                  viewBox="0 0 48 48"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path
                    fill="#4285F4"
                    d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M12.6 27.7a12 12 0 0 1 0-7.4V15H5.8a20 20 0 0 0 0 17.9l6.8-5.2Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M24 12.1c3 0 5.7 1 7.8 3.1l5.8-5.8A19.4 19.4 0 0 0 24 4 20 20 0 0 0 5.8 15l6.8 5.3c1.6-4.8 6.1-8.2 11.4-8.2Z"
                  />
                </svg>
                Continue with Google
              </button>

              {googleNotice && (
                <p
                  role="status"
                  className="rounded-xl bg-ink/5 p-3 text-center text-xs leading-relaxed text-ink-soft"
                >
                  Google sign-in is not connected yet. Connect your OAuth
                  provider to enable it.
                </p>
              )}
            </>
          )}

          {sent && (
            <div
              role="status"
              className="rounded-xl bg-sakura-soft p-3 text-sm leading-relaxed text-ink"
            >
              Recovery preview ready for {email || "your email"}. No email has
              been sent.
            </div>
          )}

          <p className="text-center text-xs leading-5 text-ink-soft">
            Frontend preview only. No account is created, no password is
            stored, and no email is sent.
          </p>
        </form>

        <div className="flex-1" aria-hidden="true" />

        <p className="pt-5 text-center text-xs leading-5 text-ink-soft">
          Small steps. Big conversations.
        </p>

        {mode === "reset" && (
          <button
            type="button"
            className="mt-3 min-h-11 w-full text-sm font-bold text-ink-soft hover:text-ink"
            onClick={() => changeMode("signin")}
          >
            Return to sign in
          </button>
        )}
      </main>
    </div>
  );
}



export function Setup() {
  const router = useRouter(),
    profile = useGame((s) => s.profile);
  const setProfile = useGame((s) => s.setProfile);
  const name = usePreview((s) => s.name);
  const [step, setStep] = useState(0),
    [language, setLanguage] = useState(profile.targetLanguage),
    [level, setLevel] = useState(
      language === "en"
        ? usePreview.getState().englishLevel
        : usePreview.getState().japaneseLevel,
    );
  function finish() {
    setLearningLevel(language, level);
    setProfile({ onboarded: true, targetLanguage: language });
    router.push("/");
  }
  return (
    <div className="paper-bg min-h-dvh">
      <main className="mx-auto max-w-md px-5 py-8">
        <Brand />
        <div
          className="mb-7 mt-7 flex gap-1.5"
          aria-label={`Setup step ${step + 1} of 3`}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cx(
                "h-1.5 flex-1 rounded-full",
                i <= step ? "bg-sakura" : "bg-ink/10",
              )}
            />
          ))}
        </div>
        <p className="flow-eyebrow">
          {["MAKE IT YOURS", "FIND YOUR STARTING POINT", "YOU’RE READY"][step]}
        </p>
        <h1 className="mb-2 mt-2 font-display text-[27px] font-extrabold leading-tight">
          {
            [
              "Which language takes you somewhere?",
              "Where are you starting from?",
              `${name ? name + ", your" : "Your"} story starts here.`,
            ][step]
          }
        </h1>
        <p className="mb-5 text-sm leading-relaxed text-ink-soft">
          {
            [
              "You’ll be the main character. What you say changes what happens next.",
              "No test. Just a starting point you can change whenever you like.",
              "A little conversation, a few choices, and something new to take into your day.",
            ][step]
          }
        </p>
        {step === 0 && (
          <div className="grid gap-3">
            {[
              {
                code: "ja",
                name: "Japanese",
                native: "日本語",
                image: "first-week.svg",
                desc: "First Week in Tokyo · English support",
              },
              {
                code: "en",
                name: "English",
                native: "",
                image: "new-in-london.svg",
                desc: "New in London · Learn through English",
              },
            ].map((l) => (
              <button
                type="button"
                aria-pressed={language === l.code}
                key={l.code}
                onClick={() => {
                  setLanguage(l.code);
                  setLevel(
                    l.code === "en"
                      ? usePreview.getState().englishLevel
                      : usePreview.getState().japaneseLevel,
                  );
                }}
                className={cx(
                  "flex gap-4 rounded-2xl bg-white p-3 text-left ring-2",
                  language === l.code ? "ring-sakura" : "ring-ink/5",
                )}
              >
                <img
                  src={"/images/covers/" + l.image}
                  alt=""
                  className="h-20 w-16 rounded-xl object-cover"
                />
                <span className="flex-1 self-center">
                  <span className="block font-display text-lg font-extrabold">
                    {l.name}{" "}
                    <span className="text-sm text-ink-soft">{l.native}</span>
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-ink-soft">
                    {l.desc}
                  </span>
                </span>
                <span className="self-center text-lg text-sakura">
                  {language === l.code ? "●" : "○"}
                </span>
              </button>
            ))}
          </div>
        )}
        {step === 1 && (
          <LevelPicker language={language} level={level} onChange={setLevel} />
        )}{" "}
        {step === 2 && (
          <div className="flow-card">
            <img
              src={
                "/images/covers/" +
                (language === "ja" ? "first-week.svg" : "new-in-london.svg")
              }
              alt=""
              className="mb-4 h-40 w-full rounded-2xl object-cover"
            />
            <p className="font-display text-xl font-extrabold">
              {language === "ja" ? "First Week in Tokyo" : "New in London"}
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              {language === "ja"
                ? "Japanese with English support"
                : "English through English"}{" "}
              · {level}
            </p>
            <div className="my-4 h-px bg-ink/10" />
            <p className="text-sm leading-relaxed text-ink-soft">
              Read, listen and choose what happens next. Save the words you want
              to keep. Speak when you feel ready.
            </p>
            <p className="mt-3 text-xs text-ink-soft">
              Available episodes use the MVP’s original difficulty. Your
              selected level is a preference, not a proficiency assessment.
            </p>
          </div>
        )}
        <div className="mt-7 flex gap-3">
          {step > 0 && (
            <button
              className="flow-secondary"
              onClick={() => setStep(step - 1)}
            >
              Back
            </button>
          )}
          <button
            className="flow-primary flex-1"
            onClick={() => (step < 2 ? setStep(step + 1) : finish())}
          >
            {step === 2 ? "Let’s begin →" : "Continue →"}
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-ink-soft">
          Small steps. Big conversations.
        </p>
      </main>
    </div>
  );
}
