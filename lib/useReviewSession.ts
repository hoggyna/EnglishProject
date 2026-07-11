"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getDailyPick, getReviewQueue, recordReview } from "@/app/actions";
import { useRangeSetting } from "./useRangeSetting";
import type { ReviewMode, WordWithStats } from "./types";

const SESSION_SIZE_KEY = "vocab.sessionSize";

// Shared state machine for all three review modes.
// source=daily in the URL reviews today's daily pick instead of a fresh queue.
export function useReviewSession(mode: ReviewMode) {
  const searchParams = useSearchParams();
  const fromDaily = searchParams.get("source") === "daily";
  const { ranges, loaded } = useRangeSetting();

  const [queue, setQueue] = useState<WordWithStats[] | null>(null);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<{ word: WordWithStats; correct: boolean }[]>([]);
  const [sessionSize, setSessionSize] = useState(10);

  useEffect(() => {
    const saved = localStorage.getItem(SESSION_SIZE_KEY);
    if (saved) setSessionSize(parseInt(saved, 10) || 10);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (fromDaily) {
      getDailyPick(ranges, 5, false).then((res) => setQueue(res.words));
    } else {
      const saved = parseInt(localStorage.getItem(SESSION_SIZE_KEY) ?? "10", 10) || 10;
      getReviewQueue(ranges, saved).then(setQueue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, fromDaily]);

  const current = queue && index < queue.length ? queue[index] : null;
  const finished = queue !== null && queue.length > 0 && index >= queue.length;

  const answer = async (correct: boolean) => {
    if (!current) return;
    setResults((r) => [...r, { word: current, correct }]);
    setIndex((i) => i + 1);
    await recordReview(current.id, mode, correct);
  };

  const restart = async () => {
    setQueue(null);
    setIndex(0);
    setResults([]);
    if (fromDaily) {
      const res = await getDailyPick(ranges, 5, false);
      setQueue(res.words);
    } else {
      setQueue(await getReviewQueue(ranges, sessionSize));
    }
  };

  const updateSessionSize = (n: number) => {
    const v = Math.max(1, n);
    setSessionSize(v);
    localStorage.setItem(SESSION_SIZE_KEY, String(v));
  };

  return {
    queue,
    current,
    index,
    finished,
    results,
    ranges,
    fromDaily,
    sessionSize,
    updateSessionSize,
    answer,
    restart,
  };
}
