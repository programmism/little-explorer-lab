const STORAGE_KEY = 'little-explorer-collection';

export class CollectionManager {
  constructor() {
    /** @type {Map<string, number>} emoji -> count */
    this.collection = new Map();
    this._load();

    this.open = false;

    // Icon layout
    this.iconX = 36;
    this.iconY = 36;
    this.iconSize = 32;

    // Animation
    this.panelAlpha = 0;       // 0 = closed, 1 = fully open
    this.newlyAdded = [];      // {emoji, timer} for pop-in animation
    this.iconBounce = 0;       // quick bounce when item collected
  }

  // ── Persistence ──────────────────────────────────────

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const obj = JSON.parse(raw);
        for (const [k, v] of Object.entries(obj)) {
          this.collection.set(k, v);
        }
      }
    } catch { /* ignore */ }
  }

  _save() {
    try {
      const obj = Object.fromEntries(this.collection);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch { /* ignore */ }
  }

  // ── Public API ───────────────────────────────────────

  collect(emoji) {
    const prev = this.collection.get(emoji) || 0;
    this.collection.set(emoji, prev + 1);
    this._save();

    // Track for pop-in animation
    this.newlyAdded.push({ emoji, timer: 0 });
    this.iconBounce = 1;
  }

  getCollection() {
    return this.collection;
  }

  toggle() {
    this.open = !this.open;
  }

  hitTestIcon(x, y) {
    const dx = x - this.iconX;
    const dy = y - this.iconY;
    return (dx * dx + dy * dy) < (this.iconSize * this.iconSize);
  }

  // ── Update ───────────────────────────────────────────

  update(dt) {
    // Panel open/close interpolation
    const target = this.open ? 1 : 0;
    this.panelAlpha += (target - this.panelAlpha) * dt * 8;
    if (this.panelAlpha < 0.005) this.panelAlpha = 0;
    if (this.panelAlpha > 0.995) this.panelAlpha = 1;

    // Icon bounce decay
    this.iconBounce = Math.max(0, this.iconBounce - dt * 4);

    // Newly-added animation timers
    for (const item of this.newlyAdded) {
      item.timer += dt;
    }
    this.newlyAdded = this.newlyAdded.filter(n => n.timer < 1.0);
  }

  // ── Draw ─────────────────────────────────────────────

  draw(ctx, w, h) {
    this._drawIcon(ctx);
    if (this.panelAlpha > 0.01) {
      this._drawPanel(ctx, w, h);
    }
  }

  _drawIcon(ctx) {
    ctx.save();
    const scale = 1 + this.iconBounce * 0.35;
    ctx.translate(this.iconX, this.iconY);
    ctx.scale(scale, scale);
    ctx.font = `${this.iconSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\uD83D\uDCD6', 0, 0); // 📖

    // Badge with total count
    const total = [...this.collection.values()].reduce((s, v) => s + v, 0);
    if (total > 0) {
      const badgeX = 14;
      const badgeY = -14;
      const badgeR = 10;
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
      ctx.fillStyle = '#FF4444';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText(total > 99 ? '99+' : String(total), badgeX, badgeY + 1);
    }

    ctx.restore();
  }

  _drawPanel(ctx, w, h) {
    ctx.save();
    ctx.globalAlpha = this.panelAlpha;

    // Semi-transparent backdrop
    const pw = Math.min(360, w * 0.85);
    const ph = Math.min(420, h * 0.7);
    const px = (w - pw) / 2;
    const py = (h - ph) / 2;

    // Slide + fade in
    const offsetY = (1 - this.panelAlpha) * 30;

    ctx.save();
    ctx.translate(0, offsetY);

    // Panel background
    ctx.fillStyle = 'rgba(20, 20, 40, 0.88)';
    this._roundRect(ctx, px, py, pw, ph, 18);
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    this._roundRect(ctx, px, py, pw, ph, 18);
    ctx.stroke();

    // Title
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('Collection', w / 2, py + 32);

    // Grid of collected emojis
    const entries = [...this.collection.entries()];
    if (entries.length === 0) {
      ctx.font = '16px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText('Hit targets to collect!', w / 2, h / 2);
    } else {
      const cols = Math.min(5, Math.max(3, Math.floor((pw - 30) / 70)));
      const cellSize = 64;
      const gridW = cols * cellSize;
      const startX = (w - gridW) / 2 + cellSize / 2;
      const startY = py + 70;

      for (let i = 0; i < entries.length; i++) {
        const [emoji, count] = entries[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = startX + col * cellSize;
        const cy = startY + row * cellSize;

        // Check if newly added for pop animation
        const newEntry = this.newlyAdded.find(n => n.emoji === emoji);
        let popScale = 1;
        if (newEntry) {
          const t = newEntry.timer;
          if (t < 0.15) popScale = 1 + 0.6 * (t / 0.15);
          else if (t < 0.35) popScale = 1.6 - 0.6 * ((t - 0.15) / 0.2);
          else popScale = 1;
        }

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(popScale, popScale);

        // Emoji
        ctx.font = '36px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 0, 0);

        // Count badge
        if (count > 1) {
          const bx = 18;
          const by = -18;
          ctx.beginPath();
          ctx.arc(bx, by, 11, 0, Math.PI * 2);
          ctx.fillStyle = '#FF6B6B';
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = '#fff';
          ctx.fillText(String(count), bx, by + 1);
        }

        ctx.restore();
      }
    }

    ctx.restore(); // offsetY translate
    ctx.restore(); // globalAlpha
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  /** Check if (x,y) is outside the panel (for tap-to-close). */
  hitTestOutsidePanel(x, y, w, h) {
    if (!this.open) return false;
    const pw = Math.min(360, w * 0.85);
    const ph = Math.min(420, h * 0.7);
    const px = (w - pw) / 2;
    const py = (h - ph) / 2;
    return (x < px || x > px + pw || y < py || y > py + ph);
  }
}
