/* Finishing: film grain, vignette, letterbox, flashes, strobe and the GlobalGrade pass. */
import React from 'react';
import {B} from '../lib';
import {VC, W, H, clamp01, colorOf, easeInOutCubic, easeOutExpo, full, hash, mixHex, prng, rgba, useCanvasDraw, useF} from './util';

/* ======================================================================
 * FilmGrain — pre-generated noise tiles, pattern-filled with per-frame offsets (cheap)
 * ==================================================================== */
const TILE = 256;
const TILES = 8;
let grainTiles: HTMLCanvasElement[] | null = null;
const getGrainTiles = () => {
  if (grainTiles) return grainTiles;
  grainTiles = [];
  for (let t = 0; t < TILES; t++) {
    const c = document.createElement('canvas');
    c.width = TILE;
    c.height = TILE;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(TILE, TILE);
    const rnd = prng(1000 + t * 77);
    for (let i = 0; i < TILE * TILE; i++) {
      // approx gaussian: sum of 3 uniforms
      const g = (rnd() + rnd() + rnd()) / 3 - 0.5; // -0.5..0.5, peaked
      const v = 128 + g * 2 * 127;
      const j = i * 4;
      img.data[j] = v;
      img.data[j + 1] = v;
      img.data[j + 2] = v;
      img.data[j + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    grainTiles.push(c);
  }
  return grainTiles;
};

export type FilmGrainProps = {
  /** 0..1 grain strength (0.05–0.12 is tasteful). */
  amount?: number;
  /** Grain size in px (1 = per-pixel, 2 = coarser/softer). */
  size?: number;
  /** Blend: 'overlay' (default, protects blacks) or 'soft-light' (gentler). */
  blend?: 'overlay' | 'soft-light';
  frame?: number;
};

/** Animated monochrome film grain (pattern-filled noise tiles, new random offset each frame). ~5–15 ms. */
export const FilmGrain: React.FC<FilmGrainProps> = ({amount = 0.08, size = 1.5, blend = 'overlay', frame}) => {
  const f = useF(frame);
  const cw = Math.round(W / size), ch = Math.round(H / size);
  const ref = useCanvasDraw((ctx) => {
    const tiles = getGrainTiles();
    const fi = Math.floor(f);
    const tile = tiles[fi % TILES];
    const pat = ctx.createPattern(tile, 'repeat');
    if (!pat) return;
    const ox = Math.floor(hash(fi * 3 + 1) * TILE), oy = Math.floor(hash(fi * 7 + 2) * TILE);
    ctx.translate(-ox, -oy);
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, cw + TILE, ch + TILE);
  });
  if (amount <= 0.001) return null;
  return <canvas ref={ref} width={cw} height={ch} style={{...full, opacity: clamp01(amount * 2.5), mixBlendMode: blend}} />;
};

/* ======================================================================
 * Vignette
 * ==================================================================== */
export type VignetteProps = {
  /** 0..1 darkness at the corners. */
  amount?: number;
  /** Inner radius (0..1) where darkening starts. */
  inner?: number;
  color?: string;
  /** Centre (percent). */
  cx?: number;
  cy?: number;
};

/** Soft optical vignette (plain gradient, normal blend). ~1 ms. */
export const Vignette: React.FC<VignetteProps> = ({amount = 0.45, inner = 0.55, color = '#04020A', cx = 50, cy = 50}) =>
  amount <= 0.001 ? null : (
    <div style={{...full, background: `radial-gradient(ellipse 72% 72% at ${cx}% ${cy}%, transparent ${inner * 100}%, ${rgba(color, amount * 0.45)} ${(inner + (1 - inner) * 0.55) * 100}%, ${rgba(color, amount * 0.85)} 100%), radial-gradient(ellipse 110% 110% at ${cx}% ${cy}%, transparent 60%, ${rgba(color, amount * 0.6)} 100%)`}} />
  );

/* ======================================================================
 * Letterbox
 * ==================================================================== */
export type LetterboxProps = {
  /** Bar height in px (top and bottom). */
  height: number;
  color?: string;
  /** Faint lilac hairline on the inner edge of the bars. */
  hairline?: boolean;
};

/** Cinematic letterbox bars. Animate `height`, or drive it with letterboxAt(frame). */
export const Letterbox: React.FC<LetterboxProps> = ({height, color = '#000', hairline = false}) =>
  height <= 0.25 ? null : (
    <>
      <div style={{position: 'absolute', left: 0, top: 0, width: '100%', height, background: color, pointerEvents: 'none'}} />
      <div style={{position: 'absolute', left: 0, bottom: 0, width: '100%', height, background: color, pointerEvents: 'none'}} />
      {hairline && (
        <>
          <div style={{position: 'absolute', left: 0, top: height, width: '100%', height: 1, background: `linear-gradient(90deg, transparent, ${rgba(VC.lilac, 0.25)}, transparent)`}} />
          <div style={{position: 'absolute', left: 0, bottom: height, width: '100%', height: 1, background: `linear-gradient(90deg, transparent, ${rgba(VC.lilac, 0.25)}, transparent)`}} />
        </>
      )}
    </>
  );

/* ======================================================================
 * Flash + Strobe
 * ==================================================================== */
const FLASH_COLORS: Record<string, string> = {white: '#FFFFFF', cyan: '#9FEFFF', violet: '#B79BFF', pistachio: '#F1FAD2', amber: '#FFD58A'};
export type FlashProps = {
  /** Impact frame. */
  at: number;
  /** Decay length in frames. */
  dur?: number;
  /** 'white' | 'cyan' | 'violet' | 'pistachio' | 'amber' | hex. */
  color?: string;
  /** Peak opacity of the flat flash. */
  max?: number;
  /** Bloom-out: a radial light that keeps expanding from (x, y) after the flat flash dies. */
  bloom?: boolean;
  x?: number;
  y?: number;
  /** 'screen' adds light (default), 'normal' paints the colour (true white-out). */
  blend?: 'screen' | 'normal';
  frame?: number;
};

/** Impact flash: 1-frame attack, curved decay; optional radial bloom-out from a point. */
export const Flash: React.FC<FlashProps> = ({at, dur = 16, color = 'white', max = 0.85, bloom = false, x = W / 2, y = H / 2, blend = 'screen', frame}) => {
  const f = useF(frame);
  const t = f - at;
  const total = bloom ? dur * 2.2 : dur;
  if (t < 0 || t > total) return null;
  const col = FLASH_COLORS[color] ?? colorOf(color, '#ffffff');
  const flat = t <= dur ? max * Math.pow(1 - t / dur, 2.4) : 0;
  const bp = t / total;
  const br = 200 + 1700 * easeOutExpo(bp);
  const ba = bloom ? Math.pow(1 - bp, 1.6) * 0.9 : 0;
  return (
    <>
      {flat > 0.003 && <div style={{...full, background: col, opacity: clamp01(flat), mixBlendMode: blend}} />}
      {ba > 0.003 && (
        <div style={{...full, mixBlendMode: 'screen', opacity: clamp01(ba),
          background: `radial-gradient(circle ${br}px at ${x}px ${y}px, ${rgba('#ffffff', 0.9)} 0%, ${rgba(mixHex(col, '#fff', 0.3), 0.4)} 10%, ${rgba(col, 0.12)} 35%, ${rgba(col, 0.03)} 70%, transparent 100%)`}} />
      )}
    </>
  );
};

/** 0/1 strobe gate: on for `duty` of each `period` frames between start and end. */
export const strobe = (f: number, start: number, end: number, period = 4, duty = 0.5) =>
  f < start || f >= end ? 0 : ((f - start) % period) / period < duty ? 1 : 0;

export type StrobeProps = {
  /** Explicit flash frames (e.g. half-beats) — each gets a short decaying flash. */
  frames?: number[];
  /** Or a periodic strobe between start and end. */
  start?: number;
  end?: number;
  period?: number;
  duty?: number;
  color?: string;
  max?: number;
  /** Decay per flash (frames) for `frames` mode. */
  decay?: number;
  blend?: 'screen' | 'normal';
  frame?: number;
};

/** Strobe flashes on a list of frames (beat-synced) or periodically. */
export const Strobe: React.FC<StrobeProps> = ({frames, start = 0, end = 0, period = 4, duty = 0.5, color = 'white', max = 0.6, decay = 5, blend = 'screen', frame}) => {
  const f = useF(frame);
  const col = FLASH_COLORS[color] ?? colorOf(color, '#ffffff');
  let o = 0;
  if (frames) {
    for (const fr of frames) if (f >= fr && f - fr < decay * 4) o = Math.max(o, Math.exp(-(f - fr) / decay));
  } else o = strobe(f, start, end, period, duty);
  if (o * max < 0.003) return null;
  return <div style={{...full, background: col, opacity: clamp01(o * max), mixBlendMode: blend}} />;
};


/* ---------- single-canvas finishing (cheap path used by GlobalGrade) ---------- */
let alphaGrainTiles: HTMLCanvasElement[] | null = null;
/** Grain tiles coded as white/black specks with alpha (normal blend, no blend-mode layer needed). */
const getAlphaGrainTiles = () => {
  if (alphaGrainTiles) return alphaGrainTiles;
  alphaGrainTiles = [];
  for (let t = 0; t < TILES; t++) {
    const c = document.createElement('canvas');
    c.width = TILE;
    c.height = TILE;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(TILE, TILE);
    const rnd = prng(5000 + t * 131);
    for (let i = 0; i < TILE * TILE; i++) {
      const g = ((rnd() + rnd() + rnd()) / 3 - 0.5) * 2; // -1..1 peaked
      const j = i * 4;
      const v = g > 0 ? 255 : 0;
      img.data[j] = v;
      img.data[j + 1] = v;
      img.data[j + 2] = v;
      img.data[j + 3] = Math.min(255, Math.abs(g) * 255 * (g > 0 ? 0.8 : 1.15));
    }
    ctx.putImageData(img, 0, 0);
    alphaGrainTiles.push(c);
  }
  return alphaGrainTiles;
};
const grainFieldCache = new Map<number, HTMLCanvasElement>();
/** One oversized grain field per grain size, rendered once; frames blit it at a random offset (cheap). */
const getGrainField = (size: number) => {
  const hit = grainFieldCache.get(size);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = W + TILE;
  c.height = H + TILE;
  const ctx = c.getContext('2d')!;
  const tiles = getAlphaGrainTiles();
  // stitch different tiles in a grid so the field has no visible 256px repetition
  ctx.scale(size, size);
  for (let ty = 0; ty * TILE * size < c.height; ty++)
    for (let tx = 0; tx * TILE * size < c.width; tx++) ctx.drawImage(tiles[(tx * 3 + ty * 5) % TILES], tx * TILE, ty * TILE);
  grainFieldCache.set(size, c);
  return c;
};
const vignetteCache = new Map<string, HTMLCanvasElement>();
/** Cached full-frame vignette with a faint lateral colour shift (cool left, warm-magenta right) = cheap "chromatic edge". */
const getVignette = (amount: number, fringe: number) => {
  const key = `${amount.toFixed(3)}|${fringe.toFixed(3)}`;
  const hit = vignetteCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(1, H / W * 1.12);
  const R = W * 0.62;
  const g = ctx.createRadialGradient(0, 0, R * 0.42, 0, 0, R);
  g.addColorStop(0, 'rgba(4,2,10,0)');
  g.addColorStop(0.45, `rgba(4,2,10,${(amount * 0.28).toFixed(4)})`);
  g.addColorStop(0.8, `rgba(4,2,10,${(amount * 0.62).toFixed(4)})`);
  g.addColorStop(1, `rgba(4,2,10,${(amount * 0.9).toFixed(4)})`);
  ctx.fillStyle = g;
  ctx.fillRect(-W, -W, W * 2, W * 2);
  ctx.restore();
  if (fringe > 0) {
    const lg = ctx.createLinearGradient(0, 0, W, 0);
    lg.addColorStop(0, `rgba(40,150,255,${(0.07 * fringe).toFixed(4)})`);
    lg.addColorStop(0.1, `rgba(40,150,255,${(0.015 * fringe).toFixed(4)})`);
    lg.addColorStop(0.22, 'rgba(0,0,0,0)');
    lg.addColorStop(0.78, 'rgba(0,0,0,0)');
    lg.addColorStop(0.9, `rgba(255,60,170,${(0.015 * fringe).toFixed(4)})`);
    lg.addColorStop(1, `rgba(255,60,170,${(0.07 * fringe).toFixed(4)})`);
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, W, H);
  }
  vignetteCache.set(key, c);
  return c;
};

export type GradeLayerProps = {frame: number; grain?: number; grainSize?: number; vignette?: number; fringe?: number; letterbox?: number};

/** Static canvas painted once (per mount / param change). */
const StaticCanvas: React.FC<{w: number; h: number; paint: (ctx: CanvasRenderingContext2D) => void; deps: unknown[]; style?: React.CSSProperties}> = ({w, h, paint, deps, style}) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    paint(ctx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return <canvas ref={ref} width={w} height={h} style={style} />;
};

/** Cheap finishing layer: static vignette canvas (+ lateral colour fringe), a static oversized grain canvas that is only
 *  re-positioned per frame (compositor transform, no re-raster) and solid letterbox bars. */
export const GradeLayer: React.FC<GradeLayerProps> = ({frame, grain = 0.05, grainSize = 1.5, vignette = 0.4, fringe = 0.5, letterbox = 0}) => {
  const fi = Math.floor(frame);
  const ox = Math.floor(hash(fi * 3 + 1) * TILE), oy = Math.floor(hash(fi * 7 + 2) * TILE);
  return (
    <div style={{...full, overflow: 'hidden'}}>
      {(vignette > 0.001 || fringe > 0.001) && (
        <StaticCanvas w={W} h={H} deps={[vignette, fringe]} paint={(ctx) => ctx.drawImage(getVignette(vignette, fringe), 0, 0)} style={{...full}} />
      )}
      {grain > 0.001 && (
        <StaticCanvas w={W + TILE} h={H + TILE} deps={[grainSize]} paint={(ctx) => ctx.drawImage(getGrainField(grainSize), 0, 0)}
          style={{position: 'absolute', left: 0, top: 0, width: W + TILE, height: H + TILE, opacity: clamp01(grain * 2.2), transform: `translate(${-ox}px, ${-oy}px)`, willChange: 'transform'}} />
      )}
      <Letterbox height={letterbox} />
    </div>
  );
};

/* ======================================================================
 * Global grade schedule + GlobalGrade
 * ==================================================================== */
export type LetterboxKey = {
  /** Global frame of this key. */
  frame: number;
  /** Bar height (px) at this key. */
  h: number;
  /** How the value arrives at this key from the previous one: 'snap' jumps at this frame, 'smooth' eases in-out, 'expo' fast-in slow-settle. */
  ease?: 'snap' | 'smooth' | 'expo';
};

/** Finishing schedule used by GlobalGrade — tune here (integration owns the final values). */
export const GRADE = {
  /** Film grain strength (0..1) and size (px). */
  grain: 0.05,
  grainSize: 1.5,
  /** Vignette darkness (0..1). */
  vignette: 0.4,
  /** Lateral colour fringe at the frame edges (0..1): cyan left / magenta right via color-dodge (only touches bright edges). */
  fringe: 0.5,
  /** Letterbox keyframes (global frames). Bars cover 70px in the intro, squeeze in the pre-drop silence,
   *  snap open on each drop, return for the breakdown and the end card. */
  letterbox: [
    {frame: 0, h: 70},
    {frame: B(29.5), h: 70},
    {frame: B(31.75), h: 118, ease: 'smooth'},
    {frame: B(32), h: 0, ease: 'snap'},
    {frame: B(96), h: 0},
    {frame: B(98), h: 70, ease: 'smooth'},
    {frame: B(102), h: 70},
    {frame: B(103.75), h: 118, ease: 'smooth'},
    {frame: B(104), h: 0, ease: 'snap'},
    {frame: B(159.5), h: 0},
    {frame: B(160), h: 70, ease: 'expo'},
  ] as LetterboxKey[],
  /** Grain multiplier over ranges (e.g. grittier in the breakdown). [fromFrame, toFrame, multiplier]. */
  grainBoost: [[B(96), B(104), 1.5]] as [number, number, number][],
};

/** Letterbox bar height (px) at a global frame for a key list (default GRADE.letterbox). */
export const letterboxAt = (frame: number, keys: LetterboxKey[] = GRADE.letterbox) => {
  if (!keys.length) return 0;
  if (frame <= keys[0].frame) return keys[0].h;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    if (frame < b.frame) {
      if (b.ease === 'snap') return a.h;
      const t = clamp01((frame - a.frame) / Math.max(1, b.frame - a.frame));
      const e = b.ease === 'expo' ? easeOutExpo(t) : b.ease === 'smooth' ? easeInOutCubic(t) : t;
      return a.h + (b.h - a.h) * e;
    }
  }
  return keys[keys.length - 1].h;
};

/** Lateral chromatic fringe approximation: colour-dodge tint at the left/right edges (dark areas unaffected). */
export const EdgeFringe: React.FC<{amount?: number}> = ({amount = 0.5}) =>
  amount <= 0.001 ? null : (
    <div style={{...full, mixBlendMode: 'color-dodge', opacity: clamp01(amount),
      background: `linear-gradient(90deg, rgba(60,200,255,0.22) 0%, rgba(60,200,255,0.06) 9%, transparent 20%, transparent 80%, rgba(255,70,170,0.06) 91%, rgba(255,70,170,0.22) 100%)`}} />
  );

/** Global finishing pass rendered above the whole film by Root: vignette with a faint lateral colour fringe,
 *  animated film grain and the scheduled letterbox — all in one cheap layer stack (~35 ms/frame in renderMedia). Tune via GRADE. */
export const GlobalGrade: React.FC<{frame: number}> = ({frame}) => {
  let gm = 1;
  for (const [a, b, m] of GRADE.grainBoost) if (frame >= a && frame < b) gm = m;
  return <GradeLayer frame={frame} grain={GRADE.grain * gm} grainSize={GRADE.grainSize} vignette={GRADE.vignette} fringe={GRADE.fringe} letterbox={letterboxAt(frame)} />;
};
