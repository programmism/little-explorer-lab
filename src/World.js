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
import { Fish } from './actors/Fish.js';
import { Astronaut } from './actors/Astronaut.js';
import { Companion } from './actors/Companion.js';
import { GoalManager } from './GoalManager.js';
import { CollectionManager } from './CollectionManager.js';
import { SceneManager, SCENE_CONFIGS } from './SceneManager.js';
import { MusicScene } from './MusicScene.js';

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

    // Per-scene actor storage
    this.sceneActors = SCENE_CONFIGS.map(() => []);
    this.sceneLaunchPads = SCENE_CONFIGS.map(() => null);

    this.sceneManager = new SceneManager();
    this.musicScene = new MusicScene();

    this._prevPointerIds = new Set();

    this.emergentTimer = 6 + Math.random() * 10;
    this.targetTimer = 3;

    this.goals = new GoalManager();
    this.album = new CollectionManager();
    this.companion = null;
    this._prevW = this.w;
    this._prevH = this.h;

    // Spawn actors for all scenes
    this._spawnRoad();
    this._spawnSpace();
    this._spawnUnderwater();
  }

  get w() { return this.canvas.width; }
  get h() { return this.canvas.height; }

  // Convenience accessors for current scene
  get actors() { return this.sceneActors[this.sceneManager.currentIndex]; }
  set actors(v) { this.sceneActors[this.sceneManager.currentIndex] = v; }
  get launchPad() { return this.sceneLaunchPads[this.sceneManager.currentIndex]; }

  _spawnRoad() {
    const { w, h } = this;
    const actors = this.sceneActors[0];

    const car1 = new Car(w * 0.15, h * 0.89);
    car1.laneY = 0.89;
    car1.currentLaneY = 0.89;
    actors.push(car1);

    const car2 = new Car(w * 0.75, h * 0.78);
    car2.vx = -car2.baseSpeed;
    car2.laneY = 0.78;
    car2.currentLaneY = 0.78;
    actors.push(car2);

    actors.push(new Ball(w * 0.28, h * 0.4));
    actors.push(new Ball(w * 0.72, h * 0.32));

    const pad = new LaunchPad(w * 0.5, h * 0.72);
    this.sceneLaunchPads[0] = pad;
    actors.push(pad);

    for (let i = 0; i < 3; i++) {
      actors.push(new Star(w * (0.18 + i * 0.32), h * (0.12 + Math.random() * 0.2)));
    }

    for (let i = 0; i < 2; i++) {
      const b = new Butterfly(w * (0.25 + i * 0.5), h * 0.35);
      b._pickNewTarget();
      actors.push(b);
    }

    for (let i = 0; i < 3; i++) {
      const tx = w * (0.15 + i * 0.35);
      const ty = h * (0.08 + Math.random() * 0.25);
      actors.push(new Target(tx, ty));
    }

    // Companion owl — bottom-left, above the road
    this.companion = new Companion(50, h * 0.70 - 10);
    actors.push(this.companion);
  }

  _spawnSpace() {
    const { w, h } = this;
    const actors = this.sceneActors[1];

    // Floating astronauts and space objects
    for (let i = 0; i < 4; i++) {
      const a = new Astronaut(w * (0.15 + i * 0.25), h * (0.15 + Math.random() * 0.5));
      a._pickNewTarget();
      actors.push(a);
    }

    // Balls floating in zero-g
    const b1 = new Ball(w * 0.3, h * 0.5);
    b1.gravity = 30; // very low gravity in space
    b1.bounciness = 0.9;
    actors.push(b1);

    const b2 = new Ball(w * 0.7, h * 0.4);
    b2.gravity = 30;
    b2.bounciness = 0.9;
    actors.push(b2);

    // Stars
    for (let i = 0; i < 3; i++) {
      actors.push(new Star(w * (0.15 + i * 0.35), h * (0.1 + Math.random() * 0.3)));
    }

    // Launch pad
    const pad = new LaunchPad(w * 0.5, h * 0.85);
    this.sceneLaunchPads[1] = pad;
    actors.push(pad);

    // Targets
    for (let i = 0; i < 3; i++) {
      const tx = w * (0.15 + i * 0.35);
      const ty = h * (0.08 + Math.random() * 0.3);
      actors.push(new Target(tx, ty));
    }
  }

  _spawnUnderwater() {
    const { w, h } = this;
    const actors = this.sceneActors[2];

    // Fish swimming around
    for (let i = 0; i < 5; i++) {
      const f = new Fish(w * (0.1 + i * 0.2), h * (0.15 + Math.random() * 0.6));
      f._pickNewTarget();
      actors.push(f);
    }

    // A big whale/shark
    const whale = new Fish(w * 0.5, h * 0.7);
    whale.emoji = '🦈';
    whale.size = 80;
    whale._pickNewTarget();
    actors.push(whale);

    // Balls (floating underwater)
    const b1 = new Ball(w * 0.35, h * 0.3);
    b1.gravity = 50; // slower sinking
    b1.bounciness = 0.75;
    actors.push(b1);

    // Stars (as collectibles)
    for (let i = 0; i < 2; i++) {
      actors.push(new Star(w * (0.25 + i * 0.5), h * (0.1 + Math.random() * 0.25)));
    }

    // Launch pad at bottom
    const pad = new LaunchPad(w * 0.5, h * 0.88);
    this.sceneLaunchPads[2] = pad;
    actors.push(pad);

    // Targets
    for (let i = 0; i < 3; i++) {
      const tx = w * (0.15 + i * 0.35);
      const ty = h * (0.08 + Math.random() * 0.3);
      actors.push(new Target(tx, ty));
    }
  }

  _launchRocket(tapX, tapY) {
    const pad = this.launchPad;
    if (!pad || !pad.ready) return;

    const startX = pad.x;
    const startY = pad.y - 25;
    const angle = Math.atan2(tapY - startY, tapX - startX);

    if (angle >= 0) return;

    const speed = 650;
    const rocket = new Rocket(startX, startY, angle, speed);
    this.actors.push(rocket);
    pad.launch();

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
    this.audio.music.update(dt, this.bg.time);
    this.sceneManager.update(dt);

    // ── Feed time-of-day to companion ────────────────────
    if (this.companion) {
      this.companion.timeOfDay = this.bg.time;
    }

    // ── Pointer tracking for aim line ──────────────────
    const pointers = this.input.getActivePointers();
    if (pointers.length > 0 && this.launchPad) {
      this.launchPad.setAim(pointers[0].x, pointers[0].y);
    } else if (this.launchPad) {
      this.launchPad.clearAim();
    }

    // ── Swipe detection for scene changes ──────────────
    // Feed pointer events to scene manager
    const swipeEvents = this.input.consumeSwipeEvents();
    for (const evt of swipeEvents) {
      if (evt.type === 'down') {
        this.sceneManager.onPointerDown(evt.x, evt.y);
      } else if (evt.type === 'move') {
        this.sceneManager.onPointerMove(evt.x, evt.y);
      } else if (evt.type === 'up') {
        this.sceneManager.onPointerUp(evt.x, evt.y);
      }
    }

    // ── Taps ─────────────────────────────────────────────
    const taps = this.input.consumeTaps();
    if (taps.length > 0) this.audio.unlock();

    // Notify companion of activity on any tap
    if (taps.length > 0 && this.companion) {
      this.companion.notifyActivity();
    }

    for (const tap of taps) {
      // Don't process taps during transition
      if (this.sceneManager.transitioning) continue;

      // Album icon tap — toggle open/close
      if (this.album.hitTestIcon(tap.x, tap.y)) {
        this.album.toggle();
        continue;
      }

      // If album is open, tap outside panel closes it; swallow the tap
      if (this.album.open) {
        if (this.album.hitTestOutsidePanel(tap.x, tap.y, this.w, this.h)) {
          this.album.open = false;
        }
        continue;
      }

      // ── Music scene: check xylophone bar taps first ──
      if (this.sceneManager.currentScene.id === 'music') {
        const barIdx = this.musicScene.hitTest(tap.x, tap.y, this.w, this.h);
        if (barIdx >= 0) {
          this.musicScene.play(barIdx, this.audio, this.particles);
          continue;
        }
      }

      let hit = false;
      for (let i = this.actors.length - 1; i >= 0; i--) {
        const actor = this.actors[i];
        if (actor instanceof LaunchPad || actor instanceof Rocket) continue;
        if (actor.hitTest(tap.x, tap.y)) {
          actor.onTap(tap.x, tap.y, this.particles, this.audio);
          hit = true;
          break;
        }
      }

      if (!hit) {
        this._launchRocket(tap.x, tap.y);
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

      // Notify companion of keyboard activity
      if (this.companion) this.companion.notifyActivity();
    }

    this.keyLabels = this.keyLabels.filter(l => l.alive);
    for (const l of this.keyLabels) l.update(dt);

    // ── Music scene animations ──────────────────────────
    this.musicScene.update(dt);

    // ── Device tilt → actor forces ───────────────────────
    const tilt = this.input.getTilt();

    // ── Update actors for ALL scenes (so they stay alive) ──
    for (let s = 0; s < this.sceneActors.length; s++) {
      for (const actor of this.sceneActors[s]) {
        actor.update(dt, this.w, this.h, this.particles);

        // Apply tilt forces to specific actor types
        if (tilt.x !== 0 || tilt.y !== 0) {
          if (actor instanceof Ball) {
            actor.vx += tilt.x * 200 * dt;
            actor.vy += tilt.y * 200 * dt;
          } else if (actor instanceof Butterfly || actor instanceof Fish) {
            actor.targetX += tilt.x * 30 * dt;
            actor.targetY += tilt.y * 30 * dt;
          } else if (actor instanceof Star) {
            actor.tiltOffsetX = tilt.x * 20;
            actor.tiltOffsetY = tilt.y * 20;
          }
        }
      }
    }

    // ── Rocket ↔ Target collisions (current scene only) ──
    const rockets = this.actors.filter(a => a instanceof Rocket && a.launched);
    const targets = this.actors.filter(a => a instanceof Target && !a.hit);
    for (const rocket of rockets) {
      for (const target of targets) {
        const dist = Math.hypot(rocket.x - target.x, rocket.y - target.y);
        if (dist < (rocket.size + target.size) * 0.45) {
          target.explode(this.particles, this.audio);
          rocket.alive = false; // rocket consumed on hit
          this.album.collect(target.emoji);
          const goalDone = this.goals.recordHit();
          if (goalDone) {
            this.goals.triggerCelebration(this.particles, this.audio, this.w, this.h);
            if (this.companion) this.companion.goalComplete();
          } else {
            if (this.companion) this.companion.goalHit();
          }
        }
      }
    }

    // ── Car ↔ Car collisions (road scene only) ──────────
    const roadActors = this.sceneActors[0];
    const cars = roadActors.filter(a => a instanceof Car && !a.crashed);
    for (let i = 0; i < cars.length; i++) {
      for (let j = i + 1; j < cars.length; j++) {
        const a = cars[i], b = cars[j];
        if (!a.swerving && !b.swerving) continue;
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < (a.size + b.size) * 0.45) {
          a.triggerCrash(b, this.particles, this.audio);
        }
      }
    }

    // ── Clean up dead actors in all scenes ──────────────
    for (let s = 0; s < this.sceneActors.length; s++) {
      this.sceneActors[s] = this.sceneActors[s].filter(a => a.alive);
    }

    this.particles.update(dt);

    // ── Target spawning (current scene) ─────────────────
    this.targetTimer -= dt;
    if (this.targetTimer <= 0) {
      this._spawnTarget();
      this.targetTimer = 3 + Math.random() * 4;
    }

    // ── Goal tracking ─────────────────────────────────
    this.goals.update(dt);

    // ── Collection album ──────────────────────────────
    this.album.update(dt);

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

    for (let s = 0; s < this.sceneActors.length; s++) {
      for (const actor of this.sceneActors[s]) {
        if (actor instanceof Companion) {
          // Fixed position: bottom-left, above road
          actor.baseX = 50;
          actor.baseY = newH * 0.70 - 10;
          actor.x = actor.baseX;
          actor.y = actor.baseY;
        } else if (actor instanceof LaunchPad) {
          actor.x = newW * 0.5;
          actor.y = newH * (s === 0 ? 0.72 : s === 1 ? 0.85 : 0.88);
        } else if (actor instanceof Car) {
          actor.x *= sx;
          actor.y = newH * (actor.laneY || 0.82);
        } else if (actor instanceof Ball) {
          actor.x *= sx;
          actor.y *= sy;
        } else if (actor instanceof Star) {
          actor.baseX *= sx;
          actor.baseY *= sy;
          actor.x = actor.baseX;
          actor.y = actor.baseY;
        } else if (actor instanceof Target) {
          actor.x *= sx;
          actor.baseY *= sy;
          actor.y = actor.baseY;
        } else if (actor instanceof Butterfly || actor instanceof Fish || actor instanceof Astronaut) {
          actor.x *= sx;
          actor.y *= sy;
          if (actor.targetX !== undefined) {
            actor.targetX *= sx;
            actor.targetY *= sy;
          }
        } else if (actor instanceof Rocket) {
          actor.x *= sx;
          actor.y *= sy;
        }
      }
    }

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

    // Adjust gravity for current scene
    const sceneId = this.sceneManager.currentScene.id;
    if (sceneId === 'space') {
      b.gravity = 30;
      b.bounciness = 0.9;
    } else if (sceneId === 'underwater') {
      b.gravity = 50;
    }

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
    const sm = this.sceneManager;
    const currentIdx = sm.currentIndex;
    const sceneId = SCENE_CONFIGS[currentIdx].id;

    if (sm.transitioning && sm.slideOffset !== 0) {
      // During transition: draw current scene sliding in, previous scene sliding out
      const offset = sm.slideOffset;
      const dir = Math.sign(offset);
      const prevIdx = currentIdx - dir; // the scene we came from

      // Current scene position (sliding from offset towards 0)
      const currentX = offset * w;
      // Previous scene slides out in the opposite direction
      const prevX = (offset - dir) * w;

      // Draw previous scene
      if (prevIdx >= 0 && prevIdx < SCENE_CONFIGS.length) {
        ctx.save();
        ctx.translate(prevX, 0);
        ctx.beginPath();
        ctx.rect(0, 0, w, h);
        ctx.clip();
        this.bg.draw(ctx, w, h, SCENE_CONFIGS[prevIdx].id);
        for (const actor of this.sceneActors[prevIdx]) actor.draw(ctx);
        if (SCENE_CONFIGS[prevIdx].id === 'music') this.musicScene.draw(ctx, w, h);
        ctx.restore();
      }

      // Draw current scene
      ctx.save();
      ctx.translate(currentX, 0);
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.clip();
      this.bg.draw(ctx, w, h, sceneId);
      for (const actor of this.sceneActors[currentIdx]) actor.draw(ctx);
      if (sceneId === 'music') this.musicScene.draw(ctx, w, h);
      ctx.restore();
    } else {
      // Normal: draw current scene
      this.bg.draw(ctx, w, h, sceneId);
      for (const actor of this.actors) actor.draw(ctx);
      if (sceneId === 'music') this.musicScene.draw(ctx, w, h);
    }

    // Particles, drawing, labels always on top
    this.particles.draw(ctx);
    this.drawing.draw(ctx);
    for (const l of this.keyLabels) l.draw(ctx);

    // Goal progress stars
    this.goals.draw(ctx, w);

    // ── Collection album icon + panel ────────────────
    this.album.draw(ctx, w, h);

    // Scene dot indicators
    sm.drawIndicators(ctx, w, h);
  }
}
