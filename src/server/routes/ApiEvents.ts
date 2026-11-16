import {Handler} from './Handler';
import {Context} from './IHandler';
import {Request} from '../Request';
import {Response} from '../Response';
import {RouteError} from './RouteError';
import {isParticipantId} from '../../common/lobby/LobbyModel';
import {Lobby} from '../lobby/Lobby';
import {subscribeLobbyEvents} from '../events/lobbyEvents';

/** Keeps proxies from closing an idle SSE connection. */
export const SSE_HEARTBEAT_MS = 20_000;
/** A page needs one connection; this only stops a client from opening hundreds. */
export const MAX_CONNECTIONS_PER_IP = 10;

const connectionsByIp = new Map<string, number>();

/**
 * Server-Sent Events for the lobby: the polling list and chat still provide the data, this stream only
 * tells open pages when to fetch them again. Kept deliberately one-way; player actions stay normal POSTs.
 */
export class ApiEvents extends Handler {
  public static readonly INSTANCE = new ApiEvents();
  constructor(private readonly lobby: Lobby = Lobby.INSTANCE) {
    super();
  }

  public override async get(req: Request, res: Response, ctx: Context): Promise<void> {
    const me = ctx.urlParams.stringOrUndefined('me');
    if (!isParticipantId(me)) {
      throw RouteError.badRequest('Invalid participant');
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
    this.lobby.heartbeat(me);

    let closed = false;
    const unsubscribe = subscribeLobbyEvents((event) => {
      if (!closed) {
        res.write(`event: ${event}\ndata: {}\n\n`);
      }
    });
    const heartbeat = setInterval(() => {
      if (closed) {
        return;
      }
      res.write(': heartbeat\n\n');
      this.lobby.heartbeat(me);
    }, SSE_HEARTBEAT_MS);

    const cleanup = () => {
      if (closed) {
        return;
      }
      closed = true;
      clearInterval(heartbeat);
      unsubscribe();
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
