// Ambient background music using Web Audio API synthesis.
// Day: cheerful pentatonic melody.  Night: soft music-box lullaby.
// Crossfades smoothly based on timeOfDay (0-1 cycle from Background.js).

// Pentatonic scale frequencies (C major pentatonic across two octaves)
const DAY_NOTES = [
  523.25, 587.33, 659.25, 783.99, 880.00,  // C5 D5 E5 G5 A5
  1046.50, 1174.66, 1318.51,                // C6 D6 E6
];

// Lower, softer notes for night (C minor pentatonic, lower octave)
const NIGHT_NOTES = [
  261.63, 311.13, 349.23, 392.00, 466.16,  // C4 Eb4 F4 G4 Bb4
  523.25, 622.25, 698.46,                   // C5 Eb5 F5
];

// Simple repeating note patterns (indices into the note arrays)
const DAY_PATTERN   = [0, 2, 4, 3, 1, 3, 2, 4, 5, 4, 3, 1];
const NIGHT_PATTERN = [0, 4, 3, 2, 0, 3, 5, 4, 2, 3, 1, 0];

const DAY_BPM   = 100;  // beats per minute
const NIGHT_BPM = 60;

const MASTER_VOLUME = 0.08; // keep well below interaction sounds

export class MusicManager {
  constructor() {
    this._ctx = null;
    this._started = false;

    // Day sequencer state
    this._dayIndex = 0;
    this._dayTimer = 0;

    // Night sequencer state
    this._nightIndex = 0;
    this._nightTimer = 0;

    // Gain nodes for crossfade
    this._dayGain = null;
    this._nightGain = null;
    this._masterGain = null;
  }

  /** Call once after first user interaction to create AudioContext. */
  start(audioContext) {
    if (this._started) return;
    this._ctx = audioContext;
    if (!this._ctx) return;
    this._started = true;

    this._masterGain = this._ctx.createGain();
    this._masterGain.gain.setValueAtTime(MASTER_VOLUME, this._ctx.currentTime);
    this._masterGain.connect(this._ctx.destination);

    this._dayGain = this._ctx.createGain();
    this._dayGain.gain.setValueAtTime(1, this._ctx.currentTime);
    this._dayGain.connect(this._masterGain);

    this._nightGain = this._ctx.createGain();
    this._nightGain.gain.setValueAtTime(0, this._ctx.currentTime);
    this._nightGain.connect(this._masterGain);
  }

  /**
   * Called every frame.
   * @param {number} dt  – delta time in seconds
   * @param {number} timeOfDay – 0-1 cycle (0=dawn, 0.25=noon, 0.5=dusk, 0.75=midnight)
   */
  update(dt, timeOfDay) {
    if (!this._started) return;

    // ── Crossfade based on time of day ──────────────────
    // Day dominance: peaks at 0.25 (noon), fades towards night
    // Night dominance: peaks at 0.75 (midnight)
    const dayAmount = this._dayAmount(timeOfDay);
    const nightAmount = 1 - dayAmount;

    const now = this._ctx.currentTime;
    this._dayGain.gain.setTargetAtTime(dayAmount, now, 0.3);
    this._nightGain.gain.setTargetAtTime(nightAmount, now, 0.3);

    // ── Day sequencer ───────────────────────────────────
    const dayInterval = 60 / DAY_BPM;
    this._dayTimer -= dt;
    if (this._dayTimer <= 0) {
      this._playNote(
        DAY_NOTES[DAY_PATTERN[this._dayIndex % DAY_PATTERN.length]],
        'triangle',
        dayInterval * 0.7,
        this._dayGain,
      );
      this._dayIndex++;
      this._dayTimer = dayInterval;
    }

    // ── Night sequencer ─────────────────────────────────
    const nightInterval = 60 / NIGHT_BPM;
    this._nightTimer -= dt;
    if (this._nightTimer <= 0) {
      this._playNote(
        NIGHT_NOTES[NIGHT_PATTERN[this._nightIndex % NIGHT_PATTERN.length]],
        'sine',
        nightInterval * 0.8,
        this._nightGain,
      );
      this._nightIndex++;
      this._nightTimer = nightInterval;
    }
  }

  /** Returns 0-1 indicating how much "day" music should play. */
  _dayAmount(t) {
    // t=0 dawn, 0.25 noon, 0.5 dusk, 0.75 midnight
    // Use a cosine curve: peak day at 0.25, peak night at 0.75
    // cos(2pi*(t - 0.25)) maps 0.25 -> 1, 0.75 -> -1
    const raw = Math.cos(2 * Math.PI * (t - 0.25));
    // Map from [-1, 1] to [0, 1]
    return raw * 0.5 + 0.5;
  }

  _playNote(freq, waveType, duration, gainNode) {
    if (!this._ctx || this._ctx.state !== 'running') return;

    const ctx = this._ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    osc.type = waveType;
    osc.frequency.setValueAtTime(freq, now);

    // Gentle attack-decay-release envelope
    const attack = 0.05;
    const release = duration * 0.35;
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(1, now + attack);
    env.gain.setValueAtTime(1, now + duration - release);
    env.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(env);
    env.connect(gainNode);

    osc.start(now);
    osc.stop(now + duration);
  }
}
