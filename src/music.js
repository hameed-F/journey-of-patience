// Background music = your own file: public/showmetheway.mp3 (looped).
// It starts on the first tap (browsers block sound before that), keeps going through menus and the game,
// and is paused only while Tilawat plays.
import { storage } from './storage.js';

const SRC = ['/showmetheway.mp3', '/audio/showmetheway.mp3'];
let el = null, idx = 0, want = false, held = false;

function ensure() {
  if (el) return el;
  el = new Audio();
  el.loop = true;
  el.preload = 'auto';
  el.volume = 0.6;
  el.src = SRC[0];
  el.addEventListener('error', () => {
    if (idx < SRC.length - 1) { idx++; el.src = SRC[idx]; play(); }
    else console.warn('[music] showmetheway.mp3 not found. Put it in the public folder.');
  });
  return el;
}

function play() {
  if (!want || held || !storage.get().sound) return;
  const p = ensure().play();
  if (p && p.catch) p.catch(() => {});
}

export const music = {
  start() { want = true; play(); },
  pause() { held = true; if (el) el.pause(); },          // Tilawat is playing
  resume() { held = false; play(); },
  setEnabled(on) { if (on) { want = true; play(); } else if (el) el.pause(); },
  hide() { if (el) el.pause(); },                          // tab hidden
  show() { play(); },
  restart() { want = true; if (el) el.currentTime = 0; play(); },
};
