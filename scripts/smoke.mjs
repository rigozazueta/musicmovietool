// Headless sanity check: constructs every scene, runs update() and all camera
// shots with a fake audio frame, and fails on NaN positions. Run: node scripts/smoke.mjs

import * as THREE from 'three';

// minimal DOM stub for canvas-texture generation outside a browser: a
// self-returning callable proxy stands in for the 2D context and anything
// it produces (gradients, patterns, image data)
const anything = new Proxy(function () {}, {
  get: (t, k) => (k === 'data' ? new Uint8ClampedArray(256 * 256 * 4) : anything),
  apply: () => anything,
  set: () => true,
});
globalThis.document = {
  createElement: () => ({ width: 0, height: 0, getContext: () => anything }),
};

const { createNeonScene } = await import('../src/scenes/neon.js');
const { createDunesScene } = await import('../src/scenes/dunes.js');
const { createTempleScene } = await import('../src/scenes/temple.js');
const { createVoidScene } = await import('../src/scenes/voidclub.js');
const { createColossusScene } = await import('../src/scenes/colossus.js');
const { createFleetScene } = await import('../src/scenes/fleet.js');
const { createGridScene } = await import('../src/scenes/grid.js');
const { createMonolithScene } = await import('../src/scenes/monolith.js');

const fakeAudio = {
  bass: 0.5, mid: 0.3, high: 0.2,
  sBass: 0.5, sMid: 0.3, sHigh: 0.2,
  level: 0.4, intensity: 0.65, beat: false, beatPhase: 0.2,
  bpm: 124, beatCount: 33, barCount: 8, section: 'groove',
  freqData: new Uint8Array(1024).fill(120),
};

const P = new THREE.Vector3();
const L = new THREE.Vector3();
let failed = false;

for (const create of [
  createNeonScene, createDunesScene, createTempleScene, createVoidScene,
  createColossusScene, createFleetScene, createGridScene, createMonolithScene,
]) {
  const sc = create();
  try {
    for (let f = 0; f < 120; f++) sc.update(1 / 60, f / 60, fakeAudio);
    sc.onDrop?.();
    sc.update(1 / 60, 2.0, fakeAudio);
    for (const shot of sc.shots) {
      for (const st of [0, 1, 5, 20, 60]) {
        shot(st, fakeAudio, st, P, L);
        if (![P.x, P.y, P.z, L.x, L.y, L.z].every(Number.isFinite)) {
          throw new Error(`non-finite shot output at st=${st}`);
        }
      }
    }
    console.log(`ok   ${sc.numeral}. ${sc.name} — ${sc.shots.length} shots, mood [${sc.mood}]`);
  } catch (e) {
    failed = true;
    console.error(`FAIL ${sc.name}:`, e.message);
  }
}

process.exit(failed ? 1 : 0);
