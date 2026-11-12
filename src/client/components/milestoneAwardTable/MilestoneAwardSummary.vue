<template>
  <!-- Start phase: just which milestones and awards this game uses, without costs or player scores. -->
  <div class="ma-summary">
    <section class="ma-summary-section">
      <h3 class="ma-summary-title" v-i18n>Milestones</h3>
      <ul class="ma-summary-list">
        <li v-for="milestone in milestones" :key="milestone.name" class="ma-summary-item" v-glass-tooltip="milestoneTooltip(milestone.name)">
          <MilestoneAwardIcon :parts="MILESTONE_ICONS[milestone.name] ?? []" />
          <span>{{ $t(milestone.name) }}</span>
        </li>
      </ul>
    </section>
    <section class="ma-summary-section">
      <h3 class="ma-summary-title" v-i18n>Awards</h3>
      <ul class="ma-summary-list">
        <li v-for="award in awards" :key="award.name" class="ma-summary-item" v-glass-tooltip="awardTooltip(award.name)">
          <MilestoneAwardIcon :parts="AWARD_ICONS[award.name] ?? []" />
          <span>{{ $t(award.name) }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import {ClaimedMilestoneModel} from '@/common/models/ClaimedMilestoneModel';
import {FundedAwardModel} from '@/common/models/FundedAwardModel';
import MilestoneAwardIcon from '@/client/components/milestoneAwardTable/MilestoneAwardIcon.vue';
import {AWARD_ICONS, MILESTONE_ICONS} from '@/client/components/milestoneAwardTable/milestoneAwardIcons';
import {awardTooltip, milestoneTooltip} from '@/client/components/milestoneAwardTable/milestoneAwardTooltips';
import {glassTooltip as vGlassTooltip} from '@/client/directives/GlassTooltip';

defineProps<{
  milestones: ReadonlyArray<ClaimedMilestoneModel>;
  awards: ReadonlyArray<FundedAwardModel>;
}>();
</script>

<style scoped lang="less">
.ma-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px 28px;
  margin-top: 16px;
}

.ma-summary-title {
  margin: 0 0 8px;
  color: #ffcc64;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ma-summary-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ma-summary-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: #eee;
  cursor: help;
  font-size: 15px;

  > span:last-child {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  :deep(.ma-table-icon) {
    flex: none;
    height: 30px;

    img {
      height: 30px;
    }
  }
}
</style>
