import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import PlayersTableHeader from '@/client/components/overview/PlayersTableHeader.vue';
import {Tag} from '@/common/cards/Tag';

const tagColumns = [[Tag.BUILDING, Tag.SPACE], [Tag.EVENT]];

describe('PlayersTableHeader', () => {
  it('renders a column head per visible tag and the score icons', () => {
    const header = shallowMount(PlayersTableHeader, {...globalConfig, props: {tagColumns}});
    expect(header.findAll('[data-test^="tag-head-"]')).to.have.length(3);
    expect(header.findAllComponents({name: 'ScoreIcon'})).to.have.length(4);
    expect(header.findComponent({name: 'GameMenu'}).exists()).to.be.true;
  });
});
