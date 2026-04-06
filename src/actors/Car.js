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

    // Lane system
    this.laneY = 0;       // home lane (fraction of h), set by World
    this.currentLaneY = 0; // current target lane fraction
    this.swerving = false;
    this.swerveTimer = 0;

    // Crash state
    this.crashed = false;
    this.crashSpin = 0;
    this.crashVX = 0;
    this.crashVY = 0;
    this.crashAlpha = 1;
    this.respawnTimer = 0;
  }

  get oppositeLaneY() {
    // 0.89 ↔ 0.78
    return this.laneY === 0.89 ? 0.78 : 0.89;
  }

  swerveToOncoming() {
    if (this.swerving || this.crashed) return;
    this.swerving = true;
    this.currentLaneY = this.oppositeLaneY;
    this.swerveTimer = 2.5 + Math.random() * 1.5; // time on wrong lane before returning
  }

  triggerCrash(otherCar, particles, audio) {
    if (this.crashed) return;

    const midX = (this.x + otherCar.x) / 2;
    const midY = (this.y + otherCar.y) / 2;

    // Mark both as crashed
    this.crashed = true;
    otherCar.crashed = true;

    // Fling directions: cars fly apart
    const pushDir = this.x < otherCar.x ? -1 : 1;
    this.crashVX = pushDir * (200 + Math.random() * 150);
    this.crashVY = -(250 + Math.random() * 200);
    this.crashSpin = (3 + Math.random() * 5) * pushDir;

    otherCar.crashVX = -pushDir * (200 + Math.random() * 150);
    otherCar.crashVY = -(250 + Math.random() * 200);
    otherCar.crashSpin = -(3 + Math.random() * 5) * pushDir;

    this.respawnTimer = 3.5;
    otherCar.respawnTimer = 3.5;

    // Big explosion at collision point
    particles.burst(midX, midY, 35, {
      colors: ['#FF4400', '#FF8800', '#FFCC00', '#FF0000', '#FFE44D', '#333333'],
      minSpeed: 120, maxSpeed: 450,
      gravity: 200,
      minSize: 6, maxSize: 20,
    });

    // Secondary debris burst
    setTimeout(() => {
      particles.burst(midX, midY, 20, {
        colors: ['#666', '#999', '#FF6600', '#FFAA00'],
        minSpeed: 50, maxSpeed: 200,
        gravity: 300,
        minSize: 3, maxSize: 10,
      });
    }, 150);

    audio.carCrash();
  }

  update(dt, w, h) {
    super.update(dt, w, h);

    if (this.crashed) {
      // Fly away with spin
      this.x += this.crashVX * dt;
      this.crashVY += 400 * dt; // gravity
      this.y += this.crashVY * dt;
      this.crashAlpha = Math.max(0, this.crashAlpha - dt * 0.5);

      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        // Respawn: reset state
        this.crashed = false;
        this.crashAlpha = 1;
        this.crashSpin = 0;
        this.crashVX = 0;
        this.crashVY = 0;
        this.swerving = false;
        this.currentLaneY = this.laneY;
        this.y = h * this.laneY;
        this.scale = 0; // pop-in animation
        // Respawn off-screen
        this.x = this.vx > 0 ? -100 : w + 100;
        this.emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      }
      return;
    }

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

    // Smooth lane transition
    const targetY = h * this.currentLaneY;
    this.y += (targetY - this.y) * Math.min(1, dt * 4);

    // Swerve timer: return to home lane
    if (this.swerving) {
      this.swerveTimer -= dt;
      if (this.swerveTimer <= 0) {
        this.swerving = false;
        this.currentLaneY = this.laneY;
      }
    }

    // Wrap horizontally
    if (this.vx > 0 && this.x > w + 120) this.x = -120;
    if (this.vx < 0 && this.x < -120) this.x = w + 120;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y + this.bounceY);

    if (this.crashed) {
      ctx.globalAlpha = this.crashAlpha;
      ctx.rotate(this.crashSpin * (1 - this.crashAlpha));
    }

    if (this.vx > 0) ctx.scale(-1, 1);
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
    if (this.tapCooldown > 0 || this.crashed) return;
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

    // 30% chance to swerve to oncoming lane
    if (Math.random() < 0.3) {
      this.swerveToOncoming();
    }
  }
}
