import { MusicManager } from './MusicManager.js';

// Descriptive names for special keys (spoken aloud)
const SPEAK_NAMES = {
  ' ':          'Space',
  'Enter':      'Enter',
  'Backspace':  'Backspace',
  'Escape':     'Escape',
  'ArrowUp':    'Up',
  'ArrowDown':  'Down',
  'ArrowLeft':  'Left',
  'ArrowRight': 'Right',
  'Tab':        'Tab',
  'Delete':     'Delete',
  'Home':       'Home',
  'End':        'End',
  'PageUp':     'Page Up',
  'PageDown':   'Page Down',
};

// Keys that should not be pronounced at all
const SILENT_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock']);

export class AudioManager {
  constructor() {
    this._ctx = null;
    this.music = new MusicManager();
    this._speechVoice = null;
    this._speechReady = false;
    this._initSpeech();
  }

  _initSpeech() {
    if (typeof speechSynthesis === 'undefined') return;
    // Voices may load asynchronously; pick a child-friendly one when available
    const pick = () => {
      const voices = speechSynthesis.getVoices();
      if (!voices.length) return;
      // Prefer English voices; favour ones with "child", "kid", or female names
      const english = voices.filter(v => v.lang.startsWith('en'));
      const friendly = english.find(v => /child|kid/i.test(v.name));
      this._speechVoice = friendly || english[0] || voices[0];
      this._speechReady = true;
    };
    pick();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.addEventListener('voiceschanged', pick);
    }
  }

  speakLetter(key) {
    if (!this._speechReady) return;
    if (SILENT_KEYS.has(key)) return;

    const text = SPEAK_NAMES[key] ?? (key.length === 1 ? key.toUpperCase() : key);

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.85;
    utter.pitch = 1.3;
    utter.volume = 1.0;
    if (this._speechVoice) utter.voice = this._speechVoice;

    // Cancel any previous speech so letters don't queue up
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
  }

  unlock() {
    if (this._ctx) return;
    this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.music.start(this._ctx);
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

  carCrash() {
    // Heavy metallic crash: low boom + mid crunch + high shatter
    this._osc(40, 'sawtooth', 0.6, 0.5, 180);
    this._osc(70, 'square', 0.4, 0.35, 300);
    this._osc(200, 'sawtooth', 0.3, 0.2, 800);
    setTimeout(() => {
      this._osc(50, 'sine', 0.5, 0.3, 150);
      this._osc(120, 'square', 0.25, 0.2, 400);
    }, 100);
    setTimeout(() => {
      this._osc(30, 'sine', 0.4, 0.25);
    }, 250);
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

  fanfare() {
    // Triumphant ascending fanfare for goal completion
    const notes = [
      { freq: 523, delay: 0,   dur: 0.2,  vol: 0.3  },  // C5
      { freq: 659, delay: 150, dur: 0.2,  vol: 0.3  },  // E5
      { freq: 784, delay: 300, dur: 0.2,  vol: 0.3  },  // G5
      { freq: 1047, delay: 500, dur: 0.4, vol: 0.35 },  // C6 (hold)
      { freq: 784, delay: 700, dur: 0.15, vol: 0.2  },  // G5
      { freq: 1047, delay: 850, dur: 0.6, vol: 0.35 },  // C6 (long hold)
    ];
    for (const n of notes) {
      setTimeout(() => this._osc(n.freq, 'sine', n.dur, n.vol), n.delay);
    }
    // Add shimmer layer
    setTimeout(() => {
      this._osc(1319, 'sine', 0.3, 0.12); // E6
      this._osc(1568, 'sine', 0.25, 0.08); // G6
    }, 550);
  }
}
