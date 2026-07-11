"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDailyPick } from "@/app/actions";
import { useRangeSetting } from "@/lib/useRangeSetting";
import RangeSelector from "./RangeSelector";
import type { WordWithStats } from "@/lib/types";

const COUNT_KEY = "vocab.dailyCount";

export default function DailyPick() {
  const { setting, update, ranges, loaded } = useRangeSetting();
  const [count, setCount] = useState(5);
  const [words, setWords] = useState<WordWithStats[] | null>(null);
  const [date, setDate] = useState("");
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(COUNT_KEY);
    if (saved) setCount(parseInt(saved, 10) || 5);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    // Load today's stored set (does not re-randomize on revisit).
    getDailyPick(ranges, count, false).then((res) => {
      setWords(res.words);
      setDate(res.date);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const reroll = async () => {
    setBusy(true);
    const res = await getDailyPick(ranges, count, true);
    setWords(res.words);
    setDate(res.date);
    setRevealed(new Set());
    setBusy(false);
  };

  const toggleReveal = (id: number) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!loaded || words === null) {
    return <p className="py-10 text-center text-slate-400">กำลังโหลด…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">☀️ คำศัพท์วันนี้</h1>
        <span className="text-sm text-slate-400">{date}</span>
      </div>

      <RangeSelector setting={setting} onChange={update} />

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          จำนวนคำ
          <input
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => {
              const v = Math.max(1, parseInt(e.target.value, 10) || 1);
              setCount(v);
              localStorage.setItem(COUNT_KEY, String(v));
            }}
            className="w-20 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
        </label>
        <button
          onClick={reroll}
          disabled={busy}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          🎲 สุ่มใหม่
        </button>
        <span className="text-xs text-slate-400">
          ชุดคำจะถูกเก็บไว้ทั้งวัน — เปิดซ้ำวันเดียวกันได้ชุดเดิม
        </span>
      </div>

      {words.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400 dark:border-slate-700">
          ยังไม่มีคำศัพท์ในช่วงที่เลือก —{" "}
          <Link href="/import" className="text-indigo-500 underline">
            import คำศัพท์ก่อน
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {words.map((w) => (
            <li
              key={w.id}
              onClick={() => toggleReveal(w.id)}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-semibold">{w.word}</span>
                <span className="text-xs text-slate-400">#{w.order_index}</span>
              </div>
              <div className="mt-1 text-sm text-slate-400">
                {w.part_of_speech && <em>({w.part_of_speech})</em>}
              </div>
              <div className="mt-2 min-h-6 text-sm">
                {revealed.has(w.id) ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {w.meaning}
                  </span>
                ) : (
                  <span className="text-slate-300 dark:text-slate-600">
                    แตะเพื่อดูความหมาย
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {words.length > 0 && (
        <div className="flex gap-2 pt-2">
          <Link
            href="/review/flashcard?source=daily"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            ▶ ทบทวนชุดนี้แบบ Flashcard
          </Link>
          <Link
            href="/review/quiz?source=daily"
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            ▶ Quiz ชุดนี้
          </Link>
        </div>
      )}
    </div>
  );
}
