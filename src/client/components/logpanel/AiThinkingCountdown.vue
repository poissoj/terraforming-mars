<template>
  <span v-if="millisecondsLeft > 0" class="log-ai-thinking-countdown">{{ millisecondsLeft }}</span>
</template>

<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted} from 'vue';
import {aiThinkingNow, subscribeAiThinkingClock} from '@/client/utils/aiThinkingClock';

const props = defineProps<{at: number}>();

let unsubscribe: (() => void) | undefined;
onMounted(() => {
  unsubscribe = subscribeAiThinkingClock();
});
onBeforeUnmount(() => unsubscribe?.());

const millisecondsLeft = computed(() => Math.max(0, Math.round(props.at - aiThinkingNow.value)));
</script>
