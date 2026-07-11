"use client";

import { countInRanges, parseRanges } from "@/lib/range";
import type { RangeSetting } from "@/lib/useRangeSetting";

type Props = {
  setting: RangeSetting;
  onChange: (next: RangeSetting) => void;
  maxOrder?: number; // highest order_index, for the hint text
};

export default function RangeSelector({ setting, onChange, maxOrder }: Props) {
  const parsed = setting.mode === "range" ? parseRanges(setting.text) : null;
  const invalid = setting.mode === "range" && setting.text.trim() !== "" && !parsed;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        🎯 ช่วงคำศัพท์ที่ทบทวน
        {maxOrder ? (
          <span className="font-normal text-slate-400">
            (มีทั้งหมด {maxOrder} คำ)
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-1.5 text-sm">
          <input
            type="radio"
            checked={setting.mode === "all"}
            onChange={() => onChange({ ...setting, mode: "all" })}
            className="accent-indigo-600"
          />
          ทบทวนทั้งหมด
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-sm">
          <input
            type="radio"
            checked={setting.mode === "range"}
            onChange={() => onChange({ ...setting, mode: "range" })}
            className="accent-indigo-600"
          />
          เฉพาะช่วง
        </label>
        <input
          type="text"
          placeholder="เช่น 1-40 หรือ 1-40, 200-250"
          value={setting.text}
          onChange={(e) =>
            onChange({ mode: "range", text: e.target.value })
          }
          onFocus={() => {
            if (setting.mode !== "range")
              onChange({ ...setting, mode: "range" });
          }}
          className={`w-56 rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 ${
            invalid
              ? "border-red-400"
              : "border-slate-300 dark:border-slate-700"
          }`}
        />
      </div>
      {invalid && (
        <p className="mt-2 text-xs text-red-500">
          รูปแบบไม่ถูกต้อง — ใช้รูปแบบ &quot;1-40&quot; หรือหลายช่วงคั่นด้วยจุลภาค &quot;1-40, 200-250&quot;
        </p>
      )}
      {setting.mode === "range" && parsed && (
        <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
          ✓ เลือก {countInRanges(parsed)} คำ (ลำดับที่{" "}
          {parsed.map((r) => `${r.from}-${r.to}`).join(", ")})
        </p>
      )}
    </div>
  );
}
