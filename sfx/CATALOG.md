# Bot Studio SFX catalog

Every sound in the film is synthesized procedurally by `sfx/lib.py` (48 kHz stereo, deterministic) and mixed with the music by `sfx/mix.py`. You write a cue sheet, `sfx/cues/sNN.json`, using the names and params below.

```sh
python3 sfx/mix.py                    # music + all sfx/cues/s*.json -> public/mix.wav (what previews/render use)
python3 sfx/mix.py --only s05 --audit # just your scene -> sfx/build/mix_s05.wav + per-cue audibility report
python3 sfx/mix.py --check            # validate every cue sheet (names, params) without rendering
python3 sfx/mix.py --sheet draft.json --audit   # render any cue file (e.g. a draft) -> sfx/build/mix_sheet.wav
python3 sfx/lib.py render whoosh '{"dur":1.2,"direction":"rl"}'   # one-shot -> sfx/build/audition/whoosh.wav
python3 sfx/check.py whoosh           # analytic QA of one sound (peak, centroid, bands, tail...)
```

A full mix takes about 7–10 s warm and about 20 s cold (measured with the 104-cue demo). One-shots are cached in `sfx/build/cache` and invalidated automatically when `lib.py` changes. Every run rewrites `public/mix.wav` atomically, so previews always read a valid file.

---

## 1. Cue format and conventions

```json
{"scene": "s03", "cues": [
  {"frame": 860, "sfx": "boom",   "gain_db": -3, "pan": 0,   "params": {}},
  {"frame": 887, "sfx": "whoosh", "gain_db": -10, "pan": 0.2, "params": {"direction": "rl", "dur": 0.7}, "note": "layers fly apart"}
]}
```

| field | meaning |
| --- | --- |
| `frame` | **Global** frame (60 fps), the same as `B(k)` in `src/lib.ts`. The sound's **sync point** lands on this frame (see below). |
| `sfx` | A name from this catalog. Unknown names are errors. |
| `gain_db` | Level. Every one-shot is normalized to a **-1 dBFS peak at 0 dB**, so this is negative. If you omit it, the recommended gain applies. |
| `pan` | Static placement from -1 (left) to 1 (right), power-normalized. It is added on top of any internal motion (`direction`). |
| `params` | Sound parameters (see each entry). Unknown params are errors. Omitted params use their defaults. |
| `offset_ms` | Optional nudge in milliseconds (+ is later). Use it for deliberate flams and pre-hits. |
| `send` | Optional reverb send, 0–1, overriding the per-sound default (0–0.18). Raise it for "far away" and use 0 for "in your face". |
| `duck_db` | Optional dB that this cue ducks the music. Defaults: boom 3.5, impact 2.5, shockwave and sub_drop 1.5, stamp 0.8, others 0. Set 0 to disable. |
| `note` / `comment` | Free text, ignored. |

**Sync points: the cue frame is the moment that matters.** You never compute lead-ins yourself.

- `onset`: the transient or first event lands on the frame. Used by hits and UI sounds.
- `peak`: the loudest instant of a pass-by lands on the frame. Used by `whoosh`, `whip` and `fly_by`. **Put the cue on the cut or pass frame.** The whoosh starts before it.
- `end`: the sound **ends** on the frame, the cut or climax. Used by `riser`, `swoosh_rev`, `reverse_cymbal`, `suck_in` and `power_up` (where the "ready" ping lands on the frame). A `riser` with `beats: 8` cued at 860 starts at beat 24.
- Sounds with a `pre` param (`impact`, `boom`, `flare_sting`) keep their sync on the hit. The reverse swell plays **before** the cue frame.

**Timing is sample-locked to the music.** The music's transients sit 30 ms ahead of the `k·PER` grid, and `mix.py` compensates. Frames within 0.6 of a 1/16-note position are snapped to the exact musical time, so a hit on `B(k)` lands exactly on the kick. Both 4298 and 4299 snap to beat 160.

**Variation:** repeated sounds should change `seed` (1, 2, 3, …), and optionally `pitch` by ±3–8%, so they don't sound machine-gunned. Each seed is a different take of the same sound.

**Key and tempo:** tonal sounds default to **F minor** (the music's key): `blip`, `confirm`, `flare_sting`, `sparkle`, `hum_holo`, `power_up`, `data_chatter` and `shimmer`. Safe `note` values are F, G, Ab, Bb, C, Db and Eb, and the pentatonic subset F, Ab, Bb, C and Eb always works. One beat is 0.4478 s = 26.87 frames.

---

## 2. Film timing cheat-sheet

| moment | beat | frame | music | SFX approach |
| --- | --- | --- | --- | --- |
| Intro | 0–16 | 0–430 | soft, no kick, about 8 dB quieter | **gains -4 to -6 dB lower** than the recommendations; sparse, delicate sounds |
| Build | 16–24 | 430–645 | half-time kicks on 16, 18, 20 and 22 (430, 484, 537, 591) | `pulse` can double the kicks |
| Snare roll / riser | 24–30 | 645–806 | accelerating | micro-flash teasers: `tick`, short `glitch`, `zap`, `blip` |
| **Near silence** | 30–32 | 806–860 | the suck-in | `suck_in` ending at **860**, plus at most one glint. Keep it otherwise empty. |
| **DROP 1** | 32 | **860** | full kick every beat | `boom` + `flare_sting` (+ `shockwave`) |
| Drop 1 groove | 32–96 | 860–2579 | dense: a kick on every beat masks low thuds on downbeats | half-beat stamps; clear mid/high sounds |
| **Breakdown** | 96–104 | 2579–2794 | almost silent, about 10 dB quieter | **gains -4 to -6 dB lower**; `heartbeat_sub`, `hum_holo`, then a riser |
| **DROP 2** | 104 | **2794** | full | `riser` + `reverse_cymbal` ending 2794, then `boom` + `flare_sting` |
| Drop 2 groove | 104–160 | 2794–4298 | dense (small gaps at about beats 141 and 145) | same as drop 1 |
| **Final hit** | 160 | **4299** (4298 also snaps) | final hit + reverb tail | `boom` (`tail: 1.3`) + `flare_sting` + `shimmer` |
| Tail | 160–171 | 4299–4591 | reverb tail, fading | very quiet only (-20 dB or lower) |

Beat → frame (`B(k)`): 4→107, 8→215, 12→322, 16→430, 20→537, 24→645, 28→752, 30→806, 31→833, 32→860, 33→887, 34→913, 36→967, 40→1075, 44→1182, 48→1290, 52→1397, 56→1504, 60→1612, 64→1719, 68→1827, 72→1934, 76→2042, 80→2149, 84→2257, 88→2364, 92→2472, 96→2579, 100→2687, 104→2794, 108→2901, 112→3009, 116→3116, 120→3224, 124→3331, 128→3439, 132→3546, 136→3654, 140→3761, 144→3869, 148→3976, 152→4084, 154→4137, 156→4191, 158→4245, 160→4299. Half beat ≈ +13 frames.

---

## 3. Index

| sfx | category | sync | default length | rec. gain | use it for |
| --- | --- | --- | --- | --- | --- |
| `whoosh` | motion | peak | 0.8 s | -9 | camera moves, panels flying past, zoom-throughs |
| `whip` | motion | peak | 0.28 s | -9 | whip-pan cuts, fast snaps |
| `fly_by` | motion | peak | 2.4–3 s | -8 | big fly-throughs, objects passing the lens |
| `swoosh_rev` | motion | end | 1.0 s | -9 | reverse swell into a cut or zoom-through |
| `shockwave` | motion | onset | 2 s | -7 | shockwave wipes, energy rings |
| `impact` | impact | onset | 2.3 s | -5 | cinematic hits, scene-change slams |
| `boom` | impact | onset | 4.5 s | -3 (-2 on drops) | drops 860 and 2794, the final hit 4299 |
| `sub_drop` | impact | onset | 2 s | -10 | sub weight under a hit (felt more than heard) |
| `hit_metal` | impact | onset | 2.2 s | -10 | bright metallic or glass hits, logo pings |
| `stamp` | impact | onset | 0.55 s | -7 | cards, panels and blocks slamming into place |
| `glass_tick` | impact | onset | 0.5 s | -14 | crystalline small hits, glints, nodes landing |
| `riser` | build | end | 8 beats | -9 | build-ups into a drop or reveal |
| `downlifter` | build | onset | 3.3 s | -12 | falling energy after a hit, into the breakdown |
| `reverse_cymbal` | build | end | 2 s | -11 | swell into a hit (layer with the riser) |
| `suck_in` | build | end | 1.2 s | -8 | inhale that cuts dead, the silence before the drop |
| `glitch` | digital | onset | 0.4 s (+tail) | -11 | glitch cuts, corrupted text, "black box" moments |
| `data_chatter` | digital | onset | 1.2 s | -16 | data streaming, signal walls, background processing |
| `scan` | digital | onset | 1.2 s | -14 | laser scans, measurement bars, targeting reticles |
| `zap` | digital | onset | 0.35 s | -12 | light tokens, energy bolts, beams firing |
| `power_up` | digital | end | 1.4 s + tail | -12 | a panel or monolith charging up and turning on |
| `power_down` | digital | onset | 1.9 s | -12 | switching off, the old chatbot dying |
| `hum_holo` | digital | onset | 4 s (any) | -20 | holographic ambience bed under a shot |
| `blip` | ui | onset | 0.14 s | -16 | nodes lighting, chips, notifications (pitched) |
| `click` | ui | onset | 0.03 s | -17 | buttons and selections |
| `tick` | ui | onset | 0.02 s | -19 | hover, HUD ticks, cursor steps |
| `type_keys` | ui | onset | n/rate s | -13 | typing (prompt box, chat input, code) |
| `confirm` | ui | onset | 1.5 s | -14 | success, ✓, proposal ready |
| `pop` | ui | onset | 0.13 s | -15 | chat bubbles, reactions, chips popping in |
| `counter_roll` | ui | onset | 0.8–1 s | -16 | numbers counting up, the timeline 0 → 1,240 ms |
| `toggle` | ui | onset | 0.11 s | -16 | switches, radio selections |
| `shimmer` | light | onset | 1.5 s (+tail) | -14 | light sweeps across glass, sheens, glitter |
| `flare_sting` | light | onset | 2.6 s (+0.18 s pre) | -8 | lens flares, logo reveals, hero moments |
| `sparkle` | light | onset | 0.7 s (+tail) | -13 | small magic moments, tagline and chip sparkles |
| `pulse` | low | onset | 0.6 s | -9 | low pulse doubling half-time kicks |
| `heartbeat_sub` | low | onset | 0.7 s | -14 | tension in quiet passages (breakdown, intro) |

---

## 4. Sounds in detail

Ranges are the sensible range for each param, and `seed` is available on every sound. "Gain" is a starting point for the dense drop sections; go 4–6 dB lower in the intro and breakdown.

### Motion

**`whoosh`**: an air swoosh. Stereo noise runs through a moving band-pass whose center rises toward the pass and falls after it (doppler), with an air shelf at the pass, a low body layer, an optional faint sci-fi tonal doppler, and an L→R or R→L pan sweep. It is airy and smooth.
- Params: `dur` 0.8 (0.3–2.0) · `peak` 0.6 (0.1–0.95, where in `dur` the pass sits) · `pitch` 1.0 (0.5 = huge and dark, 1.5 = small and fast) · `brightness` 0.6 (0–1) · `direction` "lr" | "rl" | "none" · `width` 0.85 (0–1, the pan travel) · `weight` 0.4 (0–1, low body) · `tone` 0.12 (0–0.6, tonal doppler) · `air` 0.35 (0–1, hiss at the pass).
- Gain: -9 for a featured transition, -12 to -14 for background camera drift, -15 in the intro.
- Use it: **cue it on the frame where the object passes the camera, or on the cut** of a move-through. Set `direction` to match on-screen motion (camera pans right, so content moves left: use "rl"). For slow cranes and dollies use `dur` 1.5–2.0, `pitch` 0.6–0.7, `direction` "none" and `peak` 0.7. For a zoom-through use `dur` 0.6, `pitch` 1.2 and `direction` "none". Panels exploding apart in Z can each get a short whoosh (`dur` 0.5) with different seeds and pans.

**`whip`**: a very short, fast "fwip" for whip pans, with a tiny cloth crack at the snap.
- Params: `dur` 0.28 (0.15–0.45) · `pitch` 1.0 · `brightness` 0.7 · `direction` "lr" | "rl" | "none" · `width` 0.9.
- Gain: -8 to -10.
- Use it: **cue it on the cut frame of the whip pan.** The snap lands there and the swish leads in about 10 frames. Set `direction` to the direction the image moves. In montages with one word per 2 beats, put one whip per cut and alternate "lr" and "rl" with different seeds.

**`fly_by`**: a big pass-by with jet noise, a doppler engine tone ("neeyow"), low rumble, and a full L→R pan.
- Params: `dur` 2.4 (1.2–4) · `pitch` 1.0 · `rumble` 0.7 (0–1) · `engine` 0.6 (0–1, tonal amount) · `brightness` 0.6 · `direction` · `width` 1.0.
- Gain: -8 to -10.
- Use it: low-angle fly-throughs between graph orbs and long lateral tracking shots past the Signal Wall or the wall of bot cards. **Cue it on the frame where the camera is closest to the object** (the middle of the move). The sound occupies about ±1.2 s around the cue, so use one per move. Lower `engine` to 0.2 if the music is busy in the mids.

**`swoosh_rev`**: a reverse swell (reverse reverb plus a rising band) that ends in a hard cut.
- Params: `dur` 1.0 (0.4–2.5; `2*0.4478` = 2 beats) · `pitch` · `brightness` · `direction` "none" | "lr" | "rl" (comes in from that side) · `width`.
- Gain: -9 to -11.
- Use it: zoom-throughs and fly-into-a-panel transitions. **Cue it on the cut frame:** the swell builds and stops exactly on the cut. Pair it with an `impact` or `stamp` on the same frame for a "pull … SLAM" feel.

**`shockwave`**: an expanding blast. A low thump plus a downward air burst plus crackle, with a stereo image that starts narrow and widens.
- Params: `dur` 1.6 (0.8–3) · `pitch` · `brightness`.
- Gain: -7 to -9 (it ducks the music 1.5 dB).
- Use it: shockwave wipes, energy rings and a flash-cut on an impact. **Cue it on the frame the ring starts expanding.** At the drop it layers well under `boom` + `flare_sting` at -9.

### Impacts

**`impact`**: a cinematic hit. A pitch-dropping sub sine (137 → 42 Hz), a punchy knock, a crack, a low-mid "thud" body, a filtered noise burst that darkens, low drum modes, and a hall tail. It is designed to still read on laptop speakers.
- Params: `dur` 3.0 · `pitch` 1.0 (0.6–1.5) · `punch` 1.0 (0–1.5, transient) · `brightness` 0.5 · `tail` 1.0 (0.3–2) · `sub` 1.0 (0–1.5) · `pre` 0.0 (0–1.5 s of reverse swell **before** the hit).
- Gain: -5 (-3 to -7). It ducks the music about 2.5 dB.
- Use it: scene-change slams, energy hitting the runtime core, a panel locking in hard, flash cuts. **Cue it on the impact frame.** Don't put it on the same frame as `boom`: both own the sub. Use `pre: 0.5` instead of a separate riser for a quick "whoom-BANG".

**`boom`**: a huge sub boom for drops. Deep sub (114 → 29 Hz, long), a whomp, a crack, a fireball body, and a long, wide hall tail.
- Params: `dur` 5.5 · `pitch` · `brightness` 0.5 · `tail` 1.0 (0.5–1.5; use 1.3 for the final hit) · `pre` 0.0.
- Gain: -3 (-2 on drops 1 and 2, -3 on the final hit). It ducks the music 3.5 dB.
- Use it: **only at the three big moments: 860 (drop 1), 2794 (drop 2) and 4299 (final hit).** Using it elsewhere cheapens those moments; use `impact` instead.

**`sub_drop`**: a pure sub sine gliding down (95 → 28 Hz), lightly saturated.
- Params: `dur` 2.0 (0.8–4) · `pitch` · `drive` 1.5 (0–3).
- Gain: -10 (-8 to -12).
- Use it: add weight under an `impact` or `stamp` at big reveals. It is felt more than heard, so always pair it with something audible. Never stack it with `boom`, which already has its own.

**`hit_metal`**: a bright metallic or glass hit (modal synthesis with inharmonic partials, a strike and a short thump) that rings 1–2 s.
- Params: `dur` 2.5 · `pitch` 1.0 (0.6–2) · `brightness` 0.7 · `material` "metal" | "glass" · `weight` 0.4 (thump) · `tail` 1.0.
- Gain: -10 to -13.
- Use it: the logo or title landing as a glass "ping" (`material` "glass"), monoliths locking, a typed signal chip snapping on. It works well on a half beat after a big hit.

**`stamp`**: a UI slam for cards, panels and blocks landing. A short sub thump, a "thock" body, a 2 kHz clack and an optional glassy ring.
- Params: `dur` 0.7 · `pitch` 1.0 (0.8–1.3) · `weight` 0.55 (0–1, thump) · `clack` 1.0 (0–1.5, the snap that cuts through dense music) · `ring` 0.25 (0–1, glass overtone).
- Gain: -7 (-6 to -10). It ducks the music 0.8 dB.
- Use it: "4 states / 6 judgments / 5 policies slam in", When/AND/Then blocks, montage words, glass layers stacking. **Cue it on the frame the element hits its final position** (the end of its scale-in or overshoot). **In the drops the kick masks thuds on downbeats.** Measured: stamps on half beats read clearly (+11 dB SMR), while stamps on downbeats get buried. Prefer half beats (`B(k+0.5)`), or on a downbeat use `{"weight": 0.3, "clack": 1.3}` at -6. In a sequence, vary `seed` and `pitch` (1.0, 1.05, 1.1) and pan each one to its card's screen position.

**`glass_tick`**: a crystalline small hit, with high inharmonic partials and a tick.
- Params: `dur` 0.45 · `pitch` 1.0 (0.7–1.6) · `brightness` 0.7.
- Gain: -14 (-12 to -18).
- Use it: a glint on an edge, small nodes landing, a rim light catching, a reticle locking. In a run, pitch them up (1.0, 1.12, 1.26) for ascending sparkle.

### Builds and transitions

**`riser`**: a build-up. Sweeping noise, a detuned F-minor chord gliding up an octave, Shepard tones, and an optional tempo-synced stutter that accelerates from 1/8 to 1/32 notes. It ends **on** the cue frame.
- Params: `beats` 8 (2–16) or `seconds` (wins if set) · `pitch` · `brightness` 0.7 · `noise_amt` 0.8 · `tones` 0.5 · `shepard` 0.5 · `stutter` 0.0 (0–1) · `end` "cut" (dead stop at the frame) | "tail" (short bloom after it).
- Gain: -9 (-8 to -12).
- Use it: **drop 2: cue it at 2794 with `beats: 8` and `stutter: 0.6`** (it starts at beat 96 = 2579). **Drop 1: the music falls silent at 806**, so end the riser there with `beats: 6`, cued at 806, and let `suck_in` carry 806–860. Don't run a riser through the silence. For smaller reveals use `beats: 2–4`.

**`downlifter`**: falling energy. A noise band falling from 6 kHz to 150 Hz, a falling tone, and a small sub hit at the start.
- Params: `dur` 2.5 (1–5) · `pitch` · `brightness` · `hit` 0.4 (0–1, initial sub thump).
- Gain: -12 (-14 at the breakdown).
- Use it: right after a big hit as the camera settles, and **at 2579 (beat 96) into the breakdown**. Cue it on the frame the energy starts falling.

**`reverse_cymbal`**: a reversed crash swelling into the sync point.
- Params: `dur` 2.0 (0.5–4; `4*0.4478` = 4 beats) · `brightness` 0.7.
- Gain: -11 to -13.
- Use it: **cue it on the hit frame** with a `boom` or `impact` on the same frame. It layers with the `riser` into drop 2 (2794, dur 4 beats) and makes a nice lead-in to the final hit (4299).

**`suck_in`**: a reverse swell and inhale (reverse reverb, rising band, sub swell) that **cuts dead** at the end.
- Params: `dur` 1.2 (0.4–2) · `pitch` · `brightness` 0.5.
- Gain: -8 (-6 to -10).
- Use it: **cue it at 860 with `dur: 0.8955` (2 beats)** so it fills 806–860 and cuts exactly at drop 1. You can do the same into 2794 with `dur` 0.45–0.9 if the picture "inhales". Nothing else should play under it except one glint.

### Digital

**`glitch`**: digital chaos. A stepped FM, square and noise source chopped into 4–50 ms slices with buffer-repeat stutters, bitcrush, reverse, pitch jumps and gaps, hard-panned per slice.
- Params: `dur` 0.4 (0.1–1.5) · `intensity` 0.7 (0–1) · `pitch` · `crush_amt` 0.6 · `tonal` 0.5 (0 = noisy, 1 = beepy) · `stereo` 0.8.
- Gain: -11 in the drops, -14 to -16 in the intro.
- Use it: glitch cuts (cue it on the cut, `dur` 0.15–0.3), corrupted prompt text, "Why did it say that?", the black-box moments in s01. Every glitch should use a different `seed`.

**`data_chatter`**: fast random digital blips in F-minor pentatonic plus random high blips, with a faint bitcrushed bed.
- Params: `dur` 1.2 (0.3–4) · `density` 28 per second (8–60) · `pitch` · `spread` 0.7 (pan spread) · `bed` 0.3.
- Gain: -16 (-14 to -20).
- Use it: the Signal Wall coming alive, BotScript streaming, a function running in a background lane (pan it to the lane's side), Clerk activity. Keep it under the music as texture.

**`scan`**: a laser scan sweep. A sweeping resonant saw, a moving comb (flanged) noise and a laser "zzz" buzz, panning across, with an optional "target locked" chirp at the end.
- Params: `dur` 1.2 (0.4–3) · `pitch` · `direction` "lr" | "rl" | "none" · `sweep` "up" | "down" · `buzz` 0.6 (0–1) · `lock` true.
- Gain: -14 (-12 to -17).
- Use it: Clerk laser-scanning fields, a measurement bar filling (`sweep` "up"), reticles locking, scan lines over the prompt monolith. Match `dur` to the scan's on-screen duration (frames / 60), and `direction` to its travel.

**`zap`**: a short energy or laser zap (a downward FM chirp plus a spark).
- Params: `dur` 0.35 (0.15–0.8) · `pitch` · `direction` "none" | "lr" | "rl".
- Gain: -12 (-12 to -16).
- Use it: a light token leaving a node, an energy bolt from the Generate button, monoliths firing into the core. Cue it on the launch frame.

**`power_up`**: a charging whine that accelerates upward and lands on a "ready" ping (C7) plus a thump. Sync is the ping.
- Params: `dur` 1.4 (rise length, 0.5–3) · `pitch` · `brightness`.
- Gain: -12 (-15 in the intro).
- Use it: a panel or monolith turning on, the chat window booting in s01, energy charging before it fires. **Cue it on the frame the thing switches on.** The whine rises over the preceding `dur` seconds.

**`power_down`**: an "off" clunk, then a whine winding down with slowing flutter.
- Params: `dur` 1.4 · `pitch` · `brightness`.
- Gain: -12 (-15 to -19 in the breakdown).
- Use it: the old chatbot dying ("Not another chatbot."), a UI dimming out, the very end of the film (at -24).

**`hum_holo`**: a holographic hum bed. An F drone, beating high partials, electric buzz and air, with slow movement. It fades in and out by itself.
- Params: `dur` 4.0 or `beats` (wins if set; any length) · `pitch` 1.0 · `movement` 0.5 (0–1) · `brightness` 0.5.
- Gain: -20 in the drops, -22 to -24 in quiet sections.
- Use it: under holographic close-ups, the lone chat window in s01, macro shots of the Judgment editor, the breakdown. Cue it at the shot start with `beats` equal to the shot length.

### UI

**`blip`**: a pitched UI blip (sine with a tiny pitch drop, or FM, square or glass).
- Params: `note` "C6" (any note name or MIDI number; in key: F, G, Ab, Bb, C, Db, Eb) · `freq` (Hz, overrides `note`) · `dur` 0.14 (0.05–0.4) · `kind` "sine" | "fm" | "square" | "glass" · `bend` 0 (semitones over the blip) · `width` 0.3.
- Gain: -16 (-14 to -20).
- Use it: nodes lighting in sequence. Climb the pentatonic scale, for example C6 → Eb6 → F6 → Ab6 → C7, one per node. Chips appearing, signals passing a threshold (`kind` "fm"). Pan each blip to its node's x position.

**`click`**: a short, clean UI click.
- Params: `brightness` 0.6 · `pitch` 1.0.
- Gain: -17 (-14 for a hero button press).
- Use it: buttons (Generate, Run), selecting a row or tab, the cursor clicking. Cue it on the press frame.

**`tick`**: a tiny high tick.
- Params: `pitch` 1.0.
- Gain: -19.
- Use it: hover, HUD timecode ticks, a reticle stepping, micro-flash teasers. Several ticks on 1/16 notes make a nice HUD rhythm. In the drops, avoid half beats (open hats mask it) or use `blip` instead.

**`type_keys`**: a fast, clean keyboard typing burst with a key-release click, a space bar every few keys and humanized timing.
- Params: `n_keys` 12 (1–60) · `rate` 14 keys per second (6–25) · `humanize` 0.3 · `softness` 0.4 · `spread` 0.25.
- Gain: -12 to -13 in the drops (it is easily masked there), -17 in quiet sections.
- Use it: holographic prompt typing (s04), the chat input (s01), BotScript streaming in (s09). Set `n_keys` to about the characters typed ÷ 2 (sounds tighter than one per character), and set `rate` so that `n_keys / rate` equals the typing shot's duration in seconds. Cue it on the first character's frame.

**`confirm`**: a pleasant success chime: 2–3 rising FM-bell notes with an optional 1/8-note ping-pong echo.
- Params: `notes` ["Ab5","C6","Eb6"] (any list; ["C6","F6"] is a two-note variant) · `spacing` 0.075 s · `decay` 0.7 · `brightness` 0.5 · `echo` 0.3 (0–1).
- Gain: -14 (-12 to -16).
- Use it: proposal ready, a ✓ result, a function returning, deploy success. Use it once per scene at most, because it's a "moment".

**`pop`**: a bubble or message pop (a fast upward chirp).
- Params: `pitch` 1.0 (0.8–1.5) · `dur` 0.14.
- Gain: -15 (-14 to -18).
- Use it: chat bubbles appearing (cue it on the frame the bubble scales in), reactions, chips. For alternating speakers use `pitch` 1.0 and 1.12, with a slight pan for each side of the chat.

**`counter_roll`**: a rapid ticking roll (counter or odometer) that slows down and lands on a glass blip.
- Params: `dur` 0.8 (0.3–2.5) · `rate` 32 ticks per second · `pitch` · `rise` 5 semitones · `decel` 0.5 (0–1) · `land` true.
- Gain: -16.
- Use it: numbers counting up, "4 states / 6 judgments" counters, **the turn timeline 0 → 1,240 ms** (set `dur` to the count-up duration). Cue it on the frame counting starts.

**`toggle`**: a switch: a click plus a short blip gliding up ("on") or down ("off").
- Params: `state` "on" | "off" · `pitch`.
- Gain: -16.
- Use it: switches, Global/State scope toggles, "Score" being selected, radio chips.

### Light

**`shimmer`**: sparkly high glitter. Random high grains (half of them in key) plus a rising sheen, with a bright reverb.
- Params: `dur` 1.5 (0.5–4) · `brightness` 0.7 · `density` 70 per second · `tonal` 0.5 · `sweep` 0.6 (sheen rising).
- Gain: -14 (-12 to -20).
- Use it: **a light sweep across glass** (cue it at the sweep start, with `dur` equal to the sweep length), lens flare tails, bokeh, the logo glow. It sits high and clear, above the music.

**`flare_sting`**: a bright tonal sting. A short reverse swell (`pre` 0.18 s before the frame) into a shimmering Fm(add9) supersaw and bell chord, a white "flash", glitter and a wide tail.
- Params: `dur` 2.6 · `pitch` 1.0 · `brightness` 0.7 · `pre` 0.18 (0–0.6) · `chord` ["F4","C5","G5","Ab5","C6"].
- Gain: -8 (-8 to -10).
- Use it: **anamorphic lens flares, the logo forming from light, hero reveals.** It belongs at drop 1 (860), drop 2 (2794) and the final hit (4299), layered with `boom`. Elsewhere use it at most once per scene, around -12.

**`sparkle`**: a short magic sparkle: a fast rising arpeggio of tiny bells (F-minor pentatonic) plus dust.
- Params: `dur` 0.7 · `pitch` 1.0 · `count` 7 (3–12) · `direction` "lr" | "rl" | "none".
- Gain: -13 (-12 to -16).
- Use it: tagline reveals, typed-signal chips orbiting, a small "aha", a pistachio accent lighting. Set `direction` to match the reveal's direction.

### Low pulses

**`pulse`**: a single low pulse (a soft sub thump with audible harmonics).
- Params: `dur` 0.6 · `pitch` 1.0 · `drive` 1.6.
- Gain: -9 (-9 to -13).
- Use it: doubling the half-time kicks in the build (430, 484, 537, 591) with a micro camera push, or a dark "thoom" on a glitch-free beat in the intro.

**`heartbeat_sub`**: a low "lub-dub".
- Params: `count` 2 · `gap` 0.24 s · `pitch` 1.0.
- Gain: -14 (-16 in the breakdown).
- Use it: tension in quiet passages (the breakdown at beats 96–104, the end of the intro), the "is it alive?" moment. Cue one every 2 beats at most.

---

## 5. Recipes (copy, then adjust frames, pans and seeds)

**Drop 1 (860).** The near silence from 806 to 860 holds only the suck-in and one glint:
```json
{"frame": 806, "sfx": "riser",       "gain_db": -10, "params": {"beats": 6, "stutter": 0.5}},
{"frame": 819, "sfx": "glass_tick",  "gain_db": -20, "params": {"pitch": 1.2}},
{"frame": 860, "sfx": "suck_in",     "gain_db": -8,  "params": {"dur": 0.8955}},
{"frame": 860, "sfx": "boom",        "gain_db": -2,  "params": {}},
{"frame": 860, "sfx": "flare_sting", "gain_db": -9,  "params": {}},
{"frame": 860, "sfx": "shockwave",   "gain_db": -9,  "params": {}}
```
**Drop 2 (2794):** `riser` (`beats` 8, `stutter` 0.6) at -10 plus `reverse_cymbal` (`dur` 1.79) at -13, both cued at 2794, then `boom` at -2 and `flare_sting` at -10 at 2794 (`seed` 2 so it differs from drop 1).
**Final hit (4299):** `reverse_cymbal` (`dur` 1.79) at -13, `boom` (`tail` 1.3, `seed` 3) at -3, `flare_sting` (`seed` 3) at -8 and `shimmer` (`dur` 2.5) at -15. Afterwards, only quiet sounds (≤ -20).

**Transitions:**
- **Whip-pan cut:** `whip` on the cut frame at -9, `direction` set to the image's motion. Add a `stamp` (`weight` 0.3) at -10 on the same frame if the new shot slams in.
- **Zoom-through:** `swoosh_rev` (`dur` 0.6–0.9) ending on the cut at -10, then `whoosh` (`dur` 0.6, `direction` "none", `peak` 0.2) at -12 on the cut so you emerge with air.
- **Glitch cut:** `glitch` (`dur` 0.2, new seed) on the cut at -11, plus optionally a `tick` 2 frames later.
- **Flash cut on an impact:** `impact` at -5 plus `shimmer` (`dur` 0.8) at -16.
- **Shockwave wipe:** `shockwave` at -7 on the frame the ring starts.
- **Light-leak dissolve:** `shimmer` (`dur` equal to the dissolve length, `sweep` 0.8) at -15 plus `whoosh` (`dur` 1.4, `pitch` 0.7, `brightness` 0.3, `direction` "none") at -15.

**UI moments:**
- **Button → energy burst:** `click` at -14, plus `zap` at -12 and `shimmer` (`dur` 1.0) at -16 on the same frame.
- **Cards slamming in sequence** on half beats: `stamp` with seeds 1, 2, 3, `pitch` 1.0, 1.05, 1.1, panned to each card.
- **Nodes lighting:** `blip` with C6, Eb6, F6, Ab6 and C7, one per node at -17, panned to the node's x position.
- **Chat:** `pop` per bubble (`pitch` 1.0 for the user, 1.12 for the bot, pan ±0.3), plus `type_keys` while typing.
- **Background function lane:** `data_chatter` (`dur` equal to the lane duration, `density` 18) at -18, panned to the lane, then `confirm` with ["C6","F6"] at -14 on the ✓.
- **Holographic macro shot:** `hum_holo` (`beats` equal to the shot length) at -21, plus `scan` for the measurement bar.

---

## 6. Mixing etiquette (keep the SFX *with* the music)

1. **At most about 3 big hits per bar** (one bar is 4 beats ≈ 107 frames). Big means `boom`, `impact`, `shockwave`, `flare_sting`, `stamp` or `fly_by`. Reserve `boom` for 860, 2794 and 4299.
2. **At most 3 sounds on one frame**, and give them different jobs: one low (impact/boom/stamp), one mid (whoosh/glitch) and one bright (shimmer/flare/tick). Two sub sounds on the same frame (`boom` + `impact` + `sub_drop`) turn to mud and hit the limiter.
3. **Levels:** hits -3 to -7 · whooshes and transitions -9 to -12 · textures (chatter, hum, scan) -14 to -22 · UI blips, clicks, pops and ticks **-14 to -20**.
4. **Quiet sections** (intro 0–430, the silence 806–860, the breakdown 2579–2794 and the tail after 4299) have music 8–10 dB quieter, so **lower your gains by 4–6 dB** there. `--audit` flags anything that's HOT.
5. **Dodge the drums.** In the drops the **kick sits on every downbeat** and **open hats sit on every half beat** (measured: 4–8 kHz is about 20 dB hotter on half beats).
   - Low thuds (`stamp`, `pulse`, `impact`) read best on **half beats**, or rely on `clack` and bright layers. Don't fight the kick with more sub.
   - High ticks and glints (`tick`, `glass_tick`, `shimmer` onsets) read best on **downbeats or quarter positions**. On a half beat the hat swallows them.
   - **Fast UI sounds** (`click`, `tick`, `pop`, `blip`) placed exactly on a beat share that instant with a drum transient, even in the intro. The clearest slots are the **1/16 positions between drum hits**, `B(k+0.25)` and `B(k+0.75)` (about ±7 frames). For example, a button `click` at `B(43.75)` followed by the energy burst on `B(44)`. Otherwise raise them 3–4 dB.
6. **Use pan for movement and placement:** pan ≈ (screen x − 960) / 960 × 0.7, and keep within ±0.8. Use `direction` for things that travel. Keep big hits centered.
7. **Vary repeats** with `seed` (and ±3–8% `pitch`). Never trigger the identical one-shot 4 or more times in a row.
8. **Respect the silences.** 806–860 is the suck-in and nothing else (plus one glint). Leave gaps in the drops too (beats around 141 and 145).
9. **Check your scene:** `python3 sfx/mix.py --only sNN --audit`. Aim for "clear" on featured cues and "subtle" on textures. Fix anything flagged HOT, keep BURIED only if intentional, and keep the "limiter working" warnings away from your frames.

---

## 7. Example cue sheet (`sfx/cues/s03.json`, drop reveal)

```json
{
  "scene": "s03",
  "cues": [
    {"frame": 860,  "sfx": "boom",        "gain_db": -2,  "pan": 0,    "params": {}, "note": "DROP 1"},
    {"frame": 860,  "sfx": "flare_sting", "gain_db": -9,  "pan": 0,    "params": {}, "note": "flare explosion"},
    {"frame": 860,  "sfx": "shockwave",   "gain_db": -9,  "pan": 0,    "params": {}},
    {"frame": 887,  "sfx": "whoosh",      "gain_db": -11, "pan": 0,    "params": {"direction": "rl", "dur": 0.7}, "note": "glass layers fly apart"},
    {"frame": 900,  "sfx": "stamp",       "gain_db": -9,  "pan": -0.3, "params": {"seed": 1}, "note": "layer 1 lands (half beat 33.5)"},
    {"frame": 927,  "sfx": "stamp",       "gain_db": -9,  "pan": 0,    "params": {"seed": 2, "pitch": 1.05}},
    {"frame": 954,  "sfx": "stamp",       "gain_db": -9,  "pan": 0.3,  "params": {"seed": 3, "pitch": 1.1}},
    {"frame": 967,  "sfx": "hit_metal",   "gain_db": -13, "pan": 0,    "params": {"material": "glass"}, "note": "'Bot Studio' title ping"},
    {"frame": 994,  "sfx": "sparkle",     "gain_db": -14, "pan": 0.2,  "params": {"direction": "lr"}, "note": "tagline"},
    {"frame": 1075, "sfx": "swoosh_rev",  "gain_db": -10, "pan": 0,    "params": {"dur": 0.8955}, "note": "zoom-through into s04"}
  ]
}
```

`sfx/cues/_demo.json` exercises every sound across the whole film (104 cues). Render it with `python3 sfx/mix.py --demo` (to `sfx/build/mix_demo.wav`; it never touches `public/mix.wav`).

## 8. Mix chain (for reference)

Each cue is synthesized (and cached), panned, gained and placed at its sync point. The SFX bus gets a send to a synthetic 1.9 s hall (pre-delay 24 ms, low-cut 220 Hz) and then a gentle 2:1 bus compressor (threshold -9 dBFS). The music bed sits at **-3 dB** and is sidechain-ducked under `boom`, `impact`, `shockwave`, `sub_drop` and `stamp`. Mix = bed + SFX, followed by a true-peak look-ahead limiter at **-1 dBTP**, TPDF dither, and output to 48 kHz 16-bit stereo, the exact length of `music.wav`. The file is written atomically, so previews never read a half-written file. With no cue sheets the output is the music bed only (-15.7 LUFS).
