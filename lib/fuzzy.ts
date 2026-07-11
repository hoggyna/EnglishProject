// Fuzzy matching for typed answers against a stored meaning.
// A meaning can hold several senses ("วิ่ง, รีบไป") — matching any sense counts.

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ") // drop parenthetical notes
    .replace(/[.,;:!?'"“”‘’]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[n];
}

function senseMatches(answer: string, sense: string): boolean {
  if (!answer || !sense) return false;
  if (answer === sense) return true;

  // Substring either way, as long as the answer is substantial enough.
  if (sense.includes(answer) && answer.length >= Math.min(3, sense.length)) {
    return true;
  }
  if (answer.includes(sense) && sense.length >= 2) return true;

  // Edit-distance tolerance scaled by length (about 20%, min 1).
  const tolerance = Math.max(1, Math.floor(sense.length * 0.2));
  return levenshtein(answer, sense) <= tolerance;
}

export function checkAnswer(userAnswer: string, meaning: string): boolean {
  const answer = normalize(userAnswer);
  if (!answer) return false;

  const senses = meaning
    .split(/[,;\/、]+/)
    .map(normalize)
    .filter(Boolean);
  senses.push(normalize(meaning));

  return senses.some((sense) => senseMatches(answer, sense));
}
