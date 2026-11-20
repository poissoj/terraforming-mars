export type GameLifecycleEvent = 'created' | 'finished' | 'deleted' | 'restored' | 'lobby-started';

type LogValue = string | number | boolean | undefined;

function formatValue(value: string | number | boolean): string {
  const text = String(value);
  return /[\s="]/u.test(text) ? JSON.stringify(text) : text;
}

/** Compact duration for logs: 42s, 7m, 1h24m, 2d3h. */
export function formatLogDuration(milliseconds: number): string {
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest === 0 ? `${hours}h` : `${hours}h${rest}m`;
  }
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest === 0 ? `${days}d` : `${days}d${rest}h`;
}

/**
 * One grep-friendly line per game lifecycle event, with a stable `key=value` shape.
 * Metrics cover the counts; these lines answer "which game, and why?" in the server log.
 */
export function logGameLifecycle(event: GameLifecycleEvent, fields: Record<string, LogValue>): void {
  const details = Object.entries(fields)
    .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined)
    .map(([key, value]) => `${key}=${formatValue(value)}`)
    .join(' ');
  console.log(`[${new Date().toISOString()}] [game] ${event}${details === '' ? '' : ' ' + details}`);
}
