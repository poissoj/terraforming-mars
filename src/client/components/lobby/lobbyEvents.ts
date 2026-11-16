import {paths} from '@/common/app/paths';
import {lobbyParticipantId} from './lobbyProfile';

export type LobbyEventKind = 'lobby' | 'lobby-chat';

type Listener = () => void;

const listeners: Record<LobbyEventKind, Set<Listener>> = {
  'lobby': new Set(),
  'lobby-chat': new Set(),
};

let source: EventSource | undefined;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let started = false;
let retryDelayMs = 2_000;

function emit(kind: LobbyEventKind): void {
  for (const listener of listeners[kind]) {
    try {
      listener();
    } catch (error) {
      console.error('Lobby event listener failed', error);
    }
  }
}

function connect(): void {
  if (!started || source !== undefined || typeof EventSource === 'undefined') {
    return;
  }
  try {
    const events = new EventSource(`${paths.API_EVENTS}?me=${encodeURIComponent(lobbyParticipantId())}`);
    source = events;
    events.addEventListener('lobby', () => emit('lobby'));
    events.addEventListener('lobby-chat', () => emit('lobby-chat'));
    events.onopen = () => {
      retryDelayMs = 2_000;
    };
    events.onerror = () => {
      if (source === events) {
        source = undefined;
      }
      events.close();
      if (started) {
        retryTimer = setTimeout(connect, retryDelayMs);
        retryDelayMs = Math.min(retryDelayMs * 2, 30_000);
      }
    };
  } catch (error) {
    console.warn('Lobby events unavailable, falling back to polling', error);
    if (started) {
      retryTimer = setTimeout(connect, retryDelayMs);
    }
  }
}

/** Starts the single SSE connection of this lobby page. Safe to call from both the page and the chat. */
export function startLobbyEvents(): void {
  if (started) {
    return;
  }
  started = true;
  retryDelayMs = 2_000;
  connect();
}

export function stopLobbyEvents(): void {
  started = false;
  if (retryTimer !== undefined) {
    clearTimeout(retryTimer);
    retryTimer = undefined;
  }
  source?.close();
  source = undefined;
}

/** Subscribes to a lobby invalidation event; returns the unsubscribe function. */
export function onLobbyEvent(kind: LobbyEventKind, listener: Listener): () => void {
  listeners[kind].add(listener);
  return () => listeners[kind].delete(listener);
}
