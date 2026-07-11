import type { WordWithStats } from "./types";

// Leitner box intervals in days: box 1 reviews immediately, box 5 weekly.
export const BOX_INTERVALS_DAYS = [0, 1, 2, 4, 7];
export const MAX_BOX = 5;
export const REMEMBERED_BOX = 3; // box >= 3 counts as "remembered"

export function nextBox(box: number, correct: boolean): number {
  return correct ? Math.min(MAX_BOX, box + 1) : 1;
}

export function nextReviewDate(box: number, now = new Date()): string {
  const days = BOX_INTERVALS_DAYS[Math.min(box, MAX_BOX) - 1] ?? 0;
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// Words answered wrong often get a bigger weight so they show up more.
// Unseen words get a modest boost over well-known ones.
export function pickWeight(w: WordWithStats): number {
  const total = w.correct_count + w.wrong_count;
  if (total === 0) return 3;
  const errorRate = w.wrong_count / total;
  const boxPenalty = (MAX_BOX - w.box) / (MAX_BOX - 1); // 1 for box1, 0 for box5
  return 1 + errorRate * 6 + boxPenalty * 3;
}

// Weighted sampling without replacement (Efraimidis–Spirakis).
export function weightedSample<T extends WordWithStats>(
  items: T[],
  count: number
): T[] {
  return items
    .map((item) => ({
      item,
      key: Math.pow(Math.random(), 1 / pickWeight(item)),
    }))
    .sort((a, b) => b.key - a.key)
    .slice(0, count)
    .map((x) => x.item);
}

// Order a review queue: due words first, then weighted-shuffled rest.
export function buildQueue<T extends WordWithStats>(
  words: T[],
  limit: number
): T[] {
  const now = new Date().toISOString();
  const due = words.filter(
    (w) => !w.next_review_at || w.next_review_at <= now
  );
  const notDue = words.filter(
    (w) => w.next_review_at && w.next_review_at > now
  );
  const pool = [...weightedSample(due, due.length)];
  if (pool.length < limit) {
    pool.push(...weightedSample(notDue, limit - pool.length));
  }
  return pool.slice(0, limit);
}
