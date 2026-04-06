export class GoalManager {
  constructor() {
    this.level = 1;
    this.target = 3;           // first goal: hit 3 targets
    this.hits = 0;
    this.celebrating = false;
    this.celebrationTime = 0;
    this.celebrationDuration = 3.0;

    // Star animation state
    this.starScales = [];      // per-star pop scale
    this.starFillTimes = [];   // when each star was filled (for animation)
    this._syncStars();
  }

  _syncStars() {
    this.starScales = new Array(this.target).fill(0);
    this.starFillTimes = new Array(this.target).fill(-1);
  }

  /** Call when a rocket hits a target. Returns true if a goal was just completed. */
  recordHit() {
    if (this.celebrating) return false;
    this.hits = Math.min(this.hits + 1, this.target);
    this.starFillTimes[this.hits - 1] = 0; // start fill animation
    if (this.hits >= this.target) {
      this.celebrating = true;
      this.celebrationTime = 0;
      return true;
    }
    return false;
  }

  update(dt) {
    // Animate star fill pop
    for (let i = 0; i < this.target; i++) {
      if (this.starFillTimes[i] >= 0) {
        this.starFillTimes[i] += dt;
        // Quick pop-in: scale overshoots then settles
        const t = this.starFillTimes[i];
        if (t < 0.15) {
          this.starScales[i] = 1 + 0.5 * (t / 0.15);
        } else if (t < 0.35) {
          this.starScales[i] = 1.5 - 0.5 * ((t - 0.15) / 0.2);
        } else {
          this.starScales[i] = 1;
        }
      }
    }

    // Celebration phase
    if (this.celebrating) {
      this.celebrationTime += dt;
      if (this.celebrationTime >= this.celebrationDuration) {
        this._advance();
      }
    }
  }

  _advance() {
    this.level += 1;
    this.target += (this.level <= 3 ? 1 : 2); // gentle ramp
    this.hits = 0;
    this.celebrating = false;
    this.celebrationTime = 0;
    this._syncStars();
  }

  /** Trigger the big celebration effects via particles and audio. */
  triggerCelebration(particles, audio, w, h) {
    // Screen-wide confetti waves
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#FF9FF3', '#A8E6CF', '#54A0FF', '#FFA500'];
    for (let wave = 0; wave < 5; wave++) {
      setTimeout(() => {
        for (let i = 0; i < 4; i++) {
          particles.burst(Math.random() * w, -10 + Math.random() * (h * 0.3), 18, {
            colors,
            minSpeed: 80,
            maxSpeed: 300,
            gravity: 140,
            minSize: 5,
            maxSize: 16,
          });
        }
      }, wave * 250);
    }

    // Big center burst
    particles.burst(w / 2, h * 0.35, 45, {
      colors,
      minSpeed: 120,
      maxSpeed: 450,
      gravity: 100,
      minSize: 6,
      maxSize: 18,
    });

    // Fanfare sound
    audio.fanfare();
  }

  /** Draw the goal stars at top of screen. */
  draw(ctx, w) {
    const total = this.target;
    const starSize = 22;
    const gap = 10;
    const totalWidth = total * starSize * 2 + (total - 1) * gap;
    const startX = (w - totalWidth) / 2 + starSize;
    const y = 36;

    ctx.save();

    // Label
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';

    if (this.celebrating) {
      // Pulsing celebration text
      const pulse = 1 + 0.15 * Math.sin(this.celebrationTime * 8);
      ctx.save();
      ctx.translate(w / 2, y + 36);
      ctx.scale(pulse, pulse);
      ctx.font = 'bold 24px sans-serif';
      ctx.fillStyle = '#FFD700';
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 3;
      ctx.strokeText('Amazing!', 0, 0);
      ctx.fillText('Amazing!', 0, 0);
      ctx.restore();
    }

    // Draw stars
    for (let i = 0; i < total; i++) {
      const cx = startX + i * (starSize * 2 + gap);
      const filled = i < this.hits;
      const scale = filled ? (this.starScales[i] || 1) : 1;

      ctx.save();
      ctx.translate(cx, y);
      ctx.scale(scale, scale);

      if (filled) {
        // Filled gold star
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 2;
      } else {
        // Empty star outline
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
      }

      this._drawStar(ctx, 0, 0, 5, starSize, starSize * 0.45);
      ctx.fill();
      ctx.stroke();

      // Glow on filled stars
      if (filled) {
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 12;
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        this._drawStar(ctx, 0, 0, 5, starSize, starSize * 0.45);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    }

    ctx.restore();
  }

  _drawStar(ctx, cx, cy, spikes, outerR, innerR) {
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (Math.PI * i) / spikes - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
}
