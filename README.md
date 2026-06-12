# MUSICMOVIE

Cinematic visuals synced to house music. Drop in a track you're producing — or
feed it a live DJ set — and it presents the music like a film: characters,
environments, camera direction, title cards and scene changes all driven by
real-time audio analysis.

## Quick start

```bash
npm install
npm run dev
```

Open the printed URL (usually `http://localhost:5173`), then either:

- **Drop an audio file** anywhere on the page (`LOAD TRACK` also works), or
- **LIVE IN** — listen to your mic / line-in. Route your DJ mixer's booth or
  record out into an audio interface and pick it as the browser input. Voice
  processing (echo cancellation / noise suppression) is disabled so the music
  comes through untouched.
- **TAB AUDIO** — capture sound from another browser tab (rekordbox web,
  SoundCloud, Spotify web…). Tick *"share tab audio"* in the picker.

`npm run build` produces a static `dist/` you can host anywhere.

## How it syncs

The audio engine (Web Audio API) analyses every frame:

| Signal | Drives |
| --- | --- |
| Bass band (25–150 Hz) | Beat detection, kick-synced pulses (lights, sun, strobe) |
| Mid band (250–2k Hz) | Sky colors, laser sweeps, neon washes |
| High band (4k–12k Hz) | Star twinkle, hi-hat shimmer |
| Beat / BPM | Character dance bounce, walk cadence, camera punch-ins |
| Bars / 32-beat phrases | Camera cuts and scene changes land on musical boundaries |
| Intensity envelope | Section detection: `groove` / `peak` / `breakdown` |

Beat detection is tuned for four-on-the-floor: kick energy spiking above its
rolling average, folded into the 84–165 BPM range.

## The movie

A **Director** turns those signals into film grammar:

- Camera **shots cut on bar boundaries** — faster cutting when the energy is up,
  plus handheld shake and a subtle punch-in on every kick.
- **Scenes switch on phrase boundaries**, matched to the music's mood.
- A **drop** (breakdown → peak) is a white-flash hard cut into a peak scene.
- A **breakdown** fades slowly into a calm scene.
- Letterbox, film grain, vignette, ACES filmic tone mapping, chapter title
  cards, a *now playing* card, and *FIN* when the track ends.

### Chapters

| | Scene | Mood | What's in it |
| --- | --- | --- | --- |
| I | **Neon District** | groove / peak | Rain-slicked city, pulsing windows and neon, a rooftop dancer |
| II | **Dune Pilgrim** | groove / calm | Endless dusk desert, a walker stepping on the beat, breathing sun, birds |
| III | **Astral Temple** | breakdown | Floating temple in space, meditating monk, orbiting orbs, shimmering stars |
| IV | **The Void** | peak / drops | A dancing crowd in blackness, kick-synced strobe wall, laser fan, confetti |

## Controls

| Key | Action |
| --- | --- |
| `Space` | Play / pause (file source) |
| `1–4` | Force a scene (pauses the auto-director) |
| `A` | Resume auto-director |
| `F` | Fullscreen (for the projector) |
| `T` | Show the title card (edit artist/title in the HUD) |
| `L` | Toggle letterbox |
| `H` | Hide the UI |

The UI also auto-hides after a few seconds of no mouse movement.

## Architecture

```
src/
  audio.js       AudioEngine — sources, FFT bands, beat/BPM, sections, events
  director.js    Director — shot cutting, scene switching, camera, film grammar
  overlays.js    DOM layer — grain, flash, fades, title cards, letterbox
  ui.js          HUD wiring, keyboard, idle-hide
  scenes/
    common.js    Procedural dancing/walking figure rig + particle helper
    neon.js      I  — Neon District
    dunes.js     II — Dune Pilgrim
    temple.js    III — Astral Temple
    voidclub.js  IV — The Void
```

Each scene is self-contained: it owns a `THREE.Scene`, an `update(dt, t, audio)`
and a list of camera *shots*. Adding a chapter = adding one file that returns
`{ name, numeral, mood, scene, update, shots }` and registering it in
`src/main.js`.

## Ideas / roadmap

- More chapters (forest, ocean, brutalist interior…) and more character rigs
- AI-generated backdrops and character skins per scene
- MIDI clock / Ableton Link input for sample-accurate beat sync
- Recording the output to video for music-video exports
- Per-track scene scripting (timeline of chapters for a finished film)
