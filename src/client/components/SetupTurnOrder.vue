<template>
  <!-- Turn order in the setup phase (instead of the player bars, which only show zeros there):
       numbered names in player color, the starting player first -->
  <div class="setup-turn-order">
    <!-- Game menu before the title: the same place as later in the players table (game_menu.less) -->
    <div class="setup-turn-order-title-row">
      <GameMenu />
      <MarsHomeLink />
      <h2 class="setup-turn-order-title" v-i18n>Turn order</h2>
    </div>
    <div class="setup-turn-order-players">
      <ol class="setup-turn-order-list">
        <li v-for="(player, index) in players" :key="player.color"
          :class="['setup-turn-order-player', playerColorClass(player.color, 'bg'), {'setup-turn-order-player--first': index === 0}]">
          <span class="setup-turn-order-number">{{ index + 1 }}.</span>
          <span>{{ player.name }}</span>
        </li>
      </ol>
      <!-- One card-size slider for all setup columns; mobile and tablet fit the cards to the screen instead -->
      <CardZoomSlider v-if="!isMobile" class="setup-turn-order-zoom" />
    </div>
    <!-- Room for controls at the top right of the box (e.g. collapse the board, PlayerHome.vue) -->
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue';
import {PublicPlayerModel} from '@/common/models/PlayerModel';
import {playerColorClass} from '@/common/utils/utils';
import GameMenu from '@/client/components/gameMenu/GameMenu.vue';
import MarsHomeLink from '@/client/components/common/MarsHomeLink.vue';
import CardZoomSlider from '@/client/components/cardfilter/CardZoomSlider.vue';
import {mobileLayout} from '@/client/utils/mobileLayout';

defineProps<{
  // In turn order (starting player first), as delivered by the server
  players: ReadonlyArray<PublicPlayerModel>;
}>();

const isMobile = computed(() => mobileLayout.value);
</script>
