"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { importWords } from "@/app/actions";
import type { ImportRow } from "@/lib/types";

type Field = "word" | "part_of_speech" | "meaning" | "category" | "";

const FIELD_LABELS: { value: Field; label: string }[] = [
  { value: "", label: "— ไม่ใช้ —" },
  { value: "word", label: "คำศัพท์ (word)" },
  { value: "part_of_speech", label: "ประเภทคำ (part of speech)" },
  { value: "meaning", label: "ความหมาย (meaning)" },
  { value: "category", label: "หมวดหมู่ (category)" },
];

// Guess field mapping from a header name.
function guessField(header: string): Field {
  const h = header.toLowerCase().trim();
  if (/word|vocab|คำศัพท์|ศัพท์|english/.test(h)) return "word";
  if (/pos|part|type|ประเภท|ชนิด/.test(h)) return "part_of_speech";
  if (/mean|thai|translat|ความหมาย|แปล|ไทย/.test(h)) return "meaning";
  if (/categ|tag|group|หมวด/.test(h)) return "category";
  return "";
}

export default function ImportForm() {
  const router = useRouter();
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Field[]>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [mode, setMode] = useState<"append" | "replace">("append");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<number | null>(null);

  const loadMatrix = (matrix: string[][], name: string) => {
    const clean = matrix.filter((r) =>
      r.some((c) => c != null && String(c).trim() !== "")
    );
    if (clean.length === 0) {
      setError("ไฟล์ว่างเปล่า");
      return;
    }
    const width = Math.max(...clean.map((r) => r.length));
    const normalized = clean.map((r) =>
      Array.from({ length: width }, (_, i) => String(r[i] ?? "").trim())
    );
    const headerRow = normalized[0];
    setFileName(name);
    setHeaders(headerRow);
    setRows(normalized);
    setError("");
    setDone(null);

    // Auto-map: try header names first, else assume column order word/pos/meaning.
    const guessed = headerRow.map(guessField);
    if (guessed.filter(Boolean).length >= 2) {
      setMapping(guessed);
      setHasHeader(true);
    } else {
      const byOrder: Field[] = ["word", "part_of_speech", "meaning", "category"];
      setMapping(headerRow.map((_, i) => byOrder[i] ?? ""));
      setHasHeader(false);
    }
  };

  const handleFile = async (file: File) => {
    setError("");
    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "xlsx" || ext === "xls") {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf);
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, {
          header: 1,
          raw: false,
          defval: "",
        });
        loadMatrix(matrix as string[][], file.name);
      } else if (ext === "csv") {
        const text = await file.text();
        const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
        loadMatrix(parsed.data, file.name);
      } else if (ext === "json") {
        const data = JSON.parse(await file.text());
        if (!Array.isArray(data)) throw new Error("JSON ต้องเป็น array");
        if (data.length > 0 && typeof data[0] === "object" && !Array.isArray(data[0])) {
          const keys = Object.keys(data[0] as Record<string, unknown>);
          const matrix = [
            keys,
            ...data.map((obj: Record<string, unknown>) =>
              keys.map((k) => String(obj[k] ?? ""))
            ),
          ];
          loadMatrix(matrix, file.name);
        } else {
          loadMatrix(data as string[][], file.name);
        }
      } else {
        setError("รองรับเฉพาะไฟล์ .xlsx, .csv, .json");
      }
    } catch (e) {
      setError(`อ่านไฟล์ไม่สำเร็จ: ${e instanceof Error ? e.message : e}`);
    }
  };

  const dataRows = hasHeader ? rows.slice(1) : rows;
  const wordCol = mapping.indexOf("word");
  const meaningCol = mapping.indexOf("meaning");
  const posCol = mapping.indexOf("part_of_speech");
  const catCol = mapping.indexOf("category");
  const mappingValid = wordCol >= 0 && meaningCol >= 0;

  const doImport = async () => {
    if (!mappingValid) return;
    setBusy(true);
    setError("");
    try {
      const payload: ImportRow[] = dataRows.map((r) => ({
        word: r[wordCol] ?? "",
        part_of_speech: posCol >= 0 ? (r[posCol] ?? "") : "",
        meaning: r[meaningCol] ?? "",
        category: catCol >= 0 ? r[catCol] || null : null,
      }));
      const res = await importWords(payload, mode);
      setDone(res.imported);
      setRows([]);
      setHeaders([]);
      router.refresh();
    } catch (e) {
      setError(`Import ไม่สำเร็จ: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">📥 Import คำศัพท์</h1>
      <p className="text-sm text-slate-500">
        รองรับ Excel (.xlsx), CSV และ JSON — ลำดับที่ (order_index)
        จะถูกกำหนดตามลำดับแถวในไฟล์โดยอัตโนมัติ
      </p>

      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-10 text-center hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-900">
        <input
          type="file"
          accept=".xlsx,.xls,.csv,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
        <span className="text-3xl">📄</span>
        <span className="mt-2 text-sm font-medium">
          คลิกเพื่อเลือกไฟล์ (.xlsx / .csv / .json)
        </span>
        {fileName && (
          <span className="mt-1 text-xs text-indigo-500">{fileName}</span>
        )}
      </label>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {done !== null && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          ✓ Import สำเร็จ {done} คำ — ไปที่หน้า{" "}
          <a href="/words" className="underline">
            คำศัพท์
          </a>{" "}
          หรือ{" "}
          <a href="/daily" className="underline">
            คำศัพท์วันนี้
          </a>
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={hasHeader}
                onChange={(e) => setHasHeader(e.target.checked)}
                className="accent-indigo-600"
              />
              แถวแรกเป็นหัวตาราง
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={mode === "append"}
                onChange={() => setMode("append")}
                className="accent-indigo-600"
              />
              ต่อท้ายของเดิม
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={mode === "replace"}
                onChange={() => setMode("replace")}
                className="accent-indigo-600"
              />
              <span className="text-red-500">ล้างของเดิมแล้ว import ใหม่</span>
            </label>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-900">
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-slate-400">
                    ลำดับ
                  </th>
                  {headers.map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left">
                      <select
                        value={mapping[i] ?? ""}
                        onChange={(e) => {
                          const next = [...mapping];
                          next[i] = e.target.value as Field;
                          setMapping(next);
                        }}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                      >
                        {FIELD_LABELS.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                      {hasHeader && (
                        <div className="mt-1 text-xs font-normal text-slate-400">
                          {h}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950">
                {dataRows.slice(0, 10).map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 text-xs text-slate-400">
                      {i + 1}
                    </td>
                    {headers.map((_, j) => (
                      <td key={j} className="px-3 py-1.5">
                        {r[j]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={doImport}
              disabled={!mappingValid || busy}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {busy
                ? "กำลัง import…"
                : `✓ ยืนยัน import ${dataRows.length} แถว`}
            </button>
            {!mappingValid && (
              <span className="text-xs text-amber-500">
                ต้อง map คอลัมน์ word และ meaning เป็นอย่างน้อย
              </span>
            )}
            <span className="text-xs text-slate-400">
              (preview 10 แถวแรกจากทั้งหมด {dataRows.length} แถว)
            </span>
          </div>
        </>
      )}
    </div>
  );
}
