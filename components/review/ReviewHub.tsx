"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDashboardStats } from "@/app/actions";
import { useRangeSetting } from "@/lib/useRangeSetting";
import RangeSelector from "@/components/RangeSelector";

const SESSION_SIZE_KEY = "vocab.sessionSize";

const modes = [
  {
    href: "/review/flashcard",
    icon: "🃏",
    title: "Flashcard",
    desc: "พลิกการ์ดดูความหมาย แล้วบอกว่าจำได้หรือไม่",
  },
  {
    href: "/review/quiz",
    icon: "🔤",
    title: "Multiple Choice",
    desc: "เลือกความหมายที่ถูกจาก 4 ตัวเลือก",
  },
  {
    href: "/review/type",
    icon: "⌨️",
    title: "พิมพ์คำตอบ",
    desc: "พิมพ์ความหมายเอง มี fuzzy match เผื่อพิมพ์เพี้ยนเล็กน้อย",
  },
];

export default function ReviewHub() {
  const { setting, update, loaded } = useRangeSetting();
  const [maxOrder, setMaxOrder] = useState<number | undefined>();
  const [size, setSize] = useState(10);

  useEffect(() => {
    getDashboardStats(null).then((s) => setMaxOrder(s.maxOrder));
    const saved = localStorage.getItem(SESSION_SIZE_KEY);
    if (saved) setSize(parseInt(saved, 10) || 10);
  }, []);

  if (!loaded) {
    return <p className="py-10 text-center text-slate-400">กำลังโหลด…</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">▶ ทบทวนคำศัพท์</h1>

      <RangeSelector setting={setting} onChange={update} maxOrder={maxOrder} />

      <label className="flex items-center gap-2 text-sm">
        จำนวนคำต่อรอบ
        <input
          type="number"
          min={1}
          max={100}
          value={size}
          onChange={(e) => {
            const v = Math.max(1, parseInt(e.target.value, 10) || 1);
            setSize(v);
            localStorage.setItem(SESSION_SIZE_KEY, String(v));
          }}
          className="w-20 rounded-lg border border-slate-300 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800"
        />
        <span className="text-xs text-slate-400">
          คำที่ตอบผิดบ่อย/ถึงกำหนดทบทวนจะถูกเลือกมาก่อน
        </span>
      </label>

      <div className="grid gap-3 sm:grid-cols-3">
        {modes.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="text-3xl">{m.icon}</div>
            <div className="mt-2 font-semibold">{m.title}</div>
            <div className="mt-1 text-xs text-slate-400">{m.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
