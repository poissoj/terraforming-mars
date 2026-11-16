export type LobbyEvent = 'lobby' | 'lobby-chat';

type Listener = (event: LobbyEvent) => void;

const listeners = new Set<Listener>();

/** Subscribes an SSE connection to lobby changes; returns the unsubscribe function. */
export function subscribeLobbyEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Notifies every open lobby page that its data may have changed. */
export function notifyLobbyEvent(event: LobbyEvent): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch (error) {
      // A broken browser connection must not stop the lobby action that caused the event.
      console.error('Lobby event listener failed', error);
    }
  }
}
