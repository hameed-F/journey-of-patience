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
  ayahFirstAt: 8,           // seconds into the run until the first ayah appears
  ayahInterval: 7,          // seconds between ayah spawns
  ayahCooldown: 6,          // a missed ayah waits this long before it can respawn
  sabrMax: 10,              // dates needed to fill the Sabr (patience) meter
  sabrShield: 5,            // seconds of protection when it is full
  zamzamInterval: 18,       // min seconds between Zamzam spawns (only if a life is missing)

  // Camera
  camHeight: 4.2,
  camDist: 7.5,

  // Rendering
  maxPixelRatio: 1.5,
  minPixelRatio: 0.9,

  // World
  segLength: 24,
  segCount: 5,

  // Day / night (seconds for a full cycle)
  dayCycle: 120,
  startTod: 0.12,           // 0 = dawn, 0.4 = noon, 0.6 = dusk, 0.75 = night
};

// Put your own Surahs/files here. Audio files go in /public/audio/
export const SURAHS = [
  { id: 0, name: 'Al-Asr', arabic: 'العصر', num: 103, ayahs: 3, file: '/audio/surah1.mp3', ayat: [
    { ar: 'وَالْعَصْرِ', en: 'By the passage of time!' },
    { ar: 'إِنَّ الْإِنسَانَ لَفِي خُسْرٍ', en: 'Indeed, humanity is in loss.' },
    { ar: 'إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ', en: 'Except those who have faith, do good deeds, encourage one another to the truth, and encourage one another to patience.' },
  ] },
  { id: 1, name: 'Ash-Sharh', arabic: 'الشرح', num: 94, ayahs: 8, file: '/audio/surah2.mp3', ayat: [
    { ar: 'أَلَمْ نَشْرَحْ لَكَ صَدْرَكَ', en: 'Did We not expand your chest for you?' },
    { ar: 'وَوَضَعْنَا عَنكَ وِزْرَكَ', en: 'And remove from you your burden,' },
    { ar: 'الَّذِي أَنقَضَ ظَهْرَكَ', en: 'Which weighed heavily upon your back?' },
    { ar: 'وَرَفَعْنَا لَكَ ذِكْرَكَ', en: 'And raise high your reputation?' },
    { ar: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا', en: 'Indeed, with hardship comes ease.' },
    { ar: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', en: 'Indeed, with hardship comes ease.' },
    { ar: 'فَإِذَا فَرَغْتَ فَانصَبْ', en: 'So when you have finished your duties, then strive in worship.' },
    { ar: 'وَإِلَىٰ رَبِّكَ فَارْغَب', en: 'And turn your longing towards your Lord.' },
  ] },
  { id: 2, name: 'Al-Ikhlas', arabic: 'الإخلاص', num: 112, ayahs: 4, file: '/audio/surah3.mp3', ayat: [
    { ar: 'قُلْ هُوَ اللَّهُ أَحَدٌ', en: 'Say: He is Allah, the One and Only.' },
    { ar: 'اللَّهُ الصَّمَدُ', en: 'Allah, the Eternal Refuge, upon whom all depend.' },
    { ar: 'لَمْ يَلِدْ وَلَمْ يُولَدْ', en: 'He neither begets nor is born.' },
    { ar: 'وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ', en: 'And there is none comparable to Him.' },
  ] },
];

// Difficulty by survival time.
//  gap  = seconds between obstacle patterns      step = seconds between rows inside a pattern
//  w    = pattern weights                         pBeh = chance an obstacle gets a special behaviour
//  seq  = max rows in a jump/slide sequence       narrow = max rows in a narrow passage
export const TIERS = [
  { name: 'Normal',    from: 0,   gap: 1.45, step: 1.15, pBeh: 0.25, beh: ['rotating', 'temporary'],
    w: { single: 40, pair: 30, wall: 12, seq: 8, narrow: 10 }, seq: 2, narrow: 3 },
  { name: 'Medium',    from: 30,  gap: 1.25, step: 1.05, pBeh: 0.35, beh: ['rotating', 'temporary', 'moving', 'falling'],
    w: { single: 25, pair: 25, wall: 10, seq: 15, narrow: 15, sweeper: 10 }, seq: 3, narrow: 4 },
  { name: 'Hard',      from: 60,  gap: 1.05, step: 0.98, pBeh: 0.45, beh: ['rotating', 'temporary', 'moving', 'falling', 'expanding', 'sliding'],
    w: { single: 15, pair: 20, wall: 8, seq: 20, narrow: 17, combo: 10, sweeper: 10 }, seq: 3, narrow: 4 },
  { name: 'Very Hard', from: 90,  gap: 0.9,  step: 0.92, pBeh: 0.55, beh: ['rotating', 'temporary', 'moving', 'falling', 'expanding', 'sliding'],
    w: { single: 10, pair: 15, seq: 25, narrow: 20, combo: 15, sweeper: 15 }, seq: 4, narrow: 5 },
  { name: 'Extreme',   from: 150, gap: 0.8,  step: 0.88, pBeh: 0.6,  beh: ['rotating', 'temporary', 'moving', 'falling', 'expanding', 'sliding'],
    w: { single: 5, pair: 10, seq: 25, narrow: 20, combo: 20, sweeper: 20 }, seq: 4, narrow: 5 },
];

// [seconds, speed] - speed is interpolated between these points
export const SPEED_KNOTS = [[0, 16], [30, 18.5], [60, 21.5], [90, 25], [150, 29]];

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
  { id: 'first',       icon: '🌙', name: 'First Step',          desc: 'Complete one Surah' },
  { id: 'determined',  icon: '💪', name: 'Determined',          desc: 'Complete two Surahs' },
  { id: 'journey',     icon: '🕌', name: 'Journey Complete',    desc: 'Complete all three Surahs' },
  { id: 'perfect',     icon: '❤️', name: 'Perfect Journey',     desc: 'Finish with three lives' },
  { id: 'independent', icon: '💧', name: 'Independent Journey', desc: 'Finish without using Zamzam' },
  { id: 'sabr',        icon: '🌴', name: 'Patience Rewarded',   desc: 'Fill the Sabr meter with dates' },
  { id: 'resilient',   icon: '🛡️', name: 'Resilient Runner',    desc: 'Finish a run that reaches Very Hard' },
];
