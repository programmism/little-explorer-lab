import { Actor } from './Actor.js';

/**
 * Owl companion (🦉) that lives in the bottom-left corner and reacts
 * to the child's actions: celebrates hits, sleeps at night, waves on
 * inactivity, and responds to taps with a happy bounce.
 */

const STATE_IDLE      = 'idle';
const STATE_CELEBRATE = 'celebrating';
const STATE_SLEEPING  = 'sleeping';
const STATE_WAVING    = 'waving';

export class Companion extends Actor {
  constructor(x, y) {
    super(x, y);
    this.size = 60;

    // State machine
    this.state = STATE_IDLE;
    this.stateTime = 0;

    // Idle animation
    this.bobPhase = 0;
    this.blinkTimer = 2 + Math.random() * 3;
    this.blinkOpen = true;

    // Celebrate animation
    this.celebrateTimer = 0;
    this.celebrateDuration = 1.5;

    // Waving animation
    this.wavePhase = 0;

    // Inactivity tracking
    this.inactivityTimer = 0;
    this.inactivityThreshold = 10;

    // Tap bounce
    this.bounceVy = 0;
    this.bounceY = 0;

    // Heart particles on tap
    this.hearts = [];

    // Time of day (set externally)
    this.timeOfDay = 0;

    // Sleep z-animation
    this.sleepPhase = 0;

    // Base position (for resize)
    this.baseX = x;
    this.baseY = y;
  }

  /** Called when a rocket hits a target */
  goalHit() {
    this._enterState(STATE_CELEBRATE);
  }

  /** Called when a full goal is completed */
  goalComplete() {
    this._enterState(STATE_CELEBRATE);
    this.celebrateDuration = 2.5; // longer celebration
  }

  /** Called when companion is tapped */
  tap(particles, audio) {
    this.bounceVy = -280;
    this.inactivityTimer = 0;

    // Heart particles
    particles.burst(this.x, this.y - this.size * 0.4, 6, {
      colors: ['#FF6B8A', '#FF4D6D', '#FF85A1', '#FFB3C6'],
      minSpeed: 30,
      maxSpeed: 100,
      gravity: 80,
      minSize: 6,
      maxSize: 12,
    });

    // Spawn floating hearts
    for (let i = 0; i < 3; i++) {
      this.hearts.push({
        x: (Math.random() - 0.5) * 30,
        y: -this.size * 0.3 - Math.random() * 10,
        vy: -40 - Math.random() * 30,
        life: 1.0,
      });
    }

    if (audio) audio.sparkle();

    // If sleeping, wake up briefly
    if (this.state === STATE_SLEEPING) {
      this._enterState(STATE_IDLE);
    }
  }

  /** Notify of any user activity (tap, key, pointer) */
  notifyActivity() {
    this.inactivityTimer = 0;
    if (this.state === STATE_WAVING) {
      this._enterState(STATE_IDLE);
    }
  }

  _enterState(state) {
    this.state = state;
    this.stateTime = 0;
    if (state === STATE_CELEBRATE) {
      this.celebrateTimer = 0;
      this.celebrateDuration = 1.5;
    }
  }

  update(dt, w, h, particles) {
    super.update(dt, w, h, particles);

    this.stateTime += dt;
    this.inactivityTimer += dt;

    // Position: bottom-left, above the road
    this.baseX = 50;
    this.baseY = h * 0.70 - 10;
    this.x = this.baseX;

    // Apply bounce physics
    this.bounceVy += 600 * dt; // gravity
    this.bounceY += this.bounceVy * dt;
    if (this.bounceY > 0) {
      this.bounceY = 0;
      this.bounceVy = 0;
    }
    this.y = this.baseY + this.bounceY;

    // Blink timer (idle & waving)
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkOpen = !this.blinkOpen;
      this.blinkTimer = this.blinkOpen ? (2 + Math.random() * 4) : 0.15;
    }

    // Update floating hearts
    this.hearts = this.hearts.filter(h => h.life > 0);
    for (const heart of this.hearts) {
      heart.vy -= 20 * dt;
      heart.y += heart.vy * dt;
      heart.life -= dt * 0.8;
    }

    // Determine if night
    const isNight = this.timeOfDay > 0.6 && this.timeOfDay < 0.95;

    // State transitions
    switch (this.state) {
      case STATE_IDLE:
        this.bobPhase += dt * 2.5;
        if (isNight) {
          this._enterState(STATE_SLEEPING);
        } else if (this.inactivityTimer >= this.inactivityThreshold) {
          this._enterState(STATE_WAVING);
        }
        break;

      case STATE_CELEBRATE:
        this.celebrateTimer += dt;
        // Bounce during celebration
        if (this.celebrateTimer < this.celebrateDuration) {
          const freq = 8;
          const amp = 12 * (1 - this.celebrateTimer / this.celebrateDuration);
          this.bounceY = -Math.abs(Math.sin(this.celebrateTimer * freq)) * amp;
        }
        if (this.celebrateTimer >= this.celebrateDuration) {
          this._enterState(isNight ? STATE_SLEEPING : STATE_IDLE);
        }
        break;

      case STATE_SLEEPING:
        this.sleepPhase += dt * 1.5;
        if (!isNight) {
          this._enterState(STATE_IDLE);
        }
        break;

      case STATE_WAVING:
        this.wavePhase += dt * 5;
        this.bobPhase += dt * 2.5;
        if (isNight) {
          this._enterState(STATE_SLEEPING);
        }
        break;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Idle bob
    let bobY = 0;
    if (this.state === STATE_IDLE || this.state === STATE_WAVING) {
      bobY = Math.sin(this.bobPhase) * 3;
    }

    // Wave oscillation
    let waveX = 0;
    if (this.state === STATE_WAVING) {
      waveX = Math.sin(this.wavePhase) * 6;
    }

    // Sleep tilt
    let tilt = 0;
    if (this.state === STATE_SLEEPING) {
      tilt = Math.sin(this.sleepPhase * 0.5) * 0.1 + 0.15;
    }

    ctx.translate(waveX, bobY);
    ctx.rotate(tilt);

    // Draw owl emoji
    ctx.font = `${this.size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u{1F989}', 0, 0);

    // Celebration hearts above head
    if (this.state === STATE_CELEBRATE) {
      const heartBob = Math.sin(this.celebrateTimer * 6) * 4;
      ctx.font = '18px serif';
      ctx.fillText('\u2764\uFE0F', -12 + heartBob, -this.size * 0.55);
      ctx.fillText('\u2764\uFE0F', 12 - heartBob, -this.size * 0.65);
    }

    // Sleeping zzz
    if (this.state === STATE_SLEEPING) {
      const zPhase = this.sleepPhase;
      ctx.font = `${12 + Math.sin(zPhase) * 3}px sans-serif`;
      ctx.globalAlpha = 0.6 + Math.sin(zPhase * 0.7) * 0.3;
      ctx.fillStyle = '#AACCFF';
      ctx.fillText('\u{1F4A4}', 15 + Math.sin(zPhase) * 5, -this.size * 0.5 - Math.sin(zPhase * 0.5) * 8);
      ctx.globalAlpha = 1;
    }

    // Waving indicator
    if (this.state === STATE_WAVING) {
      const waveBob = Math.sin(this.wavePhase) * 3;
      ctx.font = '16px serif';
      ctx.fillText('\u{1F44B}', 20 + waveBob, -this.size * 0.45);
    }

    ctx.restore();

    // Draw floating hearts (tap reaction)
    if (this.hearts.length > 0) {
      ctx.save();
      for (const heart of this.hearts) {
        ctx.globalAlpha = Math.max(0, heart.life);
        ctx.font = '14px serif';
        ctx.textAlign = 'center';
        ctx.fillText('\u2764\uFE0F', this.x + heart.x, this.y + heart.y);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  hitTest(x, y) {
    return Math.hypot(x - this.x, y - this.y) < this.size * 0.6;
  }

  onTap(x, y, particles, audio) {
    if (this.tapCooldown > 0) return;
    this.tapCooldown = 0.3;
    this.tap(particles, audio);
  }
}
