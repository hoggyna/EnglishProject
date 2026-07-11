import type { Range } from "./types";

// Parse strings like "1-40" or "1-40, 200-250, 300" into ranges.
// A single number N is treated as N-N. Returns null if nothing valid.
export function parseRanges(input: string): Range[] | null {
  const parts = input
    .split(/[,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  const ranges: Range[] = [];
  for (const part of parts) {
    const m = part.match(/^(\d+)\s*[-–—]\s*(\d+)$/) ?? part.match(/^(\d+)$/);
    if (!m) return null;
    const from = parseInt(m[1], 10);
    const to = m[2] !== undefined ? parseInt(m[2], 10) : from;
    if (from < 1 || to < from) return null;
    ranges.push({ from, to });
  }
  return mergeRanges(ranges);
}

export function mergeRanges(ranges: Range[]): Range[] {
  const sorted = [...ranges].sort((a, b) => a.from - b.from);
  const merged: Range[] = [];
  for (const r of sorted) {
    const last = merged[merged.length - 1];
    if (last && r.from <= last.to + 1) {
      last.to = Math.max(last.to, r.to);
    } else {
      merged.push({ ...r });
    }
  }
  return merged;
}

export function formatRanges(ranges: Range[]): string {
  return ranges
    .map((r) => (r.from === r.to ? `${r.from}` : `${r.from}-${r.to}`))
    .join(", ");
}

export function rangesToSql(ranges: Range[]): {
  clause: string;
  params: number[];
} {
  const clause = ranges
    .map(() => "(order_index BETWEEN ? AND ?)")
    .join(" OR ");
  const params = ranges.flatMap((r) => [r.from, r.to]);
  return { clause: `(${clause})`, params };
}

export function countInRanges(ranges: Range[]): number {
  return ranges.reduce((sum, r) => sum + (r.to - r.from + 1), 0);
}
