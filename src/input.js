// Keyboard + swipe (on the canvas). No on-screen buttons: the game is played with keys or touch.
export function bindInput(canvas, a) {
  const keys = {
    ArrowLeft: a.left, KeyA: a.left,
    ArrowRight: a.right, KeyD: a.right,
    ArrowUp: a.jump, KeyW: a.jump, Space: a.jump,
    ArrowDown: a.slide, KeyS: a.slide,
    KeyP: a.pause, Escape: a.pause,
  };
  addEventListener('keydown', (e) => {
    const fn = keys[e.code];
    if (!fn) return;
    e.preventDefault();
    if (!e.repeat) fn();
  });

  // swipe: fires as soon as the finger moves far enough (feels instant)
  let sx = 0, sy = 0, down = false, fired = false;
  const T = 26;
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', (e) => { down = true; fired = false; sx = e.clientX; sy = e.clientY; });
  canvas.addEventListener('pointermove', (e) => {
    if (!down || fired) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < T) return;
    fired = true;
    if (Math.abs(dx) > Math.abs(dy)) (dx > 0 ? a.right : a.left)();
    else (dy < 0 ? a.jump : a.slide)();
  });
  const up = () => { down = false; };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  document.getElementById('btn-pause').addEventListener('click', a.pause);
}
