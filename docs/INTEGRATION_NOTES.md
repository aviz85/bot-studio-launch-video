# Integration notes (collected from scene agents' reports)

## s07
- s06's last shot should use `out: whip({dir:'right', dur:10})` to match s07's first shot (s07 already has the `whip` SFX at 2149, so s06 must not add another).
- s07 has no `out` on its last shot; it fades itself to near-black for the s08 breakdown.
- Cine finding: lens `shiftX`/`shiftY` also shifts the `World` backdrop, exposing a dark border (s07 worked around it with an oversized sky in `src/scenes/s07/common.tsx`).
- Heaviest frames: zoom-through overlap at beat 88 and whip at 89.5 (~2.8× a normal frame).

## s09
- Opens at 3224 with a zoom-through completing s08's zoom-through out. s09 cues only the emerging whoosh at 3224, so the `swoosh_rev` ending on 3224 belongs to s08's cue sheet.
- Exits with a flash ramp and push-in peaking on 3761, meeting s10's in-only flash cut. s09's `swoosh_rev` ends on 3761; s10 adds its own zap and shimmer there.
- Gotcha: content passed as `World backdrop` sits inside the lens shift/zoom, so a full-frame SpaceBackdrop shows its edge when `shiftX` ≠ 0 (same as the s07 finding). Draw space outside the World.
- Heaviest frames: the zoom-through (3224 area) and the glitch cut at 132, a few overlap frames each.

## s04
- Shared bug: `GlassOrbNode` (src/ui) draws its bloom outside its box, which clips into a visible light rectangle in 3D (worst when active>0; visible in demo:glass frames 380 and 415). s04 uses a local `HoloOrb` in `src/scenes/s04/common.tsx`. Consider fixing it in src/ui (render bloom inside the element, or as a radial gradient on the element itself).
- s03's whip direction and its 1075 whip cue match s04's incoming half, so s04 dropped its own whip at 1075.
- s04 exits at 1397 with a zoom-through into the collect_details orb plus a `swoosh_rev` ending at 1397; s05 opens with `zoomThrough({dur:16})` and an emerge whoosh at 1397.

## s03
- A Shots `out: whip` on a heavy last shot renders the shot twice (~7× cost). s03 uses an in-camera whip pan instead; watch other scenes for the same cost.
- HoloAppFrame has only one linear `assemble` clock; s03 uses a local per-layer rig (`src/scenes/s03/app.tsx`).
- ChromaticAberration around a 3D world costs ~1 s/frame; s03 uses a cheap RGB fringe instead.
- Avatar: s03's hero avatar (`src/scenes/s03/art.tsx`) uses the real logo's "<" chevron wink; the kit `Avatar` uses a flat-line wink. Unify (s10 has been told to match s03).
- s03 covers the whip SFX at 1075 (s04 dropped its own).
- Heaviest frames: drop 864–870 (~2.4× the lockup), zoom-through at 966, whip-out at 1072.

## s01
- Glitch / ChromaticAberration (vfx) add ~1.3 s/frame each when wrapped around a 3D scene (VFX.md understates this). s01 fires Glitch only in bursts.
- glitchCut costs ~5× and zoomThrough ~7× over large text planes in s01, which uses its own cheaper replacements.
- SpaceBackdrop camX/camY: the nebula texture has only ~±115 px of margin, so large offsets expose a hard edge. s01 clamps to ±420; consider clamping inside the component.
- Chromium renders 3D layers at full native size however small they appear; render far objects at half or quarter resolution.
- s01 ends collapsing to near-black (old-TV off) at 430; s02 opens from darkness.

## s02
- Confirms the `GlassOrbNode` glow-square bug (it also shows in demo:glass HoloGraph orbs). Fix: draw the glow as a radial gradient inside the element's own box. s02 uses a local `HoloOrb` in `src/scenes/s02/fragments.tsx`.
- `Beam3D`: crossed 3D ribbons inside a World with other objects clipped the whole World horizontally. s02 uses screen-space SVG beams (`ScreenBeam` in `env.tsx`).
- `Obj nearFade` measures the object's centre depth, so wide objects fade while still in view.
- The riser ends at 806 and the `suck_in` ends exactly at 860, so s03 must not add another suck_in. Frame 859 is near-black with the glint at (960, 540), where s03's FlareBurst fires.

## s05
- SpaceBackdrop parallax margin is only ~6% (hard edges above ~290 px vertical / ~500 px horizontal). s05 clamps it.
- GlassOrbNode near the camera rasterises its blurred shadows at screen size (~1.5 s/frame). s05 swaps in a gradient-only LiteOrb once the on-screen radius exceeds 230 px. s05 did not see the rectangle artifact with camera-facing orbs.
- zoomThrough in-half: s05 uses blur:0 (zoom blur cost ~2.7×); the 0.9→1 scale-in exposes the shot's edge, so s05 extends its backdrop past the frame.
- The VFX Reticle is too faint on moving targets; s05 has a local LockReticle.
- s05 ends with a flash out at 1719 into s06's in-only flash.

## s06
- **Duplicate SFX:** both s06 and s07 cue a `whip` at 2149. Remove the one in s06 (s07 owns the boundary whip, per its report).
- Visual boundaries: s06's first frame matches s05's flash out-half (dur 14, split 0.5, peak 0.9, #E6FBFF); its exit whip (right, dur 10) matches s07's opening whip.
- Chromium quirk: an off-screen `Obj` plane that is huge in projection corrupted the 3D sort and hard-clipped a different visible pane. s06 culls off-frame monoliths; other scenes may hit the same thing.
- `zoomThrough` shows black frame edges for ~6 frames after the cut (incoming shot settles 0.9→1 scale); the stock version cost 4–9 s/frame here, so s06 rebuilt its beat-72 transition.
- Heaviest frames: Clerk slam (1834), core ignition (1895), whip overlap (1776).

## s10
- The final hit cut is at 4298, where the kick is detected (B(160)=4299); the SFX recipe sits at 4299.
- s10 opens with a flash in at 3761, which pairs with s09's flash ramp and push-in that peak on 3761.
- MotionBlur is ~8× too expensive on many-layer 3D worlds (1.8 s → 15 s over the ~150-card wall). s10 uses speed streaks there.
- Overlapping coplanar 3D cards are very expensive (one frame took 20 s); giving each card its own depth brought it to ~2.9 s.
- The kit Avatar has no both-eyes-open state; s10 copies s03's hero avatar art.
- Heaviest frames: the 146 whip overlap (~3.3 s), the 156 zoom-through (~3.1–3.9 s), the 148 zoom-through (~2.1 s).

## s08
- Opens with a 6-frame fade from black at 2579, expecting s07 to decay. Exits with a zoomThrough out-half at 3224; s09 opens with `in: zoomThrough()` (s09 reports its opening matches). Make sure s08's cue sheet has the `swoosh_rev` ending at 3224 (s09 only cues the emerge whoosh).
- MotionBlur (+~2 s) and ChromaticAberration (+~0.5 s) over a 3D World cost far more than documented.
- flashCut's `brightness()` flattens the incoming 3D World and is expensive at the drop; s08 uses a plain cut plus an exposure overlay.
- `shiftX`/`shiftY` move the World backdrop (same finding as s07/s09).
- VFX `at`/`start` props take scene-local frames, not shot-local ones.
- The shared Reticle is too faint on frost glass; s08 has a local `Lock`.
- Heaviest frames: the first ~30 drop frames after 2794 (~1.5–1.6 s), the spin transition at 116 (~2.0 s).
