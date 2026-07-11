# PROGRESS — Vocabulary Review App

_อัปเดตล่าสุด: 2026-07-06_

## สถานะโดยรวม: ✅ เสร็จสมบูรณ์ทั้ง 7 ฟีเจอร์

`npm run build` ผ่าน, smoke test ทุก route ผ่าน (200), unit test range parser + fuzzy match ผ่านทุกเคส

## สิ่งที่ทำเสร็จแล้ว

1. **Scaffold** — Next.js 16 (App Router) + TypeScript + Tailwind v4, deps: better-sqlite3, xlsx, papaparse, recharts
2. **Database** (`lib/db.ts`) — SQLite ที่ `data/flashcard.db` (WAL mode, สร้าง schema อัตโนมัติเมื่อรันครั้งแรก)
   - `words` — มี `order_index INTEGER UNIQUE` สำหรับ range query
   - `word_stats` — correct/wrong count, Leitner box 1-5, next_review_at
   - `review_log` — ทุกครั้งที่ตอบ (ใช้ทำกราฟรายวัน)
   - `daily_picks` — ชุดคำประจำวัน (key = วันที่)
   - `settings` — last_range, daily_goal
3. **Import** (`/import`, `components/ImportForm.tsx`) — xlsx/csv/json, map คอลัมน์ + เดาอัตโนมัติ, preview 10 แถว, โหมด append/replace, assign order_index ตามลำดับแถว
4. **CRUD** (`/words`, `components/WordList.tsx`) — ค้นหา, กรอง part_of_speech, กรอง range, เพิ่ม/แก้/ลบ (คำใหม่ต่อท้าย order สูงสุด)
5. **Range selector** (`components/RangeSelector.tsx`, `lib/range.ts`, `lib/useRangeSetting.ts`) — รองรับหลาย range "1-40, 200-250", merge ช่วงซ้อน, จำค่าล่าสุดใน localStorage + DB
6. **Daily pick** (`/daily`, `components/DailyPick.tsx`) — default 5 คำ ปรับได้, เก็บชุดทั้งวันใน DB, ปุ่มสุ่มใหม่, weighted random เอนเอียงหาคำที่ตอบผิดบ่อย, ลิงก์ทบทวนชุดนี้ต่อ (`?source=daily`)
7. **โหมดทบทวน 3 แบบ** (`components/review/`, `lib/useReviewSession.ts`) — Flashcard / Multiple choice (distractor จาก range เดียวกัน) / พิมพ์คำตอบ (fuzzy match ใน `lib/fuzzy.ts`) + Leitner spaced repetition (`lib/srs.ts`)
8. **Dashboard** (`/`, `components/Dashboard.tsx`) — สถิติรวม + แยกตาม range, เป้าหมายรายวันปรับได้, กราฟ 14 วัน (recharts)
9. **Export** (`app/api/export/route.ts`) — CSV (มี BOM สำหรับภาษาไทยใน Excel) / JSON / XLSX พร้อม progress

## สิ่งที่เหลือ (ผู้ใช้ทำเอง)

- [ ] Import ไฟล์ Excel 1000 คำจริงที่ http://localhost:3000/import — เลือกโหมด "ล้างของเดิมแล้ว import ใหม่" (ตอนนี้มีคำ seed ตัวอย่าง 10 คำใน DB)

## วิธีรัน

```bash
npm run dev    # http://localhost:3000
```

## หมายเหตุทางเทคนิค

- Server actions ทั้งหมดอยู่ที่ `app/actions.ts` (client components เรียกตรง)
- `next.config.ts` ต้องมี `serverExternalPackages: ["better-sqlite3"]`
- "จำได้แล้ว" นิยามเป็น Leitner box ≥ 3 (`REMEMBERED_BOX` ใน `lib/srs.ts`)
- DB อยู่ใน `data/` ซึ่ง gitignore ไว้แล้ว
