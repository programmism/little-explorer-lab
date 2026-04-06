import { Actor } from './Actor.js';

const EMOJIS = ['🎈', '🎯', '🪐', '👾', '⭐'];

export class Target extends Actor {
  constructor(x, y) {
    super(x, y);
    this.size = 60;
    this.emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    this.bobTime = Math.random() * Math.PI * 2;
    this.bobAmplitude = 8 + Math.random() * 10;
    this.baseY = y;
    this.scale = 0;        // pop-in animation
    this.scaleTarget = 1;
    this.lifetime = 15 + Math.random() * 10;
    this.fadeTimer = 0;
    this.hit = false;

    // Horizontal drift — some move, some stay still
    this.driftSpeed = (Math.random() > 0.3)
      ? (30 + Math.random() * 60) * (Math.random() > 0.5 ? 1 : -1)
      : 0;
  }

  update(dt, w, h, particles) {
    super.update(dt, w, h);

    // Pop-in animation
    this.scale += (this.scaleTarget - this.scale) * dt * 5;

    // Horizontal drift
    this.x += this.driftSpeed * dt;

    // Wrap horizontally
    if (this.x < -50) this.x = w + 50;
    if (this.x > w + 50) this.x = -50;

    // Gentle bobbing
    this.bobTime += dt * 1.2;
    this.y = this.baseY + Math.sin(this.bobTime) * this.bobAmplitude;

    // Lifetime countdown
    this.lifetime -= dt;
    if (this.lifetime <= 0) {
      this.fadeTimer += dt;
      this.scaleTarget = 0;
      if (this.scale < 0.05) this.alive = false;
    }
  }

  draw(ctx) {
    if (this.scale < 0.01) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);
    ctx.font = `${this.size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.emoji, 0, 0);
    ctx.restore();
  }

  explode(particles, audio) {
    this.hit = true;
    this.alive = false;

    // Big celebration burst
    particles.burst(this.x, this.y, 25, {
      colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#FF9FF3', '#FF4444', '#FFA500'],
      minSpeed: 100, maxSpeed: 350,
      gravity: 130,
      minSize: 5, maxSize: 16,
    });

    audio.explosion();
  }
}
