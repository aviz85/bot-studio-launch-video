/* Shared VFX helpers: deterministic noise/PRNG, envelopes, colour utils, canvas helpers.
 * Everything here is a pure function of its inputs (no Math.random / Date). */
import React, {useId, useLayoutEffect, useRef} from 'react';
import {useCurrentFrame} from 'remotion';

export const W = 1920;
export const H = 1080;
export const CX = W / 2;
export const CY = H / 2;

/** Brand / VFX palette. */
export const VC = {
  cyan: '#7FE7FF',
  ice: '#CFF6FF',
  violet: '#8C6BEA',
  violetDeep: '#6A45E0',
  lilac: '#CDBBFF',
  magenta: '#E05CFF',
  pistachio: '#E7F4B9',
  amber: '#ECAF42',
  rose: '#FF6A9A',
  white: '#FFFFFF',
  space0: '#04020A',
  space1: '#120726',
};

/* ---------------- PRNG / noise ---------------- */
/** Integer hash → [0,1). */
export const hash = (n: number) => {
  let x = (n | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
};
/** Hash of two ints. */
export const hash2 = (a: number, b: number) => hash((a | 0) * 73856093 ^ (b | 0) * 19349663);

/** Seeded PRNG (mulberry32) for loops; deterministic sequence per seed. */
export const prng = (seed: number) => {
  let a = (Math.floor(seed * 9973) ^ 0x6d2b79f5) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const sstep = (t: number) => t * t * (3 - 2 * t);
/** Smooth 1D value noise in [0,1]. */
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  return hash2(i, seed) + (hash2(i + 1, seed) - hash2(i, seed)) * sstep(f);
};
/** Smooth 2D value noise in [0,1]. */
export const noise2 = (x: number, y: number, seed = 0) => {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = sstep(x - ix), fy = sstep(y - iy);
  const s = seed * 131;
  const a = hash2(ix + s, iy), b = hash2(ix + 1 + s, iy);
  const c = hash2(ix + s, iy + 1), d = hash2(ix + 1 + s, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};
/** Fractal 1D noise (signed, ≈ -1..1). */
export const fbm1 = (x: number, seed = 0, oct = 3) => {
  let v = 0, amp = 0.5, fr = 1, norm = 0;
  for (let o = 0; o < oct; o++) { v += (noise1(x * fr, seed + o * 17) * 2 - 1) * amp; norm += amp; amp *= 0.5; fr *= 2.03; }
  return v / norm;
};

/* ---------------- envelopes ---------------- */
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeInExpo = (t: number) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10));
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);

/** Impulse envelope: fast attack (attack frames) to 1, then exponential decay (tau frames). 0 before `at`. */
export const impulse = (f: number, at: number, attack = 2, tau = 14) => {
  const t = f - at;
  if (t < 0) return 0;
  if (t < attack) return easeOutCubic(t / Math.max(attack, 0.001));
  return Math.exp(-(t - attack) / tau);
};
/** Trapezoid window: ramps in over `fadeIn`, holds, ramps out over `fadeOut` before start+dur. */
export const windowEnv = (f: number, start: number, dur: number, fadeIn = 10, fadeOut = 10) => {
  if (f < start || f > start + dur) return 0;
  const a = fadeIn > 0 ? clamp01((f - start) / fadeIn) : 1;
  const b = fadeOut > 0 ? clamp01((start + dur - f) / fadeOut) : 1;
  return Math.min(sstep(a), sstep(b));
};
/** Linear progress 0..1 of f in [start, start+dur]. */
export const lin = (f: number, start: number, dur: number) => clamp01((f - start) / Math.max(1e-6, dur));

/* ---------------- colour ---------------- */
export const hexToRgb = (hex: string): [number, number, number] => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
/** rgba() string from hex + alpha (alpha clamped). Accepts 'rgb(…)' passthrough for non-hex. */
export const rgba = (hex: string, a: number) => {
  if (!hex.startsWith('#')) return hex;
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(4)})`;
};
/** Mix two hex colours → hex. */
export const mixHex = (a: string, b: string, t: number) => {
  const A = hexToRgb(a), Bc = hexToRgb(b);
  const c = A.map((v, i) => Math.round(v + (Bc[i] - v) * t));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
};

/** Named colour presets accepted by many components. */
export const colorOf = (c: string | undefined, def: string) => {
  if (!c) return def;
  const named: Record<string, string> = {cyan: VC.cyan, violet: VC.violet, lilac: VC.lilac, white: '#FFFFFF', pistachio: VC.pistachio, amber: VC.amber, magenta: VC.magenta, rose: VC.rose, ice: VC.ice};
  return named[c] ?? c;
};

/* ---------------- react helpers ---------------- */
/** Frame from an explicit prop, else Remotion's (local) frame. Always calls the hook (rules of hooks). */
export const useF = (frame?: number) => {
  const cf = useCurrentFrame();
  return frame ?? cf;
};
/** DOM-safe unique id for SVG defs. */
export const useSafeId = (prefix = 'vfx') => prefix + useId().replace(/[^a-zA-Z0-9]/g, '');

/** Compositing for canvas light layers. 'normal' composites the premultiplied, additively drawn canvas with source-over —
 *  identical to screen for white light, near-identical for tinted light, and ~10× cheaper in software rendering (~4 ms vs ~40 ms
 *  per full-frame layer). Use 'screen' only when tinted light must stay purely additive over bright UI. */
export type CanvasBlend = 'normal' | 'screen' | 'plus-lighter';
export const full: React.CSSProperties = {position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none'};

/** Canvas that is fully redrawn on every render (deterministic per frame). */
export const useCanvasDraw = (draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, c.width, c.height);
    draw(ctx, c.width, c.height);
  });
  return ref;
};

/* ---------------- sprite cache (Canvas2D) ---------------- */
const spriteCache = new Map<string, HTMLCanvasElement>();
const mk = (s: number) => {
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  return c;
};
/** Soft radial glow sprite (white→colour→transparent), 128px. Draw with drawImage scaled. */
export const glowSprite = (color: string, hot = 0.6) => {
  const key = `g|${color}|${hot}`;
  let c = spriteCache.get(key);
  if (c) return c;
  c = mk(128);
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, rgba(mixHex(color, '#ffffff', hot), 1));
  g.addColorStop(0.12, rgba(mixHex(color, '#ffffff', hot * 0.5), 0.75));
  g.addColorStop(0.3, rgba(color, 0.32));
  g.addColorStop(0.55, rgba(color, 0.1));
  g.addColorStop(0.8, rgba(color, 0.025));
  g.addColorStop(1, rgba(color, 0));
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  spriteCache.set(key, c);
  return c;
};
/** Bokeh disc sprite: flat body, brighter rim, soft edge (lens-like). 128px. */
export const bokehSprite = (color: string, rim = 0.5) => {
  const key = `b|${color}|${rim}`;
  let c = spriteCache.get(key);
  if (c) return c;
  c = mk(128);
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 62);
  g.addColorStop(0, rgba(color, 0.5));
  g.addColorStop(0.55, rgba(color, 0.56));
  g.addColorStop(0.84, rgba(mixHex(color, '#ffffff', 0.12), 0.6 + 0.3 * rim));
  g.addColorStop(0.93, rgba(color, 0.3));
  g.addColorStop(1, rgba(color, 0));
  x.fillStyle = g;
  x.beginPath();
  x.arc(64, 64, 63, 0, Math.PI * 2);
  x.fill();
  spriteCache.set(key, c);
  return c;
};
/** 4-point star glint sprite, 128px. */
export const starSprite = (color: string) => {
  const key = `s|${color}`;
  let c = spriteCache.get(key);
  if (c) return c;
  c = mk(128);
  const x = c.getContext('2d')!;
  x.globalCompositeOperation = 'lighter';
  const core = x.createRadialGradient(64, 64, 0, 64, 64, 22);
  core.addColorStop(0, 'rgba(255,255,255,1)');
  core.addColorStop(0.3, rgba(color, 0.6));
  core.addColorStop(1, rgba(color, 0));
  x.fillStyle = core;
  x.fillRect(0, 0, 128, 128);
  for (const [w, h, a] of [[64, 2.2, 1], [2.2, 64, 1], [30, 1.4, 0.45]] as const) {
    for (const rot of a === 0.45 ? [Math.PI / 4, -Math.PI / 4] : [0]) {
      x.save();
      x.translate(64, 64);
      x.rotate(rot);
      x.scale(w, h);
      const g = x.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(0.25, rgba(color, 0.55 * a));
      g.addColorStop(1, rgba(color, 0));
      x.fillStyle = g;
      x.beginPath();
      x.arc(0, 0, 1, 0, Math.PI * 2);
      x.fill();
      x.restore();
    }
  }
  spriteCache.set(key, c);
  return c;
};

/** Shared scratch canvas (synchronous use only: draw into it, blit it, done). */
const scratchMap = new Map<string, HTMLCanvasElement>();
export const scratchCanvas = (key: string, w: number, h: number) => {
  let c = scratchMap.get(key);
  if (!c) {
    c = document.createElement('canvas');
    scratchMap.set(key, c);
  }
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  const ctx = c.getContext('2d')!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, w, h);
  return {c, ctx};
};
/** Fill a radial gradient (optionally elliptical: sy = vertical squash) given [offset, rgba] stops. */
export const radialFill = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, stops: [number, string][], sy = 1, sx = 1) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  for (const [o, c] of stops) g.addColorStop(Math.max(0, Math.min(1, o)), c);
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
};
