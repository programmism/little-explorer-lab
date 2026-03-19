export class GameLoop {
  constructor(update) {
    this.update = update;
    this.lastTime = null;
    this.running = false;
    this._frame = this._frame.bind(this);
  }

  start() {
    this.running = true;
    requestAnimationFrame(this._frame);
  }

  stop() {
    this.running = false;
  }

  _frame(timestamp) {
    if (!this.running) return;
    if (this.lastTime === null) this.lastTime = timestamp;

    let dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    // Cap dt to prevent spiral of death on tab switch / lag spike
    if (dt > 0.1) dt = 0.1;

    this.update(dt);
    requestAnimationFrame(this._frame);
  }
}
