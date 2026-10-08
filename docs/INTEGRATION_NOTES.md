# Integration notes (collected from scene agents' reports)

## s07
- s06's last shot should use `out: whip({dir:'right', dur:10})` to match s07's first shot (s07 already has the `whip` SFX at 2149, so s06 must not add another).
- s07 has no `out` on its last shot; it fades itself to near-black for the s08 breakdown.
- Cine finding: lens `shiftX`/`shiftY` also shifts the `World` backdrop, exposing a dark border (s07 worked around it with an oversized sky in `src/scenes/s07/common.tsx`).
- Heaviest frames: zoom-through overlap at beat 88 and whip at 89.5 (~2.8× a normal frame).
