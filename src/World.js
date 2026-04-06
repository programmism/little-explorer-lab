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
import { LaunchPad } from './actors/LaunchPad.js';

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
    this.targetTimer = 3;
    this.score = 0;
    this.scoreDisplay = 0;
    this.scorePop = 0;

    this.launchPad = null;
    this._prevW = this.w;
    this._prevH = this.h;

    this._spawn();
  }

  get w() { return this.canvas.width; }
  get h() { return this.canvas.height; }

  _spawn() {
    const { w, h } = this;

    // Right-hand traffic: rightward cars in bottom lane, leftward in top lane
    const car1 = new Car(w * 0.15, h * 0.89);
    car1.laneY = 0.89;
    car1.currentLaneY = 0.89;
    this.actors.push(car1);

    const car2 = new Car(w * 0.75, h * 0.78);
    car2.vx = -car2.baseSpeed;
    car2.laneY = 0.78;
    car2.currentLaneY = 0.78;
    this.actors.push(car2);

    this.actors.push(new Ball(w * 0.28, h * 0.4));
    this.actors.push(new Ball(w * 0.72, h * 0.32));

    // Launch pad at bottom center, above the road
    this.launchPad = new LaunchPad(w * 0.5, h * 0.72);
    this.actors.push(this.launchPad);

    for (let i = 0; i < 3; i++) {
      this.actors.push(new Star(w * (0.18 + i * 0.32), h * (0.12 + Math.random() * 0.2)));
    }

    for (let i = 0; i < 2; i++) {
      const b = new Butterfly(w * (0.25 + i * 0.5), h * 0.35);
      b._pickNewTarget();
      this.actors.push(b);
    }

    // Initial targets
    for (let i = 0; i < 3; i++) {
      const tx = w * (0.15 + i * 0.35);
      const ty = h * (0.08 + Math.random() * 0.25);
      this.actors.push(new Target(tx, ty));
    }
  }

  _launchRocket(tapX, tapY) {
    const pad = this.launchPad;
    if (!pad || !pad.ready) return;

    const startX = pad.x;
    const startY = pad.y - 25; // launch from top of pad
    const angle = Math.atan2(tapY - startY, tapX - startX);

    // Don't launch downward — only allow angles pointing upward
    if (angle >= 0) return;

    const speed = 650;
    const rocket = new Rocket(startX, startY, angle, speed);
    this.actors.push(rocket);
    pad.launch();

    // Launch burst
    this.particles.burst(startX, startY, 14, {
      colors: ['#FF6B00', '#FFE44D', '#FF4444', '#FFA500'],
      minSpeed: 60, maxSpeed: 180, gravity: 160,
    });

    this.audio.launch();
  }

  update(dt) {
    // ── Handle screen resize / rotation ─────────────────
    if (this.w !== this._prevW || this.h !== this._prevH) {
      this._onResize(this._prevW, this._prevH, this.w, this.h);
      this._prevW = this.w;
      this._prevH = this.h;
    }

    this.bg.update(dt);

    // ── Pointer tracking for aim line ──────────────────
    const pointers = this.input.getActivePointers();
    if (pointers.length > 0 && this.launchPad) {
      // Use the first pointer for aiming
      this.launchPad.setAim(pointers[0].x, pointers[0].y);
    } else if (this.launchPad) {
      this.launchPad.clearAim();
    }

    // ── Taps ─────────────────────────────────────────────
    const taps = this.input.consumeTaps();
    if (taps.length > 0) this.audio.unlock();

    for (const tap of taps) {
      let hit = false;
      for (let i = this.actors.length - 1; i >= 0; i--) {
        const actor = this.actors[i];
        // Skip launch pad and rockets for hit testing — they don't consume taps
        if (actor instanceof LaunchPad || actor instanceof Rocket) continue;
        if (actor.hitTest(tap.x, tap.y)) {
          actor.onTap(tap.x, tap.y, this.particles, this.audio);
          hit = true;
          break;
        }
      }

      // Any tap that doesn't hit another actor → launch a rocket toward that point
      if (!hit) {
        this._launchRocket(tap.x, tap.y);
        // Also show particles at tap point
        this.particles.burst(tap.x, tap.y, 8, {
          colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#FF9FF3', '#A8E6CF'],
          minSpeed: 25, maxSpeed: 80, gravity: 120,
        });
      }
    }

    // ── Drawing (only for pointers that exceeded the drag threshold) ──
    const currentIds = new Set(pointers.map(p => p.id));
    const drawingIds = new Set();

    for (const p of pointers) {
      if (!this.input.isDrawing(p.id)) continue; // not dragging yet — skip

      drawingIds.add(p.id);
      if (!this._prevPointerIds.has(p.id)) {
        this.drawing.startStroke(p.id, p.x, p.y);
      } else {
        this.drawing.addPoint(p.id, p.x, p.y);
      }
    }
    for (const id of this._prevPointerIds) {
      if (!drawingIds.has(id)) this.drawing.endStroke(id);
    }
    this._prevPointerIds = drawingIds;

    this.drawing.update(dt);

    // ── Key labels ────────────────────────────────────────
    for (const key of this.input.consumeKeys()) {
      const label = new KeyLabel(key, this.w / 2, this.h / 2);
      if (!label.alive) continue;

      this.keyLabels.push(label);

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
      this.audio.speakLetter(key);
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
          rocket.alive = false; // rocket consumed on hit
          this.score += 1;
          this.scorePop = 1;
        }
      }
    }

    // ── Car ↔ Car collisions ──────────────────────────
    const cars = this.actors.filter(a => a instanceof Car && !a.crashed);
    for (let i = 0; i < cars.length; i++) {
      for (let j = i + 1; j < cars.length; j++) {
        const a = cars[i], b = cars[j];
        // Only collide if one is swerving (on wrong lane)
        if (!a.swerving && !b.swerving) continue;
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < (a.size + b.size) * 0.45) {
          a.triggerCrash(b, this.particles, this.audio);
        }
      }
    }

    this.actors = this.actors.filter(a => a.alive);

    this.particles.update(dt);

    // ── Target spawning ─────────────────────────────────
    this.targetTimer -= dt;
    if (this.targetTimer <= 0) {
      this._spawnTarget();
      this.targetTimer = 3 + Math.random() * 4;
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

  _onResize(oldW, oldH, newW, newH) {
    const sx = newW / oldW;
    const sy = newH / oldH;

    for (const actor of this.actors) {
      if (actor instanceof LaunchPad) {
        // Fixed position: always bottom center
        actor.x = newW * 0.5;
        actor.y = newH * 0.72;
      } else if (actor instanceof Car) {
        // Cars stay in their lane, scale x proportionally
        actor.x *= sx;
        actor.y = newH * (actor.laneY || 0.82);
      } else if (actor instanceof Ball) {
        // Scale position, keep within bounds
        actor.x *= sx;
        actor.y *= sy;
      } else if (actor instanceof Star) {
        // Scale base positions (actual position derived from base + bob)
        actor.baseX *= sx;
        actor.baseY *= sy;
        actor.x = actor.baseX;
        actor.y = actor.baseY;
      } else if (actor instanceof Target) {
        // Scale positions
        actor.x *= sx;
        actor.baseY *= sy;
        actor.y = actor.baseY;
      } else if (actor instanceof Butterfly) {
        // Scale position and wander target
        actor.x *= sx;
        actor.y *= sy;
        actor.targetX *= sx;
        actor.targetY *= sy;
      } else if (actor instanceof Rocket) {
        // Projectiles in flight — scale position
        actor.x *= sx;
        actor.y *= sy;
      }
    }

    // Scale key label positions
    for (const l of this.keyLabels) {
      l.x *= sx;
      l.y *= sy;
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
    const y = margin + Math.random() * (this.h * 0.40);
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
