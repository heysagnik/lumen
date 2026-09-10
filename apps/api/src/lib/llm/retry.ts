const MAX_RETRIES = 2;
const RETRY_BASE_MS = 800;
const CALL_TIMEOUT_MS = 90000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /429|rate.?limit|bad request|400|timed out|aborted/i.test(message);
}

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`LLM call timed out after ${timeoutMs}ms`)), timeoutMs);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

export async function withRetry<T>(fn: (signal: AbortSignal) => Promise<T>, queueKey = "unlabeled"): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const startedAt = Date.now();
    try {
      return await withTimeout(fn, CALL_TIMEOUT_MS);
    } catch (error) {
      lastError = error;
      const elapsedMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[llm:${queueKey}] attempt ${attempt + 1}/${MAX_RETRIES + 1} failed after ${elapsedMs}ms: ${message}`,
      );
      if (!isTransientError(error) || attempt === MAX_RETRIES) throw error;
      await sleep(RETRY_BASE_MS * 2 ** attempt);
    }
  }
  throw lastError;
}
