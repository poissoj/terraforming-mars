import {AwardName} from '@/common/ma/AwardName';
import {MilestoneName} from '@/common/ma/MilestoneName';
import {getAward, getMilestone} from '@/client/MilestoneAwardManifest';
import {$t} from '@/client/directives/i18n';

function tooltip(name: string, description: string | undefined): string {
  return description === undefined || description === '' ? $t(name) : `${$t(name)}: ${$t(description)}`;
}

export function milestoneTooltip(name: MilestoneName): string {
  return tooltip(name, getMilestone(name)?.description);
}

export function awardTooltip(name: AwardName): string {
  return tooltip(name, getAward(name)?.description);
}
