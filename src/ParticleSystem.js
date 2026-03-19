export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  burst(x, y, count, options = {}) {
    const {
      colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#A8E6CF', '#FF9FF3'],
      minSpeed = 60,
      maxSpeed = 220,
      minLife = 0.5,
      maxLife = 1.2,
      minSize = 4,
      maxSize = 13,
      gravity = 220,
    } = options;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
      const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
      const life = minLife + Math.random() * (maxLife - minLife);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: minSize + Math.random() * (maxSize - minSize),
        color: colors[Math.floor(Math.random() * colors.length)],
        gravity,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 12,
        square: Math.random() > 0.5,
      });
    }
  }

  trail(x, y, color, options = {}) {
    const { size = 8, life = 0.45, gravity = 40 } = options;
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 25,
      vy: (Math.random() - 0.5) * 25,
      life,
      maxLife: life,
      size: size * (0.5 + Math.random() * 0.5),
      color,
      gravity,
      rotation: 0,
      rotSpeed: 0,
      square: false,
    });
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= 0.98;
      p.rotation += p.rotSpeed * dt;
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      if (p.square) {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}
