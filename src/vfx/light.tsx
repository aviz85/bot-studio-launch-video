/* Light streaks, swooshes, warp speed lines, light leaks, god rays and volumetric beams. */
import React from 'react';
import {CX, CY, H, VC, W, clamp01, colorOf, easeInOutCubic, fbm1, full, glowSprite, hash, lin, mix, mixHex, noise1, prng, rgba, useCanvasDraw, useF} from './util';

/* ======================================================================
 * LightStreak — bundle of fast light streaks crossing the frame
 * ==================================================================== */
export type LightStreakProps = {
  /** Frame the bundle starts crossing. */
  start: number;
  /** Frames to cross the frame (≈ 14–30 for transitions). */
  dur?: number;
  /** Direction of travel in degrees (0 = left→right, 180 = right→left, 90 = top→bottom, −20 = rising diagonal). */
  angle?: number;
  count?: number;
  /** Perpendicular spread of the bundle in px. */
  spread?: number;
  /** Perpendicular offset of the bundle from the frame centre in px. */
  offset?: number;
  /** Base streak length in px (stretched further by velocity). */
  length?: number;
  thickness?: number;
  color?: string;
  secondary?: string;
  intensity?: number;
  /** 0..1 how much the streaks are staggered in time. */
  stagger?: number;
  seed?: number;
  frame?: number;
};

const Rotated: React.FC<{angle: number; children: React.ReactNode; blend?: React.CSSProperties['mixBlendMode']}> = ({angle, children, blend = 'screen'}) => (
  <div style={{...full, overflow: 'hidden', mixBlendMode: blend}}>
    <div style={{position: 'absolute', left: CX, top: CY, width: 0, height: 0, transform: `rotate(${angle}deg)`}}>{children}</div>
  </div>
);

/** Fast streaks of light crossing the frame (whip / swipe transitions, speed accents). */
export const LightStreak: React.FC<LightStreakProps> = ({
  start, dur = 22, angle = 0, count = 7, spread = 520, offset = 0, length = 900, thickness = 3, color, secondary, intensity = 1, stagger = 0.4, seed = 3, frame,
}) => {
  const f = useF(frame);
  if (f < start - 1 || f > start + dur * 1.05 + 2) return null;
  const col = colorOf(color, VC.cyan);
  const sec = colorOf(secondary, VC.violet);
  const reach = 1250 + length;
  return (
    <Rotated angle={angle}>
      {Array.from({length: count}).map((_, i) => {
        const r1 = hash(seed * 101 + i), r2 = hash(seed * 57 + i * 3), r3 = hash(seed * 13 + i * 7);
        const d = r1 * stagger * dur;
        const local = dur * (1 - stagger * 0.6);
        const p = lin(f, start + d, local);
        if (p <= 0 || p >= 1) return null;
        const e = easeInOutCubic(p);
        const vel = Math.max(0, 6 * p * (1 - p)); // derivative-ish (peaks 1.5 at middle)
        const head = mix(-reach, reach, e);
        const y = offset + (r2 - 0.5) * spread;
        const L = length * (0.45 + r3) * (0.35 + vel);
        const th = thickness * (0.5 + r2 * 1.2);
        const c = i % 3 === 2 ? sec : col;
        const a = intensity * (0.5 + 0.5 * r3) * Math.min(1, vel * 1.4 + 0.15);
        return (
          <React.Fragment key={i}>
            <div style={{position: 'absolute', left: head - L, top: y - th * 7, width: L, height: th * 14, opacity: clamp01(a * 0.6),
              background: `linear-gradient(90deg, transparent 0%, ${rgba(c, 0.12)} 45%, ${rgba(c, 0.45)} 88%, ${rgba(mixHex(c, '#fff', 0.5), 0.7)} 99%, transparent 100%)`,
              maskImage: 'linear-gradient(180deg, transparent 0%, black 50%, transparent 100%)', WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, black 50%, transparent 100%)'}} />
            <div style={{position: 'absolute', left: head - L, top: y - th / 2, width: L, height: th, opacity: clamp01(a), borderRadius: th,
              background: `linear-gradient(90deg, transparent 0%, ${rgba(c, 0.35)} 50%, ${rgba(mixHex(c, '#fff', 0.6), 0.95)} 92%, #fff 99%, transparent 100%)`}} />
            <div style={{position: 'absolute', left: head - th * 12, top: y - th * 12, width: th * 24, height: th * 24, opacity: clamp01(a),
              background: `radial-gradient(circle closest-side, rgba(255,255,255,0.9) 0%, ${rgba(c, 0.35)} 35%, transparent 100%)`}} />
          </React.Fragment>
        );
      })}
    </Rotated>
  );
};

/* ======================================================================
 * Swoosh — broad light swipe with bright leading edge + streak detail
 * ==================================================================== */
export type SwooshProps = {
  start: number;
  dur?: number;
  /** Direction of travel in degrees (0 = left→right). */
  angle?: number;
  /** Band thickness in px (perpendicular to travel). */
  width?: number;
  /** Trail length in px. */
  trail?: number;
  color?: string;
  secondary?: string;
  intensity?: number;
  /** Add thin LightStreak detail. */
  streaks?: boolean;
  seed?: number;
  frame?: number;
};

/** A broad swipe of light crossing the frame — the light component of a whip/swipe transition. */
export const Swoosh: React.FC<SwooshProps> = ({start, dur = 20, angle = -12, width = 700, trail = 1700, color, secondary, intensity = 1, streaks = true, seed = 9, frame}) => {
  const f = useF(frame);
  if (f < start - 1 || f > start + dur + 2) return null;
  const col = colorOf(color, VC.cyan);
  const sec = colorOf(secondary, VC.violet);
  const p = lin(f, start, dur);
  const e = easeInOutCubic(p);
  const vel = 6 * p * (1 - p);
  const head = mix(-1300, 1300 + trail, e);
  const T = trail * (0.5 + 0.5 * Math.min(1, vel));
  const a = intensity * Math.min(1, 0.25 + vel * 0.75);
  const hot = mixHex(col, '#ffffff', 0.7);
  return (
    <>
      <Rotated angle={angle}>
        <div style={{position: 'absolute', left: head - T, top: -width / 2, width: T, height: width, opacity: clamp01(a), transform: 'skewX(-18deg)',
          background: `linear-gradient(90deg, transparent 0%, ${rgba(sec, 0.06)} 35%, ${rgba(sec, 0.16)} 65%, ${rgba(col, 0.38)} 88%, ${rgba(hot, 0.9)} 97.5%, transparent 100%)`,
          maskImage: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.6) 25%, black 50%, rgba(0,0,0,0.6) 75%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.6) 25%, black 50%, rgba(0,0,0,0.6) 75%, transparent 100%)'}} />
        <div style={{position: 'absolute', left: head - 90, top: -width * 0.8, width: 120, height: width * 1.6, opacity: clamp01(a * 0.9), transform: 'skewX(-18deg)',
          background: `radial-gradient(ellipse 50% 50% at 60% 50%, ${rgba('#ffffff', 0.85)} 0%, ${rgba(col, 0.35)} 40%, transparent 100%)`}} />
      </Rotated>
      {streaks && <LightStreak start={start - 2} dur={dur + 4} angle={angle} count={9} spread={width * 0.9} length={trail * 0.5} thickness={2.5} color={col} secondary={sec} intensity={intensity} stagger={0.3} seed={seed} frame={f} />}
    </>
  );
};

/* ======================================================================
 * SpeedLines — hyperspace / warp streaks radiating from a vanishing point
 * ==================================================================== */
export type SpeedLinesProps = {
  /** 0 = off … 1 = full warp (streak length + brightness). Animate freely. */
  intensity?: number;
  /** Vanishing point. */
  x?: number;
  y?: number;
  count?: number;
  /** World travel speed (units/frame). */
  speed?: number;
  /** Override the travelled distance (integrate speed yourself for smooth ramps). */
  travel?: number;
  color?: string;
  secondary?: string;
  /** Glow at the vanishing point 0..1. */
  glow?: number;
  /** Canvas resolution multiplier (0.5 = cheaper, softer). */
  res?: number;
  seed?: number;
  frame?: number;
};

/** Hyperspace streaks: 3D star points flying toward the camera, drawn as radial motion-blurred lines. */
export const SpeedLines: React.FC<SpeedLinesProps> = ({intensity = 1, x = CX, y = CY, count = 340, speed = 0.06, travel, color, secondary, glow = 0.6, res = 1, seed = 4, frame}) => {
  const f = useF(frame);
  const col = colorOf(color, VC.cyan);
  const sec = colorOf(secondary, VC.lilac);
  const I = Math.max(0, intensity);
  const ref = useCanvasDraw((ctx, w, h) => {
    if (I < 0.003) return;
    const s = w / W;
    ctx.scale(s, s);
    ctx.globalCompositeOperation = 'lighter';
    const D = 6, near = 0.05, focal = 900;
    const tr = travel ?? f * speed * (0.4 + 0.6 * Math.min(1.5, I));
    const rnd = prng(seed);
    const len = 0.08 + 1.1 * I * I;
    ctx.lineCap = 'round';
    for (let i = 0; i < count; i++) {
      const th = rnd() * Math.PI * 2;
      const rr = 0.25 + Math.pow(rnd(), 0.6) * 2.4;
      const z0 = rnd() * D;
      const hue = rnd();
      const bright = 0.35 + 0.65 * rnd();
      let z = ((z0 - tr) % D + D) % D + near;
      const zt = z + len * (0.5 + 0.5 * bright);
      const cx = Math.cos(th) * rr, cy = Math.sin(th) * rr * 0.92;
      const hx = x + (cx * focal) / z, hy = y + (cy * focal) / z;
      const tx = x + (cx * focal) / zt, ty = y + (cy * focal) / zt;
      if ((hx < -200 && tx < -200) || (hx > W + 200 && tx > W + 200) || (hy < -200 && ty < -200) || (hy > H + 200 && ty > H + 200)) continue;
      const fade = clamp01((D - z) / 1.2) * clamp01(z / 0.25 + 0.3);
      const a = fade * Math.min(1, bright * 1.3) * Math.min(1, 0.35 + I);
      if (a < 0.01) continue;
      const c = hue < 0.55 ? '#ffffff' : hue < 0.85 ? col : sec;
      const g = ctx.createLinearGradient(tx, ty, hx, hy);
      g.addColorStop(0, rgba(c, 0));
      g.addColorStop(0.6, rgba(c, a * 0.35));
      g.addColorStop(1, rgba(c, a));
      ctx.strokeStyle = g;
      ctx.lineWidth = Math.min(8, (0.9 + 2.6 * bright) / Math.max(0.3, z));
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(hx, hy);
      ctx.stroke();
    }
  });
  if (I < 0.003) return null;
  return (
    <div style={{...full, mixBlendMode: 'screen'}}>
      {glow > 0 && <div style={{...full, background: `radial-gradient(circle at ${x}px ${y}px, ${rgba('#ffffff', 0.55 * glow * Math.min(1, I))} 0%, ${rgba(col, 0.22 * glow * Math.min(1, I))} 8%, ${rgba(VC.violet, 0.08 * glow * Math.min(1, I))} 30%, transparent 60%)`}} />}
      <canvas ref={ref} width={Math.round(W * res)} height={Math.round(H * res)} style={{...full}} />
    </div>
  );
};

/* ======================================================================
 * LightLeak — organic warm / violet film leaks for transitions
 * ==================================================================== */
const LEAK_PALETTES: Record<string, [string, string, string, string]> = {
  warm: ['#FFF4DA', '#FFB347', '#FF5E7E', '#B5306E'],
  violet: ['#F4EBFF', '#B08CFF', '#E05CFF', '#5B32D6'],
  cyan: ['#EAFDFF', '#7FE7FF', '#5B7CFF', '#6A45E0'],
  lime: ['#FBFFE8', '#E7F4B9', '#8FD9B0', '#2F8F73'],
};
export type LightLeakProps = {
  start: number;
  /** Total length (in + out). */
  dur?: number;
  palette?: 'warm' | 'violet' | 'cyan' | 'lime' | [string, string, string, string];
  /** Edge the leak burns in from. */
  side?: 'left' | 'right' | 'top' | 'bottom' | 'tl' | 'tr' | 'bl' | 'br';
  intensity?: number;
  /** How far across the frame it travels 0..1. */
  travel?: number;
  seed?: number;
  frame?: number;
};

/** Organic film light leak burning in from an edge, drifting and morphing, then fading. Screen blend. */
export const LightLeak: React.FC<LightLeakProps> = ({start, dur = 70, palette = 'warm', side = 'left', intensity = 1, travel = 0.45, seed = 2, frame}) => {
  const f = useF(frame);
  const p = lin(f, start, dur);
  if (f < start || f > start + dur) return null;
  const env = Math.pow(Math.sin(Math.PI * Math.pow(p, 0.7)), 0.9) * intensity;
  if (env < 0.004) return null;
  const [hot, mid, deep, edge] = Array.isArray(palette) ? palette : LEAK_PALETTES[palette] ?? LEAK_PALETTES.warm;
  const dir: Record<string, [number, number, number, number]> = {
    left: [-0.1, 0.5, 1, 0], right: [1.1, 0.5, -1, 0], top: [0.5, -0.12, 0, 1], bottom: [0.5, 1.12, 0, -1],
    tl: [-0.05, -0.05, 0.7, 0.7], tr: [1.05, -0.05, -0.7, 0.7], bl: [-0.05, 1.05, 0.7, -0.7], br: [1.05, 1.05, -0.7, -0.7],
  };
  const [ox, oy, dx, dy] = dir[side] ?? dir.left;
  const adv = easeInOutCubic(p) * travel;
  const blobs = [0, 1, 2, 3, 4, 5].map((i) => {
    const r1 = hash(seed * 31 + i), r2 = hash(seed * 17 + i * 5), r3 = hash(seed * 7 + i * 11);
    const along = adv * (0.6 + 0.8 * r1) + (r1 - 0.3) * 0.12;
    const perp = (r2 - 0.5) * 0.9 + 0.08 * fbm1(f * 0.02 + i * 3, seed);
    const px = (ox + dx * along + (-dy) * perp) * W;
    const py = (oy + dy * along + dx * perp) * H;
    const sz = (700 + 900 * r3) * (0.8 + 0.4 * noise1(f * 0.025 + i, seed));
    const ar = 0.45 + 0.5 * r2;
    const rot = r1 * 180 + f * (r2 - 0.5) * 0.4;
    return {px, py, sz, ar, rot, i};
  });
  return (
    <div style={{...full, overflow: 'hidden', mixBlendMode: 'screen', opacity: clamp01(env)}}>
      {/* broad edge burn */}
      <div style={{...full, background: `radial-gradient(${dx !== 0 && dy === 0 ? '60% 120%' : dy !== 0 && dx === 0 ? '120% 60%' : '80% 80%'} at ${(ox + dx * adv * 0.5) * 100}% ${(oy + dy * adv * 0.5) * 100}%, ${rgba(mid, 0.55)} 0%, ${rgba(deep, 0.3)} 35%, ${rgba(edge, 0.1)} 65%, transparent 100%)`}} />
      {blobs.map((b) => (
        <div key={b.i} style={{position: 'absolute', left: b.px - b.sz / 2, top: b.py - (b.sz * b.ar) / 2, width: b.sz, height: b.sz * b.ar, transform: `rotate(${b.rot}deg)`, mixBlendMode: 'screen',
          background: b.i % 3 === 0
            ? `radial-gradient(ellipse closest-side, ${rgba(hot, 0.9)} 0%, ${rgba(mid, 0.6)} 25%, ${rgba(deep, 0.25)} 60%, transparent 100%)`
            : `radial-gradient(ellipse closest-side, ${rgba(mid, 0.5)} 0%, ${rgba(deep, 0.32)} 40%, ${rgba(edge, 0.1)} 75%, transparent 100%)`}} />
      ))}
      {/* film-burn bar */}
      <div style={{position: 'absolute', left: (ox + dx * adv * 0.9) * W - (dy !== 0 ? W : 90), top: (oy + dy * adv * 0.9) * H - (dx !== 0 ? H : 90), width: dy !== 0 ? W * 2 : 180, height: dx !== 0 ? H * 2 : 180, opacity: 0.55,
        transform: `rotate(${(hash(seed) - 0.5) * 16}deg)`,
        background: dx !== 0 ? `linear-gradient(90deg, transparent, ${rgba(hot, 0.5)} 50%, transparent)` : `linear-gradient(180deg, transparent, ${rgba(hot, 0.5)} 50%, transparent)`}} />
    </div>
  );
};

/* ======================================================================
 * GodRays — volumetric shafts radiating from a source, slowly rotating, with lit dust
 * ==================================================================== */
export type GodRaysProps = {
  /** Source point (px). Can be off-screen (e.g. y = -200 for shafts from above). */
  x?: number;
  y?: number;
  intensity?: number;
  color?: string;
  secondary?: string;
  /** Number of shaft lobes around 360°. */
  lobes?: number;
  /** Angular range in degrees (360 = all around, 60 = a fan). */
  spread?: number;
  /** Centre direction of the fan in degrees (0 = right, 90 = down). Only when spread < 360. */
  direction?: number;
  /** Ray length (px radius of falloff). */
  length?: number;
  /** Rotation speed (lobes drift, deg/frame). */
  speed?: number;
  /** Shaft contrast (higher = thinner, more defined beams). */
  contrast?: number;
  /** Lit dust motes inside the beams. */
  dust?: number;
  /** Hot glow at the source 0..1. */
  core?: number;
  seed?: number;
  frame?: number;
};

const rayStops = (f: number, lobes: number, seed: number, speed: number, contrast: number, spread: number, direction: number, color: string, gain: number) => {
  const stops: string[] = [];
  const N = 180;
  for (let i = 0; i <= N; i++) {
    const deg = (i / N) * 360;
    const a = beamAlpha(deg, f, lobes, seed, speed, contrast, spread, direction) * gain;
    stops.push(`${rgba(color, a)} ${deg.toFixed(1)}deg`);
  }
  return `conic-gradient(from 90deg, ${stops.join(', ')})`;
};
/** Beam density at a given angle (deg, 0 = right, CSS-conic 'from 90deg' convention aligned). */
const beamAlpha = (deg: number, f: number, lobes: number, seed: number, speed: number, contrast: number, spread: number, direction: number) => {
  const ph = deg + f * speed;
  const u = (ph / 360) * lobes;
  // wrap noise around the circle by blending two samples
  const n1 = noise1(u, seed), n2 = noise1(u - lobes, seed);
  const wrapT = ((ph % 360) + 360) % 360 / 360;
  const n = mix(n1, n2, wrapT);
  const fine = noise1(u * 3.7 + 11, seed + 3);
  const r = clamp01((n - 0.28) / 0.5);
  let a = Math.pow(r * r * (3 - 2 * r), contrast * 0.6) * (0.55 + 0.45 * fine);
  if (spread < 360) {
    let d = Math.abs(((deg - direction + 540) % 360) - 180);
    a *= Math.pow(clamp01(1 - d / (spread / 2)), 0.8);
  }
  return a;
};

/** God rays: soft volumetric shafts from a source (behind a logo, through panels), drifting slowly, with lit dust. */
export const GodRays: React.FC<GodRaysProps> = ({
  x = CX, y = CY, intensity = 1, color, secondary, lobes = 22, spread = 360, direction = 90, length = 1300, speed = 0.08, contrast = 2.6, dust = 1, core = 0.8, seed = 7, frame,
}) => {
  const f = useF(frame);
  const col = colorOf(color, VC.lilac);
  const sec = colorOf(secondary, VC.cyan);
  const I = Math.max(0, intensity);
  const dustRef = useCanvasDraw((ctx, w) => {
    if (dust <= 0 || I < 0.01) return;
    const s = w / W;
    ctx.scale(s, s);
    ctx.globalCompositeOperation = 'lighter';
    const rnd = prng(seed + 99);
    const n = Math.round(150 * dust);
    const spr = glowSprite('#E8E0FF', 0.7);
    for (let i = 0; i < n; i++) {
      const r = Math.pow(rnd(), 0.7) * length * 0.9;
      const a0 = rnd() * 360;
      const sp = 0.1 + rnd() * 0.35;
      const sz = 2 + Math.pow(rnd(), 3) * 9;
      const ph = rnd() * 100;
      // slow drift: orbit + outward creep, wrapped
      const rr = (r + f * sp * 0.9) % (length * 0.9);
      const ang = a0 + Math.sin(f * 0.01 + ph) * 3;
      const dx = Math.cos((ang * Math.PI) / 180) * rr + Math.sin(f * 0.013 + ph) * 12;
      const dy = Math.sin((ang * Math.PI) / 180) * rr + Math.cos(f * 0.011 + ph) * 12;
      const px = x + dx, py = y + dy;
      if (px < -20 || px > W + 20 || py < -20 || py > H + 20) continue;
      const deg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
      const lit = beamAlpha(deg, f, lobes, seed, speed, contrast, spread, direction);
      const fall = Math.pow(clamp01(1 - rr / (length * 0.9)), 1.2);
      const tw = 0.6 + 0.4 * Math.sin(f * 0.07 + ph * 3);
      const a = clamp01((0.08 + lit * 1.6) * fall * tw * I);
      if (a < 0.02) continue;
      ctx.globalAlpha = a;
      ctx.drawImage(spr, px - sz * 2, py - sz * 2, sz * 4, sz * 4);
    }
  });
  if (I < 0.003) return null;
  const R = length;
  const mask = `radial-gradient(circle closest-side, rgba(0,0,0,0.9) 0%, black 6%, rgba(0,0,0,0.7) 18%, rgba(0,0,0,0.38) 40%, rgba(0,0,0,0.14) 70%, transparent 100%)`;
  const box: React.CSSProperties = {position: 'absolute', left: x - R, top: y - R, width: R * 2, height: R * 2, maskImage: mask, WebkitMaskImage: mask, mixBlendMode: 'screen'};
  return (
    <div style={{...full, overflow: 'hidden', mixBlendMode: 'screen'}}>
      <div style={{...box, opacity: clamp01(I), background: rayStops(f, lobes, seed, speed, contrast, spread, direction, col, 0.62)}} />
      <div style={{...box, opacity: clamp01(0.8 * I), background: rayStops(f, Math.round(lobes * 1.7), seed + 13, -speed * 0.6, contrast + 1, spread, direction, sec, 0.38)}} />
      {core > 0 && (
        <div style={{position: 'absolute', left: x - 500, top: y - 500, width: 1000, height: 1000, opacity: clamp01(core * I),
          background: `radial-gradient(circle closest-side, rgba(255,255,255,0.75) 0%, ${rgba(mixHex(col, '#fff', 0.4), 0.42)} 10%, ${rgba(col, 0.16)} 30%, ${rgba(VC.violet, 0.05)} 60%, transparent 100%)`}} />
      )}
      {dust > 0 && <canvas ref={dustRef} width={W} height={H} style={{...full}} />}
    </div>
  );
};

/* ======================================================================
 * VolumetricBeams — a few soft cone beams (stage lights / light through panels)
 * ==================================================================== */
export type Beam = {
  x: number;
  y: number;
  /** Direction in degrees (90 = straight down). */
  angle: number;
  /** Cone width in degrees. */
  width?: number;
  length?: number;
  color?: string;
  intensity?: number;
  /** Sweep amplitude in degrees (oscillation). */
  sweep?: number;
};
export type VolumetricBeamsProps = {beams: Beam[]; intensity?: number; frame?: number; seed?: number};

/** Soft cone light beams with radial falloff and a hot apex. Animate `angle` or use `sweep`. */
export const VolumetricBeams: React.FC<VolumetricBeamsProps> = ({beams, intensity = 1, frame, seed = 5}) => {
  const f = useF(frame);
  if (intensity < 0.003) return null;
  return (
    <div style={{...full, overflow: 'hidden', mixBlendMode: 'screen'}}>
      {beams.map((b, i) => {
        const L = b.length ?? 1400;
        const w = b.width ?? 16;
        const col = colorOf(b.color, VC.lilac);
        const ang = b.angle + (b.sweep ?? 0) * Math.sin(f * 0.012 + hash(seed + i) * 6.28);
        const a = (b.intensity ?? 1) * intensity * (0.9 + 0.1 * noise1(f * 0.05, seed + i));
        // conic: 0deg points up in CSS; our angle 0 = right → css = angle + 90
        const c = ang + 90;
        const st = (k: number, al: number, cc = col) => `${rgba(cc, al * a)} ${(c - w + k * w).toFixed(2)}deg`;
        const g = `conic-gradient(from 0deg at 50% 50%, transparent ${(c - w - 0.01).toFixed(2)}deg, ${st(0.15, 0.03)}, ${st(0.4, 0.1)}, ${st(0.7, 0.2, mixHex(col, '#fff', 0.2))}, ${st(1, 0.27, mixHex(col, '#fff', 0.45))}, ${st(1.3, 0.2, mixHex(col, '#fff', 0.2))}, ${st(1.6, 0.1)}, ${st(1.85, 0.03)}, transparent ${(c + w + 0.01).toFixed(2)}deg)`;
        const mask = 'radial-gradient(circle closest-side, rgba(0,0,0,0.5) 0%, black 8%, rgba(0,0,0,0.75) 30%, rgba(0,0,0,0.3) 65%, transparent 100%)';
        return (
          <React.Fragment key={i}>
            <div style={{position: 'absolute', left: b.x - L, top: b.y - L, width: L * 2, height: L * 2, background: g, maskImage: mask, WebkitMaskImage: mask, mixBlendMode: 'screen'}} />
            <div style={{position: 'absolute', left: b.x - 120, top: b.y - 120, width: 240, height: 240, opacity: clamp01(a), background: `radial-gradient(circle closest-side, rgba(255,255,255,0.8) 0%, ${rgba(col, 0.3)} 35%, transparent 100%)`}} />
          </React.Fragment>
        );
      })}
    </div>
  );
};
