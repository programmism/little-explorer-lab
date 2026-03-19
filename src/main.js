import { GameLoop } from './GameLoop.js';
import { InputManager } from './InputManager.js';
import { AudioManager } from './AudioManager.js';
import { World } from './World.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// Enter fullscreen on first interaction
document.addEventListener('click', () => {
  document.documentElement.requestFullscreen?.().catch(() => {});
}, { once: true });
document.addEventListener('touchstart', () => {
  document.documentElement.requestFullscreen?.().catch(() => {});
}, { once: true, passive: true });

const audio = new AudioManager();
const input = new InputManager(canvas);
const world = new World(canvas, ctx, input, audio);

const loop = new GameLoop(dt => {
  world.update(dt);
  world.draw();
});

loop.start();
