"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createWord,
  deleteWord,
  getPartsOfSpeech,
  getWords,
  updateWord,
} from "@/app/actions";
import { parseRanges } from "@/lib/range";
import ExportButtons from "./ExportButtons";
import type { WordWithStats } from "@/lib/types";

type FormState = {
  id: number | null; // null = creating
  word: string;
  part_of_speech: string;
  meaning: string;
  category: string;
};

const emptyForm: FormState = {
  id: null,
  word: "",
  part_of_speech: "",
  meaning: "",
  category: "",
};

export default function WordList() {
  const [words, setWords] = useState<WordWithStats[] | null>(null);
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState("");
  const [rangeText, setRangeText] = useState("");
  const [posOptions, setPosOptions] = useState<string[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const ranges = rangeText.trim() ? parseRanges(rangeText) : null;
    const rows = await getWords({
      search: search.trim() || undefined,
      partOfSpeech: pos || undefined,
      ranges: ranges ?? undefined,
    });
    setWords(rows);
    setPosOptions(await getPartsOfSpeech());
  }, [search, pos, rangeText]);

  useEffect(() => {
    const t = setTimeout(load, 250); // debounce typing
    return () => clearTimeout(t);
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !form.word.trim() || !form.meaning.trim()) return;
    setBusy(true);
    if (form.id === null) {
      await createWord(form);
    } else {
      await updateWord(form.id, form);
    }
    setForm(null);
    setBusy(false);
    await load();
  };

  const remove = async (w: WordWithStats) => {
    if (!confirm(`ลบคำว่า "${w.word}" ?`)) return;
    await deleteWord(w.id);
    await load();
  };

  const rangeInvalid = rangeText.trim() !== "" && !parseRanges(rangeText);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📖 คำศัพท์ทั้งหมด</h1>
        <div className="flex items-center gap-3">
          <ExportButtons />
          <button
            onClick={() => setForm({ ...emptyForm })}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + เพิ่มคำ
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="ค้นหาคำ/ความหมาย…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-52 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
        <select
          value={pos}
          onChange={(e) => setPos(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">ทุกประเภทคำ</option>
          {posOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="ช่วงลำดับ เช่น 1-40"
          value={rangeText}
          onChange={(e) => setRangeText(e.target.value)}
          className={`w-40 rounded-lg border px-3 py-1.5 text-sm dark:bg-slate-800 ${
            rangeInvalid
              ? "border-red-400"
              : "border-slate-300 dark:border-slate-700"
          }`}
        />
        {words && (
          <span className="self-center text-xs text-slate-400">
            {words.length} คำ
          </span>
        )}
      </div>

      {form && (
        <form
          onSubmit={submit}
          className="grid gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-4 sm:grid-cols-2 dark:border-indigo-900 dark:bg-indigo-950"
        >
          <div className="col-span-full text-sm font-semibold">
            {form.id === null ? "เพิ่มคำใหม่ (ต่อท้ายลำดับสุดท้าย)" : "แก้ไขคำ"}
          </div>
          <input
            required
            placeholder="คำศัพท์ (อังกฤษ)"
            value={form.word}
            onChange={(e) => setForm({ ...form, word: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <input
            placeholder="ประเภทคำ (n, v, adj…)"
            value={form.part_of_speech}
            onChange={(e) =>
              setForm({ ...form, part_of_speech: e.target.value })
            }
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <input
            required
            placeholder="ความหมาย (ไทย)"
            value={form.meaning}
            onChange={(e) => setForm({ ...form, meaning: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <input
            placeholder="หมวดหมู่ (ไม่บังคับ)"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <div className="col-span-full flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              บันทึก
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm dark:border-slate-700"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      )}

      {words === null ? (
        <p className="py-10 text-center text-slate-400">กำลังโหลด…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs text-slate-500 dark:bg-slate-900">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">คำศัพท์</th>
                <th className="px-3 py-2">ประเภท</th>
                <th className="px-3 py-2">ความหมาย</th>
                <th className="px-3 py-2 text-center">ถูก/ผิด</th>
                <th className="px-3 py-2 text-center">Box</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950">
              {words.map((w) => (
                <tr key={w.id}>
                  <td className="px-3 py-2 text-slate-400">{w.order_index}</td>
                  <td className="px-3 py-2 font-medium">{w.word}</td>
                  <td className="px-3 py-2 text-slate-400">
                    {w.part_of_speech}
                  </td>
                  <td className="px-3 py-2">{w.meaning}</td>
                  <td className="px-3 py-2 text-center text-xs">
                    <span className="text-emerald-600">{w.correct_count}</span>
                    {" / "}
                    <span className="text-red-500">{w.wrong_count}</span>
                  </td>
                  <td className="px-3 py-2 text-center text-xs">{w.box}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() =>
                        setForm({
                          id: w.id,
                          word: w.word,
                          part_of_speech: w.part_of_speech,
                          meaning: w.meaning,
                          category: w.category ?? "",
                        })
                      }
                      className="mr-2 text-xs text-indigo-500 hover:underline"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => remove(w)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
              {words.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-slate-400"
                  >
                    ไม่พบคำศัพท์
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
