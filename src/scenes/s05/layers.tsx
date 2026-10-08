// s05 · States — graph rendering layers.
//  • <GraphBack>   inside <World backdrop>: grid floor, light pools under the orbs, floor reflections of edges/orbs.
//  • <GraphOrbs>   inside <World>: glass orbs (billboards) + edge label chips — real CSS 3D, DOF-aware.
//  • <GraphLight>  screen-space SVG on TOP of the World: light-trail edges, draw heads, energy pulses and the
//                  token comet, projected through the camera with a software z-test against the orbs
//                  (edges behind an orb read "through the glass"). Exact perspective, ~free to render.
import React from 'react';
import {FloorGrid, Obj, project, useCam} from '../../cine';
import type {ResolvedCam} from '../../cine';
import type {V3} from '../../cine/types';
import {GlassOrbNode, Icon} from '../../ui';
import {FONT, MONO, clamp} from '../../lib';
import {EDGES, FLOOR, GEO, N, NODES, ORB, R, TOKEN_POLY, drawP, polyAt, popP, EdgeGeo, Poly} from './graph';

/* ------------------------------------------------------------------ */
/* palette                                                              */
/* ------------------------------------------------------------------ */
const COL = {
  cyan: '127,231,255',
  lilac: '205,187,255',
  violet: '140,107,234',
  pist: '231,244,185',
  green: '69,227,176',
  white: '255,255,255',
};
const EDGE_COL: Record<EdgeGeo['kind'], [string, string]> = {
  main: [COL.cyan, COL.lilac],
  branch: [COL.pist, COL.cyan],
  cycle: [COL.lilac, COL.cyan],
  return: [COL.lilac, COL.violet],
};

/* ------------------------------------------------------------------ */
/* projection helpers                                                   */
/* ------------------------------------------------------------------ */
type SP = {x: number; y: number; sc: number; d: number};
const NEAR = 60;
const rawCam = (c: ResolvedCam): ResolvedCam => ({...c, zoom: 1, shiftX: 0, shiftY: 0});
const P = (c: ResolvedCam, p: V3): SP => {
  const q = project(c, p);
  return {x: q.x, y: q.y, sc: q.scale, d: q.depth};
};
const f1 = (v: number) => v.toFixed(1);

/** variable-width ribbon polygon through screen points */
const ribbon = (pts: SP[], w: (i: number, p: SP) => number) => {
  const n = pts.length;
  if (n < 2) return '';
  const L: string[] = [], Rr: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b.x - a.x, dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    const h = w(i, pts[i]) / 2;
    L.push(`${f1(pts[i].x - dy * h)} ${f1(pts[i].y + dx * h)}`);
    Rr.push(`${f1(pts[i].x + dy * h)} ${f1(pts[i].y - dx * h)}`);
  }
  return `M${L.join('L')}L${Rr.reverse().join('L')}Z`;
};

/** screen discs of the orbs currently on screen (for the software z-test) */
type Disc = {x: number; y: number; r: number; d: number};
const orbDiscs = (c: ResolvedCam, f: number): Disc[] =>
  NODES.filter((n) => f >= n.at).map((n) => {
    const q = P(c, n.p);
    return {x: q.x, y: q.y, r: R * q.sc * 0.9, d: q.d};
  }).filter((q) => q.d > NEAR);
const behindGlass = (q: SP, discs: Disc[]) => discs.some((o) => q.d > o.d + 20 && Math.hypot(q.x - o.x, q.y - o.y) < o.r);

/** sample a stretch of a polyline into screen-space runs, split at the near plane and where glass occludes */
type Run = {pts: SP[]; glass: boolean; s: number[]};
const runsOf = (c: ResolvedCam, poly: Poly, a: number, b: number, step: number, discs: Disc[]): Run[] => {
  const out: Run[] = [];
  if (b - a < 1) return out;
  const n = Math.max(2, Math.ceil((b - a) / step));
  let cur: Run | null = null;
  let prev: SP | null = null;
  for (let k = 0; k <= n; k++) {
    const sl = a + ((b - a) * k) / n;
    const q = P(c, polyAt(poly, sl));
    if (q.d < NEAR) { cur = null; prev = null; continue; }
    const g = discs.length ? behindGlass(q, discs) : false;
    if (!cur || cur.glass !== g) {
      cur = {pts: prev ? [prev] : [], glass: g, s: prev ? [sl] : []};
      out.push(cur);
    }
    cur.pts.push(q);
    cur.s.push(sl);
    prev = q;
  }
  return out.filter((r) => r.pts.length >= 2);
};

/* ------------------------------------------------------------------ */
/* <GraphLight>: edges, pulses, token — screen space over the World     */
/* ------------------------------------------------------------------ */
export type TokenState = {s: number; trail: number; I: number};

export const GraphLight: React.FC<{cam: ResolvedCam; f: number; uid: string; token?: TokenState | null; dim?: number; pulses?: boolean}> = ({cam, f, uid, token, dim = 1, pulses = true}) => {
  const discs = orbDiscs(cam, f);
  const els: React.ReactNode[] = [];
  const defs: React.ReactNode[] = [];
  const wc = (base: number, lo: number, hi: number) => (_: number, p: SP) => Math.max(lo, Math.min(hi, base * p.sc));

  GEO.forEach((e, ei) => {
    const pd = drawP(e, f);
    if (pd <= 0) return;
    const [ca, cb] = EDGE_COL[e.kind];
    const tip = e.s0 + (e.s1 - e.s0) * pd;
    const A = P(cam, polyAt(e.poly, e.s0)), Bq = P(cam, polyAt(e.poly, e.s1));
    const gid = `${uid}-g${ei}`;
    defs.push(
      <linearGradient key={gid} id={gid} gradientUnits="userSpaceOnUse" x1={f1(A.x)} y1={f1(A.y)} x2={f1(Bq.x)} y2={f1(Bq.y)}>
        <stop offset="0" stopColor={`rgb(${ca})`} />
        <stop offset="1" stopColor={`rgb(${cb})`} />
      </linearGradient>,
    );
    const done = pd >= 1;
    const age = f - e.to;
    // freshly finished edges flare up, then settle
    const settle = done ? 1 + 0.6 * Math.exp(-age / 9) : 1.25;
    const segs: [number, number][] = [];
    if (e.dashed) {
      const dash = 46, gap = 30, off = (f * 1.6) % (dash + gap);
      for (let s = e.s0 - off; s < tip; s += dash + gap) {
        const a = Math.max(e.s0, s), b = Math.min(tip, s + dash);
        if (b - a > 4) segs.push([a, b]);
      }
    } else segs.push([e.s0, tip]);
    segs.forEach(([a, b], si) => {
      runsOf(cam, e.poly, a, b, e.dashed ? 7 : 22, discs).forEach((run, ri) => {
        const o = (run.glass ? 0.28 : 1) * dim;
        const k = `${ei}-${si}-${ri}`;
        if (e.dashed) {
          // lozenge dash: tapers at both ends (no blocky caps)
          const tap = (i: number) => Math.pow(Math.sin(Math.PI * clamp((run.s[i] - a) / Math.max(1, b - a))), 0.55);
          els.push(
            <g key={k} opacity={o}>
              <path d={ribbon(run.pts, (i, p) => clamp(22 * p.sc, 2, 34) * tap(i))} fill={`rgba(${ca},${(0.32 * settle).toFixed(3)})`} />
              <path d={ribbon(run.pts, (i, p) => clamp(6 * p.sc, 1.2, 10) * tap(i))} fill={`rgba(255,255,255,${Math.min(1, 0.9 * settle).toFixed(3)})`} />
            </g>,
          );
          return;
        }
        els.push(
          <g key={k} opacity={o}>
            <path d={ribbon(run.pts, wc(46, 3, 80))} fill={`rgba(${ca},${(0.1 * settle).toFixed(3)})`} />
            <path d={ribbon(run.pts, wc(15, 1.6, 26))} fill={`url(#${gid})`} opacity={Math.min(1, 0.62 * settle)} />
            <path d={ribbon(run.pts, wc(4.4, 0.9, 8))} fill={`rgba(255,255,255,${Math.min(1, 0.85 * settle).toFixed(3)})`} />
          </g>,
        );
      });
    });
    // arrowhead chevron at the end
    if (pd > 0.96) {
      const end = P(cam, polyAt(e.poly, e.s1)), pre = P(cam, polyAt(e.poly, e.s1 - 30));
      if (end.d > NEAR && pre.d > NEAR && !behindGlass(end, discs)) {
        let dx = end.x - pre.x, dy = end.y - pre.y;
        const l = Math.hypot(dx, dy) || 1;
        dx /= l; dy /= l;
        const h = clamp(26 * end.sc, 6, 40);
        const tipx = end.x + dx * h * 0.6, tipy = end.y + dy * h * 0.6;
        const bx = end.x - dx * h * 0.7, by = end.y - dy * h * 0.7;
        const d = `M${f1(tipx)} ${f1(tipy)}L${f1(bx - dy * h * 0.62)} ${f1(by + dx * h * 0.62)}L${f1(end.x - dx * h * 0.25)} ${f1(end.y - dy * h * 0.25)}L${f1(bx + dy * h * 0.62)} ${f1(by - dx * h * 0.62)}Z`;
        els.push(<path key={`ar${ei}`} d={d} fill={`rgb(${cb})`} stroke="rgba(255,255,255,0.9)" strokeWidth={1.2} opacity={clamp((pd - 0.96) * 25) * dim} />);
      }
    }
    // hot draw head while the trail shoots out
    if (!done) {
      const h = P(cam, polyAt(e.poly, tip));
      if (h.d > NEAR) {
        const r = clamp(70 * h.sc, 10, 160);
        els.push(
          <g key={`hd${ei}`} opacity={dim}>
            <ellipse cx={f1(h.x)} cy={f1(h.y)} rx={f1(r * 4.2)} ry={f1(Math.max(1.2, r * 0.05))} fill="rgba(220,250,255,0.75)" />
            <circle cx={f1(h.x)} cy={f1(h.y)} r={f1(r)} fill={`url(#${uid}-head)`} />
          </g>,
        );
      }
    }
    // energy pulses on finished solid edges
    if (pulses && done && !e.dashed) {
      const len = e.s1 - e.s0, per = 520, sp = 11, pl = 120;
      for (let k = 0; k < Math.ceil(len / per) + 1; k++) {
        const head = e.s0 + ((((age + ei * 23) * sp + k * per) % (len + per)) + per) % (len + per) - per * 0.2;
        const a = Math.max(e.s0, head - pl), b = Math.min(e.s1, head);
        if (b - a < 8) continue;
        runsOf(cam, e.poly, a, b, 14, discs).forEach((run, ri) => {
          const o = (run.glass ? 0.3 : 1) * dim;
          const n = run.pts.length;
          els.push(
            <g key={`p${ei}-${k}-${ri}`} opacity={o}>
              <path d={ribbon(run.pts, (i, p) => clamp(40 * p.sc, 4, 70) * (0.25 + 0.75 * (i / (n - 1))))} fill={`rgba(${ca},0.35)`} />
              <path d={ribbon(run.pts, (i, p) => clamp(9 * p.sc, 1.6, 16) * (0.2 + 0.8 * (i / (n - 1))))} fill="#FFFFFF" />
            </g>,
          );
        });
      }
    }
  });

  // token comet
  if (token && token.I > 0.01) {
    const a = Math.max(0, token.s - token.trail), b = Math.min(TOKEN_POLY.L, token.s);
    runsOf(cam, TOKEN_POLY, a, b, 12, discs).forEach((run, ri) => {
      const o = (run.glass ? 0.45 : 1) * token.I;
      const w = (i: number, p: SP, base: number, lo: number, hi: number) => clamp(base * p.sc, lo, hi) * Math.pow(clamp((run.s[i] - a) / Math.max(1, b - a)), 0.9);
      els.push(
        <g key={`tk${ri}`} opacity={o}>
          <path d={ribbon(run.pts, (i, p) => w(i, p, 110, 6, 200))} fill={`rgba(${COL.cyan},0.22)`} />
          <path d={ribbon(run.pts, (i, p) => w(i, p, 34, 2.5, 60))} fill={`rgba(${COL.cyan},0.75)`} />
          <path d={ribbon(run.pts, (i, p) => w(i, p, 11, 1.4, 22))} fill="#FFFFFF" />
        </g>,
      );
    });
    const h = P(cam, polyAt(TOKEN_POLY, token.s));
    if (h.d > NEAR) {
      const r = clamp(95 * h.sc, 14, 260);
      const g = behindGlass(h, discs) ? 0.55 : 1;
      els.push(
        <g key="tkh" opacity={token.I * g}>
          <circle cx={f1(h.x)} cy={f1(h.y)} r={f1(r * 2.2)} fill={`url(#${uid}-halo)`} />
          <ellipse cx={f1(h.x)} cy={f1(h.y)} rx={f1(r * 5)} ry={f1(Math.max(1.5, r * 0.045))} fill="rgba(220,250,255,0.85)" />
          <circle cx={f1(h.x)} cy={f1(h.y)} r={f1(r)} fill={`url(#${uid}-head)`} />
        </g>,
      );
    }
  }

  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}} aria-hidden>
      <defs>
        <radialGradient id={`${uid}-head`}>
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="0.22" stopColor="#E6FBFF" stopOpacity="0.95" />
          <stop offset="0.5" stopColor={`rgb(${COL.cyan})`} stopOpacity="0.45" />
          <stop offset="1" stopColor={`rgb(${COL.violet})`} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-halo`}>
          <stop offset="0" stopColor={`rgb(${COL.cyan})`} stopOpacity="0.4" />
          <stop offset="0.45" stopColor={`rgb(${COL.violet})`} stopOpacity="0.16" />
          <stop offset="1" stopColor={`rgb(${COL.violet})`} stopOpacity="0" />
        </radialGradient>
        {defs}
      </defs>
      {els}
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* <GraphBack>: floor grid + light pools + reflections (World backdrop) */
/* ------------------------------------------------------------------ */
const mirror = (p: V3): V3 => [p[0], 2 * FLOOR - p[1], p[2]];

/** projected circle on the floor plane (true perspective, near-clipped) as one polyline path */
const floorRing = (c: ResolvedCam, x: number, z: number, r: number, n: number, a0 = 0, a1 = Math.PI * 2) => {
  let d = '';
  let pen = false;
  for (let k = 0; k <= n; k++) {
    const a = a0 + ((a1 - a0) * k) / n;
    const q = P(c, [x + Math.cos(a) * r, FLOOR, z + Math.sin(a) * r]);
    if (q.d < NEAR * 2) { pen = false; continue; }
    d += `${pen ? 'L' : 'M'}${f1(q.x)} ${f1(q.y)}`;
    pen = true;
  }
  return d;
};
/** radial ticks on a floor ring */
const floorTicks = (c: ResolvedCam, x: number, z: number, r0: number, r1: number, n: number, rot: number) => {
  let d = '';
  for (let k = 0; k < n; k++) {
    const a = rot + (k / n) * Math.PI * 2;
    const long = k % 6 === 0 ? 1.8 : 1;
    const p0 = P(c, [x + Math.cos(a) * r0, FLOOR, z + Math.sin(a) * r0]);
    const p1 = P(c, [x + Math.cos(a) * (r0 + (r1 - r0) * long), FLOOR, z + Math.sin(a) * (r0 + (r1 - r0) * long)]);
    if (p0.d < NEAR * 2 || p1.d < NEAR * 2) continue;
    d += `M${f1(p0.x)} ${f1(p0.y)}L${f1(p1.x)} ${f1(p1.y)}`;
  }
  return d;
};

export const GraphBack: React.FC<{f: number; uid: string; grid?: number; refl?: number; activeId?: string | null; hud?: number}> = ({f, uid, grid = 0.34, refl = 1, activeId, hud = 1}) => {
  const c0 = useCam();
  if (!c0) return null;
  const c = rawCam(c0);
  const below = c.pos[1] < FLOOR - 1; // camera above the floor
  // affine approximation of a floor circle → screen ellipse (gradientTransform)
  const pool = (x: number, z: number, r: number, key: string, rgb: string, o: number) => {
    const ctr = P(c, [x, FLOOR, z]);
    if (ctr.d < NEAR * 2) return null;
    const ex = P(c, [x + r, FLOOR, z]), ez = P(c, [x, FLOOR, z + r]);
    if (ex.d < NEAR || ez.d < NEAR) return null;
    const m = `matrix(${f1(ex.x - ctr.x)} ${f1(ex.y - ctr.y)} ${f1(ez.x - ctr.x)} ${f1(ez.y - ctr.y)} ${f1(ctr.x)} ${f1(ctr.y)})`;
    return (
      <g key={key} transform={m} opacity={o}>
        <circle r={1} fill={`url(#${uid}-pool-${rgb === COL.cyan ? 'c' : rgb === COL.green ? 'g' : rgb === COL.pist ? 'p' : 'l'})`} />
      </g>
    );
  };
  const items: React.ReactNode[] = [];
  if (below) {
    items.push(pool(0, 0, 2600, 'plate', COL.lilac, 0.5));
    NODES.forEach((n) => {
      const pp = popP(n, f, 22);
      if (pp <= 0) return;
      const rgb = n.start ? COL.green : n.id === activeId ? COL.cyan : n.id === 'human_handoff' ? COL.pist : COL.lilac;
      items.push(pool(n.p[0], n.p[2], 520 * (0.6 + 0.4 * pp), `pl${n.id}`, rgb, 0.85 * pp));
    });
    // "map table" HUD etched on the floor: a ring + ticks under every state, a slow compass around the graph
    if (hud > 0) {
      const H = FLOOR - c.pos[1]; // camera height above the floor
      const ho = hud * clamp((H - 250) / 900);
      if (ho > 0.02) {
        const big = floorRing(c, 0, 0, 1900, 160);
        const bigT = floorTicks(c, 0, 0, 1900, 1950, 72, f * 0.0012);
        items.push(<path key="cmp" d={big} fill="none" stroke={`rgba(${COL.lilac},${(0.22 * ho).toFixed(3)})`} strokeWidth={1.3} />);
        items.push(<path key="cmpt" d={bigT} fill="none" stroke={`rgba(${COL.lilac},${(0.3 * ho).toFixed(3)})`} strokeWidth={1.2} />);
        items.push(<path key="cmp2" d={floorRing(c, 0, 0, 2080, 160, f * 0.002, f * 0.002 + 1.4)} fill="none" stroke={`rgba(${COL.cyan},${(0.35 * ho).toFixed(3)})`} strokeWidth={2} />);
        items.push(<path key="cmp3" d={floorRing(c, 0, 0, 2080, 160, f * 0.002 + 3.3, f * 0.002 + 4.0)} fill="none" stroke={`rgba(${COL.cyan},${(0.35 * ho).toFixed(3)})`} strokeWidth={2} />);
      }
      NODES.forEach((n) => {
        const pp = popP(n, f, 20);
        if (pp <= 0) return;
        const r = 250 + 40 * (1 - pp);
        const isAct = n.id === activeId;
        const rgb = n.start ? COL.green : isAct ? COL.cyan : COL.lilac;
        const o = hud * pp * (isAct ? 0.85 : 0.5);
        const rot = f * (isAct ? 0.02 : 0.006) + n.p[0] * 0.01;
        items.push(<path key={`fr${n.id}`} d={floorRing(c, n.p[0], n.p[2], r, 48)} fill="none" stroke={`rgba(${rgb},${(0.55 * o).toFixed(3)})`} strokeWidth={1.4} />);
        items.push(<path key={`fa${n.id}`} d={floorRing(c, n.p[0], n.p[2], r + 34, 40, rot, rot + 1.9)} fill="none" stroke={`rgba(${rgb},${(0.8 * o).toFixed(3)})`} strokeWidth={2.4} />);
        items.push(<path key={`fb${n.id}`} d={floorRing(c, n.p[0], n.p[2], r + 34, 40, rot + Math.PI, rot + Math.PI + 1.1)} fill="none" stroke={`rgba(${rgb},${(0.8 * o).toFixed(3)})`} strokeWidth={2.4} />);
        items.push(<path key={`ft${n.id}`} d={floorTicks(c, n.p[0], n.p[2], r + 8, r + 22, 36, -rot * 0.5)} fill="none" stroke={`rgba(${rgb},${(0.5 * o).toFixed(3)})`} strokeWidth={1.2} />);
      });
    }
    // reflections: mirrored edges + orbs (seen through the glassy floor)
    if (refl > 0) {
      GEO.forEach((e, ei) => {
        const pd = drawP(e, f);
        if (pd <= 0) return;
        const tip = e.s0 + (e.s1 - e.s0) * pd;
        const n = 24;
        const pts: SP[] = [];
        for (let k = 0; k <= n; k++) {
          const q = P(c, mirror(polyAt(e.poly, e.s0 + ((tip - e.s0) * k) / n)));
          if (q.d > NEAR) pts.push(q);
        }
        if (pts.length < 2) return;
        const [ca] = EDGE_COL[e.kind];
        items.push(<path key={`re${ei}`} d={ribbon(pts, (_, p) => clamp(30 * p.sc, 2, 50))} fill={`rgba(${ca},${(0.09 * refl).toFixed(3)})`} />);
        items.push(<path key={`rc${ei}`} d={ribbon(pts, (_, p) => clamp(4 * p.sc, 0.6, 6))} fill={`rgba(255,255,255,${(0.16 * refl).toFixed(3)})`} />);
      });
      NODES.forEach((n) => {
        const pp = popP(n, f, 16);
        if (pp <= 0) return;
        const q = P(c, mirror(n.p));
        if (q.d < NEAR) return;
        const r = R * q.sc * (0.5 + 0.5 * pp);
        const key = n.start ? 'g' : n.id === activeId ? 'c' : n.id === 'human_handoff' ? 'p' : 'l';
        items.push(<circle key={`ro${n.id}`} cx={f1(q.x)} cy={f1(q.y)} r={f1(r * 1.3)} fill={`url(#${uid}-rf-${key})`} opacity={0.75 * refl * pp} />);
      });
    }
  }
  const stopSet = (id: string, rgb: string, a: number) => (
    <radialGradient key={id} id={id} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor={`rgb(${rgb})`} stopOpacity={a} />
      <stop offset="0.35" stopColor={`rgb(${rgb})`} stopOpacity={a * 0.42} />
      <stop offset="1" stopColor={`rgb(${rgb})`} stopOpacity="0" />
    </radialGradient>
  );
  return (
    <>
      {grid > 0 && <FloorGrid y={FLOOR} step={160} extent={4200} center={[0, 0]} fade={[1100, 3900]} opacity={grid} width={1.6} color="rgb(176,150,245)" far={9000} />}
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} aria-hidden>
        <defs>
          {[['c', COL.cyan], ['g', COL.green], ['p', COL.pist], ['l', COL.lilac]].map(([k, rgb]) => (
            <radialGradient key={`rf${k}`} id={`${uid}-rf-${k}`}>
              <stop offset="0" stopColor={`rgb(${rgb})`} stopOpacity="0.34" />
              <stop offset="0.45" stopColor={`rgb(${rgb})`} stopOpacity="0.14" />
              <stop offset="1" stopColor={`rgb(${rgb})`} stopOpacity="0" />
            </radialGradient>
          ))}
          {stopSet(`${uid}-pool-c`, COL.cyan, 0.42)}
          {stopSet(`${uid}-pool-g`, COL.green, 0.36)}
          {stopSet(`${uid}-pool-p`, COL.pist, 0.32)}
          {stopSet(`${uid}-pool-l`, COL.violet, 0.4)}
        </defs>
        {items}
      </svg>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* <GraphOrbs>: glass orbs + label chips (inside the World)             */
/* ------------------------------------------------------------------ */
const OrbFx: React.FC<{f: number; at: number; rgb: string}> = ({f, at, rgb}) => {
  const d = f - at;
  if (d < 0 || d > 30) return null;
  const u = d / 30;
  const ring = ORB * (1 + 1.5 * (1 - Math.pow(1 - u, 3)));
  const fl = Math.exp(-d / 4);
  return (
    <>
      <div style={{position: 'absolute', left: (ORB - ring) / 2, top: (ORB - ring) / 2, width: ring, height: ring, borderRadius: '50%',
        boxShadow: `inset 0 0 0 ${(5 * (1 - u) + 1).toFixed(2)}px rgba(${rgb},${(0.95 * (1 - u)).toFixed(3)}), 0 0 ${(30 * (1 - u)).toFixed(1)}px rgba(${rgb},${(0.7 * (1 - u)).toFixed(3)})`}} />
      {fl > 0.03 && <div style={{position: 'absolute', left: -ORB * 0.6, top: -ORB * 0.6, width: ORB * 2.2, height: ORB * 2.2, borderRadius: '50%',
        background: `radial-gradient(closest-side, rgba(255,255,255,${(0.95 * fl).toFixed(3)}), rgba(${rgb},${(0.55 * fl).toFixed(3)}) 35%, rgba(${rgb},0) 100%)`}} />}
    </>
  );
};

const LabelChip: React.FC<{text: string; rgb: string; p: number}> = ({text, rgb, p}) => (
  <div style={{
    transform: `translate(-50%, -50%) scale(${(0.7 + 0.3 * p).toFixed(3)})`, position: 'absolute', left: 0, top: 0,
    padding: '10px 24px 11px', borderRadius: 999, whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 30, fontWeight: 700, letterSpacing: '0.01em',
    color: `rgb(${rgb})`, background: 'linear-gradient(180deg, rgba(26,14,52,0.86), rgba(10,5,24,0.8))',
    boxShadow: `inset 0 0 0 2px rgba(${rgb},0.85), 0 0 28px -2px rgba(${rgb},0.75), inset 0 1px 0 rgba(255,255,255,0.35)`,
    textShadow: `0 0 14px rgba(${rgb},0.8)`, opacity: p,
  }}>{text}</div>
);

/** Gradient-only orb (no blurred box-shadows) used when an orb fills a big part of the frame — the
 *  GlassOrbNode shadows rasterise at screen size and cost ~1.5 s/frame for a lens-filling orb. Same look language. */
const ORB_TONE_RGB: Record<string, string> = {lilac: '160,130,255', cyan: '127,231,255', green: '69,227,176', amber: '255,192,77'};
const LiteOrb: React.FC<{tone: string; label: string; icon?: string; start?: boolean; active: number; p: number; t: number}> = ({tone, label, icon, start, active, p, t}) => {
  const rgb = ORB_TONE_RGB[tone] ?? ORB_TONE_RGB.lilac;
  const s = ORB, a = active;
  const I = start ? Icon.play : icon ? Icon[icon] : null;
  const sc = 0.4 + 0.6 * clamp(p);
  const ph = ((t / 46) % 1 + 1) % 1;
  return (
    <div style={{position: 'relative', width: s, height: s, transform: `scale(${sc.toFixed(4)})`, fontFamily: FONT_UI}}>
      <div style={{position: 'absolute', left: -s * 0.55, top: -s * 0.55, width: s * 2.1, height: s * 2.1, borderRadius: '50%', background: `radial-gradient(closest-side, rgba(${rgb},${(0.32 * (0.45 + a)).toFixed(3)}), rgba(${rgb},0) 100%)`}} />
      {a > 0.01 && <div style={{position: 'absolute', left: -s * 0.38 * ph, top: -s * 0.38 * ph, width: s * (1 + 0.76 * ph), height: s * (1 + 0.76 * ph), borderRadius: '50%', border: `${(2.5 - 1.5 * ph).toFixed(2)}px solid rgba(${rgb},${(a * (1 - ph) * 0.9).toFixed(3)})`, boxSizing: 'border-box'}} />}
      <div style={{position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.45)', boxSizing: 'border-box',
        background: `radial-gradient(circle at 34% 27%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.18) 9%, rgba(255,255,255,0) 22%), radial-gradient(circle at 60% 66%, rgba(${rgb},0) 52%, rgba(${rgb},0.5) 92%), radial-gradient(circle at 50% 58%, rgba(${rgb},${(0.08 + 0.12 * a).toFixed(3)}) 0%, rgba(${rgb},${(0.16 + 0.14 * a).toFixed(3)}) 48%, rgba(${rgb},${(0.5 + 0.2 * a).toFixed(3)}) 86%, rgba(235,250,255,0.75) 100%), rgba(14,8,30,0.55)`}}>
        <div style={{position: 'absolute', left: '14%', right: '14%', bottom: '5%', height: '34%', borderRadius: '50%', background: `radial-gradient(50% 60% at 50% 100%, rgba(${rgb},${(0.55 + 0.35 * a).toFixed(3)}), rgba(${rgb},0) 100%)`}} />
        <div style={{position: 'absolute', left: '18%', top: '11%', width: '32%', height: '17%', borderRadius: '50%', transform: 'rotate(-32deg)', background: 'radial-gradient(closest-side, rgba(255,255,255,0.95), rgba(255,255,255,0) 100%)'}} />
      </div>
      <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: s * 0.04}}>
        {I && <div style={{marginLeft: start ? s * 0.03 : 0}}><I size={s * 0.22} color="#fff" sw={2} /></div>}
        <div style={{fontSize: s * 0.105, fontWeight: 650, color: '#F6F2FF', whiteSpace: 'nowrap'}}>{label}</div>
      </div>
      {a > 0.01 && <div style={{position: 'absolute', left: -s * 0.25, top: s * 0.31, width: s * 1.5, height: s * 0.38, borderRadius: '50%', border: `2px solid rgba(${rgb},${(0.75 * a).toFixed(3)})`, boxSizing: 'border-box'}} />}
    </div>
  );
};

export const GraphOrbs: React.FC<{f: number; activeId?: string | null; nearFade?: [number, number]; labels?: boolean; labelScale?: number}> = ({f, activeId, nearFade = [70, 420], labels = true, labelScale = 1}) => {
  const cam = useCam();
  return (
  <>
    {NODES.map((n) => {
      if (f < n.at) return null;
      const p = popP(n, f, 14);
      const act = n.id === activeId ? 1 : 0;
      const tone = n.start ? 'green' : act ? 'cyan' : n.id === 'human_handoff' ? 'amber' : 'lilac';
      const rgb = n.start ? COL.green : act ? COL.cyan : n.id === 'human_handoff' ? COL.pist : COL.lilac;
      // on-screen radius decides full GlassOrbNode vs the gradient-only lite orb
      const sr = cam ? R * project(cam, n.p).scale : 0;
      const lite = sr > 230;
      return (
        <Obj key={n.id} x={n.p[0]} y={n.p[1]} z={n.p[2]} w={ORB} h={ORB} billboard nearFade={nearFade}>
          <div style={{position: 'relative', width: ORB, height: ORB}}>
            {lite
              ? <LiteOrb tone={tone} label={n.id} icon={n.icon} start={n.start} active={act} p={p} t={f} />
              : <GlassOrbNode size={ORB} label={n.id} icon={n.icon} start={n.start} active={act} t={f} tone={tone as any} p={p} look="holo" />}
            <div style={{position: 'absolute', left: 0, top: 0, width: ORB, height: ORB}}><OrbFx f={f} at={n.at} rgb={rgb} /></div>
          </div>
        </Obj>
      );
    })}
    {labels && GEO.filter((e) => e.label && e.labelAt !== undefined && f >= e.labelAt).map((e) => {
      const p = clamp((f - (e.labelAt as number)) / 10);
      const m = polyAt(e.poly, e.s0 + (e.s1 - e.s0) * (e.labelU ?? 0.5));
      const rgb = e.kind === 'branch' ? COL.pist : COL.cyan;
      const pos: V3 = [m[0], m[1] - 70, m[2]];
      // keep chips legible: at least ~0.72× native size on screen
      const d = cam ? project(cam, pos).depth : 0;
      const s = cam && d > 0 ? clamp((0.72 * d) / cam.persp, 1, 2.4) * labelScale : labelScale;
      return (
        <Obj key={`lb${e.id}`} x={pos[0]} y={pos[1]} z={pos[2]} billboard s={s} nearFade={[80, 360]}>
          <LabelChip text={e.label as string} rgb={rgb} p={p} />
        </Obj>
      );
    })}
  </>
  );
};

/** number of nodes / edges visible at f (HUD counters) */
export const graphCounts = (f: number) => ({
  nodes: NODES.filter((n) => f >= n.at).length,
  edges: EDGES.filter((e) => drawP(e, f) >= 1).length,
});
export {N};
export const FONT_UI = FONT;
