// Keyboard and mouse input for Sizzle Line. The chef moves with WASD or the
// arrow keys; E or Space interacts. A mouse click sets a walk target, and when
// the chef arrives at a station the click also interacts once.
export class Input {
  constructor(canvas, onStart) {
    this.keys = new Set();
    this.target = null;
    this.interactQueued = false;
    this.startQueued = false;
    this.onStart = onStart;

    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
      }
      if (event.repeat) return;
      this.keys.add(event.key.toLowerCase());
      if (event.key === 'Enter') this.startQueued = true;
      if (event.key.toLowerCase() === 'e' || event.key === ' ') this.interactQueued = true;
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.toLowerCase());
    });
    canvas.addEventListener('pointerdown', (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 1280;
      const y = ((event.clientY - rect.top) / rect.height) * 800;
      this.target = { x, y };
      this.interactQueued = true;
      this.startQueued = true;
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.target = null;
    });
  }

  /** The movement vector for this frame, from keys or from a click target. */
  moveVector() {
    let dx = 0;
    let dy = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1;
    if (dx !== 0 || dy !== 0) this.target = null;
    return { dx, dy };
  }

  /** Take the pending interact press, if any. */
  takeInteract() {
    const value = this.interactQueued;
    this.interactQueued = false;
    return value;
  }

  /** Take the pending start press, if any. */
  takeStart() {
    const value = this.startQueued;
    this.startQueued = false;
    return value;
  }

  /** Clear a click target once the chef has arrived at it. */
  clearTarget() {
    this.target = null;
  }
}
