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
      <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-8 pt-8">
        <Brand />
        <div className="relative my-7 h-60 overflow-hidden rounded-[28px] bg-paper-2">
          <img
            src="/images/covers/first-week.svg"
            alt="The original First Week in Tokyo story illustration"
            className="absolute left-0 top-0 h-full w-[62%] object-cover"
          />
          <img
            src="/images/covers/new-in-london.svg"
            alt="The original New in London story illustration"
            className="absolute right-0 top-0 h-full w-[45%] border-l-4 border-paper object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 to-transparent px-5 pb-4 pt-14 text-white">
            <p className="font-display text-lg font-extrabold">
              Two cities. Countless little stories.
            </p>
          </div>
        </div>
        <p className="flow-eyebrow">SMALL STEPS. BIG CONVERSATIONS.</p>
        <h1 className="mt-2 font-display text-[32px] font-extrabold leading-tight">
          Your words
          <br />
          change the story.
        </h1>
        <p className="mb-7 mt-3 text-[15px] leading-relaxed text-ink-soft">
          Meet the characters. Make a choice. Learn real language in the little
          moments that matter.
        </p>
        <Link className="flow-primary text-center" href="/auth?mode=signup">
          Start your story →
        </Link>
        <Link className="flow-secondary mt-3 text-center" href="/auth">
          I already have an account
        </Link>
        <Link
          className="mt-4 py-3 text-center text-sm font-bold text-ink-soft"
          href="/setup"
        >
          Take a look around first
        </Link>
        <p className="mt-auto pt-5 text-center text-[11px] text-ink-soft">
          English through English · Japanese with English support
        </p>
      </main>
    </div>
  );
}
export function Auth() {
  const router = useRouter();
  const hydrated = useHydrated();
  const update = usePreview((s) => s.update);
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin"),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [sent, setSent] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "signup")
      setMode("signup");
  }, []);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "reset") {
      setSent(true);
      setPassword("");
      return;
    }
    update({ signedIn: true, email, ...(name ? { name } : {}) });
    setPassword("");
    if (mode === "signin") useGame.getState().setProfile({ onboarded: true });
    router.push(mode === "signin" ? "/" : "/setup");
  }
  return (
    <div className="paper-bg min-h-dvh">
      <main className="mx-auto max-w-md px-5 py-8">
        <Brand />
        <Link
          href="/onboarding"
          className="my-5 inline-flex min-h-11 items-center text-sm font-bold text-ink-soft"
        >
          ← Back to the story
        </Link>
        <p className="flow-eyebrow">YOUR NEXT CHAPTER</p>
        <h1 className="mt-2 font-display text-[30px] font-extrabold">
          {mode === "reset"
            ? "Let’s get you back in."
            : mode === "signup"
              ? "A good place to begin."
              : "Welcome back."}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {mode === "signup"
            ? "A few words today. A little more confidence tomorrow."
            : mode === "reset"
              ? "Enter your email to preview password recovery."
              : "Your characters and unfinished adventures are waiting."}
        </p>
        {mode !== "reset" && (
          <div className="my-6 flex rounded-2xl bg-ink/5 p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => {
                  setMode(m);
                  setSent(false);
                }}
                className={cx(
                  "min-h-11 flex-1 rounded-xl font-display text-sm font-extrabold",
                  mode === m ? "bg-white text-ink shadow-sm" : "text-ink-soft",
                )}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={submit} className="flow-card mt-5 space-y-4">
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
                  minLength={8}
                  className={Input + " pr-16"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-3 text-xs font-bold text-sakura"
                  onClick={() => setShow(!show)}
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>
            </Field>
          )}
          {mode === "signin" && (
            <button
              type="button"
              className="block w-full text-right text-xs font-bold text-sakura"
              onClick={() => setMode("reset")}
            >
              Forgot password?
            </button>
          )}
          <button
            disabled={!hydrated}
            className="flow-primary w-full"
            type="submit"
          >
            {mode === "reset"
              ? "Preview recovery link"
              : mode === "signup"
                ? "Create account →"
                : "Sign in →"}
          </button>
          {sent && (
            <div
              role="status"
              className="rounded-xl bg-sakura-soft p-3 text-sm"
            >
              Recovery preview ready for {email}. No email has been sent.
            </div>
          )}
          <p className="text-center text-[11px] leading-relaxed text-ink-soft">
            Frontend preview only. No account is created, no password is stored,
            and no email is sent.
          </p>
        </form>
        {mode === "reset" && (
          <button
            className="mt-4 w-full py-3 text-sm font-bold text-sakura"
            onClick={() => {
              setMode("signin");
              setSent(false);
            }}
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
