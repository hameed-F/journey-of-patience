const KEY = 'journey-of-patience-v1';
const defaults = { best: 0, sound: true, music: true, tutorialSeen: false, ach: {}, done: {} };
let data = { ...defaults };

try {
  const raw = localStorage.getItem(KEY);
  if (raw) data = { ...defaults, ...JSON.parse(raw) };
} catch (_) { /* private mode etc. */ }

export const storage = {
  get: () => data,
  set(patch) {
    data = { ...data, ...patch };
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) {}
  },
};
