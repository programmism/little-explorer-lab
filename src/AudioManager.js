export class AudioManager {
  constructor() {
    this._ctx = null;
  }

  unlock() {
    if (this._ctx) return;
    this._ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  _osc(freq, type, duration, volume = 0.3, startFreq = null) {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq ?? freq, ctx.currentTime);
    if (startFreq !== null) {
      osc.frequency.exponentialRampToValueAtTime(freq, ctx.currentTime + duration);
    }
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  honk() {
    this._osc(300, 'square', 0.15, 0.35);
    setTimeout(() => this._osc(400, 'square', 0.15, 0.3), 120);
  }

  bounce() {
    this._osc(80, 'sine', 0.3, 0.4, 220);
  }

  launch() {
    this._osc(600, 'sawtooth', 0.5, 0.25, 100);
  }

  sparkle() {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((f, i) => setTimeout(() => this._osc(f, 'sine', 0.18, 0.18), i * 55));
  }

  pop() {
    this._osc(50, 'sine', 0.15, 0.45, 350);
  }

  explosion() {
    // Satisfying hit sound: low boom + high sparkle
    this._osc(60, 'sine', 0.4, 0.45, 250);
    this._osc(800, 'sine', 0.2, 0.15, 1200);
    setTimeout(() => {
      this._osc(523, 'sine', 0.15, 0.2);
      this._osc(659, 'sine', 0.15, 0.18);
    }, 80);
    setTimeout(() => {
      this._osc(784, 'sine', 0.15, 0.15);
      this._osc(1047, 'sine', 0.12, 0.12);
    }, 160);
  }
}
