import {expect} from 'chai';
import {shallowMount, VueWrapper} from '@vue/test-utils';
import {globalConfig} from '../getLocalVue';
import CardVictoryPoints from '@/client/components/card/CardVictoryPoints.vue';
import CardRenderItemComponent from '@/client/components/card/CardRenderItemComponent.vue';
import {CardRenderDynamicVictoryPoints} from '@/common/cards/render/CardRenderDynamicVictoryPoints';
import {CardRenderItemType} from '@/common/cards/render/CardRenderItemType';
import {ICardRenderItem} from '@/common/cards/render/Types';
import {RecursivePartial} from '@/common/utils/utils';
import {CardResource} from '@/common/CardResource';
import {Tag} from '@/common/cards/Tag';

describe('CardVictoryPoints', () => {
  let wrapper: VueWrapper;

  beforeEach(() => {
    wrapper = shallowMount(CardVictoryPoints, {
      ...globalConfig,
      props: {
        victoryPoints: 0,
      },
    });
  });
  function itemProps(): ICardRenderItem {
    return wrapper.findComponent(CardRenderItemComponent).props('item') as ICardRenderItem;
  }

  it('straight points', async () => {
    await wrapper.setProps({
      victoryPoints: 2,
    });
    expect(wrapper.text()).to.eq('2');
    expect(wrapper.find('[data-test=item]').exists()).is.false;
  });
  it('renders ?', async () => {
    await wrapper.setProps(prop({}));
    expect(wrapper.text()).to.eq('?');
  });
  it('points without item', async () => {
    await wrapper.setProps(prop({
      points: 5,
      target: 5,
    }));
    expect(wrapper.text()).to.eq('5');
    expect(wrapper.find('[data-test=item]').exists()).is.false;
  });
  it('renders points with item - points = target 10/', async () => {
    await wrapper.setProps(prop({item: {type: CardRenderItemType.RESOURCE, resource: CardResource.CAMP}, points: 10, target: 10}));
    expect(wrapper.text()).to.equal('10/');
    expect(itemProps().type).eq('resource');
    expect(itemProps().resource).eq('Camp');
  });
  it('renders points with item - points = target 5/10', async () => {
    await wrapper.setProps(prop({item: {type: CardRenderItemType.RESOURCE, resource: CardResource.ASTEROID}, points: 5, target: 10}));
    expect(wrapper.text()).to.equal('5/10');
    expect(itemProps().type).eq('resource');
    expect(itemProps().resource).eq('Asteroid');
  });
  it('search for life', async () => {
    await wrapper.setProps(prop({item: {type: CardRenderItemType.TAG, tag: Tag.SCIENCE}, targetOneOrMore: true}));
    expect(wrapper.text()).to.equal('*:3');
    expect(itemProps().type).eq('tag');
    expect(itemProps().tag).eq('science');
  });


  function prop(vps: RecursivePartial<CardRenderDynamicVictoryPoints>) {
    return {
      victoryPoints: {
        item: undefined,
        points: 0,
        target: 0,
        targetOneOrMore: false,
        anyPlayer: false,
        ...vps,
      },
    };
  }
});
