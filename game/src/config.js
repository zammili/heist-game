// GILDED — shared tuning and palette. One job: every number the rest of the
// game reads, so balancing is a one-file edit and no magic numbers leak out.
export const TILE = 32;
export const VIEW_W = 1280;
export const VIEW_H = 480;
export const COLS = 40;
export const ROWS = 15;

// Movement (pixels per second).
export const WALK_SPEED = 150;
export const SNEAK_SPEED = 78;
export const GUARD_PATROL_SPEED = 62;
export const GUARD_CHASE_SPEED = 138;
export const GUARD_INVESTIGATE_SPEED = 96;

// Vision: guards see a cone; cameras see a longer, narrower one.
export const GUARD_VIEW_RANGE = 175;
export const GUARD_VIEW_HALF_ANGLE = 0.61; // ~35 degrees
export const CAMERA_VIEW_RANGE = 225;
export const CAMERA_VIEW_HALF_ANGLE = 0.46; // ~26 degrees

// Detection: suspicion 0..1 per guard. 1.0 means the guard is chasing you.
export const SUSPICION_GAIN_NEAR = 1.35; // per second, close and running
export const SUSPICION_GAIN_FAR = 0.55; // per second, far or sneaking
export const SUSPICION_DECAY = 0.30; // per second while unseen
export const CATCH_DISTANCE = 17;

// Alarm meter 0..100. A camera that holds you in its cone raises it fast;
// a suspicious guard raises it slowly; it cools down while you stay hidden.
// At 100 the vault seals and the run ends.
export const ALARM_CAMERA_RATE = 26;
export const ALARM_GUARD_RATE = 11;
export const ALARM_DECAY = 2.5;

// Tools: a tossed coin is the only loud tool. A guard that hears it walks
// over to look, giving you a window. Coins are scarce on purpose.
export const COIN_HEAR_RADIUS = 210;
export const COIN_INVESTIGATE_SECONDS = 3.2;

export const PALETTE = {
  floorLight: '#2a2f45',
  floorDark: '#252a3e',
  floorTrim: '#1c2133',
  wall: '#141828',
  wallTop: '#232946',
  wallGold: '#c9a227',
  carpet: '#5a2e3a',
  carpetEdge: '#7a3a48',
  cover: '#3d4a6b', // low display plinths you can hide behind (block sight)
  coverTop: '#55648f',
  player: '#e8b64c',
  playerCloak: '#2b2f4a',
  guard: '#c94f4f',
  guardUniform: '#7a2e2e',
  camera: '#9aa5c4',
  cone: 'rgba(232, 182, 76, 0.20)',
  coneHot: 'rgba(220, 60, 60, 0.30)',
  coneCam: 'rgba(120, 180, 255, 0.18)',
  lootSmall: '#7fe0c3',
  lootMain: '#ffd94d',
  exit: '#58d68d',
  alarmLow: '#58d68d',
  alarmMid: '#e8b64c',
  alarmHigh: '#e05252',
  text: '#f2ead8',
  textDim: '#9aa3b8',
  panel: 'rgba(10, 12, 24, 0.82)',
  shadow: 'rgba(0, 0, 0, 0.45)',
};

// Tiny deterministic RNG (mulberry32) so ?shot= scenes and replays are stable.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

// Smallest signed angle from a to b, in (-PI, PI].
export function angleDelta(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d <= -Math.PI) d += Math.PI * 2;
  return d;
}
