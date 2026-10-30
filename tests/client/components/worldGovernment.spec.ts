import {expect} from 'chai';
import {BoardName} from '@/common/boards/BoardName';
import {GameModel} from '@/common/models/GameModel';
import {PlayerInputModel} from '@/common/models/PlayerInputModel';
import {isWorldGovernmentTerraforming, worldGovernmentOption} from '@/client/components/worldGovernment';

const game = {
  temperature: -10,
  oxygenLevel: 4,
  oceans: 3,
  venusScaleLevel: 18,
  moon: {habitatRate: 3, miningRate: 4, logisticRate: 5},
  gameOptions: {boardName: BoardName.THARSIS},
} as unknown as GameModel;

function input(title: string, type: 'or' | 'option' = 'or'): PlayerInputModel {
  return {type, title, buttonLabel: '', options: []} as unknown as PlayerInputModel;
}

describe('worldGovernment', () => {
  it('recognises the World Government terraforming input', () => {
    expect(isWorldGovernmentTerraforming(input('Select action for World Government Terraforming'))).is.true;
    expect(isWorldGovernmentTerraforming(input('Select an option'))).is.false;
    expect(isWorldGovernmentTerraforming(input('Select action for World Government Terraforming', 'option'))).is.false;
  });

  it('shows the current and next temperature', () => {
    expect(worldGovernmentOption('Increase temperature', game)).deep.eq({
      icon: 'assets/global-parameters/temperature.png',
      before: '-10 °C',
      after: '-8 °C',
    });
  });

  it('shows oxygen, oceans and Venus before → after', () => {
    expect(worldGovernmentOption('Increase oxygen', game)).deep.include({before: '4 %', after: '5 %'});
    expect(worldGovernmentOption('Add an ocean', game)).deep.include({before: '3/9', after: '4/9'});
    expect(worldGovernmentOption('Increase Venus scale', game)).deep.include({before: '18 %', after: '20 %'});
  });

  it('shows the Moon rates and the Ares hazard without a value', () => {
    expect(worldGovernmentOption('Increase the Moon habitat rate', game)).deep.include({before: '3/8', after: '4/8'});
    expect(worldGovernmentOption('Increase the Moon mining rate', game)).deep.include({before: '4/8', after: '5/8'});
    expect(worldGovernmentOption('Increase the Moon logistic rate', game)).deep.include({before: '5/8', after: '6/8'});
    expect(worldGovernmentOption('Remove an unprotected hazard', game)).deep.eq({icon: 'assets/tiles/hazard.png'});
  });

  it('ignores options that are not global parameters', () => {
    expect(worldGovernmentOption('Play project card', game)).is.undefined;
  });
});
