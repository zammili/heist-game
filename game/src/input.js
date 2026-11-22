// GILDED — input. One job: turn keyboard and mouse into one small object
// the simulation reads each frame. WASD or arrows to move, Shift to sneak,
// click to toss a coin at that spot, Enter / R / M for menus. Clicks are
// queued and consumed once, so a click never fires twice.
export function createInput(canvas) {
  const keys = new Set();
  const clickQueue = [];
  let mouse = { x: 0, y: 0 };

  function keyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  }
  function keyUp(e) {
    keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  }
  function mouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function mouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    clickQueue.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, button: e.button });
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  canvas.addEventListener('mousemove', mouseMove);
  canvas.addEventListener('mousedown', mouseDown);

  function held(...names) {
    return names.some((n) => keys.has(n));
  }

  return {
    // The per-frame movement vector and sneak flag the simulation consumes.
    readMove() {
      let x = 0;
      let y = 0;
      if (held('a', 'ArrowLeft')) x -= 1;
      if (held('d', 'ArrowRight')) x += 1;
      if (held('w', 'ArrowUp')) y -= 1;
      if (held('s', 'ArrowDown')) y += 1;
      return { moveX: x, moveY: y, sneak: held('Shift') };
    },
    // One queued click, or null. Consumed once.
    takeClick() {
      return clickQueue.shift() ?? null;
    },
    peekClick() {
      return clickQueue[0] ?? null;
    },
    clearClicks() {
      clickQueue.length = 0;
    },
    pressed(key) {
      return keys.has(key);
    },
    consume(key) {
      keys.delete(key);
    },
    mouse() {
      return mouse;
    },
    // Test / shot helpers: inject keys without a real keyboard.
    injectKey(key) {
      keys.add(key);
    },
    releaseKey(key) {
      keys.delete(key);
    },
    injectClick(x, y) {
      clickQueue.push({ x, y, button: 0 });
    },
  };
}
