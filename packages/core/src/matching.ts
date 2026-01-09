export const normalizeMatchValue = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export const levenshteinDistance = (str1: string, str2: string): number => {
  const normalized1 = normalizeMatchValue(str1);
  const normalized2 = normalizeMatchValue(str2);
  const m = normalized1.length;
  const n = normalized2.length;

  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (normalized1[i - 1] === normalized2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] =
          1 +
          Math.min(
            dp[i - 1][j],
            dp[i][j - 1],
            dp[i - 1][j - 1]
          );
      }
    }
  }

  return dp[m][n];
};

export const findBestFuzzyMatch = (
  input: string,
  candidates: string[],
  threshold = 0.4
): string | null => {
  if (candidates.length === 0) return null;

  let bestMatch: string | null = null;
  let bestDistance = Infinity;

  for (const candidate of candidates) {
    const distance = levenshteinDistance(input, candidate);
    const maxLength = Math.max(input.length, candidate.length);
    const ratio = distance / maxLength;

    if (distance < bestDistance && ratio <= threshold) {
      bestDistance = distance;
      bestMatch = candidate;
    }
  }

  return bestMatch;
};
