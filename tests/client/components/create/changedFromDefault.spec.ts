import {expect} from 'chai';
import {defaultCreateGameModel} from '@/client/components/create/defaultCreateGameModel';
import {cardPoolChanged, expansionOptionsChanged, houseRulesChanged, milestonesChanged} from '@/client/components/create/changedFromDefault';
import {RandomMAOptionType} from '@/common/ma/RandomMAOptionType';

describe('changedFromDefault', () => {
  it('default settings are unchanged', () => {
    const model = defaultCreateGameModel();
    expect(expansionOptionsChanged(model)).is.false;
    expect(milestonesChanged(model)).is.false;
    expect(cardPoolChanged(model)).is.false;
    expect(houseRulesChanged(model)).is.false;
  });

  it('expansion options only count while their expansion is on', () => {
    const model = defaultCreateGameModel();
    model.aresExtremeVariant = true;
    expect(expansionOptionsChanged(model)).is.false;
    model.expansions.ares = true;
    expect(expansionOptionsChanged(model)).is.true;
  });

  it('milestones and card pool', () => {
    const model = defaultCreateGameModel();
    model.randomMA = RandomMAOptionType.LIMITED;
    model.bannedCards = ['Algae' as any];
    expect(milestonesChanged(model)).is.true;
    expect(cardPoolChanged(model)).is.true;
  });

  it('house-rule settings mark the folded card as changed', () => {
    const model = defaultCreateGameModel();
    // World Government Terraforming belongs to Setup now, not to the house-rule card
    model.solarPhaseOption = true;
    expect(houseRulesChanged(model)).is.false;

    model.undoOption = true;
    expect(houseRulesChanged(model)).is.true;

    model.undoOption = false;
    model.escapeVelocityMode = true;
    expect(houseRulesChanged(model)).is.true;
  });
});
