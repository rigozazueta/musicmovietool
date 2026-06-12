// Shared building blocks for scenes: a procedural humanoid figure that can
// dance or walk in sync with the beat, plus a particle field helper.

import * as THREE from 'three';

function limb(material, w, len) {
  // pivot group sits at the joint; mesh hangs below it
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, len, w), material);
  mesh.position.y = -len / 2;
  const pivot = new THREE.Group();
  pivot.add(mesh);
  return pivot;
}

// A low-poly silhouette figure (~1.8 units tall, feet at y=0) with posable
// hips/shoulders/head. `dance()` and `walk()` are driven by the audio engine.
export function makeFigure({ color = 0x0b0c14, accent = 0x19e3ff, scale = 1 } = {}) {
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accent, emissive: accent, emissiveIntensity: 0.9, roughness: 0.6,
  });

  const legLen = 0.85, torsoH = 0.62, armLen = 0.68;
  const root = new THREE.Group(); // feet at y=0

  const hips = new THREE.Group();
  hips.position.y = legLen;
  root.add(hips);

  const legL = limb(bodyMat, 0.15, legLen); legL.position.set(-0.13, 0, 0);
  const legR = limb(bodyMat, 0.15, legLen); legR.position.set(0.13, 0, 0);
  hips.add(legL, legR);

  const torso = new THREE.Group();
  hips.add(torso);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.46, torsoH, 0.24), bodyMat);
  chest.position.y = torsoH / 2;
  torso.add(chest);

  // thin glowing stripe across the chest — reads as a character, not a prop
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.05, 0.26), accentMat);
  stripe.position.y = torsoH * 0.72;
  torso.add(stripe);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), bodyMat);
  head.position.y = torsoH + 0.24;
  torso.add(head);

  const armL = limb(bodyMat, 0.11, armLen); armL.position.set(-0.29, torsoH - 0.05, 0);
  const armR = limb(bodyMat, 0.11, armLen); armR.position.set(0.29, torsoH - 0.05, 0);
  torso.add(armL, armR);

  root.scale.setScalar(scale);

  const fig = {
    group: root,
    parts: { hips, torso, head, armL, armR, legL, legR },
    phase: Math.random() * Math.PI * 2, // personal offset so crowds don't move in lockstep

    // beatEnv: 1.0 at the beat decaying to 0; energy: 0..1 section intensity
    dance(t, beatEnv, energy) {
      const p = this.phase;
      // house bounce: drop into the knees on the kick
      hips.position.y = legLen - beatEnv * 0.13 - Math.sin(t * 2.1 + p) * 0.015;
      torso.rotation.x = 0.06 + beatEnv * 0.09;
      torso.rotation.y = Math.sin(t * 1.3 + p) * 0.22;
      head.rotation.x = beatEnv * 0.3 - 0.1;

      // arms: groove swing at low energy, hands in the air at peak
      const up = THREE.MathUtils.smoothstep(energy, 0.55, 0.85);
      const swing = Math.sin(t * 4 + p) * 0.45;
      armL.rotation.x = THREE.MathUtils.lerp(swing, -2.7 + Math.sin(t * 6 + p) * 0.25, up);
      armR.rotation.x = THREE.MathUtils.lerp(-swing, -2.7 + Math.cos(t * 6 + p) * 0.25, up);
      armL.rotation.z = THREE.MathUtils.lerp(0.12, 0.45, up);
      armR.rotation.z = THREE.MathUtils.lerp(-0.12, -0.45, up);
      legL.rotation.x = Math.sin(t * 2 + p) * 0.08;
      legR.rotation.x = -Math.sin(t * 2 + p) * 0.08;
    },

    // stride: radians/sec of the walk cycle (tie to BPM for on-beat steps)
    walk(t, stride = 4) {
      const s = Math.sin(t * stride + this.phase);
      const c = Math.cos(t * stride + this.phase);
      legL.rotation.x = s * 0.55;
      legR.rotation.x = -s * 0.55;
      armL.rotation.x = -s * 0.35;
      armR.rotation.x = s * 0.35;
      hips.position.y = legLen + Math.abs(c) * 0.05;
      torso.rotation.x = 0.08;
      torso.rotation.y = s * 0.06;
    },
  };
  return fig;
}

// Static particle cloud; caller animates positions or material each frame.
export function makeParticles({
  count = 500, box = [40, 20, 40], color = 0xffffff, size = 0.12,
  opacity = 0.8, blending = THREE.NormalBlending,
} = {}) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * box[0];
    positions[i * 3 + 1] = Math.random() * box[1];
    positions[i * 3 + 2] = (Math.random() - 0.5) * box[2];
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color, size, transparent: true, opacity, blending,
    depthWrite: false, sizeAttenuation: true,
  });
  return { points: new THREE.Points(geo, mat), positions, geo, mat, count, box };
}

// Sharp attack on the beat, exponential decay between beats.
export function beatEnv(audio, sharpness = 4.5) {
  return Math.exp(-sharpness * audio.beatPhase) * Math.min(1, audio.sBass * 3);
}

// Painted sky: wraps a wide backdrop image (public/skies/*) around the scene
// on an inverted sphere. Mirrored horizontal repeat hides the wrap seam.
// Resolves null headlessly or when the image is missing, so scenes must treat
// the dome as optional decoration.
export function addSkyDome(scene, name) {
  if (typeof window === 'undefined' || typeof document.createElementNS !== 'function') return null;
  const base = import.meta.env ? import.meta.env.BASE_URL : './';
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(420, 36, 20),
    new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  dome.visible = false;
  dome.renderOrder = -1; // behind everything, never writes depth
  new THREE.TextureLoader().load(
    `${base}skies/${name}`,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.MirroredRepeatWrapping;
      tex.repeat.x = 2;
      dome.material.map = tex;
      dome.material.needsUpdate = true;
      dome.visible = true;
    },
    undefined,
    () => scene.remove(dome), // no artwork shipped — keep the procedural sky
  );
  scene.add(dome);
  return dome;
}
