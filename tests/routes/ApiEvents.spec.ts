import {expect} from 'chai';
import {ApiEvents} from '@/server/routes/ApiEvents';
import {Lobby} from '@/server/lobby/Lobby';
import {memoryStorage} from '@/server/lobby/lobbyStorage';
import {notifyLobbyEvent} from '@/server/events/lobbyEvents';
import {notifyGameChanged} from '@/server/events/gameEvents';
import {notifyServerStatus} from '@/server/events/serverStatusEvents';
import {notifyGameGone} from '@/server/database/gameGone';
import {RouteTestScaffolding} from './RouteTestScaffolding';
import {MockResponse} from './HttpMocks';
import {Game} from '@/server/Game';
import {TestPlayer} from '../TestPlayer';

describe('ApiEvents', () => {
  it('streams lobby invalidations until the client disconnects', async () => {
    const lobby = new Lobby(() => 1_000_000, () => 'room', memoryStorage());
    const scaffolding = new RouteTestScaffolding();
    scaffolding.url = '/api/events?me=hosthosthosthost01';
    const response = new MockResponse();

    const request = scaffolding.get(new ApiEvents(lobby), response);
    notifyLobbyEvent('lobby');
    notifyLobbyEvent('lobby-chat');

    expect(response.headers.get('Content-Type')).eq('text/event-stream; charset=utf-8');
    expect(response.headers.get('Cache-Control')).eq('no-cache, no-transform');
    expect(response.headers.get('X-Accel-Buffering')).eq('no');
    expect(response.content).contains(': connected');
    expect(response.content).contains('event: lobby\n');
    expect(response.content).contains('event: lobby-chat\n');

    scaffolding.req.emitClose();
    await request;
  });

  it('streams server status snapshots', async () => {
    const lobby = new Lobby(() => 1_000_000, () => 'room', memoryStorage());
    const scaffolding = new RouteTestScaffolding();
    scaffolding.url = '/api/events?status=1';
    const response = new MockResponse();

    const request = scaffolding.get(new ApiEvents(lobby), response);
    notifyServerStatus({updating: true, startedAt: 7, activeParticipants: 2});
    scaffolding.req.emitClose();
    await request;

    expect(response.content).contains('event: server-status\n');
    expect(response.content).contains('"updating":true');
    expect(response.content).contains('"activeParticipants":2');
  });

  it('streams game saves and deletion for a player page', async () => {
    const player = TestPlayer.BLUE.newPlayer();
    const game = Game.newInstance('g-events', [player], player, 's-events');
    const lobby = new Lobby(() => 1_000_000, () => 'room', memoryStorage());
    const scaffolding = new RouteTestScaffolding();
    await scaffolding.ctx.gameLoader.add(game);
    scaffolding.url = '/api/events?id=' + player.id;
    const response = new MockResponse();

    const request = scaffolding.get(new ApiEvents(lobby), response);
    await Promise.resolve();
    notifyGameChanged(game.id, 2, 1);
    notifyGameGone(game.id);
    scaffolding.req.emitClose();
    await request;

    expect(response.content).contains('event: game\n');
    expect(response.content).contains('"gameAge":2');
    expect(response.content).contains('event: game-gone\n');
  });
});
