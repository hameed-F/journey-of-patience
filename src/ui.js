import { SURAHS, CFG, ACH } from './config.js';

const $ = (id) => document.getElementById(id);
const SCREENS = ['loading', 'menu', 'tutorial', 'pause', 'over', 'victory', 'ach'];

export function show(name) {
  for (const s of SCREENS) $(s).classList.toggle('hidden', s !== name);
}
export const hud = (on) => $('hud').classList.toggle('hidden', !on);

export function buildSlots() {
  $('surah-slots').innerHTML = SURAHS.map(
    (s) => `<div class="slot" data-id="${s.id}"><span class="ar" dir="rtl">${s.arabic}</span><small>${s.name}</small></div>`
  ).join('');
}

export function setSurahs(collected, newId) {
  document.querySelectorAll('.slot').forEach((el) => {
    const id = Number(el.dataset.id);
    el.classList.toggle('got', collected.has(id));
    if (id === newId) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
    if (!collected.has(id)) el.classList.remove('pop');
  });
}

let prevLives = CFG.maxLives;
export function setHearts(n, silent) {
  const hearts = document.querySelectorAll('#hearts .heart');
  hearts.forEach((el, i) => {
    el.classList.toggle('lost', i >= n);
    if (!silent && i >= prevLives && i < n) { el.classList.remove('heal'); void el.offsetWidth; el.classList.add('heal'); }
    if (!silent && i >= n && i < prevLives) { el.classList.remove('hurt'); void el.offsetWidth; el.classList.add('hurt'); }
  });
  prevLives = n;
  $('zam-text').textContent = n >= CFG.maxLives ? 'Health full' : 'Find Zamzam to heal';
  $('zam').classList.toggle('need', n < CFG.maxLives);
}

export const setDistance = (m) => { $('dist').textContent = m; };

export function setTier(name, silent) {
  const t = $('tier');
  t.textContent = name;
  if (!silent) { t.classList.remove('bump'); void t.offsetWidth; t.classList.add('bump'); }
}

let toastTimer = 0;
export function toast(text) {
  const t = $('toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1300);
}

let bannerTimer = 0;
export function banner(title, sub) {
  const b = $('banner');
  b.innerHTML = `<b>${title}</b><span>${sub || ''}</span>`;
  b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.remove('show'), 2600);
}

export function notify(icon, text) {
  const n = document.createElement('div');
  n.className = 'notif';
  n.style.top = `${22 + Math.random() * 46}%`;
  n.style[Math.random() < 0.5 ? 'left' : 'right'] = '8px';
  n.innerHTML = `<span>${icon}</span><div>${text}</div>`;
  $('notifs').appendChild(n);
  setTimeout(() => n.remove(), 2400);
}

export function flash(color) {
  const f = $('flash');
  f.style.background = color;
  f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
}

let achTimer = 0;
export function achToast(a) {
  const el = $('ach-toast');
  el.innerHTML = `<span>${a.icon}</span><div><small>Achievement unlocked</small><b>${a.name}</b></div>`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(achTimer);
  achTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

export function buildAch(have) {
  $('ach-list').innerHTML = ACH.map((a) => {
    const got = !!have[a.id];
    return `<li class="${got ? 'got' : ''}"><span class="ic">${got ? a.icon : '🔒'}</span><div><b>${a.name}</b><small>${a.desc}</small></div></li>`;
  }).join('');
  const n = ACH.filter((a) => have[a.id]).length;
  $('ach-count').textContent = `${n} / ${ACH.length} unlocked`;
}

export function setBest(v) { $('best').textContent = v; }
export function setSoundLabel(on) { $('btn-sound').textContent = `Sound effects: ${on ? 'On' : 'Off'}`; }
export function setMusicLabel(on) { $('btn-music').textContent = `Music: ${on ? 'On' : 'Off'}`; }
export function setLoad(p, text) {
  $('load-bar').style.width = `${Math.round(p * 100)}%`;
  if (text) $('load-text').textContent = text;
}
export const modelWarning = (on) => $('model-warning').classList.toggle('hidden', !on);

export function showOver({ score, best, surahs }) {
  $('over-score').textContent = score;
  $('over-best').textContent = best;
  $('over-surahs').textContent = surahs;
  show('over');
}
export function showVictory({ score }) {
  $('win-score').textContent = score;
  $('tilawat-status').textContent = '';
  show('victory');
}
export const tilawatStatus = (t) => { $('tilawat-status').textContent = t; };

export function setSabr(frac, active) {
  $('sabr-fill').style.width = `${Math.round(frac * 100)}%`;
  $('sabr').classList.toggle('active', !!active);
  if (active) $('sabr-fill').style.width = '100%';
}

// A very short, non-blocking note. It never pauses, slows or covers the action.
let noteTimer = 0;
export function hitNote(text, cat) {
  const n = $('hitnote');
  n.textContent = text;
  n.dataset.cat = cat || '';
  n.classList.remove('show'); void n.offsetWidth; n.classList.add('show');
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => n.classList.remove('show'), 1100);
}
