"use client";

import { useEffect, useState } from "react";
import { getQuizChoices } from "@/app/actions";
import { useReviewSession } from "@/lib/useReviewSession";
import {
  EmptyQueue,
  SessionProgress,
  SessionSummary,
} from "./SessionShell";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuizMode() {
  const session = useReviewSession("quiz");
  const [choices, setChoices] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const w = session.current;

  useEffect(() => {
    setChoices(null);
    setSelected(null);
    if (!w) return;
    getQuizChoices(w.id, session.ranges, 3).then((distractors) => {
      setChoices(shuffle([w.meaning, ...distractors]));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w?.id]);

  if (session.queue === null) {
    return <p className="py-10 text-center text-slate-400">กำลังโหลด…</p>;
  }
  if (session.queue.length === 0) return <EmptyQueue />;
  if (session.finished) {
    return (
      <SessionSummary results={session.results} onRestart={session.restart} />
    );
  }
  if (!w || choices === null) {
    return <p className="py-10 text-center text-slate-400">กำลังโหลด…</p>;
  }

  const pick = (choice: string) => {
    if (selected !== null) return;
    setSelected(choice);
    const correct = choice === w.meaning;
    setTimeout(() => void session.answer(correct), 900);
  };

  return (
    <div className="mx-auto max-w-lg">
      <SessionProgress index={session.index} total={session.queue.length} />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
        <span className="text-xs text-slate-400">#{w.order_index}</span>
        <div className="mt-1 text-3xl font-bold">{w.word}</div>
        {w.part_of_speech && (
          <div className="mt-1 text-slate-400">({w.part_of_speech})</div>
        )}
      </div>

      <div className="mt-4 grid gap-2">
        {choices.map((c, i) => {
          let style =
            "border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800";
          if (selected !== null) {
            if (c === w.meaning) {
              style = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950";
            } else if (c === selected) {
              style = "border-red-500 bg-red-50 dark:bg-red-950";
            } else {
              style = "border-slate-200 opacity-50 dark:border-slate-800";
            }
          }
          return (
            <button
              key={i}
              onClick={() => pick(c)}
              disabled={selected !== null}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${style}`}
            >
              {c}
            </button>
          );
        })}
      </div>

      {choices.length < 2 && (
        <p className="mt-3 text-center text-xs text-amber-500">
          คำใน range น้อยเกินไปสำหรับสร้างตัวเลือก — ลองขยาย range
        </p>
      )}
    </div>
  );
}
