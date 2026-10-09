# VFX library — `src/vfx`

Everything a scene needs for light, energy, atmosphere, HUD garnish and finishing. All components are
**deterministic** (pure functions of the frame; `hash`/`prng`, never `Math.random`), **CSS / SVG / Canvas2D only**,
and tuned for the software-rendered headless Chromium we render with.

```tsx
import {SpaceBackdrop, HoloGrid, DustField, FlareBurst, Shockwave, EnergyBurst, Flash, impulse} from '../vfx';
import {B, kick} from '../lib'; // beat helpers live in lib, not vfx
```

Showcase: `src/demos/vfx.tsx` (10 vignettes × 60 frames) →
`node tools/preview.mjs demo:vfx --frames 20,72,84,150,212,250,336,390,470,515,560 --scale 0.5`.

---

## 0. Conventions (read once)

| Topic | Rule |
| --- | --- |
| **Coordinates** | `x`, `y`, rects etc. are **frame pixels in a 1920×1080 space**. Canvas effects draw into a 1920×1080 canvas styled `100%×100%` of their parent — mount them in a full-frame `AbsoluteFill` (not inside a scaled card) unless you want them to scale with it. |
| **Timing** | Every component has an optional `frame` prop. Default = `useCurrentFrame()` (**local** to your scene Sequence). `at` / `start` props are on the same timeline as `frame`. For a scene starting at `from`, the drop at global `B(32)` is local `B(32) - from`. |
| **Audio** | Audio-reactive components (`SpaceBackdrop`) take `from` (your scene's `from`) so they can read `band/kick` on the GLOBAL frame. Others take `boost` (0..1) — feed `kick(f + from)` yourself. |
| **Transients** | Effects with `at`/`start` return `null` (zero cost) outside their active window, so it is fine to leave them mounted for the whole scene. |
| **Blending** | Light is drawn additively (`lighter`) into transparent canvases. Canvas effects composite with `blend='normal'` by default: for premultiplied light that is mathematically identical to `screen` for white light and near-identical for tinted light, but **~10× cheaper** in our software renderer (~4 ms vs ~40 ms per full-frame layer). Pass `blend="screen"` only if a tinted light must stay purely additive over bright UI. DOM effects (LightLeak, LightStreak, Swoosh, Flash) use real `mix-blend-mode: screen`. Effects light whatever is *below them in the same stacking context* — mount them above the layers they should light. |
| **Wrappers** | `Bloom`, `ChromaticAberration`, `Glitch` wrap children. **Children using `backdrop-filter` (frosted glass) lose their backdrop inside a filtered wrapper** (they only see siblings inside the wrapper) — wrap the glass *and* what is behind it, or apply the wrapper to the content layer only. `Bloom` renders its children 2–3× (canvases inside redraw per copy). |
| **Colours** | Colour props accept hex or names: `cyan #7FE7FF`, `violet #8C6BEA`, `lilac #CDBBFF`, `pistachio #E7F4B9`, `amber`, `magenta`, `rose`, `ice`, `white`. Palette object: `VC`. |
| **Determinism** | Use `seed` to get a different but repeatable variation (flares, particles, glitch, leaks). |

### Performance at a glance

Measured on the 4-core build box (shared with other renders, so ±15%). **Δ video** = extra wall-clock ms per frame in
`renderMedia` at concurrency 2 (the real render path; ≈ half the CPU cost), effect in its active phase, versus an empty frame.
**Still** = `renderStill --scale 1` total including ≈ 350 ms screenshot/encode baseline (stills re-raster everything, so they over-state static layers).

| Effect | Δ video ms/frame | Notes |
| --- | ---: | --- |
| `GlobalGrade` | **16** | every frame; static vignette + transform-moved grain field + letterbox |
| `SpaceBackdrop` | 15 | opaque single canvas (soft layers half-res); nebula texture generated once per page and cached |
| `HoloGrid` / `HoloTunnel` | 15 / 9 | Canvas2D projection |
| `DustField` / `Bokeh` / `Sparkles` / `Embers` | 0–2 each | sprites on one canvas |
| `EnergyBurst` | 4 | |
| `Glint`, `HUDFrame`, `Vignette`, `Letterbox` | 0–3 | |
| `DataRain` | 12 | ~1–2k `fillText` |
| `LightStreak` | 13 | |
| `Reticle` + `DataTicker` | 13 | |
| `Scanlines` | 15 | |
| `GodRays` | 18 | |
| `SpeedLines` | 19 | |
| `VolumetricBeams` (2 beams) | 19 | |
| `Shockwave` / `distort` | 19 / 23 | |
| `FilmGrain` (`blend='normal'`) | 21 | `'overlay'` ≈ 50 |
| `Swoosh` | 24 | short-lived |
| `Flash` (`bloom`) | 26 | short-lived |
| `ChromaticAberration` | 33 | full-frame SVG filter (still +80) |
| `LensFlare` | 47 | |
| `LightLeak` | 47 | DOM screen blobs; short-lived |
| `Bloom` / `cheap` | 50 / 10 | depends on children's area |
| `FlareBurst` | 67 | during its first ~30 frames, then less |
| `Glitch` | ≈ 85 | full-frame SVG filter (still +125…+160; more if frosted glass is inside). Size the wrapper to the content via `style` to shrink the filter area |
| `Shockwave refract` | **173** | backdrop-filter — one hero hit only |

Full-res stills of the combined showcase vignettes (several effects + UI + `GlobalGrade`, incl. baseline): **600–960 ms**;
the glitch vignette (Glitch over a frosted panel) ≈ 1.1–1.3 s. Baseline empty frame: ~65 ms (video), ~350 ms (still).

Budget guidance: the director's budget is ~1.2 s/frame. A typical rich shot — `SpaceBackdrop + HoloGrid + DustField + LensFlare + UI + GlobalGrade` — stays well inside it.
Avoid stacking more than one of `Glitch` / `ChromaticAberration` / `Bloom` over the full frame at the same time, and keep `Shockwave refract` for one hero moment.

---

## 1. Light

### `LensFlare`
Anamorphic flare: hot white core, hairline horizontal streak (cyan) with glow + blue haze, two faint parallel violet streaks,
a vertical spike, two-layer starburst (seeded irregular rays, slowly counter-rotating), iris ghosts (discs, rings, hexagons,
octagons — pistachio/magenta/amber/violet) mirrored through the optical centre, and a partial rainbow ring ghost. One canvas, additive inside (`blend='normal'` compositing by default — see Blending).

| prop | type | default | notes |
| --- | --- | --- | --- |
| `x`, `y` | number | — | source position (px) |
| `intensity` | number | 1 | 0 = off (returns null), 2+ = blown out. Glows scale with √intensity so bursts stay crisp, not milky |
| `scale` | number | 1 | size of core/glows/ghosts |
| `streak` | number | 1 | streak length (1 ≈ 2600 px) |
| `color` / `secondary` | string | cyan / violet | streak tint / parallel streaks + glow tint |
| `ghosts` | number | 1 | ghost strength (0 = off). Ghosts get stronger the further the source is from centre |
| `rays` | number | 14 | starburst ray count (0 = off) |
| `ring` | boolean | true | rainbow ring ghost |
| `veil` | number | 0.6 | wide horizontal haze band |
| `center` | [x, y] | [960, 540] | optical axis the ghosts mirror through |
| `flicker` | number | 0.4 | subtle intensity shimmer |
| `seed`, `frame`, `blend` (`'normal'`, see Blending), `style` | | | |

```tsx
// flare riding a light source that drifts across the top of frame
<LensFlare x={interpolate(t, [0, 120], [300, 1500])} y={260} intensity={0.9} />
// behind a logo: smaller, no ghosts
<LensFlare x={960} y={430} scale={0.7} ghosts={0} ring={false} />
```
Tips: animate `x` slowly — the mirrored ghosts sliding the opposite way is what sells it. Keep `intensity ≤ 1` for sustained flares; use `FlareBurst` for hits.

### `FlareBurst`
A flare that **explodes in** at `at` (3-frame attack, streak shoots outward from 25 % → 140 % length, core punches 1.55×) and decays; plus a short full-frame light veil. Takes all `LensFlare` props except `intensity`.

| prop | type | default | notes |
| --- | --- | --- | --- |
| `at` | number | — | impact frame |
| `dur` | number | 70 | total life (decays to 0) |
| `peak` | number | 1.8 | peak intensity |
| `sustain` | number | 0 | residual intensity it settles to (e.g. 0.5 to leave a lingering flare) |
| `flash` | number | 0.5 | full-frame veil on impact (0 = off) |

```tsx
// THE drop stack (local frames: D = B(32) - from)
<Shockwave x={960} y={540} at={D} rings={3} distort />
<EnergyBurst x={960} y={540} at={D} />
<FlareBurst x={960} y={540} at={D} dur={70} />
<Flash at={D} dur={10} color="cyan" max={0.35} bloom />
```
Tips: use at the drop frames **B(32), B(104), B(160)** and on logo reveals. Pair with an SFX impact on the same frame.

### `Glint`
Small 4-point star (two long spikes + two short diagonals + core) with slow spin. For glass corners, sparkles on a logo, and the **"single glint charging"** at beats 30–31 (animate `intensity` 0 → 1.5).

Props: `x, y` · `size` (180) · `intensity` (1) · `color` (cyan) · `rotate` (0) · `spin` (0.4 °/frame) · `frame` · `blend`.

```tsx
<Glint x={1350} y={340} size={220} intensity={interpolate(f, [B(30) - from, B(31.9) - from], [0, 1.6], {extrapolateRight: 'clamp'})} />
```

### `LightStreak`
A bundle of fast light streaks crossing the frame (white-hot heads, tinted tails, velocity-stretched).

| prop | type | default | notes |
| --- | --- | --- | --- |
| `start` | number | — | frame the bundle starts crossing |
| `dur` | number | 22 | frames to cross |
| `angle` | number | 0 | travel direction (0 = L→R, 180 = R→L, 90 = down) |
| `count` | number | 7 | streaks |
| `spread` / `offset` | number | 520 / 0 | perpendicular spread / offset of the bundle (px) |
| `length` / `thickness` | number | 900 / 3 | base length (stretched by speed) / core thickness |
| `color` / `secondary` | string | cyan / violet | every 3rd streak uses `secondary` |
| `intensity`, `stagger` (0.4), `seed`, `frame` | | | |

### `Swoosh`
The light component of a whip/swipe transition: a broad comet-shaped light band (tapered trail, white-hot skewed leading edge) plus `LightStreak` detail.
Props: `start`, `dur` (20), `angle` (−12), `width` (520), `trail` (1800), `color`, `secondary`, `intensity`, `streaks` (true), `seed`, `frame`.

```tsx
// whip transition on a cut at local frame C: swoosh peaks on the cut
<Swoosh start={C - 10} dur={20} angle={-8} />
```

### `SpeedLines`
Hyperspace / warp streaks: 3D points flying at the camera, drawn as radial motion-blurred lines + a glow at the vanishing point.

| prop | type | default | notes |
| --- | --- | --- | --- |
| `intensity` | number | 1 | 0 = off; controls streak length + brightness. Animate freely |
| `x`, `y` | number | 960, 540 | vanishing point |
| `count` | number | 340 | |
| `speed` | number | 0.06 | world units / frame |
| `travel` | number | — | explicit travelled distance; **integrate your own speed ramp** for smooth accelerations (`travel = f*0.02 + easeIn(p)*4`) |
| `color`, `secondary`, `glow` (0.6), `res` (1), `blend`, `seed`, `frame` | | | |

Tips: ramp `intensity` 0 → 1 over the snare roll (beats 24–30) for the suck-in; zoom-through transitions.

### `LightLeak`
Organic film light leak burning in from an edge, drifting/morphing, then fading (in + out within `dur`).

| prop | type | default | notes |
| --- | --- | --- | --- |
| `start` | number | — | |
| `dur` | number | 70 | in + out |
| `palette` | `'warm' \| 'violet' \| 'cyan' \| 'lime' \| [hot, mid, deep, edge]` | 'warm' | |
| `side` | `'left' \| 'right' \| 'top' \| 'bottom' \| 'tl' \| 'tr' \| 'bl' \| 'br'` | 'left' | edge it burns in from |
| `intensity` (1), `travel` (0.45), `seed`, `frame` | | | |

```tsx
// light-leak dissolve centred on a cut at C
<LightLeak start={C - 20} dur={44} palette="violet" side="tr" />
```

### `GodRays`
Volumetric shafts radiating from a source, slowly drifting, with **dust motes that are lit only inside the beams**. Half-res shafts (conic gradients × radial falloff) + full-res dust in one canvas.

| prop | type | default | notes |
| --- | --- | --- | --- |
| `x`, `y` | number | 960, 540 | source (can be off-screen, e.g. `y={-200}` for shafts from above) |
| `intensity` | number | 1 | |
| `color` / `secondary` | string | lilac / cyan | main shafts / finer secondary shafts |
| `lobes` | number | 22 | shafts around 360° |
| `spread` / `direction` | number | 360 / 90 | fan width and centre direction (0 = right, 90 = down) |
| `length` | number | 1300 | falloff radius |
| `speed` | number | 0.08 | drift (°/frame) |
| `contrast` | number | 2.6 | higher = thinner, more defined shafts |
| `dust` | number | 1 | dust density (0 = off) |
| `core` | number | 0.8 | hot glow at the source |
| `blend`, `seed`, `frame` | | | |

```tsx
// behind the logo reveal
<GodRays x={960} y={440} intensity={prog(t, D, 40)} />
<Bloom intensity={0.9}><Logo/></Bloom>
```

### `VolumetricBeams`
A few soft cone beams (stage lights / light through panels) with hot apex and radial falloff.
Props: `beams: Beam[]` (`{x, y, angle (90 = down), width (16°), length (1400), color, intensity, sweep (° amplitude)}`), `intensity`, `blend`, `frame`, `seed`. One canvas; cones drawn at half-res.

```tsx
<VolumetricBeams beams={[{x: 500, y: -80, angle: 72, width: 9, sweep: 6}, {x: 1400, y: -80, angle: 110, width: 11, color: 'cyan', sweep: 8}]} />
```

---

## 2. Post wrappers

### `Bloom`
Glow on bright children: a **bright-passed** (exact linear threshold via `brightness()+contrast()`), saturated, blurred duplicate screen-blended on top — two radii (tight + 3.2× wide) or one with `cheap`.

| prop | type | default | notes |
| --- | --- | --- | --- |
| `intensity` | number | 0.8 | 0 = bypass |
| `radius` | number | 14 | tight blur px (wide = 3.2×) |
| `threshold` | number | 0.3 | only content brighter than this glows |
| `cheap` | boolean | false | single layer |
| `saturate` | number | 1.25 | |
| `style` | CSSProperties | full-frame box | the wrapper box; children are duplicated inside identical boxes |

Tips: wrap **only the bright thing** (logo, headline, luminous holo UI). Don't wrap canvases-heavy subtrees (they redraw per copy).

### `ChromaticAberration`
RGB split — red one way, green+blue the other — via one SVG filter (children rendered once). `amount` px (bypassed < 0.25), `angle` (deg).

```tsx
<ChromaticAberration amount={2 + 14 * impulse(f, D, 1, 8)}><Shot/></ChromaticAberration>
```

### `Glitch`
Digital glitch: horizontal slice displacement (noise computed in a 2-px column, quantised, `feTile`d across → hard bands at near-zero cost), RGB split, and block-noise/tear-line overlay. Pattern re-seeds every `hold` frames; random gates make it stutter.

| prop | type | default | notes |
| --- | --- | --- | --- |
| `amount` | number | 1 | 0 = clean bypass. Animate it (e.g. `impulse` at a cut) |
| `displace` | number | 90 | max slice shift px |
| `rgb` | number | 10 | split px |
| `density` | number | 1 | higher = thinner slices |
| `hold` | number | 2 | frames per pattern |
| `blocks` | boolean | true | block-noise overlay (`GlitchBlocks`, also exported) |
| `seed`, `frame`, `style` | | | |

Tips: s01 "Why did it say that?" glitch; glitch cuts (amount 1 for 4–8 frames around the cut). `Glitch` already includes an RGB split — **don't nest it inside `ChromaticAberration`**. For a glitch on one element pass `style={{left, top, width, height}}` (wrapper sized to the element, children positioned inside it) — the filter cost scales with the wrapper area.

---

## 3. Energy

### `Shockwave`
Expanding ring(s): white-hot leading edge, cyan outer fringe, magenta hint, soft violet trailing glow; circumference brightness varies with a rotating noise mask so it is never a perfect CG circle. One canvas (+ a DOM backdrop-filter band only with `refract`).

| prop | type | default | notes |
| --- | --- | --- | --- |
| `x`, `y`, `at` | number | — | |
| `dur` | number | 42 | |
| `radius` | number | 1100 | final radius |
| `thickness` | number | 90 | trailing glow width |
| `rings` / `gap` | number | 2 / 5 | echo rings and frames between them |
| `squash` | number | 1 | vertical squash (0.2 = ring lying on the floor) |
| `distort` | boolean | false | cheap refraction look: chromatic double edge + dark band |
| `refract` | boolean | false | real backdrop-filter refraction band — **expensive**, hero only |
| `core` | boolean | true | flash core at origin |
| `color`, `secondary`, `intensity`, `blend` (`'normal'` — required for the dark band of `distort`), `frame` | | | |

```tsx
<Shockwave x={960} y={540} at={D} rings={3} distort />
<Shockwave x={960} y={760} at={D + 2} squash={0.22} radius={1500} rings={1} />  // floor ring
```

### `EnergyBurst`
Canvas particle explosion: drag-decelerated sparks as motion-blurred streaks with glowing heads (white/cyan/violet).
Props: `x, y, at` · `dur` (55) · `count` (160) · `distance` (720) · `spread` (360) / `direction` (0) · `gravity` (0; ~0.15 for falling sparks) · `color`/`secondary` · `size` (1) · `intensity` · `squash` (1) · `blend` · `seed` · `frame`.

Tips: "button → energy burst" (s04): `spread={140} direction={-90} distance={420}` from the button.

---

## 4. Particles (Canvas2D, depth of field)

### `ParticleField` (alias `Particles`) and presets `DustField`, `Bokeh`, `Sparkles`, `Embers`
Each particle has a depth `z`; size/speed/parallax scale with depth, and particles away from the **focus** plane become soft
**bokeh discs** whose energy spreads over the disc (bigger = dimmer), like a real lens.

| prop | type | default | notes |
| --- | --- | --- | --- |
| `kind` | `'dust' \| 'bokeh' \| 'sparkle' \| 'ember'` | 'dust' | presets set this |
| `count` | number | 170 / 34 / 50 / 90 | per kind |
| `colors` | string[] | per kind | |
| `focus` | number | 0.55 (bokeh 0.95) | 0 = near … 1 = far. **Animate for a rack focus** |
| `aperture` | number | 1 | DOF strength |
| `speed`, `direction` (−100°), `size`, `opacity` | | | |
| `camX`, `camY` | number | 0 | camera parallax offset in px — pass your camera move so near motes slide more |
| `boost` | number | 0 | extra brightness (feed `kick(f + from)`) |
| `area` | {x,y,w,h} | full frame | |
| `res`, `blend`, `seed`, `frame`, `style` | | | |

```tsx
<DustField camX={-cam.x * 0.5} boost={kick(f + from) * 0.6} />
<Bokeh focus={interpolate(t, [0, 40], [0.2, 0.95])} />   // rack focus
<Embers count={60} />                                      // warm rising motes for the finale
```

---

## 5. Environment

### `SpaceBackdrop`
Opaque deep-violet space: elliptical base gradient `#140828 → #04020A`, drifting glow pools, a domain-warped fbm **nebula** (generated once per page, cached) with voids and wisps, twinkling stars (a few cyan glints), horizon haze line, **breathing with the music** (`band(·,0)` + `kick`). One canvas; soft layers at half-res.

| prop | type | default | notes |
| --- | --- | --- | --- |
| `intensity` | number | 1 | nebula + glows (0.6 = calmer, 1.5 = lush) |
| `palette` | `'violet' \| 'cyan' \| 'mixed'` | 'violet' | |
| `stars` | number | 240 | |
| `haze` / `horizon` | number | 0.6 / 640 | horizon haze (set 0 when there is no floor) |
| `audio` | number | 1 | breathing amount |
| `from` | number | 0 | **pass your scene `from`** for audio sync |
| `camX`, `camY` | number | 0 | parallax (nebula 0.15×, stars 0.05×). The nebula term is soft-clamped (tanh) to the texture margin inside the component, so any value is safe — no hard edge |
| `seed`, `frame` | | | |

### `HoloGrid`
Holographic perspective grid floor (true projection, Canvas2D): glowing lines that fade into fog, moiré-free (lines fade as they converge), horizon glow, light packets travelling along the lines.

| prop | type | default | notes |
| --- | --- | --- | --- |
| `horizon` | number | 640 | screen y of the vanishing line |
| `height` | number | 1.1 | camera height (lower = grazing) |
| `focal` | number | 900 | |
| `cell` | number | 1 | world cell size |
| `speed` / `scroll` | number | 0.02 / — | scroll toward camera, or explicit travel |
| `camX` | number | 0 | lateral camera offset (world units) |
| `x` | number | 960 | vanishing point x |
| `color` / `accent` | string | lilac / cyan | lines / packets |
| `fog` | number | 14 | |
| `lineWidth`, `pulses` (12), `intensity`, `fill` (true), `roll` (Dutch tilt °), `boost`, `res`, `seed`, `frame`, `style` | | | |

### `HoloTunnel`
Grid tunnel for fly-throughs: glowing frames (rect / circle / hex) receding to a vanishing point, rails, wall holo-panels with leading edges, light packets.
Props: `x, y` · `shape` ('rect') · `width`/`height` (3.2/1.8 world) · `gap` (1.4) · `speed` (0.08) / `travel` · `roll`, `twist` (°/unit depth) · `color`/`accent` · `fog` (12) · `rails` (6/side) · `pulses` (16) · `panels` (10) · `intensity` · `boost` · `focal` · `seed` · `frame` · `style`.

```tsx
<HoloTunnel travel={easeInQuint(p) * 30} roll={f * 0.15} />   // accelerate through it into the next scene
```

### `Scanlines`
Multiply scanlines + optional rolling bright band. Props: `opacity` (0.18), `spacing` (3 px), `roll` (4 px/frame; 0 = none), `color`, `frame`, `style`.

### `DataRain`
Falling monospace glyph streams (DejaVu Sans Mono): white-hot heads with glow, cyan → lilac trails, 3 depth layers, glyphs flicker.
Props: `fontSize` (22) · `density` (0.55) · `speed` · `color`/`accent` · `glyphs` · `layers` (3) · `intensity` · `fade` (true) · `area` · `blend` · `seed` · `frame` · `style`.

---

## 6. HUD garnish

### `HUDFrame`
Corner brackets that draw in, tick rules top/bottom, side scale, tiny +0.3em uppercase labels that type on, `● REC TC hh:mm:ss:ff F nnnnn/4591`.
Default insets (`insetX 64`, `insetY 92`) clear a 70 px letterbox.
Props: `start` · `end` · `insetX`/`insetY` · `color`/`accent` · `title` ('Bot Studio // Live') · `subtitle` · `footer` · `readout` (true) · `from` (pass scene `from` so timecode = film time) · `opacity` · `frame`.

### `Reticle`
Target lock-on around a rect: brackets fly in 45° rotated and oversized, converge, scan line sweeps, ring rotates; on lock the brackets blink, the target flashes, a filled tag + value readout appear.
Props: `x, y, w, h` (target rect, top-left) · `start` · `dur` (26) · `end` · `label` · `value` (e.g. `'0.31 · BELOW 0.6'`) · `color` (cyan) · `accent` (pistachio) · `pad` (12) · `frame`.

```tsx
<Reticle x={520} y={420} w={300} h={260} start={B(66) - from} label="Judge · Score" value="0.92 · PASS" />
```

### `DataTicker`
Small monospace readout: `mode 'log'` (scrolling runtime log — Judge/Speaker/Clerk/policy/state lines; newest row typed on and highlighted), `'hex'` dump, or `'stats'` single live line.
Props: `x, y` · `width` (420) · `rows` (6) · `mode` · `rate` (5 rows/s) · `start` · `title` · `color`/`accent` · `fontSize` (13) · `lines` (custom) · `opacity` · `seed` · `frame`.
Timings shown are illustrative (no benchmark claims).

Helpers: `timecode(frame)`, `typeOn(text, progress, frame)`.

---

## 7. Finishing

### `GlobalGrade` — `({frame}) => …` (rendered by Root over the whole film)
Vignette with a faint **lateral colour shift** (cool left / magenta right, as dark tints so blacks stay black) + animated film grain + scheduled letterbox.
Implementation is deliberately cheap: the vignette and an oversized grain field are **static canvases painted once**; per frame the grain
canvas is only re-positioned by a CSS transform (compositor-only) and the letterbox is two solid rects. Tune via **`GRADE`**:

```ts
export const GRADE = {
  grain: 0.05, grainSize: 1.5, vignette: 0.4, fringe: 0.5,
  letterbox: [            // global frames; ease = how it arrives at this key
    {frame: 0, h: 70}, {frame: B(29.5), h: 70},
    {frame: B(31.75), h: 118, ease: 'smooth'},   // squeeze in the pre-drop silence
    {frame: B(32), h: 0, ease: 'snap'},          // DROP 1: frame snaps open
    {frame: B(95.5), h: 0}, {frame: B(96), h: 84, ease: 'smooth'}, // breakdown: closes with s07's decay, a touch tighter
    {frame: B(102), h: 84}, {frame: B(103.75), h: 118, ease: 'smooth'},
    {frame: B(104), h: 0, ease: 'snap'},         // DROP 2
    {frame: B(160) - 1, h: 0}, {frame: B(160) + 30, h: 70, ease: 'expo'},  // end card: bars arrive under the final-hit flash
  ],
  grainBoost: [[B(96), B(104), 1.5]],            // grittier breakdown
};
```
`letterboxAt(frame, keys?)` returns the bar height at any global frame (scenes can use it to keep text clear of the bars).
`GradeLayer` (`{frame, grain, grainSize, vignette, fringe, letterbox}`) is the same layer with explicit values.

### `FilmGrain`
Standalone animated grain. Props: `amount` (0.08; 0.05–0.1 tasteful), `size` (1.5 px), `blend` (`'normal'` default: static grain field re-positioned per frame, ~20 ms | `'overlay'` / `'soft-light'`: per-frame blended canvas that fully protects blacks, ~50 ms), `frame`. Prefer `GlobalGrade`; use this for extra grit on a specific shot.

### `Vignette`
Props: `amount` (0.45), `inner` (0.55), `color` (#04020A), `cx`, `cy` (%).

### `Letterbox`
Props: `height` (px, animate it), `color` (#000), `hairline` (faint lilac inner edge).

### `EdgeFringe`
Colour-dodge lateral fringe overlay (`amount`) — a stronger, blend-mode version of the grade's fringe for glitchy moments.

### `Flash`
Impact flash: 1-frame attack, curved decay; optional **bloom-out** (radial light that keeps expanding from `x, y`).
Props: `at` · `dur` (16) · `color` (`'white' | 'cyan' | 'violet' | 'pistachio' | 'amber' | hex`) · `max` (0.85) · `bloom` · `x`,`y` · `blend` (`'screen'` adds light; `'normal'` = true white-out) · `frame`.

### `Strobe` / `strobe()`
`<Strobe frames={[B(152), B(152.5), B(153)].map(k => k - from)} color="cyan" max={0.45} />` — decaying flash on each listed frame (half-beat strobe cuts), or periodic `start/end/period/duty`.
`strobe(f, start, end, period, duty)` → 0/1 gate for your own use (e.g. toggling layers on half-beats).

---

## 8. Utilities (also exported)

`W, H, CX, CY` · `VC` palette · `hash(n)`, `hash2(a,b)`, `prng(seed)` (mulberry32) · `noise1`, `noise2`, `fbm1` (value noise) ·
envelopes `impulse(f, at, attack, tau)`, `windowEnv(f, start, dur, in, out)`, `lin(f, start, dur)` · easings `easeOutExpo`, `easeInExpo`, `easeOutCubic`, `easeInOutCubic`, `easeOutQuint` ·
colour `rgba(hex, a)`, `mixHex`, `hexToRgb`, `colorOf` · hooks `useF(frame?)`, `useSafeId()`, `useCanvasDraw(draw)` ·
canvas `glowSprite`, `bokehSprite`, `starSprite`, `scratchCanvas`, `radialFill` · `full` (absolute full-frame style) · type `CanvasBlend`.

---

## 9. Recipes (beat-synced)

| Moment | Stack |
| --- | --- |
| **Drop / reveal** (B(32), B(104), B(160)) | `Shockwave rings=3 distort` + floor `Shockwave squash=0.22` + `EnergyBurst` + `FlareBurst` + `Flash color="cyan" max≈0.35 bloom`; `ChromaticAberration amount = 2 + 14·impulse` on the shot for ~10 frames |
| **Pre-drop suck-in** (B(30)–B(32)) | near-black, `Glint` charging (intensity 0 → 1.6), `SpeedLines` intensity ramp, letterbox squeeze is automatic |
| **Whip pan cut** | `Swoosh start={C-10}` + directional blur from cine; optional `LightStreak` |
| **Light-leak dissolve** | `LightLeak start={C-20} dur={44}` (warm for intro, violet in drops) |
| **Glitch cut** | `Glitch amount={impulse(f, C, 1, 6)}` around the cut ±4 frames |
| **Logo / hero reveal** | `GodRays` behind + `Bloom` on the logo + `LensFlare scale=0.7` + `Sparkles` |
| **Fly-through** | `HoloTunnel travel=easeIn(p)*30` + `SpeedLines` + `Flash` on exit |
| **Data / HUD moment** | `HUDFrame` + `Reticle` on the UI element + `DataTicker` + `Scanlines opacity=0.1` |
| **Ambient world** | `SpaceBackdrop from={from}` + `HoloGrid` + `DustField` (+ `Bokeh` near camera) |
