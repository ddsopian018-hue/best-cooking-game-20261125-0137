// Tiny synthesised sound effects (WebAudio, no audio files): a blip for a
// pickup, a chop, a sizzle, a ding for a serve and a low buzz for a mistake.
export class Sound {
  constructor() {
    this.context = null;
    this.enabled = true;
  }

  ensure() {
    if (!this.context) {
      try {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        this.context = null;
      }
    }
    if (this.context && this.context.state === 'suspended') this.context.resume();
    return this.context;
  }

  tone(frequency, duration, type = 'sine', volume = 0.12, when = 0) {
    const context = this.ensure();
    if (!context || !this.enabled) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    const start = context.currentTime + when;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  pickup() {
    this.tone(520, 0.08, 'triangle', 0.1);
  }

  place() {
    this.tone(340, 0.07, 'triangle', 0.09);
  }

  chop() {
    this.tone(180, 0.05, 'square', 0.07);
    this.tone(140, 0.05, 'square', 0.06, 0.06);
  }

  grillReady() {
    this.tone(880, 0.12, 'sine', 0.09);
    this.tone(1174, 0.16, 'sine', 0.08, 0.1);
  }

  serve() {
    this.tone(660, 0.1, 'sine', 0.12);
    this.tone(880, 0.12, 'sine', 0.12, 0.09);
    this.tone(1320, 0.2, 'sine', 0.1, 0.18);
  }

  wrong() {
    this.tone(160, 0.18, 'sawtooth', 0.07);
  }

  rush() {
    this.tone(440, 0.09, 'square', 0.08);
    this.tone(587, 0.09, 'square', 0.08, 0.1);
    this.tone(880, 0.14, 'square', 0.08, 0.2);
  }

  /** Silence every sound until the player starts a shift (browsers block audio before a gesture). */
  mute() {
    this.enabled = false;
  }

  unmute() {
    this.enabled = true;
  }
}
