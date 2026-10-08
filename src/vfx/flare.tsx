/* Anamorphic lens flares, flare bursts and glints. Pure CSS gradients, screen-blended. */
import React from 'react';
import {CX, CY, VC, clamp01, colorOf, easeOutExpo, fbm1, full, hash, impulse, mixHex, rgba, useF} from './util';

type Blend = 'screen' | 'plus-lighter' | 'normal' | 'lighten';

/** Absolutely positioned element centred at (x, y). */
const At: React.FC<{x: number; y: number; w: number; h: number; bg: string; rot?: number; clip?: string; o?: number; mask?: string; blend?: Blend}> = ({x, y, w, h, bg, rot = 0, clip, o = 1, mask, blend = 'screen'}) =>
  o <= 0.002 ? null : (
    <div
      style={{
        position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, background: bg, opacity: Math.min(1, o),
        transform: rot ? `rotate(${rot}deg)` : undefined, clipPath: clip, mixBlendMode: blend,
        maskImage: mask, WebkitMaskImage: mask,
      }}
    />
  );

const hexClip = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    pts.push(`${(50 + 50 * Math.cos(a)).toFixed(2)}% ${(50 + 50 * Math.sin(a)).toFixed(2)}%`);
  }
  return `polygon(${pts.join(',')})`;
})();
const octClip = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i + Math.PI / 8;
    pts.push(`${(50 + 50 * Math.cos(a)).toFixed(2)}% ${(50 + 50 * Math.sin(a)).toFixed(2)}%`);
  }
  return `polygon(${pts.join(',')})`;
})();

/** Conic starburst gradient string (seeded irregular rays). */
const rayGradient = (n: number, seed: number, color: string, a: number) => {
  type R = {ang: number; w: number; al: number};
  const rs: R[] = [];
  for (let i = 0; i < n; i++) {
    const ang = (360 / n) * i + (hash(seed * 97 + i) - 0.5) * (300 / n);
    rs.push({ang: ((ang % 360) + 360) % 360, w: 0.35 + hash(seed * 31 + i * 7) * 1.1, al: 0.25 + 0.75 * Math.pow(hash(seed * 13 + i * 3), 1.5)});
  }
  rs.sort((p, q) => p.ang - q.ang);
  const stops: string[] = ['transparent 0deg'];
  let last = 0;
  for (const r of rs) {
    const a0 = Math.max(last, r.ang - r.w), a1 = Math.min(359.9, r.ang + r.w);
    if (a0 >= a1 || r.ang <= last) continue;
    stops.push(`transparent ${a0.toFixed(2)}deg`, `${rgba(color, a * r.al)} ${r.ang.toFixed(2)}deg`, `transparent ${a1.toFixed(2)}deg`);
    last = a1;
  }
  stops.push('transparent 360deg');
  return `conic-gradient(from 0deg, ${stops.join(', ')})`;
};

export type LensFlareProps = {
  /** Light source position in frame px (1920×1080 space). */
  x: number;
  y: number;
  /** Brightness. 1 = standard, 0 = off, 2+ = blown out. */
  intensity?: number;
  /** Overall size multiplier (core, glows, ghosts). */
  scale?: number;
  /** Anamorphic streak length multiplier (1 ≈ 2600px). */
  streak?: number;
  /** Streak tint (default electric cyan #7FE7FF). Named: 'cyan' | 'violet' | … or hex. */
  color?: string;
  /** Secondary tint for parallel streaks + ghosts (default violet). */
  secondary?: string;
  /** Ghost intensity multiplier (0 = off). */
  ghosts?: number;
  /** Starburst rays count (0 = off). */
  rays?: number;
  /** Rainbow ring ghost on the opposite side. */
  ring?: boolean;
  /** Wide horizontal haze band (sells the anamorphic look). 0..1 */
  veil?: number;
  /** Optical centre that ghosts mirror through (default frame centre). */
  center?: [number, number];
  /** Subtle intensity shimmer 0..1. */
  flicker?: number;
  seed?: number;
  frame?: number;
  blend?: Blend;
  style?: React.CSSProperties;
};

/** Anamorphic lens flare: hot core, long horizontal streaks, parallel violet streaks, starburst rays,
 *  iris ghosts mirrored through the optical centre and a rainbow ring ghost. Screen-blended. */
export const LensFlare: React.FC<LensFlareProps> = ({
  x, y, intensity = 1, scale = 1, streak = 1, color, secondary, ghosts = 1, rays = 14, ring = true, veil = 0.6,
  center = [CX, CY], flicker = 0.4, seed = 1, frame, blend = 'screen', style,
}) => {
  const f = useF(frame);
  const col = colorOf(color, VC.cyan);
  const sec = colorOf(secondary, VC.violet);
  const I = Math.max(0, intensity) * (1 + flicker * 0.1 * fbm1(f * 0.11, seed));
  if (I < 0.005) return null;
  const s = scale;
  const L = 2600 * s * streak;
  const hot = mixHex(col, '#ffffff', 0.65);
  const k = (a: number) => Math.min(1, a * I);
  const vx = x - center[0], vy = y - center[1];
  const off = Math.min(1, Math.hypot(vx, vy) / 700);
  const g = ghosts * (0.55 + 0.45 * off);
  const rot = (f * 0.06 + seed * 37) % 360;

  // ghosts: t (position on the axis: 1 = source, 0 = centre, negative = mirrored side), size, shape, colour, alpha
  const ghostDefs: [number, number, 'hex' | 'oct' | 'disc' | 'ring', string, number][] = [
    [0.55, 34, 'disc', VC.white, 0.16],
    [0.22, 70, 'hex', sec, 0.13],
    [-0.18, 46, 'disc', VC.pistachio, 0.12],
    [-0.42, 150, 'ring', col, 0.1],
    [-0.7, 96, 'oct', VC.magenta, 0.08],
    [-0.95, 30, 'disc', col, 0.2],
    [-1.25, 230, 'hex', sec, 0.06],
    [-1.6, 120, 'disc', VC.amber, 0.05],
  ];

  return (
    <div style={{...full, overflow: 'hidden', mixBlendMode: blend, ...style}}>
      {/* horizontal haze band across the frame */}
      {veil > 0 && (
        <At x={x} y={y} w={Math.max(3840, L * 1.2)} h={520 * s} o={k(veil * 0.55)}
          bg={`radial-gradient(ellipse 50% 50% at 50% 50%, ${rgba(col, 0.22)} 0%, ${rgba(mixHex(col, sec, 0.5), 0.08)} 40%, transparent 100%)`} />
      )}
      {/* wide atmospheric glow */}
      <At x={x} y={y} w={1500 * s} h={1500 * s} o={k(0.9)}
        bg={`radial-gradient(circle closest-side, ${rgba(sec, 0.22)} 0%, ${rgba(sec, 0.09)} 30%, ${rgba(sec, 0.025)} 60%, transparent 100%)`} />
      {/* medium glow */}
      <At x={x} y={y} w={520 * s} h={520 * s} o={k(1)}
        bg={`radial-gradient(circle closest-side, ${rgba(hot, 0.55)} 0%, ${rgba(col, 0.28)} 22%, ${rgba(col, 0.09)} 50%, transparent 100%)`} />
      {/* starburst rays (two layers: long sparse + short dense) */}
      {rays > 0 && (
        <>
          <At x={x} y={y} w={1100 * s} h={1100 * s} rot={rot} o={k(0.85)} bg={rayGradient(Math.max(4, Math.round(rays * 0.5)), seed, mixHex(col, '#ffffff', 0.5), 0.9)}
            mask="radial-gradient(circle closest-side, black 0%, rgba(0,0,0,0.55) 12%, rgba(0,0,0,0.15) 40%, transparent 100%)" />
          <At x={x} y={y} w={560 * s} h={560 * s} rot={-rot * 0.7 + 11} o={k(0.8)} bg={rayGradient(rays, seed + 5, hot, 0.85)}
            mask="radial-gradient(circle closest-side, black 0%, rgba(0,0,0,0.5) 18%, transparent 100%)" />
        </>
      )}
      {/* anamorphic streaks */}
      <At x={x} y={y} w={L * 0.62} h={190 * s} o={k(0.55)}
        bg={`radial-gradient(ellipse 50% 50% at 50% 50%, ${rgba(mixHex(col, '#3A6BFF', 0.35), 0.28)} 0%, ${rgba(mixHex(col, '#3A6BFF', 0.5), 0.08)} 45%, transparent 100%)`} />
      <At x={x} y={y} w={L * 0.9} h={34 * s} o={k(0.8)}
        bg={`radial-gradient(ellipse 50% 50% at 50% 50%, ${rgba(hot, 0.75)} 0%, ${rgba(col, 0.5)} 18%, ${rgba(col, 0.16)} 50%, transparent 100%)`} />
      <At x={x} y={y} w={L} h={Math.max(2.5, 6 * s)} o={k(1)}
        bg={`radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,255,255,1) 0%, ${rgba(hot, 0.95)} 12%, ${rgba(col, 0.7)} 35%, ${rgba(col, 0.25)} 70%, transparent 100%)`} />
      {[-1, 1].map((d) => (
        <At key={d} x={x + d * 30 * s} y={y + d * 15 * s} w={L * 0.45} h={Math.max(2, 3.5 * s)} o={k(0.5)}
          bg={`radial-gradient(ellipse 50% 50% at 50% 50%, ${rgba(mixHex(sec, '#ffffff', 0.4), 0.85)} 0%, ${rgba(sec, 0.35)} 40%, transparent 100%)`} />
      ))}
      {/* faint vertical spike */}
      <At x={x} y={y} w={Math.max(2, 4 * s)} h={360 * s} o={k(0.35)}
        bg={`radial-gradient(ellipse 50% 50% at 50% 50%, ${rgba(hot, 0.8)} 0%, ${rgba(col, 0.2)} 40%, transparent 100%)`} />
      {/* hot core */}
      <At x={x} y={y} w={150 * s} h={150 * s} o={k(1.1)}
        bg={`radial-gradient(circle closest-side, rgba(255,255,255,1) 0%, rgba(255,255,255,0.92) 14%, ${rgba(hot, 0.6)} 30%, ${rgba(col, 0.22)} 60%, transparent 100%)`} />
      {/* ghosts mirrored through the optical centre */}
      {g > 0 && ghostDefs.map(([t, size, shape, c, a], i) => {
        const gx = center[0] + vx * t, gy = center[1] + vy * t;
        const sz = size * s * (0.85 + 0.3 * hash(seed * 7 + i));
        const al = a * g;
        if (shape === 'disc')
          return <At key={i} x={gx} y={gy} w={sz} h={sz} o={k(1)} bg={`radial-gradient(circle closest-side, ${rgba(c, al * 1.2)} 0%, ${rgba(c, al * 0.8)} 55%, ${rgba(c, al * 0.25)} 85%, transparent 100%)`} />;
        if (shape === 'ring')
          return <At key={i} x={gx} y={gy} w={sz} h={sz} o={k(1)} bg={`radial-gradient(circle closest-side, ${rgba(c, al * 0.15)} 0%, ${rgba(c, al * 0.35)} 70%, ${rgba(mixHex(c, '#ffffff', 0.4), al * 1.3)} 90%, transparent 100%)`} />;
        return (
          <At key={i} x={gx} y={gy} w={sz} h={sz} o={k(1)} clip={shape === 'hex' ? hexClip : octClip} rot={12}
            bg={`radial-gradient(circle closest-side, ${rgba(c, al * 0.35)} 0%, ${rgba(c, al * 0.6)} 70%, ${rgba(mixHex(c, '#ffffff', 0.3), al * 1.25)} 96%, ${rgba(c, al * 0.6)} 100%)`} />
        );
      })}
      {/* rainbow ring ghost on the mirrored side */}
      {ring && g > 0 && (
        <At x={center[0] - vx * 0.85} y={center[1] - vy * 0.85} w={620 * s} h={620 * s} o={k(0.9 * g)}
          mask={`linear-gradient(${(Math.atan2(vy, vx) * 180) / Math.PI + 90}deg, transparent 15%, black 60%, black 100%)`}
          bg={`radial-gradient(circle closest-side, transparent 80%, rgba(255,60,90,0.07) 83%, rgba(255,170,40,0.08) 86%, rgba(200,255,90,0.07) 89%, rgba(60,230,255,0.08) 92%, rgba(90,110,255,0.07) 95%, rgba(170,80,255,0.05) 98%, transparent 100%)`} />
      )}
    </div>
  );
};

export type FlareBurstProps = Omit<LensFlareProps, 'intensity'> & {
  /** Frame at which the flare explodes in (same timeline as `frame`). */
  at: number;
  /** Total length in frames (decays to 0 by the end). */
  dur?: number;
  /** Peak intensity. */
  peak?: number;
  /** Residual intensity it settles to (0 = fully decays). */
  sustain?: number;
  /** Full-frame light veil on impact 0..1. */
  flash?: number;
};

/** A flare that explodes in at `at` (fast attack, streaks shoot outward, core punches) and decays.
 *  Use on drops / reveals: B(32), B(104), B(160). */
export const FlareBurst: React.FC<FlareBurstProps> = ({at, dur = 70, peak = 1.8, sustain = 0, flash = 0.5, scale = 1, streak = 1, frame, x, y, color, ...rest}) => {
  const f = useF(frame);
  const t = f - at;
  if (t < 0 || t > dur) return null;
  const tail = clamp01((dur - t) / (dur * 0.35));
  const e = impulse(f, at, 3, dur * 0.22);
  const I = (peak * e + sustain * clamp01(t / 10)) * tail;
  const grow = 0.25 + 1.15 * easeOutExpo(t / (dur * 0.45));
  const punch = 1 + 0.55 * Math.exp(-t / 5);
  const col = colorOf(color, VC.cyan);
  const v = flash * Math.pow(impulse(f, at, 2, 7), 1.4);
  return (
    <>
      <LensFlare {...rest} x={x} y={y} color={color} frame={f} intensity={I} scale={scale * punch} streak={streak * grow} />
      {v > 0.003 && (
        <div style={{...full, mixBlendMode: 'screen', opacity: Math.min(1, v),
          background: `radial-gradient(circle 1400px at ${x}px ${y}px, rgba(255,255,255,0.95) 0%, ${rgba(mixHex(col, '#ffffff', 0.5), 0.55)} 9%, ${rgba(col, 0.2)} 26%, ${rgba(VC.violet, 0.06)} 55%, transparent 100%)`}} />
      )}
    </>
  );
};

export type GlintProps = {
  x: number;
  y: number;
  /** Size in px (length of the long spike). */
  size?: number;
  /** 0..1 brightness / charge (animate this for a charging glint). */
  intensity?: number;
  color?: string;
  /** Rotation in degrees (adds a slow twinkle spin when `spin` > 0). */
  rotate?: number;
  spin?: number;
  frame?: number;
  blend?: Blend;
};

/** Small 4-point star glint (corner of glass, charging point of light, sparkle on a logo). */
export const Glint: React.FC<GlintProps> = ({x, y, size = 180, intensity = 1, color, rotate = 0, spin = 0.4, frame, blend = 'screen'}) => {
  const f = useF(frame);
  const I = Math.max(0, intensity);
  if (I < 0.005) return null;
  const col = colorOf(color, VC.cyan);
  const hot = mixHex(col, '#ffffff', 0.6);
  const r = rotate + f * spin;
  const s = size * (0.6 + 0.4 * Math.min(1.5, I));
  const k = (a: number) => Math.min(1, a * I);
  return (
    <div style={{position: 'absolute', left: x, top: y, width: 0, height: 0, mixBlendMode: blend, pointerEvents: 'none'}}>
      <At x={0} y={0} w={s * 1.6} h={s * 1.6} o={k(0.5)} bg={`radial-gradient(circle closest-side, ${rgba(col, 0.35)} 0%, ${rgba(col, 0.08)} 40%, transparent 100%)`} />
      <div style={{position: 'absolute', left: 0, top: 0, transform: `rotate(${r}deg)`}}>
        <At x={0} y={0} w={s * 2} h={Math.max(2, s * 0.035)} o={k(1)} bg={`radial-gradient(ellipse 50% 50%, #fff 0%, ${rgba(hot, 0.9)} 15%, ${rgba(col, 0.35)} 50%, transparent 100%)`} />
        <At x={0} y={0} w={Math.max(2, s * 0.035)} h={s * 1.3} o={k(1)} bg={`radial-gradient(ellipse 50% 50%, #fff 0%, ${rgba(hot, 0.9)} 15%, ${rgba(col, 0.35)} 50%, transparent 100%)`} />
        <At x={0} y={0} w={s * 0.7} h={Math.max(1.5, s * 0.02)} rot={45} o={k(0.55)} bg={`radial-gradient(ellipse 50% 50%, #fff 0%, ${rgba(col, 0.3)} 50%, transparent 100%)`} />
        <At x={0} y={0} w={s * 0.7} h={Math.max(1.5, s * 0.02)} rot={-45} o={k(0.55)} bg={`radial-gradient(ellipse 50% 50%, #fff 0%, ${rgba(col, 0.3)} 50%, transparent 100%)`} />
      </div>
      <At x={0} y={0} w={s * 0.22} h={s * 0.22} o={k(1)} bg={`radial-gradient(circle closest-side, #fff 0%, rgba(255,255,255,0.9) 25%, ${rgba(hot, 0.4)} 60%, transparent 100%)`} />
    </div>
  );
};
