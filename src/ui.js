// HUD wiring: sources, transport, scene buttons, readouts, keyboard, idle-hide.

const $ = (id) => document.getElementById(id);

function fmtTime(s) {
  if (!isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export function createUI({ audio, midi, director, overlays }) {
  const splash = $('splash');
  const btnPlay = $('btn-play');
  const seek = $('seek');
  const timeEl = $('time');
  const bpmEl = $('bpm');
  const sectionEl = $('section');
  const beatDot = $('beat-dot');
  const intensityFill = $('intensity-fill');
  const btnAuto = $('btn-auto');
  const metaArtist = $('meta-artist');
  const metaTitle = $('meta-title');

  let seeking = false;
  let beatFlashUntil = 0;

  // ---------- sources ----------

  const sourceButtons = { file: $('btn-file'), mic: $('btn-mic'), tab: $('btn-tab') };
  function markSource(type) {
    Object.entries(sourceButtons).forEach(([k, b]) => b.classList.toggle('active', k === type));
    splash.classList.add('hidden');
  }

  function loadFile(file) {
    if (!file || !file.type.startsWith('audio')) return;
    audio.useFile(file).then(() => {
      markSource('file');
      // "Artist - Title.wav" → credits
      const base = file.name.replace(/\.[^.]+$/, '');
      const dash = base.indexOf(' - ');
      const artist = dash > 0 ? base.slice(0, dash) : '';
      const title = dash > 0 ? base.slice(dash + 3) : base;
      metaArtist.value = artist;
      metaTitle.value = title;
      showTrackCard();
    }).catch((e) => console.warn('file load failed', e));
  }

  function showTrackCard() {
    overlays.title('now playing', metaTitle.value || 'untitled', metaArtist.value, 3800);
  }

  $('btn-file').addEventListener('click', () => $('file-input').click());
  $('file-input').addEventListener('change', (e) => loadFile(e.target.files[0]));

  $('btn-mic').addEventListener('click', async () => {
    try { await audio.useMic(); markSource('mic'); }
    catch (e) { console.warn(e); overlays.title('', 'MIC BLOCKED', 'allow microphone access', 2500); }
  });

  $('btn-tab').addEventListener('click', async () => {
    try { await audio.useTab(); markSource('tab'); }
    catch (e) { console.warn(e); overlays.title('', 'NO TAB AUDIO', 'tick “share tab audio” in the picker', 3000); }
  });

  const btnMidi = $('btn-midi');
  btnMidi.addEventListener('click', async () => {
    try {
      await midi.enable();
      splash.classList.add('hidden');
      overlays.title('midi clock', 'SYNC ARMED', 'waiting for ticks from your gear', 3000);
    } catch (e) {
      console.warn(e);
      overlays.title('', 'NO MIDI', e.message, 3000);
    }
  });

  // drag & drop anywhere
  addEventListener('dragover', (e) => { e.preventDefault(); document.body.classList.add('dragging'); });
  addEventListener('dragleave', (e) => { if (!e.relatedTarget) document.body.classList.remove('dragging'); });
  addEventListener('drop', (e) => {
    e.preventDefault();
    document.body.classList.remove('dragging');
    loadFile(e.dataTransfer.files[0]);
  });

  // ---------- transport ----------

  btnPlay.addEventListener('click', () => audio.togglePlay());
  audio.mediaEl.addEventListener('play', () => { btnPlay.innerHTML = '&#10074;&#10074;'; });
  audio.mediaEl.addEventListener('pause', () => { btnPlay.innerHTML = '&#9654;'; });
  audio.on('trackend', () => director.end());

  seek.addEventListener('input', () => { seeking = true; });
  seek.addEventListener('change', () => {
    const d = audio.mediaEl.duration;
    if (isFinite(d)) audio.mediaEl.currentTime = (seek.value / 1000) * d;
    seeking = false;
  });

  // ---------- scenes ----------

  const sceneGroup = $('hud-scenes');
  const sceneButtons = director.scenes.map((s, i) => {
    const b = document.createElement('button');
    b.textContent = s.numeral;
    b.title = s.name;
    b.addEventListener('click', () => director.switchTo(i, { manual: true, fadeMs: 250 }));
    sceneGroup.insertBefore(b, btnAuto);
    return b;
  });

  function refreshSceneButtons() {
    sceneButtons.forEach((b, i) => b.classList.toggle('active', i === director.index));
    btnAuto.classList.toggle('active', director.auto);
  }
  director.onSceneChange = refreshSceneButtons;
  director.onAutoChange = refreshSceneButtons;
  refreshSceneButtons();

  btnAuto.addEventListener('click', () => director.setAuto(!director.auto));

  // ---------- meta / misc ----------

  $('btn-card').addEventListener('click', showTrackCard);
  $('btn-full').addEventListener('click', toggleFullscreen);

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  }

  // ---------- keyboard ----------

  addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
    audio.resume(); // any key counts as the user gesture browsers want
    switch (e.code) {
      case 'Space': e.preventDefault(); audio.togglePlay(); break;
      case 'KeyF': toggleFullscreen(); break;
      case 'KeyA': director.setAuto(true); break;
      case 'KeyB': audio.alignDownbeat(); break; // mark the "one" live
      case 'KeyT': showTrackCard(); break;
      case 'KeyL': overlays.toggleLetterbox(); break;
      case 'KeyH': document.body.classList.toggle('ui-hidden'); break;
      default:
        if (e.code.startsWith('Digit')) {
          const n = Number(e.code.slice(5)) - 1;
          if (n >= 0 && n < director.scenes.length) {
            director.switchTo(n, { manual: true, fadeMs: 250 });
          }
        }
    }
  });
  addEventListener('pointerdown', () => audio.resume());

  // ---------- idle hide ----------

  let idleTimer = 0;
  function wake() {
    document.body.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => document.body.classList.add('idle'), 3500);
  }
  addEventListener('mousemove', wake);
  addEventListener('pointerdown', wake);
  wake();

  // ---------- per-frame readouts ----------

  let acc = 0;
  return {
    update(dt, now) {
      if (audio.beat) beatFlashUntil = now + 0.1;
      beatDot.classList.toggle('hit', now < beatFlashUntil);

      acc += dt;
      if (acc < 0.12) return; // 8 Hz is plenty for text
      acc = 0;

      const midiLive = audio.midiLive;
      bpmEl.textContent = audio.bpm > 0
        ? `${audio.bpm.toFixed(0)} BPM${midiLive ? ' ·MIDI' : ''}`
        : '--- BPM';
      sectionEl.textContent = audio.active ? audio.section : '—';
      intensityFill.style.width = `${(audio.intensity * 100).toFixed(0)}%`;
      btnMidi.classList.toggle('active', midiLive);

      if (audio.sourceType === 'file' && !seeking) {
        const d = audio.mediaEl.duration;
        if (isFinite(d) && d > 0) {
          seek.value = String((audio.mediaEl.currentTime / d) * 1000);
          timeEl.textContent = fmtTime(audio.mediaEl.currentTime);
        }
      }
    },
  };
}
