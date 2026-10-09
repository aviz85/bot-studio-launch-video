# Bot Studio — launch film (v2)

A 76.5-second, music-only, sci-fi launch film for **Bot Studio**, built entirely in code with [Remotion](https://www.remotion.dev/) (React, CSS 3D, SVG and Canvas2D; no WebGL, no footage, no narration). Bot Studio's real interface is rebuilt as translucent glass and holographic layers floating in deep space, and every cut, impact and swoosh lands on the 134 BPM soundtrack.

1920×1080 · 60 fps · 4,591 frames · H.264 + AAC. The director's brief is [`docs/DIRECTION.md`](docs/DIRECTION.md).

## Story and edit map

The film is cut to a strict beat grid: one beat = 0.44776 s ≈ 26.87 frames, and `B(k)` in `src/lib.ts` is the global frame of beat `k`. Every cut sits on a beat or a half beat.

| Scene | Beats | Frames | Music | What happens | Copy |
| --- | --- | --- | --- | --- | --- |
| s01 Black box | 0–16 | 0–430 | intro, no kick | A dull chat widget adrift; a colossal monolith of prompt text; it glitches and dies like an old TV | "You know chatbots." · "One giant prompt." · "Why did it say that?" |
| s02 See it think | 16–32 | 430–860 | half-time build, snare roll, near silence | Giant type on a holo floor, a dive into the light, a strobe montage of teasers, then a single charging glint | "What if you could see it think?" · "Introducing" |
| s03 Reveal | 32–40 | 860–1075 | **drop 1** | Flare explosion and shockwave; the avatar forms from glass shards; the app assembles from exploding glass layers | "Bot Studio" · "Bots that think in the open." |
| s04 Build with AI | 40–52 | 1075–1397 | drop 1 groove | A prompt is typed; "Build a proposal" bursts; 4 states / 6 judgments / 5 policies slam in | "Describe it." · "Get a whole bot." |
| s05 States | 52–64 | 1397–1719 | | A holographic state graph of glass orbs, branches and cycles; a light token flies the path | "Map every step. Branch anywhere." |
| s06 Minds & judgments | 64–80 | 1719–2149 | | Judge, Speaker and Clerk monoliths fire into one runtime core; the Judgment editor in macro | "Three minds. One runtime." · "Measure meaning. Get typed signals." |
| s07 Rules & real work | 80–96 | 2149–2579 | fills | A policy assembles like a circuit; Clerk laser-scans fields; a function runs in a background lane | "Decide in rules you can read." · "Real tools. Running in the background." |
| s08 Live | 96–120 | 2579–3224 | breakdown, **drop 2** at 104 (2794) | Near silence, then the Live Dashboard: a 3D Signal Wall pumping to the music, exploded glass layers | "Not another chatbot." · "A bot studio." · "See every signal. Live." · "Every decision, explained." |
| s09 Conversation & code | 120–140 | 3224–3761 | drop 2 groove | Chat in 3D with instant reactions and a background booking; the turn timeline; BotScript projects into UI | "Reacts instantly. Talks naturally." · "Every millisecond, traced." · "One script. For people and agents." |
| s10 Factory & finale | 140–end | 3761–4591 | **final hit** at 160 (4298) | An infinite wall of glass bot cards; a montage of the real designs; logo, tagline and feature pills | "A bot that builds bots." · "Describe." "Build." "See." "Ship." · "Bot Studio" |

Scene boundaries are seamless cross-scene transitions: each scene renders one half (for example s06's last shot whips out and s07's first shot whips in), and the boundary SFX belong to exactly one cue sheet. Timeline and metric values shown in the film are illustrative, not benchmarks.

## Render

Requirements: Node 18+, `ffmpeg`, and Python 3 with `numpy` and `scipy` (for the sound mix). Fonts: Inter, Inter Display, DejaVu Sans Mono, Noto Color Emoji.

```sh
cd launch-video
npm ci
npm run check                 # TypeScript, must be 0 errors
python3 sfx/mix.py            # music + all SFX cue sheets → public/mix.wav (render.mjs also does this when stale)
npm run render                # copies the designs, then node render.mjs → out/bot-studio-launch.mp4
```

- `render.mjs` decodes `public/music.mp3` → `public/music.wav` if it is missing, re-runs the mix when any cue sheet is newer than `public/mix.wav`, and renders with `CONCURRENCY` tabs (default 4). It auto-detects a Chromium headless shell under `/opt/pw-browsers`; set `BROWSER_EXECUTABLE` to use another one.
- `npm run assets` copies `../outputs/designs/*.png` into `public/designs/` (used by the s10 montage).
- The soundtrack is delayed 2 frames (`AUDIO_DELAY_FRAMES` in `src/Root.tsx`): the music's transients sit ~30 ms ahead of the beat grid, and with the delay the drops at 860, 2794 and 4298 land within ±10 ms of their flash cuts.
- Measured on the 4-core build box: a full `node render.mjs` at concurrency 4 took **28 min** (1,694 s for 4,591 frames ≈ 0.37 s of wall clock per frame, H.264 CRF 16 ≈ 800 MB master). Full-resolution stills cost more (mean ≈1.7 s, heaviest transition frames ≈3–3.7 s, none above 4 s); they are a quick way to find expensive frames, not a render-time estimate.

## Preview and check tools

```sh
node tools/preview.mjs all --frames 860,2794,4298 --scale 0.5         # stills of the whole film → out/preview/all/ + sheet.jpg
node tools/preview.mjs all --range 0-4590:27 --scale 0.4 --cols 8     # one frame per beat: the whole film on one sheet
node tools/preview.mjs s05 --range 1397-1719:13 --grade               # one scene in isolation (+ the GlobalGrade pass)
node tools/preview.mjs all --video --range 2790-2900:1 --scale 1      # mp4 clip with audio (renderMedia, concurrency 2)
node tools/preview.mjs demo:glass --frames 380,415                    # library showcases: demo:cine, demo:vfx, demo:glass
python3 sfx/mix.py --check                                            # validate every cue sheet
python3 sfx/mix.py --only s08 --audit                                 # one scene's cues + per-cue audibility report
```

## Project layout

| Path | What it is |
| --- | --- |
| `src/Root.tsx` | The `Launch` composition: the ten scenes in `Sequence`s, the `GlobalGrade` finishing pass and `<Audio src="mix.wav">` |
| `src/scenes/registry.ts` | Fixed beat ranges per scene |
| `src/scenes/sNN.tsx`, `src/scenes/sNN/` | The ten scenes (shot list at the top of each file) |
| `src/cine/` | Camera and editing: `World`/`Obj` CSS-3D camera, keyframed moves, speed ramps, depth of field, motion blur, the beat-accurate `Shots` sequencer and its transitions — [`docs/CINE.md`](docs/CINE.md) |
| `src/vfx/` | Light, energy, atmosphere, HUD and finishing: flares, shockwaves, particles, `SpaceBackdrop`, `GlobalGrade` (vignette, grain, letterbox schedule in `GRADE`) — [`docs/VFX.md`](docs/VFX.md) |
| `src/ui/` | The product UI as frost/holo glass: `GlassPane`, `HoloAppFrame`, `SignalBars3D`, `GlassOrbNode`, `HoloGraph`, the `Avatar` — [`docs/GLASS.md`](docs/GLASS.md) |
| `src/lib.ts`, `src/audio.json` | Beat grid `B(k)`, easing, deterministic `rand`, and per-frame audio analysis (`kick`, `band`, `rms`) that drives the Signal Wall, glows and camera pushes |
| `sfx/lib.py`, `sfx/mix.py`, `sfx/cues/` | Procedural, deterministic SFX synthesis (48 kHz), the mixer (ducking, bus compression, true-peak limiter) and one cue sheet per scene — [`sfx/CATALOG.md`](sfx/CATALOG.md) |
| `src/demos/` | Sandboxes for the shared libraries |
| `src/v1/` | The previous version, kept for reference |
| `docs/INTEGRATION_NOTES.md` | Cross-scene issues reported by the scene agents and how integration resolved them |

Rules that keep the film reliable: every frame is a pure function of the frame number (no `Math.random`/`Date`; use `rand(seed)`), all audio helpers take the **global** frame, CSS 3D/SVG/Canvas2D only (software-rendered Chromium), gradients instead of large `filter: blur`s, and key text stays inside x 120–1800, y 130–950 so the letterbox never covers it.

## How it was made

The film was produced by a team of 15 Claude agents working in parallel on one repository, each owning its own files:

- **Director**: the brief, music map, scene registry and contract (`docs/DIRECTION.md`, `src/lib.ts`, `src/Root.tsx`).
- **Four foundation agents**: camera and transitions (`src/cine`), VFX (`src/vfx`), glass UI (`src/ui`) and sound design (`sfx/`), each with a showcase demo and a doc.
- **Ten scene agents**: one per scene (`src/scenes/sNN*` and `sfx/cues/sNN.json`), each previewing its own range with `tools/preview.mjs` and reporting cross-scene issues.
- **Integration editor and re-recording mixer**: whole-film review, seamless boundaries, shared-module fixes, the final SFX pass and mix, the global grade and render reliability.

Music: `public/music.mp3`, the instrumental launch track (134 BPM, F minor). All sound effects are synthesized procedurally; no samples are used.
