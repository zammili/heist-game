// GILDED — sight and hearing. One job: answer "can this watcher see (or
// hear) that point?" Walls and low covers both block sight; only walls block
// movement. All geometry is plain math, no canvas dependency, so the sim and
// the renderer share exactly one notion of a vision cone.
import { angleDelta, clamp } from './config.js';

// Does the segment (x1,y1)-(x2,y2) cross the axis-aligned rect?
export function segmentHitsRect(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  // Slab test on x.
  if (dx === 0) {
    if (x1 < rect.x || x1 > rect.x + rect.w) return false;
  } else {
    let t1 = (rect.x - x1) / dx;
    let t2 = (rect.x + rect.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  // Slab test on y.
  if (dy === 0) {
    if (y1 < rect.y || y1 > rect.y + rect.h) return false;
  } else {
    let t1 = (rect.y - y1) / dy;
    let t2 = (rect.y + rect.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
}

// True when nothing solid stands between the two points. `solids` are pixel
// rects (walls + covers). A watcher standing inside a solid still sees out.
export function hasLineOfSight(x1, y1, x2, y2, solids) {
  for (const s of solids) {
    if (segmentHitsRect(x1, y1, x2, y2, s)) return false;
  }
  return true;
}

// Is (tx,ty) inside the watcher's cone? Facing `angle`, half-angle `half`,
// range `range`, and a clear line of sight through `solids`.
export function pointInVisionCone(wx, wy, angle, half, range, tx, ty, solids) {
  const dx = tx - wx;
  const dy = ty - wy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 12) return true; // touching the watcher is always seen
  const targetAngle = Math.atan2(dy, dx);
  if (Math.abs(angleDelta(angle, targetAngle)) > half) return false;
  return hasLineOfSight(wx, wy, tx, ty, solids);
}

// Where a cone's edge ray first meets a solid (or its full range). Used to
// clip the drawn cone so it hugs the walls instead of painting through them.
export function coneRayLength(wx, wy, angle, range, solids) {
  const ex = wx + Math.cos(angle) * range;
  const ey = wy + Math.sin(angle) * range;
  let best = range;
  for (const s of solids) {
    // Sample along the ray; cheap and plenty accurate for a drawn cone.
    const steps = 24;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const px = wx + (ex - wx) * t;
      const py = wy + (ey - wy) * t;
      if (px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h) {
        best = Math.min(best, range * t);
        break;
      }
    }
  }
  return Math.max(best, 8);
}

// Build the polygon points of a vision cone, clipped by solids.
export function visionConePolygon(wx, wy, angle, half, range, solids, steps = 14) {
  const points = [{ x: wx, y: wy }];
  for (let i = 0; i <= steps; i++) {
    const a = angle - half + (2 * half * i) / steps;
    const len = coneRayLength(wx, wy, a, range, solids);
    points.push({ x: wx + Math.cos(a) * len, y: wy + Math.sin(a) * len });
  }
  return points;
}

// Hearing: a coin landing within `radius` of a guard is heard, through walls.
export function coinHeardBy(coinX, coinY, guardX, guardY, radius) {
  return Math.hypot(coinX - guardX, coinY - guardY) <= radius;
}

export function clamp01(v) {
  return clamp(v, 0, 1);
}
