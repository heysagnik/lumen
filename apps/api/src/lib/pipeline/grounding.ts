function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function levenshteinRatio(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist = Array.from({ length: rows }, (_, i) => {
    const row = new Array<number>(cols).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j < cols; j++) dist[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(dist[i - 1][j] + 1, dist[i][j - 1] + 1, dist[i - 1][j - 1] + cost);
    }
  }
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - dist[rows - 1][cols - 1] / maxLen;
}

const FUZZY_MATCH_THRESHOLD = 0.85;
const SCAN_STRIDE = 8;

export function isQuoteGrounded(quote: string, sourceText: string): boolean {
  const normQuote = normalize(quote);
  const normSource = normalize(sourceText);
  if (normQuote.length === 0) return false;
  if (normSource.includes(normQuote)) return true;

  const maxAllowedEdits = Math.floor(normQuote.length * (1 - FUZZY_MATCH_THRESHOLD));
  const lastStart = Math.max(0, normSource.length - normQuote.length);

  for (let i = 0; i <= lastStart; i += SCAN_STRIDE) {
    const window = normSource.slice(i, i + normQuote.length);
    if (Math.abs(window.length - normQuote.length) > maxAllowedEdits) continue;
    if (levenshteinRatio(normQuote, window) >= FUZZY_MATCH_THRESHOLD) {
      return true;
    }
  }
  return false;
}
