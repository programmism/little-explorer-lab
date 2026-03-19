export class Actor {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.size = 80;
    this.alive = true;
    this.tapCooldown = 0;
  }

  update(dt, w, h, particles) {
    this.tapCooldown = Math.max(0, this.tapCooldown - dt);
  }

  draw(ctx) {}

  hitTest(x, y) {
    return Math.hypot(x - this.x, y - this.y) < this.size * 0.65;
  }

  onTap(x, y, particles, audio) {}
}
