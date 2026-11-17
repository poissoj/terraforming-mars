import {GameId} from '../../common/Types';

export type GameEvent = {
  gameId: GameId;
  gameAge: number;
  undoCount: number;
};

type Listener = (event: GameEvent) => void;

const listeners = new Set<Listener>();

/** Subscribes one SSE connection to game saves; returns the unsubscribe function. */
export function subscribeGameEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Called after a game was persisted, so open player pages can refresh without polling. */
export function notifyGameChanged(gameId: GameId, gameAge: number, undoCount: number): void {
  const event: GameEvent = {gameId, gameAge, undoCount};
  for (const listener of listeners) {
    try {
      listener(event);
    } catch (error) {
      console.error('Game event listener failed', error);
    }
  }
}
