<!-- Button showing the chosen board, which opens a popup for choosing another. -->
<template>
  <div>
    <input type="checkbox" v-model="showPopup" id="boardSelector-checkbox">
    <label v-if="boards.length === 1" for="boardSelector-checkbox">
      <span v-if="props.label" v-i18n>Board</span>
      <span v-if="props.label">&nbsp;&nbsp;</span><span class="create-game-board-hexagon" :class="boardColorClass(boards[0])">&#x2B22;</span>
      <span class="capitalized" v-i18n>{{ boards[0] }}</span>
      <span v-if="shuffleMap" class="create-game-board-shuffled" :title="$t('Randomize board tiles')">&nbsp;(&#x1F3B2;)</span>
    </label>
    <div v-else class="create-game-board-random-row">
      <span v-if="props.boardName !== undefined" class="create-game-board-drawn">
        <span class="create-game-board-hexagon" :class="boardColorClass(props.boardName)">&#x2B22;</span>
        <span class="capitalized" v-i18n>{{ props.boardName }}</span>
      </span>
      <label for="boardSelector-checkbox" class="create-game-board-random-label">
        <span v-i18n>Random</span> ({{ boards.length }})
      </label>
      <span v-if="shuffleMap" class="create-game-board-shuffled" :title="$t('Randomize board tiles')">&#x1F3B2;</span>
    </div>
    <BoardPopup
      v-if="showPopup"
      :boards="boards"
      :shuffleMap="shuffleMap"
      @update:boards="$emit('update:boards', $event)"
      @update:shuffleMap="$emit('update:shuffleMap', $event)"
      @close="showPopup = false"
    />
  </div>
</template>

<script setup lang="ts">
import {ref} from 'vue';
import BoardPopup from '@/client/components/create/BoardPopup.vue';
import {boardColorClass} from '@/client/components/create/boardOptions';
import {BoardName} from '@/common/boards/BoardName';

const props = withDefaults(defineProps<{
  boards: Array<BoardName>;
  /** True when the board's tiles are randomized. */
  shuffleMap: boolean;
  /** False when the surrounding card already shows the "Board" heading. */
  label?: boolean;
  /** Random board: the board drawn by the preview, shown next to the random button. */
  boardName?: BoardName;
}>(), {
  label: true,
});

defineEmits<{
  'update:boards': [value: Array<BoardName>];
  'update:shuffleMap': [value: boolean];
}>();

const showPopup = ref(false);
</script>
