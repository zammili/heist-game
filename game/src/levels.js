// GILDED — the three rooms of the Meridian Gallery. One job: level data only.
// Walls are tile rects {x, y, w, h} (grid is 40 x 15, tile = 32px). Guards walk
// a loop of tile waypoints. Cameras sit on a wall tile and sweep their cone.
// Loot: kind 'gem' is the room's main target (needed to open the exit),
// kind 'relic' is optional score. The exit only opens once the gem is taken,
// so every room is a loop: in quiet, grab, get out.
export const LEVELS = [
  {
    name: 'I — The Gilded Hall',
    subtitle: 'Opening night. The Gilded Mask hangs at the far wall.',
    gemName: 'The Gilded Mask',
    coins: 3,
    playerStart: { x: 2, y: 13 },
    exit: { x: 1, y: 13, w: 1, h: 1 },
    walls: [
      { x: 9, y: 3, w: 6, h: 1 }, // long display case, north hall
      { x: 25, y: 3, w: 6, h: 1 },
      { x: 9, y: 11, w: 6, h: 1 }, // long display case, south hall
      { x: 25, y: 11, w: 6, h: 1 },
      { x: 17, y: 6, w: 2, h: 3 }, // central statue plinth
      { x: 21, y: 6, w: 2, h: 3 },
      { x: 34, y: 2, w: 1, h: 4 }, // east alcove wall
      { x: 5, y: 2, w: 1, h: 3 }, // west alcove wall
    ],
    covers: [
      { x: 12, y: 7, w: 2, h: 1 },
      { x: 26, y: 7, w: 2, h: 1 },
      { x: 19, y: 12, w: 2, h: 1 },
    ],
    guards: [
      { path: [[6, 2], [19, 2], [19, 6], [6, 6]], pause: 0.8 },
      { path: [[33, 12], [22, 12], [22, 8], [33, 8]], pause: 0.8 },
    ],
    cameras: [
      { x: 20, y: 0, baseAngle: Math.PI / 2, sweep: 0.85, speed: 0.55 },
    ],
    loot: [
      { x: 4, y: 7, kind: 'relic', name: 'Jade Scarab', value: 150 },
      { x: 20, y: 7, kind: 'relic', name: 'Ivory Fan', value: 150 },
      { x: 36, y: 7, kind: 'relic', name: 'Silver Lute', value: 150 },
      { x: 37, y: 2, kind: 'gem', name: 'The Gilded Mask', value: 600 },
    ],
  },
  {
    name: 'II — The Vault Corridor',
    subtitle: 'Two routes, one corridor. The Crown of Tides waits past the lasers.',
    gemName: 'The Crown of Tides',
    coins: 3,
    playerStart: { x: 2, y: 7 },
    exit: { x: 1, y: 7, w: 1, h: 1 },
    walls: [
      { x: 8, y: 0, w: 1, h: 6 }, // corridor splitter, north half
      { x: 8, y: 9, w: 1, h: 6 }, // corridor splitter, south half
      { x: 18, y: 5, w: 4, h: 1 }, // middle block, upper route open below
      { x: 18, y: 9, w: 4, h: 1 },
      { x: 28, y: 0, w: 1, h: 5 },
      { x: 28, y: 10, w: 1, h: 5 },
      { x: 34, y: 5, w: 2, h: 2 }, // vault door frame
    ],
    covers: [
      { x: 12, y: 3, w: 2, h: 1 },
      { x: 12, y: 11, w: 2, h: 1 },
      { x: 24, y: 7, w: 2, h: 1 },
    ],
    guards: [
      { path: [[4, 3], [14, 3], [14, 11], [4, 11]], pause: 0.6 },
      { path: [[24, 2], [32, 2], [32, 6], [24, 6]], pause: 0.6 },
      { path: [[24, 12], [32, 12], [32, 8], [24, 8]], pause: 0.6 },
    ],
    cameras: [
      { x: 16, y: 0, baseAngle: Math.PI / 2, sweep: 0.7, speed: 0.7 },
      { x: 30, y: 14, baseAngle: -Math.PI / 2, sweep: 0.7, speed: 0.6 },
    ],
    loot: [
      { x: 6, y: 12, kind: 'relic', name: 'Moon Pearl', value: 200 },
      { x: 26, y: 4, kind: 'relic', name: 'Brass Astrolabe', value: 200 },
      { x: 36, y: 12, kind: 'relic', name: 'Velvet Ledger', value: 200 },
      { x: 37, y: 7, kind: 'gem', name: 'The Crown of Tides', value: 800 },
    ],
  },
  {
    name: 'III — The Meridian Vault',
    subtitle: 'The Sun of Meridian. Three guards, two cameras, no second chances.',
    gemName: 'The Sun of Meridian',
    coins: 4,
    playerStart: { x: 2, y: 13 },
    exit: { x: 1, y: 13, w: 1, h: 1 },
    walls: [
      { x: 7, y: 3, w: 1, h: 9 }, // vault antechamber walls
      { x: 15, y: 2, w: 8, h: 1 },
      { x: 15, y: 12, w: 8, h: 1 },
      { x: 30, y: 2, w: 1, h: 5 },
      { x: 30, y: 8, w: 1, h: 5 },
      { x: 34, y: 6, w: 3, h: 3 }, // the Sun's pedestal block
    ],
    covers: [
      { x: 10, y: 6, w: 2, h: 1 },
      { x: 18, y: 7, w: 2, h: 1 },
      { x: 26, y: 4, w: 2, h: 1 },
      { x: 26, y: 10, w: 2, h: 1 },
    ],
    guards: [
      { path: [[4, 4], [4, 11], [10, 11], [10, 4]], pause: 0.5 },
      { path: [[18, 4], [27, 4], [27, 10], [18, 10]], pause: 0.5 },
      { path: [[33, 3], [37, 3], [37, 12], [33, 12]], pause: 0.5 },
    ],
    cameras: [
      { x: 19, y: 0, baseAngle: Math.PI / 2, sweep: 0.9, speed: 0.8 },
      { x: 32, y: 14, baseAngle: -Math.PI / 2, sweep: 0.9, speed: 0.75 },
    ],
    loot: [
      { x: 5, y: 7, kind: 'relic', name: 'Ember Opal', value: 250 },
      { x: 24, y: 2, kind: 'relic', name: 'Star Chart', value: 250 },
      { x: 12, y: 13, kind: 'relic', name: 'Golden Quill', value: 250 },
      { x: 38, y: 7, kind: 'gem', name: 'The Sun of Meridian', value: 1200 },
    ],
  },
];

// Tile centre in pixels.
export function tileCenter(tx, ty) {
  return { x: tx * 32 + 16, y: ty * 32 + 16 };
}
