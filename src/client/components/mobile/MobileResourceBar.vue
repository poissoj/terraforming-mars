<template>
  <!-- Always visible resource bar of the mobile player view: own stock (and production) plus the settings menu. -->
  <div class="mb-gamebar" :aria-label="$t('Resources')">
    <span v-for="good in goods" :key="good.type" class="mb-resource" :title="resourceTitle(good.type)">
      <span :class="['resource_icon', 'resource_icon--' + good.type]"></span>
      <b class="mb-resource-stock">{{ good.count }}</b>
      <small v-if="good.production !== 0" class="mb-resource-production">{{ signed(good.production) }}</small>
    </span>
    <MobileSettingsButton :game="game" :player-number="playerNumber" />
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue';
import {PublicPlayerModel} from '@/common/models/PlayerModel';
import {GameModel} from '@/common/models/GameModel';
import {PlayerGood, playerGoods} from '@/client/components/overview/playerGoods';
import {translateText} from '@/client/directives/i18n';
import MobileSettingsButton from '@/client/components/mobile/MobileSettingsButton.vue';

const props = defineProps<{
  player: PublicPlayerModel;
  game: GameModel;
  playerNumber: number;
}>();

const goods = computed<ReadonlyArray<PlayerGood>>(() => playerGoods(props.player));

function resourceTitle(type: string): string {
  return type === 'megacredits' ? translateText('MegaCredits (M€)') : translateText(type.charAt(0).toUpperCase() + type.slice(1));
}

function signed(value: number): string {
  return value > 0 ? '+' + value : '−' + Math.abs(value);
}
</script>
