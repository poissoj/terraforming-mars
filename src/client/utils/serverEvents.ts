import {paths} from '@/common/app/paths';

export type ServerEventKind = 'lobby' | 'lobby-chat' | 'game' | 'game-gone' | 'server-status';
type Listener = (data?: string) => void;

type Scope = {
  me?: string;
  participant?: string;
  status?: boolean;
  lang?: string;
};

const listeners = new Map<ServerEventKind, Set<Listener>>();
let scope: Scope = {};
let source: EventSource | undefined;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let connectTimer: ReturnType<typeof setTimeout> | undefined;
let retryDelayMs = 2_000;
let connectionVersion = 0;

function emit(kind: ServerEventKind, data?: string): void {
  for (const listener of listeners.get(kind) ?? []) {
    try {
      listener(data);
    } catch (error) {
      console.error('Server event listener failed', error);
    }
  }
}

function closeSource(): void {
  if (retryTimer !== undefined) {
    clearTimeout(retryTimer);
    retryTimer = undefined;
  }
  if (connectTimer !== undefined) {
    clearTimeout(connectTimer);
    connectTimer = undefined;
  }
  source?.close();
  source = undefined;
}

// Pages set their scope in separate mounted hooks (App: status, then lobby/game): wait one tick,
// so the shared connection opens once with all scopes instead of once per hook.
function scheduleConnect(): void {
  if (connectTimer !== undefined) {
    clearTimeout(connectTimer);
  }
  connectTimer = setTimeout(() => {
    connectTimer = undefined;
    connect(connectionVersion);
  }, 0);
}

function connect(version: number): void {
  if (version !== connectionVersion || source !== undefined || typeof EventSource === 'undefined') {
    return;
  }
  if (scope.me === undefined && scope.participant === undefined && scope.status !== true) {
    return;
  }
  const params = new URLSearchParams();
  if (scope.me !== undefined) {
    params.set('me', scope.me);
  }
  if (scope.participant !== undefined) {
    params.set('id', scope.participant);
  }
  if (scope.status === true) {
    params.set('status', '1');
  }
  if (scope.lang !== undefined) {
    params.set('lang', scope.lang);
  }
  try {
    const events = new EventSource(`${paths.API_EVENTS}?${params.toString()}`);
    source = events;
    for (const kind of ['lobby', 'lobby-chat', 'game', 'game-gone', 'server-status'] as const) {
      events.addEventListener(kind, (event) => emit(kind, (event as MessageEvent).data));
    }
    events.onopen = () => {
      retryDelayMs = 2_000;
    };
    events.onerror = () => {
      if (source === events) {
        source = undefined;
      }
      events.close();
      if (version === connectionVersion) {
        retryTimer = setTimeout(() => connect(version), retryDelayMs);
        retryDelayMs = Math.min(retryDelayMs * 2, 30_000);
      }
    };
  } catch (error) {
    console.warn('Server events unavailable, falling back to polling', error);
    if (version === connectionVersion) {
      retryTimer = setTimeout(() => connect(version), retryDelayMs);
      retryDelayMs = Math.min(retryDelayMs * 2, 30_000);
    }
  }
}

/** Adds or removes one scope of the shared page connection; reconnects only when the query changes. */
export function setServerEventScope(next: Partial<Scope>): void {
  const merged = {...scope, ...next};
  if (merged.me === scope.me && merged.participant === scope.participant &&
      merged.status === scope.status && merged.lang === scope.lang) {
    return;
  }
  scope = merged;
  connectionVersion++;
  closeSource();
  retryDelayMs = 2_000;
  scheduleConnect();
}

export function clearServerEventScope(key: 'me' | 'participant' | 'status'): void {
  setServerEventScope(key === 'status' ? {status: false} : {[key]: undefined});
}

/** Subscribes to one kind of server event; returns the unsubscribe function. */
export function onServerEvent(kind: ServerEventKind, listener: Listener): () => void {
  let group = listeners.get(kind);
  if (group === undefined) {
    group = new Set();
    listeners.set(kind, group);
  }
  group.add(listener);
  return () => group?.delete(listener);
}

/** Only for tests and page teardown. */
export function stopServerEvents(): void {
  connectionVersion++;
  scope = {};
  closeSource();
}
