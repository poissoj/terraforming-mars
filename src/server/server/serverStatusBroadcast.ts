import {currentServerStatus} from './serverStatusModel';
import {notifyServerStatus} from '../events/serverStatusEvents';

let previous = '';

/** Watches the update flag and active participants; pushes a snapshot only when it changed. */
export function startServerStatusBroadcast(): void {
  const tick = () => {
    const status = currentServerStatus();
    const serialized = JSON.stringify(status);
    if (serialized !== previous) {
      previous = serialized;
      notifyServerStatus(status);
    }
  };
  tick();
  setInterval(tick, 1000).unref();
}
