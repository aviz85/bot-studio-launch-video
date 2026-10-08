// Keyframed camera paths: Catmull-Rom/Hermite smoothing across keys + per-segment easing, and builders
// for classic cinematic moves that return key lists you can concatenate.
import type {Ease, V3} from './types';
import {TrackOpts, ease as toEase, hermiteEval, mix} from './math';
import {CamSpec, focalToPersp, resolveCam, project, FRAME_W, FRAME_H} from './camera';

/** A camera keyframe: any CamSpec fields at frame `at`. `ease` shapes the segment ARRIVING at this key.
 *  Missing fields are carried over from the previous key (so a key with only `at` is a hold). */
export type CamKey = CamSpec & {at: number; ease?: Ease};

export type PathOpts = TrackOpts & {
  /** time-warp the whole path (first key → last key) with one ease, on top of per-segment eases */
  ease?: Ease;
};

const V3_FIELDS = ['target', 'pos', 'lookAt'] as const;
const NUM_FIELDS = ['yaw', 'pitch', 'dist', 'roll', 'focal', 'persp', 'pan', 'tilt', 'truck', 'pedestal', 'dolly', 'shiftX', 'shiftY', 'zoom'] as const;

type Compiled = {times: number[]; vals: number[][]; eases: ((u: number) => number)[]; layout: {name: string; idx: number; n: number}[]};
const cache = new WeakMap<CamKey[], Compiled>();

const compile = (keys: CamKey[]): Compiled => {
  const hit = cache.get(keys);
  if (hit) return hit;
  const sorted = [...keys].sort((a, b) => a.at - b.at);
  const layout: Compiled['layout'] = [];
  let idx = 0;
  for (const f of V3_FIELDS) if (sorted.some((k) => k[f] !== undefined)) { layout.push({name: f, idx, n: 3}); idx += 3; }
  for (const f of NUM_FIELDS) if (sorted.some((k) => k[f] !== undefined)) { layout.push({name: f, idx, n: 1}); idx += 1; }
  const vals: number[][] = sorted.map(() => new Array(idx).fill(NaN));
  sorted.forEach((k, i) => {
    for (const L of layout) {
      const v = (k as any)[L.name];
      if (v === undefined) continue;
      if (L.n === 3) { vals[i][L.idx] = v[0]; vals[i][L.idx + 1] = v[1]; vals[i][L.idx + 2] = v[2]; } else vals[i][L.idx] = v;
    }
  });
  // fill forward, then backward for leading gaps
  for (let c = 0; c < idx; c++) {
    let last = NaN;
    for (let i = 0; i < vals.length; i++) { if (isNaN(vals[i][c])) vals[i][c] = last; else last = vals[i][c]; }
    let next = NaN;
    for (let i = vals.length - 1; i >= 0; i--) { if (isNaN(vals[i][c])) vals[i][c] = next; else next = vals[i][c]; }
  }
  const out = {times: sorted.map((k) => k.at), vals, eases: sorted.map((k) => toEase(k.ease)), layout};
  cache.set(keys, out);
  return out;
};

/** Evaluate a keyframed camera path at frame t → CamSpec (feed to <World camera>).
 *  Fields are interpolated independently with non-uniform Catmull-Rom (C1 through keys) and each segment's ease.
 *  Use ONE aim style per path (orbit fields, or pos+lookAt, or pos+yaw/pitch). */
export const camPath = (t: number, keys: CamKey[], o: PathOpts = {}): CamSpec => {
  const c = compile(keys);
  let tt = t;
  if (o.ease && c.times.length > 1) {
    const a = c.times[0], b = c.times[c.times.length - 1];
    if (t > a && t < b) tt = a + (b - a) * toEase(o.ease)((t - a) / (b - a));
  }
  const v = hermiteEval(tt, c.times, c.vals, c.eases, o);
  const spec: any = {};
  for (const L of c.layout) spec[L.name] = L.n === 3 ? [v[L.idx], v[L.idx + 1], v[L.idx + 2]] : v[L.idx];
  return spec as CamSpec;
};

/** Screen-space motion of the camera path at t (px per frame of the image near frame centre at focus depth) —
 *  feed into <MotionBlur> / Shots. `probe` = world point whose screen motion is measured (default: the orbit target,
 *  or the point `persp` px in front of the lens). Also returns `spin` (deg/frame of roll) and `zoomRate` (scale/frame). */
export const camMotion = (camAt: (t: number) => CamSpec, t: number, probe?: V3, dt = 1) => {
  const a = resolveCam(camAt(t - dt)), b = resolveCam(camAt(t));
  const p: V3 = probe ?? camAt(t).target ?? [b.pos[0] + b.f[0] * b.persp, b.pos[1] + b.f[1] * b.persp, b.pos[2] + b.f[2] * b.persp];
  const pa = project(a, p), pb = project(b, p);
  const dx = (pb.x - pa.x) / dt, dy = (pb.y - pa.y) / dt;
  return {dx, dy, speed: Math.hypot(dx, dy), spin: (b.roll - a.roll) / dt, zoomRate: pa.scale > 0 ? (pb.scale / pa.scale - 1) / dt : 0};
};

/* ------------------------------------------------------------------ */
/* Classic moves → CamKey[] (concatenate, then camPath)                 */
/* ------------------------------------------------------------------ */
type Base = {at: number; dur: number; ease?: Ease};
type Aim = {target?: V3; yaw?: number; pitch?: number; dist?: number; roll?: number; focal?: number};

const k2 = (at: number, dur: number, a: CamSpec, b: CamSpec, e: Ease): CamKey[] => [{at, ...a}, {at: at + dur, ease: e, ...b}];

export const moves = {
  /** Dolly in: camera travels toward the subject (dist from → to). */
  dollyIn: ({at, dur, ease = 'expoOut', from = 2600, to = 1500, ...aim}: Base & Aim & {from?: number; to?: number}) =>
    k2(at, dur, {...aim, dist: from}, {dist: to}, ease),
  /** Dolly out / pull back. */
  dollyOut: ({at, dur, ease = 'quintInOut', from = 1400, to = 2600, ...aim}: Base & Aim & {from?: number; to?: number}) =>
    k2(at, dur, {...aim, dist: from}, {dist: to}, ease),
  /** Crane up: camera rises on an arc over the subject, tilting down to keep it framed (pitch from → to). */
  craneUp: ({at, dur, ease = 'quintInOut', pitchFrom = 6, pitchTo = -38, lift = 0, target = [0, 0, 0] as V3, ...aim}: Base & Aim & {pitchFrom?: number; pitchTo?: number; lift?: number}) =>
    k2(at, dur, {...aim, target, pitch: pitchFrom}, {pitch: pitchTo, target: [target[0], target[1] - lift, target[2]]}, ease),
  /** Crane down (reverse of craneUp). */
  craneDown: ({at, dur, ease = 'quintInOut', pitchFrom = -38, pitchTo = 6, ...aim}: Base & Aim & {pitchFrom?: number; pitchTo?: number}) =>
    k2(at, dur, {...aim, pitch: pitchFrom}, {pitch: pitchTo}, ease),
  /** Orbit around the target (yaw from → to). For orbits > 90° add `steps` to keep the arc perfectly round. */
  orbit: ({at, dur, ease = 'sine', yawFrom = -30, yawTo = 30, ...aim}: Base & Aim & {yawFrom?: number; yawTo?: number}) =>
    k2(at, dur, {...aim, yaw: yawFrom}, {yaw: yawTo}, ease),
  /** Lateral track: camera slides parallel to a wall/row while keeping its heading (target moves from → to). */
  lateralTrack: ({at, dur, ease = 'linear', from, to, ...aim}: Base & Aim & {from: V3; to: V3}) =>
    k2(at, dur, {...aim, target: from}, {target: to}, ease),
  /** Push through: dist goes from `from` to a NEGATIVE value — the camera flies through the target plane and beyond. */
  pushThrough: ({at, dur, ease = 'expoIn', from = 1800, to = -600, ...aim}: Base & Aim & {from?: number; to?: number}) =>
    k2(at, dur, {...aim, dist: from}, {dist: to}, ease),
  /** Whip pan: fast in-place rotation by `by` degrees (pan; use `tiltBy` for a vertical whip). Pair with motion blur. */
  whipPan: ({at, dur = 9, ease = 'expoInOut', by = 75, tiltBy = 0, fromPan = 0, fromTilt = 0}: Partial<Base> & {at: number; by?: number; tiltBy?: number; fromPan?: number; fromTilt?: number}) =>
    k2(at, dur, {pan: fromPan, tilt: fromTilt}, {pan: fromPan + by, tilt: fromTilt + tiltBy}, ease),
  /** Crash zoom: violent focal-length punch (mm). Subject must sit on the optical axis. */
  crashZoom: ({at, dur = 7, ease = 'expoOut', from = 35, to = 120}: Partial<Base> & {at: number; from?: number; to?: number}) =>
    k2(at, dur, {focal: from}, {focal: to}, ease),
  /** Dutch roll: roll the horizon from → to degrees. */
  dutchRoll: ({at, dur, ease = 'quintInOut', from = 0, to = 9}: Base & {from?: number; to?: number}) =>
    k2(at, dur, {roll: from}, {roll: to}, ease),
  /** Top-down god shot (pitch −89) tilting into a low-angle hero (pitch heroPitch), with a yaw twist and distance change. */
  topDownToHero: ({at, dur, ease = 'expoInOut', target = [0, 0, 0] as V3, distTop = 2600, distHero = 1500, yawFrom = -35, yawTo = 0, heroPitch = 10, roll = 0, focal}: Base & {target?: V3; distTop?: number; distHero?: number; yawFrom?: number; yawTo?: number; heroPitch?: number; roll?: number; focal?: number}): CamKey[] => [
    {at, target, pitch: -89, dist: distTop, yaw: yawFrom, roll, ...(focal ? {focal} : {})},
    {at: at + dur * 0.55, ease: 'linear', pitch: mix(-89, heroPitch, 0.72), dist: mix(distTop, distHero, 0.8), yaw: mix(yawFrom, yawTo, 0.75)},
    {at: at + dur, ease, pitch: heroPitch, dist: distHero, yaw: yawTo},
  ],
  /** Dolly zoom (vertigo): focal from → to while the distance compensates so the subject keeps its size. */
  dollyZoom: ({at, dur, ease = 'smooth', from = 24, to = 70, framing = 1, steps = 8, ...aim}: Base & Aim & {from?: number; to?: number; framing?: number; steps?: number}): CamKey[] => {
    const e = toEase(ease);
    return Array.from({length: steps + 1}, (_, i) => {
      const u = i / steps;
      const focal = mix(from, to, e(u));
      return {at: at + dur * u, ...(i === 0 ? aim : {}), focal, dist: focalToPersp(focal) / framing};
    });
  },
  /** Hold every field for `dur` frames (adds a key at at+dur). */
  hold: ({at, dur}: Base): CamKey[] => [{at}, {at: at + dur}],
};

/** Keys for a classic low-angle hero framing of a target (handy start key). */
export const heroAngle = (target: V3 = [0, 0, 0], o: {yaw?: number; pitch?: number; dist?: number; roll?: number; focal?: number} = {}): CamSpec => ({
  target, yaw: o.yaw ?? -14, pitch: o.pitch ?? 11, dist: o.dist ?? 1500, roll: o.roll ?? -4, focal: o.focal ?? 28,
});

export {FRAME_W, FRAME_H};
