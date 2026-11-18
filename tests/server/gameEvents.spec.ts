import {expect} from 'chai';
import {subscribeGameEvents, notifyGameChanged, GameEvent} from '@/server/events/gameEvents';
import {notifyGameGone} from '@/server/database/gameGone';
import {GameId} from '@/common/Types';

describe('gameEvents', () => {
  it('sends each game version once, even when the game is saved twice', () => {
    const seen: Array<GameEvent> = [];
    const unsubscribe = subscribeGameEvents((event) => seen.push(event));
    const gameId = 'g-event-dedupe' as GameId;
    try {
      notifyGameChanged(gameId, 4, 0);
      notifyGameChanged(gameId, 4, 0);
      notifyGameChanged(gameId, 5, 0);
      notifyGameChanged(gameId, 5, 1);
      expect(seen.map((event) => `${event.gameAge}:${event.undoCount}`)).deep.eq(['4:0', '5:0', '5:1']);
    } finally {
      unsubscribe();
      notifyGameGone(gameId);
    }
  });

  it('forgets the last version when the game is gone', () => {
    const seen: Array<GameEvent> = [];
    const unsubscribe = subscribeGameEvents((event) => seen.push(event));
    const gameId = 'g-event-gone' as GameId;
    try {
      notifyGameChanged(gameId, 1, 0);
      notifyGameGone(gameId);
      notifyGameChanged(gameId, 1, 0);
      expect(seen).has.length(2);
    } finally {
      unsubscribe();
      notifyGameGone(gameId);
    }
  });
});
