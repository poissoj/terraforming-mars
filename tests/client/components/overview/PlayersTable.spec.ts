import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import PlayersTable from '@/client/components/overview/PlayersTable.vue';
import {Tag} from '@/common/cards/Tag';
import {Color} from '@/common/Color';
import {Resource} from '@/common/Resource';
import {rowTracks} from '@/client/components/overview/playersTableLayout';
import {emptyTags, fakePublicPlayerModel, fakeViewModel} from '../testHelpers';

function mountTable() {
  const me = fakePublicPlayerModel({color: 'blue' as Color, megacreditProduction: 17, heatProduction: 0, tags: {...emptyTags(), [Tag.BUILDING]: 3}});
  const other = fakePublicPlayerModel({color: 'red' as Color, megacreditProduction: 17, heatProduction: 8, tags: {...emptyTags(), [Tag.SPACE]: 2}});
  const playerView = fakeViewModel({players: [other, me], thisPlayer: me});
  return shallowMount(PlayersTable, {
    ...globalConfig,
    props: {
      playerView,
      rows: [
        {player: other, firstForGen: true, actionLabel: 'passed', playerIndex: 0},
        {player: me, firstForGen: false, actionLabel: 'active', playerIndex: 1},
      ],
    },
  });
}

describe('PlayersTable', () => {
  it('gives every player an equal 1fr track and keeps the own row apart with spacer tracks', () => {
    const spacer = 'var(--players-table-own-row-spacer)';
    expect(rowTracks([false, true, false])).to.deep.eq({template: `1fr ${spacer} 1fr ${spacer} 1fr`, lines: [1, 3, 5]});
    expect(rowTracks([false, false, true])).to.deep.eq({template: `1fr 1fr ${spacer} 1fr`, lines: [1, 2, 4]});
    expect(rowTracks([false, false])).to.deep.eq({template: '1fr 1fr', lines: [1, 2]});
  });

  it('shows only tags that at least one player has', () => {
    const table = mountTable().vm;
    expect(table.tagColumns.flat()).to.deep.eq([Tag.BUILDING, Tag.SPACE]);
  });

  it('marks only a sole production leader', () => {
    const table = mountTable().vm;
    // M€ production is equal (no leader), only Red has heat
    expect(table.productionLeadersByColor).to.deep.eq({red: [Resource.HEAT]});
  });
});
