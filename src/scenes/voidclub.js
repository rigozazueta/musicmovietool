// CHAPTER IV — THE VOID
// The drop scene: a crowd dancing in a black void, lit only by a strobing
// light wall and a fan of lasers. Pure club energy, no horizon.

import * as THREE from 'three';
import { makeFigure, beatEnv } from './common.js';

export function createVoidScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 20, 70);

  scene.add(new THREE.AmbientLight(0x202028, 0.8));
  const strobeLight = new THREE.PointLight(0xffffff, 0, 80, 1.4);
  strobeLight.position.set(0, 8, -16);
  scene.add(strobeLight);
  const washL = new THREE.PointLight(0xff2d78, 25, 50, 1.8);
  washL.position.set(-12, 6, 0);
  scene.add(washL);
  const washR = new THREE.PointLight(0x19e3ff, 25, 50, 1.8);
  washR.position.set(12, 6, 0);
  scene.add(washR);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({ color: 0x050507, roughness: 0.4, metalness: 0.5 }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // the light wall — a monolith of pure white that fires on the kick
  const wallMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(34, 14), wallMat);
  wall.position.set(0, 7, -18);
  scene.add(wall);

  // crowd: every figure shares the beat but keeps its own groove
  const crowd = [];
  const accents = [0xff2d78, 0x19e3ff, 0xffffff, 0x8d5bff];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const fig = makeFigure({
        accent: accents[(row + col) % accents.length],
        scale: 0.9 + Math.random() * 0.2,
      });
      fig.group.position.set(
        (col - 3.5) * 2.6 + (Math.random() - 0.5) * 1.2,
        0,
        row * 3 + (Math.random() - 0.5) * 1.4,
      );
      fig.group.rotation.y = Math.PI + (Math.random() - 0.5) * 0.5; // facing the wall
      fig.energyBias = Math.random() * 0.25;
      crowd.push(fig);
      scene.add(fig.group);
    }
  }

  // laser fan from above the wall
  const laserGroup = new THREE.Group();
  laserGroup.position.set(0, 12, -17);
  const lasers = [];
  for (let i = 0; i < 7; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0x19e3ff, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 60, 6, 1, true), mat);
    beam.position.y = -30; // hang from the pivot
    const pivot = new THREE.Group();
    pivot.add(beam);
    pivot.rotation.z = (i - 3) * 0.22;
    laserGroup.add(pivot);
    lasers.push({ pivot, mat });
  }
  scene.add(laserGroup);

  // hyperspace jump on drops: star streaks rushing through the room
  const STREAKS = 240;
  const streakPos = new Float32Array(STREAKS * 6);
  const streakBase = [];
  for (let i = 0; i < STREAKS; i++) {
    streakBase.push({
      x: (Math.random() - 0.5) * 70,
      y: Math.random() * 26 - 2,
      z: Math.random() * 90,
      len: 2 + Math.random() * 4,
    });
  }
  const streakGeo = new THREE.BufferGeometry();
  streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPos, 3));
  const streakMat = new THREE.LineBasicMaterial({
    color: 0xbfe9ff, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  scene.add(new THREE.LineSegments(streakGeo, streakMat));
  let hyperLife = 0;
  let hyperOff = 0;

  const laserHue = new THREE.Color();

  return {
    name: 'THE VOID',
    numeral: 'IV',
    mood: ['peak'],
    shake: 0.6,
    scene,

    onDrop() { hyperLife = 1; },

    update(dt, t, audio) {
      const env = beatEnv(audio);

      for (const fig of crowd) {
        fig.dance(t, env, Math.min(1, audio.intensity + fig.energyBias));
      }

      // strobe fires with the kick — hard attack, fast decay
      wallMat.opacity = 0.06 + env * 0.95;
      strobeLight.intensity = env * 220;
      washL.intensity = 18 + audio.sMid * 50;
      washR.intensity = 18 + audio.sHigh * 60;

      // lasers sweep with the mids, hue walks each phrase
      laserHue.setHSL((audio.barCount * 0.04 + 0.5) % 1, 1, 0.6);
      laserGroup.rotation.y = Math.sin(t * 0.7) * 0.5;
      for (let i = 0; i < lasers.length; i++) {
        lasers[i].pivot.rotation.z = (i - 3) * (0.14 + audio.sMid * 0.25) + Math.sin(t * 1.3 + i) * 0.06;
        lasers[i].mat.color.copy(laserHue);
        lasers[i].mat.opacity = 0.15 + audio.intensity * 0.45 + env * 0.25;
      }

      if (hyperLife > 0) {
        hyperLife = Math.max(0, hyperLife - dt * 0.2);
        hyperOff += dt * (50 + 90 * hyperLife);
        for (let i = 0; i < STREAKS; i++) {
          const b = streakBase[i];
          const z = ((b.z + hyperOff) % 90) - 55;
          streakPos[i * 6] = b.x;
          streakPos[i * 6 + 1] = b.y;
          streakPos[i * 6 + 2] = z;
          streakPos[i * 6 + 3] = b.x;
          streakPos[i * 6 + 4] = b.y;
          streakPos[i * 6 + 5] = z - b.len * (1 + hyperLife * 2);
        }
        streakGeo.attributes.position.needsUpdate = true;
      }
      streakMat.opacity = Math.min(1, hyperLife * 1.6) * 0.85;
    },

    shots: [
      // in the crowd, handheld
      (st, a, t, P, L) => {
        P.set(Math.sin(st * 0.4) * 3, 1.7, 10 - Math.min(st * 0.4, 5));
        L.set(0, 4, -18);
      },
      // behind the crowd, wall framing everyone
      (st, a, t, P, L) => {
        P.set(Math.sin(st * 0.15) * 8, 3.2, 20);
        L.set(0, 3.5, -10);
      },
      // side sweep across the rows
      (st, a, t, P, L) => {
        P.set(-14 + st * 1.1, 2.2, 6);
        L.set(0, 2.5, -6);
      },
      // top-down god view, slow rotate
      (st, a, t, P, L) => {
        const ang = st * 0.12;
        P.set(Math.sin(ang) * 6, 22, 6 + Math.cos(ang) * 6);
        L.set(0, 0, 0);
      },
    ],
  };
}
