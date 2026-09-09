const TTL_MS = 5_000;

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const entries = new Map<string, CacheEntry>();
const keysByDocument = new Map<string, Set<string>>();

function trackKey(documentId: string, key: string): void {
  const keys = keysByDocument.get(documentId) ?? new Set();
  keys.add(key);
  keysByDocument.set(documentId, keys);
}

export function getCachedFacts<T>(documentId: string, key: string): T | undefined {
  const entry = entries.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    entries.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function setCachedFacts<T>(documentId: string, key: string, value: T): void {
  entries.set(key, { value, expiresAt: Date.now() + TTL_MS });
  trackKey(documentId, key);
}

export function invalidateFactsCache(documentId: string): void {
  const keys = keysByDocument.get(documentId);
  if (!keys) return;
  for (const key of keys) entries.delete(key);
  keysByDocument.delete(documentId);
}

