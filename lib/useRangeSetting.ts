"use client";

import { useEffect, useState } from "react";
import { parseRanges } from "./range";
import { getLastRange, saveLastRange } from "@/app/actions";
import type { Range } from "./types";

const STORAGE_KEY = "vocab.range";

export type RangeSetting = {
  mode: "all" | "range";
  text: string;
};

// Persisted in localStorage for instant load, mirrored to the DB
// (settings.last_range) so it survives a cleared browser.
export function useRangeSetting() {
  const [setting, setSetting] = useState<RangeSetting>({
    mode: "all",
    text: "",
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setSetting(JSON.parse(raw) as RangeSetting);
        setLoaded(true);
        return;
      } catch {
        /* fall through to DB */
      }
    }
    getLastRange().then((dbValue) => {
      if (dbValue) {
        try {
          setSetting(JSON.parse(dbValue) as RangeSetting);
        } catch {
          /* ignore corrupt value */
        }
      }
      setLoaded(true);
    });
  }, []);

  const update = (next: RangeSetting) => {
    setSetting(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    void saveLastRange(JSON.stringify(next));
  };

  const ranges: Range[] | null =
    setting.mode === "range" ? parseRanges(setting.text) : null;

  return { setting, update, ranges, loaded };
}
