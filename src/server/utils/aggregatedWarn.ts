type PendingWarning = {
  message: string;
  count: number;
  startedAt: number;
  timer: ReturnType<typeof setTimeout>;
};

const pending = new Map<string, PendingWarning>();

/**
 * Logs the first occurrence immediately, then one summary after the window. Used for repeated runtime
 * faults (AI retries, illegal states) that would otherwise flood the server log.
 */
export function warnAggregated(key: string, message: string, windowMs: number = 30_000): void {
  const existing = pending.get(key);
  if (existing !== undefined) {
    existing.count++;
    return;
  }
  const entry: PendingWarning = {
    message,
    count: 1,
    startedAt: Date.now(),
    timer: setTimeout(() => flush(key), windowMs),
  };
  entry.timer.unref?.();
  pending.set(key, entry);
  console.warn(message);
}

function flush(key: string): void {
  const entry = pending.get(key);
  if (entry === undefined) {
    return;
  }
  pending.delete(key);
  if (entry.count > 1) {
    const seconds = Math.max(1, Math.round((Date.now() - entry.startedAt) / 1000));
    console.warn(`${entry.message} [repeated ${entry.count} times in ${seconds} s]`);
  }
}

/** Only for tests. */
export function resetAggregatedWarnings(): void {
  for (const entry of pending.values()) {
    clearTimeout(entry.timer);
  }
  pending.clear();
}
