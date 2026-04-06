export class InputManager {
  // Thresholds for distinguishing taps from drags
  static TAP_MAX_DISTANCE = 15;   // px — movement beyond this = drag
  static TAP_MAX_DURATION = 200;  // ms — held longer than this = drag

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

    // Per-pointer tracking for tap vs drag classification
    this._pointerStarts = new Map(); // id → { x, y, time }
    this._drawingPointers = new Set(); // pointers confirmed as drawing

    this._exitHoldStart = null;
    this._exitTimer = null;
    this._exitOverlay = document.getElementById('exit-overlay');
    this._exitCountdown = document.getElementById('exit-countdown');

    // Device tilt (accelerometer) — normalized to roughly -1..1
    this._tilt = { x: 0, y: 0 };
    this._tiltAvailable = false;

    this._bindEvents();
    this._bindTilt();
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
      this._pointerStarts.set('mouse', { x: pos.x, y: pos.y, time: Date.now() });
      this._onDown(pos);
    });
    c.addEventListener('mousemove', e => {
      e.preventDefault();
      const pos = this._mousePos(e);
      this.mousePos = pos;
      if (this.mouseDown) {
        this._swipeEvents.push({ type: 'move', ...pos });
      }
      this._checkDragThreshold('mouse', pos);
    });
    c.addEventListener('mouseup', e => {
      e.preventDefault();
      const pos = this._mousePos(e);
      this.mouseDown = false;
      this._swipeEvents.push({ type: 'up', ...pos });
      this._onUp('mouse', pos);
    });

    // Touch — track all touches; first touch also feeds swipe detection
    c.addEventListener('touchstart', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const pos = this._touchPos(t);
        this.activeTouches.set(t.identifier, { ...pos, startTime: Date.now() });
        // Use first touch for swipe detection
        if (e.touches.length === 1) {
          this._swipeEvents.push({ type: 'down', ...pos });
        }
        this._pointerStarts.set(t.identifier, { x: pos.x, y: pos.y, time: Date.now() });
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
          this._checkDragThreshold(t.identifier, pos);
        }
      }
    }, { passive: false });

    c.addEventListener('touchend', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const pos = this._touchPos(t);
        this._swipeEvents.push({ type: 'up', ...pos });
        this.activeTouches.delete(t.identifier);
        this._onUp(t.identifier, pos);
      }
    }, { passive: false });

    c.addEventListener('touchcancel', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        this.activeTouches.delete(t.identifier);
        this._pointerStarts.delete(t.identifier);
        this._drawingPointers.delete(t.identifier);
      }
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

  _checkDragThreshold(id, pos) {
    const start = this._pointerStarts.get(id);
    if (!start || this._drawingPointers.has(id)) return;
    const dist = Math.hypot(pos.x - start.x, pos.y - start.y);
    if (dist >= InputManager.TAP_MAX_DISTANCE) {
      this._drawingPointers.add(id);
    }
  }

  _onUp(id, pos) {
    const start = this._pointerStarts.get(id);
    const wasDrawing = this._drawingPointers.has(id);

    // Clean up pointer tracking
    this._pointerStarts.delete(id);
    this._drawingPointers.delete(id);

    // Classify: only emit a tap if the pointer stayed close and was brief
    if (start && !wasDrawing) {
      const dist = Math.hypot(pos.x - start.x, pos.y - start.y);
      const duration = Date.now() - start.time;
      if (dist < InputManager.TAP_MAX_DISTANCE && duration < InputManager.TAP_MAX_DURATION) {
        this._taps.push(pos);
      }
    }

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

  _bindTilt() {
    if (typeof DeviceOrientationEvent === 'undefined') return;

    const listen = () => {
      window.addEventListener('deviceorientation', (e) => {
        // gamma: left-right tilt (-90..90), beta: front-back tilt (-180..180)
        if (e.gamma == null || e.beta == null) return;
        this._tiltAvailable = true;
        // Normalize to roughly -1..1 (clamp at ±45 degrees)
        this._tilt = {
          x: Math.max(-1, Math.min(1, e.gamma / 45)),
          y: Math.max(-1, Math.min(1, (e.beta - 45) / 45)),
        };
      });
    };

    // iOS 13+ requires explicit permission request
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      // Attach a one-time user-gesture handler to request permission
      const requestOnce = () => {
        DeviceOrientationEvent.requestPermission()
          .then(state => { if (state === 'granted') listen(); })
          .catch(() => {});
        window.removeEventListener('touchstart', requestOnce);
      };
      window.addEventListener('touchstart', requestOnce);
    } else {
      listen();
    }
  }

  /** Returns current device tilt as {x, y} in roughly -1..1 range. */
  getTilt() {
    return this._tilt;
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

  // Returns true if a pointer has exceeded the drag threshold
  isDrawing(id) {
    return this._drawingPointers.has(id);
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
