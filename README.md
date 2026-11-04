# The Journey of Patience

3D endless runner (Three.js + Vite). Mobile-first, deployable to Vercel/Netlify.

## Quick start
```bash
npm install
# 1) put your raw GLB at  assets-src/Runnerboy.glb   then:
npm run optimize          # -> public/models/runnerboy.glb (compressed)
#    (or just copy your GLB straight to public/models/runnerboy.glb, lowercase name)
npm run dev               # open the Network URL on your phone too
npm run build             # -> dist/
```
Add your recordings to `public/audio/` as `surah1.mp3`, `surah2.mp3`, `surah3.mp3`.
Add `?fps` to the URL to see an FPS / draw-call counter.

## Where things are
| File | What it does |
|---|---|
| `src/config.js` | Every tunable number + the 3 Surah names/files |
| `src/player.js` | GLB boy, animations, lanes, jump, slide |
| `src/world.js` | Endless modular road + InstancedMesh town |
| `src/spawner.js` | Pooled obstacles, Surah + Zamzam, collisions |
| `src/game.js` | State machine, lives, victory, chase/drift camera |
| `src/ui.js`, `style.css`, `index.html` | HUD + all screens |
| `src/input.js` | Swipe, keyboard, buttons |
| `src/audio.js` | Generated SFX + sequential Tilawat |

## Troubleshooting
- **Boy runs backwards** -> `charFacing` in `src/config.js` (`Math.PI` <-> `0`).
- **Boy not found / placeholder capsule** -> file must be `public/models/runnerboy.glb` (lowercase).
- **Animation missing** -> open the browser console; it lists the clip names it found.
- **No Tilawat sound** -> check the mp3 names in `public/audio/`.

## Gameplay systems (round 2)
- **Obstacles**: 30 types in 6 categories (`src/obstacles.js`). Behaviours: static, rotating, temporary, moving (fast approach), falling (red marker on the ground), expanding, sliding between lanes. Patterns: single, pair, wall, jump/slide sequences, narrow passages, combos, sweepers.
- **Difficulty**: `TIERS` and `SPEED_KNOTS` in `src/config.js` (Easy 0-30 s, Normal 30-60, Medium 60-90, Hard 90-120, Very Hard 120-180, Extreme 180+).
- **Surahs**: three unique designs, appear after obstacle sequences, some above obstacles (jump to grab), missed ones respawn after a cooldown (`surahCooldown`).
- **Events**: Foggy Path, Rainstorm, Distraction Rush, Peaceful Stretch (`src/events.js`).
- **Day/night**: `dayCycle` seconds per full cycle (`src/config.js`); lamps, windows, moon and stars follow it.
- **Music**: generated in code (`src/music.js`), gets faster and fuller with difficulty.
- **Achievements**: 7, saved in localStorage (`src/config.js` ACH).

## Debug URL options
`?fps` FPS counter · `?t=75` start 75 s into the run (jump to Hard) · `?tod=0.75` start at night (0 dawn, 0.4 noon, 0.6 dusk, 0.75 night).
In the browser console: `__game.events.start('rain' | 'fog' | 'rush' | 'peace')`.
