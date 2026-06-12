// CHAPTER III — ASTRAL TEMPLE
// The breakdown scene: a monk floats above a temple platform adrift in space.
// Orbs orbit faster as energy returns; stars shimmer with the hi-hats.

import * as THREE from 'three';
import { beatEnv, addSkyDome } from './common.js';

export function createTempleScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070312);
  scene.fog = new THREE.Fog(0x0d0620, 30, 120);

  const sky = addSkyDome(scene, 'temple.png'); // painted nebula, if fetched

  scene.add(new THREE.AmbientLight(0x3b2a66, 1.2));
  const key = new THREE.DirectionalLight(0xb49aff, 1.4);
  key.position.set(10, 25, 10);
  scene.add(key);
  const coreLight = new THREE.PointLight(0x4dfff0, 50, 50, 1.6);
  coreLight.position.set(0, 4, 0);
  scene.add(coreLight);

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x241a3e, roughness: 0.8 });

  // platform: stacked discs + ring of columns
  const platform = new THREE.Group();
  for (const [r, h, y] of [[10, 1.2, -0.6], [8, 1, 0.4], [6, 0.8, 1.3]]) {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.06, h, 36), stoneMat);
    d.position.y = y;
    platform.add(d);
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 5.4, 10), stoneMat);
    col.position.set(Math.cos(a) * 7, 4.2, Math.sin(a) * 7);
    platform.add(col);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 1.1), stoneMat);
    cap.position.set(Math.cos(a) * 7, 7.05, Math.sin(a) * 7);
    platform.add(cap);
  }
  scene.add(platform);

  // floating monk: hooded cone silhouette, lit from the core below
  const monkMat = new THREE.MeshStandardMaterial({ color: 0x12091f, roughness: 0.9 });
  const monk = new THREE.Group();
  const robe = new THREE.Mesh(new THREE.ConeGeometry(0.85, 2.4, 14), monkMat);
  robe.position.y = 1.2;
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), monkMat);
  hood.position.y = 2.55;
  hood.scale.y = 1.15;
  monk.add(robe, hood);
  monk.position.y = 3.4;
  scene.add(monk);

  // hologram shell: additive wireframe ghost flickering over the monk
  const holoMat = new THREE.MeshBasicMaterial({
    color: 0x8df6ff, wireframe: true, transparent: true, opacity: 0.15,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const holoRobe = new THREE.Mesh(robe.geometry, holoMat);
  holoRobe.scale.setScalar(1.05);
  robe.add(holoRobe);
  const holoHood = new THREE.Mesh(hood.geometry, holoMat);
  holoHood.scale.setScalar(1.08);
  hood.add(holoHood);

  // light shafts falling on the platform
  const shafts = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.MeshBasicMaterial({
      color: 0xb49aff, transparent: true, opacity: 0.05, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.4, 26, 12, 1, true), m);
    const a = (i / 4) * Math.PI * 2 + 0.4;
    cone.position.set(Math.cos(a) * 4.5, 14, Math.sin(a) * 4.5);
    shafts.push(cone);
    scene.add(cone);
  }

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 20, 16),
    new THREE.MeshBasicMaterial({ color: 0x4dfff0 }),
  );
  core.position.y = 5.6; // hovers before the monk's chest
  scene.add(core);

  // orbiting orbs
  const orbMat = new THREE.MeshBasicMaterial({
    color: 0x8d5bff, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const orbs = [];
  for (let i = 0; i < 9; i++) {
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.22 + Math.random() * 0.15, 12, 10), orbMat);
    o.userData = {
      r: 3.2 + i * 0.7, off: i * 2.4, tilt: (Math.random() - 0.5) * 0.8, h: 4.5 + Math.random() * 3,
    };
    orbs.push(o);
    scene.add(o);
  }

  // great rings
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x8d5bff, transparent: true, opacity: 0.35,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(13 + i * 4, 0.08, 8, 80), ringMat.clone());
    r.rotation.x = Math.PI / 2 + (i - 1) * 0.18;
    r.position.y = 4;
    rings.push(r);
    scene.add(r);
  }

  // starfield on a sphere shell
  const starCount = 2200;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const b = Math.acos(Math.random() * 2 - 1);
    const r = 90 + Math.random() * 60;
    starPos[i * 3] = r * Math.sin(b) * Math.cos(a);
    starPos[i * 3 + 1] = r * Math.cos(b);
    starPos[i * 3 + 2] = r * Math.sin(b) * Math.sin(a);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xcfd8ff, size: 0.5, transparent: true, opacity: 0.8,
    depthWrite: false, fog: false,
  });
  scene.add(new THREE.Points(starGeo, starMat));

  // floating rock shards drifting around the temple
  const shards = [];
  for (let i = 0; i < 14; i++) {
    const s = new THREE.Mesh(new THREE.TetrahedronGeometry(0.4 + Math.random() * 0.9), stoneMat);
    const a = Math.random() * Math.PI * 2;
    const r = 14 + Math.random() * 18;
    s.position.set(Math.cos(a) * r, 1 + Math.random() * 9, Math.sin(a) * r);
    s.userData = { spin: (Math.random() - 0.5) * 0.8, bobOff: Math.random() * 9 };
    shards.push(s);
    scene.add(s);
  }

  return {
    name: 'ASTRAL TEMPLE',
    numeral: 'III',
    mood: ['calm'],
    shake: 0.08,
    scene,

    update(dt, t, audio) {
      const env = beatEnv(audio, 3);

      monk.position.y = 3.4 + Math.sin(t * 0.7) * 0.35;
      monk.rotation.y = t * 0.15;
      core.position.y = monk.position.y + 2.2;
      const corePulse = 1 + audio.sBass * 0.8 + env * 0.3;
      core.scale.setScalar(corePulse);
      coreLight.position.y = core.position.y;
      coreLight.intensity = 30 + audio.sBass * 90;

      const speed = 0.25 + audio.intensity * 1.4;
      for (const o of orbs) {
        const u = o.userData;
        const a = t * speed + u.off;
        o.position.set(
          Math.cos(a) * u.r,
          u.h + Math.sin(a * 1.7 + u.tilt) * 1.4,
          Math.sin(a) * u.r,
        );
        o.scale.setScalar(1 + env * 0.5);
      }

      for (let i = 0; i < rings.length; i++) {
        rings[i].rotation.z = t * 0.05 * (i + 1);
        rings[i].material.opacity = 0.2 + env * 0.5 + audio.sMid * 0.2;
      }

      starMat.opacity = 0.55 + audio.sHigh * 1.6 + Math.sin(t * 3) * 0.06;
      starMat.size = 0.45 + audio.sHigh * 0.6;
      if (sky) sky.material.color.setScalar(0.55 + audio.intensity * 0.3 + env * 0.15);

      // hologram flicker: steady shimmer plus scanline-style dropouts
      holoMat.opacity = 0.1 + env * 0.18 + (Math.sin(t * 31) > 0.7 ? 0.12 : 0);

      for (let i = 0; i < shafts.length; i++) {
        shafts[i].material.opacity = 0.035 + audio.intensity * 0.05 + env * 0.04;
        shafts[i].rotation.y = t * 0.1 * (i % 2 ? 1 : -1);
      }

      for (const s of shards) {
        s.rotation.x += dt * s.userData.spin;
        s.rotation.y += dt * s.userData.spin * 0.7;
        s.position.y += Math.sin(t * 0.4 + s.userData.bobOff) * dt * 0.3;
      }

      platform.position.y = Math.sin(t * 0.3) * 0.25;
    },

    shots: [
      // slow reverent orbit
      (st, a, t, P, L) => {
        const ang = st * 0.1 + 0.6;
        P.set(Math.cos(ang) * 17, 6 + Math.sin(st * 0.15) * 1.5, Math.sin(ang) * 17);
        L.set(0, 4.5, 0);
      },
      // low through the columns
      (st, a, t, P, L) => {
        const ang = st * 0.05 + 2.5;
        P.set(Math.cos(ang) * 8.6, 2.6, Math.sin(ang) * 8.6);
        L.set(0, 5, 0);
      },
      // close on the monk and core, gentle push
      (st, a, t, P, L) => {
        P.set(3.4 - st * 0.06, 5.6, 4.2 - st * 0.08);
        L.set(0, 5.4, 0);
      },
      // far wide: temple as a speck among stars
      (st, a, t, P, L) => {
        const ang = st * 0.04 + 4.2;
        P.set(Math.cos(ang) * 38, 12 + st * 0.15, Math.sin(ang) * 38);
        L.set(0, 4, 0);
      },
    ],
  };
}
