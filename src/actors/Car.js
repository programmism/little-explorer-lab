import { Actor } from './Actor.js';

const EMOJIS = ['🚗', '🚕', '🚙', '🏎️', '🚌'];

export class Car extends Actor {
  constructor(x, y) {
    super(x, y);
    this.size = 70;
    this.emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    this.baseSpeed = 80 + Math.random() * 70;
    this.vx = this.baseSpeed;

    this.scale = 1;
    this.colorFlash = 0;
    this.boostTimer = 0;
    this.bounceY = 0;
    this.bounceVY = 0;
  }

  update(dt, w, h) {
    super.update(dt, w, h);

    // Boost decay
    this.boostTimer = Math.max(0, this.boostTimer - dt);
    if (this.boostTimer <= 0 && Math.abs(this.vx) > this.baseSpeed + 1) {
      this.vx = Math.sign(this.vx) * this.baseSpeed;
    }

    this.colorFlash = Math.max(0, this.colorFlash - dt * 2);

    // Spring scale back to 1
    this.scale += (1 - this.scale) * Math.min(1, dt * 10);

    // Bounce spring
    this.bounceVY += 800 * dt;
    this.bounceY += this.bounceVY * dt;
    if (this.bounceY >= 0) { this.bounceY = 0; this.bounceVY = 0; }

    this.x += this.vx * dt;

    // Wrap horizontally
    if (this.vx > 0 && this.x > w + 120) this.x = -120;
    if (this.vx < 0 && this.x < -120) this.x = w + 120;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y + this.bounceY);
    if (this.vx < 0) ctx.scale(-1, 1);
    ctx.scale(this.scale, this.scale);
    if (this.colorFlash > 0) {
      ctx.filter = `hue-rotate(${this.colorFlash * 360}deg) brightness(1.4)`;
    }
    ctx.font = `${this.size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.emoji, 0, 0);
    ctx.restore();
  }

  onTap(x, y, particles, audio) {
    if (this.tapCooldown > 0) return;
    this.tapCooldown = 0.4;

    this.vx = Math.sign(this.vx) * this.baseSpeed * 3.5;
    this.boostTimer = 1.5;
    this.scale = 1.45;
    this.colorFlash = 0.6;
    this.bounceY = -18;
    this.bounceVY = -120;

    particles.burst(this.x, this.y, 12, {
      colors: ['#FF6B6B', '#FFE66D', '#4ECDC4', '#A8E6CF', '#FF9FF3'],
      minSpeed: 60, maxSpeed: 160, gravity: 320,
    });

    audio.honk();
  }
}
