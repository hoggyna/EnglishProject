"use client";

import Link from "next/link";
import type { WordWithStats } from "@/lib/types";

export function SessionProgress({
  index,
  total,
}: {
  index: number;
  total: number;
}) {
  return (
    <div className="mb-4">
      <div className="mb-1 flex justify-between text-xs text-slate-400">
        <span>
          ข้อ {Math.min(index + 1, total)} / {total}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="h-1.5 rounded-full bg-indigo-500 transition-all"
          style={{ width: `${(index / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function SessionSummary({
  results,
  onRestart,
}: {
  results: { word: WordWithStats; correct: boolean }[];
  onRestart: () => void;
}) {
  const correct = results.filter((r) => r.correct).length;
  return (
    <div className="mx-auto max-w-lg space-y-4 text-center">
      <div className="text-5xl">{correct === results.length ? "🏆" : "✅"}</div>
      <h2 className="text-xl font-bold">จบรอบแล้ว!</h2>
      <p className="text-slate-500">
        ตอบถูก <b>{correct}</b> จาก <b>{results.length}</b> คำ (
        {Math.round((correct / Math.max(1, results.length)) * 100)}%)
      </p>
      <ul className="space-y-1 text-left text-sm">
        {results.map((r, i) => (
          <li
            key={i}
            className={`flex justify-between rounded-lg px-3 py-1.5 ${
              r.correct
                ? "bg-emerald-50 dark:bg-emerald-950"
                : "bg-red-50 dark:bg-red-950"
            }`}
          >
            <span>
              {r.correct ? "✓" : "✗"} <b>{r.word.word}</b>{" "}
              {r.word.part_of_speech && (
                <em className="text-slate-400">({r.word.part_of_speech})</em>
              )}
            </span>
            <span className="text-slate-500">{r.word.meaning}</span>
          </li>
        ))}
      </ul>
      <div className="flex justify-center gap-2 pt-2">
        <button
          onClick={onRestart}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          🔁 อีกรอบ
        </button>
        <Link
          href="/review"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          กลับหน้าทบทวน
        </Link>
      </div>
    </div>
  );
}

export function EmptyQueue() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400 dark:border-slate-700">
      ไม่มีคำศัพท์ในช่วงที่เลือก —{" "}
      <Link href="/import" className="text-indigo-500 underline">
        import คำศัพท์
      </Link>{" "}
      หรือปรับ range ที่หน้า{" "}
      <Link href="/review" className="text-indigo-500 underline">
        ทบทวน
      </Link>
    </div>
  );
}
