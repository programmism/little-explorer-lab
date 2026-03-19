export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this._taps = [];
    this.activeTouches = new Map();
    this.mouseDown = false;
    this.mousePos = null;

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
      this._onDown(pos);
    });
    c.addEventListener('mousemove', e => {
      e.preventDefault();
      this.mousePos = this._mousePos(e);
    });
    c.addEventListener('mouseup', e => {
      e.preventDefault();
      const pos = this._mousePos(e);
      this.mouseDown = false;
      this._onUp(pos);
    });

    // Touch
    c.addEventListener('touchstart', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const pos = this._touchPos(t);
        this.activeTouches.set(t.identifier, { ...pos, startTime: Date.now() });
        this._onDown(pos);
      }
    }, { passive: false });

    c.addEventListener('touchmove', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (this.activeTouches.has(t.identifier)) {
          const existing = this.activeTouches.get(t.identifier);
          this.activeTouches.set(t.identifier, { ...this._touchPos(t), startTime: existing.startTime });
        }
      }
    }, { passive: false });

    c.addEventListener('touchend', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const pos = this._touchPos(t);
        this.activeTouches.delete(t.identifier);
        this._onUp(pos);
      }
    }, { passive: false });

    c.addEventListener('touchcancel', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        this.activeTouches.delete(t.identifier);
      }
      this._cancelExit();
    }, { passive: false });

    // Keyboard — swallow everything
    window.addEventListener('keydown', e => {
      e.preventDefault();
      e.stopPropagation();
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
    // Top-right 100×100 px corner
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

  consumeTaps() {
    const taps = this._taps;
    this._taps = [];
    return taps;
  }
}
