import { Actor } from './Actor.js';

const EMOJIS = ['🧑‍🚀', '🛸', '👽', '🪐', '🌙'];

export class Astronaut extends Actor {
  constructor(x, y) {
    super(x, y);
    this.size = 60;
    this.emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    this.targetX = x;
    this.targetY = y;
    this.wanderTimer = 0;
    this.floatPhase = Math.random() * Math.PI * 2;
    this.rotAngle = 0;
    this.rotSpeed = (Math.random() - 0.5) * 0.4;
    this._w = 800;
    this._h = 600;
  }

  _pickNewTarget() {
    this.targetX = 60 + Math.random() * (this._w - 120);
    this.targetY = 50 + Math.random() * (this._h * 0.7);
    this.wanderTimer = 3.0 + Math.random() * 4.0;
  }

  update(dt, w, h) {
    super.update(dt, w, h);
    this._w = w; this._h = h;

    this.floatPhase += dt * 1.5;
    this.rotAngle += this.rotSpeed * dt;

    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) this._pickNewTarget();

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 8) {
      const accel = 40; // slow, floaty movement
      this.vx += (dx / dist) * accel * dt * 2;
      this.vy += (dy / dist) * accel * dt * 2;
    }

    this.vx *= 0.97;
    this.vy *= 0.97;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Gentle float
    this.y += Math.sin(this.floatPhase) * 0.4;

    this.x = Math.max(30, Math.min(w - 30, this.x));
    this.y = Math.max(30, Math.min(h - 30, this.y));
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotAngle);
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
    this.vx += (dx / dist) * 250;
    this.vy += (dy / dist) * 250;
    this.rotSpeed = (Math.random() - 0.5) * 3;
    this.wanderTimer = 0;

    particles.burst(this.x, this.y, 12, {
      colors: ['#FFD700', '#E8EAF6', '#B388FF', '#82B1FF', '#FFFFFF'],
      minSpeed: 40, maxSpeed: 130, gravity: 15,
    });

    audio.sparkle();
  }
}
