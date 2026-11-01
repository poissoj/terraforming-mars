import {PublicPlayerModel} from '@/common/models/PlayerModel';
import {ActionLabel} from '@/client/components/overview/ActionLabel';
import {InterfaceTagsType} from '@/client/components/overview/playerTagDetails';

// Player list as a table: the arrangement follows the width of its column in players_table.less
// (container queries). Only the row model and the own-row spacer tracks remain here.

// One table row: player plus what PlayersOverview already computes for the classic bar
export type PlayersTableRowModel = {
  player: PublicPlayerModel;
  firstForGen: boolean;
  actionLabel: ActionLabel;
  playerIndex: number;
};

// Visible tag columns in groups (main tags | special tags), separated by a gap as in the classic bar
export type TagColumnGroups = Array<Array<InterfaceTagsType>>;

export type RowTracks = {template: string, lines: Array<number>};

// Grid rows of the player list: every player gets a 1fr track, so all rows are as high as the highest one.
// The own row keeps its extra distance through narrow spacer tracks instead of a margin - a margin would
// eat into its 1fr track and make it lower than the others.
export function rowTracks(ownRows: ReadonlyArray<boolean>): RowTracks {
  const tracks: Array<string> = [];
  const lines: Array<number> = [];
  const spacer = 'var(--players-table-own-row-spacer)';
  ownRows.forEach((own, index) => {
    if (own && index > 0) {
      tracks.push(spacer);
    }
    tracks.push('1fr');
    lines.push(tracks.length);
    if (own && index < ownRows.length - 1) {
      tracks.push(spacer);
    }
  });
  return {template: tracks.join(' '), lines};
}
