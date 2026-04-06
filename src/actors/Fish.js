import { Actor } from './Actor.js';

const EMOJIS = ['🐠', '🐡', '🐟', '🐙', '🦑'];

export class Fish extends Actor {
  constructor(x, y) {
    super(x, y);
    this.size = 55;
    this.emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    this.targetX = x;
    this.targetY = y;
    this.wanderTimer = 0;
    this.swimPhase = Math.random() * Math.PI * 2;
    this.scaleX = 1;
    this._w = 800;
    this._h = 600;
  }

  _pickNewTarget() {
    this.targetX = 60 + Math.random() * (this._w - 120);
    this.targetY = 50 + Math.random() * (this._h * 0.75);
    this.wanderTimer = 2.0 + Math.random() * 3.0;
  }

  update(dt, w, h) {
    super.update(dt, w, h);
    this._w = w; this._h = h;

    this.swimPhase += dt * 5;

    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) this._pickNewTarget();

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 8) {
      const accel = 70;
      this.vx += (dx / dist) * accel * dt * 3;
      this.vy += (dy / dist) * accel * dt * 3;
    }

    this.vx *= 0.95;
    this.vy *= 0.95;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Face direction of movement
    if (Math.abs(this.vx) > 5) {
      this.scaleX = this.vx > 0 ? 1 : -1;
    }

    // Gentle vertical wobble
    this.y += Math.sin(this.swimPhase) * 0.3;

    this.x = Math.max(30, Math.min(w - 30, this.x));
    this.y = Math.max(30, Math.min(h - 30, this.y));
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.scaleX, 1);
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
    this.vx += (dx / dist) * 300;
    this.vy += (dy / dist) * 300;
    this.wanderTimer = 0;

    particles.burst(this.x, this.y, 10, {
      colors: ['#4FC3F7', '#81D4FA', '#B3E5FC', '#00BCD4', '#80DEEA'],
      minSpeed: 40, maxSpeed: 110, gravity: 30,
    });

    audio.pop();
  }
}
