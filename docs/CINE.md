# Cine toolkit: camera, shots, transitions, time remapping

`src/cine/` gives every scene a real 3D camera for CSS 3D, keyframed camera moves, speed ramps, depth of field, motion blur, and a beat-accurate shot sequencer with eight transitions. Everything is deterministic: each frame is a pure function of the frame number.

```ts
import {World, Obj, FloorGrid, camPath, moves, addCam, handheld, kickPush, Shots, beatShots, whip, flashCut} from '../cine';
```

Live demo of every feature (13 shots cut on beats 32–65):
`node tools/preview.mjs demo:cine --from 860 --dur 900 --range 860-1760:9` (source: `src/demos/cine.tsx`).

---

## 1. Coordinate system and camera conventions

- **World axes follow CSS.** +x is right, **+y is down**, and +z points toward the viewer. A floor sits at a *positive* y (for example `y = 460`). "Up" is −y.
- **The world origin is the frame centre.** With the default camera, an object at `[0,0,0]` renders at native 1:1 size in the centre of the frame.
- **Angles are in degrees.**
  - `yaw`: the camera's **heading**. + pans or turns right.
  - `pitch`: + **looks up** (a low-angle hero shot). −90 is a top-down god shot.
  - `roll`: + **rotates the image clockwise** (a Dutch angle).
- **In orbit mode, `yaw` is still the heading.** `yaw: +30` puts the camera 30° to the *left* of the subject's front, looking right at it. As yaw increases over time, the camera travels to its left around the subject.
- **Focal length sets the CSS perspective.** The formula is `persp = 960·mm/18` (35 mm-equivalent, 36 mm sensor width).

| focal | 14 | 18 | 24 | 28 | 35 (default) | 50 | 85 | 135 |
|---|---|---|---|---|---|---|---|---|
| persp px | 747 | 960 | 1280 | 1493 | 1867 | 2667 | 4533 | 7200 |
| h-FOV | 104° | 90° | 74° | 66° | 54° | 40° | 24° | 15° |

- **On-screen size is `persp / depth`.** An object `persp` px in front of the lens renders 1:1. In orbit mode, `dist` defaults to `persp`, so the target plane is framed 1:1.
- **Choose a lens for the shot.** Use a wide lens (18–28) plus a close distance for dynamic low-angle and fly-through shots. Use a long lens (50–85) for compressed rack-focus macro and Signal Wall tracking shots.

---

## 2. Camera and World (`camera.tsx`)

### `CamSpec`: the cinematic camera description
Every field is optional and numeric, so any of them can be keyframed.

| field | default | meaning |
|---|---|---|
| `target: V3` | `[0,0,0]` | Orbit pivot and look-at point (orbit mode). |
| `yaw`, `pitch` | 0, 0 | Heading and look-up angle (see §1). |
| `dist` | `persp` | Orbit distance from `target`. **A negative value puts the camera past the target** (push-through). |
| `pos: V3` | — | Free-camera position. Setting it switches off orbit mode. |
| `lookAt: V3` | — | With `pos`: aims the camera at this point, overriding yaw and pitch. |
| `roll` | 0 | Dutch angle (+ = image rotated clockwise). |
| `focal` (mm) / `persp` (px) | 35 mm | Lens. `persp` overrides `focal`. |
| `pan`, `tilt` | 0 | **In-place** rotation added after aiming (whips, handheld). |
| `truck`, `pedestal`, `dolly` | 0 | Moves along the camera's right, up and forward axes (px). |
| `shiftX`, `shiftY`, `zoom` | 0, 0, 1 | 2D image shift and scale after projection. This is the cheapest kick punch. |

Aim priority: `pos`+`lookAt`, then `pos`+yaw/pitch, then orbit (`target`/`yaw`/`pitch`/`dist`). After aiming, `pan`/`tilt` are added, then `truck`/`pedestal`/`dolly`.

### `<World camera aperture? focus? maxBlur? near? backdrop? style?>`
A full-frame 3D world seen through `camera` (a `CamSpec` or a `ResolvedCam`). It builds a perspective container and one `matrix3d` view transform, and uses preserve-3d throughout with no `overflow: hidden`.

- **`backdrop`** is screen-space content drawn *behind* all 3D objects, inside the lens zoom/shift: sky gradients, `<FloorGrid>`. `useCam()` works inside it.
- **`aperture`** (default 0 = off) and **`focus`** (a lens distance in px, or a world point `V3`; default `persp`) give every `<Obj>` automatic depth of field. `maxBlur` defaults to 26 px.
- **`near`** (default 8 px): objects whose centre is closer than this, or behind the lens, are culled.

### `<Obj x y z rx ry rz s w h o blur dof billboard nearFade cull style innerStyle>`
A 3D object centred at `(x, y, z)`.

- **Rotation** uses the CSS order `rotateY(ry) rotateX(rx) rotateZ(rz)`. `rx={90}` lays a card flat as a floor, facing up.
- **Nesting.** Nest `Obj`s to build rigs: child coordinates are relative to the parent.
- **`dof`** (default `true`; a number multiplies the effect): blurs the object by its camera depth when the World has an `aperture`. The blur is converted from screen px to local px so the on-screen amount is correct.
- **`billboard`**: `true` keeps the object screen-aligned (a sprite). `'y'` turns it only around the vertical axis (labels, chips).
- **`nearFade: [hidden, visible]`** fades the object as the lens approaches it, for example `[40, 320]`. **Use it on everything the camera flies through.**
- **`o` (opacity) and the DOF/`blur` filter go on an inner wrapper.** That flattens nested `Obj`s, so set them on leaf objects.
- **Glass seen from behind shows mirrored text.** If you don't want that, pass `style={{backfaceVisibility: 'hidden'}}`.

### `<FloorGrid y step extent center color width fade far opacity seg nearFade twoSided>`
A camera-projected grid floor drawn as **2D SVG**: exact perspective, clipped at the near plane, batched into a few paths. It costs about 1–30 ms. **A CSS 3D floor plane of the same size costs 0.5–2 s per frame. Never use giant 3D planes.** Put it in `<World backdrop={…}>`.

Defaults: `y=460`, `step=140`, `extent=3500`, `center=[0,-600]` (x, z), `fade=[600,3200]`, `far=9000`, `opacity=0.4`, `width=2`, `nearFade=350`. The grid is hidden when the camera is below the plane unless you pass `twoSided`.

### Helpers
- **`resolveCam(spec)`** returns a `ResolvedCam`: `{pos, yaw, pitch, roll, persp, r, d, b, f, view, shiftX, shiftY, zoom}`.
- **`project(cam, p)`** returns `{x, y, scale, depth, visible}`: screen px for a world point. Use it to lock 2D HUD reticles or labels onto 3D objects. Check `visible`.
- **`depthOf(cam, p)`** returns the lens distance of a point. **`useCam()`** and **`useDepth(p)`** give the same information inside a World.
- **Lens conversions:** `focalToPersp(mm)`, `perspToFocal(px)`, `focalToHFov(mm)`, `hFovToFocal(deg)`, `distForScale(persp, s)`.
- **`addCam(base, ...offsets)`** merges additive offsets into a spec: pan, tilt, roll, truck, pedestal, dolly and shift are summed; zoom is multiplied.

### Life (offsets for `addCam`)
| helper | what it does | typical use |
|---|---|---|
| `handheld(t, amp=1, seed=1)` | Smooth fbm sway plus a little high-frequency jitter. At amp 1: ±0.3° pan/tilt/roll and ±3 px. | `amp` 0.5 for calm shots, 1–1.5 for action, 2–3 for nervous moments. |
| `drift(t, amp=1, seed=2)` | Slow floating drift with no jitter. | Breakdowns, hero holds. |
| `kickPush(f, px=22, decay=7)` | Dollies forward on each kick and eases back. **`f` = GLOBAL frame.** | Drops: 15–35 px. |
| `kickZoom(f, amt=0.018, decay=7)` | 2D lens punch on each kick (cheapest). | 0.01–0.03. |
| `kickShake(f, amp=1, decay=5, seed=3)` | Short rotational and 2D jolt on each kick. | 0.5–1.5. |

---

## 3. Keyframed paths and classic moves (`path.ts`)

### `camPath(t, keys, opts?) → CamSpec`
A `CamKey` is `CamSpec & {at: frame, ease?}`.

- **`ease` shapes the segment ARRIVING at that key.**
- **Missing fields carry forward.** A key with only `at` is a hold. Two keys may share the same `at` when they set different fields.

How segments interpolate:
- **Linear segments** (no ease) flow through a cubic Hermite spline. Tangents are Catmull-Rom, monotone-limited so there is no overshoot past key values.
- **Eased segments** (`'expoOut'`, `'quintInOut'`, `'backOut'`, …) are exact moves from key to key on that curve.
- At a key between the two kinds, the spline inherits the eased move's end velocity, so chained moves have **no velocity jumps** and fast moves such as whips don't leak overshoot into the next segment.

Options:
- `ease`: time-warps the whole path with one curve.
- `tension` (0–1): 1 stops at every key.
- `ends: 'free' | 'rest'`.
- `spline: false`: piecewise interpolation only.
- `overshoot: true`: raw Catmull-Rom.

**Use one aim style per path:** orbit fields, `pos`+`lookAt`, or `pos`+yaw/pitch.

**Ease names:** `linear`, `smooth`, `sine`, `quad*`, `cubic*`, `quint*`, `expo*`, `back*` (each with `In`/`Out`/`InOut`), plus `circOut` and `hold`. Any `(u) => number` function also works, including lib.ts `expoOut`.

### `camMotion(camAt, t, probe?, dt=1) → {dx, dy, speed, spin, zoomRate}`
Measures the screen velocity (px per frame) of a world probe point, defaulting to the orbit target or a point `persp` px ahead of the lens. Feed `dx`/`dy` into `<MotionBlur vx vy>`. **For speed-ramped shots, pass `x => camPath(ramp.time(x), keys)`** so the blur follows the ramped speed.

### `moves.*`: classic moves, each returning `CamKey[]`
Concatenate the results and pass them to `camPath`. Defaults are shown in brackets.

| move | params |
|---|---|
| `dollyIn` / `dollyOut` | `at, dur, from=2600→to=1500` (dist) [`expoOut`] / [`quintInOut`], plus aim fields |
| `craneUp` / `craneDown` | `pitchFrom=6 → pitchTo=-38`, `lift` (target rises px), plus aim [`quintInOut`] |
| `orbit` | `yawFrom=-30 → yawTo=30`, plus aim [`sine`] |
| `lateralTrack` | `from: V3 → to: V3` (target slides, heading fixed), plus aim [`linear`] |
| `pushThrough` | `from=1800 → to=-600` (dist goes negative: through the target and beyond) [`expoIn`] |
| `whipPan` | `at, dur=9, by=75` (deg of pan), `tiltBy`, `fromPan` [`expoInOut`] |
| `crashZoom` | `at, dur=7, from=35 → to=120` (mm) [`expoOut`] |
| `dutchRoll` | `from=0 → to=9` (deg) [`quintInOut`] |
| `topDownToHero` | `target, distTop=2600, distHero=1500, yawFrom=-35, yawTo=0, heroPitch=10` [`expoInOut`] (3 keys) |
| `dollyZoom` | `from=24 → to=70` (mm), `framing=1`, `steps=8` (vertigo: subject size held) |
| `hold` | `at, dur` |

`heroAngle(target, {yaw=-14, pitch=11, dist=1500, roll=-4, focal=28})` returns a ready low-angle hero `CamSpec`.

**Centre an in-camera whip on the beat:** `moves.whipPan({at: beatsToLocal(from, k) - 5, dur: 10, by: 70})`.

---

## 4. Speed ramps / time remapping (`ramp.ts`)

Maps real (edit) time `t` to animation time `τ`. Speeds are piecewise constant, blended with smoothstep and **integrated analytically**, so `τ` is C2 and its speed is C1: no stutter at ramp points.

- **`makeRamp(segs, blend=10)`** returns a `Ramp`: `{time(t), speed(t), inverse(τ), segs}`.
  - `segs: {speed, until?}[]`, where `until` is the local real frame at which the segment ends.
  - `inverse(τ)` gives the real frame at which the animation reaches `τ`. Use it to land a hero moment on a beat.
- **`ramp(t, segs, blend)`** is the functional form.
- **Presets** take `dur` (real frames on screen) and an optional `animDur` (animation frames to cover). When `animDur` is given, the speeds are rescaled so the ramp fits exactly while keeping their ratios.
  - `heroRamp(dur, animDur?, {fast=3.2, slow=0.22, inFrac=0.16, outFrac=0.16, blend})`: whip in fast, long slow-motion glide, snap out.
  - `snapIn(dur, animDur?, {fast=4, at=0.18})`: arrives fast and settles to real time.
  - `snapOut(dur, animDur?, {fast=4, at=0.8})`: real time, then accelerates out.
  - `slowMoHold(dur, animDur?, {slow=0.1, at=0.3})`: drops into near-freeze and holds.
- **`beatRamp(beatFrames, speeds, blend=8)`**: a different speed for each beat interval.

```tsx
const r = heroRamp(beatsToLocal(from, 42) - beatsToLocal(from, 38), 220); // 4 beats on screen, 220 f of animation
const camAt = (x: number) => camPath(r.time(x - shotStart), keys);
const m = camMotion(camAt, t);             // already includes the ramp speed
<MotionBlur vx={m.dx} vy={m.dy}><World camera={camAt(t)}>…</World></MotionBlur>
```
`r.speed(t)` is the instantaneous speed. Multiply any other blur, streak or trail intensity by it.

---

## 5. Depth of field (`dof.tsx`, plus `World`/`Obj`)

- **Inside a World**, pass `<World aperture={10} focus={depth or V3}>` and each `Obj` blurs itself. Objects that end up under 0.35 px get no filter at all.
- **`coc(depth, focusDepth, aperture, maxBlur=26)`** is the circle of confusion in screen px: `aperture·|depth−focus|/depth`.
  - Aperture 6–10 gives a natural shallow look.
  - Aperture 14–20 gives a macro look.
  - Objects nearer than the focus blur faster than objects behind it, as with a real lens.
- **`rackFocus(t, a, b, at, dur=24, ease='cubicInOut')`** animates a focus value. **`rackBetween(cam, A, B, p)`** gives a focus depth between two world points for a moving camera.
- **2.5D layers outside a World:**
  - `dof(z, focusZ, aperture=10, persp=1867, maxBlur=26)` returns blur px for a `translateZ(z)` layer.
  - `<Focus z focusZ aperture persp?>` wraps children with that blur.

```tsx
const rc = resolveCam(cam);
const focus = rackFocus(lt, depthOf(rc, NEAR), depthOf(rc, FAR), 14, 22);   // rack at lt 14 over 22 f
<World camera={cam} focus={focus} aperture={16}>…</World>
```

---

## 6. Motion blur and filters (`blur.tsx`)

All of these are single SVG filters on a full-frame (1920×1080 at 0,0) wrapper, with unique ids per instance via `useId`. They are built only from primitives that are cheap in Chromium's software renderer (§9).

| component | props | notes |
|---|---|---|
| `<MotionBlur vx vy shutter=0.5 max=150 sx? sy? threshold=0.6>` | Velocity in px/frame (any angle) **or** raw axis std `sx`/`sy`. | Anisotropic `feGaussianBlur` with `edgeMode=duplicate` (no dark edges). Diagonal motion uses a rotate/unrotate wrapper. |
| `<ZoomBlur px core=0.1>` | `px` = streak std at the frame edge. | Radial streaks with a sharp centre: two 1D blurs masked into angular sectors. |
| `<SpinBlur px core=0.08>` | `px` = tangential std at the edge. | Same technique, tangential. Use `spinBlurPx(deg/frame)`. |
| `<GlitchFx amount seed shift=140 rgb=12>` | `amount` 0–1, `seed` per frame. | Two band sets shifted in opposite directions plus a red/cyan channel split. `rgb=0` skips the split. |
| `<Echo t render n=3 span=3 first=0.5 decay=0.6 blend='screen'>` | `render(tt)` | Ghost trail: re-renders the subject at earlier times. **Costs (n+1)× the subject**, so echo light things (a logo, a card, a HUD reticle), not whole worlds. |

Conversion helpers:
- `shutterBlur(speed px/f, shutter=0.5) = speed·shutter·0.42` (Gaussian std).
- `spinBlurPx(deg/f)`.
- `zoomBlurPx(scale-rate/f)`.

`masks.ts` builds small Canvas2D PNG masks once (`maskPng`, `sectorMask`, `bandMask`) and caches them by key.

**Rules of thumb for motion-blur amounts (std in px):**

| situation | blur std |
|---|---|
| Slow drift or dolly | 0 (skip the filter) |
| Brisk lateral track (10–30 px/f) | 2–6 |
| Fast pan or speed-ramp "fast" phase | 10–30 |
| Whip peak | 60–150 |
| Zoom-through edges | 20–90 |
| Spin peak | 40–90 |

Let `camMotion` plus `shutter=0.5` decide, and raise the shutter to 0.8–1 only for stylised smears.

---

## 7. Shots and transitions (`shots.tsx`)

```ts
type Shot = {from: number; to: number;                       // LOCAL frames [from, to)
  render: (lt: number, p: number, info: ShotInfo) => ReactNode;  // lt = frames since this shot's cut
  in?: Transition; out?: Transition; name?: string};
```

- **`<Shots shots t? debug?>`** renders the active shot and overlaps neighbours during transitions.
  - `debug` prints the shot, local time and transition phase in the bottom-left corner.
  - `info.tin` / `info.tout` (`{kind, d, pre, post, p}`) tell a shot that a transition is running. You can use that to add a real in-camera move during it.
  - At a cut, the incoming shot's `in` wins over the outgoing shot's `out`.
- **`beatShots(from, end, [{beat, render, in?, name?}, …])`** builds shots on the beat grid: cut = `B(beat) − from`, and the last shot ends at `end`.
- **`shotsFromCuts(cuts, end, renders, trans?, names?)`** builds shots from explicit cut frames.

**Cut contract:** the cut frame `c` (= `next.from`, normally `B(k) − from`) is where the incoming shot becomes the picture.
- For every transition except the iris, frames ≥ c show the incoming shot as the primary image. It may still be landing or blurred at `c`; that *is* the hit.
- Frames < c show the outgoing shot.
- Flashes, streaks, leaks and warp cores peak at `c`.
- `irisShockwave` is impact-driven: the shockwave **starts** at `c`.

**Cross-scene transitions:** a scene's first shot `in` and last shot `out` render one half each. Put `out: whip({dir:'right'})` on scene A's last shot and `in: whip({dir:'right'})` on scene B's first shot; together they form one whip across the scene boundary. The scene boundary is always a beat. This works for whip, flash, glitch, zoom and spin. A half-whip wraps the present shot into the empty slot of the strip, so there is no black gap. It does **not** work for dissolve or iris, which need both pictures at once.

| transition | params (defaults) | timing around cut `c` | duration at 134 BPM (1 beat ≈ 26.9 f) | SFX cue |
|---|---|---|---|---|
| `cut()` | — | Hard cut. | 0 | Impact or none. |
| `whip({dir='right', dur=10, split=0.6, blur=1, streaks=true, color, seed})` | `dir` = direction the **camera** whips (`'right'` → image flies left); `up`/`down` work too. | Both shots ride one continuous strip. The outgoing accelerates (expo-in) from `c−0.6·dur`. Velocity peaks and the streaks flash at `c`. The incoming lands (expo-out) by `c+0.4·dur`. | **8–12 f** (⅓–½ beat). Strobe montages: 6–8. | Whoosh peaking at `c`. |
| `zoomThrough({dur=14, split=0.6, depth=3.2, color, blur=1})` | | The outgoing pushes in (×3.2, zoom blur) and fades from `c−8`. The incoming emerges from depth behind it (×0.6→0.9). Warp core at `c`. The incoming settles 0.9→1 by `c+6`. | **12–18 f** (½–⅔ beat). | Riser into a boom at `c`. |
| `flashCut({dur=10, split=0.3, color='#FFF', peak=0.9, punch=0.06})` | Use `split: 0` for an in-only flash (drops). | Exposure ramps up for 3 f, flash **peaks at `c`**, then decays while the incoming punches in (scale 1.06→1). | **6–12 f**. Half-beat strobes: 4–6. Drops: 14–18 with `peak: 1`. | Impact or hit at `c`. |
| `glitchCut({dur=8, split=0.45, strength=1, seed, slices=true})` | | Slices, RGB split and interleaved bands of the other shot, ramping to `c` and decaying after it. | **6–10 f** (¼–⅓ beat). | Glitch stutter. |
| `lightLeakDissolve({dur=24, split=0.65, color='violet' \| 'warm' \| 'cyan' \| 'pistachio', strength=1})` | | The crossfade **completes at `c`**. The leak peaks at `c` and drifts out. | **16–40 f** (0.6–1.5 beats). Use in builds and breakdowns. | Soft swell. |
| `irisShockwave({dur=18, pre=0, x=960, y=540, color})` | | Impact flash at `c`. The ring reveals the incoming (expo-out), most of the frame within ⅓·dur, all of it by `c+dur`. | **14–24 f**. | Boom plus shockwave. |
| `spinBlur({dur=12, angle=120, dir=1, blur=1})` | | The outgoing spins up (expo-in, rotational blur). The incoming spins down into place, continuing the same direction. Swap at `c`. | **10–14 f**. | Spin whoosh. |
| `fade({dur=12})` | | Crossfade completing at `c`. | Any. | — |

`Tx` bundles all of the factories (`Tx.whip(…)`).

---

## 8. Beats (`beats.ts`)

- **`beatsToLocal(from, k)`** = `B(k) − from` (fractional k is fine: `33.5` is the half beat). `beatList(from, ks)` converts several at once.
- **`onBeat(t, from, div=1)`** returns `{beat, index, phase 0..1, since, until, hit, startLocal, nextLocal}`. `hit` is true exactly on beat frames. Pass `div=2` for half beats.
- **`beatPulse(t, from, decay=6, div=1)`** is a clean 1→0 pulse on every beat.
- **`strobe(from, a, b, step=0.5)`** returns the local cut frames every `step` beats in [a, b), for half-beat montages.
- **`cutsOnBeats(from, beats)`**, **`beatsDur(k, n)`**, **`beatAt(t, from)`**.
- **`B` and `BEAT`** are re-exported from `lib.ts`.

---

## 9. Typical shots

Shared set-up for the snippets:

```tsx
const t = useCurrentFrame(); const f = t + from; const L = (k: number) => beatsToLocal(from, k);
const Set = () => (<>{/* <Obj …> glass panels … */}</>);
const Frame: React.FC<{cam: CamSpec; focus?: number | V3; aperture?: number}> = ({cam, focus, aperture}) => (
  <World camera={cam} focus={focus} aperture={aperture} backdrop={<><Sky /><FloorGrid y={640} /></>}><Set /></World>
);
```

**Low-angle hero.** Camera just above the floor, looking up, slight Dutch angle, wide lens, kick push:
```tsx
const cam = addCam({target: [0, -60, 0], yaw: -16, pitch: 12, dist: 1400, roll: -5, focal: 24}, handheld(lt, 0.6), kickPush(f, 24));
```
Keep the camera above the floor: its `y` must be less than the floor `y`. In orbit mode, camera y = target.y + sin(pitch)·dist.

**Lateral track along a wall** (the Signal Wall), with DOF on the wall's centre:
```tsx
const keys = moves.lateralTrack({at: 0, dur: L(38) - L(36), from: [-1500, -40, -1100], to: [600, -40, -1100], yaw: 34, pitch: 3, dist: 1150, roll: -2, focal: 32});
<Frame cam={addCam(camPath(lt, keys), drift(lt), kickZoom(f))} focus={[0, -40, -1100]} aperture={7} />
```

**Fly-through between exploded layers.** The camera passes *through* the layer planes; give each layer `nearFade`:
```tsx
const keys = moves.pushThrough({at: 0, dur: 70, target: [0, -40, -300], yaw: 8, pitch: 2, from: 1900, to: -900, ease: 'cubicIn', focal: 24});
// layers: <Obj z={-i * 300} nearFade={[40, 320]}>…</Obj>
const at = (x: number) => camPath(x, keys); const m = camMotion(at, lt);
<MotionBlur vx={m.dx} vy={m.dy}><Frame cam={at(lt)} /></MotionBlur>   // or ZoomBlur px={zoomBlurPx(m.zoomRate)}
```

**Top-down to hero tilt:**
```tsx
const keys = moves.topDownToHero({at: 4, dur: L(50) - L(46) - 10, target: [0, -40, 0], distTop: 3000, distHero: 1600, yawFrom: -70, yawTo: -12, heroPitch: 12, focal: 28});
<Frame cam={addCam(camPath(lt, keys), drift(lt, 1.2))} />
```
For a real god shot, lay the content flat (`rx={90}` on a floor-level `Obj`). Vertical cards seen from above read as thin edges.

**Orbit + crane + Dutch as one flowing path:**
```tsx
const keys: CamKey[] = [
  {at: 0,  target: [0, -40, 0], yaw: -48, pitch: 12, dist: 2300, roll: -8, focal: 28},
  {at: 40, yaw: -20, pitch: 6,  dist: 1900, roll: -3},
  {at: 80, yaw: 12,  pitch: -16, dist: 1700, roll: 4},
  {at: 117, ease: 'quintOut', yaw: 30, pitch: -34, dist: 1550, roll: 9, target: [0, -120, -100]},
];
```

**Whip to the next shot on the beat** (whole scene skeleton):
```tsx
export const Scene: React.FC<SceneProps> = ({from, dur}) => {
  const t = useCurrentFrame(); const f = t + from;
  const shots = beatShots(from, dur, [
    {beat: 52, name: 'hero', render: (lt) => <Frame cam={addCam(camPath(lt, heroKeys), handheld(lt), kickPush(f))} />},
    {beat: 54, name: 'track', in: whip({dir: 'right', dur: 10}), render: (lt) => <Frame cam={camPath(lt, trackKeys)} />},
    {beat: 55.5, name: 'macro', in: flashCut({dur: 8}), render: (lt) => <Frame cam={macroCam} focus={NEAR} aperture={14} />},
    {beat: 56, name: 'god', in: zoomThrough(), render: (lt) => <Frame cam={camPath(lt, godKeys)} />},
  ]);
  return <AbsoluteFill style={{background: '#04020A'}}><Shots shots={shots} t={t} /></AbsoluteFill>;
};
```

**HUD reticle locked onto a 3D object:**
```tsx
const p = project(cam, PANEL_POS);
{p.visible && <Reticle x={p.x} y={p.y} size={240 * p.scale} />}
```

---

## 10. Render cost (measured)

These figures are 1920×1080 renders through `tools/preview.mjs --scale 1` on a 4-core box shared with other agents, so they are a little pessimistic. The baseline is the demo set: about 25 glass panels, text and a FloorGrid, rendering one World in **≈0.85 s**.

| technique | cost per frame |
|---|---|
| `World` / `Obj` / camera math | ≈0 (matrix maths per Obj) |
| `FloorGrid` | ≈0–0.03 s (vs **+0.5–2 s** for a 3000–7000 px CSS 3D floor plane) |
| DOF on ~10 blurred panels / ~25 panels (aperture 16) | +0.2 s / +0.5 s |
| `MotionBlur` (1D, any std) | +0.05–0.3 s |
| `ZoomBlur` / `SpinBlur` | +0.7–0.9 s (+1.2 s over a scaled/rotated layer) |
| `GlitchFx` | ≈+1.0 s |
| CSS `brightness()` on a shot | ≈0 |
| outer-glow `box-shadow` on ~25 3D panels | +0.2 s |
| a second shot rendered during an overlap | +1× shot cost |
| `Echo` | n× the echoed subject |

Measured transition frames (two Worlds on overlap frames):

| transition | frames and cost |
|---|---|
| whip | 1.7–2.0 s on the ~10 overlap frames |
| flash | 0.9–1.4 s |
| glitch | 2.7–3.3 s (use `slices: false` to drop the second World) |
| zoomThrough | 2.1 s at the cut, 3.75 s on the 3–4 deepest overlap frames (the outgoing at 3× scale rasterises many more pixels; lower `depth` to save) |
| lightLeakDissolve | 1.45–2.1 s |
| irisShockwave | 1.9 s |
| spinBlur | 2.2–2.7 s (use `blur: 0` to skip the filter) |

**Avoided on purpose:** `feDisplacementMap` (+0.6–1 s *per sample*), `feTurbulence` (+1.4 s), 2D SVG `feGaussianBlur` (+1–2 s; CSS `blur()` is ~4× cheaper), and SVG data-URI masks with internal filters (re-rasterised every frame). Chromium filters run at device resolution even inside downscaled wrappers, so "half-res filter" tricks don't help.

---

## 11. Caveats

- **`kick`, `band` and `rms` take the GLOBAL frame** (`t + from`). Camera paths and shots use LOCAL frames.
- **Opacity or `filter` on an element flattens its 3D children.** `Obj` puts `o`/blur on an inner wrapper, so nested `Obj`s under a faded or blurred parent go flat. Put the effect on the leaves.
- **Preserve-3d must not be broken between `World` and its `Obj`s.** Don't wrap `Obj`s in plain `div`s; use another `Obj`, which is a pass-through group. `overflow: hidden` or filters *around* a whole `World` are fine.
- **Chromium sorts intersecting 3D planes with BSP splitting.** Avoid many intersecting large planes.
- **`billboard` assumes the parent `Obj` is not rotated.**
- **Very large or very near planes** blow up raster cost. Cull them with `nearFade`, keep panels under ~1500 px, and draw floors and ceilings with `FloorGrid`.
- **Glow `box-shadow`s, `backdrop-filter`, and blur on large layers** are the usual budget killers. Prefer gradients.
- **Filtered wrappers assume a full-frame box at (0,0).** `MotionBlur`, `ZoomBlur`, `SpinBlur` and `GlitchFx` are 1920×1080 wrappers; don't put them inside transformed or partial-size containers. Filter the whole shot instead.
- **The Glitch and radial masks are Canvas2D PNGs** created in the browser at first use. They are deterministic and decoded once; `<Img>` preloading guarantees they're ready before capture.
