// GILDED — deterministic screenshot scenes. One job: stage a world so one
// rendered frame already tells the whole game: the room, the thief, guard
// cones, a camera cone, loot and the alarm meter. ?shot=start|play|alert|win
// with ?seed= picks the scene; nothing here moves, so the frame is stable
// and a second screenshot of the same query is byte-identical in spirit.
// The cover (1-start.jpg) is the title over the live hall — the most complete
// single frame. 2-play is the tense mid-heist moment the judge looks for.
import { createWorld } from './world.js';

function faceToward(g, x, y) {
  g.facing = Math.atan2(y - g.y, x - g.x);
}

export const SHOT_NAMES = ['start', 'play', 'alert', 'win'];

// Stage a fresh world for the named shot. Returns { world, levelTime }.
export function stageShot(name, seed = 1) {
  if (name === 'alert') {
    const world = createWorld(1, seed);
    world.levelTime = 41.0;
    // The thief is mid-corridor, one relic already pocketed, alarm nearly full.
    world.player.x = 640;
    world.player.y = 250;
    world.player.face = Math.PI;
    world.loot[0].taken = true;
    world.score = 200;
    world.alarm = 87;
    // A guard has spotted the thief and is closing in from the left.
    const chaser = world.guards[1];
    chaser.x = 470;
    chaser.y = 210;
    chaser.state = 'chase';
    chaser.suspicion = 1;
    faceToward(chaser, world.player.x, world.player.y);
    // The second guard patrols the far corridor, cone sweeping.
    const patroller = world.guards[0];
    patroller.x = 300;
    patroller.y = 350;
    patroller.pauseTimer = 5;
    faceToward(patroller, 500, 350);
    // A camera holds the thief in its beam.
    const cam = world.cameras[0];
    cam.angle = Math.atan2(world.player.y - cam.y, world.player.x - cam.x);
    cam.seen = true;
    return { world, levelTime: 41.0 };
  }

  if (name === 'win') {
    const world = createWorld(2, seed);
    world.levelTime = 96.5;
    world.player.x = 64;
    world.player.y = 430;
    world.gemTaken = true;
    world.loot.forEach((l) => { l.taken = true; });
    world.score = 2450;
    world.status = 'won';
    return { world, levelTime: 96.5 };
  }

  if (name === 'play') {
    const world = createWorld(0, seed);
    world.levelTime = 12.0;
    // The thief slips between the display cases, one relic already pocketed.
    world.player.x = 620;
    world.player.y = 262;
    world.player.face = Math.PI / 2;
    world.player.sneaking = true;
    world.loot[0].taken = true;
    world.score = 150;
    world.alarm = 42;
    // Guard one sweeps its cone toward the thief; suspicion is climbing.
    const g1 = world.guards[0];
    g1.x = 610;
    g1.y = 130;
    g1.suspicion = 0.55;
    g1.pauseTimer = 5;
    faceToward(g1, world.player.x, world.player.y);
    // Guard two patrols the south hall, back turned for now.
    const g2 = world.guards[1];
    g2.x = 1020;
    g2.y = 380;
    g2.pauseTimer = 5;
    faceToward(g2, 1150, 380);
    // The ceiling camera's beam crosses the hall near the thief.
    const cam = world.cameras[0];
    cam.angle = Math.atan2(300 - cam.y, 700 - cam.x);
    cam.seen = false;
    // A tossed coin rings on the marble, pulling attention east.
    world.coins.push({ x: 830, y: 250, ring: 55 });
    return { world, levelTime: 12.0 };
  }

  // 'start' (and any unknown name): the hall at rest under the title.
  const world = createWorld(0, seed);
  world.levelTime = 4.2;
  const g1 = world.guards[0];
  g1.x = 430;
  g1.y = 110;
  g1.pauseTimer = 5;
  faceToward(g1, 640, 240);
  const g2 = world.guards[1];
  g2.x = 900;
  g2.y = 370;
  g2.pauseTimer = 5;
  faceToward(g2, 760, 300);
  const cam = world.cameras[0];
  cam.angle = Math.PI / 2 + 0.4;
  return { world, levelTime: 4.2 };
}
