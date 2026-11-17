import {ServerStatusModel} from '../../common/models/ServerStatusModel';

type Listener = (status: ServerStatusModel) => void;
const listeners = new Set<Listener>();

export function subscribeServerStatus(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyServerStatus(status: ServerStatusModel): void {
  for (const listener of listeners) {
    try {
      listener(status);
    } catch (error) {
      console.error('Server status listener failed', error);
    }
  }
}
