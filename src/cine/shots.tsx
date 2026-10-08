// Shot sequencing + transitions. A scene lists shots with LOCAL frame ranges [from, to) whose boundaries are
// the cuts (put them on beats: beatsToLocal(from, k)). <Shots> renders the right shot(s) each frame and
// overlaps neighbours during transitions.
//
// CUT CONTRACT: the cut frame `c` (= next.from) is where the incoming shot becomes the picture. For every
// transition except irisShockwave, frames ≥ c show the incoming shot as the primary image (at c it may still be
// blurred/landing — that IS the hit), frames < c show the outgoing. Effects (flash, streak, leak) peak at c.
// irisShockwave is impact-driven: the shockwave STARTS at c and the reveal completes `dur` frames later.
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FRAME_H, FRAME_W} from './camera';
import {EASES, clamp01, mix, smoothstep} from './math';
import {GlitchFx, MotionBlur, SpinBlur, ZoomBlur, shutterBlur} from './blur';
import {rand} from '../lib';

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */
export type TransitionKind = 'cut' | 'whip' | 'zoomThrough' | 'flashCut' | 'glitchCut' | 'lightLeakDissolve' | 'irisShockwave' | 'spinBlur' | 'fade';
export type WhipDir = 'left' | 'right' | 'up' | 'down';

export type Transition = {
  kind: TransitionKind;
  /** frames before the cut where the effect begins */
  pre: number;
  /** frames after the cut where it ends */
  post: number;
  [param: string]: any;
};

/** Where a shot is relative to its transitions this frame (passed to render as `info`). */
export type TxPhase = {kind: TransitionKind; d: number; pre: number; post: number; /** 0..1 through the whole transition */ p: number};

export type ShotInfo = {
  index: number;
  name?: string;
  from: number;
  to: number;
  dur: number;
  /** scene-local frame */
  t: number;
  /** set while the incoming transition (from the previous shot) is running: d = frames since the cut */
  tin?: TxPhase;
  /** set while the outgoing transition (to the next shot) is running: d = frames relative to the cut (negative) */
  tout?: TxPhase;
};

export type Shot = {
  from: number;
  to: number;
  /** lt = frames since the shot's cut-in (may be <0 / >dur while overlapping a transition), p = lt / dur */
  render: (lt: number, p: number, info: ShotInfo) => React.ReactNode;
  /** transition at this shot's start (from the previous shot) — wins over the previous shot's `out` */
  in?: Transition;
  /** transition at this shot's end (to the next shot) */
  out?: Transition;
  name?: string;
};

type Fx = {
  style?: React.CSSProperties;
  /** directional blur std px */
  sx?: number; sy?: number;
  zoom?: number;
  spin?: number;
  glitch?: {amount: number; seed: number};
};
type TxFrame = {out?: Fx | null; in?: Fx | null; inOnTop?: boolean; group?: Fx; overlay?: React.ReactNode};

/* ------------------------------------------------------------------ */
/* Transition factories                                                 */
/* ------------------------------------------------------------------ */
/** Hard cut. */
export const cut = (): Transition => ({kind: 'cut', pre: 0, post: 0});

/** Whip pan between shots: both shots ride one continuous strip with directional motion blur and light streaks.
 *  dir = direction the CAMERA whips ('right' → image flies left). split = fraction of dur before the cut (0.6).
 *  At 134 BPM: 8–12 frames (≈⅓–½ beat). */
export const whip = (o: {dir?: WhipDir; dur?: number; split?: number; blur?: number; streaks?: boolean; color?: string; seed?: number} = {}): Transition => {
  const dur = o.dur ?? 10, split = o.split ?? 0.6;
  return {kind: 'whip', pre: dur * split, post: dur * (1 - split), dir: o.dir ?? 'right', blur: o.blur ?? 1, streaks: o.streaks ?? true, color: o.color ?? '#BFF4FF', seed: o.seed ?? 1};
};

/** Zoom-through: the camera flies INTO the outgoing shot (accelerating scale + zoom blur + fade) while the
 *  incoming emerges from depth behind it and lands at the cut with residual zoom streaks. 12–18 frames. */
export const zoomThrough = (o: {dur?: number; split?: number; depth?: number; color?: string} = {}): Transition => {
  const dur = o.dur ?? 14, split = o.split ?? 0.6;
  return {kind: 'zoomThrough', pre: dur * split, post: dur * (1 - split), depth: o.depth ?? 5, color: o.color ?? '#CFF6FF'};
};

/** Flash cut: exposure blooms into a flash that peaks exactly on the cut, incoming punches in. 6–12 frames. */
export const flashCut = (o: {dur?: number; split?: number; color?: string; peak?: number; punch?: number} = {}): Transition => {
  const dur = o.dur ?? 10, split = o.split ?? 0.3;
  return {kind: 'flashCut', pre: dur * split, post: dur * (1 - split), color: o.color ?? '#FFFFFF', peak: o.peak ?? 0.9, punch: o.punch ?? 0.06};
};

/** Glitch cut: slice displacement + RGB split + interleaved slices of the other shot for a few frames. 6–10 frames. */
export const glitchCut = (o: {dur?: number; split?: number; strength?: number; seed?: number} = {}): Transition => {
  const dur = o.dur ?? 8, split = o.split ?? 0.45;
  return {kind: 'glitchCut', pre: dur * split, post: dur * (1 - split), strength: o.strength ?? 1, seed: o.seed ?? 1};
};

/** Light-leak dissolve: crossfade that completes ON the cut under a drifting anamorphic light leak. 16–40 frames. */
export const lightLeakDissolve = (o: {dur?: number; split?: number; color?: 'violet' | 'warm' | 'cyan' | 'pistachio'; strength?: number} = {}): Transition => {
  const dur = o.dur ?? 24, split = o.split ?? 0.65;
  return {kind: 'lightLeakDissolve', pre: dur * split, post: dur * (1 - split), color: o.color ?? 'violet', strength: o.strength ?? 1};
};

/** Iris shockwave: on the cut a bright ring bursts from (x, y) and reveals the incoming inside it. Reveal completes
 *  after `dur` frames (expo-out — most of the frame is revealed within ~⅓ of dur). 14–24 frames. */
export const irisShockwave = (o: {dur?: number; pre?: number; x?: number; y?: number; color?: string} = {}): Transition => {
  const dur = o.dur ?? 18, pre = o.pre ?? 0;
  return {kind: 'irisShockwave', pre, post: dur - pre, x: o.x ?? FRAME_W / 2, y: o.y ?? FRAME_H / 2, color: o.color ?? '#BFF4FF'};
};

/** Spin blur: the outgoing spins up with rotational blur; the incoming spins down into place. 10–14 frames. */
export const spinBlur = (o: {dur?: number; angle?: number; dir?: 1 | -1} = {}): Transition => {
  const dur = o.dur ?? 12;
  return {kind: 'spinBlur', pre: dur / 2, post: dur / 2, angle: o.angle ?? 120, dir: o.dir ?? 1};
};

/** Plain crossfade completing on the cut (utility). */
export const fade = (o: {dur?: number} = {}): Transition => ({kind: 'fade', pre: o.dur ?? 12, post: 0});

/** All factories in one bag. */
export const Tx = {cut, whip, zoomThrough, flashCut, glitchCut, lightLeakDissolve, irisShockwave, spinBlur, fade};

/* ------------------------------------------------------------------ */
/* Transition frame logic                                               */
/* ------------------------------------------------------------------ */
const E = EASES;
const coverScale = (deg: number) => {
  const a = Math.abs(deg * Math.PI / 180) % Math.PI;
  const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  return Math.max((FRAME_W * c + FRAME_H * s) / FRAME_W, (FRAME_W * s + FRAME_H * c) / FRAME_H);
};

const whipVec = (dir: WhipDir): [number, number] => (dir === 'right' ? [-1, 0] : dir === 'left' ? [1, 0] : dir === 'up' ? [0, 1] : [0, -1]);

const txFrame = (tr: Transition, d: number, cutFrame: number): TxFrame => {
  const {pre, post} = tr;
  const u = pre > 0 ? clamp01((d + pre) / pre) : 1; // outgoing phase 0..1
  const v = post > 0 ? clamp01(d / post) : 1;       // incoming phase 0..1
  const before = d < 0;
  switch (tr.kind) {
    case 'whip': {
      const [ex, ey] = whipVec(tr.dir);
      const D = ex !== 0 ? FRAME_W : FRAME_H;
      const a = pre / (pre + post);
      const s = (dd: number) => (dd < 0 ? a * D * E.expoIn(clamp01((dd + pre) / pre)) : a * D + (1 - a) * D * E.expoOut(clamp01(dd / post)));
      const sd = s(d);
      const vel = Math.abs(s(d + 0.5) - s(d - 0.5));
      const std = Math.min(150, shutterBlur(vel, 0.5) * tr.blur);
      const tOut = `translate(${(ex * sd).toFixed(1)}px, ${(ey * sd).toFixed(1)}px)`;
      const tIn = `translate(${(ex * (sd - D)).toFixed(1)}px, ${(ey * (sd - D)).toFixed(1)}px)`;
      const I = Math.exp(-Math.abs(d) / 2.4);
      return {
        out: sd < D - 1 ? {style: {transform: tOut}} : null,
        in: sd > 1 ? {style: {transform: tIn}} : null,
        group: {sx: ex ? std : 0, sy: ey ? std : 0, style: I > 0.05 ? {filter: `brightness(${(1 + 0.45 * I).toFixed(3)}) saturate(${(1 + 0.2 * I).toFixed(3)})`} : undefined},
        overlay: tr.streaks ? <WhipStreaks I={I} ex={ex} ey={ey} s={sd} color={tr.color} seed={tr.seed + cutFrame} /> : null,
      };
    }
    case 'zoomThrough': {
      const I = Math.exp(-Math.abs(d) / 2.6);
      if (before) {
        const sc = 1 + (tr.depth - 1) * E.expoIn(u);
        const showIn = u > 0.3;
        const inSc = mix(0.6, 0.9, smoothstep(0.3, 1, u));
        return {
          out: {style: {transform: `scale(${sc.toFixed(4)})`, opacity: 1 - smoothstep(0.5, 1, u)}, zoom: 0.35 * smoothstep(0.15, 1, u)},
          in: showIn ? {style: {transform: `scale(${inSc.toFixed(4)})`}, zoom: 0.38 * smoothstep(0.3, 1, u)} : null,
          inOnTop: false,
          overlay: <ZoomOverlay I={I} color={tr.color} />,
        };
      }
      const sc = mix(0.9, 1, E.expoOut(v));
      return {in: {style: {transform: `scale(${sc.toFixed(4)})`}, zoom: 0.38 * (1 - E.expoOut(v))}, overlay: <ZoomOverlay I={I} color={tr.color} />};
    }
    case 'flashCut': {
      const fl = before ? tr.peak * Math.pow(u, 2.2) : tr.peak * Math.pow(1 - v, 2.4);
      const overlay = fl > 0.01 ? <AbsoluteFill style={{background: tr.color, opacity: fl, mixBlendMode: 'screen'}} /> : null;
      if (before) return {out: {style: {filter: `brightness(${(1 + 1.4 * u * u).toFixed(3)})`}}, overlay};
      const pu = tr.punch * (1 - E.expoOut(v));
      return {in: {style: {transform: `scale(${(1 + pu).toFixed(4)})`, filter: v < 1 ? `brightness(${(1 + 1.1 * Math.pow(1 - v, 2)).toFixed(3)})` : undefined}}, overlay};
    }
    case 'glitchCut': {
      const g = tr.strength * (before ? smoothstep(0, 1, u) : 1 - smoothstep(0, 1, v));
      const seed = Math.floor(cutFrame * 1.7 + d * 3.1 + tr.seed * 13);
      const jx = (rand(seed * 1.3) - 0.5) * 40 * g;
      const bandsOther = (before ? u > 0.45 : v < 0.35) ? slicePath(seed, 3 + Math.floor(rand(seed) * 4)) : null;
      const overlay = g > 0.02 ? <GlitchOverlay g={g} seed={seed} /> : null;
      if (before) return {
        out: {style: {transform: `translateX(${jx.toFixed(1)}px)`}, glitch: {amount: g, seed}},
        in: bandsOther ? {style: {clipPath: `path('${bandsOther}')`, transform: `translateX(${(-jx * 1.5).toFixed(1)}px)`}, glitch: {amount: g * 0.8, seed: seed + 5}} : null,
        overlay,
      };
      return {
        in: {style: {transform: `translateX(${jx.toFixed(1)}px)`}, glitch: {amount: g, seed}},
        out: bandsOther ? {style: {clipPath: `path('${bandsOther}')`, transform: `translateX(${(-jx * 1.5).toFixed(1)}px)`}, glitch: {amount: g * 0.8, seed: seed + 5}} : null,
        overlay,
      };
    }
    case 'lightLeakDissolve': {
      const L = tr.strength * Math.exp(-Math.pow(d / ((pre + post) * 0.32), 2));
      const overlay = <LightLeak L={L} t={d} span={pre + post} color={tr.color} />;
      if (before) {
        const o = E.sine(u);
        return {out: {style: L > 0.05 ? {filter: `brightness(${(1 + 0.35 * L).toFixed(3)})`} : undefined}, in: o > 0.003 ? {style: {opacity: o, filter: L > 0.05 ? `brightness(${(1 + 0.35 * L).toFixed(3)})` : undefined}} : null, overlay};
      }
      return {in: {style: L > 0.05 ? {filter: `brightness(${(1 + 0.35 * L).toFixed(3)})`} : undefined}, overlay};
    }
    case 'irisShockwave': {
      const total = pre + post;
      const w = clamp01((d + pre) / Math.max(1, total));
      const far = Math.max(Math.hypot(tr.x, tr.y), Math.hypot(FRAME_W - tr.x, tr.y), Math.hypot(tr.x, FRAME_H - tr.y), Math.hypot(FRAME_W - tr.x, FRAME_H - tr.y));
      const r = (far + 60) * E.expoOut(w);
      const done = w >= 1;
      const I = 1 - w;
      return {
        out: done ? null : {style: {transform: `scale(${(1 + 0.06 * E.expoOut(w)).toFixed(4)})`, filter: `brightness(${(1 + 0.6 * I * I).toFixed(3)})`}},
        in: {style: done ? undefined : {clipPath: `circle(${r.toFixed(1)}px at ${tr.x}px ${tr.y}px)`, transform: `scale(${(1.08 - 0.08 * E.expoOut(w)).toFixed(4)})`, transformOrigin: `${tr.x}px ${tr.y}px`}},
        overlay: done ? null : <ShockRing r={r} x={tr.x} y={tr.y} I={I} color={tr.color} d={d + pre} />,
      };
    }
    case 'spinBlur': {
      const A = tr.angle / 2;
      const th = before ? tr.dir * A * E.expoIn(u) : -tr.dir * A * (1 - E.expoOut(v));
      const thAt = (dd: number) => (dd < 0 ? tr.dir * A * E.expoIn(clamp01((dd + pre) / pre)) : -tr.dir * A * (1 - E.expoOut(clamp01(dd / post))));
      const w = Math.abs(thAt(d + 0.5) - thAt(d - 0.5)) % 180; // deg/frame
      const sc = coverScale(th) * (1 + 0.12 * Math.exp(-Math.abs(d) / 3));
      const fx: Fx = {style: {transform: `rotate(${th.toFixed(3)}deg) scale(${sc.toFixed(4)})`}, spin: Math.min(14, w * 0.5)};
      const I = Math.exp(-Math.abs(d) / 2.5);
      const overlay = I > 0.03 ? <AbsoluteFill style={{background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,${(0.5 * I).toFixed(3)}) 0%, rgba(191,244,255,${(0.18 * I).toFixed(3)}) 30%, transparent 65%)`, mixBlendMode: 'screen'}} /> : null;
      return before ? {out: fx, overlay} : {in: fx, overlay};
    }
    case 'fade': {
      return before ? {out: {}, in: {style: {opacity: E.sine(u)}}} : {in: {}};
    }
    default:
      return before ? {out: {}} : {in: {}};
  }
};

/** Random horizontal bands as an SVG path (for glitch slices). */
const slicePath = (seed: number, n: number) => {
  let p = '';
  for (let i = 0; i < n; i++) {
    const y = Math.round(rand(seed * 2.1 + i * 7.7) * FRAME_H);
    const h = Math.round(8 + rand(seed * 3.9 + i * 1.3) * 90);
    p += `M0 ${y} H${FRAME_W} V${y + h} H0 Z `;
  }
  return p.trim();
};

/* ------------------------------------------------------------------ */
/* Overlays (gradients only — cheap)                                    */
/* ------------------------------------------------------------------ */
const WhipStreaks: React.FC<{I: number; ex: number; ey: number; s: number; color: string; seed: number}> = ({I, ex, ey, s, color, seed}) => {
  if (I < 0.03) return null;
  const horiz = ex !== 0;
  const lines = Array.from({length: 9}, (_, i) => {
    const a = rand(seed * 1.7 + i * 9.1), b = rand(seed * 2.3 + i * 4.7), c = rand(seed * 0.9 + i * 6.1);
    const across = a * (horiz ? FRAME_H : FRAME_W);
    const len = (0.35 + 0.6 * b) * (horiz ? FRAME_W : FRAME_H);
    const along = ((c * 1.6 - 0.3) * (horiz ? FRAME_W : FRAME_H) + (horiz ? ex : ey) * s * 0.6);
    const th = 1 + Math.round(rand(seed + i * 3.3) * 4);
    const col = i % 3 === 0 ? '#FFFFFF' : i % 3 === 1 ? color : '#D9C9FF';
    const op = I * (0.35 + 0.65 * rand(seed * 5.5 + i));
    const g = `linear-gradient(${horiz ? 90 : 180}deg, transparent 0%, ${col} 45%, ${col} 55%, transparent 100%)`;
    return horiz
      ? <div key={i} style={{position: 'absolute', left: along - len / 2, top: across, width: len, height: th, background: g, opacity: op, boxShadow: `0 0 ${8 + th * 4}px ${col}`}} />
      : <div key={i} style={{position: 'absolute', top: along - len / 2, left: across, height: len, width: th, background: g, opacity: op, boxShadow: `0 0 ${8 + th * 4}px ${col}`}} />;
  });
  const bandPos = 30 + 40 * rand(seed * 4.4);
  return (
    <AbsoluteFill style={{mixBlendMode: 'screen', pointerEvents: 'none'}}>
      <AbsoluteFill style={{background: `linear-gradient(${horiz ? 180 : 90}deg, transparent ${bandPos - 22}%, rgba(191,244,255,${(0.22 * I).toFixed(3)}) ${bandPos}%, transparent ${bandPos + 22}%)`}} />
      {lines}
    </AbsoluteFill>
  );
};

const ZoomOverlay: React.FC<{I: number; color: string}> = ({I, color}) => {
  if (I < 0.03) return null;
  return (
    <AbsoluteFill style={{mixBlendMode: 'screen', pointerEvents: 'none'}}>
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,${(0.85 * I).toFixed(3)}) 0%, ${color} ${(6 + 10 * I).toFixed(1)}%, transparent ${(24 + 30 * I).toFixed(1)}%)`, opacity: I}} />
      <AbsoluteFill style={{
        background: `repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,255,255,0) 0deg, rgba(220,240,255,${(0.32 * I).toFixed(3)}) 0.6deg, rgba(255,255,255,0) 1.4deg, rgba(255,255,255,0) 4.7deg)`,
        WebkitMaskImage: 'radial-gradient(circle at 50% 50%, transparent 12%, black 45%, black 100%)',
        maskImage: 'radial-gradient(circle at 50% 50%, transparent 12%, black 45%, black 100%)',
      }} />
    </AbsoluteFill>
  );
};

const GlitchOverlay: React.FC<{g: number; seed: number}> = ({g, seed}) => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.07) 0 2px, transparent 2px 5px)', opacity: g, mixBlendMode: 'screen'}} />
    {Array.from({length: 5}, (_, i) => {
      const r1 = rand(seed * 1.1 + i * 3.7), r2 = rand(seed * 2.9 + i * 5.3), r3 = rand(seed * 4.3 + i * 1.9);
      if (r3 > 0.75 * g + 0.1) return null;
      return <div key={i} style={{position: 'absolute', left: r1 * FRAME_W * 0.8, top: r2 * FRAME_H, width: 80 + r3 * 520, height: 4 + r1 * 26, background: i % 2 ? 'rgba(127,231,255,0.55)' : 'rgba(255,79,163,0.5)', mixBlendMode: 'screen'}} />;
    })}
  </AbsoluteFill>
);

const LEAKS: Record<string, [string, string, string]> = {
  violet: ['rgba(180,140,255,0.9)', 'rgba(255,170,230,0.75)', 'rgba(127,231,255,0.55)'],
  warm: ['rgba(255,170,90,0.9)', 'rgba(255,110,140,0.7)', 'rgba(255,230,170,0.6)'],
  cyan: ['rgba(127,231,255,0.9)', 'rgba(160,140,255,0.7)', 'rgba(220,255,255,0.6)'],
  pistachio: ['rgba(231,244,185,0.9)', 'rgba(180,140,255,0.6)', 'rgba(255,255,230,0.6)'],
};
const LightLeak: React.FC<{L: number; t: number; span: number; color: string}> = ({L, t, span, color}) => {
  if (L < 0.02) return null;
  const [a, b, c] = LEAKS[color] ?? LEAKS.violet;
  const k = t / Math.max(1, span); // drift
  return (
    <AbsoluteFill style={{mixBlendMode: 'screen', opacity: L, pointerEvents: 'none'}}>
      <AbsoluteFill style={{background: `radial-gradient(60% 90% at ${(20 + 60 * (k + 0.5)).toFixed(1)}% 30%, ${a} 0%, transparent 60%)`}} />
      <AbsoluteFill style={{background: `radial-gradient(45% 70% at ${(85 - 50 * (k + 0.5)).toFixed(1)}% 75%, ${b} 0%, transparent 62%)`}} />
      <AbsoluteFill style={{background: `linear-gradient(${(100 + 30 * k).toFixed(1)}deg, transparent 30%, ${c} 50%, transparent 70%)`, opacity: 0.6}} />
      <AbsoluteFill style={{background: 'rgba(255,255,255,0.18)'}} />
    </AbsoluteFill>
  );
};

const ShockRing: React.FC<{r: number; x: number; y: number; I: number; color: string; d: number}> = ({r, x, y, I, color, d}) => {
  const flash = Math.exp(-d / 2.2);
  return (
    <AbsoluteFill style={{mixBlendMode: 'screen', pointerEvents: 'none'}}>
      <AbsoluteFill style={{background: `radial-gradient(circle at ${x}px ${y}px, transparent ${Math.max(0, r - 70).toFixed(1)}px, ${color} ${Math.max(0, r - 10).toFixed(1)}px, #FFFFFF ${r.toFixed(1)}px, ${color} ${(r + 8).toFixed(1)}px, transparent ${(r + 50).toFixed(1)}px)`, opacity: Math.min(1, 0.25 + I * 1.1)}} />
      {flash > 0.03 ? <AbsoluteFill style={{background: `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,${(0.95 * flash).toFixed(3)}) 0%, rgba(191,244,255,${(0.5 * flash).toFixed(3)}) 12%, transparent 40%)`}} /> : null}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Fx wrapper                                                           */
/* ------------------------------------------------------------------ */
const full: React.CSSProperties = {position: 'absolute', left: 0, top: 0, width: FRAME_W, height: FRAME_H};
const FxWrap: React.FC<{fx?: Fx | null; children: React.ReactNode}> = ({fx, children}) => {
  if (!fx) return <div style={full}>{children}</div>;
  let node: React.ReactNode = children;
  if (fx.glitch && fx.glitch.amount > 0.01) node = <GlitchFx amount={fx.glitch.amount} seed={fx.glitch.seed}>{node}</GlitchFx>;
  if (fx.spin && fx.spin > 0.15) node = <SpinBlur angle={fx.spin}>{node}</SpinBlur>;
  if (fx.zoom && fx.zoom > 0.004) node = <ZoomBlur amount={fx.zoom}>{node}</ZoomBlur>;
  if ((fx.sx ?? 0) > 0.6 || (fx.sy ?? 0) > 0.6) node = <MotionBlur sx={fx.sx} sy={fx.sy}>{node}</MotionBlur>;
  return <div style={{...full, ...fx.style}}>{node}</div>;
};

/* ------------------------------------------------------------------ */
/* <Shots>                                                              */
/* ------------------------------------------------------------------ */
export type ShotsProps = {
  shots: Shot[];
  /** scene-local frame (default useCurrentFrame()) */
  t?: number;
  /** draw shot name / index / cut markers */
  debug?: boolean;
  style?: React.CSSProperties;
};

const trAt = (shots: Shot[], i: number): Transition | undefined => (i <= 0 || i >= shots.length ? undefined : shots[i].in ?? shots[i - 1].out);

/** Renders a list of shots, cutting exactly at each shot's `from`, overlapping neighbours during transitions. */
export const Shots: React.FC<ShotsProps> = ({shots, t: tProp, debug, style}) => {
  const cur = useCurrentFrame();
  const t = tProp ?? cur;
  if (!shots.length || t < shots[0].from || t >= shots[shots.length - 1].to) return null;
  let i = 0;
  while (i < shots.length - 1 && t >= shots[i + 1].from) i++;

  type L = {idx: number; fxs: (Fx | null | undefined)[]; z: number; tin?: TxPhase; tout?: TxPhase};
  const layers = new Map<number, L>();
  const add = (idx: number, fx: Fx | null | undefined, z: number, ph?: {tin?: TxPhase; tout?: TxPhase}) => {
    if (idx < 0 || idx >= shots.length) return;
    const l = layers.get(idx) ?? {idx, fxs: [], z};
    l.fxs.push(fx);
    l.z = Math.max(l.z, z);
    if (ph?.tin) l.tin = ph.tin;
    if (ph?.tout) l.tout = ph.tout;
    layers.set(idx, l);
  };
  const overlays: React.ReactNode[] = [];
  const groups: Fx[] = [];
  let active = false;

  // incoming transition at shots[i].from
  const trIn = trAt(shots, i);
  if (trIn && trIn.post > 0 && t - shots[i].from < trIn.post) {
    const d = t - shots[i].from;
    const fr = txFrame(trIn, d, shots[i].from);
    const ph: TxPhase = {kind: trIn.kind, d, pre: trIn.pre, post: trIn.post, p: clamp01((d + trIn.pre) / Math.max(1, trIn.pre + trIn.post))};
    const top = fr.inOnTop !== false;
    if (fr.out) add(i - 1, fr.out, top ? 1 : 2, {tout: ph});
    if (fr.in !== null) add(i, fr.in ?? undefined, top ? 2 : 1, {tin: ph});
    if (fr.group) groups.push(fr.group);
    if (fr.overlay) overlays.push(<React.Fragment key="oi">{fr.overlay}</React.Fragment>);
    active = true;
  }
  // outgoing transition at shots[i].to
  const trOut = trAt(shots, i + 1);
  if (trOut && trOut.pre > 0 && t >= shots[i].to - trOut.pre) {
    const d = t - shots[i].to;
    const fr = txFrame(trOut, d, shots[i].to);
    const ph: TxPhase = {kind: trOut.kind, d, pre: trOut.pre, post: trOut.post, p: clamp01((d + trOut.pre) / Math.max(1, trOut.pre + trOut.post))};
    const top = fr.inOnTop !== false;
    if (fr.out !== null) add(i, fr.out ?? undefined, top ? 3 : 4, {tout: ph});
    if (fr.in) add(i + 1, fr.in, top ? 4 : 3, {tin: ph});
    if (fr.group) groups.push(fr.group);
    if (fr.overlay) overlays.push(<React.Fragment key="oo">{fr.overlay}</React.Fragment>);
    active = true;
  }
  if (!active || !layers.size) add(i, undefined, 0);

  const ordered = [...layers.values()].sort((a, b) => a.z - b.z);
  let body: React.ReactNode = ordered.map((l) => {
    const s = shots[l.idx];
    const lt = t - s.from;
    const dur = s.to - s.from;
    const info: ShotInfo = {index: l.idx, name: s.name, from: s.from, to: s.to, dur, t, tin: l.tin, tout: l.tout};
    let node: React.ReactNode = s.render(lt, lt / Math.max(1, dur), info);
    for (const fx of l.fxs) node = <FxWrap fx={fx}>{node}</FxWrap>;
    return <div key={l.idx} style={full}>{node}</div>;
  });
  for (const g of groups) body = <FxWrap fx={g}>{body}</FxWrap>;

  return (
    <AbsoluteFill style={style}>
      {body}
      {overlays}
      {debug ? (
        <div style={{position: 'absolute', left: 24, bottom: 20, fontFamily: 'DejaVu Sans Mono, monospace', fontSize: 22, color: '#7FE7FF', background: 'rgba(0,0,0,0.55)', padding: '6px 12px', borderRadius: 6}}>
          {`shot ${i}${shots[i].name ? ' ' + shots[i].name : ''} · t ${t} · lt ${t - shots[i].from}${trIn && t - shots[i].from < trIn.post ? ` · IN ${trIn.kind} d=${t - shots[i].from}` : ''}${trOut && t >= shots[i].to - trOut.pre ? ` · OUT ${trOut.kind} d=${t - shots[i].to}` : ''}`}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** Build shots from cut frames: cuts[i] = start of shot i, `end` = end of the last shot. trans[i] = transition INTO shot i. */
export const shotsFromCuts = (cuts: number[], end: number, renders: Shot['render'][], trans: (Transition | undefined)[] = [], names: string[] = []): Shot[] =>
  cuts.map((c, i) => ({from: c, to: i < cuts.length - 1 ? cuts[i + 1] : end, render: renders[i % renders.length], in: trans[i], name: names[i]}));
