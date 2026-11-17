import {getPreferences} from '@/client/utils/PreferencesManager';
import {onServerEvent, setServerEventScope} from './serverEvents';

export type GameEventKind = 'game' | 'game-gone';

type Listener = (kind: GameEventKind) => void;

/** Adds the player/spectator scope to the one shared connection of this page. */
export function startGameEvents(id: string): void {
  setServerEventScope({participant: id, lang: getPreferences().lang, status: true});
}

export function stopGameEvents(): void {
  setServerEventScope({participant: undefined, lang: undefined});
}

/** Subscribes to game saves and deletion; returns the unsubscribe function. */
export function onGameEvent(listener: Listener): () => void {
  const offGame = onServerEvent('game', () => listener('game'));
  const offGone = onServerEvent('game-gone', () => listener('game-gone'));
  return () => {
    offGame();
    offGone();
  };
}
