import {expect} from 'chai';
import {ApiEvents} from '@/server/routes/ApiEvents';
import {Lobby} from '@/server/lobby/Lobby';
import {memoryStorage} from '@/server/lobby/lobbyStorage';
import {notifyLobbyEvent} from '@/server/events/lobbyEvents';
import {RouteTestScaffolding} from './RouteTestScaffolding';
import {MockResponse} from './HttpMocks';

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
});
