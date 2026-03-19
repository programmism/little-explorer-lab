import { Actor } from './Actor.js';

const EMOJIS = ['🦋', '🐝', '🌸', '🐞'];

export class Butterfly extends Actor {
  constructor(x, y) {
    super(x, y);
    this.size = 55;
    this.emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    this.targetX = x;
    this.targetY = y;
    this.wanderTimer = 0;
    this.flapPhase = Math.random() * Math.PI * 2;
    this.scaleX = 1;
    this._w = 800;
    this._h = 600;
  }

  _pickNewTarget() {
    this.targetX = 60 + Math.random() * (this._w - 120);
    this.targetY = 50 + Math.random() * (this._h * 0.55);
    this.wanderTimer = 2.5 + Math.random() * 3.5;
  }

  update(dt, w, h) {
    super.update(dt, w, h);
    this._w = w; this._h = h;

    this.flapPhase += dt * 9;
    this.scaleX = Math.abs(Math.sin(this.flapPhase));

    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) this._pickNewTarget();

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 8) {
      const accel = 90;
      this.vx += (dx / dist) * accel * dt * 3;
      this.vy += (dy / dist) * accel * dt * 3;
    }

    this.vx *= 0.94;
    this.vy *= 0.94;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.x = Math.max(30, Math.min(w - 30, this.x));
    this.y = Math.max(30, Math.min(h * 0.62, this.y));
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(Math.max(0.01, this.scaleX), 1);
    ctx.font = `${this.size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.emoji, 0, 0);
    ctx.restore();
  }

  onTap(x, y, particles, audio) {
    if (this.tapCooldown > 0) return;
    this.tapCooldown = 0.6;

    const dx = this.x - x;
    const dy = this.y - y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    this.vx += (dx / dist) * 340;
    this.vy += (dy / dist) * 340;
    this.wanderTimer = 0; // pick new wander target next frame

    particles.burst(this.x, this.y, 10, {
      colors: ['#FF9FF3', '#FFE66D', '#A8E6CF', '#88D8B0', '#FFC0CB'],
      minSpeed: 40, maxSpeed: 110, gravity: 60,
    });

    audio.pop();
  }
}
