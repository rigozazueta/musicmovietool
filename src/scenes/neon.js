// CHAPTER I — NEON DISTRICT
// A rain-slicked night city. A lone dancer on a rooftop. Building windows and
// neon signage pulse with the kick; rain falls steady like a film loop.

import * as THREE from 'three';
import { makeFigure, makeParticles, beatEnv } from './common.js';

function windowTexture(seed) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#04050a';
  g.fillRect(0, 0, 64, 128);
  let rnd = seed;
  const rand = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
  for (let y = 4; y < 124; y += 8) {
    for (let x = 4; x < 60; x += 8) {
      if (rand() < 0.42) {
        g.fillStyle = rand() < 0.7 ? 'rgba(255,190,120,0.95)' : 'rgba(120,220,255,0.95)';
        g.fillRect(x, y, 4, 5);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createNeonScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060f);
  scene.fog = new THREE.Fog(0x05060f, 18, 90);

  scene.add(new THREE.AmbientLight(0x2a2f55, 0.9));
  const moon = new THREE.DirectionalLight(0x7d8cff, 0.5);
  moon.position.set(-20, 40, 10);
  scene.add(moon);
  const pink = new THREE.PointLight(0xff2d78, 60, 60, 1.8);
  pink.position.set(-6, 9, 2);
  scene.add(pink);
  const cyan = new THREE.PointLight(0x19e3ff, 50, 60, 1.8);
  cyan.position.set(7, 12, -6);
  scene.add(cyan);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 300),
    new THREE.MeshStandardMaterial({ color: 0x070810, roughness: 0.35, metalness: 0.6 }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // city: shared flickering materials keep draw state cheap while letting
  // building groups pulse independently with the bass
  const winMats = [];
  for (let i = 0; i < 8; i++) {
    const tex = windowTexture(1234 + i * 999);
    winMats.push(new THREE.MeshStandardMaterial({
      color: 0x0a0c18, roughness: 0.85,
      emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.7, map: tex,
    }));
  }
  const buildings = new THREE.Group();
  let bi = 0;
  for (let gx = -5; gx <= 5; gx++) {
    for (let gz = -5; gz <= 5; gz++) {
      if (Math.abs(gx) < 2 && Math.abs(gz) < 2) continue; // keep a plaza for the hero roof
      const w = 3 + Math.random() * 3.5;
      const h = 6 + Math.random() * 26;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), winMats[bi++ % winMats.length]);
      b.position.set(gx * 9 + (Math.random() - 0.5) * 3, h / 2, gz * 9 + (Math.random() - 0.5) * 3);
      buildings.add(b);
    }
  }
  scene.add(buildings);

  // hero rooftop in the plaza
  const roofH = 7;
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(7, roofH, 7),
    new THREE.MeshStandardMaterial({ color: 0x0c0e1a, roughness: 0.9 }),
  );
  roof.position.set(0, roofH / 2, 0);
  scene.add(roof);

  const dancer = makeFigure({ accent: 0xff2d78 });
  dancer.group.position.set(0, roofH, 0);
  dancer.group.rotation.y = Math.PI * 0.15;
  scene.add(dancer.group);

  // neon signage
  const signMatA = new THREE.MeshBasicMaterial({ color: 0xff2d78 });
  const signMatB = new THREE.MeshBasicMaterial({ color: 0x19e3ff });
  const signs = [];
  const signSpecs = [
    [-9.5, 10, -4, 0.4, 5, signMatA], [9.2, 14, -10, 0.4, 4, signMatB],
    [-13.5, 6, 8, 0.4, 3, signMatB], [13.8, 9, 6, 0.4, 6, signMatA],
    [-4.5, 18, -14, 5, 0.4, signMatA], [5, 21, -18.5, 4, 0.4, signMatB],
  ];
  for (const [x, y, z, w, h, m] of signSpecs) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.3), m.clone());
    s.position.set(x, y, z);
    signs.push(s);
    scene.add(s);
  }

  const rain = makeParticles({
    count: 1600, box: [70, 40, 70], color: 0x8fb6ff, size: 0.06, opacity: 0.5,
  });
  scene.add(rain.points);

  const tmp = new THREE.Vector3();

  return {
    name: 'NEON DISTRICT',
    numeral: 'I',
    mood: ['mid', 'peak'],
    shake: 0.35,
    scene,

    update(dt, t, audio) {
      const env = beatEnv(audio);

      dancer.dance(t, env, audio.intensity);

      // windows flicker in offset groups with the kick
      for (let i = 0; i < winMats.length; i++) {
        winMats[i].emissiveIntensity =
          0.55 + audio.sBass * 0.9 * (0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.7));
      }
      for (let i = 0; i < signs.length; i++) {
        const buzz = Math.sin(t * 30 + i * 9) > 0.92 ? 0.3 : 1; // neon tube flicker
        signs[i].material.color.copy(i % 2 ? signMatB.color : signMatA.color)
          .multiplyScalar((0.6 + env * 0.8 + audio.sMid * 0.5) * buzz);
        signs[i].scale.setScalar(1 + env * 0.06);
      }
      pink.intensity = 40 + env * 70;
      cyan.intensity = 35 + audio.sMid * 60;

      // rain
      const pos = rain.positions;
      for (let i = 0; i < rain.count; i++) {
        pos[i * 3 + 1] -= dt * (22 + audio.intensity * 8);
        if (pos[i * 3 + 1] < 0) pos[i * 3 + 1] = rain.box[1];
      }
      rain.geo.attributes.position.needsUpdate = true;
    },

    shots: [
      // slow push down the street canyon toward the dancer
      (st, a, t, P, L) => {
        P.set(0.5, 2.4, 30 - Math.min(st * 0.7, 12));
        L.set(0, roofH + 1.2, 0);
      },
      // rooftop orbit around the dancer, city bokeh behind
      (st, a, t, P, L) => {
        const ang = st * 0.18 + 1.2;
        P.set(Math.cos(ang) * 6.5, roofH + 1.6 + Math.sin(st * 0.3) * 0.4, Math.sin(ang) * 6.5);
        L.set(0, roofH + 1.1, 0);
      },
      // low hero angle, slight push-in
      (st, a, t, P, L) => {
        P.set(2.2 - st * 0.05, roofH + 0.7, 3.4 - st * 0.12);
        L.set(0, roofH + 1.3, 0);
      },
      // aerial drift over the district
      (st, a, t, P, L) => {
        const ang = st * 0.06 + 4;
        P.set(Math.cos(ang) * 38, 30 + Math.sin(st * 0.2) * 3, Math.sin(ang) * 38);
        L.set(0, 8, 0);
      },
    ],
  };
}
