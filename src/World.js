import { Background } from './Background.js';
import { ParticleSystem } from './ParticleSystem.js';
import { Car } from './actors/Car.js';
import { Ball } from './actors/Ball.js';
import { Rocket } from './actors/Rocket.js';
import { Star } from './actors/Star.js';
import { Butterfly } from './actors/Butterfly.js';

export class World {
  constructor(canvas, ctx, input, audio) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.input = input;
    this.audio = audio;

    this.bg = new Background();
    this.particles = new ParticleSystem();
    this.actors = [];

    this.emergentTimer = 6 + Math.random() * 10;

    this._spawn();
  }

  get w() { return this.canvas.width; }
  get h() { return this.canvas.height; }

  _spawn() {
    const { w, h } = this;

    // 2 cars on the road
    const car1 = new Car(w * 0.15, h * 0.82);
    this.actors.push(car1);

    const car2 = new Car(w * 0.75, h * 0.82);
    car2.vx = -car2.baseSpeed;
    this.actors.push(car2);

    // 2 balls
    this.actors.push(new Ball(w * 0.28, h * 0.4));
    this.actors.push(new Ball(w * 0.72, h * 0.32));

    // 1 rocket
    this.actors.push(new Rocket(w * 0.5, h * 0.28));

    // 3 stars
    for (let i = 0; i < 3; i++) {
      this.actors.push(new Star(w * (0.18 + i * 0.32), h * (0.12 + Math.random() * 0.2)));
    }

    // 2 butterflies
    for (let i = 0; i < 2; i++) {
      const b = new Butterfly(w * (0.25 + i * 0.5), h * 0.35);
      b._pickNewTarget();
      this.actors.push(b);
    }
  }

  update(dt) {
    this.bg.update(dt);

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
        // Tap on empty space → cheerful sparkle
        this.particles.burst(tap.x, tap.y, 10, {
          colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#FF9FF3', '#A8E6CF'],
          minSpeed: 35, maxSpeed: 110, gravity: 120,
        });
      }
    }

    for (const actor of this.actors) {
      actor.update(dt, this.w, this.h, this.particles);
    }
    this.actors = this.actors.filter(a => a.alive);

    this.particles.update(dt);

    // Emergent events
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
    const s = new Star(
      60 + Math.random() * (this.w - 120),
      40 + Math.random() * (this.h * 0.38)
    );
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

  _rainbowBurst() {
    this.particles.burst(this.w / 2, this.h * 0.4, 35, {
      colors: ['#FF0000', '#FF7F00', '#FFFF00', '#00DD00', '#0077FF', '#8B00FF'],
      minSpeed: 120, maxSpeed: 420, gravity: 90,
      minSize: 6, maxSize: 17,
    });
  }

  draw() {
    const { ctx, w, h } = this;
    this.bg.draw(ctx, w, h);
    for (const actor of this.actors) actor.draw(ctx);
    this.particles.draw(ctx);
  }
}
