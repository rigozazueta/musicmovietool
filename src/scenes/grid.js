// CHAPTER VII — THE GRID
// Retro-future wireframe world: an infinite neon floor scrolling one cell per
// beat, equalizer towers flanking the corridor, light trails racing to a
// striped sun. A dancer rides a hovering platform down the middle.

import * as THREE from 'three';
import { makeFigure, beatEnv } from './common.js';

function retroSunTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#ffb13c');
  grad.addColorStop(0.55, '#ff5a64');
  grad.addColorStop(1, '#ff2da0');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(128, 128, 124, 0, Math.PI * 2);
  g.fill();
  // horizontal slits widening toward the bottom — the classic retro sun
  for (let y = 140, h = 3; y < 256; y += h + 12, h += 3) {
    g.clearRect(0, y, 256, h);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createGridScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060312);
  scene.fog = new THREE.Fog(0x060312, 24, 95);

  scene.add(new THREE.AmbientLight(0x33214d, 1.4));
  const glow = new THREE.PointLight(0xff2da0, 40, 60, 1.8);
  glow.position.set(0, 6, -10);
  scene.add(glow);

  // infinite scrolling wireframe floor: translating by one 2-unit cell loops seamlessly
  const CELL = 2;
  const gridMat = new THREE.MeshBasicMaterial({ color: 0xff2da0, wireframe: true, transparent: true, opacity: 0.5 });
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(160, 240, 80, 120), gridMat);
  grid.rotation.x = -Math.PI / 2;
  scene.add(grid);
  // solid dark floor just beneath so the wires sit on black, not void
  const under = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshBasicMaterial({ color: 0x05020c }),
  );
  under.rotation.x = -Math.PI / 2;
  under.position.y = -0.06;
  scene.add(under);

  const sun = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshBasicMaterial({
      map: retroSunTexture(), transparent: true, fog: false, depthWrite: false,
    }),
  );
  sun.position.set(0, 20, -92);
  scene.add(sun);

  // equalizer towers flanking the corridor
  const towers = [];
  const towerMatA = new THREE.MeshBasicMaterial({ color: 0xff2da0 });
  const towerMatB = new THREE.MeshBasicMaterial({ color: 0x19e3ff });
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 16; i++) {
      const m = (i % 2 ? towerMatA : towerMatB).clone();
      const tw = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1, 1.7), m);
      tw.position.set(side * (9 + (i % 3)), 0.5, 2 - i * 4);
      tw.userData = { i, side };
      towers.push(tw);
      scene.add(tw);
    }
  }

  // light trails racing down the corridor
  const trails = [];
  for (let i = 0; i < 4; i++) {
    const tr = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.18, 7),
      new THREE.MeshBasicMaterial({
        color: i % 2 ? 0x19e3ff : 0xffffff, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    tr.position.set([-6.2, -4.8, 4.8, 6.2][i], 0.25, 0);
    tr.userData = { off: i * 31, dir: i % 2 ? 1 : -1, speed: 55 + i * 12 };
    trails.push(tr);
    scene.add(tr);
  }

  // the rider: a dancer on a hovering platform mid-corridor
  const platform = new THREE.Group();
  const deck = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.9, 0.25, 18),
    new THREE.MeshStandardMaterial({ color: 0x0b0614, roughness: 0.6, metalness: 0.4 }),
  );
  const rimGlow = new THREE.Mesh(
    new THREE.TorusGeometry(1.75, 0.07, 8, 40),
    new THREE.MeshBasicMaterial({ color: 0xff2da0 }),
  );
  rimGlow.rotation.x = Math.PI / 2;
  platform.add(deck, rimGlow);
  const rider = makeFigure({ accent: 0xff2da0 });
  rider.group.position.y = 0.13;
  platform.add(rider.group);
  platform.position.set(0, 1.5, -8);
  scene.add(platform);

  let scroll = 0;

  return {
    name: 'THE GRID',
    numeral: 'VII',
    mood: ['mid', 'peak'],
    shake: 0.4,
    scene,

    update(dt, t, audio) {
      const env = beatEnv(audio);
      const bps = (audio.bpm > 0 ? audio.bpm : 122) / 60;

      // one grid cell per beat — the world itself moves in tempo
      scroll += dt * bps * CELL;
      grid.position.z = scroll % CELL;
      gridMat.opacity = 0.35 + env * 0.4;

      rider.dance(t, env, audio.intensity);
      platform.position.y = 1.5 + Math.sin(t * 1.3) * 0.18 + env * 0.12;
      platform.rotation.z = Math.sin(t * 0.6) * 0.04;
      rimGlow.material.color.setHSL((0.9 + audio.barCount * 0.02) % 1, 1, 0.55 + env * 0.2);

      // towers behave like a giant EQ: real spectrum when available
      const fd = audio.freqData;
      for (const tw of towers) {
        const { i } = tw.userData;
        let h;
        if (fd) {
          h = 0.6 + (fd[6 + i * 14] / 255) * 9;
        } else {
          h = 0.6 + (audio.sBass + audio.sMid) * 4 * (0.5 + 0.5 * Math.sin(i * 1.1 + t * 2));
        }
        tw.scale.y += (h - tw.scale.y) * Math.min(1, dt * 12);
        tw.position.y = tw.scale.y / 2;
        tw.material.color.copy((i % 2 ? towerMatA : towerMatB).color)
          .multiplyScalar(0.45 + (tw.scale.y / 10) * 0.8 + env * 0.3);
      }

      for (const tr of trails) {
        const u = tr.userData;
        tr.position.z = ((u.off + t * u.speed * u.dir * (0.7 + audio.intensity * 0.6)) % 120 + 120) % 120 - 80;
        tr.material.opacity = 0.5 + env * 0.5;
      }

      glow.intensity = 30 + env * 60;
    },

    shots: [
      // the infinite run: low corridor push toward the sun
      (st, a, t, P, L) => {
        P.set(0, 2.2, 8 - Math.min(st * 0.5, 6));
        L.set(0, 6, -90);
      },
      // side dolly past the rider, towers strobing behind
      (st, a, t, P, L) => {
        P.set(7.5, 2.6, -4 - st * 0.25);
        L.set(0, 2.4, -9);
      },
      // floor skim under the rider's platform
      (st, a, t, P, L) => {
        P.set(Math.sin(st * 0.3) * 2.5, 0.8, 0 - st * 0.2);
        L.set(0, 2.6, -12);
      },
      // high behind the rider, sun framed dead center
      (st, a, t, P, L) => {
        P.set(0, 6.5 + Math.sin(st * 0.2), 4);
        L.set(0, 14, -92);
      },
    ],
  };
}
