import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import BoardSelector from '@/client/components/create/BoardSelector.vue';
import BoardPopup from '@/client/components/create/BoardPopup.vue';
import {BoardName} from '@/common/boards/BoardName';

function mountSelector(boards = [BoardName.HELLAS], shuffleMap: boolean = false, label = true, boardName?: BoardName) {
  return mount(BoardSelector, {
    ...globalConfig,
    global: {
      ...globalConfig.global,
      stubs: {...globalConfig.global.stubs, teleport: true},
    },
    props: {boards, shuffleMap, label, boardName},
  });
}

async function openPopup(wrapper: ReturnType<typeof mountSelector>) {
  await wrapper.find('#boardSelector-checkbox').setValue(true);
}

describe('BoardSelector', () => {
  it('mounts without errors', () => {
    const wrapper = mountSelector();
    expect(wrapper.exists()).to.be.true;
  });

  it('shows the current board on the button', () => {
    const wrapper = mountSelector();
    const text = wrapper.find('label[for="boardSelector-checkbox"]').text();
    expect(text).to.include('Board');
    expect(text).to.include(BoardName.HELLAS);
  });

  it('can omit the Board label when the card already shows it', () => {
    const wrapper = mountSelector([BoardName.HELLAS], false, false);
    const text = wrapper.find('label[for="boardSelector-checkbox"]').text();
    expect(text).not.include('Board');
    expect(text).to.include(BoardName.HELLAS);
  });

  it('shows the drawn board next to the random selection', () => {
    const wrapper = mountSelector([BoardName.HELLAS, BoardName.THARSIS], false, false, BoardName.HELLAS);
    const row = wrapper.find('.create-game-board-random-row');
    expect(row.text()).to.include(BoardName.HELLAS);
    expect(row.text()).to.include('Random (2)');
    // The board name is plain text; only the random label opens the popup.
    expect(wrapper.find('label[for="boardSelector-checkbox"]').text()).eq('Random (2)');
  });

  for (const run of [
    {shuffleMap: false},
    {shuffleMap: true},
  ] as const) {
    it(`shows a die only when board tiles are randomized ${JSON.stringify(run)}`, () => {
      const wrapper = mountSelector([BoardName.HELLAS], run.shuffleMap);
      expect(wrapper.find('label[for="boardSelector-checkbox"] .create-game-board-shuffled').exists()).eq(run.shuffleMap);
    });
  }

  it('opens the popup when the button is pressed', async () => {
    const wrapper = mountSelector();
    expect(wrapper.findComponent(BoardPopup).exists()).is.false;
    await openPopup(wrapper);
    const popup = wrapper.findComponent(BoardPopup);
    expect(popup.exists()).is.true;
    expect(popup.props('boards')).deep.eq([BoardName.HELLAS]);
  });

  it('emits the board chosen in the popup when validating', async () => {
    const wrapper = mountSelector();
    await openPopup(wrapper);
    await wrapper.find(`[data-test="board-${BoardName.ELYSIUM}"]`).trigger('click');
    await wrapper.find('.dialog-frame-foot .btn-primary').trigger('click');
    expect(wrapper.emitted('update:boards')).to.deep.eq([[[BoardName.ELYSIUM]]]);
    expect(wrapper.findComponent(BoardPopup).exists()).is.false;
  });

  it('passes the randomize board tiles choice through the popup', async () => {
    const wrapper = mountSelector();
    await openPopup(wrapper);
    const popup = wrapper.findComponent(BoardPopup);
    expect(popup.props('shuffleMap')).is.false;
    await wrapper.findAll('.create-game-switch')[1].setValue(true);
    expect(wrapper.emitted('update:shuffleMap')).is.undefined;
    await wrapper.find('.dialog-frame-foot .btn-primary').trigger('click');
    expect(wrapper.emitted('update:shuffleMap')).to.deep.eq([[true]]);
    expect(wrapper.findComponent(BoardPopup).exists()).is.false;
  });

  it('hides the popup when it closes without a selection', async () => {
    const wrapper = mountSelector();
    await openPopup(wrapper);
    await wrapper.findComponent(BoardPopup).vm.$emit('close');
    expect(wrapper.findComponent(BoardPopup).exists()).is.false;
    expect(wrapper.emitted('update:boards')).is.undefined;
  });
});
