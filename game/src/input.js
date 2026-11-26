// input.js — keyboard state, one-shot presses and canvas clicks.
export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const clicks = [];
  addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(e.code);
    keys.add(e.code);
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    clicks.push({
      x: (e.clientX - r.left) * (1280 / r.width),
      y: (e.clientY - r.top) * (720 / r.height),
    });
  });
  return {
    keys, clicks,
    take(code) { const t = pressed.has(code); pressed.delete(code); return t; },
    takeAny(codes) { for (const c of codes) if (this.take(c)) return c; return null; },
    endFrame() { pressed.clear(); },
  };
}
