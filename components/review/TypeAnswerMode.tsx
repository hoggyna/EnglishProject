"use client";

import { useEffect, useRef, useState } from "react";
import { checkAnswer } from "@/lib/fuzzy";
import { useReviewSession } from "@/lib/useReviewSession";
import {
  EmptyQueue,
  SessionProgress,
  SessionSummary,
} from "./SessionShell";

export default function TypeAnswerMode() {
  const session = useReviewSession("type");
  const [input, setInput] = useState("");
  const [result, setResult] = useState<null | { correct: boolean }>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const w = session.current;

  useEffect(() => {
    setInput("");
    setResult(null);
    inputRef.current?.focus();
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
  if (!w) return null;

  const submit = () => {
    if (result !== null || !input.trim()) return;
    setResult({ correct: checkAnswer(input, w.meaning) });
  };

  const next = () => {
    if (result === null) return;
    void session.answer(result.correct);
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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (result === null) submit();
          else next();
        }}
        className="mt-4 space-y-3"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="พิมพ์ความหมายภาษาไทย…"
          disabled={result !== null}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800"
        />

        {result === null ? (
          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 py-3 font-medium text-white hover:bg-indigo-700"
          >
            ตรวจคำตอบ
          </button>
        ) : (
          <div
            className={`rounded-xl border p-4 ${
              result.correct
                ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950"
                : "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950"
            }`}
          >
            <div className="font-semibold">
              {result.correct ? "✓ ถูกต้อง!" : "✗ ยังไม่ถูก"}
            </div>
            <div className="mt-1 text-sm">
              เฉลย: <b>{w.meaning}</b>
            </div>
            <button
              type="submit"
              autoFocus
              className="mt-3 w-full rounded-lg bg-slate-800 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900"
            >
              คำต่อไป → (Enter)
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
