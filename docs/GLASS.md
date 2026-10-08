# Glass UI: the product UI rebuilt as cinematic glass

Owner: Glass UI lead. Files: `src/ui/**` and `src/demos/glass.tsx`.
Preview the showcase with `node tools/preview.mjs demo:glass --frames 0,40,80,...,560,599`. It is 600 frames long, and the shot list is at the top of `src/demos/glass.tsx`.

```ts
import {UITheme, GlassPane, HoloAppFrame, DashboardMain, SignalBars3D, HoloGraph, TypedChip, Stage} from '../ui'; // barrel
```

| File | Contents |
| --- | --- |
| `ui/theme.tsx` | `UITheme`, `useUI`, `Look`, `Theme` tokens, `THEMES`, `sigColor`, `Tone`/`toneColors`, `withA`, `NOISE_URL`, `SCANLINES` |
| `ui/skin.tsx` | Low-level dressing: `Rim`, `Sheen`, `GlassUnder`, `glassRoot()` |
| `ui/kit.tsx` | `Card`, `Pill`, `Icon`, `Avatar`, `Stage` (new `crisp` option), `Layer`, backgrounds, `Words`, `Caption`, `Flash`, `lk()` |
| `ui/app.tsx` | `AppFrame`, `AppBase`, `Sidebar`, `TopBar`, `PageTitle`, `ChatPanel`, `Bubble`, `UserIcon`, `Part`, `NAV` |
| `ui/screens.tsx` | All product screens (see below), `BuildMain`, `SignalMeter`, `themed()`, `edgePath`/`quadAt`, `codeColor` |
| `ui/glass.tsx` | `GlassPane`, `ExplodedStack`, `Beam3D`, `TypedChip`, `FloorReflect`, `LightPool`, `staggerP`, `TRAFFIC` |
| `ui/holo.tsx` | `HoloAppFrame`, `SignalBars3D`, `GlassOrbNode`, `HoloGraph`, `billboard()`/`Face` |

Every existing export name and prop signature from v1 still works. New props are all optional, and `npx tsc -p .` passes, including `src/v1`.

---

## 1. Theme system

```tsx
<UITheme look="frost">  …any UI…  </UITheme>        // default when there is no provider: frost
<UITheme look="holo">   …sci-fi HUD version…  </UITheme>
<UITheme look="solid">  …opaque v1 product look… </UITheme>
<UITheme look="frost" blur={16} override={{noise: 0}}>…</UITheme>   // opt-in backdrop blur, token overrides
```

Most components also accept `look` directly: `Card`, `ChatPanel`, `AppFrame`, `GlassPane`, `TypedChip`, `GlassOrbNode`, `HoloAppFrame`, `SignalBars3D` (default holo) and `HoloGraph` (default holo).

| Look | Character |
| --- | --- |
| **frost** | Light translucent Lilac Pop glass: white→lilac gradient fill (α .64–.84), a 1.5px rim (white→lilac→cyan→transparent), a top specular band, corner light, static frost grain, an inset 1px highlight, and a soft violet bloom. Text is plum. |
| **holo** | Dark smoked glass (α .55–.62) with a neon cyan→lilac rim, faint scanlines, luminous lilac and cyan text, glowing titles, and bars and indicators that emit light. Signal colours are neon variants: green `#45E3B0`, amber `#FFC04D`, purple `#AA8CFF`. |
| **solid** | Equivalent to the v1 look: opaque white cards on the `#F8F5FD→#F1EDF8` window. |

**Tokens** (`useUI()` returns a `Theme`):
- **Fills:** `frame` (window base), `surface` (card), `surfaceGlass` (thinner), `surfaceStrong` (near-opaque), `inset`/`insetBorder` (rows inside cards), `field`/`fieldBorder`/`fieldFocus`.
- **Type:** `text`, `textSoft`, `textFaint`, `icon`, `divider`, `track` (empty bar).
- **Accents:** `accent`, `accentDeep`, `accentGrad`, `accentText`, `onAccent`, `chip`/`chipText`/`chip2`, `pistachio`/`onPistachio`, `greenSoft`/`greenText`, `amberSoft`/`amberText`, `sig.{green,amber,purple}`.
- **Glass:** `rim` (gradient), `rimWidth`, `border`, `shadow` (pane level), `cardShadow` (cheap), `inner`, `specular`, `glow`/`glow2` (RGB triplets), `noise`, `scan`, `blur`, `barGlow`.
- **Other:** `bubbleBot`/`bubbleUser`, `code.{kw,str,num,cm,plain,lineNo,header}`, and `dark`.

**Helpers:**
- `sigColor(th, v)` gives the threshold colour (≥ .62 pass green, < .30 waiting amber, otherwise purple). The brand-only `signalColor(v)` is kept.
- `toneColors(th, tone)` returns `{bg, fg, border}` for tones `'lilac'|'lilac2'|'pistachio'|'green'|'amber'|'white'|'accent'|'ghost'`.
- `themed(th, C.green)` maps a v1 brand colour to the theme.
- `withA('#8C6BEA', .5)` returns an rgba string.
- `lk(th, light, dark)` picks a value by look.

**Legacy props now theme-aware.** `Pill` gains `tone` and `glow`. Its old explicit `bg` values (`C.lilac`, `C.pistachio`, `'#E3F3EA'`, `'#FCF0D6'`, `'#fff'`…) map to tones automatically, so old call sites follow the look. `Card` gains `look`, `glow`, `sheen` (0..1 sweep), `rim`, `blur` and `flash` (lock-in rim flash). `ChatPanel` gains `look`, `glow`, `sheen`, `flash` and `blur`. `AppFrame` gains `look`. Icons default to `theme.icon`.

---

## 2. Cinematic components

All components are deterministic and frame-driven through props (`t` is the local frame, `f` is the global frame for audio). They contain no `Math.random` and no CSS animation.

### GlassPane: the base translucent window
```tsx
<GlassPane w={520} h={340} titleBar="welcome_assistant.botscript" sheen={prog(t, 20, 30)} reflect={0.4} glow={0.4}>
  …content…
</GlassPane>
```

| Prop | Default | Notes |
| --- | --- | --- |
| `w`, `h`, `radius` | –, –, 28 | Size. Content gets a flex column. |
| `look` | context | `frost`, `holo` or `solid`. |
| `tint` / `fill` | `'surface'` | `'glass'`, `'frame'` or `'strong'`, or any CSS background through `fill`. |
| `rim`, `specular`, `glow`, `shadow` | 1, 1, 0, true | Glow is the violet outer bloom (0..1.5). |
| `sheen` | – | Light-sweep progress 0..1. Animate it with `prog()`. |
| `flash` | 0 | Hot rim plus cyan bloom when a pane locks into place. |
| `titleBar` | – | `true` or a title string. Draws brand traffic lights (purple, amber, green). |
| `reflect`, `reflectGap` | –, 14 | Floor reflection through `-webkit-box-reflect` (opacity; `true` = .32). |
| `blur` | `theme.blur` (0) | Real backdrop blur. See §3 before using it. |
| `noise`, `scan` | Theme values | Grain and scanline opacity. |
| `preserve3d` | false | Children keep 3D (no clipping). Content is lifted 1px. |
| `padding`, `style`, `contentStyle` | | |

### HoloAppFrame: the app as separate glass layers in Z
```tsx
<Stage cam={cam}>
  <div style={{position: 'absolute', left: 160, top: 40, width: 1600, height: 1000, transformStyle: 'preserve-3d'}}>
    <HoloAppFrame look="frost" t={t} assemble={clamp(t / 50)} explode={ex} spacing={170} spread={70} beams={1}
      sheen={prog(t, 48, 36)} pool={0.7}
      main={({explode}) => <DashboardMain f={t + from} t={t} e={explode * 1.2} />} />
  </div>
</Stage>
```
The window is 1600×1000 (`APP_W`, `APP_H`). Layers and their Z units at `explode = 1` are:
- chrome strip: 0.35 (optional)
- base window: 0
- sidebar pane: 0.7
- top bar: 1.1
- main backing pane plus content: 1.6
- chat: 2.4

| Prop | Default | Notes |
| --- | --- | --- |
| `main` | required | A node or `({explode, t}) => node`. It works with any 940×895 main: `DashboardMain`, `BuildMain`, your own. |
| `chat` | `<ChatPanel t>` | Override with a custom 360×895 chat. |
| `explode` | 0 | 0 = assembled, 1 = exploded, >1 = further apart. |
| `spacing` | 150 | Z px per layer unit at explode 1. |
| `spread` | 60 | Lateral spread at explode 1: sidebar ←, chat →, top bar ↑. |
| `fan` | 0 | Per-layer rotateY at explode 1 (deg). |
| `assemble` | – | Linear 0..1. Layers fly in from `flyZ` (−1800) with expo easing, staggered by `assembleStagger` (.13), and flash their rim as they lock. When flying from depth the reveal runs **front-to-back**, so no layer passes behind frosted glass. With a positive `flyZ` (from the camera) the order is back-to-front. |
| `beams` | 0 | Thin crossed-ribbon light beams from layer corners back to the base, with travelling pulses. |
| `sheen` | – | One sweep across all layers, offset per layer. |
| `glow`, `pool` | 0, 0 | Base bloom and a light pool under the window. Both cost frame time; see §4. |
| `chrome` | – | Floating title strip with traffic lights above the window (string = title). |
| `mainPane` | true | Glass backing behind the main area. `false` saves about 140 ms. |
| `active`, `title`, `navT` | | Sidebar active item, top-bar title, sidebar reveal clock. |

`AppFrame` (the v1 structure) still exists. It is cheaper when you don't need per-layer panes, beams or assembly.

### ExplodedStack: fan panes out in Z and re-stack
```tsx
<ExplodedStack w={520} h={340} explode={ex} spacing={-60} dx={560} ry={-12} items={[<GlassPane …/>, <GlassPane …/>, <GlassPane …/>]} />
```
Items are listed back to front and centred in the `w×h` box. At explode 1, item `c` (centred index) moves by `c·dx`, `c·dy` and `c·spacing` (Z) and rotates by `c·rx/ry/rz`.
- `center` (true): spread symmetrically.
- `stagger` (0..0.9): cascade the spread.
- `assemble` (0..1) with `assembleStagger`, `flyZ` (−1600) and `flyY`: fly items in from depth.

`staggerP(p, i, n, stg)` is exported for your own staggered timelines.

### SignalBars3D: the Signal Wall as luminous bars
Heights come from `signalValue(i, f, live)`, which is audio-reactive (pass the GLOBAL frame `f`). Colours follow `sigColor`. The default look is holo.
```tsx
// 3D field seen in perspective (place inside a Stage / preserve-3d parent)
<SignalBars3D layout="field" f={t + from} t={t} reveal={0} tilt={64} highlight={22} />
// flat luminous wall (equaliser) on a glass panel
<SignalBars3D layout="wall" panel f={t + from} t={t} reveal={0} barW={20} gap={11} maxH={360} highlight={7} />
```
- **Field:** 9×5 bars by default (`cols`, `rows`, `count` = 45). Glass columns have a glowing cap, a batched floor light pool, metric labels on the floor, a grid floor and glass threshold frames at 0.30 and 0.62. The footprint is `cols·(barW+gap)` × `rows·(barW+gap)`, which is 918×510 by default. Other props: `tilt` (62°, 90 = bars face the camera), `spin`, `barW` (56), `barD`, `gap` (46), `maxH` (420), `floor`, `thresholds`, `labels`, `backFaces` (false).
- **Wall:** one or more rows of capsule bars with dashed threshold lines and rotated labels. Defaults: `barW` 22, `gap` 14, `maxH` 340. `panel` wraps the wall in a GlassPane titled "Signal Wall".
- **Both:** `values={(i, f) => …}` overrides the data. `highlight={i}` adds a ring and bold label. `live` (1) blends between static and audio-driven values.

### GlassOrbNode: a state as a glowing glass orb
```tsx
<GlassOrbNode size={180} label="collect_details" icon="doc" active={1} t={t} tone="cyan" face={{rx, ry, rz}} />
```
The orb has a fresnel rim, a specular highlight, a bottom caustic and a bloom. When `active` is set it adds pulse rings and an orbit ring with a travelling dot. The orbit ring is drawn as 2.5D back and front halves; there are no intersecting planes (see §3).

Props: `size` (170), `label`, `icon` (an `Icon` key), `active` (0..1), `t`, `tone` (`'lilac'|'cyan'|'green'|'amber'`), `start` (green with a play glyph), `labelPos` (`'inside'|'below'`), `p` (reveal 0..1), `face` (billboard), `look`.

### HoloGraph: orbs plus light-trail edges
```tsx
<HoloGraph t={t} nodes={NODES} edges={EDGES} w={1560} h={820} orb={180} lift={90} face={{rx, ry, rz}}
  tokenPath={['start', 'discover', 'collect_details', 'booked']} tokenAt={28} tokenStep={16} />
```
It uses the same `GNode` and `GEdge` types as `Graph`. Edges draw on with three strokes (glow, gradient, white core) plus arrowheads. Energy pulses travel along finished edges (`speed`, 5 px/frame). `dashed` edges are return paths, and an edge `label` becomes a billboarded chip. A comet token with a trail follows `tokenPath`, and the active node is the orb nearest the token.

Props: `lift` (orb Z above the edge plane), `floor` and `floorZ` (a dotted glow floor with per-node light pools), `e` (explode lifts the orbs), `uid` (needed when two graphs share a frame).

### TypedChip: floating typed signal
```tsx
<TypedChip name="goal_clear" value="yes" conf={0.94} kind="noul" look="holo" size={30} p={prog(t, 10, 24)} pulse={0.6 * kick(f, 10)} />
```
`kind` is `'score'|'noul'|'choice'|'field'|'fn'` and sets the glyph and default tone (Σ purple, ✓ green, ◆ cyan, ƒ amber); `tone` overrides the colour. `size` is the base font size, so render it natively large for close-ups. `p` is the reveal and `glow`/`pulse` control emission.

### Other helpers
- `Beam3D({a: [x,y,z], b: [x,y,z], o, thick, color, pulse, draw})` draws a light beam between any two 3D points.
- `FloorReflect({gap, opacity, fade})` wraps any flat node with a box-reflect reflection.
- `LightPool({x, y, w, d, o, color, z, floor})` is a cheap glow under a pane. `floor` lays it on a rotateX(90°) plane, which costs more.
- `billboard(face)` returns the inverse camera rotation, so flat elements face the viewer. Pass the same `rx/ry/rz` your `Stage` uses.
- `BuildMain({t, e, typeAt, pressAt, proposalAt})` is the Build with AI main area: prompt card, 4/6/5 stat cards and proposed changes.
- `SignalMeter`, `AppBase` and `UserIcon` are smaller building blocks.

---

## 3. backdrop-filter and CSS-3D findings (headless Chromium 1194, software compositing)

Each of these was tested with a stripes-and-text pattern behind the panes. The experiments were throwaway versions of `src/demos/glass.tsx`, and the results are summarised here.

1. **It renders.** `backdrop-filter: blur() saturate()` works on flat panes, under 2D-transformed parents, with `opacity` on the element itself, under `overflow:hidden` parents, and on a pane with its own `perspective() rotateY()`.
2. **It works inside `preserve-3d` and does not flatten the scene.** translateZ'd panes stay 3D, and a front pane really blurs the 3D siblings behind it, including nested preserve-3d trees.
3. **Silent kill:** if any ancestor has `opacity < 1` or `filter` (the backdrop root rules; also mask, clip-path and mix-blend-mode), the pane shows plain un-blurred rgba. This includes fades done with `Part o={…}`, `Layer o`, and the reveal opacity in ExplodedStack or HoloAppFrame.
4. **Off-screen artefacts in 3D.** When a blurred pane's projected bounds extend past the viewport, which is common during camera moves and close-ups, Chromium computes the backdrop on a clipped rect. The result is hard-edged, unblurred, darker rectangular bands inside the pane. Panes that stay fully on screen are fine.
5. **Cost is not the problem.** Twelve large blurred panes in 3D cost about 50 ms more than the gradient fallback.
6. `-webkit-box-reflect` works in 3D, including together with backdrop-filter, but it flattens the element's own 3D children.

**Decision.** The default is `theme.blur = 0`, which is the gradient fallback. It uses:
- a translucent white→lilac gradient that is lighter at the top left
- a specular band and corner light
- static frost grain: a tiny feTurbulence SVG tile, rasterised once, essentially free
- a mask-composite 1.5px gradient rim (essentially free)
- an inset 1px highlight
- a soft violet/cyan bloom

Panes behind remain visible, unblurred, through the alpha. When layers are assembled the alpha compounds to near-opaque, so text is readable. When exploded you see depth through the glass.

Opt in to real blur with `blur={16..24}` on a `Card`, `GlassPane` or `ChatPanel`, or for a whole subtree with `<UITheme blur>`. Only do this for panes that stay fully on screen and have no fading ancestor. The demo's shot F2 is the safe case: a flat chat over moving type.

**Other CSS-3D rules learned here:**
- **Coplanar siblings in a 3D context sort unreliably.** Give each layer an explicit epsilon Z. HoloAppFrame adds +2px per layer, and GlassPane with `preserve3d` lifts its content 1px.
- **Intersecting planes force BSP splitting.** This is slow: full-size threshold planes through 45 bars cost +230 ms. It can also produce rectangular artefacts: a rotateX ring through an orb drew a light square. Use non-intersecting geometry instead (perimeter frames, 2.5D halves).
- **These properties flatten `preserve-3d` children:** `opacity < 1`, `filter`, `overflow: hidden`, `mask`, `box-reflect`. Set opacity only while it is below 1 (`opacity: p < 1 ? p : undefined`). `Card` uses overflow hidden, so it is a flat leaf, which is fine.
- **Batch many small 3D-positioned elements into one flat layer.** Light pools became one div with 45 radial gradients, and labels became one container. This saved about 350 ms on the bar field.

---

## 4. Performance

All numbers are full 1920×1080 (`--scale 1`), min of 3. They were measured on the shared 4-core box with **load average 4–6** (other agents rendering), where an **empty frame cost ~410–430 ms**. Earlier, with a quieter machine, an empty frame cost ~300 ms, so subtract about 120 ms for an uncontended estimate.

| Content | ms/frame |
| --- | --- |
| HoloAppFrame + DashboardMain, **exploded**, frost, beams | 980–1040 |
| … same, holo | ~960 |
| … `mainPane={false}` | 800–850 |
| HoloAppFrame assembled | ~900 |
| Legacy `AppFrame` exploded (e = 1.15) | ~800 |
| Flat frost `AppFrame` + dashboard (quieter machine) | ~740 |
| SignalBars3D field (45 bars, labels, floor, thresholds) | 770–1000 (was 1267 before batching) |
| SignalBars3D wall + panel + 3 chips | ~680 |
| HoloGraph (5 orbs, 5 edges, token) | ~840 |
| 3 GlassPanes with reflections in ExplodedStack | ~690 |
| Flat ChatPanel with real blur 24 + 3 TypedChips | ~560 |

These figures include the empty-frame overhead. The UI itself costs about 400–600 ms of each frame.

**Cost knobs:**
- Large `box-shadow` blurs on big panes add about 90 ms. That is why cards use the cheaper `cardShadow` and big panes use `shadow`.
- `glow` on the base window adds 50–100 ms.
- A floor-plane `LightPool` (rotateX 90°) can grow huge on screen and added about 100 ms. The default is now a flat ellipse.
- `mainPane` costs about 140 ms.
- Beams, grain, mask rims and scanlines are about free.

Prefer gradients over `filter: blur`. The UI uses no `filter: blur` anywhere.

---

## 5. Close-up and macro tips

- **Magnify with `<Stage cam={{s: 2.4, …}} crisp>`.** Chromium rasterises 3D layers at about 1x, so `scale(s)` inside the 3D transform turns text soft above roughly 1.2x. `crisp` moves `s` to a 2D scale outside the perspective container and compensates x and y. It renders crisp at the same cost; CSS `zoom` on an outer wrapper also works. If the cine agent builds its own camera, apply the same rule: do zoom outside the `perspective` element.
- **Render natively large.** Use `TypedChip size`, `GlassOrbNode size`, and `SignalBars3D barW`/`maxH` rather than `scale()` on small elements.
- Billboard orbs and labels with `face` when the camera tilts, so they stay round and readable.
- For a macro on one dashboard card, explode the frame (`explode` 0.8–1.2, spacing 150–170). The cards separate in Z, which gives a natural rack-focus depth.
- Text is at least 13 px everywhere. Metric labels are 13–15 px, so keep macro magnification of those under about 2.5x with `crisp`.
