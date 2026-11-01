// Own key bindings and the "show keys in the game" switch. Both only live on this device (localStorage), so the
// help dialog can export and import the bindings as JSON to move them to another device. Only keys that differ from
// the default are stored, so later changes of the defaults reach every player.
import {reactive} from 'vue';
import {safeLocalStorage} from '@/client/utils/SafeLocalStorage';
import {FIXED_HOTKEYS, HOTKEY_ACTIONS, HotkeyKeys, findHotkeyAction} from '@/client/hotkeys/hotkeyActions';

const STORAGE_KEY = 'hotkeys';
// Version 4: letter shortcuts are characters; version 3 stored their physical codes and is migrated on load
const EXPORT_VERSION = 4;
const LEGACY_POSITION_VERSION = 3;

type StoredHotkeys = {
  version: number;
  hotkeys: Record<string, HotkeyKeys>;
  showHints?: boolean;
};

export const hotkeyState = reactive({
  /** Own keys of the player, by action id; actions without an entry use their default */
  bindings: {} as Record<string, HotkeyKeys>,
  showHints: true,
});

function isKeyList(value: unknown): value is Array<string> {
  return Array.isArray(value) && value.every((key) => typeof key === 'string');
}

export function combo(keys: HotkeyKeys): string {
  return keys.join('+');
}

function defaultOf(id: string): HotkeyKeys {
  const action = findHotkeyAction(id);
  return action?.keys ?? [];
}

function storeBinding(id: string, keys: HotkeyKeys): void {
  if (combo(keys) === combo(defaultOf(id))) {
    delete hotkeyState.bindings[id];
  } else {
    hotkeyState.bindings[id] = keys;
  }
}

function migrateKeys(keys: HotkeyKeys): HotkeyKeys {
  // Version 3 stored letters as physical codes (KeyQ); convert them to the character bindings used now.
  if (keys.length === 1 && /^Key[A-Z]$/.test(keys[0])) {
    return [keys[0].slice(3)];
  }
  return keys;
}

// Only known, editable actions are taken over; unknown ids (older or newer versions) are ignored
function applyBindings(source: Record<string, unknown>): number {
  let count = 0;
  for (const [id, keys] of Object.entries(source)) {
    const action = findHotkeyAction(id);
    if (action !== undefined && action.locked !== true && isKeyList(keys)) {
      storeBinding(id, migrateKeys(keys));
      count++;
    }
  }
  return count;
}

export function loadHotkeys(): void {
  const raw = safeLocalStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    return;
  }
  try {
    const stored = JSON.parse(raw) as Partial<StoredHotkeys>;
    if ((stored.version === LEGACY_POSITION_VERSION || stored.version === EXPORT_VERSION) && stored.hotkeys !== undefined && typeof stored.hotkeys === 'object') {
      applyBindings(stored.hotkeys);
    }
    if (typeof stored.showHints === 'boolean') {
      hotkeyState.showHints = stored.showHints;
    }
  } catch {
    // Broken entry: keep the defaults
  }
}

export function saveHotkeys(): void {
  const stored: StoredHotkeys = {version: EXPORT_VERSION, hotkeys: hotkeyState.bindings, showHints: hotkeyState.showHints};
  safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

export function keysOf(id: string): HotkeyKeys {
  const fixed = FIXED_HOTKEYS[id];
  if (fixed !== undefined) {
    return fixed;
  }
  const action = findHotkeyAction(id);
  if (action === undefined) {
    return [];
  }
  if (action.locked === true) {
    return action.keys;
  }
  return hotkeyState.bindings[id] ?? action.keys;
}

export function setBinding(id: string, keys: HotkeyKeys): void {
  storeBinding(id, keys);
  saveHotkeys();
}

export function resetBindings(): void {
  hotkeyState.bindings = {};
  saveHotkeys();
}

export function setShowHints(show: boolean): void {
  hotkeyState.showHints = show;
  saveHotkeys();
}

/** Ids of editable actions that share their keys with another action; empty bindings never collide */
export function duplicateBindings(): Set<string> {
  const seen = new Map<string, string>();
  const duplicates = new Set<string>();
  for (const action of HOTKEY_ACTIONS) {
    if (action.locked === true) {
      continue;
    }
    const keys = keysOf(action.id);
    if (keys.length === 0) {
      continue;
    }
    const key = combo(keys);
    const other = seen.get(key);
    if (other === undefined) {
      seen.set(key, action.id);
    } else {
      duplicates.add(other);
      duplicates.add(action.id);
    }
  }
  return duplicates;
}

/** All editable shortcuts with their current keys, so an import on another device gives exactly these keys */
export function exportHotkeys(): string {
  const hotkeys: Record<string, HotkeyKeys> = {};
  for (const action of HOTKEY_ACTIONS) {
    if (action.locked !== true) {
      hotkeys[action.id] = keysOf(action.id);
    }
  }
  return JSON.stringify({version: EXPORT_VERSION, hotkeys}, null, 2);
}

/** Takes over the bindings of an export; returns how many were read, throws on text that is no export */
export function importHotkeys(text: string): number {
  const data = JSON.parse(text) as Partial<StoredHotkeys>;
  if ((data.version !== LEGACY_POSITION_VERSION && data.version !== EXPORT_VERSION) || data.hotkeys === undefined || typeof data.hotkeys !== 'object' || data.hotkeys === null) {
    throw new Error('No hotkeys in this file');
  }
  const count = applyBindings(data.hotkeys);
  saveHotkeys();
  return count;
}

/** Action whose editable or fixed binding matches the keys, undefined if none */
export function actionForKeys(keys: HotkeyKeys): string | undefined {
  const wanted = combo(keys);
  const editable = HOTKEY_ACTIONS.find((action) => action.locked !== true && combo(keysOf(action.id)) === wanted);
  if (editable !== undefined) {
    return editable.id;
  }
  return Object.keys(FIXED_HOTKEYS).find((id) => combo(FIXED_HOTKEYS[id]) === wanted);
}
