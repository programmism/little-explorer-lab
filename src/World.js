import { Background } from './Background.js';
import { ParticleSystem } from './ParticleSystem.js';
import { DrawingLayer } from './DrawingLayer.js';
import { KeyLabel } from './KeyLabel.js';
import { Car } from './actors/Car.js';
import { Ball } from './actors/Ball.js';
import { Rocket } from './actors/Rocket.js';
import { Star } from './actors/Star.js';
import { Butterfly } from './actors/Butterfly.js';
import { Target } from './actors/Target.js';

export class World {
  constructor(canvas, ctx, input, audio) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.input = input;
    this.audio = audio;

    this.bg = new Background();
    this.particles = new ParticleSystem();
    this.drawing = new DrawingLayer();
    this.keyLabels = [];
    this.actors = [];

    this._prevPointerIds = new Set();

    this.emergentTimer = 6 + Math.random() * 10;
    this.targetTimer = 3;   // spawn first target after 3 seconds
    this.score = 0;
    this.scoreDisplay = 0;  // animated score display
    this.scorePop = 0;      // scale pop effect on score change

    this._spawn();
  }

  get w() { return this.canvas.width; }
  get h() { return this.canvas.height; }

  _spawn() {
    const { w, h } = this;

    const car1 = new Car(w * 0.15, h * 0.82);
    this.actors.push(car1);

    const car2 = new Car(w * 0.75, h * 0.82);
    car2.vx = -car2.baseSpeed;
    this.actors.push(car2);

    this.actors.push(new Ball(w * 0.28, h * 0.4));
    this.actors.push(new Ball(w * 0.72, h * 0.32));

    this.actors.push(new Rocket(w * 0.5, h * 0.28));

    for (let i = 0; i < 3; i++) {
      this.actors.push(new Star(w * (0.18 + i * 0.32), h * (0.12 + Math.random() * 0.2)));
    }

    for (let i = 0; i < 2; i++) {
      const b = new Butterfly(w * (0.25 + i * 0.5), h * 0.35);
      b._pickNewTarget();
      this.actors.push(b);
    }

    // Initial targets to aim at
    for (let i = 0; i < 3; i++) {
      const tx = w * (0.2 + i * 0.3);
      const ty = h * (0.1 + Math.random() * 0.25);
      this.actors.push(new Target(tx, ty));
    }
  }

  update(dt) {
    this.bg.update(dt);

    // ── Taps ─────────────────────────────────────────────
    const taps = this.input.consumeTaps();
    if (taps.length > 0) this.audio.unlock();

    for (const tap of taps) {
      let hit = false;
      for (let i = this.actors.length - 1; i >= 0; i--) {
        if (this.actors[i].hitTest(tap.x, tap.y)) {
          this.actors[i].onTap(tap.x, tap.y, this.particles, this.audio);
          hit = true;
          break;
        }
      }
      if (!hit) {
        this.particles.burst(tap.x, tap.y, 10, {
          colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#FF9FF3', '#A8E6CF'],
          minSpeed: 35, maxSpeed: 110, gravity: 120,
        });
      }
    }

    // ── Drawing ───────────────────────────────────────────
    const pointers = this.input.getActivePointers();
    const currentIds = new Set(pointers.map(p => p.id));

    for (const p of pointers) {
      if (!this._prevPointerIds.has(p.id)) {
        this.drawing.startStroke(p.id, p.x, p.y);
      } else {
        this.drawing.addPoint(p.id, p.x, p.y);
      }
    }
    for (const id of this._prevPointerIds) {
      if (!currentIds.has(id)) this.drawing.endStroke(id);
    }
    this._prevPointerIds = currentIds;

    this.drawing.update(dt);

    // ── Key labels ────────────────────────────────────────
    for (const key of this.input.consumeKeys()) {
      const label = new KeyLabel(key, this.w / 2, this.h / 2);
      if (!label.alive) continue;

      this.keyLabels.push(label);

      // Particle burst around where the label appears
      this.particles.burst(label.x, label.y, 18, {
        colors: [
          `hsl(${label.hue}, 100%, 60%)`,
          `hsl(${(label.hue + 60) % 360}, 100%, 65%)`,
          '#ffffff',
        ],
        minSpeed: 80, maxSpeed: 280, gravity: 150,
        minSize: 5, maxSize: 14,
      });

      this.audio.sparkle();
    }

    this.keyLabels = this.keyLabels.filter(l => l.alive);
    for (const l of this.keyLabels) l.update(dt);

    // ── Actors ────────────────────────────────────────────
    for (const actor of this.actors) {
      actor.update(dt, this.w, this.h, this.particles);
    }

    // ── Rocket ↔ Target collisions ──────────────────────
    const rockets = this.actors.filter(a => a instanceof Rocket && a.launched);
    const targets = this.actors.filter(a => a instanceof Target && !a.hit);
    for (const rocket of rockets) {
      for (const target of targets) {
        const dist = Math.hypot(rocket.x - target.x, rocket.y - target.y);
        if (dist < (rocket.size + target.size) * 0.45) {
          target.explode(this.particles, this.audio);
          this.score += 1;
          this.scorePop = 1;
        }
      }
    }

    this.actors = this.actors.filter(a => a.alive);

    this.particles.update(dt);

    // ── Target spawning ─────────────────────────────────
    this.targetTimer -= dt;
    if (this.targetTimer <= 0) {
      this._spawnTarget();
      this.targetTimer = 4 + Math.random() * 5;
    }

    // ── Score animation ─────────────────────────────────
    this.scoreDisplay += (this.score - this.scoreDisplay) * dt * 8;
    this.scorePop = Math.max(0, this.scorePop - dt * 3);

    // ── Emergent events ───────────────────────────────────
    this.emergentTimer -= dt;
    if (this.emergentTimer <= 0) {
      this._emergent();
      this.emergentTimer = 8 + Math.random() * 14;
    }
  }

  _emergent() {
    const pick = Math.floor(Math.random() * 4);
    if (pick === 0) this._spawnTemporaryStar();
    else if (pick === 1) this._spawnTemporaryBall();
    else if (pick === 2) this._confettiRain();
    else this._rainbowBurst();
  }

  _spawnTemporaryStar() {
    const s = new Star(60 + Math.random() * (this.w - 120), 40 + Math.random() * (this.h * 0.38));
    s.scale = 0;
    this.actors.push(s);
    setTimeout(() => { s.alive = false; }, 12000);
  }

  _spawnTemporaryBall() {
    const b = new Ball(50 + Math.random() * (this.w - 100), this.h * 0.18);
    this.actors.push(b);
    setTimeout(() => { b.alive = false; }, 14000);
  }

  _confettiRain() {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        this.particles.burst(Math.random() * this.w, -10, 7, {
          colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#A8E6CF', '#FF9FF3', '#54A0FF'],
          minSpeed: 40, maxSpeed: 130, gravity: 180,
        });
      }, i * 180);
    }
  }

  _spawnTarget() {
    const margin = 80;
    const x = margin + Math.random() * (this.w - margin * 2);
    // Targets appear in the sky area (top 55% of screen)
    const y = margin + Math.random() * (this.h * 0.45);
    const t = new Target(x, y);
    this.actors.push(t);
  }

  _rainbowBurst() {
    this.particles.burst(this.w / 2, this.h * 0.4, 35, {
      colors: ['#FF0000', '#FF7F00', '#FFFF00', '#00DD00', '#0077FF', '#8B00FF'],
      minSpeed: 120, maxSpeed: 420, gravity: 90,
      minSize: 6, maxSize: 17,
    });
  }

  draw() {
    const { ctx, w, h } = this;

    // Background
    this.bg.draw(ctx, w, h);

    // World actors + particles
    for (const actor of this.actors) actor.draw(ctx);
    this.particles.draw(ctx);

    // Drawing layer on top of world, below key labels
    this.drawing.draw(ctx);

    // Key labels — topmost
    for (const l of this.keyLabels) l.draw(ctx);

    // ── Score display ───────────────────────────────────
    if (this.score > 0) {
      const displayScore = Math.round(this.scoreDisplay);
      const popScale = 1 + this.scorePop * 0.4;
      ctx.save();
      ctx.translate(w / 2, 38);
      ctx.scale(popScale, popScale);
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillText(`💥 ${displayScore}`, 2, 2);
      ctx.fillStyle = '#FFD700';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 3;
      ctx.strokeText(`💥 ${displayScore}`, 0, 0);
      ctx.fillText(`💥 ${displayScore}`, 0, 0);
      ctx.restore();
    }
  }
}
