// All tunable values live here. Change numbers, rebuild, done.
export const CFG = {
  // Character
  modelUrl: '/models/runnerboy.glb',
  charHeight: 1.8,          // boy is auto-scaled to this height (world units ≈ metres)
  charFacing: Math.PI,      // if the boy runs backwards, change to 0

  // Lanes & movement
  lanes: [-2.2, 0, 2.2],
  laneDamp: 14,
  gravity: 30,
  jumpVelocity: 10.5,
  slideTime: 0.8,
  slamSpeed: 22,

  // Speed
  menuSpeed: 6,
  stopDecel: 30,

  // Lives
  maxLives: 3,
  invincible: 1.6,

  // Spawning
  spawnZ: -85,
  despawnZ: 8,
  surahFirstAt: 14,         // seconds into the run
  surahInterval: 32,        // seconds between Surah spawns
  surahCooldown: 7,         // a missed Surah waits this long before it can respawn
  sabrMax: 10,              // dates needed to fill the Sabr (patience) meter
  sabrShield: 5,            // seconds of protection when it is full
  zamzamInterval: 18,       // min seconds between Zamzam spawns (only if a life is missing)

  // Camera
  camHeight: 4.2,
  camDist: 7.5,

  // Rendering
  maxPixelRatio: 1.5,
  minPixelRatio: 0.75,

  // World
  segLength: 24,
  segCount: 5,

  // Day / night (seconds for a full cycle)
  dayCycle: 120,
  startTod: 0.12,           // 0 = dawn, 0.4 = noon, 0.6 = dusk, 0.75 = night
};

// Put your own Surahs/files here. Audio files go in /public/audio/
export const SURAHS = [
  { id: 0, name: 'Al-Asr',    arabic: 'العصر',   file: '/audio/surah1.mp3' },
  { id: 1, name: 'Ash-Sharh', arabic: 'الشرح',   file: '/audio/surah2.mp3' },
  { id: 2, name: 'Al-Ikhlas', arabic: 'الإخلاص', file: '/audio/surah3.mp3' },
];

// Difficulty by survival time.
//  gap  = seconds between obstacle patterns      step = seconds between rows inside a pattern
//  w    = pattern weights                         pBeh = chance an obstacle gets a special behaviour
//  seq  = max rows in a jump/slide sequence       narrow = max rows in a narrow passage
export const TIERS = [
  { name: 'Easy',      from: 0,   gap: 1.7,  step: 1.25, pBeh: 0,    beh: [],
    w: { single: 70, pair: 30 }, seq: 0, narrow: 0 },
  { name: 'Normal',    from: 30,  gap: 1.45, step: 1.15, pBeh: 0.25, beh: ['rotating', 'temporary'],
    w: { single: 45, pair: 30, wall: 12, seq: 5, narrow: 8 }, seq: 2, narrow: 3 },
  { name: 'Medium',    from: 60,  gap: 1.25, step: 1.05, pBeh: 0.35, beh: ['rotating', 'temporary', 'moving', 'falling'],
    w: { single: 25, pair: 25, wall: 10, seq: 15, narrow: 15, sweeper: 10 }, seq: 3, narrow: 4 },
  { name: 'Hard',      from: 90,  gap: 1.05, step: 0.98, pBeh: 0.45, beh: ['rotating', 'temporary', 'moving', 'falling', 'expanding', 'sliding'],
    w: { single: 15, pair: 20, wall: 8, seq: 20, narrow: 17, combo: 10, sweeper: 10 }, seq: 3, narrow: 4 },
  { name: 'Very Hard', from: 120, gap: 0.9,  step: 0.92, pBeh: 0.55, beh: ['rotating', 'temporary', 'moving', 'falling', 'expanding', 'sliding'],
    w: { single: 10, pair: 15, seq: 25, narrow: 20, combo: 15, sweeper: 15 }, seq: 4, narrow: 5 },
  { name: 'Extreme',   from: 180, gap: 0.8,  step: 0.88, pBeh: 0.6,  beh: ['rotating', 'temporary', 'moving', 'falling', 'expanding', 'sliding'],
    w: { single: 5, pair: 10, seq: 25, narrow: 20, combo: 20, sweeper: 20 }, seq: 4, narrow: 5 },
];

// [seconds, speed] - speed is interpolated between these points
export const SPEED_KNOTS = [[0, 14], [30, 16], [60, 18.5], [90, 21.5], [120, 25], [180, 29]];

export function tierFor(t) {
  let i = 0;
  for (let k = 0; k < TIERS.length; k++) if (t >= TIERS[k].from) i = k;
  return i;
}

export function speedFor(t) {
  const K = SPEED_KNOTS;
  if (t >= K[K.length - 1][0]) return Math.min(32, K[K.length - 1][1] + (t - K[K.length - 1][0]) * 0.02);
  for (let i = 0; i < K.length - 1; i++) {
    if (t < K[i + 1][0]) {
      const a = (t - K[i][0]) / (K[i + 1][0] - K[i][0]);
      return K[i][1] + (K[i + 1][1] - K[i][1]) * a;
    }
  }
  return K[0][1];
}

// Achievements (unlocked flags are saved in localStorage)
export const ACH = [
  { id: 'beginner',    icon: '⏱️', name: 'Beginner Runner',     desc: 'Survive 60 seconds' },
  { id: 'first',       icon: '🌙', name: 'First Step',          desc: 'Collect one Surah' },
  { id: 'determined',  icon: '💪', name: 'Determined',          desc: 'Collect two Surahs' },
  { id: 'journey',     icon: '🕌', name: 'Journey Complete',    desc: 'Collect all three Surahs' },
  { id: 'perfect',     icon: '❤️', name: 'Perfect Journey',     desc: 'Finish with three lives' },
  { id: 'independent', icon: '💧', name: 'Independent Journey', desc: 'Finish without using Zamzam' },
  { id: 'sabr',        icon: '🌴', name: 'Patience Rewarded',   desc: 'Fill the Sabr meter with dates' },
  { id: 'resilient',   icon: '🛡️', name: 'Resilient Runner',    desc: 'Finish a difficult run (90 s or longer)' },
];
