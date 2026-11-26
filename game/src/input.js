// input.js — keyboard and mouse controls.
// Arrows / WASD steer, W/S or +/- throttle, C camera, P pause, R retry,
// Enter starts. Mouse: hold and drag to bank and pitch.

export const input = {
  keys: new Set(),
  pressed: new Set(), // keys that went down this frame
  mouseDown: false,
  mouseDX: 0, // -1..1 drag offset from centre, steers the plane
  mouseDY: 0,
};

export function initInput(canvas) {
  addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
    }
    if (!input.keys.has(e.code)) input.pressed.add(e.code);
    input.keys.add(e.code);
  });
  addEventListener("keyup", (e) => input.keys.delete(e.code));
  canvas.addEventListener("pointerdown", (e) => {
    input.mouseDown = true;
    input.mouseDX = (e.clientX / innerWidth) * 2 - 1;
    input.mouseDY = (e.clientY / innerHeight) * 2 - 1;
  });
  addEventListener("pointermove", (e) => {
    if (!input.mouseDown) return;
    input.mouseDX = (e.clientX / innerWidth) * 2 - 1;
    input.mouseDY = (e.clientY / innerHeight) * 2 - 1;
  });
  addEventListener("pointerup", () => {
    input.mouseDown = false;
    input.mouseDX = 0;
    input.mouseDY = 0;
  });
}

export function down(...codes) {
  return codes.some((c) => input.keys.has(c));
}

export function tapped(...codes) {
  return codes.some((c) => input.pressed.has(c));
}

export function endFrame() {
  input.pressed.clear();
}
