import {paths} from '@/common/app/paths';

export type GameEventKind = 'game' | 'game-gone';
type Listener = (kind: GameEventKind) => void;

const listeners = new Set<Listener>();
let source: EventSource | undefined;
let sourceId: string | undefined;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let retryDelayMs = 2_000;

function emit(kind: GameEventKind): void {
  for (const listener of listeners) {
    try {
      listener(kind);
    } catch (error) {
      console.error('Game event listener failed', error);
    }
  }
}

function connect(id: string): void {
  if (source !== undefined || typeof EventSource === 'undefined') {
    return;
  }
  try {
    const events = new EventSource(`${paths.API_EVENTS}?id=${encodeURIComponent(id)}`);
    source = events;
    events.addEventListener('game', () => emit('game'));
    events.addEventListener('game-gone', () => emit('game-gone'));
    events.onopen = () => {
      retryDelayMs = 2_000;
    };
    events.onerror = () => {
      if (source === events) {
        source = undefined;
      }
      events.close();
      if (sourceId !== undefined) {
        retryTimer = setTimeout(() => connect(sourceId as string), retryDelayMs);
        retryDelayMs = Math.min(retryDelayMs * 2, 30_000);
      }
    };
  } catch (error) {
    console.warn('Game events unavailable, falling back to polling', error);
    if (sourceId !== undefined) {
      retryTimer = setTimeout(() => connect(sourceId as string), retryDelayMs);
      retryDelayMs = Math.min(retryDelayMs * 2, 30_000);
    }
  }
}

/** Starts the single SSE connection for a player or spectator page. */
export function startGameEvents(id: string): void {
  if (sourceId === id && source !== undefined) {
    return;
  }
  stopGameEvents();
  sourceId = id;
  retryDelayMs = 2_000;
  connect(id);
}

export function stopGameEvents(): void {
  sourceId = undefined;
  if (retryTimer !== undefined) {
    clearTimeout(retryTimer);
    retryTimer = undefined;
  }
  source?.close();
  source = undefined;
}

/** Subscribes to game saves and deletion; returns the unsubscribe function. */
export function onGameEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
