// Pure math for the cine toolkit: easings, smooth noise, numeric tracks with Hermite/Catmull-Rom
// interpolation, small vector helpers. No React here.
import type {Ease, EaseName, V3} from './types';
import {rand} from '../lib';

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, v: number) => {
  const u = clamp01((v - a) / (b - a));
  return u * u * (3 - 2 * u);
};
export const DEG = Math.PI / 180;

/* ------------------------------------------------------------------ */
/* Easings                                                             */
/* ------------------------------------------------------------------ */
const expoIn = (u: number) => (u <= 0 ? 0 : Math.pow(2, 10 * (u - 1)) - 0.0009765625 * (1 - u));
const expoOut = (u: number) => 1 - expoIn(1 - u);
const BACK = 1.70158;
export const EASES: Record<EaseName, (u: number) => number> = {
  linear: (u) => u,
  smooth: (u) => u * u * (3 - 2 * u),
  sine: (u) => 0.5 - 0.5 * Math.cos(Math.PI * u),
  quadIn: (u) => u * u,
  quadOut: (u) => 1 - (1 - u) * (1 - u),
  quadInOut: (u) => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u)),
  cubicIn: (u) => u * u * u,
  cubicOut: (u) => 1 - Math.pow(1 - u, 3),
  cubicInOut: (u) => (u < 0.5 ? 4 * u * u * u : 1 - 4 * Math.pow(1 - u, 3)),
  quintIn: (u) => Math.pow(u, 5),
  quintOut: (u) => 1 - Math.pow(1 - u, 5),
  quintInOut: (u) => (u < 0.5 ? 16 * Math.pow(u, 5) : 1 - 16 * Math.pow(1 - u, 5)),
  expoIn,
  expoOut,
  expoInOut: (u) => (u < 0.5 ? expoIn(2 * u) / 2 : 1 - expoIn(2 - 2 * u) / 2),
  backIn: (u) => u * u * ((BACK + 1) * u - BACK),
  backOut: (u) => 1 + (u - 1) * (u - 1) * ((BACK + 1) * (u - 1) + BACK),
  backInOut: (u) => {
    const c = BACK * 1.525;
    return u < 0.5 ? (Math.pow(2 * u, 2) * ((c + 1) * 2 * u - c)) / 2 : (Math.pow(2 * u - 2, 2) * ((c + 1) * (u * 2 - 2) + c) + 2) / 2;
  },
  circOut: (u) => Math.sqrt(1 - Math.pow(u - 1, 2)),
  hold: (u) => (u < 1 ? 0 : 1),
};
/** Resolve an Ease (name or function) to a function. */
export const ease = (e: Ease | undefined): ((u: number) => number) => (typeof e === 'function' ? e : EASES[e ?? 'linear'] ?? EASES.linear);

/** 0→1 progress of t over [start, start+dur] with easing (clamped). Like lib `prog` but takes any Ease. */
export const p01 = (t: number, start: number, dur: number, e: Ease = 'linear') => ease(e)(clamp01(dur <= 0 ? (t >= start ? 1 : 0) : (t - start) / dur));

/* ------------------------------------------------------------------ */
/* Deterministic smooth noise                                          */
/* ------------------------------------------------------------------ */
const lattice = (i: number, seed: number) => rand(i * 1.618 + seed * 101.37 + 0.5) * 2 - 1;
/** Smooth 1D value noise in [-1, 1] (quintic interpolation, C2). x in "cycles". */
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * f * (f * (f * 6 - 15) + 10);
  return mix(lattice(i, seed), lattice(i + 1, seed), u);
};
/** Fractal noise (octaves of noise1), roughly in [-1, 1]. */
export const fbm = (x: number, seed = 0, octaves = 3) => {
  let s = 0, a = 1, n = 0, fr = 1;
  for (let o = 0; o < octaves; o++) {
    s += a * noise1(x * fr, seed + o * 17.1);
    n += a;
    a *= 0.5;
    fr *= 2.07;
  }
  return (s / n) * 1.6;
};

/* ------------------------------------------------------------------ */
/* Vectors                                                             */
/* ------------------------------------------------------------------ */
export const v3 = {
  add: (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  len: (a: V3) => Math.hypot(a[0], a[1], a[2]),
  norm: (a: V3): V3 => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
  lerp: (a: V3, b: V3, t: number): V3 => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)],
};

/* ------------------------------------------------------------------ */
/* 4x4 matrices (column-major like CSS matrix3d)                        */
/* ------------------------------------------------------------------ */
export type M4 = number[]; // 16 numbers, column-major
export const m4id = (): M4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
export const m4mul = (a: M4, b: M4): M4 => {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = s;
  }
  return o;
};
export const m4translate = (x: number, y: number, z: number): M4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
export const m4scale = (s: number): M4 => [s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1];
// CSS rotation conventions (y-down): rotateX/Y/Z(deg)
export const m4rotX = (deg: number): M4 => { const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; };
export const m4rotY = (deg: number): M4 => { const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; };
export const m4rotZ = (deg: number): M4 => { const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; };
export const m4apply = (m: M4, p: V3): V3 => [
  m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
  m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
  m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
];
export const m4css = (m: M4) => `matrix3d(${m.map((v) => (Math.abs(v) < 1e-9 ? 0 : +v.toFixed(6))).join(',')})`;

/* ------------------------------------------------------------------ */
/* Keyframed numeric tracks (Hermite / Catmull-Rom, per-segment ease)   */
/* ------------------------------------------------------------------ */
export type TrackOpts = {
  /** 0 = flowing spline through keys (default); 1 = stop at every key. */
  tension?: number;
  /** Tangent at the first/last key when that segment is linear: 'free' (keep the slope, default) or 'rest'. */
  ends?: 'free' | 'rest';
  /** false = plain piecewise interpolation (no spline), each segment shaped only by its ease. */
  spline?: boolean;
  /** true = raw Catmull-Rom (may overshoot keys); default false = monotone (no overshoot past key values). */
  overshoot?: boolean;
};

const isLinear = (e: (u: number) => number) => e === EASES.linear;
const dEase0 = (e: (u: number) => number) => (e(1e-3) - e(0)) / 1e-3;
const dEase1 = (e: (u: number) => number) => (e(1) - e(1 - 1e-3)) / 1e-3;

/** Evaluate a set of numeric channels at time t.
 *  times[i] = key frame; vals[i][c] = value of channel c at key i; eases[i] = ease of the segment ARRIVING at key i.
 *  Eased segments interpolate exactly with their ease (a "move"); LINEAR segments flow through a cubic Hermite
 *  spline whose key tangents are Catmull-Rom (monotone-limited) and inherit the end velocity of eased neighbours,
 *  so moves chain together without velocity jumps or overshoot. */
export const hermiteEval = (t: number, times: number[], vals: number[][], eases: ((u: number) => number)[], o: TrackOpts = {}): number[] => {
  const n = times.length;
  if (n === 0) return [];
  if (n === 1 || t <= times[0]) return vals[0].slice();
  if (t >= times[n - 1]) return vals[n - 1].slice();
  let i = 0;
  while (i < n - 2 && t >= times[i + 1]) i++;
  const t0 = times[i], t1 = times[i + 1];
  const h = Math.max(1e-6, t1 - t0);
  const segE = eases[i + 1] ?? EASES.linear;
  const uRaw = Math.min(1, Math.max(0, (t - t0) / h));
  const nc = vals[0].length;
  const out = new Array(nc);
  if (o.spline === false || !isLinear(segE)) {
    const u = segE(uRaw);
    for (let c = 0; c < nc; c++) out[c] = vals[i][c] + (vals[i + 1][c] - vals[i][c]) * u;
    return out;
  }
  const tension = o.tension ?? 0;
  const segSlope = (j: number, c: number) => (vals[j + 1][c] - vals[j][c]) / Math.max(1e-6, times[j + 1] - times[j]); // segment j→j+1
  // velocity at key j coming from segment k (k = j-1 arriving, k = j departing)
  const tangent = (j: number, c: number) => {
    const hasL = j > 0, hasR = j < n - 1;
    const eL = hasL ? eases[j] ?? EASES.linear : null;
    const eR = hasR ? eases[j + 1] ?? EASES.linear : null;
    const vL = hasL ? segSlope(j - 1, c) * (isLinear(eL!) ? 1 : dEase1(eL!)) : null;
    const vR = hasR ? segSlope(j, c) * (isLinear(eR!) ? 1 : dEase0(eR!)) : null;
    if (vL === null) return o.ends === 'rest' ? 0 : vR!;
    if (vR === null) return o.ends === 'rest' ? 0 : vL;
    if (!isLinear(eL!)) return vL; // continue out of an eased move
    if (!isLinear(eR!)) return vR; // lead into an eased move
    let m = 0.5 * (vL + vR);
    if (!o.overshoot) {
      if (vL * vR <= 0) m = 0;
      else {
        const lim = 3 * Math.min(Math.abs(vL), Math.abs(vR));
        if (Math.abs(m) > lim) m = Math.sign(m) * lim;
      }
    }
    return (1 - tension) * m;
  };
  const u = uRaw, u2 = u * u, u3 = u2 * u;
  for (let c = 0; c < nc; c++) {
    const p0 = vals[i][c], p1 = vals[i + 1][c];
    const m0 = tangent(i, c) * h, m1 = tangent(i + 1, c) * h;
    out[c] = (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * m1;
  }
  return out;
};

/** A numeric key: [frame, value] or [frame, value, easeArrivingAtThisKey]. */
export type NumKey = [number, number] | [number, number, Ease];
/** Keyframed number with spline smoothing + per-segment easing. Keys must be sorted by frame.
 *  `track(t, [[0, 100], [30, 400, 'expoOut'], [90, 380]])` */
export const track = (t: number, keys: NumKey[], o?: TrackOpts) =>
  hermiteEval(t, keys.map((k) => k[0]), keys.map((k) => [k[1]]), keys.map((k) => ease(k[2] as Ease | undefined)), o)[0] ?? 0;

/** Finite-difference derivative of any f(t) (units per frame). */
export const deriv = (f: (t: number) => number, t: number, dt = 0.5) => (f(t + dt) - f(t - dt)) / (2 * dt);
