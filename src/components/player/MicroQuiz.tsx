"use client";

import { useMemo, useState } from "react";
import type { Review } from "@/content/schema";
import { XP } from "@/lib/scoring";
import { useGame } from "@/store/game";
import { useSfx } from "../audio";
import { useLang } from "../lang";
import { cx } from "../ui";
import { seededOrder } from "./stage";

/** 3-question micro-review shown after an episode ending. Results are stored locally. */
export function MicroQuiz({ quiz, quizKey }: { quiz: Review["quiz"]; quizKey: string }) {
  const record = useGame((s) => s.quiz[quizKey]);
  const recordQuiz = useGame((s) => s.recordQuiz);
  const addXp = useGame((s) => s.addXp);
  const sfx = useSfx();
  const { meta } = useLang();
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [round, setRound] = useState(0);

  const questions = quiz.slice(0, 3);
  const q = questions[idx];
  // Shuffle options so the answer isn't always first (stable within a round).
  const order = useMemo(
    () => (q ? seededOrder(q.options.map((_, i) => i), `${quizKey}:${idx}:${round}`) : []),
    [q, quizKey, idx, round],
  );

  const choose = (optionIndex: number) => {
    if (picked !== null) return;
    setPicked(optionIndex);
    const correct = optionIndex === q.answer;
    if (correct) setScore((s) => s + 1);
    sfx(correct ? "natural" : "oops");
  };

  const next = () => {
    if (idx + 1 < questions.length) {
      setIdx(idx + 1);
      setPicked(null);
      return;
    }
    const final = score;
    // XP only for the first completed attempt.
    if (!record) addXp(final * XP.quizCorrect);
    recordQuiz(quizKey, final, questions.length);
    setDone(true);
    sfx("unlock");
  };

  const restart = () => {
    setIdx(0);
    setPicked(null);
    setScore(0);
    setDone(false);
    setStarted(true);
    setRound((r) => r + 1);
  };

  if (!started) {
    return (
      <div className="rounded-3xl bg-ink p-4 text-white">
        <div className="font-display text-lg font-extrabold">🧠 Quick review</div>
        <p className="mt-1 text-sm text-white/80">Three short questions about this episode. About 30 seconds.</p>
        {record && (
          <p className="mt-1 text-xs font-bold text-butter">
            Best so far: {record.best}/{record.total}
          </p>
        )}
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="mt-3 w-full rounded-2xl bg-butter px-4 py-3 font-display font-extrabold text-ink shadow-[0_4px_0_#d9a93a] active:translate-y-0.5"
        >
          Start the 3-question review
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-3xl bg-ink p-5 text-center text-white">
        <div className="text-3xl">{score === questions.length ? meta.celebrate : score > 0 ? "👍" : "🌱"}</div>
        <div className="mt-1 font-display text-2xl font-extrabold">
          {score}/{questions.length}
        </div>
        <p className="text-sm text-white/80">
          {score === questions.length ? "All correct. Nicely done!" : "Every review makes the next playthrough easier."}
        </p>
        {!record || record.attempts <= 1 ? (
          score > 0 && <p className="mt-1 text-xs font-bold text-butter">+{score * XP.quizCorrect} XP</p>
        ) : null}
        <button type="button" onClick={restart} className="mt-3 rounded-full bg-white/15 px-4 py-2 font-display text-sm font-extrabold">
          ↺ Try again
        </button>
      </div>
    );
  }

  const correct = picked !== null && picked === q.answer;
  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-ink/5">
      <div className="flex items-center justify-between text-xs font-bold text-ink-soft">
        <span>
          Question {idx + 1} of {questions.length}
        </span>
        <span className="flex gap-1">
          {questions.map((_, i) => (
            <span key={i} className={cx("h-1.5 w-6 rounded-full", i < idx ? "bg-sakura" : i === idx ? "bg-sakura/50" : "bg-ink/10")} />
          ))}
        </span>
      </div>
      <p className="mt-2 font-display text-[16px] font-extrabold leading-snug">{q.question}</p>
      <div className="mt-3 grid gap-2">
        {order.map((oi) => {
          const isAnswer = oi === q.answer;
          const isPicked = oi === picked;
          return (
            <button
              key={oi}
              type="button"
              onClick={() => choose(oi)}
              disabled={picked !== null}
              className={cx(
                "rounded-2xl border-2 px-3 py-2.5 text-left font-display text-[15px] font-bold transition",
                picked === null && "border-ink/10 bg-paper hover:border-sakura",
                picked !== null && isAnswer && "border-q-natural bg-[#e3f7eb]",
                picked !== null && isPicked && !isAnswer && "border-q-wrong bg-[#ffe5ea]",
                picked !== null && !isAnswer && !isPicked && "border-transparent bg-paper opacity-60",
              )}
            >
              {q.options[oi]}
              {picked !== null && isAnswer && " ✓"}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="mt-3 animate-fade">
          <p className={cx("text-sm font-bold", correct ? "text-q-natural" : "text-q-wrong")}>{correct ? "Correct!" : "Not quite."}</p>
          <p className="text-sm text-ink">{q.explanation}</p>
          <button
            type="button"
            onClick={next}
            className="mt-3 w-full rounded-2xl bg-sakura px-4 py-2.5 font-display font-extrabold text-white shadow-[0_4px_0_#154940]"
          >
            {idx + 1 < questions.length ? "Next question →" : "See results"}
          </button>
        </div>
      )}
    </div>
  );
}
