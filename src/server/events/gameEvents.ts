import {GameId} from '../../common/Types';
import {onGameGone} from '../database/gameGone';

export type GameEvent = {
  gameId: GameId;
  gameAge: number;
  undoCount: number;
};

type Listener = (event: GameEvent) => void;

const listeners = new Set<Listener>();
// Last save version sent per game: GameLoader can save the same state twice in one move
const lastVersions = new Map<GameId, string>();

onGameGone((gameId) => lastVersions.delete(gameId));

/** Subscribes one SSE connection to game saves; returns the unsubscribe function. */
export function subscribeGameEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Called after a game was persisted, so open player pages can refresh without polling. */
export function notifyGameChanged(gameId: GameId, gameAge: number, undoCount: number): void {
  const version = `${gameAge}:${undoCount}`;
  if (lastVersions.get(gameId) === version) {
    return;
  }
  lastVersions.set(gameId, version);
  const event: GameEvent = {gameId, gameAge, undoCount};
  for (const listener of listeners) {
    try {
      listener(event);
    } catch (error) {
      console.error('Game event listener failed', error);
    }
  }
}
