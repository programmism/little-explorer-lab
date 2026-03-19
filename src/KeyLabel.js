const KEY_DISPLAY = {
  ' ':          '·',
  'Enter':      '↵',
  'Backspace':  '⌫',
  'Escape':     '✕',
  'ArrowUp':    '↑',
  'ArrowDown':  '↓',
  'ArrowLeft':  '←',
  'ArrowRight': '→',
  'Tab':        '⇥',
  'Shift':      '⇧',
  'Control':    'Ctrl',
  'Alt':        'Alt',
  'Meta':       '⌘',
  'CapsLock':   '⇪',
  'Delete':     'Del',
  'Home':       '⤒',
  'End':        '⤓',
  'PageUp':     '⇞',
  'PageDown':   '⇟',
};

// Ignore pure modifier presses so they don't spam labels
const IGNORE = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock']);

export class KeyLabel {
  constructor(key, cx, cy) {
    if (IGNORE.has(key)) { this.alive = false; return; }

    const raw = KEY_DISPLAY[key] ?? (key.length === 1 ? key.toUpperCase() : key.slice(0, 4));
    this.display = raw;
    this.x = cx + (Math.random() - 0.5) * cx * 0.6;
    this.y = cy * 0.55 + (Math.random() - 0.5) * cy * 0.25;
    this.vy = -100 - Math.random() * 60;
    this.life = 2.0;
    this.maxLife = 2.0;
    this.hue = Math.random() * 360;
    this.fontSize = raw.length === 1 ? 170 : 80;
    this.scale = 0;
    this.alive = true;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) { this.alive = false; return; }
    this.y += this.vy * dt;
    this.vy += 60 * dt; // gentle gravity slow-down
    this.scale = Math.min(1, this.scale + dt * 9);
  }

  draw(ctx) {
    const alpha = Math.min(1, this.life / (this.maxLife * 0.35));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);
    ctx.font = `bold ${this.fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Outline for readability
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = this.fontSize * 0.06;
    ctx.strokeText(this.display, 0, 0);

    // Fill with bright colour
    ctx.fillStyle = `hsl(${this.hue}, 100%, 58%)`;
    ctx.shadowColor = `hsl(${this.hue}, 100%, 72%)`;
    ctx.shadowBlur = 28;
    ctx.fillText(this.display, 0, 0);

    ctx.restore();
  }
}
