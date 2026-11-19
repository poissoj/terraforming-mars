import {ref} from 'vue';

/** One frame clock for all AI countdowns, so the log rows themselves do not re-render every frame. */
export const aiThinkingNow = ref(Date.now());

let frame: number | undefined;
let subscribers = 0;

function tick(): void {
  aiThinkingNow.value = Date.now();
  frame = window.requestAnimationFrame(tick);
}

/** Starts the shared clock on the first countdown and stops it again on the last. */
export function subscribeAiThinkingClock(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  // Also refresh without rAF (tests, reduced environments): the first render then uses the current time.
  aiThinkingNow.value = Date.now();
  if (typeof window.requestAnimationFrame === 'undefined') {
    return () => {};
  }
  subscribers++;
  if (subscribers === 1) {
    frame = window.requestAnimationFrame(tick);
  }
  let active = true;
  return () => {
    if (!active) {
      return;
    }
    active = false;
    subscribers--;
    if (subscribers === 0 && frame !== undefined) {
      window.cancelAnimationFrame(frame);
      frame = undefined;
    }
  };
}
