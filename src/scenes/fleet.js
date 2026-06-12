// CHAPTER VI — THE FLEET
// An armada hangs in orbit over a ringed planet. Engine glows breathe with
// the bass, fighters thread between the capital ships, and silent turbolaser
// volleys arc across the dark when the energy runs hot.

import * as THREE from 'three';
import { addSkyDome } from './common.js';

function makeCapitalShip(len, hullColor = 0x10141f) {
  const ship = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: hullColor, roughness: 0.85 });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(len, len * 0.085, len * 0.27), hullMat);
  const bow = new THREE.Mesh(new THREE.BoxGeometry(len * 0.3, len * 0.05, len * 0.16), hullMat);
  bow.position.set(len * 0.6, -len * 0.008, 0);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(len * 0.12, len * 0.09, len * 0.08), hullMat);
  bridge.position.set(-len * 0.3, len * 0.08, 0);
  ship.add(hull, bow, bridge);

  const stripMat = new THREE.MeshBasicMaterial({ color: 0x9fd4ff });
  for (const z of [-len * 0.14, len * 0.14]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(len * 0.85, len * 0.004, len * 0.004), stripMat);
    strip.position.set(0, 0, z);
    ship.add(strip);
  }

  const engineMat = new THREE.MeshBasicMaterial({
    color: 0x66b9ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const engines = [];
  for (const z of [-len * 0.08, 0, len * 0.08]) {
    const e = new THREE.Mesh(new THREE.CircleGeometry(len * 0.028, 14), engineMat);
    e.position.set(-len * 0.505, 0, z);
    e.rotation.y = -Math.PI / 2;
    engines.push(e);
    ship.add(e);
  }
  return { group: ship, engineMat };
}

export function createFleetScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030309);
  scene.fog = new THREE.Fog(0x030309, 60, 300);

  const sky = addSkyDome(scene, 'fleet.png'); // painted deep space, if fetched

  scene.add(new THREE.AmbientLight(0x222a44, 1.0));
  const starlight = new THREE.DirectionalLight(0xaec4ff, 1.5);
  starlight.position.set(60, 30, 40);
  scene.add(starlight);

  // ringed planet below the fleet
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(70, 48, 32),
    new THREE.MeshStandardMaterial({ color: 0x2a3a5e, roughness: 1, fog: false }),
  );
  planet.position.set(-40, -95, -160);
  scene.add(planet);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(85, 120, 64),
    new THREE.MeshBasicMaterial({
      color: 0x8da4cf, transparent: true, opacity: 0.18, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }),
  );
  ring.position.copy(planet.position);
  ring.rotation.x = Math.PI / 2.4;
  scene.add(ring);

  // the armada
  const ships = [];
  const specs = [
    [60, 0, 6, -30, 0.15],   // flagship
    [34, -45, 16, -70, 0.3],
    [40, 42, -4, -90, 0.05],
    [26, -25, 26, -120, 0.5],
    [30, 60, 22, -50, -0.1],
    [22, 15, 34, -140, 0.25],
  ];
  for (const [len, x, y, z, yaw] of specs) {
    const s = makeCapitalShip(len);
    s.group.position.set(x, y, z);
    s.group.rotation.y = yaw;
    s.drift = 0.4 + Math.random() * 0.5;
    ships.push(s);
    scene.add(s.group);
  }

  // fighters: fast bright darts weaving through the fleet
  const fighters = [];
  for (let i = 0; i < 10; i++) {
    const f = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.12, 0.12),
      new THREE.MeshBasicMaterial({
        color: i % 2 ? 0x8df6ff : 0xffd9a0, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    f.userData = { off: i * 2.1, r: 24 + (i % 5) * 9, h: (i % 4) * 10 - 4, speed: 0.5 + (i % 3) * 0.2 };
    fighters.push(f);
    scene.add(f);
  }

  // silent turbolaser volleys between ships
  const volleys = [];
  for (const [a, b] of [[0, 2], [1, 4], [2, 3], [0, 5]]) {
    const mat = new THREE.LineBasicMaterial({
      color: 0x7dff8a, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const geo = new THREE.BufferGeometry().setFromPoints([
      ships[a].group.position.clone(), ships[b].group.position.clone(),
    ]);
    volleys.push({ line: new THREE.Line(geo, mat), mat, off: Math.random() * 7 });
    scene.add(volleys.at(-1).line);
  }

  // starfield shell
  const starCount = 2400;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const b = Math.acos(Math.random() * 2 - 1);
    const r = 200 + Math.random() * 120;
    starPos[i * 3] = r * Math.sin(b) * Math.cos(a);
    starPos[i * 3 + 1] = r * Math.cos(b);
    starPos[i * 3 + 2] = r * Math.sin(b) * Math.sin(a);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xdde6ff, size: 0.7, transparent: true, opacity: 0.8, depthWrite: false, fog: false,
  });
  scene.add(new THREE.Points(starGeo, starMat));

  const flagship = ships[0].group;

  return {
    name: 'THE FLEET',
    numeral: 'VI',
    mood: ['mid', 'calm'],
    shake: 0.15,
    scene,

    update(dt, t, audio) {
      const env = Math.exp(-3.5 * audio.beatPhase) * Math.min(1, audio.sBass * 3);

      for (let i = 0; i < ships.length; i++) {
        const s = ships[i];
        s.group.position.x += dt * s.drift * 0.3;
        s.group.position.y += Math.sin(t * 0.1 + i * 2) * dt * 0.3;
        if (s.group.position.x > 90) s.group.position.x = -90;
        s.engineMat.opacity = 0.4 + audio.sBass * 0.6;
      }

      const fSpeed = 0.4 + audio.intensity * 0.9;
      for (const f of fighters) {
        const u = f.userData;
        const a = t * u.speed * fSpeed + u.off;
        const x = Math.cos(a) * u.r;
        const z = -70 + Math.sin(a) * u.r * 0.9;
        const y = u.h + Math.sin(a * 2.3) * 6;
        // bank into the turn by aiming at the next path point
        f.position.set(x, y, z);
        f.lookAt(
          Math.cos(a + 0.1) * u.r,
          u.h + Math.sin((a + 0.1) * 2.3) * 6,
          -70 + Math.sin(a + 0.1) * u.r * 0.9,
        );
        f.rotateY(Math.PI / 2);
      }

      // volleys arc when the section runs hot, flashing off the bar pulse
      const hot = THREE.MathUtils.smoothstep(audio.intensity, 0.55, 0.8);
      for (const v of volleys) {
        v.mat.opacity = hot * env * (Math.sin(t * 2 + v.off) > 0.2 ? 0.7 : 0);
      }

      starMat.opacity = 0.6 + audio.sHigh * 1.2;
      ring.material.opacity = 0.14 + audio.sMid * 0.15;
      if (sky) sky.material.color.setScalar(0.6 + audio.intensity * 0.25 + env * 0.1);
    },

    shots: [
      // crawling along the flagship hull — the Star Destroyer opening
      (st, a, t, P, L) => {
        P.set(flagship.position.x - 24 + st * 0.9, flagship.position.y - 5, flagship.position.z + 13);
        L.set(flagship.position.x + 30, flagship.position.y, flagship.position.z);
      },
      // fleet panorama over the planet
      (st, a, t, P, L) => {
        const ang = st * 0.05 + 1;
        P.set(Math.cos(ang) * 95, 26 + Math.sin(st * 0.15) * 5, Math.sin(ang) * 95 - 60);
        L.set(0, 4, -70);
      },
      // threading between the ships
      (st, a, t, P, L) => {
        P.set(-30 + st * 1.4, 12 + Math.sin(st * 0.3) * 3, -45 - st * 0.8);
        L.set(30, 8, -100);
      },
      // under the flagship's belly looking up
      (st, a, t, P, L) => {
        P.set(flagship.position.x + 8 - st * 0.6, flagship.position.y - 14, flagship.position.z + 4);
        L.set(flagship.position.x, flagship.position.y, flagship.position.z - 6);
      },
    ],
  };
}
