/**
 * SceneManager handles multiple themed scenes with swipe navigation.
 * It detects horizontal swipes (distinguished from drawing) and animates
 * smooth transitions between scenes.
 */

export const SCENE_ROAD = 0;
export const SCENE_SPACE = 1;
export const SCENE_UNDERWATER = 2;
export const SCENE_COLORING = 3;

export const SCENE_CONFIGS = [
  {
    id: 'road',
    name: 'Road',
  },
  {
    id: 'space',
    name: 'Space',
  },
  {
    id: 'underwater',
    name: 'Underwater',
  },
  {
    id: 'coloring',
    name: 'Coloring',
  },
];

export class SceneManager {
  constructor() {
    this.currentIndex = 0;
    this.sceneCount = SCENE_CONFIGS.length;

    // Transition animation
    this.slideOffset = 0;   // -1 to 1 range during transition, 0 = settled
    this.transitioning = false;
    this.transitionSpeed = 4; // how fast the slide animates (higher = faster)

    // Swipe detection state
    this._swipeStartX = null;
    this._swipeStartY = null;
    this._swipeStartTime = null;
    this._swipeTriggered = false;

    // Thresholds
    this._minSwipeDist = 100;    // px horizontal
    this._maxSwipeTime = 500;    // ms
    this._maxVerticalDrift = 80; // px - if vertical movement exceeds this, it's drawing not swiping

    // Dot indicator animation
    this._dotPulse = 0;
  }

  /**
   * Called when a pointer/touch goes down.
   * Returns false so InputManager can still process normally.
   */
  onPointerDown(x, y) {
    if (this.transitioning) return;
    this._swipeStartX = x;
    this._swipeStartY = y;
    this._swipeStartTime = Date.now();
    this._swipeTriggered = false;
  }

  /**
   * Called when a pointer/touch moves.
   * Returns true if this looks like a swipe (caller should suppress drawing).
   */
  onPointerMove(x, y) {
    if (this.transitioning || this._swipeStartX === null) return false;

    const dx = x - this._swipeStartX;
    const dy = y - this._swipeStartY;

    // If vertical drift is too large, it's drawing, not a swipe
    if (Math.abs(dy) > this._maxVerticalDrift) {
      this._swipeStartX = null;
      return false;
    }

    return Math.abs(dx) > 30; // mild horizontal movement hint
  }

  /**
   * Called when a pointer/touch goes up.
   * Returns true if a swipe was detected and consumed.
   */
  onPointerUp(x, y) {
    if (this.transitioning || this._swipeStartX === null) {
      this._swipeStartX = null;
      return false;
    }

    const dx = x - this._swipeStartX;
    const dy = y - this._swipeStartY;
    const elapsed = Date.now() - this._swipeStartTime;

    this._swipeStartX = null;

    // Check swipe criteria: fast enough, horizontal enough
    if (Math.abs(dx) >= this._minSwipeDist &&
        elapsed <= this._maxSwipeTime &&
        Math.abs(dy) < this._maxVerticalDrift) {

      if (dx < 0 && this.currentIndex < this.sceneCount - 1) {
        // Swipe left → go to next scene
        this._startTransition(1);
        return true;
      } else if (dx > 0 && this.currentIndex > 0) {
        // Swipe right → go to previous scene
        this._startTransition(-1);
        return true;
      }
    }

    return false;
  }

  _startTransition(direction) {
    this.transitioning = true;
    // direction: 1 = going forward (slide from right), -1 = going back (slide from left)
    this.slideOffset = direction; // start with next scene off-screen
    this.currentIndex += direction;
  }

  update(dt) {
    this._dotPulse += dt * 3;

    if (!this.transitioning) return;

    // Animate slide offset towards 0
    const speed = this.transitionSpeed * dt;
    if (Math.abs(this.slideOffset) < speed) {
      this.slideOffset = 0;
      this.transitioning = false;
    } else {
      this.slideOffset -= Math.sign(this.slideOffset) * speed;
    }
  }

  /** Draw dot indicators at bottom center. */
  drawIndicators(ctx, w, h) {
    const dotRadius = 7;
    const gap = 24;
    const totalWidth = (this.sceneCount - 1) * gap;
    const startX = (w - totalWidth) / 2;
    const y = h - 30;

    ctx.save();
    for (let i = 0; i < this.sceneCount; i++) {
      const x = startX + i * gap;
      const isCurrent = i === this.currentIndex;

      ctx.beginPath();
      const r = isCurrent ? dotRadius + 1.5 * Math.sin(this._dotPulse) * 0.3 + 1 : dotRadius;
      ctx.arc(x, y, r, 0, Math.PI * 2);

      if (isCurrent) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
        ctx.shadowBlur = 10;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.shadowBlur = 0;
      }
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  get currentScene() {
    return SCENE_CONFIGS[this.currentIndex];
  }
}
