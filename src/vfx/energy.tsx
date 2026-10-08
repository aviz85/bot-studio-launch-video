/* Shockwaves and energy bursts. */
import React from 'react';
import {VC, W, H, clamp01, colorOf, easeOutExpo, full, glowSprite, impulse, mix, mixHex, noise1, prng, rgba, useCanvasDraw, useF} from './util';

/* ======================================================================
 * Shockwave
 * ==================================================================== */
export type ShockwaveProps = {
  x: number;
  y: number;
  /** Frame of impact. */
  at: number;
  /** Frames for the ring to reach full radius and fade. */
  dur?: number;
  /** Final radius in px. */
  radius?: number;
  /** Ring thickness (trailing glow width) in px at full size. */
  thickness?: number;
  color?: string;
  secondary?: string;
  /** Number of echo rings. */
  rings?: number;
  /** Frames between echo rings. */
  gap?: number;
  intensity?: number;
  /** Vertical squash 0..1 (1 = circle, 0.3 = ring lying on a floor). */
  squash?: number;
  /** Refraction look: a blurred/brightened lens band riding the ring (uses backdrop-filter; costs more). */
  distort?: boolean;
  /** Bright flash core at the origin. */
  core?: boolean;
  frame?: number;
};

/** Expanding energy ring(s) with a hot leading edge and a soft trailing glow (+ optional refraction band). */
export const Shockwave: React.FC<ShockwaveProps> = ({
  x, y, at, dur = 42, radius = 1100, thickness = 90, color, secondary, rings = 2, gap = 5, intensity = 1, squash = 1, distort = false, core = true, frame,
}) => {
  const f = useF(frame);
  const col = colorOf(color, VC.cyan);
  const sec = colorOf(secondary, VC.violet);
  const hot = mixHex(col, '#ffffff', 0.7);
  if (f < at || f > at + dur + gap * (rings - 1) + 2) return null;
  const items: React.ReactNode[] = [];
  for (let i = 0; i < rings; i++) {
    const t = (f - at - i * gap) / dur;
    if (t <= 0 || t >= 1) continue;
    const e = easeOutExpo(t);
    const r = mix(radius * 0.04, radius * (1 - i * 0.12), e);
    const th = thickness * (0.35 + 0.65 * e) * (1 - i * 0.2);
    const a = intensity * Math.pow(1 - t, 1.6) * (i === 0 ? 1 : 0.55);
    const R = r + th * 0.6 + 4;
    const px = (v: number) => `${Math.max(0, v).toFixed(1)}px`;
    const g = `radial-gradient(circle closest-side, transparent ${px(r - th * 1.25)}, ${rgba(sec, 0.04 * a)} ${px(r - th * 0.85)}, ${rgba(col, 0.1 * a)} ${px(r - th * 0.4)}, ${rgba(hot, 0.38 * a)} ${px(r - th * 0.1)}, ${rgba(hot, 0.9 * a)} ${px(r - 5)}, ${rgba('#ffffff', Math.min(1, 1.3 * a))} ${px(r - 2)}, ${rgba('#ffffff', Math.min(1, 1.3 * a))} ${px(r + 0.5)}, ${rgba(col, 0.7 * a)} ${px(r + 3.5)}, ${rgba(VC.magenta, 0.14 * a)} ${px(r + th * 0.12)}, ${rgba(sec, 0.04 * a)} ${px(r + th * 0.28)}, transparent ${px(r + th * 0.45)})`;
    // organic brightness variation around the circumference (rotating noisy conic mask)
    const stops: string[] = [];
    for (let k = 0; k <= 36; k++) {
      const n = noise1((k % 36) * 0.55 + i * 7, 17) * 0.7 + noise1((k % 36) * 1.7 + 3, 29) * 0.3;
      stops.push(`rgba(0,0,0,${(0.35 + 0.65 * n).toFixed(3)}) ${k * 10}deg`);
    }
    const nm = `conic-gradient(from ${(f * 0.8 + i * 40).toFixed(1)}deg, ${stops.join(', ')})`;
    items.push(
      <div key={i} style={{position: 'absolute', left: x - R, top: y - R, width: R * 2, height: R * 2, background: g, transform: squash !== 1 ? `scaleY(${squash})` : undefined, mixBlendMode: 'screen', maskImage: nm, WebkitMaskImage: nm}} />,
    );
    if (distort && i === 0) {
      const m = `radial-gradient(circle closest-side, transparent ${Math.max(0, r - th * 0.9)}px, black ${r - th * 0.35}px, black ${r - 2}px, transparent ${r + th * 0.15}px)`;
      items.unshift(
        <div key={'d' + i} style={{position: 'absolute', left: x - R, top: y - R, width: R * 2, height: R * 2, transform: squash !== 1 ? `scaleY(${squash})` : undefined,
          backdropFilter: `blur(${(5 * (1 - t) + 1.5).toFixed(1)}px) brightness(${(1 + 0.35 * a).toFixed(3)}) saturate(1.3)`,
          maskImage: m, WebkitMaskImage: m}} />,
      );
    }
  }
  const ce = core ? impulse(f, at, 1, 4) * intensity : 0;
  return (
    <div style={{...full, overflow: 'hidden'}}>
      {items}
      {ce > 0.01 && (
        <div style={{position: 'absolute', left: x - 300, top: y - 300, width: 600, height: 600, mixBlendMode: 'screen', opacity: clamp01(ce),
          background: `radial-gradient(circle closest-side, #fff 0%, ${rgba(hot, 0.75)} 10%, ${rgba(col, 0.28)} 28%, ${rgba(sec, 0.07)} 55%, transparent 100%)`}} />
      )}
    </div>
  );
};

/* ======================================================================
 * EnergyBurst — particles exploding outward with drag + motion streaks
 * ==================================================================== */
export type EnergyBurstProps = {
  x: number;
  y: number;
  at: number;
  /** Lifetime in frames. */
  dur?: number;
  count?: number;
  /** Max travel distance in px. */
  distance?: number;
  /** Angular spread in degrees around `direction` (360 = omni). */
  spread?: number;
  direction?: number;
  /** Downward acceleration (px/frame²) — 0 for zero-g energy, ~0.15 for sparks. */
  gravity?: number;
  color?: string;
  secondary?: string;
  /** Streak / size multiplier. */
  size?: number;
  intensity?: number;
  /** Vertical squash of the burst (e.g. 0.5 for a floor-plane burst). */
  squash?: number;
  seed?: number;
  frame?: number;
};

/** Canvas2D particle explosion: drag-decelerated sparks drawn as motion-blurred streaks with hot heads. */
export const EnergyBurst: React.FC<EnergyBurstProps> = ({
  x, y, at, dur = 55, count = 160, distance = 720, spread = 360, direction = 0, gravity = 0, color, secondary, size = 1, intensity = 1, squash = 1, seed = 11, frame,
}) => {
  const f = useF(frame);
  const col = colorOf(color, VC.cyan);
  const sec = colorOf(secondary, VC.violet);
  const t = f - at;
  const active = t >= 0 && t <= dur;
  const ref = useCanvasDraw((ctx) => {
    if (!active) return;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    const rnd = prng(seed);
    const sprA = glowSprite(col, 0.7);
    const sprB = glowSprite(sec, 0.7);
    const tau = dur * 0.2;
    const pos = (tt: number, v: number, cs: number, sn: number) => {
      const d = v * (1 - Math.exp(-Math.max(0, tt) / tau));
      return [x + cs * d, y + (sn * d) * squash + 0.5 * gravity * tt * tt];
    };
    for (let i = 0; i < count; i++) {
      const ang = ((direction + (rnd() - 0.5) * spread) * Math.PI) / 180;
      const v = distance * (0.15 + 0.85 * Math.pow(rnd(), 0.6));
      const life = dur * (0.45 + 0.55 * rnd());
      const w = (0.8 + rnd() * 2.6) * size;
      const kind = rnd();
      const delay = rnd() * 3;
      const tt = t - delay;
      if (tt <= 0 || tt > life) continue;
      const lt = tt / life;
      const cs = Math.cos(ang), sn = Math.sin(ang);
      const [hx, hy] = pos(tt, v, cs, sn);
      const [qx, qy] = pos(tt - 2.6 - 3 * (1 - lt), v, cs, sn);
      const a = Math.pow(1 - lt, 1.4) * intensity;
      const c = kind < 0.45 ? '#ffffff' : kind < 0.8 ? col : sec;
      const g = ctx.createLinearGradient(qx, qy, hx, hy);
      g.addColorStop(0, rgba(c, 0));
      g.addColorStop(1, rgba(mixHex(c, '#ffffff', 0.4), Math.min(1, a)));
      ctx.strokeStyle = g;
      ctx.lineWidth = w * (1 - lt * 0.6);
      ctx.beginPath();
      ctx.moveTo(qx, qy);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      if (kind > 0.6) {
        const s = w * 9 * (1 - lt * 0.5);
        ctx.globalAlpha = clamp01(a * 0.8);
        ctx.drawImage(kind > 0.85 ? sprB : sprA, hx - s, hy - s, s * 2, s * 2);
        ctx.globalAlpha = 1;
      }
    }
  });
  if (!active) return null;
  const fl = impulse(f, at, 1, 5) * intensity;
  return (
    <div style={{...full, mixBlendMode: 'screen'}}>
      {fl > 0.01 && (
        <div style={{position: 'absolute', left: x - 300, top: y - 300, width: 600, height: 600, opacity: clamp01(fl),
          background: `radial-gradient(circle closest-side, #fff 0%, ${rgba(col, 0.5)} 25%, ${rgba(sec, 0.12)} 60%, transparent 100%)`}} />
      )}
      <canvas ref={ref} width={W} height={H} style={{...full}} />
    </div>
  );
};
