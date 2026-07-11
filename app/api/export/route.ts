import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getDb } from "@/lib/db";
import type { WordWithStats } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format") ?? "json";

  const rows = getDb()
    .prepare(
      `SELECT w.order_index, w.word, w.part_of_speech, w.meaning, w.category,
              COALESCE(s.correct_count, 0) AS correct_count,
              COALESCE(s.wrong_count, 0) AS wrong_count,
              COALESCE(s.box, 1) AS box,
              s.last_reviewed_at
       FROM words w
       LEFT JOIN word_stats s ON s.word_id = w.id
       ORDER BY w.order_index`
    )
    .all() as (Pick<
    WordWithStats,
    | "order_index"
    | "word"
    | "part_of_speech"
    | "meaning"
    | "category"
    | "correct_count"
    | "wrong_count"
    | "box"
    | "last_reviewed_at"
  >)[];

  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    return new NextResponse(JSON.stringify(rows, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="vocabulary-${stamp}.json"`,
      },
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);

  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    // BOM so Excel opens Thai text correctly
    return new NextResponse("﻿" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="vocabulary-${stamp}.csv"`,
      },
    });
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Vocabulary");
  const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="vocabulary-${stamp}.xlsx"`,
    },
  });
}
