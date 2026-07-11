"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDashboardStats, getDailyProgress, saveDailyGoal } from "@/app/actions";
import { useRangeSetting } from "@/lib/useRangeSetting";
import { countInRanges, formatRanges } from "@/lib/range";
import RangeSelector from "./RangeSelector";
import ProgressChart from "./ProgressChart";
import ExportButtons from "./ExportButtons";
import type { DashboardStats, DailyProgressPoint } from "@/lib/types";

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { setting, update, ranges, loaded } = useRangeSetting();
  const [allStats, setAllStats] = useState<DashboardStats | null>(null);
  const [rangeStats, setRangeStats] = useState<DashboardStats | null>(null);
  const [progress, setProgress] = useState<DailyProgressPoint[]>([]);

  useEffect(() => {
    getDashboardStats(null).then(setAllStats);
    getDailyProgress(14).then(setProgress);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (ranges && ranges.length > 0) {
      getDashboardStats(ranges).then(setRangeStats);
    } else {
      setRangeStats(null);
    }
  }, [loaded, JSON.stringify(ranges)]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!allStats) {
    return <p className="py-10 text-center text-slate-400">กำลังโหลด…</p>;
  }

  const goalDone = allStats.todayReviews >= allStats.dailyGoal;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📊 แดชบอร์ด</h1>
        <ExportButtons />
      </div>

      {allStats.totalWords === 0 && (
        <div className="rounded-xl border border-dashed border-indigo-300 bg-indigo-50 p-6 text-center dark:border-indigo-800 dark:bg-indigo-950">
          ยังไม่มีคำศัพท์ในระบบ —{" "}
          <Link href="/import" className="font-medium text-indigo-600 underline">
            เริ่มจาก import ไฟล์คำศัพท์
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="คำทั้งหมด" value={String(allStats.totalWords)} />
        <StatCard
          label="จำได้แล้ว"
          value={`${allStats.rememberedWords}`}
          sub={
            allStats.totalWords > 0
              ? `${Math.round((allStats.rememberedWords / allStats.totalWords) * 100)}% ของทั้งหมด`
              : undefined
          }
        />
        <StatCard
          label="ความแม่นยำรวม"
          value={`${allStats.accuracy}%`}
          sub={`${allStats.totalCorrect}/${allStats.totalReviews} ครั้ง`}
        />
        <StatCard
          label="วันนี้ทบทวนแล้ว"
          value={`${allStats.todayReviews}`}
          sub={
            goalDone
              ? `🎉 ครบเป้า ${allStats.dailyGoal} คำแล้ว`
              : `เป้าหมาย ${allStats.dailyGoal} คำ/วัน`
          }
        />
      </div>

      <div className="flex items-center gap-2 text-sm">
        <label className="text-slate-500">เป้าหมายรายวัน:</label>
        <input
          type="number"
          min={1}
          defaultValue={allStats.dailyGoal}
          onBlur={(e) => {
            const v = Math.max(1, parseInt(e.target.value, 10) || 20);
            void saveDailyGoal(v).then(() => getDashboardStats(null).then(setAllStats));
          }}
          className="w-20 rounded-lg border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-800"
        />
        <span className="text-slate-400">คำ/วัน</span>
      </div>

      <RangeSelector
        setting={setting}
        onChange={update}
        maxOrder={allStats.maxOrder}
      />

      {rangeStats && ranges && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950">
          <div className="mb-2 text-sm font-semibold">
            สถิติช่วง {formatRanges(ranges)} ({countInRanges(ranges)} คำ)
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-slate-500">มีในระบบ: </span>
              <b>{rangeStats.totalWords}</b> คำ
            </div>
            <div>
              <span className="text-slate-500">จำได้: </span>
              <b>
                {rangeStats.rememberedWords}/{rangeStats.totalWords}
              </b>{" "}
              คำ
            </div>
            <div>
              <span className="text-slate-500">ความแม่นยำ: </span>
              <b>{rangeStats.accuracy}%</b>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2 text-sm font-semibold">
          ความคืบหน้า 14 วันล่าสุด
        </div>
        <ProgressChart data={progress} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/daily"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          ☀️ คำศัพท์วันนี้
        </Link>
        <Link
          href="/review"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          ▶ เริ่มทบทวน
        </Link>
      </div>
    </div>
  );
}
