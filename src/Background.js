// Day/night cycle: 0=dawn → 0.25=noon → 0.5=dusk → 0.75=midnight → 1=dawn
const SKY_STOPS = [
  { r: 255, g: 160, b: 100 }, // 0.00 dawn
  { r: 135, g: 206, b: 235 }, // 0.25 day
  { r: 220, g: 110, b: 70  }, // 0.50 dusk
  { r: 10,  g: 10,  b: 40  }, // 0.75 night
  { r: 255, g: 160, b: 100 }, // 1.00 dawn (loop)
];

const GROUND_STOPS = [
  { r: 90,  g: 160, b: 55  }, // dawn
  { r: 75,  g: 185, b: 55  }, // day
  { r: 70,  g: 120, b: 45  }, // dusk
  { r: 15,  g: 35,  b: 15  }, // night
  { r: 90,  g: 160, b: 55  }, // dawn
];

function lerp(a, b, t) {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

function sampleStops(stops, t) {
  const n = stops.length - 1;
  const pos = t * n;
  const i = Math.min(Math.floor(pos), n - 1);
  return lerp(stops[i], stops[i + 1], pos - i);
}

function rgb(c) { return `rgb(${c.r|0},${c.g|0},${c.b|0})`; }

export class Background {
  constructor() {
    this.time = 0;           // 0–1 full cycle
    this.cycleDuration = 120; // seconds

    this.clouds = Array.from({ length: 6 }, () => ({
      x: Math.random() * 1.2 - 0.1,
      y: 0.05 + Math.random() * 0.22,
      size: 0.05 + Math.random() * 0.06,
      speed: 0.0015 + Math.random() * 0.002,
      opacity: 0.6 + Math.random() * 0.35,
    }));

    this.stars = Array.from({ length: 90 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.58,
      r: 1 + Math.random() * 2.5,
      phase: Math.random() * Math.PI * 2,
      speed: 1.5 + Math.random() * 3,
    }));

    // Space scene: many dense stars
    this.spaceStars = Array.from({ length: 200 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.5 + Math.random() * 3,
      phase: Math.random() * Math.PI * 2,
      speed: 1 + Math.random() * 4,
    }));

    // Space scene: planets
    this.planets = [
      { x: 0.15, y: 0.25, emoji: '🪐', size: 70 },
      { x: 0.82, y: 0.18, emoji: '🌍', size: 55 },
      { x: 0.55, y: 0.08, emoji: '🌙', size: 45 },
    ];

    // Underwater scene: bubbles
    this.bubbles = Array.from({ length: 30 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 3 + Math.random() * 10,
      speed: 0.02 + Math.random() * 0.04,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 1.5 + Math.random() * 2,
    }));

    // Underwater scene: seaweed positions
    this.seaweeds = Array.from({ length: 8 }, () => ({
      x: 0.05 + Math.random() * 0.9,
      height: 0.08 + Math.random() * 0.12,
      phase: Math.random() * Math.PI * 2,
      speed: 1 + Math.random() * 1.5,
    }));
  }

  update(dt) {
    this.time = (this.time + dt / this.cycleDuration) % 1;
    for (const c of this.clouds) {
      c.x += c.speed * dt;
      if (c.x > 1.15) c.x = -0.15;
    }
    for (const s of this.stars) {
      s.phase += s.speed * dt;
    }
    for (const s of this.spaceStars) {
      s.phase += s.speed * dt;
    }
    for (const b of this.bubbles) {
      b.y -= b.speed * dt;
      b.wobblePhase += b.wobbleSpeed * dt;
      if (b.y < -0.05) {
        b.y = 1.05;
        b.x = Math.random();
      }
    }
    for (const sw of this.seaweeds) {
      sw.phase += sw.speed * dt;
    }
  }

  // How bright the stars are (0 = hidden, 1 = full)
  _starAlpha() {
    const t = this.time;
    if (t < 0.10) return 1 - t / 0.10;   // dawn: fade out
    if (t < 0.40) return 0;               // day: invisible
    if (t < 0.55) return (t - 0.40) / 0.15; // dusk: fade in
    return 1;                              // night: full
  }

  _drawCelestialBody(ctx, w, horizonY) {
    const t = this.time;
    let bx, by, isMoon;

    if (t >= 0.08 && t <= 0.52) {
      const p = (t - 0.08) / 0.44;
      bx = w * p;
      by = horizonY * (0.28 - Math.sin(p * Math.PI) * 0.22);
      isMoon = false;
    } else if (t >= 0.55 && t <= 0.95) {
      const p = (t - 0.55) / 0.40;
      bx = w * p;
      by = horizonY * (0.28 - Math.sin(p * Math.PI) * 0.22);
      isMoon = true;
    } else {
      return;
    }

    if (!isMoon) {
      ctx.save();
      ctx.shadowColor = '#FFE44D';
      ctx.shadowBlur = 40;
      ctx.fillStyle = '#FFE44D';
      ctx.beginPath();
      ctx.arc(bx, by, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      const skyC = sampleStops(SKY_STOPS, t);
      ctx.save();
      ctx.shadowColor = '#D8D8C0';
      ctx.shadowBlur = 25;
      ctx.fillStyle = '#EEEEDD';
      ctx.beginPath();
      ctx.arc(bx, by, 28, 0, Math.PI * 2);
      ctx.fill();
      // Crescent cutout
      ctx.fillStyle = rgb(skyC);
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(bx + 11, by - 4, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _drawCloud(ctx, cx, cy, size) {
    const s = size;
    ctx.beginPath();
    ctx.arc(cx,          cy,          s * 0.50, 0, Math.PI * 2);
    ctx.arc(cx + s * 0.45, cy - s * 0.12, s * 0.38, 0, Math.PI * 2);
    ctx.arc(cx + s * 0.85, cy,          s * 0.42, 0, Math.PI * 2);
    ctx.arc(cx + s * 0.28, cy + s * 0.18, s * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawRoad(ctx, w, h, horizonY) {
    const roadY = horizonY + 5;
    const roadH = h - roadY;
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(0, roadY, w, roadH);

    // Dashed centre line
    ctx.strokeStyle = '#eeee99';
    ctx.lineWidth = Math.max(3, w * 0.004);
    ctx.setLineDash([w * 0.06, w * 0.06]);
    ctx.beginPath();
    ctx.moveTo(0, roadY + roadH * 0.45);
    ctx.lineTo(w, roadY + roadH * 0.45);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /** Draw the road scene (original). */
  drawRoad(ctx, w, h) {
    const horizonY = h * 0.70;
    const skyC = sampleStops(SKY_STOPS, this.time);
    const gndC = sampleStops(GROUND_STOPS, this.time);
    const starA = this._starAlpha();

    // Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGrad.addColorStop(0, rgb(skyC));
    skyGrad.addColorStop(1, rgb(lerp(skyC, { r: 255, g: 255, b: 255 }, 0.15)));
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, horizonY);

    // Stars
    if (starA > 0) {
      ctx.fillStyle = '#ffffff';
      for (const s of this.stars) {
        ctx.globalAlpha = starA * (0.4 + 0.6 * Math.abs(Math.sin(s.phase)));
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * horizonY, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Sun / Moon
    this._drawCelestialBody(ctx, w, horizonY);

    // Clouds (fade out at night)
    const cloudA = Math.max(0, 1 - starA * 0.85);
    if (cloudA > 0.02) {
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      for (const c of this.clouds) {
        ctx.globalAlpha = c.opacity * cloudA;
        this._drawCloud(ctx, c.x * w, c.y * horizonY, c.size * w);
      }
      ctx.globalAlpha = 1;
    }

    // Grass
    const gndGrad = ctx.createLinearGradient(0, horizonY, 0, h);
    gndGrad.addColorStop(0, rgb(gndC));
    gndGrad.addColorStop(1, rgb(lerp(gndC, { r: 0, g: 0, b: 0 }, 0.25)));
    ctx.fillStyle = gndGrad;
    ctx.fillRect(0, horizonY, w, h - horizonY);

    // Road
    this._drawRoad(ctx, w, h, horizonY);
  }

  /** Draw the space scene. */
  drawSpace(ctx, w, h) {
    // Deep space background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0a0020');
    grad.addColorStop(0.5, '#0d0040');
    grad.addColorStop(1, '#150060');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Dense starfield
    ctx.fillStyle = '#ffffff';
    for (const s of this.spaceStars) {
      ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(s.phase));
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Nebula glow patches
    ctx.save();
    ctx.globalAlpha = 0.08;
    const glow1 = ctx.createRadialGradient(w * 0.3, h * 0.4, 0, w * 0.3, h * 0.4, w * 0.3);
    glow1.addColorStop(0, '#8B00FF');
    glow1.addColorStop(1, 'transparent');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, w, h);

    const glow2 = ctx.createRadialGradient(w * 0.7, h * 0.6, 0, w * 0.7, h * 0.6, w * 0.25);
    glow2.addColorStop(0, '#00BFFF');
    glow2.addColorStop(1, 'transparent');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // Planets (background decoration)
    for (const p of this.planets) {
      ctx.font = `${p.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, p.x * w, p.y * h);
    }
  }

  /** Draw the underwater scene. */
  drawUnderwater(ctx, w, h) {
    // Blue-green water gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#006994');
    grad.addColorStop(0.3, '#005577');
    grad.addColorStop(0.7, '#003B4D');
    grad.addColorStop(1, '#002233');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Light rays from surface
    ctx.save();
    ctx.globalAlpha = 0.06;
    for (let i = 0; i < 5; i++) {
      const x = w * (0.1 + i * 0.2);
      ctx.beginPath();
      ctx.moveTo(x - 20, 0);
      ctx.lineTo(x + 30, 0);
      ctx.lineTo(x + 80 + i * 15, h);
      ctx.lineTo(x - 60 + i * 10, h);
      ctx.closePath();
      ctx.fillStyle = '#4FC3F7';
      ctx.fill();
    }
    ctx.restore();

    // Seaweed at bottom
    ctx.save();
    for (const sw of this.seaweeds) {
      const baseX = sw.x * w;
      const baseY = h;
      const topY = h - sw.height * h;
      const sway = Math.sin(sw.phase) * 15;

      ctx.strokeStyle = '#2E7D32';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(baseX + sway, (baseY + topY) / 2, baseX + sway * 1.5, topY);
      ctx.stroke();

      ctx.strokeStyle = '#388E3C';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(baseX + 8, baseY);
      ctx.quadraticCurveTo(baseX + 8 - sway * 0.8, (baseY + topY + 20) / 2, baseX + 8 - sway, topY + 20);
      ctx.stroke();
    }
    ctx.restore();

    // Sandy bottom
    const sandGrad = ctx.createLinearGradient(0, h - 40, 0, h);
    sandGrad.addColorStop(0, 'rgba(194, 178, 128, 0)');
    sandGrad.addColorStop(0.5, 'rgba(194, 178, 128, 0.3)');
    sandGrad.addColorStop(1, 'rgba(194, 178, 128, 0.5)');
    ctx.fillStyle = sandGrad;
    ctx.fillRect(0, h - 40, w, 40);

    // Bubbles
    ctx.save();
    for (const b of this.bubbles) {
      const bx = b.x * w + Math.sin(b.wobblePhase) * 8;
      const by = b.y * h;
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#B3E5FC';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(bx, by, b.r, 0, Math.PI * 2);
      ctx.stroke();

      // Shine highlight
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(bx - b.r * 0.3, by - b.r * 0.3, b.r * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /** Draw the music scene — dark stage with subtle spotlight. */
  drawMusic(ctx, w, h) {
    // Dark stage gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1a0a2e');
    grad.addColorStop(0.4, '#16213e');
    grad.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Soft spotlight from above
    ctx.save();
    ctx.globalAlpha = 0.07;
    const spot = ctx.createRadialGradient(w * 0.5, 0, 0, w * 0.5, h * 0.3, w * 0.5);
    spot.addColorStop(0, '#ffffff');
    spot.addColorStop(1, 'transparent');
    ctx.fillStyle = spot;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // Faint twinkling stars for ambiance
    ctx.fillStyle = '#ffffff';
    for (const s of this.spaceStars) {
      if (s.y > 0.45) continue; // only upper portion
      ctx.globalAlpha = 0.15 + 0.2 * Math.abs(Math.sin(s.phase));
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** Main draw dispatcher based on scene ID. */
  draw(ctx, w, h, sceneId) {
    if (sceneId === 'space') {
      this.drawSpace(ctx, w, h);
    } else if (sceneId === 'underwater') {
      this.drawUnderwater(ctx, w, h);
    } else if (sceneId === 'music') {
      this.drawMusic(ctx, w, h);
    } else {
      this.drawRoad(ctx, w, h);
    }
  }
}
