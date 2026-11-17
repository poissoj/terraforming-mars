import {lobbyParticipantId} from './lobbyProfile';
import {clearServerEventScope, onServerEvent, setServerEventScope} from '@/client/utils/serverEvents';

export type LobbyEventKind = 'lobby' | 'lobby-chat';

type Listener = () => void;

/** Adds the lobby scope to the one shared connection of this page. */
export function startLobbyEvents(): void {
  setServerEventScope({me: lobbyParticipantId(), status: true});
}

export function stopLobbyEvents(): void {
  clearServerEventScope('me');
}

/** Subscribes to a lobby invalidation event; returns the unsubscribe function. */
export function onLobbyEvent(kind: LobbyEventKind, listener: Listener): () => void {
  return onServerEvent(kind, listener);
}
