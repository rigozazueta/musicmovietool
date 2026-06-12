import * as THREE from 'three';
import { AudioEngine } from './audio.js';
import { Director } from './director.js';
import { createOverlays } from './overlays.js';
import { createUI } from './ui.js';
import { createNeonScene } from './scenes/neon.js';
import { createDunesScene } from './scenes/dunes.js';
import { createTempleScene } from './scenes/temple.js';
import { createVoidScene } from './scenes/voidclub.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; // the "shot on film" look
renderer.toneMappingExposure = 1.15;
renderer.domElement.classList.add('webgl');
document.body.prepend(renderer.domElement);

const audio = new AudioEngine();
const overlays = createOverlays();
const scenes = [createNeonScene(), createDunesScene(), createTempleScene(), createVoidScene()];
const director = new Director(renderer, audio, scenes, overlays);
const ui = createUI({ audio, director, overlays });

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  director.resize(innerWidth, innerHeight);
});

overlays.fadeInFromBlack(1800);

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.05); // clamp tab-switch jumps
  last = now;
  const t = now / 1000;

  audio.update(dt);
  director.update(dt, t);
  overlays.update(dt);
  ui.update(dt, t);
}
requestAnimationFrame(frame);
