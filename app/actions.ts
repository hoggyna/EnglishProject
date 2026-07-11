"use server";

import { revalidatePath } from "next/cache";
import { getDb, getSetting, setSetting } from "@/lib/db";
import { rangesToSql } from "@/lib/range";
import {
  buildQueue,
  nextBox,
  nextReviewDate,
  weightedSample,
  REMEMBERED_BOX,
} from "@/lib/srs";
import type {
  DailyProgressPoint,
  DashboardStats,
  ImportRow,
  Range,
  ReviewMode,
  Word,
  WordWithStats,
} from "@/lib/types";

const WORD_WITH_STATS_SELECT = `
  SELECT w.*,
         COALESCE(s.correct_count, 0) AS correct_count,
         COALESCE(s.wrong_count, 0) AS wrong_count,
         COALESCE(s.box, 1) AS box,
         s.last_reviewed_at,
         s.next_review_at
  FROM words w
  LEFT JOIN word_stats s ON s.word_id = w.id
`;

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ---------- CRUD ----------

export async function getWords(filter?: {
  search?: string;
  partOfSpeech?: string;
  ranges?: Range[];
}): Promise<WordWithStats[]> {
  const db = getDb();
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (filter?.search) {
    where.push("(w.word LIKE ? OR w.meaning LIKE ?)");
    params.push(`%${filter.search}%`, `%${filter.search}%`);
  }
  if (filter?.partOfSpeech) {
    where.push("w.part_of_speech = ?");
    params.push(filter.partOfSpeech);
  }
  if (filter?.ranges && filter.ranges.length > 0) {
    const { clause, params: rangeParams } = rangesToSql(filter.ranges);
    where.push(clause.replaceAll("order_index", "w.order_index"));
    params.push(...rangeParams);
  }

  const sql = `${WORD_WITH_STATS_SELECT}
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY w.order_index`;
  return db.prepare(sql).all(...params) as WordWithStats[];
}

export async function getPartsOfSpeech(): Promise<string[]> {
  const rows = getDb()
    .prepare(
      "SELECT DISTINCT part_of_speech FROM words WHERE part_of_speech != '' ORDER BY part_of_speech"
    )
    .all() as { part_of_speech: string }[];
  return rows.map((r) => r.part_of_speech);
}

export async function createWord(input: {
  word: string;
  part_of_speech: string;
  meaning: string;
  category?: string | null;
}): Promise<Word> {
  const db = getDb();
  const { maxOrder } = db
    .prepare("SELECT COALESCE(MAX(order_index), 0) AS maxOrder FROM words")
    .get() as { maxOrder: number };
  const info = db
    .prepare(
      `INSERT INTO words (order_index, word, part_of_speech, meaning, category)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      maxOrder + 1,
      input.word.trim(),
      input.part_of_speech.trim(),
      input.meaning.trim(),
      input.category?.trim() || null
    );
  revalidatePath("/");
  revalidatePath("/words");
  return db
    .prepare("SELECT * FROM words WHERE id = ?")
    .get(info.lastInsertRowid) as Word;
}

export async function updateWord(
  id: number,
  input: {
    word: string;
    part_of_speech: string;
    meaning: string;
    category?: string | null;
  }
): Promise<void> {
  getDb()
    .prepare(
      `UPDATE words
       SET word = ?, part_of_speech = ?, meaning = ?, category = ?,
           updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(
      input.word.trim(),
      input.part_of_speech.trim(),
      input.meaning.trim(),
      input.category?.trim() || null,
      id
    );
  revalidatePath("/words");
}

export async function deleteWord(id: number): Promise<void> {
  getDb().prepare("DELETE FROM words WHERE id = ?").run(id);
  revalidatePath("/");
  revalidatePath("/words");
}

// ---------- Import / Export ----------

export async function importWords(
  rows: ImportRow[],
  mode: "append" | "replace"
): Promise<{ imported: number }> {
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO words (order_index, word, part_of_speech, meaning, category)
     VALUES (?, ?, ?, ?, ?)`
  );

  const run = db.transaction(() => {
    let start = 0;
    if (mode === "replace") {
      db.prepare("DELETE FROM words").run();
      db.prepare("DELETE FROM daily_picks").run();
    } else {
      const { maxOrder } = db
        .prepare("SELECT COALESCE(MAX(order_index), 0) AS maxOrder FROM words")
        .get() as { maxOrder: number };
      start = maxOrder;
    }
    let n = 0;
    for (const row of rows) {
      const word = row.word?.toString().trim();
      const meaning = row.meaning?.toString().trim();
      if (!word || !meaning) continue;
      n += 1;
      insert.run(
        start + n,
        word,
        row.part_of_speech?.toString().trim() ?? "",
        meaning,
        row.category?.toString().trim() || null
      );
    }
    return n;
  });

  const imported = run();
  revalidatePath("/");
  revalidatePath("/words");
  return { imported };
}

// ---------- Review ----------

export async function getReviewQueue(
  ranges: Range[] | null,
  limit: number
): Promise<WordWithStats[]> {
  const words = await getWords(ranges ? { ranges } : undefined);
  return buildQueue(words, Math.max(1, limit));
}

// Distractor meanings for the quiz, drawn from the same range when possible.
export async function getQuizChoices(
  wordId: number,
  ranges: Range[] | null,
  count = 3
): Promise<string[]> {
  const db = getDb();
  const target = db
    .prepare("SELECT meaning FROM words WHERE id = ?")
    .get(wordId) as { meaning: string } | undefined;
  if (!target) return [];

  const pull = (useRanges: boolean): string[] => {
    let sql =
      "SELECT DISTINCT meaning FROM words WHERE id != ? AND meaning != ?";
    const params: (string | number)[] = [wordId, target.meaning];
    if (useRanges && ranges && ranges.length > 0) {
      const { clause, params: rp } = rangesToSql(ranges);
      sql += ` AND ${clause}`;
      params.push(...rp);
    }
    sql += " ORDER BY RANDOM() LIMIT ?";
    params.push(count);
    return (db.prepare(sql).all(...params) as { meaning: string }[]).map(
      (r) => r.meaning
    );
  };

  let choices = pull(true);
  if (choices.length < count) {
    const extra = pull(false).filter((m) => !choices.includes(m));
    choices = [...choices, ...extra].slice(0, count);
  }
  return choices;
}

export async function recordReview(
  wordId: number,
  mode: ReviewMode,
  correct: boolean
): Promise<void> {
  const db = getDb();
  const stats = db
    .prepare("SELECT box FROM word_stats WHERE word_id = ?")
    .get(wordId) as { box: number } | undefined;
  const box = nextBox(stats?.box ?? 1, correct);

  db.prepare(
    `INSERT INTO word_stats (word_id, correct_count, wrong_count, box, last_reviewed_at, next_review_at)
     VALUES (?, ?, ?, ?, datetime('now'), ?)
     ON CONFLICT(word_id) DO UPDATE SET
       correct_count = correct_count + excluded.correct_count,
       wrong_count = wrong_count + excluded.wrong_count,
       box = excluded.box,
       last_reviewed_at = excluded.last_reviewed_at,
       next_review_at = excluded.next_review_at`
  ).run(wordId, correct ? 1 : 0, correct ? 0 : 1, box, nextReviewDate(box));

  db.prepare(
    "INSERT INTO review_log (word_id, mode, correct) VALUES (?, ?, ?)"
  ).run(wordId, mode, correct ? 1 : 0);

  revalidatePath("/");
}

// ---------- Daily pick ----------

export async function getDailyPick(
  ranges: Range[] | null,
  count: number,
  forceNew = false
): Promise<{ words: WordWithStats[]; date: string }> {
  const db = getDb();
  const today = localToday();

  if (!forceNew) {
    const existing = db
      .prepare("SELECT word_ids FROM daily_picks WHERE pick_date = ?")
      .get(today) as { word_ids: string } | undefined;
    if (existing) {
      const ids = JSON.parse(existing.word_ids) as number[];
      if (ids.length > 0) {
        const placeholders = ids.map(() => "?").join(",");
        const words = db
          .prepare(
            `${WORD_WITH_STATS_SELECT} WHERE w.id IN (${placeholders})`
          )
          .all(...ids) as WordWithStats[];
        // keep the stored order
        const byId = new Map(words.map((w) => [w.id, w]));
        const ordered = ids
          .map((id) => byId.get(id))
          .filter(Boolean) as WordWithStats[];
        if (ordered.length > 0) return { words: ordered, date: today };
      }
    }
  }

  const pool = await getWords(
    ranges && ranges.length > 0 ? { ranges } : undefined
  );
  const picked = weightedSample(pool, Math.max(1, count));

  db.prepare(
    `INSERT INTO daily_picks (pick_date, word_ids, ranges, count)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(pick_date) DO UPDATE SET
       word_ids = excluded.word_ids,
       ranges = excluded.ranges,
       count = excluded.count`
  ).run(
    today,
    JSON.stringify(picked.map((w) => w.id)),
    ranges ? JSON.stringify(ranges) : null,
    count
  );

  return { words: picked, date: today };
}

// ---------- Settings ----------

export async function getLastRange(): Promise<string | null> {
  return getSetting("last_range");
}

export async function saveLastRange(rangeText: string): Promise<void> {
  setSetting("last_range", rangeText);
}

export async function getDailyGoal(): Promise<number> {
  return parseInt(getSetting("daily_goal") ?? "20", 10);
}

export async function saveDailyGoal(goal: number): Promise<void> {
  setSetting("daily_goal", String(Math.max(1, goal)));
}

// ---------- Stats ----------

export async function getDashboardStats(
  ranges?: Range[] | null
): Promise<DashboardStats> {
  const db = getDb();

  let wordWhere = "";
  const wordParams: number[] = [];
  if (ranges && ranges.length > 0) {
    const { clause, params } = rangesToSql(ranges);
    wordWhere = `WHERE ${clause}`;
    wordParams.push(...params);
  }

  const totals = db
    .prepare(
      `SELECT COUNT(*) AS totalWords,
              COALESCE(MIN(order_index), 0) AS minOrder,
              COALESCE(MAX(order_index), 0) AS maxOrder
       FROM words ${wordWhere}`
    )
    .get(...wordParams) as {
    totalWords: number;
    minOrder: number;
    maxOrder: number;
  };

  const { remembered } = db
    .prepare(
      `SELECT COUNT(*) AS remembered
       FROM words w JOIN word_stats s ON s.word_id = w.id
       ${wordWhere ? wordWhere.replaceAll("order_index", "w.order_index") + " AND" : "WHERE"} s.box >= ?`
    )
    .get(...wordParams, REMEMBERED_BOX) as { remembered: number };

  const logWhere = ranges && ranges.length > 0
    ? `JOIN words w ON w.id = r.word_id WHERE ${rangesToSql(ranges).clause.replaceAll("order_index", "w.order_index")}`
    : "";
  const logParams = ranges && ranges.length > 0 ? rangesToSql(ranges).params : [];

  const reviewTotals = db
    .prepare(
      `SELECT COUNT(*) AS totalReviews, COALESCE(SUM(r.correct), 0) AS totalCorrect
       FROM review_log r ${logWhere}`
    )
    .get(...logParams) as { totalReviews: number; totalCorrect: number };

  const today = db
    .prepare(
      `SELECT COUNT(*) AS todayReviews, COALESCE(SUM(r.correct), 0) AS todayCorrect
       FROM review_log r ${logWhere ? logWhere + " AND" : "WHERE"} date(r.reviewed_at) = date('now', 'localtime')`
    )
    .get(...logParams) as { todayReviews: number; todayCorrect: number };

  return {
    totalWords: totals.totalWords,
    minOrder: totals.minOrder,
    maxOrder: totals.maxOrder,
    rememberedWords: remembered,
    totalReviews: reviewTotals.totalReviews,
    totalCorrect: reviewTotals.totalCorrect,
    accuracy:
      reviewTotals.totalReviews > 0
        ? Math.round((reviewTotals.totalCorrect / reviewTotals.totalReviews) * 100)
        : 0,
    todayReviews: today.todayReviews,
    todayCorrect: today.todayCorrect,
    dailyGoal: await getDailyGoal(),
  };
}

export async function getDailyProgress(
  days = 14
): Promise<DailyProgressPoint[]> {
  const rows = getDb()
    .prepare(
      `SELECT date(reviewed_at) AS date,
              COUNT(*) AS reviews,
              SUM(correct) AS correct
       FROM review_log
       WHERE date(reviewed_at) >= date('now', 'localtime', ?)
       GROUP BY date(reviewed_at)
       ORDER BY date`
    )
    .all(`-${days - 1} days`) as {
    date: string;
    reviews: number;
    correct: number;
  }[];

  const byDate = new Map(rows.map((r) => [r.date, r]));
  const points: DailyProgressPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const row = byDate.get(key);
    points.push({
      date: key,
      reviews: row?.reviews ?? 0,
      correct: row?.correct ?? 0,
      accuracy: row && row.reviews > 0 ? Math.round((row.correct / row.reviews) * 100) : 0,
    });
  }
  return points;
}
