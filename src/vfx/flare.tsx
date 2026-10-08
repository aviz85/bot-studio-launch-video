/* Anamorphic lens flares, flare bursts and glints. Pure CSS gradients, screen-blended. */
import React from 'react';
import {CX, CY, H, VC, W, clamp01, colorOf, easeOutExpo, fbm1, full, hash, impulse, mixHex, radialFill, rgba, scratchCanvas, useCanvasDraw, useF} from './util';

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

/** Seeded irregular starburst rays: [angleDeg, halfWidthDeg, alpha]. */
const rayDefs = (n: number, seed: number) => {
  const rs: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const ang = (360 / n) * i + (hash(seed * 97 + i) - 0.5) * (300 / n);
    rs.push([((ang % 360) + 360) % 360, 0.35 + hash(seed * 31 + i * 7) * 1.1, 0.25 + 0.75 * Math.pow(hash(seed * 13 + i * 3), 1.5)]);
  }
  return rs.sort((p, q) => p[0] - q[0]);
};
/** Draw a masked conic starburst into ctx (via scratch canvas). */
const drawRays = (ctx: CanvasRenderingContext2D, key: string, x: number, y: number, R: number, rot: number, n: number, seed: number, color: string, a: number, maskStops: [number, string][]) => {
  const size = Math.ceil(R * 2);
  if (size < 4 || a < 0.003) return;
  const {c: S, ctx: s} = scratchCanvas(key, size, size);
  const g = s.createConicGradient((rot * Math.PI) / 180, R, R);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  let last = 0;
  for (const [ang, w, al] of rayDefs(n, seed)) {
    const a0 = Math.max(last, ang - w) / 360, a1 = Math.min(359.9, ang + w) / 360;
    if (a0 >= a1 || ang / 360 <= last / 360) continue;
    g.addColorStop(a0, 'rgba(0,0,0,0)');
    g.addColorStop(ang / 360, rgba(color, Math.min(1, a * al)));
    g.addColorStop(a1, 'rgba(0,0,0,0)');
    last = a1 * 360;
  }
  g.addColorStop(1, 'rgba(0,0,0,0)');
  s.fillStyle = g;
  s.fillRect(0, 0, size, size);
  s.globalCompositeOperation = 'destination-in';
  radialFill(s, R, R, R, maskStops);
  ctx.drawImage(S, x - R, y - R);
};
const polyPath = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, sides: number, rot: number) => {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rot + (Math.PI * 2 * i) / sides;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
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
 *  iris ghosts mirrored through the optical centre and a rainbow ring ghost. One canvas, additive inside, screen-blended. */
export const LensFlare: React.FC<LensFlareProps> = ({
  x, y, intensity = 1, scale = 1, streak = 1, color, secondary, ghosts = 1, rays = 14, ring = true, veil = 0.6,
  center = [CX, CY], flicker = 0.4, seed = 1, frame, blend = 'screen', style,
}) => {
  const f = useF(frame);
  const col = colorOf(color, VC.cyan);
  const sec = colorOf(secondary, VC.violet);
  const I = Math.max(0, intensity) * (1 + flicker * 0.1 * fbm1(f * 0.11, seed));
  const ref = useCanvasDraw((ctx) => {
    if (I < 0.005) return;
    const s = scale;
    const L = 2600 * s * streak;
    const hot = mixHex(col, '#ffffff', 0.65);
    const k = (a: number) => Math.min(1, a * I);
    const kg = (a: number) => Math.min(1, a * Math.sqrt(I)); // glows grow slower than the core (avoids milky bursts)
    const vx = x - center[0], vy = y - center[1];
    const off = Math.min(1, Math.hypot(vx, vy) / 700);
    const g = ghosts * (0.55 + 0.45 * off);
    const rot = (f * 0.06 + seed * 37) % 360;
    ctx.globalCompositeOperation = 'lighter';
    // horizontal haze band
    if (veil > 0) {
      const rx = Math.max(1920, L * 0.6), a = kg(veil * 0.55);
      radialFill(ctx, x, y, rx, [[0, rgba(col, 0.22 * a)], [0.4, rgba(mixHex(col, sec, 0.5), 0.08 * a)], [1, rgba(col, 0)]], (260 * s) / rx);
    }
    // wide atmospheric + medium glow
    radialFill(ctx, x, y, 750 * s, [[0, rgba(sec, 0.22 * kg(0.9))], [0.3, rgba(sec, 0.09 * kg(0.9))], [0.6, rgba(sec, 0.025 * kg(0.9))], [1, rgba(sec, 0)]]);
    radialFill(ctx, x, y, 260 * s, [[0, rgba(hot, 0.55 * kg(1))], [0.22, rgba(col, 0.28 * kg(1))], [0.5, rgba(col, 0.09 * kg(1))], [1, rgba(col, 0)]]);
    // starburst rays
    if (rays > 0) {
      drawRays(ctx, 'flareRaysA', x, y, 550 * s, rot, Math.max(4, Math.round(rays * 0.5)), seed, mixHex(col, '#ffffff', 0.5), k(0.85) * 0.9,
        [[0, 'rgba(0,0,0,1)'], [0.12, 'rgba(0,0,0,0.55)'], [0.4, 'rgba(0,0,0,0.15)'], [1, 'rgba(0,0,0,0)']]);
      drawRays(ctx, 'flareRaysB', x, y, 280 * s, -rot * 0.7 + 11, rays, seed + 5, hot, k(0.8) * 0.85,
        [[0, 'rgba(0,0,0,1)'], [0.18, 'rgba(0,0,0,0.5)'], [1, 'rgba(0,0,0,0)']]);
    }
    // anamorphic streaks (ellipses: haze → glow → hairline core)
    const blue = mixHex(col, '#3A6BFF', 0.35);
    radialFill(ctx, x, y, L * 0.31, [[0, rgba(blue, 0.28 * k(0.55))], [0.45, rgba(mixHex(col, '#3A6BFF', 0.5), 0.08 * k(0.55))], [1, rgba(blue, 0)]], (95 * s) / (L * 0.31));
    radialFill(ctx, x, y, L * 0.45, [[0, rgba(hot, 0.75 * k(0.8))], [0.18, rgba(col, 0.5 * k(0.8))], [0.5, rgba(col, 0.16 * k(0.8))], [1, rgba(col, 0)]], (17 * s) / (L * 0.45));
    radialFill(ctx, x, y, L * 0.5, [[0, rgba('#ffffff', k(1))], [0.12, rgba(hot, 0.95 * k(1))], [0.35, rgba(col, 0.7 * k(1))], [0.7, rgba(col, 0.25 * k(1))], [1, rgba(col, 0)]], Math.max(1.25, 3 * s) / (L * 0.5));
    const secHot = mixHex(sec, '#ffffff', 0.4);
    for (const d of [-1, 1]) radialFill(ctx, x + d * 30 * s, y + d * 15 * s, L * 0.225, [[0, rgba(secHot, 0.85 * k(0.5))], [0.4, rgba(sec, 0.35 * k(0.5))], [1, rgba(sec, 0)]], Math.max(1, 1.75 * s) / (L * 0.225));
    // faint vertical spike
    radialFill(ctx, x, y, 180 * s, [[0, rgba(hot, 0.8 * k(0.35))], [0.4, rgba(col, 0.2 * k(0.35))], [1, rgba(col, 0)]], 1, Math.max(1, 2 * s) / (180 * s));
    // hot core
    radialFill(ctx, x, y, 75 * s, [[0, rgba('#ffffff', k(1.1))], [0.14, rgba('#ffffff', 0.92 * k(1.1))], [0.3, rgba(hot, 0.6 * k(1.1))], [0.6, rgba(col, 0.22 * k(1.1))], [1, rgba(col, 0)]]);
    // ghosts mirrored through the optical centre
    if (g > 0) {
      const ghostDefs: [number, number, 'hex' | 'oct' | 'disc' | 'ring', string, number][] = [
        [0.55, 34, 'disc', VC.white, 0.16], [0.22, 70, 'hex', sec, 0.13], [-0.18, 46, 'disc', VC.pistachio, 0.12], [-0.42, 150, 'ring', col, 0.1],
        [-0.7, 96, 'oct', VC.magenta, 0.08], [-0.95, 30, 'disc', col, 0.2], [-1.25, 230, 'hex', sec, 0.06], [-1.6, 120, 'disc', VC.amber, 0.05],
      ];
      ghostDefs.forEach(([t, size, shape, c, a0], i) => {
        const gx = center[0] + vx * t, gy = center[1] + vy * t;
        const r = (size * s * (0.85 + 0.3 * hash(seed * 7 + i))) / 2;
        const al = a0 * g * Math.min(1, I);
        if (shape === 'disc') return radialFill(ctx, gx, gy, r, [[0, rgba(c, al * 1.2)], [0.55, rgba(c, al * 0.8)], [0.85, rgba(c, al * 0.25)], [1, rgba(c, 0)]]);
        if (shape === 'ring') return radialFill(ctx, gx, gy, r, [[0, rgba(c, al * 0.15)], [0.7, rgba(c, al * 0.35)], [0.9, rgba(mixHex(c, '#ffffff', 0.4), al * 1.3)], [1, rgba(c, 0)]]);
        const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
        gr.addColorStop(0, rgba(c, al * 0.35));
        gr.addColorStop(0.7, rgba(c, al * 0.6));
        gr.addColorStop(0.96, rgba(mixHex(c, '#ffffff', 0.3), al * 1.25));
        gr.addColorStop(1, rgba(c, al * 0.6));
        ctx.fillStyle = gr;
        polyPath(ctx, gx, gy, r, shape === 'hex' ? 6 : 8, 0.2 + (shape === 'hex' ? Math.PI / 6 : Math.PI / 8));
        ctx.fill();
      });
      // rainbow ring ghost on the mirrored side, fading toward the centre
      if (ring) {
        const R = 310 * s;
        const {c: S, ctx: r2} = scratchCanvas('flareRing', Math.ceil(R * 2), Math.ceil(R * 2));
        radialFill(r2, R, R, R, [[0.8, 'rgba(0,0,0,0)'], [0.83, 'rgba(255,60,90,0.07)'], [0.86, 'rgba(255,170,40,0.08)'], [0.89, 'rgba(200,255,90,0.07)'], [0.92, 'rgba(60,230,255,0.08)'], [0.95, 'rgba(90,110,255,0.07)'], [0.98, 'rgba(170,80,255,0.05)'], [1, 'rgba(0,0,0,0)']]);
        const ang = Math.atan2(vy, vx);
        const lg = r2.createLinearGradient(R - Math.cos(ang) * R, R - Math.sin(ang) * R, R + Math.cos(ang) * R, R + Math.sin(ang) * R);
        lg.addColorStop(0, 'rgba(0,0,0,1)');
        lg.addColorStop(0.4, 'rgba(0,0,0,1)');
        lg.addColorStop(0.85, 'rgba(0,0,0,0)');
        r2.globalCompositeOperation = 'destination-in';
        r2.fillStyle = lg;
        r2.fillRect(0, 0, R * 2, R * 2);
        ctx.globalAlpha = Math.min(1, 0.9 * g * Math.min(1.5, I));
        ctx.drawImage(S, center[0] - vx * 0.85 - R, center[1] - vy * 0.85 - R);
        ctx.globalAlpha = 1;
      }
    }
  });
  if (I < 0.005) return null;
  return <canvas ref={ref} width={W} height={H} style={{...full, mixBlendMode: blend, ...style}} />;
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
