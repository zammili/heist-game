// GILDED — boot and game loop. One job: own the state machine (title ->
// playing -> caught / level clear -> won), run the frame loop, and wire input,
// sound and the deterministic ?shot= / ?selftest= modes. The simulation lives
// in world.js, the painting in render.js; this file only drives them.
import { VIEW_W, VIEW_H } from './config.js';
import { createWorld, updateWorld, tossCoin } from './world.js';
import { createInput } from './input.js';
import { Sound } from './audio.js';
import { stageShot } from './shots.js';
import {
  drawWorld, drawTitle, drawCaught, drawLevelClear, drawWin,
} from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;

let state = 'title'; // title | playing | caught | levelClear | won
let world = createWorld(0, seed);
let totalScore = 0;
let levelBonus = 0;
let lastTime = 0;
let stepSoundTimer = 0;

function startLevel(index, carryScore) {
  world = createWorld(index, seed);
  totalScore = carryScore;
  state = 'playing';
  input.clearClicks();
}

function handleWorldEvents() {
  for (const e of world.events) {
    if (e.type === 'coin') Sound.coin();
    else if (e.type === 'loot') Sound.loot();
    else if (e.type === 'gem') Sound.gem();
    else if (e.type === 'spotted') Sound.spotted();
    else if (e.type === 'caught') Sound.caught();
    else if (e.type === 'escape') Sound.escape();
  }
  world.events.length = 0;
}

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000 || 0.016);
  lastTime = now;
  const t = now / 1000;

  if (state === 'title') {
    drawTitle(ctx, world, t);
    const click = input.takeClick();
    if (click || input.pressed('Enter')) {
      Sound.unlock();
      input.consume('Enter');
      input.clearClicks();
      startLevel(0, 0);
    }
  } else if (state === 'playing') {
    const move = input.readMove();
    const click = input.takeClick();
    if (click) tossCoin(world, click.x, click.y);
    if (input.pressed('m') || input.pressed('M')) {
      Sound.toggleMute();
      input.consume('m');
      input.consume('M');
    }
    updateWorld(world, dt, move);
    handleWorldEvents();
    // Footsteps: quiet ticks while moving, quieter while sneaking.
    if (world.player.moving) {
      stepSoundTimer -= dt;
      if (stepSoundTimer <= 0) {
        Sound.step(world.player.sneaking);
        stepSoundTimer = world.player.sneaking ? 0.42 : 0.3;
      }
    }
    drawWorld(ctx, world, totalScore + world.score, t);
    if (world.status === 'caught') {
      state = 'caught';
    } else if (world.status === 'escaped') {
      levelBonus = Math.max(0, Math.round(400 - world.levelTime * 4));
      totalScore += world.score;
      state = 'levelClear';
    } else if (world.status === 'won') {
      totalScore += world.score;
      Sound.win();
      state = 'won';
    }
  } else if (state === 'caught') {
    drawCaught(ctx, world, world.caughtReason, totalScore + world.score);
    if (input.pressed('r') || input.pressed('R')) {
      input.consume('r');
      input.consume('R');
      startLevel(world.levelIndex, totalScore);
    }
  } else if (state === 'levelClear') {
    drawLevelClear(ctx, world, totalScore, levelBonus);
    if (input.pressed('Enter')) {
      input.consume('Enter');
      startLevel(world.levelIndex + 1, totalScore);
    }
  } else if (state === 'won') {
    drawWin(ctx, totalScore);
    if (input.pressed('r') || input.pressed('R')) {
      input.consume('r');
      input.consume('R');
      startLevel(0, 0);
    }
  }

  requestAnimationFrame(frame);
}

// --- Deterministic screenshot mode: one staged frame, no loop, no sound. ---
function renderShot() {
  const { world: shotWorld, levelTime } = stageShot(shotName, seed);
  if (shotName === 'win') {
    drawWin(ctx, shotWorld.score);
  } else if (shotName === 'start') {
    drawTitle(ctx, shotWorld, levelTime);
  } else if (shotName === 'alert') {
    drawWorld(ctx, shotWorld, shotWorld.score, levelTime);
  } else {
    // 'play' and anything else: the tense mid-heist frame.
    drawWorld(ctx, shotWorld, shotWorld.score, levelTime);
  }
  document.title = `GILDED shot=${shotName} seed=${seed}`;
}

// --- Headless self-test: drive the pure simulation through scripted play
// and prove the rules hold (no render loop, one draw to catch paint errors).
// Writes SELFTEST PASS/FAIL into #selftest for the screenshot harness to read.
function runSelfTest() {
  const out = [];
  function check(name, ok) {
    out.push(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  }
  try {
    // 1. A guard that watches the player raises suspicion and the alarm.
    const w1 = createWorld(0, 1);
    w1.player.x = 200;
    w1.player.y = 200; // open floor, south of guard one, clear line of sight
    w1.guards[0].x = 200;
    w1.guards[0].y = 100;
    w1.guards[0].facing = Math.PI / 2;
    w1.guards[0].pauseTimer = 5;
    for (let i = 0; i < 120; i++) updateWorld(w1, 1 / 60, { moveX: 0, moveY: 0, sneak: false });
    check('guard suspicion rises when player is in cone', w1.guards[0].suspicion > 0.5);
    check('alarm rises while seen', w1.alarm > 5);

    // 2. A tossed coin pulls a guard to investigate.
    const w2 = createWorld(0, 1);
    w2.player.x = 300;
    w2.player.y = 140;
    w2.guards[0].x = 300;
    w2.guards[0].y = 100;
    tossCoin(w2, 320, 120);
    check('coin is heard and guard investigates', w2.guards[0].state === 'investigate');
    check('coin count drops', w2.coinsLeft === 2);

    // 3. Walls block sight: player behind a display case is not seen.
    const w3 = createWorld(0, 1);
    w3.player.x = 384; // tile 12, just south of the north display case
    w3.player.y = 176;
    w3.guards[0].x = 384;
    w3.guards[0].y = 80; // north of the case, facing south
    w3.guards[0].facing = Math.PI / 2;
    w3.guards[0].pauseTimer = 5;
    for (let i = 0; i < 120; i++) updateWorld(w3, 1 / 60, { moveX: 0, moveY: 0, sneak: false });
    check('wall blocks vision cone', w3.guards[0].suspicion < 0.05);

    // 4. Loot, gem and exit: grabbing the gem opens the exit and ends the level.
    const w4 = createWorld(0, 1);
    const gem = w4.loot.find((l) => l.kind === 'gem');
    w4.player.x = gem.x;
    w4.player.y = gem.y;
    updateWorld(w4, 1 / 60, { moveX: 0, moveY: 0, sneak: false });
    check('gem is pocketed on touch', w4.gemTaken && w4.score === gem.value);
    const e = w4.exitRect;
    w4.player.x = e.x + e.w / 2;
    w4.player.y = e.y + e.h / 2;
    updateWorld(w4, 1 / 60, { moveX: 0, moveY: 0, sneak: false });
    check('exit completes the level once gem is taken', w4.status === 'escaped');

    // 5. Alarm at 100 seals the vault.
    const w5 = createWorld(0, 1);
    w5.alarm = 99.9;
    w5.cameras[0].seen = true;
    // Force a camera sighting: put the player in the camera's beam.
    w5.player.x = w5.cameras[0].x;
    w5.player.y = w5.cameras[0].y + 100;
    w5.cameras[0].angle = Math.PI / 2;
    for (let i = 0; i < 120 && w5.status === 'playing'; i++) {
      updateWorld(w5, 1 / 60, { moveX: 0, moveY: 0, sneak: false });
    }
    check('alarm 100 ends the run', w5.status === 'caught');

    // 6. Every shot scene stages and paints without throwing.
    for (const name of ['start', 'play', 'alert', 'win']) {
      const { world: sw, levelTime } = stageShot(name, 1);
      if (name === 'win') drawWin(ctx, sw.score);
      else if (name === 'start') drawTitle(ctx, sw, levelTime);
      else drawWorld(ctx, sw, sw.score, levelTime);
    }
    check('all four shot scenes render', true);
  } catch (err) {
    out.push(`FAIL exception: ${err.message}`);
  }
  const failed = out.some((line) => line.startsWith('FAIL'));
  const text = `SELFTEST ${failed ? 'FAIL' : 'PASS'} :: ${out.join(' | ')}`;
  const el = document.getElementById('selftest');
  if (el) el.textContent = text;
  document.title = text;
  console.log(text);
}

if (params.get('selftest') === '1') {
  runSelfTest();
} else if (shotName) {
  renderShot();
} else {
  requestAnimationFrame(frame);
}
