/** Distance de Levenshtein (insensible à la casse si tu normalises avant). */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost,
      );
    }
  }
  return dp[m]![n]!;
}

export function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** Tolérance Levenshtein ≤ 2 sur la réponse principale et les alias éventuels. */
export function matchOpenTolerance(
  raw: string,
  expected: string,
  aliases?: string[],
): boolean {
  const g = normalizeAnswer(raw);
  const candidates = [expected, ...(aliases ?? [])].map((s) => normalizeAnswer(s));
  return candidates.some((c) => levenshtein(g, c) <= 2);
}
