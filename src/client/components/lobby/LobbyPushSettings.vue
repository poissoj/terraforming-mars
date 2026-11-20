<template>
  <!-- Permanent way to enable push after the lobby banner was closed for good -->
  <div class="preferences-push-status">
    <span class="preferences-switch-text">
      <span class="preferences-switch-label" v-i18n>Browser notifications</span>
      <span class="preferences-switch-hint">{{ statusText }}</span>
    </span>
    <button v-if="state === 'default'" type="button" class="btn btn-sm btn-primary" @click="allow" v-i18n>Allow notifications</button>
    <button v-else-if="state === 'denied'" type="button" class="btn btn-sm btn-tone-quiet" @click="update" v-i18n>Check again</button>
  </div>
</template>

<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from 'vue';
import {translateText} from '@/client/directives/i18n';
import {askLobbyPushPermission, pushSupported, subscribeLobbyPush} from './lobbyPush';

type PushState = 'default' | 'denied' | 'granted' | 'unsupported';

function currentState(): PushState {
  return pushSupported() ? Notification.permission : 'unsupported';
}

const state = ref<PushState>(currentState());
let permissionStatus: PermissionStatus | undefined;

function update(): void {
  state.value = currentState();
}

// Runs inside the click: browsers only show the permission prompt after a user action
async function allow(): Promise<void> {
  try {
    const permission = askLobbyPushPermission();
    if (permission !== undefined) {
      await permission;
    }
    update();
    if (state.value === 'granted') {
      await subscribeLobbyPush();
    }
  } catch (error) {
    console.warn('Could not enable push messages', error);
  }
}

const statusText = computed(() => {
  switch (state.value) {
  case 'default': return translateText('Notifications are off for this browser.');
  case 'denied': return translateText('Notifications are blocked in the browser settings for this site.');
  case 'granted': return translateText('Notifications are enabled for this browser.');
  case 'unsupported': return translateText('This browser cannot receive push messages.');
  }
});

onMounted(async () => {
  window.addEventListener('focus', update);
  update();
  // Opening the settings renews an existing subscription (language, server key, service worker update)
  if (state.value === 'granted') {
    void subscribeLobbyPush();
  }
  try {
    permissionStatus = await navigator.permissions?.query({name: 'notifications'});
    permissionStatus?.addEventListener('change', update);
  } catch {
    // Without the Permissions API, the focus listener and the button still refresh the state
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('focus', update);
  permissionStatus?.removeEventListener('change', update);
});
</script>
