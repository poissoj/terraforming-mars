<template>
  <!-- One settings button in the mobile resource bar. Language, game info and help live in this settings
       panel instead of taking three more buttons in the bar. -->
  <span class="mb-settings-button">
    <button type="button" class="mb-settings-trigger" :title="$t('Player Settings')" :aria-label="$t('Player Settings')"
      :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">
      <i class="sidebar_icon sidebar_icon--settings"></i>
    </button>
    <SidebarModal :open="menuOpen" :framed="true" @close="menuOpen = false">
      <div class="mb-settings-menu">
        <button type="button" class="mb-settings-item" @click="select('settings')">
          <i class="sidebar_icon sidebar_icon--settings"></i><span v-i18n>Player Settings</span>
        </button>
        <button type="button" class="mb-settings-item" @click="select('language')">
          <i class="sidebar_icon sidebar_icon--language"><LanguageFlag :lang="lang" /></i><span v-i18n>Language</span>
        </button>
        <button type="button" class="mb-settings-item" @click="select('info')">
          <i class="sidebar_icon sidebar_icon--info"></i><span v-i18n>Game info</span>
        </button>
        <button type="button" class="mb-settings-item" @click="select('help')">
          <i class="sidebar_icon sidebar_icon--help"></i><span v-i18n>Player help</span>
        </button>
      </div>
    </SidebarModal>

    <SidebarModal :open="dialog === 'settings'" :framed="true" @close="dialog = undefined">
      <PreferencesDialog :preferencesManager="PreferencesManager.INSTANCE" @okButtonClicked="dialog = undefined" />
    </SidebarModal>
    <SidebarModal :open="dialog === 'language'" :framed="true" @close="dialog = undefined">
      <LanguageSelectionDialog :preferencesManager="PreferencesManager.INSTANCE" @close="dialog = undefined" />
    </SidebarModal>
    <SidebarModal :open="dialog === 'info'" :framed="true" @close="dialog = undefined">
      <InfoPanel :gameOptions="game.gameOptions" :playerNumber="playerNumber"
        :lastSoloGeneration="game.lastSoloGeneration" :deckSize="game.deckSize" :discardPileSize="game.discardPileSize"
        :otherDeckSizes="game.otherDeckSizes" :spectatorId="game.spectatorId" :expectedPurgeTimeMs="game.expectedPurgeTimeMs"
        @close="dialog = undefined" />
    </SidebarModal>
    <SidebarModal :open="dialog === 'help'" :wide="true" :bare="true" @close="dialog = undefined">
      <HelpOverlay :closable="true" @close="dialog = undefined" />
    </SidebarModal>
  </span>
</template>

<script setup lang="ts">
import {computed, defineAsyncComponent, ref} from 'vue';
import {GameModel} from '@/common/models/GameModel';
import {LANGUAGE} from '@/common/constants';
import {PreferencesManager} from '@/client/utils/PreferencesManager';
import LanguageFlag from '@/client/components/LanguageFlag.vue';
import LanguageSelectionDialog from '@/client/components/LanguageSelectionDialog.vue';
import PreferencesDialog from '@/client/components/PreferencesDialog.vue';
import InfoPanel from '@/client/components/InfoPanel.vue';
import SidebarModal from '@/client/components/SidebarModal.vue';

defineProps<{
  game: GameModel;
  playerNumber: number;
}>();

type Dialog = 'settings' | 'language' | 'info' | 'help';

const HelpOverlay = defineAsyncComponent(() => import('@/client/components/helpOverlay/HelpOverlay.vue'));
const menuOpen = ref(false);
const dialog = ref<Dialog | undefined>(undefined);
const lang = computed(() => PreferencesManager.INSTANCE.values().lang as LANGUAGE);

function select(item: Dialog): void {
  menuOpen.value = false;
  dialog.value = item;
}
</script>
