// The Director treats the track like a script:
//  - cuts camera shots on bar boundaries (faster cutting at higher intensity)
//  - switches scenes on phrase boundaries, matched to the section mood
//  - a drop = white flash + hard cut into a peak scene
//  - a breakdown = slow fade into a calm scene
// Manual scene picks (1-4) pause the auto-director; A resumes it.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export class Director {
  constructor(renderer, audio, scenes, overlays) {
    this.renderer = renderer;
    this.audio = audio;
    this.scenes = scenes;
    this.overlays = overlays;

    this.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 600);

    // HDR bloom is what sells the lasers/neon/strobes — everything emissive
    // above the threshold blooms, and the strength breathes with the music
    this.composer = new EffectComposer(renderer);
    this.composer.setPixelRatio(renderer.getPixelRatio());
    this.renderPass = new RenderPass(scenes[0].scene, this.camera);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.85, 0.55, 0.55);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.index = 0;
    this.auto = true;
    this.titles = true;

    this.shotIndex = 0;
    this.shotTime = 0;
    this.barsInShot = 0;
    this.phrasesInScene = 0;
    this.lastSwitch = 0;
    this.punch = 0;
    this.elapsed = 0;
    this.ended = false;
    this._lastUsed = { 0: 0 };

    this._P = new THREE.Vector3();
    this._L = new THREE.Vector3();

    audio.on('beat', () => { this.punch = 1; });
    audio.on('bar', () => this._onBar());
    audio.on('phrase', () => this._onPhrase());
    audio.on('section', (s) => this._onSection(s));
    audio.on('drop', () => this._onDrop());
  }

  get current() { return this.scenes[this.index]; }

  // ---------- musical events ----------

  _onBar() {
    this.barsInShot++;
    const cutEvery = this.audio.intensity > 0.62 ? 2 : 4;
    if (this.barsInShot >= cutEvery) this._cutShot();
  }

  _cutShot() {
    const n = this.current.shots.length;
    if (n > 1) {
      let next = (Math.random() * n) | 0;
      if (next === this.shotIndex) next = (next + 1) % n;
      this.shotIndex = next;
    }
    this.shotTime = 0;
    this.barsInShot = 0;
  }

  _onPhrase() {
    this.phrasesInScene++;
    // settle into a scene for at least 2 phrases (~30s of house) before moving on
    if (this.auto && this.phrasesInScene >= 2) {
      const next = this._pickScene(this.audio.section);
      if (next !== null) this.switchTo(next, { fadeMs: 350 });
    }
  }

  _onSection(section) {
    if (!this.auto) return;
    if (section === 'breakdown' && this.elapsed - this.lastSwitch > 12) {
      const next = this._pickScene('breakdown');
      if (next !== null) this.switchTo(next, { fadeMs: 900 });
    }
  }

  _onDrop() {
    if (!this.auto) {
      this.overlays.flash(0.85); // honor the drop even in manual mode
      this.current.onDrop?.();
      return;
    }
    const next = this._pickScene('peak');
    if (next !== null) this.switchTo(next, { flash: true });
    else { this.overlays.flash(0.85); this.current.onDrop?.(); }
  }

  _pickScene(section) {
    const mood = section === 'peak' ? 'peak' : section === 'breakdown' ? 'calm' : 'mid';
    const candidates = [];
    this.scenes.forEach((s, i) => {
      if (i !== this.index && s.mood.includes(mood)) candidates.push(i);
    });
    if (!candidates.length) return null;
    // least-recently-used keeps the film rotating through every chapter
    // instead of ping-ponging between two favorites
    candidates.sort((a, b) => (this._lastUsed[a] ?? -1) - (this._lastUsed[b] ?? -1));
    return candidates[0];
  }

  // ---------- scene control ----------

  switchTo(i, { flash = false, fadeMs = 350, manual = false } = {}) {
    if (i === this.index || i < 0 || i >= this.scenes.length) return;
    if (manual) this.setAuto(false);
    if (flash) {
      this.overlays.flash(1);
      this._activate(i, true);
    } else {
      this.overlays.fadeThrough(fadeMs, () => this._activate(i, false));
    }
  }

  _activate(i, wasDrop) {
    this.current.onExit?.();
    this.index = i;
    this._lastUsed[i] = this.elapsed;
    this.shotIndex = (Math.random() * this.current.shots.length) | 0;
    this.shotTime = 0;
    this.barsInShot = 0;
    this.phrasesInScene = 0;
    this.lastSwitch = this.elapsed;
    this.ended = false;
    if (wasDrop) this.current.onDrop?.();
    if (this.titles) {
      this.overlays.title(`chapter ${this.current.numeral}`, this.current.name, '', 2600);
    }
    this.onSceneChange?.(i);
  }

  setAuto(on) {
    this.auto = on;
    this.onAutoChange?.(on);
  }

  end() {
    // track finished: fade out and roll "FIN"
    this.ended = true;
    this.overlays.fadeThrough(1200, () => {
      this.overlays.title('', 'FIN', 'play another track', 6000);
      this.overlays.fadeInFromBlack(2000);
    });
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.composer.setSize(w, h);
  }

  // ---------- per-frame ----------

  update(dt, t) {
    this.elapsed += dt;
    const a = this.audio;
    const sc = this.current;

    this.punch *= Math.exp(-7 * dt);
    this.shotTime += dt;

    sc.update(dt, t, a);

    const shot = sc.shots[this.shotIndex % sc.shots.length];
    shot(this.shotTime, a, t, this._P, this._L);

    // handheld energy: more shake when the music is hotter
    const sh = (sc.shake ?? 0.2) * (0.25 + a.intensity * 0.75);
    this._P.x += (Math.sin(t * 1.7) * 0.06 + Math.sin(t * 4.3) * 0.025) * sh;
    this._P.y += (Math.sin(t * 2.3) * 0.05 + Math.cos(t * 5.1) * 0.02) * sh;
    this._L.x += Math.sin(t * 1.1) * 0.04 * sh;
    this._L.y += Math.cos(t * 1.6) * 0.04 * sh;

    this.camera.position.copy(this._P);
    this.camera.lookAt(this._L);
    this.camera.fov = (shot.fov ?? 55) - this.punch * 2.2; // kick punch-in
    this.camera.updateProjectionMatrix();

    this.renderPass.scene = sc.scene;
    this.renderPass.camera = this.camera;
    this.bloom.strength = 0.55 + a.intensity * 0.55 + this.punch * 0.3;
    this.composer.render();
  }
}
