# MUSICMOVIE

Cinematic visuals synced to house music. Drop in a track you're producing — or
feed it a live DJ set — and it presents the music like a film: characters,
environments, camera direction, title cards and scene changes all driven by
real-time audio analysis.

**Live build:** https://rigozazueta.github.io/musicmovietool/ — deployed from
this branch by GitHub Actions (`.github/workflows/deploy.yml`) on every push.
If the first deploy doesn't appear, enable it once in the repo settings:
*Settings → Pages → Source: GitHub Actions*.

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
- **MIDI** — lock the beat grid to MIDI clock from a DJM mixer, CDJs, Ableton
  or Traktor (see *Syncing to a live DJ set*).

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
- **Scenes switch on phrase boundaries**, matched to the music's mood, rotating
  through the least-recently-seen chapter so the film keeps moving.
- A **drop** (breakdown → peak) is a white-flash hard cut into a peak scene.
- A **breakdown** fades slowly into a calm scene.
- **HDR bloom** that breathes with the music — neon, lasers, strobes and engine
  glows actually *glow* — plus letterbox, film grain, vignette, ACES filmic
  tone mapping, chapter title cards, a *now playing* card, and *FIN* when the
  track ends.

### Chapters

| | Scene | Mood | What's in it |
| --- | --- | --- | --- |
| I | **Neon District** | groove / peak | Rain-slicked city, pulsing windows and neon, a rooftop dancer, a capital ship crawling across the sky |
| II | **Dune Pilgrim** | groove / calm | Twin-sun desert at dusk, a walker stepping on the beat, a colossus half-buried on the horizon |
| III | **Astral Temple** | breakdown | Floating temple in space, hologram-shimmering monk, orbiting orbs, light shafts |
| IV | **The Void** | peak / drops | A dancing crowd in blackness, kick-synced strobe wall, laser fan, hyperspace jump on the drop |
| V | **The Colossus** | peak / breakdown | A giant android over a tiny crowd — chest core burning with the bass, arms rising with the energy |
| VI | **The Fleet** | groove / calm | An armada over a ringed planet, fighters weaving, silent turbolaser volleys when it runs hot |
| VII | **The Grid** | groove / peak | Infinite neon wireframe scrolling one cell per beat, equalizer towers, light trails, a rider on a hover platform |

## Controls

| Key | Action |
| --- | --- |
| `Space` | Play / pause (file source) |
| `1–7` | Force a scene (pauses the auto-director) |
| `A` | Resume auto-director |
| `B` | Mark the downbeat (press on the "one" so bars/phrases line up) |
| `F` | Fullscreen (for the projector) |
| `T` | Show the title card (edit artist/title in the HUD) |
| `L` | Toggle letterbox |
| `H` | Hide the UI |

The UI also auto-hides after a few seconds of no mouse movement.

## Syncing to a live DJ set

Three tiers, combinable:

1. **Audio only (works everywhere):** take the *record* or *booth* out of the
   mixer into a USB audio interface, click **LIVE IN** and pick that input.
   Beats, BPM, and sections are detected from the audio itself.
2. **Audio + MIDI clock (tightest, recommended):** most DJ gear and DAWs
   transmit MIDI clock — DJM mixers and CDJs (set *MIDI clock send* on), Ableton
   (*Link/Tempo/MIDI → Clock out*), Traktor (*send MIDI clock*). Connect the
   gear by USB, click **MIDI** in the HUD and allow access. While ticks are
   flowing the beat grid locks to your gear sample-accurately (`·MIDI` shows
   next to the BPM) and the audio input keeps driving energy and sections.
   Tap `B` on a downbeat once so bars and phrases line up with your phrasing.
3. **Roadmap:** Ableton Link and Pro DJ Link need a tiny local bridge app
   (browsers can't speak UDP) — planned below.

## Driving Unreal Engine, TouchDesigner, Resolume… (LINK)

MUSICMOVIE can act as the *musical brain* for a pro rendering rig: the **LINK**
button streams every beat, BPM, band level, section and drop as **OSC** — the
live-show protocol Unreal, TouchDesigner, Resolume, Notch and MadMapper all
speak. Browsers can't send UDP, so a tiny relay does it:

```bash
npm run bridge                       # WebSocket :7400 → OSC udp://127.0.0.1:8000
npm run bridge -- --osc-host 192.168.1.50 --osc-port 9000   # send to another machine
```

Start the bridge, click **LINK** in the HUD (works from the hosted URL too —
loopback connections are allowed from https), and these arrive in real time:

| OSC address | Args | When |
| --- | --- | --- |
| `/mm/audio` | bpm, bass, mid, high, intensity, phase (floats) | 30 Hz |
| `/mm/bpm` `/mm/bass` `/mm/mid` `/mm/high` `/mm/intensity` | float | 30 Hz |
| `/mm/beat` `/mm/bar` `/mm/phrase` | int counter | on the event |
| `/mm/drop` | — | on a drop |
| `/mm/section` | `groove` / `peak` / `breakdown` | on change |

**Unreal Engine 5:** enable the built-in **OSC** plugin → in a Blueprint call
*Create OSC Server* (`0.0.0.0`, port `8000`) → *Bind Event to On OSC Message
Received* (filter by address) → drive Niagara user parameters, light
intensities and material scalars from `/mm/bass` and friends, spawn bursts on
`/mm/drop`. (UE's *Audio Synesthesia* plugin can analyse audio natively too —
LINK is for keeping this director as the single source of musical truth.)

**TouchDesigner:** add an *OSC In CHOP* on port `8000` — every address shows up
as a channel. **Resolume:** *Preferences → OSC → Input 8000*, then map any
effect/composition parameter to the incoming addresses.

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

## Pushing the look further

What's in the box already gets you a long way: HDR bloom, ACES grading, grain,
letterbox, and art-directed scenes. The realistic ladder from here to
arena-grade visuals:

1. **More in-engine craft (free):** custom shaders (volumetric light, fresnel
   rim glow on characters, SDF environments), higher-detail character rigs,
   post FX like chromatic aberration and anamorphic flares.
2. **AI-generated art assets** *(in use now)*: the Dunes, Temple and Fleet
   chapters wrap AI-painted 2560×1080 backdrops around the scene on a sky dome
   (`addSkyDome` in `src/scenes/common.js`). `scripts/fetch-skies.mjs` pulls
   them automatically before `dev`/`build`; drop your own art at
   `public/skies/{dunes,temple,fleet}.png` to override, or delete the files to
   fall back to fully procedural skies.
3. **Pro pipeline integration:** acts like Anyma run Notch / TouchDesigner /
   Unreal Engine driven by timecode, with content teams. This tool can sit in
   that world today: run it fullscreen and bring the browser window into
   **Resolume / OBS as a capture source**, layered with other content. A later
   step is porting the Director concept onto TouchDesigner or Unreal for
   movie-grade rendering with the same musical brain.

## Ideas / roadmap

- More chapters (ocean abyss, brutalist interior, forest…) and richer rigs
- AI-generated skyboxes and character skins per scene
- Ableton Link / Pro DJ Link via a small local bridge app
- Recording the output to video for music-video exports
- Per-track scene scripting (timeline of chapters for a finished film)
