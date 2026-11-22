// GILDED — the renderer. One job: paint the world on the canvas. The look
// is deliberate: a dark marble gallery, gold trim, warm loot, red guards, blue
// camera cones — safe cover, danger and loot readable at a glance. Every
// frame is drawn from world state only, so a ?shot= scene is one call away.
import {
  TILE, VIEW_W, VIEW_H, COLS, ROWS, PALETTE, clamp, lerp,
} from './config.js';
import { visionConePolygon } from './vision.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFloor(ctx, t) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const light = (x + y) % 2 === 0;
      ctx.fillStyle = light ? PALETTE.floorLight : PALETTE.floorDark;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }
  // Carpet runner down the middle of each hall.
  ctx.fillStyle = PALETTE.carpet;
  ctx.fillRect(0, 7 * TILE, VIEW_W, TILE);
  ctx.fillStyle = PALETTE.carpetEdge;
  ctx.fillRect(0, 7 * TILE, VIEW_W, 3);
  ctx.fillRect(0, 8 * TILE - 3, VIEW_W, 3);
  // Gold trim along the room edge.
  ctx.strokeStyle = PALETTE.wallGold;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2;
  ctx.strokeRect(TILE - 2, TILE - 2, VIEW_W - 2 * TILE + 4, VIEW_H - 2 * TILE + 4);
  ctx.globalAlpha = 1;
  // Faint dust motes drifting in the dark (deterministic shimmer).
  ctx.fillStyle = 'rgba(232, 182, 76, 0.10)';
  for (let i = 0; i < 40; i++) {
    const mx = ((i * 173 + t * 6) % VIEW_W);
    const my = ((i * 97 + t * 3) % VIEW_H);
    ctx.fillRect(mx, my, 2, 2);
  }
}

function drawExit(ctx, world, t) {
  const e = world.exitRect;
  const open = world.gemTaken;
  const pulse = 0.5 + 0.5 * Math.sin(t * 3);
  ctx.save();
  ctx.fillStyle = open ? `rgba(88, 214, 141, ${0.25 + 0.2 * pulse})` : 'rgba(120, 120, 130, 0.18)';
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.strokeStyle = open ? PALETTE.exit : '#777';
  ctx.lineWidth = 2;
  ctx.strokeRect(e.x + 2, e.y + 2, e.w - 4, e.h - 4);
  ctx.fillStyle = open ? PALETTE.exit : PALETTE.textDim;
  ctx.font = 'bold 11px Georgia, serif';
  ctx.textAlign = 'center';
  // The exit sits against the room's edge: clamp the label on-canvas.
  ctx.fillText(open ? 'EXIT' : 'LOCKED', clamp(e.x + e.w / 2, 34, VIEW_W - 34), e.y + e.h / 2 + 4);
  ctx.restore();
}

function drawLoot(ctx, world, t) {
  for (const l of world.loot) {
    if (l.taken) continue;
    const bob = Math.sin(t * 2.4 + l.x * 0.01) * 3;
    const glow = 0.5 + 0.5 * Math.sin(t * 3 + l.y * 0.02);
    ctx.save();
    ctx.translate(l.x, l.y + bob);
    if (l.kind === 'gem') {
      ctx.shadowColor = PALETTE.lootMain;
      ctx.shadowBlur = 18 + 10 * glow;
      ctx.fillStyle = PALETTE.lootMain;
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.lineTo(10, 0);
      ctx.lineTo(0, 13);
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff8d6';
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 10px Georgia, serif';
      ctx.textAlign = 'center';
      // The gem hangs near the room's edge: clamp its name on-canvas.
      // (Drawn in translated space, so this is the offset from the gem.)
      const labelX = clamp(l.x, 72, VIEW_W - 72) - l.x;
      ctx.fillText(l.name.toUpperCase(), labelX, -20);
    } else {
      ctx.shadowColor = PALETTE.lootSmall;
      ctx.shadowBlur = 8 + 6 * glow;
      ctx.fillStyle = PALETTE.lootSmall;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0c2b22';
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawWallsAndCovers(ctx, world) {
  for (const c of world.covers) {
    ctx.fillStyle = PALETTE.cover;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = PALETTE.coverTop;
    ctx.fillRect(c.x + 2, c.y + 2, c.w - 4, 5);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.strokeRect(c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1);
  }
  for (const w of world.walls) {
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(w.x, w.y, w.w, 4);
    ctx.strokeStyle = PALETTE.wallGold;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    ctx.strokeRect(w.x + 0.5, w.y + 0.5, w.w - 1, w.h - 1);
    ctx.globalAlpha = 1;
  }
  // Room border walls.
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(0, 0, VIEW_W, TILE);
  ctx.fillRect(0, VIEW_H - TILE, VIEW_W, TILE);
  ctx.fillRect(0, 0, TILE, VIEW_H);
  ctx.fillRect(VIEW_W - TILE, 0, TILE, VIEW_H);
  ctx.fillStyle = PALETTE.wallGold;
  ctx.globalAlpha = 0.6;
  ctx.fillRect(0, TILE - 3, VIEW_W, 3);
  ctx.fillRect(0, VIEW_H - TILE, VIEW_W, 3);
  ctx.globalAlpha = 1;
}

function drawCone(ctx, poly, fill) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawWatchers(ctx, world, t) {
  // Camera cones first (under guards), then guard cones.
  for (const cam of world.cameras) {
    const poly = visionConePolygon(cam.x, cam.y, cam.angle, 0.46, 225, world.solids);
    drawCone(ctx, poly, cam.seen ? 'rgba(255, 90, 90, 0.22)' : PALETTE.coneCam);
    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.fillStyle = PALETTE.camera;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = cam.seen ? '#ff5a5a' : '#e8eefc';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  for (const g of world.guards) {
    const hot = g.state === 'chase' || g.suspicion > 0.55;
    const poly = visionConePolygon(g.x, g.y, g.facing, 0.61, 175, world.solids);
    drawCone(ctx, poly, hot ? PALETTE.coneHot : PALETTE.cone);
  }
  for (const g of world.guards) {
    ctx.save();
    ctx.translate(g.x, g.y);
    // Body: red uniform with a pale face, facing tick shows patrol direction.
    ctx.fillStyle = PALETTE.guardUniform;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.guard;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.rotate(g.facing);
    ctx.fillStyle = '#f2d8c8';
    ctx.beginPath();
    ctx.arc(5, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.guard;
    ctx.fillRect(9, -2, 6, 4);
    ctx.restore();
    // Suspicion: "?" while investigating, "!" while the guard is onto you.
    if (g.state === 'investigate') {
      drawMark(ctx, g.x, g.y - 20, '?', '#e8b64c');
    } else if (g.suspicion > 0.25) {
      drawMark(ctx, g.x, g.y - 20, '!', g.suspicion > 0.7 ? '#ff5a5a' : '#e8b64c');
    }
    // Suspicion ring under the guard.
    if (g.suspicion > 0.05) {
      ctx.save();
      ctx.strokeStyle = g.suspicion > 0.7 ? '#ff5a5a' : '#e8b64c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * g.suspicion);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawMark(ctx, x, y, text, color) {
  ctx.save();
  ctx.font = 'bold 16px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.lineWidth = 3;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawPlayer(ctx, world, t) {
  const p = world.player;
  const bob = p.moving ? Math.sin(t * 12) * 1.5 : 0;
  ctx.save();
  ctx.translate(p.x, p.y + bob);
  ctx.shadowColor = 'rgba(232, 182, 76, 0.8)';
  ctx.shadowBlur = 10;
  // Cloak: dark hood with a gold rim, facing tick.
  ctx.fillStyle = PALETTE.playerCloak;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = PALETTE.player;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.rotate(p.face);
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(4, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (p.sneaking) {
    ctx.save();
    ctx.font = 'bold 10px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText('SNEAKING', p.x, p.y - 16);
    ctx.restore();
  }
}

function drawCoins(ctx, world) {
  for (const c of world.coins) {
    ctx.save();
    ctx.strokeStyle = `rgba(232, 182, 76, ${clamp(1 - c.ring / 130, 0, 1)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.ring, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawHud(ctx, world, totalScore) {
  const barW = 230;
  const barX = VIEW_W / 2 - barW / 2;
  const barY = 10;
  ctx.save();
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, 0, 0, VIEW_W, 40, 0);
  ctx.fill();
  // Level name.
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(world.def.name, 12, 25);
  // Objective, right of the level name.
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '12px Georgia, serif';
  ctx.fillText(world.gemTaken ? 'Gem pocketed — reach the green EXIT' : `Steal ${world.def.gemName} — then escape`, 210, 25);
  // Alarm meter, centre.
  const alarm = world.alarm;
  const alarmColor = alarm < 40 ? PALETTE.alarmLow : alarm < 75 ? PALETTE.alarmMid : PALETTE.alarmHigh;
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 12px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', barX - 52, 25);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  roundRect(ctx, barX, barY + 4, barW, 14, 7);
  ctx.fill();
  ctx.fillStyle = alarmColor;
  if (alarm > 0.5) {
    roundRect(ctx, barX, barY + 4, (barW * alarm) / 100, 14, 7);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  roundRect(ctx, barX, barY + 4, barW, 14, 7);
  ctx.stroke();
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 12px Georgia, serif';
  ctx.fillText(`${Math.round(alarm)}%`, barX + barW + 8, 25);
  // Right side: loot score and coins.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.lootMain;
  ctx.font = 'bold 14px Georgia, serif';
  ctx.fillText(`LOOT $${totalScore}`, VIEW_W - 12, 18);
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '12px Georgia, serif';
  ctx.fillText(`coins × ${world.coinsLeft}  (click to toss)`, VIEW_W - 12, 34);
  ctx.restore();
}

function drawAlarmVignette(ctx, world) {
  if (world.alarm < 55) return;
  const a = clamp((world.alarm - 55) / 45, 0, 1) * 0.30;
  const grad = ctx.createRadialGradient(
    VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35,
    VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.75,
  );
  grad.addColorStop(0, 'rgba(220, 40, 40, 0)');
  grad.addColorStop(1, `rgba(220, 40, 40, ${a})`);
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.restore();
}

export function drawWorld(ctx, world, totalScore, t) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawFloor(ctx, t);
  drawLoot(ctx, world, t);
  drawWallsAndCovers(ctx, world);
  drawExit(ctx, world, t); // after the walls: the exit's LOCKED/EXIT label
  // sits against the room's edge and must paint over the border wall.
  drawWatchers(ctx, world, t);
  drawCoins(ctx, world);
  drawPlayer(ctx, world, t);
  drawAlarmVignette(ctx, world);
  drawHud(ctx, world, totalScore);
}

function overlayPanel(ctx, title, lines, accent) {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 8, 18, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const w = 640;
  const h = 300;
  const x = VIEW_W / 2 - w / 2;
  const y = VIEW_H / 2 - h / 2;
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 12);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = 'bold 34px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW_W / 2, y + 58);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '16px Georgia, serif';
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, y + 100 + i * 30));
  ctx.restore();
}

export function drawTitle(ctx, world, t) {
  drawWorld(ctx, world, 0, t);
  overlayPanel(ctx, 'GILDED', [
    'A museum heist in three rooms. Steal the gem, dodge the cones,',
    'toss a coin to lure the guards — and get out before the alarm seals the vault.',
    '',
    'Move: WASD / arrows    Sneak: Shift    Toss coin: click',
    '',
    'Click or press Enter to begin',
  ], PALETTE.lootMain);
}

export function drawCaught(ctx, world, reason, totalScore) {
  drawWorld(ctx, world, totalScore, 0);
  overlayPanel(ctx, 'CAUGHT', [
    reason,
    `Loot kept: $${totalScore}`,
    '',
    'Press R to try the room again',
  ], PALETTE.alarmHigh);
}

export function drawLevelClear(ctx, world, totalScore, bonus) {
  drawWorld(ctx, world, totalScore, 0);
  overlayPanel(ctx, 'CLEAN GETAWAY', [
    `${world.def.gemName} is yours. Time bonus +$${bonus}.`,
    `Loot so far: $${totalScore}`,
    '',
    'Press Enter for the next room',
  ], PALETTE.exit);
}

export function drawWin(ctx, totalScore) {
  ctx.save();
  ctx.fillStyle = '#0b0d1c';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = PALETTE.lootMain;
  ctx.font = 'bold 40px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('THE SUN OF MERIDIAN IS YOURS', VIEW_W / 2, 150);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '18px Georgia, serif';
  ctx.fillText('Three rooms. Three gems. Not a single alarm that mattered.', VIEW_W / 2, 200);
  ctx.fillStyle = PALETTE.lootMain;
  ctx.font = 'bold 26px Georgia, serif';
  ctx.fillText(`Final loot: $${totalScore}`, VIEW_W / 2, 260);
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '15px Georgia, serif';
  ctx.fillText('Press R to run it again — faster, quieter, richer.', VIEW_W / 2, 310);
  ctx.restore();
}

export { lerp };
