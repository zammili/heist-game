# GILDED — The Meridian Gallery Heist

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/zammili/heist-game/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/zammili/heist-game/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![license](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

A top-down museum heist in three rooms. You are the thief in the Meridian
Gallery on opening night: slip past patrolling guards and sweeping security
cameras, pocket the relics, steal the room's gem, and reach the green exit
before the alarm meter seals the vault.

## How to play

- **Move:** WASD or arrow keys
- **Sneak:** hold Shift — slower, harder to spot
- **Toss a coin:** click anywhere — the clink lures the nearest guard over to
  look, but coins are scarce (3–4 per room)
- **Win a room:** grab its gem, then reach the green EXIT
- **Lose:** a guard touches you, or the alarm meter hits 100%
- **Restart a room:** R · **Mute:** M

Guards see you only inside their yellow vision cone with a clear line of
sight — walls and display cases block it, and sneaking buys you time.
Cameras sweep blue cones that raise the alarm fast. Each room has more than
one route: the carpet runner is the fast, exposed line; the cases and alcoves
are the slow, safe one.

## Layout

```
game/
  index.html          page + canvas (1280×480)
  src/
    config.js         tuning, palette, seeded RNG
    levels.js         the three rooms (walls, guards, cameras, loot)
    vision.js         line of sight, vision cones, hearing
    world.js          the simulation: movement, guards, alarm, loot, tools
    render.js         canvas painting: floor, cones, HUD, overlays
    audio.js          synthesized WebAudio: footsteps, chimes, siren, drone
    input.js          keyboard + mouse, one small object per frame
    shots.js          deterministic ?shot= scenes for screenshots
    main.js           boot, state machine, frame loop, self-test
main.ts               entry program: copies game/ + screenshots/ to /output,
                      writes dossier.json via vendor/makefun-game.ts
serve.ts              tiny static server: node serve.ts → http://localhost:8080
shots.json            screenshot list (name + ?shot= query)
screenshots/         3–4 real renders of the game (cover first)
vendor/
  makefun-game.ts     the kit's dossier library, unchanged
```

Play it locally with `node serve.ts`, then open http://localhost:8080.
Screenshots are staged deterministically: open
`http://localhost:8080/?shot=play&seed=1` (or `start`, `alert`, `win`) and
capture the frame. `?selftest=1` runs the rules through scripted play and
prints PASS/FAIL into the page.

All art, names, sounds and music are original, made for this game — no
assets from any commercial game.

*Entered via [make.fun](https://make.fun/bounty/best-heist-game-20261122-0559) — referral code `nj55s4jw`.*
