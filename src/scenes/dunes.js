// CHAPTER II — DUNE PILGRIM
// A figure walks an endless desert at dusk, steps locked to the beat. The sun
// breathes with the bass; the sky drifts between ember and violet with the mids.

import * as THREE from 'three';
import { makeFigure, makeParticles, addSkyDome } from './common.js';

const WRAP = 120; // terrain is periodic in x with this length so the walk loops seamlessly

function duneHeight(x, z) {
  const k = (Math.PI * 2) / WRAP; // harmonics of the wrap length stay periodic
  return (
    Math.sin(x * k * 2 + z * 0.05) * 1.6 +
    Math.sin(x * k * 5 + 1.7) * 0.7 * Math.cos(z * 0.06) +
    Math.sin(z * 0.085 + 0.5) * 2.2 +
    Math.sin((x * k * 9) + z * 0.15) * 0.25
  );
}

export function createDunesScene() {
  const scene = new THREE.Scene();
  const skyA = new THREE.Color(0x2b1230); // violet dusk
  const skyB = new THREE.Color(0x7a2d18); // ember
  scene.background = skyA.clone();
  scene.fog = new THREE.Fog(scene.background, 30, 110);

  scene.add(new THREE.AmbientLight(0x52303f, 1.1));
  const sunLight = new THREE.DirectionalLight(0xffb36b, 2.2);
  sunLight.position.set(-30, 14, -60);
  scene.add(sunLight);

  const sky = addSkyDome(scene, 'dunes.png'); // painted dusk sky, if fetched

  // span 3 wraps in x so the mesh edge stays beyond the fog from any rig position
  const terrainGeo = new THREE.PlaneGeometry(WRAP * 3, 240, 150, 90);
  terrainGeo.rotateX(-Math.PI / 2);
  const tp = terrainGeo.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    tp.setY(i, duneHeight(tp.getX(i), tp.getZ(i)));
  }
  terrainGeo.computeVertexNormals();
  const terrain = new THREE.Mesh(
    terrainGeo,
    new THREE.MeshStandardMaterial({ color: 0xb87f4e, roughness: 1 }),
  );
  scene.add(terrain);

  // twin suns sit outside the fog so they stay clean cinematic circles
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(16, 48),
    new THREE.MeshBasicMaterial({ color: 0xffc06a, fog: false }),
  );
  sun.position.set(-42, 15, -160);
  scene.add(sun);
  const sunHalo = new THREE.Mesh(
    new THREE.CircleGeometry(26, 48),
    new THREE.MeshBasicMaterial({
      color: 0xff8a4a, fog: false, transparent: true, opacity: 0.25,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  sunHalo.position.copy(sun.position).z -= 0.5;
  scene.add(sunHalo);

  const sun2 = new THREE.Mesh(
    new THREE.CircleGeometry(8, 40),
    new THREE.MeshBasicMaterial({ color: 0xffe3b0, fog: false }),
  );
  sun2.position.set(-12, 24, -161);
  scene.add(sun2);
  const sun2Halo = new THREE.Mesh(
    new THREE.CircleGeometry(13, 40),
    new THREE.MeshBasicMaterial({
      color: 0xffc98a, fog: false, transparent: true, opacity: 0.2,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  sun2Halo.position.copy(sun2.position).z -= 0.5;
  scene.add(sun2Halo);

  // a colossus half-buried in the sand, hazed by distance — ancient and huge
  const relic = makeFigure({ color: 0x140a10, accent: 0xffb36b, scale: 24 });
  relic.group.position.set(30, -11, -88); // sunk to the waist
  relic.group.rotation.y = -0.5;
  relic.parts.armL.rotation.x = -2.9; // one arm frozen reaching for the suns
  relic.parts.head.rotation.x = 0.25;
  scene.add(relic.group);

  // the pilgrim — everything camera-relative lives in this group so the walk
  // can wrap around the periodic terrain invisibly
  const rig = new THREE.Group();
  scene.add(rig);
  const pilgrim = makeFigure({ accent: 0xffb36b });
  rig.add(pilgrim.group);

  const dust = makeParticles({
    count: 500, box: [60, 10, 60], color: 0xd9a06a, size: 0.09, opacity: 0.35,
  });
  rig.add(dust.points);

  // distant birds: two-triangle silhouettes slowly circling the sun
  const birdMat = new THREE.MeshBasicMaterial({ color: 0x1a0d12, side: THREE.DoubleSide });
  const birds = [];
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Group();
    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      0, 0, 0, -0.9, 0.15, 0, -0.9, -0.15, 0,
    ]), 3));
    const wl = new THREE.Mesh(wingGeo, birdMat);
    const wr = new THREE.Mesh(wingGeo.clone(), birdMat);
    wr.scale.x = -1;
    b.add(wl, wr);
    b.userData = { wl, wr, off: i * 1.4, r: 28 + i * 5, h: 18 + i * 2.5 };
    scene.add(b);
    birds.push(b);
  }

  return {
    name: 'DUNE PILGRIM',
    numeral: 'II',
    mood: ['mid', 'calm'],
    shake: 0.18,
    scene,

    update(dt, t, audio) {
      // walk speed follows tempo; steps land on the half-beat
      const bps = (audio.bpm > 0 ? audio.bpm : 122) / 60;
      rig.position.x = ((rig.position.x + dt * 1.5 + WRAP / 2) % WRAP) - WRAP / 2;
      pilgrim.walk(t, bps * Math.PI);
      const px = rig.position.x;
      pilgrim.group.position.y = duneHeight(px, 0);
      pilgrim.group.rotation.y = -Math.PI / 2; // walking +x

      // sky drifts with the mids, suns breathe with the bass
      scene.background.copy(skyA).lerp(skyB, THREE.MathUtils.clamp(audio.sMid * 1.6, 0, 1));
      scene.fog.color.copy(scene.background);
      if (sky) sky.material.color.setScalar(0.72 + audio.sMid * 0.5);
      const pulse = 1 + audio.sBass * 0.18;
      sun.scale.setScalar(pulse);
      sunHalo.scale.setScalar(pulse * (1 + audio.intensity * 0.3));
      sun2.scale.setScalar(1 + audio.sBass * 0.1);
      sun2Halo.scale.setScalar(1 + audio.sBass * 0.2);
      sunLight.intensity = 1.6 + audio.sBass * 1.6;

      const pos = dust.positions;
      for (let i = 0; i < dust.count; i++) {
        pos[i * 3] += dt * (0.6 + audio.sMid);
        pos[i * 3 + 1] += Math.sin(t + i) * dt * 0.12;
        if (pos[i * 3] > 30) pos[i * 3] = -30;
      }
      dust.geo.attributes.position.needsUpdate = true;

      for (const b of birds) {
        const u = b.userData;
        const a = t * 0.08 + u.off;
        b.position.set(Math.cos(a) * u.r - 20, u.h + Math.sin(t * 0.5 + u.off) * 1.5, -60 + Math.sin(a) * 18);
        b.rotation.y = -a;
        const flap = Math.sin(t * 5 + u.off) * 0.5;
        u.wl.rotation.z = flap;
        u.wr.rotation.z = -flap;
      }
    },

    // shots are framed on the rig so the pilgrim stays composed while walking
    shots: [
      // classic tracking shot, low over the sand
      (st, a, t, P, L) => {
        P.set(rig.position.x - 7, duneHeight(rig.position.x, 0) + 1.4, 6.5);
        L.set(rig.position.x + 2, duneHeight(rig.position.x, 0) + 1.2, 0);
      },
      // wide: tiny figure, huge sun
      (st, a, t, P, L) => {
        P.set(rig.position.x + 16, duneHeight(rig.position.x, 0) + 2.2 + st * 0.05, 14);
        L.set(rig.position.x - 8, 8, -60);
      },
      // frontal push-in, sun at the pilgrim's back
      (st, a, t, P, L) => {
        P.set(rig.position.x + 9 - st * 0.25, duneHeight(rig.position.x, 0) + 1.1, 1.5);
        L.set(rig.position.x, duneHeight(rig.position.x, 0) + 1.3, 0);
      },
      // high crane drifting down
      (st, a, t, P, L) => {
        P.set(rig.position.x - 4, 14 - Math.min(st * 0.35, 9), 16);
        L.set(rig.position.x, duneHeight(rig.position.x, 0) + 1, 0);
      },
    ],
  };
}
