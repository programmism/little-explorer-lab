import { Actor } from './Actor.js';

export class LaunchPad extends Actor {
  constructor(x, y) {
    super(x, y);
    this.size = 90;
    this.aimAngle = -Math.PI / 2; // default: straight up
    this.aimActive = false;
    this.reloadTimer = 0;
    this.reloadTime = 0.8; // seconds between launches
    this.padWidth = 120;
    this.padHeight = 18;
  }

  get ready() {
    return this.reloadTimer <= 0;
  }

  setAim(targetX, targetY) {
    this.aimAngle = Math.atan2(targetY - this.y, targetX - this.x);
    // Clamp so you can't shoot downward
    if (this.aimAngle > -0.15) this.aimAngle = -0.15;
    if (this.aimAngle < -Math.PI + 0.15) this.aimAngle = -Math.PI + 0.15;
    this.aimActive = true;
  }

  clearAim() {
    this.aimActive = false;
  }

  launch() {
    this.reloadTimer = this.reloadTime;
  }

  update(dt, w, h, particles) {
    super.update(dt, w, h);
    this.reloadTimer = Math.max(0, this.reloadTimer - dt);
  }

  draw(ctx) {
    const { x, y } = this;

    // Aim line (dotted)
    if (this.aimActive) {
      ctx.save();
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = this.ready ? 'rgba(255, 200, 50, 0.6)' : 'rgba(150, 150, 150, 0.3)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y - 20);
      const len = 200;
      ctx.lineTo(x + Math.cos(this.aimAngle) * len, y - 20 + Math.sin(this.aimAngle) * len);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Platform base
    ctx.save();
    ctx.translate(x, y);

    // Metal platform
    const grad = ctx.createLinearGradient(0, -12, 0, 12);
    grad.addColorStop(0, '#888');
    grad.addColorStop(0.5, '#aaa');
    grad.addColorStop(1, '#666');
    ctx.fillStyle = grad;

    const hw = this.padWidth / 2;
    const hh = this.padHeight / 2;
    ctx.beginPath();
    ctx.roundRect(-hw, -hh, this.padWidth, this.padHeight, 5);
    ctx.fill();

    // Side rails
    ctx.fillStyle = '#555';
    ctx.fillRect(-hw - 6, -hh - 8, 10, this.padHeight + 8);
    ctx.fillRect(hw - 4, -hh - 8, 10, this.padHeight + 8);

    // Rocket emoji on the pad (ready indicator)
    if (this.ready) {
      ctx.font = '36px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Rotate to match aim direction. The 🚀 emoji faces ~-45° (upper-right)
      ctx.save();
      ctx.translate(0, -25);
      ctx.rotate(this.aimAngle + Math.PI / 4);
      ctx.fillText('🚀', 0, 0);
      ctx.restore();
    }

    ctx.restore();
  }
}
