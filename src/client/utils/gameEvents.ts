import {getPreferences} from '@/client/utils/PreferencesManager';
import {onServerEvent, setServerEventScope} from './serverEvents';

export type GameEventKind = 'game' | 'game-gone';

export type GameEventData = {
  gameId: string;
  gameAge: number;
  undoCount: number;
};

type Listener = (kind: GameEventKind, data?: GameEventData) => void;

/** Adds the player/spectator scope to the one shared connection of this page. */
export function startGameEvents(id: string): void {
  setServerEventScope({participant: id, lang: getPreferences().lang, status: true});
}

export function stopGameEvents(): void {
  setServerEventScope({participant: undefined, lang: undefined});
}

/** Subscribes to game saves and deletion; returns the unsubscribe function. */
export function onGameEvent(listener: Listener): () => void {
  const offGame = onServerEvent('game', (raw) => {
    let data: GameEventData | undefined;
    try {
      data = raw === undefined ? undefined : JSON.parse(raw);
    } catch {
      // A malformed event should not stop the page; the fallback poll will catch up
    }
    listener('game', data);
  });
  const offGone = onServerEvent('game-gone', () => listener('game-gone'));
  return () => {
    offGame();
    offGone();
  };
}
