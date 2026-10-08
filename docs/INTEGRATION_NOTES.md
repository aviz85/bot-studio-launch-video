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
