const DEFAULT_KEY = "global";

const queuesByKey = new Map<string, (() => void)[]>();
const keyOrder: string[] = [];
let roundRobinCursor = 0;
let isDraining = false;

function registerKey(key: string): void {
  if (!queuesByKey.has(key)) {
    queuesByKey.set(key, []);
    keyOrder.push(key);
  }
}

function pickNextKey(): string | null {
  for (let attempts = 0; attempts < keyOrder.length; attempts += 1) {
    const key = keyOrder[roundRobinCursor % keyOrder.length];
    roundRobinCursor += 1;
    const queue = queuesByKey.get(key);
    if (queue && queue.length > 0) return key;
  }
  return null;
}

function pruneEmptyKeys(): void {
  for (let i = keyOrder.length - 1; i >= 0; i -= 1) {
    const queue = queuesByKey.get(keyOrder[i]);
    if (queue && queue.length === 0) {
      queuesByKey.delete(keyOrder[i]);
      keyOrder.splice(i, 1);
    }
  }
}

function drainQueues(): void {
  if (isDraining) return;
  isDraining = true;

  let nextKey = pickNextKey();
  while (nextKey !== null) {
    const queue = queuesByKey.get(nextKey);
    const admit = queue?.shift();
    pruneEmptyKeys();
    admit?.();
    nextKey = pickNextKey();
  }

  isDraining = false;
}

export function acquireFairTurn(key = DEFAULT_KEY): Promise<void> {
  return new Promise((resolve) => {
    registerKey(key);
    queuesByKey.get(key)!.push(resolve);
    drainQueues();
  });
}
