// s06 helpers: keyframe interpolation, envelopes, slam motion, impact jolts.
import {Easing, interpolate} from 'remotion';
import type {CamOffset, V3} from '../../cine';

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const mixN = (a: number, b: number, u: number) => a + (b - a) * u;

export const EZ = {
  expoOut: Easing.bezier(0.16, 1, 0.3, 1),
  expoIn: Easing.bezier(0.7, 0, 0.84, 0),
  expoInOut: Easing.bezier(0.87, 0, 0.13, 1),
  quintOut: Easing.bezier(0.22, 1, 0.36, 1),
  quintInOut: Easing.bezier(0.83, 0, 0.17, 1),
  cubicInOut: Easing.bezier(0.65, 0, 0.35, 1),
  backOut: Easing.bezier(0.34, 1.56, 0.64, 1),
  sine: Easing.bezier(0.37, 0, 0.63, 1),
  linear: (u: number) => u,
};

/** Piecewise keyframes [frame, value][] with one easing per segment (clamped). */
export const kf = (t: number, pts: [number, number][], ease: (u: number) => number = EZ.cubicInOut) =>
  interpolate(t, pts.map((p) => p[0]), pts.map((p) => p[1]), {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});

/** 0→1 progress from start over dur with easing (clamped). */
export const pr = (t: number, start: number, dur: number, ease: (u: number) => number = EZ.expoOut) => ease(clamp01((t - start) / Math.max(1e-6, dur)));

/** Window envelope: rises over `a` frames from `start`, holds, falls over `b` frames ending at `end`. */
export const win = (t: number, start: number, end: number, a = 8, b = 8) => Math.min(pr(t, start, a, EZ.sine), 1 - pr(t, end - b, b, EZ.sine));

/** Decaying impulse after `at` (1 at at+attack, e^-d/tau after). */
export const imp = (t: number, at: number, tau = 6, attack = 1) => {
  const d = t - at;
  if (d < 0) return 0;
  if (d < attack) return d / attack;
  return Math.exp(-(d - attack) / tau);
};

/** Slam motion: object travels from `off` (offset from its rest position) to rest between `start` and `land`
 *  (accelerating), overshoots a little along the travel direction and settles. Returns the offset to add. */
export const slam = (t: number, start: number, land: number, off: V3, over = 36): V3 | null => {
  if (t < start) return null;
  if (t <= land) {
    const u = clamp01((t - start) / Math.max(1, land - start));
    const e = Math.pow(u, 1.65);
    return [off[0] * (1 - e), off[1] * (1 - e), off[2] * (1 - e)];
  }
  const d = t - land;
  const L = Math.hypot(off[0], off[1], off[2]) || 1;
  const k = over * (d / 2.6) * Math.exp(1 - d / 2.6);
  return [(-off[0] / L) * k, (-off[1] / L) * k, (-off[2] / L) * k];
};

/** Camera jolt on an impact: vertical bump + roll wobble, decaying. */
export const jolt = (t: number, at: number, amp = 1): CamOffset => {
  const d = t - at;
  if (d < 0 || d > 40 || !amp) return {};
  const e = Math.exp(-d / 5);
  return {shiftY: amp * 16 * e * Math.cos(d * 1.25), roll: amp * 0.7 * e * Math.sin(d * 1.6), shiftX: amp * 5 * e * Math.sin(d * 2.1)};
};

/** Point on a vertical pane centred at `c`, rotated `ry` degrees about Y; local (lx, ly, lz). */
export const onPane = (c: V3, ry: number, lx: number, ly: number, lz = 0): V3 => {
  const a = (ry * Math.PI) / 180;
  return [c[0] + lx * Math.cos(a) + lz * Math.sin(a), c[1] + ly, c[2] - lx * Math.sin(a) + lz * Math.cos(a)];
};

export const add3 = (a: V3, b: V3 | null): V3 => (b ? [a[0] + b[0], a[1] + b[1], a[2] + b[2]] : a);
export const lerp3 = (a: V3, b: V3, u: number): V3 => [mixN(a[0], b[0], u), mixN(a[1], b[1], u), mixN(a[2], b[2], u)];
