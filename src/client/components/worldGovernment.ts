import {GameModel} from '@/common/models/GameModel';
import {OrOptionsModel, PlayerInputModel} from '@/common/models/PlayerInputModel';
import {getGlobalParameterMaximums} from '@/common/boards/GlobalParameterMaximums';
import {MAXIMUM_HABITAT_RATE, MAXIMUM_LOGISTIC_RATE, MAXIMUM_MINING_RATE} from '@/common/constants';
import {WORLD_GOVERNMENT_TERRAFORMING_TITLE} from '@/common/inputs/WorldGovernmentTerraforming';
import {titleKey} from '@/client/components/orOptionsShortLabels';

// The solar-phase World Government terraforming input: one free global-parameter step chosen by the
// first player. It is a simple decision, not the turn's action menu, so the client shows its parameter
// options as tiles (OrOptions + ChoiceOptionTile) with the current value and the value after the step.
export type WorldGovernmentOption = {
  // Asset shown above the option text
  icon: string;
  // Current and next value, e.g. "-10 °C" → "-8 °C"; absent for removing an Ares hazard
  before?: string;
  after?: string;
};

export function isWorldGovernmentTerraforming(input: PlayerInputModel): input is OrOptionsModel {
  return input.type === 'or' && titleKey(input.title) === WORLD_GOVERNMENT_TERRAFORMING_TITLE;
}

function rate(value: number, max: number): string {
  return `${value}/${max}`;
}

export function worldGovernmentOption(title: string | PlayerInputModel['title'], game: GameModel): WorldGovernmentOption | undefined {
  const max = getGlobalParameterMaximums(game.gameOptions.boardName);
  switch (titleKey(title)) {
  case 'Increase temperature':
    return {
      icon: 'assets/global-parameters/temperature.png',
      before: `${game.temperature} °C`,
      after: `${Math.min(game.temperature + 2, max.temperature)} °C`,
    };
  case 'Increase oxygen':
    return {
      icon: 'assets/global-parameters/oxygen.png',
      before: `${game.oxygenLevel} %`,
      after: `${Math.min(game.oxygenLevel + 1, max.oxygen)} %`,
    };
  case 'Add an ocean':
    return {
      icon: 'assets/tiles/ocean.png',
      before: rate(game.oceans, max.oceans),
      after: rate(Math.min(game.oceans + 1, max.oceans), max.oceans),
    };
  case 'Increase Venus scale':
    return {
      icon: 'assets/global-parameters/venus.png',
      before: `${game.venusScaleLevel} %`,
      after: `${Math.min(game.venusScaleLevel + 2, max.venus)} %`,
    };
  case 'Increase the Moon habitat rate':
    return {
      icon: 'assets/moon/card-habitat-rate.png',
      before: rate(game.moon?.habitatRate ?? 0, MAXIMUM_HABITAT_RATE),
      after: rate(Math.min((game.moon?.habitatRate ?? 0) + 1, MAXIMUM_HABITAT_RATE), MAXIMUM_HABITAT_RATE),
    };
  case 'Increase the Moon mining rate':
    return {
      icon: 'assets/moon/card-mining-rate.png',
      before: rate(game.moon?.miningRate ?? 0, MAXIMUM_MINING_RATE),
      after: rate(Math.min((game.moon?.miningRate ?? 0) + 1, MAXIMUM_MINING_RATE), MAXIMUM_MINING_RATE),
    };
  case 'Increase the Moon logistic rate':
    return {
      icon: 'assets/moon/card-logistic-rate.png',
      before: rate(game.moon?.logisticRate ?? 0, MAXIMUM_LOGISTIC_RATE),
      after: rate(Math.min((game.moon?.logisticRate ?? 0) + 1, MAXIMUM_LOGISTIC_RATE), MAXIMUM_LOGISTIC_RATE),
    };
  case 'Remove an unprotected hazard':
    return {icon: 'assets/tiles/hazard.png'};
  default:
    return undefined;
  }
}
