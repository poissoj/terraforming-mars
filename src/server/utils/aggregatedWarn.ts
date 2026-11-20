type PendingWarning = {
  message: string;
  count: number;
  startedAt: number;
  timer: ReturnType<typeof setTimeout>;
};

const pending = new Map<string, PendingWarning>();

// AI simulations try out moves that may break rules on purpose. Their warnings must not reach
// the server log, including the delayed summaries created by the aggregation below.
let suppressionDepth = 0;

/** While suppressed, warnings are neither logged nor kept for a delayed summary. */
export function suppressAggregatedWarnings(): void {
  suppressionDepth++;
}

export function restoreAggregatedWarnings(): void {
  suppressionDepth = Math.max(0, suppressionDepth - 1);
}

/**
 * Logs the first occurrence immediately, then one summary after the window. Used for repeated runtime
 * faults (AI retries, illegal states) that would otherwise flood the server log.
 */
export function warnAggregated(key: string, message: string, windowMs: number = 30_000): void {
  if (suppressionDepth > 0) {
    return;
  }
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
  suppressionDepth = 0;
}
