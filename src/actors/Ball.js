import { Actor } from './Actor.js';

const COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#FF9FF3', '#54A0FF', '#FFA07A'];

function hexDarken(hex, amt) {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amt);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amt);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amt);
  return `rgb(${r},${g},${b})`;
}

export class Ball extends Actor {
  constructor(x, y) {
    super(x, y);
    this.size = 55;
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.dark = hexDarken(this.color, 60);
    this.vx = (Math.random() - 0.5) * 120;
    this.vy = -250;
    this.gravity = 420;
    this.bounciness = 0.68;
    this.squishX = 1;
    this.squishY = 1;
  }

  update(dt, w, h) {
    super.update(dt, w, h);

    // Spring squish back
    this.squishX += (1 - this.squishX) * Math.min(1, dt * 14);
    this.squishY = 2 - this.squishX;

    this.vy += this.gravity * dt;
    this.vx *= 0.993;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const groundY = h * 0.72;
    const r = this.size / 2;

    if (this.y + r > groundY) {
      this.y = groundY - r;
      this.vy = -Math.abs(this.vy) * this.bounciness;
      if (Math.abs(this.vy) < 60) this.vy = 0;
      this.squishX = 1.4;
    }
    if (this.x - r < 0)  { this.x = r;     this.vx =  Math.abs(this.vx); }
    if (this.x + r > w)  { this.x = w - r; this.vx = -Math.abs(this.vx); }
  }

  draw(ctx) {
    const r = this.size / 2;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.squishX, this.squishY);

    // Shadow
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.9, r * 0.8, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Body
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.08, 0, 0, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.6)');
    grad.addColorStop(0.25, this.color);
    grad.addColorStop(1, this.dark);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.28, -r * 0.28, r * 0.2, r * 0.11, -0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  onTap(x, y, particles, audio) {
    const dx = this.x - x;
    const dy = this.y - y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    this.vx += (dx / dist) * 520;
    this.vy += (dy / dist) * 520 - 180;

    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.dark = hexDarken(this.color, 60);

    particles.burst(this.x, this.y, 9, {
      colors: [this.color, '#ffffff'],
      minSpeed: 45, maxSpeed: 130, gravity: 220,
    });

    audio.bounce();
  }
}
