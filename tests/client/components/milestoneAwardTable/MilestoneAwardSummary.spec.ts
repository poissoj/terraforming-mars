import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import MilestoneAwardSummary from '@/client/components/milestoneAwardTable/MilestoneAwardSummary.vue';
import {awardTooltip, milestoneTooltip} from '@/client/components/milestoneAwardTable/milestoneAwardTooltips';
import {getAward, getMilestone} from '@/client/MilestoneAwardManifest';
import {ClaimedMilestoneModel} from '@/common/models/ClaimedMilestoneModel';
import {FundedAwardModel} from '@/common/models/FundedAwardModel';

const milestones: Array<ClaimedMilestoneModel> = [
  {name: 'Terraformer', playerName: undefined, color: undefined, threshold: 35, scores: []},
  {name: 'Mayor', playerName: 'Jens', color: 'blue', threshold: 3, scores: []},
];
const awards: Array<FundedAwardModel> = [
  {name: 'Banker', playerName: 'Daniel', color: 'red', scores: []},
];

describe('MilestoneAwardSummary', () => {
  it('shows only the names and icons of the milestones and awards in the game', () => {
    const wrapper = mount(MilestoneAwardSummary, {
      ...globalConfig,
      props: {milestones, awards},
    });

    expect(wrapper.findAll('.ma-summary-title').map((title) => title.text())).to.deep.eq(['Milestones', 'Awards']);
    expect(wrapper.findAll('.ma-summary-item').map((item) => item.text())).to.deep.eq(['Terraformer', 'Mayor', 'Banker']);
    expect(wrapper.findAll('.ma-table-icon')).to.have.length(3);
    expect(wrapper.find('.ma-table-coin').exists()).to.be.false;
    expect(wrapper.find('[data-test="requirement"]').exists()).to.be.false;
    expect(wrapper.text()).not.to.contain('35');
    expect(wrapper.text()).not.to.contain('Jens');
  });

  it('shows the detailed description in a tooltip on hover', async () => {
    const wrapper = mount(MilestoneAwardSummary, {
      ...globalConfig,
      props: {milestones, awards},
    });
    const item = wrapper.findAll('.ma-summary-item')[0];
    await item.trigger('mouseenter');

    const tooltip = document.querySelector<HTMLElement>('.glass-tooltip');
    expect(tooltip).not.to.be.null;
    expect(tooltip?.textContent).to.contain('Terraformer');
    expect(tooltip?.textContent).to.contain(getMilestone('Terraformer').description);
    expect(tooltip?.classList.contains('glass-tooltip--visible')).to.be.true;

    await item.trigger('mouseleave');
    expect(tooltip?.classList.contains('glass-tooltip--visible')).to.be.false;
  });

  it('uses the same name and description for milestones and awards as the full table', () => {
    expect(milestoneTooltip('Terraformer')).to.contain('Terraformer');
    expect(milestoneTooltip('Terraformer')).to.contain(getMilestone('Terraformer').description);
    expect(awardTooltip('Banker')).to.contain('Banker');
    expect(awardTooltip('Banker')).to.contain(getAward('Banker').description);
  });
});
