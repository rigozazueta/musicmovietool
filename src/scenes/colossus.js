// CHAPTER V — THE COLOSSUS
// A giant android towers over a tiny crowd in a black arena — chest core
// burning with the bass, holographic rings orbiting its body, arms rising
// as the energy climbs. Equal parts cathedral and machine.

import * as THREE from 'three';
import { makeFigure, makeParticles, beatEnv } from './common.js';

export function createColossusScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05030d);
  scene.fog = new THREE.Fog(0x05030d, 45, 170);

  scene.add(new THREE.AmbientLight(0x1c2240, 1.1));
  const key = new THREE.DirectionalLight(0x8da4ff, 0.9);
  key.position.set(30, 50, 60);
  scene.add(key);
  // rim from behind so the giant's edges burn against the dark
  const rim = new THREE.DirectionalLight(0x4d6bff, 1.6);
  rim.position.set(0, 40, -120);
  scene.add(rim);
  const coreLight = new THREE.PointLight(0x8df6ff, 90, 140, 1.5);
  scene.add(coreLight);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ color: 0x060710, roughness: 0.3, metalness: 0.65 }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // the giant — same rig as every character, scaled 18x
  const giant = makeFigure({ color: 0x0d1020, accent: 0x8df6ff, scale: 18 });
  giant.group.position.set(0, 0, -25);
  scene.add(giant.group);
  const { torso, head, armL, armR } = giant.parts;

  // burning chest core + glowing visor (local units; the group scale carries them)
  const coreMat = new THREE.MeshBasicMaterial({ color: 0x9ffaff });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), coreMat);
  core.position.set(0, 0.42, 0.16);
  torso.add(core);
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.045, 0.04),
    new THREE.MeshBasicMaterial({ color: 0x8df6ff }),
  );
  visor.position.set(0, 0.02, 0.13);
  head.add(visor);

  // holographic rings orbiting the body
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(
      new THREE.TorusGeometry(13 + i * 5, 0.09, 8, 90),
      new THREE.MeshBasicMaterial({
        color: 0x8df6ff, transparent: true, opacity: 0.3,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    r.position.set(0, 14 + i * 7, -25);
    r.rotation.x = Math.PI / 2 + (i - 1) * 0.12;
    rings.push(r);
    scene.add(r);
  }

  // light shafts behind the giant
  const shafts = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.MeshBasicMaterial({
      color: 0x4d6bff, transparent: true, opacity: 0.05, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(4, 90, 12, 1, true), m);
    cone.position.set((i - 2) * 14, 46, -55);
    shafts.push(cone);
    scene.add(cone);
  }

  // the congregation: a small crowd dwarfed at its feet
  const crowd = [];
  for (let i = 0; i < 24; i++) {
    const fig = makeFigure({ color: 0x07080f, accent: 0x33445f, scale: 0.9 + Math.random() * 0.2 });
    fig.group.position.set(
      (Math.random() - 0.5) * 30,
      0,
      14 + Math.random() * 14,
    );
    fig.group.rotation.y = Math.PI + (Math.random() - 0.5) * 0.4; // facing the giant
    crowd.push(fig);
    scene.add(fig.group);
  }

  const dust = makeParticles({
    count: 700, box: [120, 60, 120], color: 0x6f86ff, size: 0.14, opacity: 0.22,
    blending: THREE.AdditiveBlending,
  });
  scene.add(dust.points);

  let armRaise = 0;
  const chestWorldY = (0.85 + 0.42) * 18; // hips + core offset, scaled

  return {
    name: 'THE COLOSSUS',
    numeral: 'V',
    mood: ['peak', 'calm'],
    shake: 0.25,
    scene,

    update(dt, t, audio) {
      const env = beatEnv(audio);

      // the giant moves like weather: slow sway, head surveying the crowd,
      // arms rising with the section energy
      giant.group.rotation.y = Math.sin(t * 0.07) * 0.12;
      torso.rotation.x = 0.04 + Math.sin(t * 0.4) * 0.02 + env * 0.015;
      head.rotation.x = 0.32 + Math.sin(t * 0.21) * 0.08;
      head.rotation.y = Math.sin(t * 0.13) * 0.3;
      const targetRaise = THREE.MathUtils.smoothstep(audio.intensity, 0.45, 0.85);
      armRaise += (targetRaise - armRaise) * Math.min(1, dt * 0.7);
      armL.rotation.x = THREE.MathUtils.lerp(0.1, -2.5, armRaise) + Math.sin(t * 0.5) * 0.04;
      armR.rotation.x = THREE.MathUtils.lerp(0.15, -2.5, armRaise) + Math.cos(t * 0.45) * 0.04;
      armL.rotation.z = 0.2 + armRaise * 0.3;
      armR.rotation.z = -0.2 - armRaise * 0.3;

      const corePulse = 1 + audio.sBass * 1.1 + env * 0.4;
      core.scale.setScalar(corePulse);
      coreLight.position.set(0, chestWorldY, -25 + 4);
      coreLight.intensity = 50 + audio.sBass * 160;

      for (let i = 0; i < rings.length; i++) {
        rings[i].rotation.z = t * 0.08 * (i % 2 ? 1 : -1);
        rings[i].material.opacity = 0.18 + env * 0.35 + audio.sMid * 0.15;
        rings[i].scale.setScalar(1 + env * 0.02);
      }
      for (const s of shafts) s.material.opacity = 0.035 + audio.intensity * 0.06;

      for (const fig of crowd) fig.dance(t, env, audio.intensity * 0.8);

      const pos = dust.positions;
      for (let i = 0; i < dust.count; i++) {
        pos[i * 3 + 1] += dt * 0.4;
        if (pos[i * 3 + 1] > 60) pos[i * 3 + 1] = 0;
      }
      dust.geo.attributes.position.needsUpdate = true;
    },

    shots: [
      // ground level, staring up at the giant past the crowd
      (st, a, t, P, L) => {
        P.set(6, 2.2, 38 - Math.min(st * 0.45, 10));
        L.set(0, 26, -25);
      },
      // vast wide orbit: scale of the thing
      (st, a, t, P, L) => {
        const ang = st * 0.06 + 0.8;
        P.set(Math.cos(ang) * 60, 14 + Math.sin(st * 0.18) * 4, Math.sin(ang) * 60 + 5);
        L.set(0, 20, -25);
      },
      // over the crowd's shoulders
      (st, a, t, P, L) => {
        P.set(Math.sin(st * 0.2) * 10, 3.4, 27);
        L.set(0, 24, -25);
      },
      // face to face with the machine
      (st, a, t, P, L) => {
        P.set(12 - st * 0.15, 29, -6 - st * 0.18);
        L.set(0, 29, -25);
      },
    ],
  };
}
