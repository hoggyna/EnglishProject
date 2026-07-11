export type Word = {
  id: number;
  order_index: number;
  word: string;
  part_of_speech: string;
  meaning: string;
  category: string | null;
  created_at: string;
  updated_at: string;
};

export type WordStats = {
  word_id: number;
  correct_count: number;
  wrong_count: number;
  box: number; // Leitner box 1-5
  last_reviewed_at: string | null;
  next_review_at: string | null;
};

export type WordWithStats = Word & {
  correct_count: number;
  wrong_count: number;
  box: number;
  last_reviewed_at: string | null;
  next_review_at: string | null;
};

export type Range = { from: number; to: number };

export type ReviewMode = "flashcard" | "quiz" | "type";

export type ImportRow = {
  word: string;
  part_of_speech: string;
  meaning: string;
  category?: string | null;
};

export type DashboardStats = {
  totalWords: number;
  rememberedWords: number; // box >= 3
  totalReviews: number;
  totalCorrect: number;
  accuracy: number; // 0-100
  todayReviews: number;
  todayCorrect: number;
  dailyGoal: number;
  minOrder: number;
  maxOrder: number;
};

export type DailyProgressPoint = {
  date: string; // YYYY-MM-DD
  reviews: number;
  correct: number;
  accuracy: number;
};
