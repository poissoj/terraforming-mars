<!-- Popup with the board settings that used to live in the Board card. -->
<template>
  <SidebarModal :open="true" :framed="true" @close="close">
    <DialogFrame :title="title" :width="760" class="create-game-board-popup" @close="close">
      <div class="create-game-subhead" v-i18n>Random</div>
      <OptionRow label="Random board">
        <SwitchInput v-model="randomBoard" />
      </OptionRow>
      <SegmentedControl v-if="randomBoard" v-model="randomBoardScope" :options="RANDOM_BOARD_OPTIONS" />
      <OptionRow label="Randomize board tiles" :href="WIKI_URLS.randomizeBoardTiles">
        <SwitchInput v-model="shuffleMapDraft" />
      </OptionRow>

      <CollapsibleSection v-for="group in groups" :key="group.label"
        variant="subhead" :title="group.label" :collapsible="group.fan"
        storageKey="boardPopupFan" :defaultOpen="!group.fan">
        <div class="create-game-chip-grid">
          <ChoiceChip v-for="boardName in group.boards" :key="boardName"
            :label="boardName" capitalized :selected="selectedBoards.includes(boardName)"
            :data-test="'board-' + boardName" @select="selectBoard(boardName)">
            <template #icon><span :class="boardColorClass(boardName)"></span></template>
            <span v-if="ALPHA_BOARDS.includes(boardName)" class="create-game-alpha" :title="$t('Alpha — work in progress')">α</span>
          </ChoiceChip>
        </div>
      </CollapsibleSection>

      <template #footer>
        <button type="button" class="btn btn-primary" @click="validate" v-i18n>Apply</button>
      </template>
    </DialogFrame>
  </SidebarModal>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import CollapsibleSection from '@/client/components/create/CollapsibleSection.vue';
import ChoiceChip from '@/client/components/create/ChoiceChip.vue';
import DialogFrame from '@/client/components/DialogFrame.vue';
import OptionRow from '@/client/components/create/OptionRow.vue';
import SegmentedControl from '@/client/components/create/SegmentedControl.vue';
import SidebarModal from '@/client/components/SidebarModal.vue';
import SwitchInput from '@/client/components/create/SwitchInput.vue';
import {BoardName} from '@/common/boards/BoardName';
import {RandomBoardOption} from '@/common/boards/RandomBoardOption';
import {randomOptionOf} from '@/common/boards/boardPool';
import {boardOptions} from '@/common/boards/randomBoardOptions';
import {WIKI_URLS} from '@/client/utils/WikiLinks';
import {translateText} from '@/client/directives/i18n';
import {boardColorClass} from '@/client/components/create/boardColorClass';
import {ALPHA_BOARDS, RANDOM_BOARD_OPTIONS} from '@/client/components/create/createGameChoices';

const props = defineProps<{
  boards: Array<BoardName>;
  /** True when the board's tiles are randomized. */
  shuffleMap: boolean;
}>();

const emit = defineEmits<{
  'update:boards': [value: Array<BoardName>];
  'update:shuffleMap': [value: boolean];
  'close': [];
}>();

const OFFICIAL_GROUP_BOARDS = [
  BoardName.THARSIS,
  BoardName.HELLAS,
  BoardName.ELYSIUM,
  BoardName.UTOPIA_PLANITIA,
  BoardName.VASTITAS_BOREALIS_NOVA,
  BoardName.TERRA_CIMMERIA_NOVA,
  BoardName.AMAZONIS_PLANITIA,
] as const;

const FAN_GROUP_BOARDS = [
  BoardName.ARABIA_TERRA,
  BoardName.AMAZONIS,
  BoardName.TERRA_CIMMERIA,
  BoardName.VASTITAS_BOREALIS,
  BoardName.HOLLANDIA,
] as const;

const groups: ReadonlyArray<{label: string, boards: ReadonlyArray<BoardName>, fan: boolean}> = [
  {label: 'Official', boards: OFFICIAL_GROUP_BOARDS, fan: false},
  {label: 'Fan-made', boards: FAN_GROUP_BOARDS, fan: true},
];

const initialBoards = props.boards.length > 0 ? [...props.boards] : [BoardName.THARSIS];
const selectedBoards = ref<Array<BoardName>>(initialBoards);
const randomBoard = ref(props.boards.length > 1);
const shuffleMapDraft = ref(props.shuffleMap);
const lastFixedBoard = ref<BoardName>(initialBoards[0] ?? BoardName.THARSIS);

// Same behavior as the old Board card: the switch replaces a fixed board by the official pool,
// and switching it off brings the last fixed board back.
watch(randomBoard, (random) => {
  if (random) {
    lastFixedBoard.value = selectedBoards.value[0] ?? lastFixedBoard.value;
    selectedBoards.value = boardOptions(RandomBoardOption.OFFICIAL);
  } else {
    selectedBoards.value = [lastFixedBoard.value];
  }
});

const randomBoardScope = computed({
  get(): string {
    return randomOptionOf(selectedBoards.value) ?? '';
  },
  set(scope: string) {
    selectedBoards.value = boardOptions(scope as RandomBoardOption);
  },
});

const title = computed(() => translateText(randomBoard.value ? 'Select boards to be randomly chosen' : 'Select a board'));

function selectBoard(boardName: BoardName): void {
  if (!randomBoard.value) {
    selectedBoards.value = [boardName];
    lastFixedBoard.value = boardName;
    return;
  }
  if (!selectedBoards.value.includes(boardName)) {
    selectedBoards.value = [...selectedBoards.value, boardName];
    return;
  }
  const remaining = selectedBoards.value.filter((other) => other !== boardName);
  // Keep at least one board selected.
  if (remaining.length > 0) {
    selectedBoards.value = remaining;
  }
}

function validate(): void {
  emit('update:boards', [...selectedBoards.value]);
  emit('update:shuffleMap', shuffleMapDraft.value);
  emit('close');
}

function close(): void {
  emit('close');
}
</script>

<style scoped lang="less">
// Same spacing as the former settings card, rather than the dialog body's section gaps.
.create-game-board-popup :deep(.dialog-frame-body) {
  gap: 0;
}
</style>
