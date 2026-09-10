export interface SettledBatch<T> {
  values: T[];
  failureCount: number;
}

export interface SettleAllOptions {
  perItemTimeoutMs?: number;
}

function withCeiling<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`item exceeded ${timeoutMs}ms ceiling`)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function settleAll<T>(promises: Promise<T>[], options: SettleAllOptions = {}): Promise<SettledBatch<T>> {
  const bounded = options.perItemTimeoutMs
    ? promises.map((promise) => withCeiling(promise, options.perItemTimeoutMs!))
    : promises;
  const results = await Promise.allSettled(bounded);

  const values: T[] = [];
  let failureCount = 0;

  for (const result of results) {
    if (result.status === "fulfilled") {
      values.push(result.value);
    } else {
      failureCount += 1;
      console.warn("pipeline step failed, continuing:", result.reason);
    }
  }

  return { values, failureCount };
}
