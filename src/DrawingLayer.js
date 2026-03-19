export class DrawingLayer {
  constructor() {
    this.strokes = [];          // finished strokes that fade out
    this._active = new Map();   // id → { segments, hue, lastX, lastY }
    this.fadeDuration = 5.0;
  }

  startStroke(id, x, y) {
    this._active.set(id, {
      segments: [],
      hue: Math.random() * 360,
      lastX: x,
      lastY: y,
    });
  }

  addPoint(id, x, y) {
    const s = this._active.get(id);
    if (!s) return;
    if (Math.hypot(x - s.lastX, y - s.lastY) < 4) return;
    s.hue = (s.hue + 4) % 360;
    s.segments.push({ x1: s.lastX, y1: s.lastY, x2: x, y2: y, hue: s.hue });
    s.lastX = x;
    s.lastY = y;
  }

  endStroke(id) {
    const s = this._active.get(id);
    if (!s) return;
    this._active.delete(id);
    if (s.segments.length > 0) {
      this.strokes.push({ segments: s.segments, life: this.fadeDuration, maxLife: this.fadeDuration });
    }
  }

  update(dt) {
    for (let i = this.strokes.length - 1; i >= 0; i--) {
      this.strokes[i].life -= dt;
      if (this.strokes[i].life <= 0) this.strokes.splice(i, 1);
    }
  }

  _drawSegments(ctx, segments, alpha) {
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const seg of segments) {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = `hsl(${seg.hue}, 100%, 55%)`;
      ctx.shadowColor  = `hsl(${seg.hue}, 100%, 70%)`;
      ctx.shadowBlur   = 12;
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
    }
  }

  draw(ctx) {
    ctx.save();

    // Finished strokes — fade out in last 30% of life
    for (const stroke of this.strokes) {
      const alpha = Math.min(1, stroke.life / (stroke.maxLife * 0.3)) * 0.88;
      this._drawSegments(ctx, stroke.segments, alpha);
    }

    // Active strokes — fully visible
    for (const [, s] of this._active) {
      this._drawSegments(ctx, s.segments, 0.92);
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
