import { storage } from './storage.js';
import { ACH } from './config.js';
import * as UI from './ui.js';
import { sfx } from './audio.js';


export function unlock(id) {
  const have = storage.get().ach || {};
  if (have[id]) return false;
  storage.set({ ach: { ...have, [id]: Date.now() } });
  const a = ACH.find((x) => x.id === id);
  if (a) { UI.achToast(a); sfx.ach(); }
  return true;
}

export const unlocked = () => storage.get().ach || {};

export { ACH };
