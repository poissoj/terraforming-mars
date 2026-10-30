import {flushPromises, shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {vi} from 'vitest';
import {globalConfig} from '@tests/client/components/getLocalVue';
import App from '@/client/components/App.vue';

// The start screen loads several large chunks (planet assets, i18n, …) after the mount. Stub it so the
// smoke test only checks App itself and no chunk can resolve after Vitest tore the environment down.
vi.mock('@/client/components/StartScreen.vue', () => ({
  default: {name: 'StartScreen', render: () => null},
}));

describe('App', () => {
  it('mounts without errors', async () => {
    const wrapper = shallowMount(App, globalConfig);
    expect(wrapper.exists()).to.be.true;
    await flushPromises();
    wrapper.unmount();
  });
});
