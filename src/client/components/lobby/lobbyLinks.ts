import {LobbyRoomModel} from '@/common/lobby/LobbyModel';
import {appUrl} from '@/client/utils/appUrl';

/** "Continue" into an own running game (list row and room dialog): the own player page */
export function continueHref(room: LobbyRoomModel): string | undefined {
  return room.state === 'started' && room.yourPlayerId !== undefined ? appUrl('player?id=' + room.yourPlayerId) : undefined;
}
