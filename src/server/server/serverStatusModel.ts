import {ServerStatusModel} from '../../common/models/ServerStatusModel';
import {isServerUpdating, serverStartedAt, serverUpdateCommits} from './serverUpdate';
import {activeParticipantCount} from './activeParticipants';

/** Status snapshot shared by the polling route, the SSE stream and the broadcast timer. */
export function currentServerStatus(): ServerStatusModel {
  const status: ServerStatusModel = {
    updating: isServerUpdating(),
    startedAt: serverStartedAt,
    activeParticipants: activeParticipantCount(),
  };
  const commits = serverUpdateCommits();
  if (commits.length > 0) {
    status.updateCommits = commits;
  }
  return status;
}
