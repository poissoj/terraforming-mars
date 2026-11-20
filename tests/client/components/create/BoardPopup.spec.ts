import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import BoardPopup from '@/client/components/create/BoardPopup.vue';
import {BoardName} from '@/common/boards/BoardName';
import {RandomBoardOption} from '@/common/boards/RandomBoardOption';
import {boardOptions} from '@/common/boards/randomBoardOptions';

function mountPopup(boards = [BoardName.THARSIS], shuffleMap: boolean = false) {
  return mount(BoardPopup, {
    ...globalConfig,
    global: {
      ...globalConfig.global,
      stubs: {...globalConfig.global.stubs, teleport: true},
    },
    props: {boards, shuffleMap},
  });
}

function board(wrapper: ReturnType<typeof mountPopup>, boardName: BoardName) {
  return wrapper.find(`[data-test="board-${boardName}"]`);
}

function switches(wrapper: ReturnType<typeof mountPopup>) {
  return wrapper.findAll<HTMLInputElement>('.create-game-switch');
}

describe('BoardPopup', () => {
  it('mounts without errors', () => {
    expect(mountPopup().exists()).to.be.true;
  });

  it('checks the current board', () => {
    const wrapper = mountPopup([BoardName.HELLAS]);
    expect(board(wrapper, BoardName.HELLAS).classes()).includes('create-game-chip--selected');
    expect(board(wrapper, BoardName.THARSIS).classes()).not.includes('create-game-chip--selected');
    expect(board(wrapper, BoardName.HELLAS).find('.create-game-board-hexagon').exists()).is.true;
  });

  it('a fixed board replaces the selection', async () => {
    const wrapper = mountPopup();
    await board(wrapper, BoardName.ELYSIUM).trigger('click');
    expect(board(wrapper, BoardName.ELYSIUM).classes()).includes('create-game-chip--selected');
    expect(board(wrapper, BoardName.THARSIS).classes()).not.includes('create-game-chip--selected');
    expect(wrapper.emitted('update:boards')).is.undefined;
  });

  it('random board starts with the official pool and can switch to all boards', async () => {
    const wrapper = mountPopup();
    await switches(wrapper)[0].setValue(true);
    const official = boardOptions(RandomBoardOption.OFFICIAL);
    for (const boardName of official) {
      expect(board(wrapper, boardName).classes()).includes('create-game-chip--selected');
    }
    const allButton = wrapper.findAll('.create-game-segmented button')[1];
    await allButton.trigger('click');
    expect(board(wrapper, BoardName.HOLLANDIA).classes()).includes('create-game-chip--selected');
    expect(wrapper.emitted('update:boards')).is.undefined;
  });

  it('keeps board choices local until Apply', async () => {
    const wrapper = mountPopup();
    await switches(wrapper)[0].setValue(true);
    await board(wrapper, BoardName.HOLLANDIA).trigger('click');
    await switches(wrapper)[1].setValue(true);
    expect(wrapper.emitted('update:boards')).is.undefined;
    expect(wrapper.emitted('update:shuffleMap')).is.undefined;

    await wrapper.find('.dialog-frame-foot .btn-primary').trigger('click');
    const emittedBoards = wrapper.emitted('update:boards');
    expect(emittedBoards).has.length(1);
    expect(emittedBoards?.[0][0]).includes(BoardName.HOLLANDIA);
    expect(wrapper.emitted('update:shuffleMap')).deep.eq([[true]]);
    expect(wrapper.emitted('close')).has.length(1);
  });

  it('closes without applying changes', async () => {
    const wrapper = mountPopup();
    await board(wrapper, BoardName.ELYSIUM).trigger('click');
    await switches(wrapper)[1].setValue(true);
    await wrapper.find('.dialog-frame-close').trigger('click');
    expect(wrapper.emitted('close')).has.length(1);
    expect(wrapper.emitted('update:boards')).is.undefined;
    expect(wrapper.emitted('update:shuffleMap')).is.undefined;
  });

  it('shows whether board tiles are randomized', () => {
    const wrapper = mountPopup([BoardName.THARSIS], true);
    expect(switches(wrapper)[1].element.checked).is.true;
  });
});
