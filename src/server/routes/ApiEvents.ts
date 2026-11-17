import {Handler} from './Handler';
import {Context} from './IHandler';
import {Request} from '../Request';
import {Response} from '../Response';
import {RouteError} from './RouteError';
import {isParticipantId} from '../../common/lobby/LobbyModel';
import {isPlayerId, isSpectatorId} from '../../common/Types';
import {Lobby} from '../lobby/Lobby';
import {subscribeLobbyEvents} from '../events/lobbyEvents';
import {subscribeGameEvents} from '../events/gameEvents';
import {onGameGone} from '../database/gameGone';

/** Keeps proxies from closing an idle SSE connection. */
export const SSE_HEARTBEAT_MS = 20_000;
/** A page needs one connection; this only stops a client from opening hundreds. */
export const MAX_CONNECTIONS_PER_IP = 10;

const connectionsByIp = new Map<string, number>();

/**
 * Server-Sent Events for the lobby and a game page: the polling endpoints still provide the data, this stream
 * only tells open pages when to fetch them again. Kept deliberately one-way; player actions stay normal POSTs.
 */
export class ApiEvents extends Handler {
  public static readonly INSTANCE = new ApiEvents();
  constructor(private readonly lobby: Lobby = Lobby.INSTANCE) {
    super();
  }

  public override async get(req: Request, res: Response, ctx: Context): Promise<void> {
    const me = ctx.urlParams.stringOrUndefined('me');
    const participant = ctx.urlParams.stringOrUndefined('id');
    if (me !== undefined && !isParticipantId(me)) {
      throw RouteError.badRequest('Invalid participant');
    }
    if (participant !== undefined && !isPlayerId(participant) && !isSpectatorId(participant)) {
      throw RouteError.badRequest('Invalid participant');
    }
    if (me === undefined && participant === undefined) {
      throw RouteError.badRequest('Missing participant');
    }

    const game = participant === undefined ? undefined : await ctx.gameLoader.getGame(participant);
    if (participant !== undefined && game === undefined) {
      throw RouteError.notFound('cannot find game for that player');
    }

    const openConnections = connectionsByIp.get(ctx.ip) ?? 0;
    if (openConnections >= MAX_CONNECTIONS_PER_IP) {
      throw RouteError.tooManyRequests('Too many event streams');
    }
    connectionsByIp.set(ctx.ip, openConnections + 1);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    // nginx buffers proxied responses by default, which would defeat a stream
    res.setHeader('X-Accel-Buffering', 'no');
    res.write(': connected\n\n');

    let closed = false;
    const unsubscribers: Array<() => void> = [];
    const send = (event: string, data: object = {}) => {
      if (!closed) {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      }
    };

    if (me !== undefined) {
      this.lobby.heartbeat(me);
      unsubscribers.push(subscribeLobbyEvents((event) => send(event)));
    }
    if (game !== undefined) {
      const gameId = game.id;
      unsubscribers.push(subscribeGameEvents((event) => {
        if (event.gameId === gameId) {
          send('game', event);
        }
      }));
      unsubscribers.push(onGameGone((goneId) => {
        if (goneId === gameId) {
          send('game-gone');
        }
      }));
    }

    const heartbeat = setInterval(() => {
      if (!closed) {
        res.write(': heartbeat\n\n');
        if (me !== undefined) {
          this.lobby.heartbeat(me);
        }
      }
    }, SSE_HEARTBEAT_MS);

    const cleanup = () => {
      if (closed) {
        return;
      }
      closed = true;
      clearInterval(heartbeat);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      const remaining = (connectionsByIp.get(ctx.ip) ?? 1) - 1;
      if (remaining <= 0) {
        connectionsByIp.delete(ctx.ip);
      } else {
        connectionsByIp.set(ctx.ip, remaining);
      }
    };

    // The request stays open for the lifetime of the page. 'close' also fires when the browser goes away.
    await new Promise<void>((resolve) => {
      req.once('close', () => {
        cleanup();
        try {
          res.end();
        } catch {
          // The client may already have closed the socket.
        }
        resolve();
      });
    });
  }
}
