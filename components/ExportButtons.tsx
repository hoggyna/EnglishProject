"use client";

const formats = [
  { key: "csv", label: "CSV" },
  { key: "json", label: "JSON" },
  { key: "xlsx", label: "Excel" },
];

export default function ExportButtons() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-slate-400">Export:</span>
      {formats.map((f) => (
        <a
          key={f.key}
          href={`/api/export?format=${f.key}`}
          className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          {f.label}
        </a>
      ))}
    </div>
  );
}
