export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this._taps = [];
    this._keys = [];
    this.activeTouches = new Map();
    this.mouseDown = false;
    this.mousePos = null;

    // Swipe event queue for SceneManager
    this._swipeEvents = [];
    this._mouseDownPos = null;

    this._exitHoldStart = null;
    this._exitTimer = null;
    this._exitOverlay = document.getElementById('exit-overlay');
    this._exitCountdown = document.getElementById('exit-countdown');

    this._bindEvents();
  }

  _bindEvents() {
    const c = this.canvas;

    // Mouse
    c.addEventListener('mousedown', e => {
      e.preventDefault();
      const pos = this._mousePos(e);
      this.mouseDown = true;
      this.mousePos = pos;
      this._mouseDownPos = { ...pos };
      this._swipeEvents.push({ type: 'down', ...pos });
      this._onDown(pos);
    });
    c.addEventListener('mousemove', e => {
      e.preventDefault();
      this.mousePos = this._mousePos(e);
      if (this.mouseDown) {
        this._swipeEvents.push({ type: 'move', ...this.mousePos });
      }
    });
    c.addEventListener('mouseup', e => {
      e.preventDefault();
      const pos = this._mousePos(e);
      this.mouseDown = false;
      this._swipeEvents.push({ type: 'up', ...pos });
      this._onUp(pos);
    });

    // Touch — only track the first touch for swipe detection
    c.addEventListener('touchstart', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const pos = this._touchPos(t);
        this.activeTouches.set(t.identifier, { ...pos, startTime: Date.now() });
        // Use first touch for swipe detection
        if (e.touches.length === 1) {
          this._swipeEvents.push({ type: 'down', ...pos });
        }
        this._onDown(pos);
      }
    }, { passive: false });

    c.addEventListener('touchmove', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (this.activeTouches.has(t.identifier)) {
          const existing = this.activeTouches.get(t.identifier);
          const pos = this._touchPos(t);
          this.activeTouches.set(t.identifier, { ...pos, startTime: existing.startTime });
          // Track first touch for swipe
          if (t.identifier === e.touches[0]?.identifier) {
            this._swipeEvents.push({ type: 'move', ...pos });
          }
        }
      }
    }, { passive: false });

    c.addEventListener('touchend', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const pos = this._touchPos(t);
        this._swipeEvents.push({ type: 'up', ...pos });
        this.activeTouches.delete(t.identifier);
        this._onUp(pos);
      }
    }, { passive: false });

    c.addEventListener('touchcancel', e => {
      e.preventDefault();
      for (const t of e.changedTouches) this.activeTouches.delete(t.identifier);
      this._cancelExit();
    }, { passive: false });

    // Keyboard — capture key, then swallow
    window.addEventListener('keydown', e => {
      e.preventDefault();
      e.stopPropagation();
      this._keys.push(e.key);
    }, true);
    window.addEventListener('keyup', e => {
      e.preventDefault();
      e.stopPropagation();
    }, true);

    // Misc browser defaults
    window.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('selectstart', e => e.preventDefault());
  }

  _mousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = this.canvas.width / rect.width;
    const sy = this.canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }

  _touchPos(t) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = this.canvas.width / rect.width;
    const sy = this.canvas.height / rect.height;
    return { x: (t.clientX - rect.left) * sx, y: (t.clientY - rect.top) * sy };
  }

  _inExitCorner(pos) {
    return pos.x > this.canvas.width - 100 && pos.y < 100;
  }

  _onDown(pos) {
    if (this._inExitCorner(pos)) {
      this._exitHoldStart = Date.now();
      this._startExitCountdown();
    }
  }

  _onUp(pos) {
    this._taps.push(pos);
    if (this._exitHoldStart !== null) {
      this._exitHoldStart = null;
      this._cancelExit();
    }
  }

  _startExitCountdown() {
    if (this._exitTimer) clearInterval(this._exitTimer);
    let count = 3;
    this._exitOverlay.classList.add('visible');
    this._exitCountdown.textContent = count;

    this._exitTimer = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(this._exitTimer);
        this._exitTimer = null;
        this._exitOverlay.classList.remove('visible');
        if (document.fullscreenElement) document.exitFullscreen();
      } else {
        this._exitCountdown.textContent = count;
      }
    }, 1000);
  }

  _cancelExit() {
    if (this._exitTimer) {
      clearInterval(this._exitTimer);
      this._exitTimer = null;
    }
    this._exitOverlay.classList.remove('visible');
  }

  consumeSwipeEvents() {
    const events = this._swipeEvents;
    this._swipeEvents = [];
    return events;
  }

  consumeTaps() {
    const taps = this._taps;
    this._taps = [];
    return taps;
  }

  consumeKeys() {
    const keys = this._keys;
    this._keys = [];
    return keys;
  }

  // Returns [{id, x, y}] for all currently held pointers
  getActivePointers() {
    const result = [];
    if (this.mouseDown && this.mousePos) {
      result.push({ id: 'mouse', x: this.mousePos.x, y: this.mousePos.y });
    }
    for (const [id, pos] of this.activeTouches) {
      result.push({ id, x: pos.x, y: pos.y });
    }
    return result;
  }
}
