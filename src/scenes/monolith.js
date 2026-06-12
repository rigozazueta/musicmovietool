// CHAPTER VIII — THE MONOLITH
// A vast screen slab floating in the dark, playing AI-generated film loops
// (public/videos/*) to a small crowd. Clips cut on phrase boundaries, the
// picture breathes with the kick, and drops slam the hyperspace reel on.
// With no videos fetched it falls back to a band-driven test card.

import * as THREE from 'three';
import { makeFigure, makeParticles, beatEnv } from './common.js';

const CLIPS = ['awaken.mp4', 'crowd.mp4', 'nebula.mp4', 'hyper.mp4'];
const HYPER = 3; // reserved for drops; phrase rotation cycles the others

export function createMonolithScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030308);
  scene.fog = new THREE.Fog(0x030308, 40, 160);

  scene.add(new THREE.AmbientLight(0x181c2c, 1.0));
  // the screen's light wash over the crowd
  const wash = new THREE.PointLight(0xbfd4ff, 30, 90, 1.6);
  wash.position.set(0, 14, -16);
  scene.add(wash);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 300),
    new THREE.MeshStandardMaterial({ color: 0x05060c, roughness: 0.25, metalness: 0.7 }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // the monolith: 16:9 slab with a thin glowing frame
  const screenMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(48, 27), screenMat);
  screen.position.set(0, 16, -30);
  scene.add(screen);
  const frameMat = new THREE.MeshBasicMaterial({ color: 0x8df6ff });
  for (const [w, h, x, y] of [[48.8, 0.25, 0, 13.65], [48.8, 0.25, 0, -13.65], [0.25, 27.6, -24.4, 0], [0.25, 27.6, 24.4, 0]]) {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.25), frameMat);
    edge.position.set(x, 16 + y, -30);
    scene.add(edge);
  }
  const backing = new THREE.Mesh(
    new THREE.BoxGeometry(49, 28, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x07080f, roughness: 0.9 }),
  );
  backing.position.set(0, 16, -30.8);
  scene.add(backing);

  // side light columns, alternating with the bars
  const columns = [];
  for (const x of [-32, 32]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.8, 30, 0.8), new THREE.MeshBasicMaterial({ color: 0xff2d78 }));
    c.position.set(x, 15, -26);
    columns.push(c);
    scene.add(c);
  }

  const crowd = [];
  for (let i = 0; i < 18; i++) {
    const fig = makeFigure({ color: 0x07080f, accent: 0x2c3a50, scale: 0.9 + Math.random() * 0.2 });
    fig.group.position.set((Math.random() - 0.5) * 26, 0, 2 + Math.random() * 12);
    fig.group.rotation.y = Math.PI + (Math.random() - 0.5) * 0.3; // facing the screen
    crowd.push(fig);
    scene.add(fig.group);
  }

  const haze = makeParticles({
    count: 500, box: [80, 36, 90], color: 0x5a6cae, size: 0.12, opacity: 0.18,
    blending: THREE.AdditiveBlending,
  });
  scene.add(haze.points);

  // ---------- the projection booth ----------

  const headless = typeof window === 'undefined';
  const base = import.meta.env ? import.meta.env.BASE_URL : './';
  const videos = [];
  if (!headless) {
    for (const name of CLIPS) {
      const el = document.createElement('video');
      el.muted = true;
      el.loop = true;
      el.playsInline = true;
      el.preload = 'metadata';
      el.src = `${base}videos/${name}`;
      const tex = new THREE.VideoTexture(el);
      tex.colorSpace = THREE.SRGBColorSpace;
      const v = { el, tex, ok: false };
      el.addEventListener('canplay', () => { v.ok = true; });
      el.addEventListener('error', () => { v.ok = false; });
      videos.push(v);
    }
  }

  // test card fallback: band-driven color bars when no clip is available
  const cardCanvas = document.createElement('canvas');
  cardCanvas.width = 64;
  cardCanvas.height = 36;
  const cardCtx = cardCanvas.getContext('2d');
  const cardTex = new THREE.CanvasTexture(cardCanvas);
  cardTex.colorSpace = THREE.SRGBColorSpace;
  cardTex.magFilter = THREE.NearestFilter;

  let clipIndex = 0;
  let lastPhrase = -1;
  let dropUntil = -1;
  let elapsed = 0;

  function show(i) {
    clipIndex = i;
    const active = videos[i];
    for (const v of videos) if (v !== active) v.el.pause();
    if (active && active.ok !== false) {
      screenMat.map = active.tex;
      active.el.play().catch(() => {});
    }
    screenMat.needsUpdate = true;
  }

  function pauseAll() {
    for (const v of videos) v.el.pause();
  }

  return {
    name: 'THE MONOLITH',
    numeral: 'VIII',
    mood: ['mid', 'peak'],
    shake: 0.3,
    scene,

    onDrop() {
      if (videos[HYPER]?.ok) {
        dropUntil = elapsed + 8;
        show(HYPER);
      }
    },
    onExit: pauseAll,

    update(dt, t, audio) {
      elapsed += dt;
      const env = beatEnv(audio);

      const active = videos[clipIndex];
      if (active?.ok && screenMat.map !== active.tex) show(clipIndex);
      if (active?.ok && active.el.paused) active.el.play().catch(() => {});

      // cut to the next loop every phrase; fall back off the drop reel
      const phrase = Math.floor(audio.beatCount / 32);
      if (dropUntil > 0 && elapsed > dropUntil) {
        dropUntil = -1;
        show(phrase % HYPER);
      } else if (phrase !== lastPhrase) {
        lastPhrase = phrase;
        if (dropUntil < 0) show(phrase % HYPER);
      }

      if (!active || !active.ok) {
        // no footage: animated test card from the band levels
        cardCtx.fillStyle = '#05050a';
        cardCtx.fillRect(0, 0, 64, 36);
        const bands = [[audio.sBass, '#ff2d78'], [audio.sMid, '#19e3ff'], [audio.sHigh, '#ffffff']];
        bands.forEach(([level, color], i) => {
          cardCtx.fillStyle = color;
          const h = Math.min(1, level * 1.6) * 30;
          cardCtx.fillRect(8 + i * 18, 33 - h, 12, h);
        });
        cardTex.needsUpdate = true;
        if (screenMat.map !== cardTex) {
          screenMat.map = cardTex;
          screenMat.needsUpdate = true;
        }
      }

      // the picture breathes with the kick
      screenMat.color.setScalar(0.7 + env * 0.45 + audio.intensity * 0.15);
      screen.scale.setScalar(1 + env * 0.008);
      frameMat.color.setHSL((0.52 + audio.barCount * 0.01) % 1, 0.9, 0.55 + env * 0.2);
      wash.intensity = 18 + env * 50 + audio.sMid * 25;
      for (let i = 0; i < columns.length; i++) {
        columns[i].material.color.setScalar(0.4 + (audio.beatCount % 2 === i ? env : env * 0.2) * 1.6);
      }

      for (const fig of crowd) fig.dance(t, env, audio.intensity * 0.85);

      const pos = haze.positions;
      for (let i = 0; i < haze.count; i++) {
        pos[i * 3] += dt * 0.5;
        if (pos[i * 3] > 40) pos[i * 3] = -40;
      }
      haze.geo.attributes.position.needsUpdate = true;
    },

    shots: [
      // through the crowd toward the screen
      (st, a, t, P, L) => {
        P.set(Math.sin(st * 0.2) * 4, 2.4, 20 - Math.min(st * 0.5, 9));
        L.set(0, 14, -30);
      },
      // vast wide: the slab dwarfing everyone
      (st, a, t, P, L) => {
        const ang = st * 0.05 + 0.5;
        P.set(Math.cos(ang) * 48, 10 + Math.sin(st * 0.15) * 4, Math.sin(ang) * 30 + 18);
        L.set(0, 14, -30);
      },
      // low floor skim with reflections
      (st, a, t, P, L) => {
        P.set(-14 + st * 0.8, 1.1, 8);
        L.set(0, 16, -30);
      },
      // from beside the screen looking back at the lit crowd
      (st, a, t, P, L) => {
        P.set(20 - st * 0.2, 12, -24);
        L.set(0, 1.5, 8);
      },
    ],
  };
}
