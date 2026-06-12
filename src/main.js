import * as THREE from 'three';
import { AudioEngine } from './audio.js';
import { MidiClock } from './midi.js';
import { Director } from './director.js';
import { createOverlays } from './overlays.js';
import { createUI } from './ui.js';
import { createNeonScene } from './scenes/neon.js';
import { createDunesScene } from './scenes/dunes.js';
import { createTempleScene } from './scenes/temple.js';
import { createVoidScene } from './scenes/voidclub.js';
import { createColossusScene } from './scenes/colossus.js';
import { createFleetScene } from './scenes/fleet.js';
import { createGridScene } from './scenes/grid.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; // the "shot on film" look
renderer.toneMappingExposure = 1.15;
renderer.domElement.classList.add('webgl');
document.body.prepend(renderer.domElement);

const audio = new AudioEngine();
const midi = new MidiClock();
audio.midi = midi;
const overlays = createOverlays();
const scenes = [
  createNeonScene(),
  createDunesScene(),
  createTempleScene(),
  createVoidScene(),
  createColossusScene(),
  createFleetScene(),
  createGridScene(),
];
const director = new Director(renderer, audio, scenes, overlays);
const ui = createUI({ audio, midi, director, overlays });

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
