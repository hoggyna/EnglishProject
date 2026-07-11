"use client";

import { useState } from "react";
import { useReviewSession } from "@/lib/useReviewSession";
import {
  EmptyQueue,
  SessionProgress,
  SessionSummary,
} from "./SessionShell";

export default function FlashcardMode() {
  const session = useReviewSession("flashcard");
  const [flipped, setFlipped] = useState(false);

  if (session.queue === null) {
    return <p className="py-10 text-center text-slate-400">กำลังโหลด…</p>;
  }
  if (session.queue.length === 0) return <EmptyQueue />;
  if (session.finished) {
    return (
      <SessionSummary results={session.results} onRestart={session.restart} />
    );
  }

  const w = session.current!;

  const mark = (correct: boolean) => {
    setFlipped(false);
    void session.answer(correct);
  };

  return (
    <div className="mx-auto max-w-lg">
      <SessionProgress index={session.index} total={session.queue.length} />

      <div
        onClick={() => setFlipped((f) => !f)}
        className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
      >
        {!flipped ? (
          <>
            <span className="text-xs text-slate-400">#{w.order_index}</span>
            <span className="mt-2 text-3xl font-bold">{w.word}</span>
            {w.part_of_speech && (
              <span className="mt-1 text-slate-400">({w.part_of_speech})</span>
            )}
            <span className="mt-6 text-xs text-slate-300 dark:text-slate-600">
              แตะการ์ดเพื่อพลิกดูความหมาย
            </span>
          </>
        ) : (
          <>
            <span className="text-sm text-slate-400">
              {w.word} {w.part_of_speech && `(${w.part_of_speech})`}
            </span>
            <span className="mt-3 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
              {w.meaning}
            </span>
          </>
        )}
      </div>

      {flipped && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => mark(false)}
            className="rounded-xl bg-red-500 py-3 font-medium text-white hover:bg-red-600"
          >
            ✗ จำไม่ได้
          </button>
          <button
            onClick={() => mark(true)}
            className="rounded-xl bg-emerald-500 py-3 font-medium text-white hover:bg-emerald-600"
          >
            ✓ จำได้
          </button>
        </div>
      )}
    </div>
  );
}
