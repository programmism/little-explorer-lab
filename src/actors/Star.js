import { Actor } from './Actor.js';

export class Star extends Actor {
  constructor(x, y) {
    super(x, y);
    this.size = 65;
    this.baseX = x;
    this.baseY = y;
    this.bobT = Math.random() * Math.PI * 2;
    this.bobTX = Math.random() * Math.PI * 2;
    this.rotAngle = 0;
    this.scale = 1;
    this.scaleTarget = 1;
    this.hidden = false;
    this.hideTimer = 0;
    this.tiltOffsetX = 0;
    this.tiltOffsetY = 0;
  }

  update(dt, w, h) {
    super.update(dt, w, h);

    this.bobT  += dt * 0.65;
    this.bobTX += dt * 0.42;
    this.rotAngle += dt * 0.5;

    if (this.hidden) {
      this.hideTimer -= dt;
      if (this.hideTimer <= 0) {
        this.hidden = false;
        this.scale = 0;
        this.scaleTarget = 1;
      }
    }

    this.scale += (this.scaleTarget - this.scale) * Math.min(1, dt * 10);

    this.x = this.baseX + Math.sin(this.bobTX) * 28;
    this.y = this.baseY + Math.sin(this.bobT) * 18;
  }

  draw(ctx) {
    if (this.scale < 0.01) return;
    ctx.save();
    ctx.translate(this.x + this.tiltOffsetX, this.y + this.tiltOffsetY);
    ctx.rotate(this.rotAngle);
    ctx.scale(this.scale, this.scale);
    ctx.font = `${this.size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⭐', 0, 0);
    ctx.restore();
  }

  onTap(x, y, particles, audio) {
    if (this.tapCooldown > 0) return;
    this.tapCooldown = 1.6;

    particles.burst(this.x, this.y, 22, {
      colors: ['#FFD700', '#FFF44F', '#FFB347', '#FFFACD', '#FFEAA7'],
      minSpeed: 90, maxSpeed: 320, gravity: 110,
      minSize: 5, maxSize: 16,
    });

    this.hidden = true;
    this.hideTimer = 1.1;
    this.scaleTarget = 0;

    audio.sparkle();
  }
}
