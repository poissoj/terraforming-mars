import {ServerStatusModel} from '../../common/models/ServerStatusModel';
import {rustAiOffered} from '../ai/rust/RustMirror';
import {isServerUpdating, serverStartedAt, serverUpdateCommits} from './serverUpdate';
import {activeParticipantCount} from './activeParticipants';

/** Status snapshot shared by the polling route, the SSE stream and the broadcast timer. */
export function currentServerStatus(): ServerStatusModel {
  const status: ServerStatusModel = {
    updating: isServerUpdating(),
    startedAt: serverStartedAt,
    activeParticipants: activeParticipantCount(),
    newAi: rustAiOffered(),
  };
  const commits = serverUpdateCommits();
  if (commits.length > 0) {
    status.updateCommits = commits;
  }
  return status;
}
