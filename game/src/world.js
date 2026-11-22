// GILDED — the simulation. One job: the rules of the heist. No drawing here,
// no sound here, no DOM here: given a level and inputs, advance the world one
// step and say what happened. main.js calls update(dt, input) every frame.
import {
  TILE,
  WALK_SPEED,
  SNEAK_SPEED,
  GUARD_PATROL_SPEED,
  GUARD_CHASE_SPEED,
  GUARD_INVESTIGATE_SPEED,
  GUARD_VIEW_RANGE,
  GUARD_VIEW_HALF_ANGLE,
  CAMERA_VIEW_RANGE,
  CAMERA_VIEW_HALF_ANGLE,
  SUSPICION_GAIN_NEAR,
  SUSPICION_GAIN_FAR,
  SUSPICION_DECAY,
  CATCH_DISTANCE,
  ALARM_CAMERA_RATE,
  ALARM_GUARD_RATE,
  ALARM_DECAY,
  COIN_HEAR_RADIUS,
  COIN_INVESTIGATE_SECONDS,
  clamp,
  distance,
  angleDelta,
} from './config.js';
import { LEVELS, tileCenter } from './levels.js';
import { pointInVisionCone, coinHeardBy } from './vision.js';

const PLAYER_RADIUS = 10;
const GUARD_RADIUS = 11;

function rectsFromTiles(tiles) {
  return tiles.map((t) => ({ x: t.x * TILE, y: t.y * TILE, w: t.w * TILE, h: t.h * TILE }));
}

export function createWorld(levelIndex, seed) {
  const def = LEVELS[levelIndex];
  const walls = rectsFromTiles(def.walls);
  const covers = rectsFromTiles(def.covers);
  const solids = [...walls, ...covers];
  const start = tileCenter(def.playerStart.x, def.playerStart.y);
  const exitRect = {
    x: def.exit.x * TILE,
    y: def.exit.y * TILE,
    w: def.exit.w * TILE,
    h: def.exit.h * TILE,
  };
  return {
    levelIndex,
    def,
    seed,
    walls,
    covers,
    solids,
    exitRect,
    player: { x: start.x, y: start.y, sneaking: false, moving: false, face: 0 },
    guards: def.guards.map((g, i) => {
      const p = tileCenter(g.path[0][0], g.path[0][1]);
      return {
        id: i,
        x: p.x,
        y: p.y,
        path: g.path,
        waypoint: 1 % g.path.length,
        pause: g.pause,
        pauseTimer: 0,
        facing: 0,
        suspicion: 0,
        state: 'patrol', // patrol | chase | investigate
        investigateX: 0,
        investigateY: 0,
        investigateTimer: 0,
        loseSightTimer: 0,
      };
    }),
    cameras: def.cameras.map((c) => {
      const p = tileCenter(c.x, c.y);
      return { x: p.x, y: p.y, baseAngle: c.baseAngle, sweep: c.sweep, speed: c.speed, angle: c.baseAngle, seen: false };
    }),
    loot: def.loot.map((l) => {
      const p = tileCenter(l.x, l.y);
      return { ...l, x: p.x, y: p.y, taken: false };
    }),
    coins: [],
    coinsLeft: def.coins,
    alarm: 0,
    score: 0,
    levelTime: 0,
    status: 'playing', // playing | caught | escaped | won
    caughtReason: '',
    gemTaken: false,
    events: [], // one-frame notices for sound + HUD: {type, x, y}
    totalScore: 0,
  };
}

// Circle vs rect: push the circle out. Returns true when a hit happened.
function collideCircleRect(px, py, r, rect) {
  const cx = clamp(px, rect.x, rect.x + rect.w);
  const cy = clamp(py, rect.y, rect.y + rect.h);
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy < r * r;
}

function moveWithCollision(entity, dx, dy, radius, solids) {
  // Axis-separated so sliding along a wall feels natural.
  const nx = entity.x + dx;
  if (!solids.some((s) => collideCircleRect(nx, entity.y, radius, s))) entity.x = nx;
  const ny = entity.y + dy;
  if (!solids.some((s) => collideCircleRect(entity.x, ny, radius, s))) entity.y = ny;
  // Stay inside the room.
  entity.x = clamp(entity.x, TILE + radius, 40 * TILE - TILE - radius);
  entity.y = clamp(entity.y, TILE + radius, 15 * TILE - TILE - radius);
}

export function tossCoin(world, tx, ty) {
  if (world.status !== 'playing' || world.coinsLeft <= 0) return false;
  const px = world.player.x;
  const py = world.player.y;
  const d = distance(px, py, tx, ty);
  const maxThrow = 300;
  const k = d > maxThrow ? maxThrow / d : 1;
  const cx = px + (tx - px) * k;
  const cy = py + (ty - py) * k;
  world.coinsLeft -= 1;
  world.coins.push({ x: cx, y: cy, ring: 0 });
  world.events.push({ type: 'coin', x: cx, y: cy });
  for (const g of world.guards) {
    if (g.state === 'chase') continue; // a chasing guard does not get fooled
    if (coinHeardBy(cx, cy, g.x, g.y, COIN_HEAR_RADIUS)) {
      g.state = 'investigate';
      g.investigateX = cx;
      g.investigateY = cy;
      g.investigateTimer = COIN_INVESTIGATE_SECONDS;
      g.suspicion = Math.min(g.suspicion, 0.4);
    }
  }
  return true;
}

export function updateWorld(world, dt, input) {
  if (world.status !== 'playing') return;
  world.levelTime += dt;
  const p = world.player;

  // --- Player movement ---
  const speed = input.sneak ? SNEAK_SPEED : WALK_SPEED;
  let mx = input.moveX;
  let my = input.moveY;
  const len = Math.hypot(mx, my);
  if (len > 1) {
    mx /= len;
    my /= len;
  }
  p.moving = len > 0.05;
  p.sneaking = !!input.sneak;
  if (p.moving) p.face = Math.atan2(my, mx);
  moveWithCollision(p, mx * speed * dt, my * speed * dt, PLAYER_RADIUS, world.solids);

  // --- Coins ring out and fade ---
  for (const c of world.coins) c.ring += dt * 90;
  world.coins = world.coins.filter((c) => c.ring < 130);

  // --- Cameras sweep; a camera holding you raises the alarm fast ---
  let cameraSees = false;
  for (const cam of world.cameras) {
    cam.angle = cam.baseAngle + Math.sin(world.levelTime * cam.speed) * cam.sweep;
    cam.seen = pointInVisionCone(
      cam.x, cam.y, cam.angle, CAMERA_VIEW_HALF_ANGLE, CAMERA_VIEW_RANGE,
      p.x, p.y, world.solids,
    );
    if (cam.seen) cameraSees = true;
  }
  if (cameraSees) {
    world.alarm += ALARM_CAMERA_RATE * dt;
    world.events.push({ type: 'camera', x: p.x, y: p.y });
  }

  // --- Guards: patrol, chase, investigate; suspicion builds in their cone ---
  let guardSees = false;
  for (const g of world.guards) {
    const sees = pointInVisionCone(
      g.x, g.y, g.facing, GUARD_VIEW_HALF_ANGLE, GUARD_VIEW_RANGE,
      p.x, p.y, world.solids,
    );
    if (sees) {
      guardSees = true;
      const d = distance(g.x, g.y, p.x, p.y);
      const near = d < 110;
      const rate = near ? SUSPICION_GAIN_NEAR : SUSPICION_GAIN_FAR;
      const quiet = p.sneaking ? 0.55 : 1;
      g.suspicion = clamp(g.suspicion + rate * quiet * dt, 0, 1);
      g.loseSightTimer = 0;
      if (g.suspicion >= 1 && g.state !== 'chase') {
        g.state = 'chase';
        world.events.push({ type: 'spotted', x: g.x, y: g.y });
      }
    } else {
      g.suspicion = clamp(g.suspicion - SUSPICION_DECAY * dt, 0, 1);
      if (g.state === 'chase') {
        g.loseSightTimer += dt;
        if (g.loseSightTimer > 2.5) {
          g.state = 'patrol';
          g.suspicion = 0.2;
        }
      }
    }
    if (sees && g.suspicion > 0) {
      world.alarm += ALARM_GUARD_RATE * g.suspicion * dt;
    }

    if (g.state === 'patrol') {
      if (g.pauseTimer > 0) {
        g.pauseTimer -= dt;
      } else {
        const wp = g.path[g.waypoint];
        const target = tileCenter(wp[0], wp[1]);
        const d = distance(g.x, g.y, target.x, target.y);
        if (d < 6) {
          g.waypoint = (g.waypoint + 1) % g.path.length;
          g.pauseTimer = g.pause;
        } else {
          const step = (GUARD_PATROL_SPEED * dt) / d;
          const nx = g.x + (target.x - g.x) * step;
          const ny = g.y + (target.y - g.y) * step;
          g.facing = Math.atan2(target.y - g.y, target.x - g.x);
          moveWithCollision(g, nx - g.x, ny - g.y, GUARD_RADIUS, world.walls);
        }
      }
    } else if (g.state === 'chase') {
      const d = distance(g.x, g.y, p.x, p.y);
      if (d > 1) {
        const step = (GUARD_CHASE_SPEED * dt) / d;
        const nx = g.x + (p.x - g.x) * step;
        const ny = g.y + (p.y - g.y) * step;
        g.facing = Math.atan2(p.y - g.y, p.x - g.x);
        moveWithCollision(g, nx - g.x, ny - g.y, GUARD_RADIUS, world.walls);
      }
      if (d < CATCH_DISTANCE) {
        world.status = 'caught';
        world.caughtReason = 'A guard grabbed you in the dark.';
        world.events.push({ type: 'caught', x: p.x, y: p.y });
      }
    } else if (g.state === 'investigate') {
      const d = distance(g.x, g.y, g.investigateX, g.investigateY);
      if (d > 8) {
        const step = (GUARD_INVESTIGATE_SPEED * dt) / d;
        const nx = g.x + (g.investigateX - g.x) * step;
        const ny = g.y + (g.investigateY - g.y) * step;
        g.facing = Math.atan2(g.investigateY - g.y, g.investigateX - g.x);
        moveWithCollision(g, nx - g.x, ny - g.y, GUARD_RADIUS, world.walls);
      } else {
        g.facing += dt * 1.6; // look around, puzzled
        g.investigateTimer -= dt;
        if (g.investigateTimer <= 0) {
          g.state = 'patrol';
          g.suspicion = 0;
        }
      }
    }
  }

  // --- Alarm cools while nobody sees you; at 100 the vault seals ---
  if (!cameraSees && !guardSees) {
    world.alarm = Math.max(0, world.alarm - ALARM_DECAY * dt);
  }
  world.alarm = clamp(world.alarm, 0, 100);
  if (world.alarm >= 100) {
    world.status = 'caught';
    world.caughtReason = 'The alarm hit 100% — the vault sealed shut.';
    world.events.push({ type: 'caught', x: p.x, y: p.y });
    return;
  }

  // --- Loot: walk over it to pocket it ---
  for (const l of world.loot) {
    if (l.taken) continue;
    if (distance(p.x, p.y, l.x, l.y) < 22) {
      l.taken = true;
      world.score += l.value;
      world.events.push({ type: l.kind === 'gem' ? 'gem' : 'loot', x: l.x, y: l.y });
      if (l.kind === 'gem') world.gemTaken = true;
    }
  }

  // --- Exit: open only once the room's gem is pocketed ---
  if (world.gemTaken) {
    const e = world.exitRect;
    if (p.x > e.x && p.x < e.x + e.w && p.y > e.y && p.y < e.y + e.h) {
      const timeBonus = Math.max(0, Math.round(400 - world.levelTime * 4));
      world.score += timeBonus;
      world.status = world.levelIndex >= LEVELS.length - 1 ? 'won' : 'escaped';
      world.events.push({ type: 'escape', x: p.x, y: p.y });
    }
  }
}

export function levelScore(world) {
  return world.score;
}
