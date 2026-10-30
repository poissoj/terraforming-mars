import {flushPromises, shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '@tests/client/components/getLocalVue';
import App from '@/client/components/App.vue';

describe('App', () => {
  it('mounts without errors', async () => {
    const wrapper = shallowMount(App, globalConfig);
    expect(wrapper.exists()).to.be.true;
    // Let the async screen components (StartScreen et al.) finish importing before the test environment is torn down.
    await flushPromises();
    wrapper.unmount();
  });
});
