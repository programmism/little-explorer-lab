import { Actor } from './Actor.js';

export class Rocket extends Actor {
  constructor(x, y, angle, speed) {
    super(x, y);
    this.size = 50;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.angle = angle;
    this.launched = true;
    this.trailTimer = 0;
    this.lifetime = 5; // seconds before auto-remove
    // The 🚀 emoji faces upper-right (~-45° or -π/4).
    // To visually align with flight direction: rotate by (angle - (-π/4))
    this.emojiOffset = Math.PI / 4;
  }

  update(dt, w, h, particles) {
    super.update(dt, w, h);

    // Gravity pulls the rocket down
    this.vy += 180 * dt;

    // Update angle to match velocity direction
    this.angle = Math.atan2(this.vy, this.vx);

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Trail particles from the back of the rocket
    this.trailTimer -= dt;
    if (this.trailTimer <= 0) {
      this.trailTimer = 0.025;
      const backX = this.x - Math.cos(this.angle) * this.size * 0.4;
      const backY = this.y - Math.sin(this.angle) * this.size * 0.4;
      particles.trail(backX, backY, '#FF6B00', { size: 11, life: 0.5, gravity: 25 });
      particles.trail(backX, backY, '#FFE44D', { size: 6, life: 0.3, gravity: 15 });
    }

    // Remove if off-screen or lifetime expired
    this.lifetime -= dt;
    if (this.lifetime <= 0 || this.x < -150 || this.x > w + 150 || this.y < -150 || this.y > h + 150) {
      this.alive = false;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + this.emojiOffset);
    ctx.font = `${this.size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚀', 0, 0);
    ctx.restore();
  }
}
