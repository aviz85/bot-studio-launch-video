// Beat-grid helpers for scenes (local frames). B(k) is the GLOBAL frame of beat k (lib.ts); scenes think in
// LOCAL frames (useCurrentFrame()), so convert with beatsToLocal(from, k).
import {B, BEAT} from '../lib';

/** Local frame (within a scene starting at global `from`) of global beat k (fractional ok: 33.5 = half beat). */
export const beatsToLocal = (from: number, k: number) => B(k) - from;

/** Local frames of several beats. */
export const beatList = (from: number, ks: number[]) => ks.map((k) => B(k) - from);

/** Global beat position (fractional) of a local frame. */
export const beatAt = (t: number, from: number) => (t + from) / BEAT;

/** Beat info for local frame t: index of the last beat, phase 0..1 within it, frames since/until beats,
 *  and `hit` = true exactly on a beat frame. `div` = subdivision (2 = half beats, 4 = 16ths). */
export const onBeat = (t: number, from: number, div = 1) => {
  const g = t + from;
  const kf = (g / BEAT) * div;
  let k = Math.floor(kf);
  // B() rounds — make sure the integer beat frame itself counts as the beat
  if (B((k + 1) / div) <= g) k += 1;
  if (B(k / div) > g) k -= 1;
  const start = B(k / div), next = B((k + 1) / div);
  return {beat: k / div, index: k, phase: (g - start) / Math.max(1, next - start), since: g - start, until: next - g, hit: g === start, startLocal: start - from, nextLocal: next - from};
};

/** Decaying 1→0 pulse on every beat (or subdivision) — a clean, kick-independent accent. */
export const beatPulse = (t: number, from: number, decay = 6, div = 1) => Math.exp(-onBeat(t, from, div).since / decay);

/** Strobe cut list: local cut frames every `step` beats from beat a (inclusive) to beat b (exclusive).
 *  strobe(from, 52, 56, 0.5) → half-beat cuts. */
export const strobe = (from: number, a: number, b: number, step = 0.5) => {
  const out: number[] = [];
  for (let k = a; k < b - 1e-6; k += step) out.push(B(k) - from);
  return out;
};

/** Cut frames (local) for a list of beat numbers, e.g. cutsOnBeats(from, [33, 35, 36, 36.5, 37]). */
export const cutsOnBeats = (from: number, beats: number[]) => beats.map((k) => B(k) - from);

/** Duration in frames of n beats at a beat position (exact on the rounded grid). */
export const beatsDur = (k: number, n: number) => B(k + n) - B(k);

export {B, BEAT};
