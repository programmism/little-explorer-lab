import { Actor } from './Actor.js';

export class Rocket extends Actor {
  constructor(x, y) {
    super(x, y);
    this.size = 75;
    this.baseX = x;
    this.bobTime = Math.random() * Math.PI * 2;
    this.vy = -25;         // gentle upward drift
    this.launched = false;
    this.launchVY = 0;
    this.trailTimer = 0;
    // The 🚀 emoji faces upper-right (~45° from vertical).
    // Rotate -45° so it points straight up by default.
    this.rotationOffset = -Math.PI / 4;
  }

  update(dt, w, h, particles) {
    super.update(dt, w, h);

    this.bobTime += dt * 0.7;
    this.trailTimer -= dt;

    if (this.launched) {
      this.launchVY += 120 * dt; // gravity
      this.vy = this.launchVY;

      // Emit trail from the bottom of the rocket
      if (this.trailTimer <= 0) {
        this.trailTimer = 0.03;
        particles.trail(this.x, this.y + this.size * 0.5, '#FF6B00', { size: 12, life: 0.55, gravity: 30 });
        particles.trail(this.x, this.y + this.size * 0.5, '#FFE44D', { size: 7,  life: 0.35, gravity: 20 });
      }

      // Return to cruise when past mid-screen
      if (this.y > h * 0.45 && this.launchVY > 0) {
        this.launched = false;
        this.launchVY = 0;
        this.vy = -25;
      }
    }

    this.y += this.vy * dt;
    this.x = this.baseX + Math.sin(this.bobTime) * 22;

    // Wrap vertically
    if (this.y < -120) this.y = h + 120;
    if (this.y > h + 120) this.y = -120;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotationOffset);
    ctx.font = `${this.size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚀', 0, 0);
    ctx.restore();
  }

  onTap(x, y, particles, audio) {
    if (this.tapCooldown > 0) return;
    this.tapCooldown = 2.2;

    this.launched = true;
    this.launchVY = -750;
    this.vy = -750;

    particles.burst(this.x, this.y + this.size * 0.5, 18, {
      colors: ['#FF6B00', '#FFE44D', '#FF4444', '#FFA500'],
      minSpeed: 90, maxSpeed: 220, gravity: 160,
    });

    audio.launch();
  }
}
