import pLimit from "p-limit";
import { acquireFairTurn } from "./fairQueue.js";
import { withRetry } from "./retry.js";

const MAX_CONCURRENT_CALLS = 10;

const concurrencyLimiter = pLimit(MAX_CONCURRENT_CALLS);

export async function throttle<T>(fn: () => Promise<T>, queueKey?: string): Promise<T> {
  await acquireFairTurn(queueKey);
  return concurrencyLimiter(() => withRetry(fn));
}
