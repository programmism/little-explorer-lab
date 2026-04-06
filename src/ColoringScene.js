/**
 * ColoringScene — 4th scene where the child colors outlines and they come alive.
 *
 * Outline shapes are drawn with canvas strokes. The child drags a finger
 * to paint rainbow trails inside the outline. When ~60 % of the bounding
 * box grid cells are filled the shape pops, becomes a bouncing actor, and
 * a new blank outline appears.
 */

import { Actor } from './actors/Actor.js';

// ─── Outline definitions ──────────────────────────────────────────────
// Each outline is an object:
//   name   – display label
//   color  – stroke colour for the outline
//   paths  – array of sub-paths; each sub-path is an array of
//            { cmd, ...args } where coords are in a normalised 0-1 space
//            relative to the bounding box.

const OUTLINES = [
  {
    name: 'cat',
    color: '#FF9FF3',
    paths: [
      // Body (ellipse-ish)
      [
        { cmd: 'move', x: 0.25, y: 0.65 },
        { cmd: 'curve', cp1x: 0.10, cp1y: 0.35, cp2x: 0.30, cp2y: 0.15, x: 0.50, y: 0.20 },
        { cmd: 'curve', cp1x: 0.70, cp1y: 0.15, cp2x: 0.90, cp2y: 0.35, x: 0.75, y: 0.65 },
        { cmd: 'curve', cp1x: 0.70, cp1y: 0.85, cp2x: 0.30, cp2y: 0.85, x: 0.25, y: 0.65 },
      ],
      // Left ear
      [
        { cmd: 'move', x: 0.30, y: 0.28 },
        { cmd: 'line', x: 0.22, y: 0.05 },
        { cmd: 'line', x: 0.42, y: 0.22 },
      ],
      // Right ear
      [
        { cmd: 'move', x: 0.70, y: 0.28 },
        { cmd: 'line', x: 0.78, y: 0.05 },
        { cmd: 'line', x: 0.58, y: 0.22 },
      ],
      // Left eye
      [
        { cmd: 'move', x: 0.38, y: 0.38 },
        { cmd: 'arc', cx: 0.38, cy: 0.38, r: 0.04 },
      ],
      // Right eye
      [
        { cmd: 'move', x: 0.62, y: 0.38 },
        { cmd: 'arc', cx: 0.62, cy: 0.38, r: 0.04 },
      ],
      // Nose + mouth
      [
        { cmd: 'move', x: 0.50, y: 0.46 },
        { cmd: 'line', x: 0.47, y: 0.52 },
        { cmd: 'line', x: 0.53, y: 0.52 },
        { cmd: 'line', x: 0.50, y: 0.46 },
      ],
      // Whiskers left
      [
        { cmd: 'move', x: 0.15, y: 0.44 },
        { cmd: 'line', x: 0.40, y: 0.48 },
      ],
      [
        { cmd: 'move', x: 0.15, y: 0.50 },
        { cmd: 'line', x: 0.40, y: 0.50 },
      ],
      // Whiskers right
      [
        { cmd: 'move', x: 0.85, y: 0.44 },
        { cmd: 'line', x: 0.60, y: 0.48 },
      ],
      [
        { cmd: 'move', x: 0.85, y: 0.50 },
        { cmd: 'line', x: 0.60, y: 0.50 },
      ],
      // Tail
      [
        { cmd: 'move', x: 0.75, y: 0.70 },
        { cmd: 'curve', cp1x: 0.92, cp1y: 0.60, cp2x: 0.95, cp2y: 0.40, x: 0.88, y: 0.32 },
      ],
    ],
  },
  {
    name: 'car',
    color: '#54A0FF',
    paths: [
      // Body
      [
        { cmd: 'move', x: 0.08, y: 0.60 },
        { cmd: 'line', x: 0.08, y: 0.45 },
        { cmd: 'line', x: 0.25, y: 0.45 },
        { cmd: 'line', x: 0.32, y: 0.22 },
        { cmd: 'line', x: 0.68, y: 0.22 },
        { cmd: 'line', x: 0.75, y: 0.45 },
        { cmd: 'line', x: 0.92, y: 0.45 },
        { cmd: 'line', x: 0.92, y: 0.60 },
        { cmd: 'line', x: 0.08, y: 0.60 },
      ],
      // Windshield
      [
        { cmd: 'move', x: 0.35, y: 0.25 },
        { cmd: 'line', x: 0.48, y: 0.25 },
        { cmd: 'line', x: 0.48, y: 0.43 },
        { cmd: 'line', x: 0.28, y: 0.43 },
        { cmd: 'line', x: 0.35, y: 0.25 },
      ],
      // Rear window
      [
        { cmd: 'move', x: 0.52, y: 0.25 },
        { cmd: 'line', x: 0.65, y: 0.25 },
        { cmd: 'line', x: 0.72, y: 0.43 },
        { cmd: 'line', x: 0.52, y: 0.43 },
        { cmd: 'line', x: 0.52, y: 0.25 },
      ],
      // Left wheel
      [
        { cmd: 'move', x: 0.26, y: 0.60 },
        { cmd: 'arc', cx: 0.26, cy: 0.64, r: 0.08 },
      ],
      // Right wheel
      [
        { cmd: 'move', x: 0.74, y: 0.60 },
        { cmd: 'arc', cx: 0.74, cy: 0.64, r: 0.08 },
      ],
      // Headlight
      [
        { cmd: 'move', x: 0.88, y: 0.48 },
        { cmd: 'line', x: 0.90, y: 0.48 },
        { cmd: 'line', x: 0.90, y: 0.54 },
        { cmd: 'line', x: 0.88, y: 0.54 },
        { cmd: 'line', x: 0.88, y: 0.48 },
      ],
    ],
  },
  {
    name: 'star',
    color: '#FFD700',
    paths: [
      [
        { cmd: 'move', x: 0.50, y: 0.05 },
        { cmd: 'line', x: 0.61, y: 0.35 },
        { cmd: 'line', x: 0.93, y: 0.38 },
        { cmd: 'line', x: 0.68, y: 0.58 },
        { cmd: 'line', x: 0.76, y: 0.90 },
        { cmd: 'line', x: 0.50, y: 0.72 },
        { cmd: 'line', x: 0.24, y: 0.90 },
        { cmd: 'line', x: 0.32, y: 0.58 },
        { cmd: 'line', x: 0.07, y: 0.38 },
        { cmd: 'line', x: 0.39, y: 0.35 },
        { cmd: 'line', x: 0.50, y: 0.05 },
      ],
    ],
  },
  {
    name: 'fish',
    color: '#4ECDC4',
    paths: [
      // Body
      [
        { cmd: 'move', x: 0.15, y: 0.50 },
        { cmd: 'curve', cp1x: 0.25, cp1y: 0.15, cp2x: 0.55, cp2y: 0.10, x: 0.72, y: 0.35 },
        { cmd: 'line', x: 0.72, y: 0.35 },
        { cmd: 'curve', cp1x: 0.80, cp1y: 0.38, cp2x: 0.80, cp2y: 0.62, x: 0.72, y: 0.65 },
        { cmd: 'curve', cp1x: 0.55, cp1y: 0.90, cp2x: 0.25, cp2y: 0.85, x: 0.15, y: 0.50 },
      ],
      // Tail
      [
        { cmd: 'move', x: 0.72, y: 0.35 },
        { cmd: 'line', x: 0.92, y: 0.18 },
        { cmd: 'line', x: 0.88, y: 0.50 },
        { cmd: 'line', x: 0.92, y: 0.82 },
        { cmd: 'line', x: 0.72, y: 0.65 },
      ],
      // Eye
      [
        { cmd: 'move', x: 0.32, y: 0.44 },
        { cmd: 'arc', cx: 0.32, cy: 0.44, r: 0.04 },
      ],
      // Fin top
      [
        { cmd: 'move', x: 0.40, y: 0.28 },
        { cmd: 'curve', cp1x: 0.45, cp1y: 0.08, cp2x: 0.55, cp2y: 0.08, x: 0.55, y: 0.25 },
      ],
      // Fin bottom
      [
        { cmd: 'move', x: 0.42, y: 0.68 },
        { cmd: 'curve', cp1x: 0.44, cp1y: 0.82, cp2x: 0.50, cp2y: 0.82, x: 0.52, y: 0.70 },
      ],
    ],
  },
  {
    name: 'rocket',
    color: '#FF6B6B',
    paths: [
      // Body
      [
        { cmd: 'move', x: 0.50, y: 0.05 },
        { cmd: 'curve', cp1x: 0.58, cp1y: 0.12, cp2x: 0.62, cp2y: 0.25, x: 0.62, y: 0.55 },
        { cmd: 'line', x: 0.62, y: 0.72 },
        { cmd: 'line', x: 0.38, y: 0.72 },
        { cmd: 'line', x: 0.38, y: 0.55 },
        { cmd: 'curve', cp1x: 0.38, cp1y: 0.25, cp2x: 0.42, cp2y: 0.12, x: 0.50, y: 0.05 },
      ],
      // Window
      [
        { cmd: 'move', x: 0.50, y: 0.30 },
        { cmd: 'arc', cx: 0.50, cy: 0.34, r: 0.06 },
      ],
      // Left fin
      [
        { cmd: 'move', x: 0.38, y: 0.58 },
        { cmd: 'line', x: 0.22, y: 0.78 },
        { cmd: 'line', x: 0.22, y: 0.72 },
        { cmd: 'line', x: 0.38, y: 0.65 },
      ],
      // Right fin
      [
        { cmd: 'move', x: 0.62, y: 0.58 },
        { cmd: 'line', x: 0.78, y: 0.78 },
        { cmd: 'line', x: 0.78, y: 0.72 },
        { cmd: 'line', x: 0.62, y: 0.65 },
      ],
      // Flame
      [
        { cmd: 'move', x: 0.42, y: 0.72 },
        { cmd: 'curve', cp1x: 0.44, cp1y: 0.85, cp2x: 0.48, cp2y: 0.92, x: 0.50, y: 0.95 },
        { cmd: 'curve', cp1x: 0.52, cp1y: 0.92, cp2x: 0.56, cp2y: 0.85, x: 0.58, y: 0.72 },
      ],
    ],
  },
];

// ─── Grid-based fill tracker ──────────────────────────────────────────
const GRID_COLS = 20;
const GRID_ROWS = 20;

// ─── Alive-shape actor (bounces around after being colored) ──────────

export class AliveShape extends Actor {
  constructor(x, y, outlineDef, hueStart) {
    super(x, y);
    this.outline = outlineDef;
    this.hueStart = hueStart;
    this.size = 60;
    this.vx = (Math.random() - 0.5) * 160;
    this.vy = (Math.random() - 0.5) * 160;
    this.rotation = 0;
    this.rotSpeed = (Math.random() - 0.5) * 2;
    // Pop animation
    this.popScale = 0.01;
    this.popPhase = 0; // 0 = growing, 1 = settled
  }

  update(dt, w, h) {
    super.update(dt, w, h);

    // Pop-in animation
    if (this.popPhase < 1) {
      this.popScale += dt * 4;
      if (this.popScale >= 1.2) this.popPhase = 1;
    } else {
      this.popScale += (1 - this.popScale) * dt * 6;
    }

    this.rotation += this.rotSpeed * dt;

    // Bounce off walls
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const r = this.size / 2;
    if (this.x - r < 0) { this.x = r; this.vx = Math.abs(this.vx); }
    if (this.x + r > w) { this.x = w - r; this.vx = -Math.abs(this.vx); }
    if (this.y - r < 0) { this.y = r; this.vy = Math.abs(this.vy); }
    if (this.y + r > h) { this.y = h - r; this.vy = -Math.abs(this.vy); }
  }

  draw(ctx) {
    const s = this.size * this.popScale;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Draw filled outline
    let hue = this.hueStart;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const subpath of this.outline.paths) {
      ctx.beginPath();
      for (const seg of subpath) {
        const sx = (seg.x - 0.5) * s;
        const sy = (seg.y - 0.5) * s;
        if (seg.cmd === 'move') {
          ctx.moveTo(sx, sy);
        } else if (seg.cmd === 'line') {
          ctx.lineTo(sx, sy);
        } else if (seg.cmd === 'curve') {
          ctx.bezierCurveTo(
            (seg.cp1x - 0.5) * s, (seg.cp1y - 0.5) * s,
            (seg.cp2x - 0.5) * s, (seg.cp2y - 0.5) * s,
            sx, sy,
          );
        } else if (seg.cmd === 'arc') {
          ctx.moveTo((seg.cx - 0.5) * s + seg.r * s, (seg.cy - 0.5) * s);
          ctx.arc((seg.cx - 0.5) * s, (seg.cy - 0.5) * s, seg.r * s, 0, Math.PI * 2);
        }
      }
      hue = (hue + 40) % 360;
      ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.6)`;
      ctx.fill();
      ctx.strokeStyle = this.outline.color;
      ctx.stroke();
    }

    ctx.restore();
  }

  onTap(x, y, particles, audio) {
    this.vx = (Math.random() - 0.5) * 240;
    this.vy = (Math.random() - 0.5) * 240;
    this.rotSpeed = (Math.random() - 0.5) * 4;
    particles.burst(this.x, this.y, 10, {
      colors: [this.outline.color, '#FFD700', '#ffffff'],
      minSpeed: 40, maxSpeed: 140, gravity: 120,
    });
    if (audio && audio.sparkle) audio.sparkle();
  }
}

// ─── Main coloring scene controller ──────────────────────────────────

export class ColoringScene {
  constructor() {
    // Current outline
    this._pickNextOutline();

    // Alive shapes bouncing around
    this.aliveShapes = [];

    // Drawing state (rainbow paint)
    this._activeStrokes = new Map(); // pointerId → { hue, lastX, lastY }
    this._paintSegments = [];        // {x1,y1,x2,y2,hue}

    this._celebrationTimer = 0;
  }

  _pickNextOutline() {
    const idx = Math.floor(Math.random() * OUTLINES.length);
    this.currentOutline = OUTLINES[idx];
    this._grid = new Uint8Array(GRID_COLS * GRID_ROWS);
    this._filledCount = 0;
    this._totalCells = GRID_COLS * GRID_ROWS;
    this._paintSegments = [];
    this._triggered = false;
  }

  /** Bounding box of the outline on screen. */
  _bbox(w, h) {
    const size = Math.min(w, h) * 0.55;
    const cx = w / 2;
    const cy = h * 0.42;
    return { x: cx - size / 2, y: cy - size / 2, w: size, h: size };
  }

  get fillPercent() {
    return this._filledCount / this._totalCells;
  }

  // ── Pointer handling (called by World) ──────────────────────────────

  startStroke(id, x, y) {
    this._activeStrokes.set(id, {
      hue: Math.random() * 360,
      lastX: x,
      lastY: y,
    });
    this._markCell(x, y);
  }

  addPoint(id, x, y) {
    const s = this._activeStrokes.get(id);
    if (!s) return;
    if (Math.hypot(x - s.lastX, y - s.lastY) < 3) return;
    s.hue = (s.hue + 5) % 360;
    this._paintSegments.push({ x1: s.lastX, y1: s.lastY, x2: x, y2: y, hue: s.hue });
    s.lastX = x;
    s.lastY = y;
    this._markCell(x, y);
  }

  endStroke(id) {
    this._activeStrokes.delete(id);
  }

  _markCell(px, py) {
    const bb = this._bbox(this._lastW || 800, this._lastH || 600);
    const col = Math.floor(((px - bb.x) / bb.w) * GRID_COLS);
    const row = Math.floor(((py - bb.y) / bb.h) * GRID_ROWS);
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;
    const idx = row * GRID_COLS + col;
    if (!this._grid[idx]) {
      this._grid[idx] = 1;
      this._filledCount++;
    }
  }

  // ── Update ──────────────────────────────────────────────────────────

  update(dt, w, h, particles, audio) {
    this._lastW = w;
    this._lastH = h;

    // Check fill threshold
    if (!this._triggered && this.fillPercent >= 0.60) {
      this._triggered = true;
      this._onFilled(w, h, particles, audio);
    }

    if (this._celebrationTimer > 0) {
      this._celebrationTimer -= dt;
      if (this._celebrationTimer <= 0) {
        this._pickNextOutline();
      }
    }

    // Update alive shapes
    for (const shape of this.aliveShapes) {
      shape.update(dt, w, h, particles);
    }
    this.aliveShapes = this.aliveShapes.filter(s => s.alive);
  }

  _onFilled(w, h, particles, audio) {
    const bb = this._bbox(w, h);
    const cx = bb.x + bb.w / 2;
    const cy = bb.y + bb.h / 2;

    // Spawn alive shape
    const alive = new AliveShape(cx, cy, this.currentOutline, Math.random() * 360);
    this.aliveShapes.push(alive);

    // Celebration particles
    if (particles) {
      particles.burst(cx, cy, 30, {
        colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#FF9FF3', '#A8E6CF', '#54A0FF'],
        minSpeed: 80, maxSpeed: 300, gravity: 100,
        minSize: 5, maxSize: 15,
      });
    }
    if (audio && audio.sparkle) audio.sparkle();

    this._celebrationTimer = 1.2;
  }

  // ── Draw ────────────────────────────────────────────────────────────

  draw(ctx, w, h) {
    const bb = this._bbox(w, h);

    // Draw alive bouncing shapes first (behind outline)
    for (const shape of this.aliveShapes) {
      shape.draw(ctx);
    }

    // Paint strokes (clipped to bounding box area)
    if (this._paintSegments.length > 0) {
      ctx.save();
      ctx.lineWidth = 20;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const seg of this._paintSegments) {
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = `hsl(${seg.hue}, 100%, 55%)`;
        ctx.shadowColor = `hsl(${seg.hue}, 100%, 70%)`;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Draw outline on top of paint
    this._drawOutline(ctx, bb);

    // Fill progress bar
    this._drawProgressBar(ctx, w, h, bb);
  }

  _drawOutline(ctx, bb) {
    ctx.save();
    ctx.strokeStyle = this.currentOutline.color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = this.currentOutline.color;
    ctx.shadowBlur = 6;

    for (const subpath of this.currentOutline.paths) {
      ctx.beginPath();
      for (const seg of subpath) {
        const sx = bb.x + seg.x * bb.w;
        const sy = bb.y + seg.y * bb.h;
        if (seg.cmd === 'move') {
          ctx.moveTo(sx, sy);
        } else if (seg.cmd === 'line') {
          ctx.lineTo(sx, sy);
        } else if (seg.cmd === 'curve') {
          ctx.bezierCurveTo(
            bb.x + seg.cp1x * bb.w, bb.y + seg.cp1y * bb.h,
            bb.x + seg.cp2x * bb.w, bb.y + seg.cp2y * bb.h,
            sx, sy,
          );
        } else if (seg.cmd === 'arc') {
          const acx = bb.x + seg.cx * bb.w;
          const acy = bb.y + seg.cy * bb.h;
          const ar = seg.r * Math.min(bb.w, bb.h);
          ctx.moveTo(acx + ar, acy);
          ctx.arc(acx, acy, ar, 0, Math.PI * 2);
        }
      }
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  _drawProgressBar(ctx, w, h, bb) {
    const barW = bb.w * 0.6;
    const barH = 14;
    const barX = (w - barW) / 2;
    const barY = bb.y + bb.h + 24;
    const pct = Math.min(1, this.fillPercent);

    // Background
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, barH / 2);
    ctx.fill();

    // Fill
    if (pct > 0) {
      const grad = ctx.createLinearGradient(barX, 0, barX + barW * pct, 0);
      grad.addColorStop(0, '#FF6B6B');
      grad.addColorStop(0.5, '#FFD700');
      grad.addColorStop(1, '#4ECDC4');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW * pct, barH, barH / 2);
      ctx.fill();
    }

    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = `bold ${Math.max(12, barH)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${Math.round(pct * 100)}%`, w / 2, barY + barH + 4);

    ctx.restore();
  }
}
