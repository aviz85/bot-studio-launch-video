// s05 · States — the 3D state graph: data, timing (GLOBAL frames) and curve math.
// World axes follow CSS (+y DOWN). Orb centres sit on the plane y = 0; the grid floor is at y = FLOOR.
import {B} from '../../lib';
import type {V3} from '../../cine/types';

export const FLOOR = 360;
export const ORB = 300; // orb diameter (world px)
export const R = ORB / 2;

export type Node3 = {id: string; p: V3; icon?: string; start?: boolean; at: number};
export type Edge3 = {
  id: string; a: string; b: string;
  /** draw-on window (GLOBAL frames) */
  from: number; to: number;
  /** cubic control points (absolute world px). Omitted → gently bowed straight edge */
  c1?: V3; c2?: V3;
  dashed?: boolean;
  label?: string;
  labelAt?: number;
  /** where along the edge the label chip sits (0..1, default 0.5) */
  labelU?: number;
  kind: 'main' | 'branch' | 'cycle' | 'return';
};

export const NODES: Node3[] = [
  {id: 'start', p: [-1280, 0, 150], start: true, at: B(52)},
  {id: 'discover', p: [-640, 0, -150], icon: 'chat', at: B(53)},
  {id: 'collect_details', p: [0, 0, 150], icon: 'doc', at: B(54)},
  {id: 'follow_up', p: [640, 0, -150], icon: 'mail', at: B(55)},
  {id: 'booked', p: [1280, 0, 150], icon: 'calendar', at: B(56)},
  {id: 'human_handoff', p: [300, -470, 820], icon: 'user', at: B(57.5)},
];
export const N: Record<string, Node3> = Object.fromEntries(NODES.map((n) => [n.id, n]));

export const EDGES: Edge3[] = [
  {id: 'e0', a: 'start', b: 'discover', from: B(52) + 7, to: B(53), kind: 'main'},
  {id: 'e1', a: 'discover', b: 'collect_details', from: B(53) + 5, to: B(54), kind: 'main'},
  {id: 'e2', a: 'collect_details', b: 'follow_up', from: B(54) + 5, to: B(55), kind: 'main'},
  {id: 'e3', a: 'follow_up', b: 'booked', from: B(55) + 5, to: B(56), kind: 'main'},
  // branches (beats 56–60)
  {id: 'e4', a: 'collect_details', b: 'human_handoff', from: B(56.5), to: B(57.5), kind: 'branch', label: 'needs a person', labelAt: B(57.5), labelU: 0.42,
    c1: [60, -40, 470], c2: [200, -330, 700]},
  {id: 'e5', a: 'follow_up', b: 'discover', from: B(58), to: B(59), kind: 'cycle', label: 'needs more', labelAt: B(58.75),
    c1: [560, -560, -640], c2: [-560, -560, -640]},
  {id: 'e6', a: 'human_handoff', b: 'discover', from: B(58.5), to: B(59.5), kind: 'return', dashed: true,
    c1: [-120, -520, 900], c2: [-760, -120, 420]},
];

/** order the energy token travels (60–64) */
export const TOKEN_PATH = ['start', 'discover', 'collect_details', 'follow_up', 'booked'];

/* ------------------------------------------------------------------ */
/* vector + cubic helpers                                               */
/* ------------------------------------------------------------------ */
export const vAdd = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const vSub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const vMul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const vLen = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const vLerp = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
export const vNorm = (a: V3): V3 => { const l = vLen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

const cubic = (p0: V3, c1: V3, c2: V3, p3: V3, u: number): V3 => {
  const v = 1 - u;
  const a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
  return [a * p0[0] + b * c1[0] + c * c2[0] + d * p3[0], a * p0[1] + b * c1[1] + c * c2[1] + d * p3[1], a * p0[2] + b * c1[2] + c * c2[2] + d * p3[2]];
};

/** A polyline sampled along a curve with cumulative arc length. */
export type Poly = {pts: V3[]; s: number[]; L: number};
const samplePoly = (fn: (u: number) => V3, n = 72): Poly => {
  const pts: V3[] = [], s: number[] = [];
  let acc = 0;
  for (let k = 0; k <= n; k++) {
    const p = fn(k / n);
    if (k > 0) acc += vLen(vSub(p, pts[k - 1]));
    pts.push(p); s.push(acc);
  }
  return {pts, s, L: acc};
};
/** point at arc length */
export const polyAt = (P: Poly, sl: number): V3 => {
  if (sl <= 0) return P.pts[0];
  if (sl >= P.L) return P.pts[P.pts.length - 1];
  let lo = 0, hi = P.s.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P.s[m] < sl) lo = m; else hi = m; }
  const u = (sl - P.s[lo]) / Math.max(1e-6, P.s[hi] - P.s[lo]);
  return vLerp(P.pts[lo], P.pts[hi], u);
};
/** tangent at arc length (unit) */
export const polyDir = (P: Poly, sl: number): V3 => vNorm(vSub(polyAt(P, Math.min(P.L, sl + 6)), polyAt(P, Math.max(0, sl - 6))));

export type EdgeGeo = Edge3 & {poly: Poly; s0: number; s1: number};
const edgeCurve = (e: Edge3) => {
  const A = N[e.a].p, Bp = N[e.b].p;
  const d = vSub(Bp, A);
  // default: gentle upward bow so straight edges read as arcs of light in perspective
  const bow: V3 = [0, -Math.min(70, vLen(d) * 0.07), 0];
  const c1 = e.c1 ?? vAdd(vAdd(A, vMul(d, 1 / 3)), bow);
  const c2 = e.c2 ?? vAdd(vAdd(A, vMul(d, 2 / 3)), bow);
  return (u: number) => cubic(A, c1, c2, Bp, u);
};

export const GEO: EdgeGeo[] = EDGES.map((e) => {
  const poly = samplePoly(edgeCurve(e), 90);
  const A = N[e.a].p, Bp = N[e.b].p;
  // trim the ends to the orb surfaces (+gap)
  let s0 = 0, s1 = poly.L;
  for (let k = 0; k < poly.pts.length; k++) if (vLen(vSub(poly.pts[k], A)) >= R + 22) { s0 = poly.s[k]; break; }
  for (let k = poly.pts.length - 1; k >= 0; k--) if (vLen(vSub(poly.pts[k], Bp)) >= R + 30) { s1 = poly.s[k]; break; }
  return {...e, poly, s0, s1};
});
export const GEO_BY_ID: Record<string, EdgeGeo> = Object.fromEntries(GEO.map((g) => [g.id, g]));

/** The token path: the four main edges joined centre-to-centre (untrimmed). */
export const TOKEN_POLY: Poly = (() => {
  const pts: V3[] = [], s: number[] = [];
  let acc = 0;
  for (let i = 0; i < TOKEN_PATH.length - 1; i++) {
    const e = GEO.find((g) => g.a === TOKEN_PATH[i] && g.b === TOKEN_PATH[i + 1])!;
    e.poly.pts.forEach((p, k) => {
      if (i > 0 && k === 0) return;
      if (pts.length) acc += vLen(vSub(p, pts[pts.length - 1]));
      pts.push(p); s.push(acc);
    });
  }
  return {pts, s, L: acc};
})();
/** arc length of each token-path node along TOKEN_POLY */
export const TOKEN_NODE_S: number[] = (() => {
  const out = [0];
  let acc = 0;
  for (let i = 0; i < TOKEN_PATH.length - 1; i++) {
    const e = GEO.find((g) => g.a === TOKEN_PATH[i] && g.b === TOKEN_PATH[i + 1])!;
    acc += e.poly.L;
    out.push(acc);
  }
  return out;
})();

/** draw progress 0..1 of an edge at global frame f (fast-out ease: the light trail shoots, then settles) */
export const drawP = (e: Edge3, f: number) => {
  const u = (f - e.from) / Math.max(1, e.to - e.from);
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  return 1 - Math.pow(1 - u, 2.6);
};
/** pop progress 0..1 of a node (0 before it pops) */
export const popP = (n: Node3, f: number, dur = 16) => Math.max(0, Math.min(1, (f - n.at) / dur));
