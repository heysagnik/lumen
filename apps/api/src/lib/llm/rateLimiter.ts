
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createSteadyRateLimiter(maxCallsPerWindow: number, windowMs: number) {
  const minIntervalMs = windowMs / maxCallsPerWindow;
  let nextAvailableAt = 0;
  let admissionQueue: Promise<void> = Promise.resolve();

  async function waitForTurn(): Promise<void> {
    const now = Date.now();
    const scheduledAt = Math.max(now, nextAvailableAt);
    nextAvailableAt = scheduledAt + minIntervalMs;
    const delayMs = scheduledAt - now;
    if (delayMs > 0) await sleep(delayMs);
  }

  function acquire(): Promise<void> {
    const turn = admissionQueue.then(waitForTurn);
    admissionQueue = turn.then(
      () => undefined,
      () => undefined,
    );
    return turn;
  }

  return { acquire };
}
