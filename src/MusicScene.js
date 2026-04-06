/**
 * MusicScene — a xylophone-style musical instrument scene.
 *
 * Seven colorful bars at the bottom of the screen play notes in a
 * C-based pentatonic-ish scale (C D E G A highC highD) when tapped.
 * Visual feedback includes bar glow, upward particle bursts, and
 * floating note emojis that drift upward.
 */

// Frequencies for C4 pentatonic + high C5, D5
const NOTES = [
  { freq: 261.63, color: '#FF0000', label: 'C'  },  // red
  { freq: 293.66, color: '#FF7F00', label: 'D'  },  // orange
  { freq: 329.63, color: '#FFD700', label: 'E'  },  // yellow
  { freq: 392.00, color: '#00CC44', label: 'G'  },  // green
  { freq: 440.00, color: '#0077FF', label: 'A'  },  // blue
  { freq: 523.25, color: '#4B0082', label: 'C\'' }, // indigo
  { freq: 587.33, color: '#8B00FF', label: 'D\'' }, // violet
];

export class MusicScene {
  constructor() {
    this.bars = NOTES.map((n, i) => ({
      ...n,
      index: i,
      glow: 0,       // 0-1, quick decay visual feedback
    }));

    // Floating note emojis
    this.floatingNotes = []; // { x, y, vy, alpha, emoji }
  }

  /** Return the bounding rect of bar `i` given canvas size. */
  _barRect(i, w, h) {
    const count = this.bars.length;
    const totalW = w * 0.88;
    const gap = totalW * 0.02;
    const barW = (totalW - gap * (count - 1)) / count;
    const startX = (w - totalW) / 2;
    const barH = h * 0.38;
    const barY = h - barH - h * 0.06; // leave room for dot indicators

    return {
      x: startX + i * (barW + gap),
      y: barY,
      w: barW,
      h: barH,
    };
  }

  /**
   * Test if (tx,ty) hits a bar. Returns the bar index or -1.
   */
  hitTest(tx, ty, w, h) {
    for (let i = 0; i < this.bars.length; i++) {
      const r = this._barRect(i, w, h);
      if (tx >= r.x && tx <= r.x + r.w && ty >= r.y && ty <= r.y + r.h) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Called from World when a tap lands in the music scene.
   * Plays the note and triggers visual feedback.
   */
  play(index, audio, particles) {
    const bar = this.bars[index];
    if (!bar) return;

    // Sound
    audio.playNote(bar.freq);

    // Visual: glow
    bar.glow = 1;

    // Visual: particle burst upward from bar centre
    // (we need canvas dimensions — stored on last draw)
    if (this._lastW) {
      const r = this._barRect(index, this._lastW, this._lastH);
      const cx = r.x + r.w / 2;
      const cy = r.y;
      particles.burst(cx, cy, 10, {
        colors: [bar.color, '#FFFFFF', lighten(bar.color)],
        minSpeed: 60,
        maxSpeed: 200,
        gravity: 100,
      });

      // Floating note emoji
      const emojis = ['🎵', '🎶'];
      this.floatingNotes.push({
        x: cx + (Math.random() - 0.5) * r.w * 0.4,
        y: cy,
        vy: -60 - Math.random() * 40,
        alpha: 1,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        size: 24 + Math.random() * 16,
      });
    }
  }

  update(dt) {
    // Decay bar glow
    for (const bar of this.bars) {
      if (bar.glow > 0) {
        bar.glow = Math.max(0, bar.glow - dt * 4);
      }
    }

    // Update floating notes
    for (const note of this.floatingNotes) {
      note.y += note.vy * dt;
      note.alpha -= dt * 0.6;
    }
    this.floatingNotes = this.floatingNotes.filter(n => n.alpha > 0);
  }

  draw(ctx, w, h) {
    this._lastW = w;
    this._lastH = h;

    // ── Floating note emojis (behind bars so they appear to rise) ──
    ctx.save();
    for (const note of this.floatingNotes) {
      ctx.globalAlpha = Math.max(0, note.alpha);
      ctx.font = `${note.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(note.emoji, note.x, note.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // ── Draw bars ──────────────────────────────────────────────
    for (let i = 0; i < this.bars.length; i++) {
      const bar = this.bars[i];
      const r = this._barRect(i, w, h);

      ctx.save();

      // Glow aura when active
      if (bar.glow > 0.01) {
        ctx.shadowColor = bar.color;
        ctx.shadowBlur = 30 * bar.glow;
      }

      // Bar fill — gradient top to bottom
      const grad = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
      const bright = bar.glow > 0.01 ? lighten(bar.color) : bar.color;
      grad.addColorStop(0, bright);
      grad.addColorStop(1, darken(bar.color));
      ctx.fillStyle = grad;

      // Rounded rect
      roundRect(ctx, r.x, r.y, r.w, r.h, 10);
      ctx.fill();

      // Subtle border
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 2;
      roundRect(ctx, r.x, r.y, r.w, r.h, 10);
      ctx.stroke();

      ctx.shadowBlur = 0;

      // Ripple ring when freshly tapped
      if (bar.glow > 0.3) {
        const rippleR = r.w * 0.6 * (1 - bar.glow) + r.w * 0.3;
        ctx.globalAlpha = bar.glow * 0.5;
        ctx.strokeStyle = bar.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(r.x + r.w / 2, r.y + r.h * 0.3, rippleR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Note label at bottom of bar
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `bold ${Math.max(14, r.w * 0.32)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(bar.label, r.x + r.w / 2, r.y + r.h - 8);

      ctx.restore();
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────

function roundRect(ctx, x, y, w, h, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

/** Lighten a hex colour for glow effects. */
function lighten(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c) => Math.min(255, c + 80);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

/** Darken a hex colour for bar gradient bottom. */
function darken(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c) => Math.max(0, c - 50);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}
