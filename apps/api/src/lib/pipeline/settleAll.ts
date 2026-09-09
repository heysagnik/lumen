
export interface SettledBatch<T> {
  values: T[];
  failureCount: number;
}

export async function settleAll<T>(promises: Promise<T>[]): Promise<SettledBatch<T>> {
  const results = await Promise.allSettled(promises);

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
