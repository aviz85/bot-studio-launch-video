/* Shockwaves and energy bursts. */
import React from 'react';
import {VC, W, H, clamp01, colorOf, easeOutExpo, full, glowSprite, impulse, mix, mixHex, noise1, prng, radialFill, rgba, useCanvasDraw, useF, type CanvasBlend} from './util';

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
  /** Cheap distortion look: chromatic double edge (magenta inside / cyan outside) + a dark refraction band. */
  distort?: boolean;
  /** Real refraction: backdrop-filter blur/brighten band riding the ring. EXPENSIVE (~+250 ms/frame) — hero moments only. */
  refract?: boolean;
  /** Bright flash core at the origin. */
  core?: boolean;
  /** Layer compositing (see CanvasBlend). 'normal' required for the dark band of `distort`. */
  blend?: CanvasBlend;
  frame?: number;
};

/** Expanding energy ring(s) with a hot leading edge, cyan outer fringe and soft trailing glow; brightness varies around the
 *  circumference (rotating noise). One canvas (normal compositing by default) + an optional DOM backdrop-filter refraction band. */
export const Shockwave: React.FC<ShockwaveProps> = ({
  x, y, at, dur = 42, radius = 1100, thickness = 90, color, secondary, rings = 2, gap = 5, intensity = 1, squash = 1, distort = false, refract = false, core = true, blend = 'normal', frame,
}) => {
  const f = useF(frame);
  const col = colorOf(color, VC.cyan);
  const sec = colorOf(secondary, VC.violet);
  const hot = mixHex(col, '#ffffff', 0.7);
  const active = f >= at && f <= at + dur + gap * (rings - 1) + 2;
  type Ring = {r: number; th: number; a: number; t: number};
  const list: Ring[] = [];
  if (active) {
    for (let i = 0; i < rings; i++) {
      const t = (f - at - i * gap) / dur;
      if (t <= 0 || t >= 1) continue;
      const e = easeOutExpo(t);
      list.push({r: mix(radius * 0.04, radius * (1 - i * 0.12), e), th: thickness * (0.35 + 0.65 * e) * (1 - i * 0.2), a: intensity * Math.pow(1 - t, 1.6) * (i === 0 ? 1 : 0.55), t});
    }
  }
  const ref = useCanvasDraw((ctx) => {
    if (!active) return;
    // fill a radial gradient only inside the annulus [stops[0][0], R] (the gradient is transparent elsewhere) — far fewer pixels
    const ringFill = (r: number, R: number, stops: [number, string][]) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, squash);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
      for (const [v, c] of stops) g.addColorStop(clamp01(v / R), c);
      ctx.fillStyle = g;
      const inner = Math.max(0, stops[0][0] - 1);
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      if (inner > 0) {
        ctx.moveTo(inner, 0);
        ctx.arc(0, 0, inner, Math.PI * 2, 0, true);
      }
      ctx.fill();
      ctx.restore();
    };
    ctx.globalCompositeOperation = 'lighter';
    for (const {r, th, a} of list) {
      const R = r + th * 0.45 + 4;
      ringFill(r, R, [
        [Math.max(0, r - th * 1.25), 'rgba(0,0,0,0)'], [Math.max(0, r - th * 0.85), rgba(sec, 0.04 * a)], [Math.max(0, r - th * 0.4), rgba(col, 0.1 * a)],
        [Math.max(0, r - th * 0.1), rgba(hot, 0.38 * a)], [Math.max(0, r - 5), rgba(hot, 0.9 * a)], [Math.max(0, r - 2), rgba('#ffffff', Math.min(1, 1.3 * a))],
        [r + 0.5, rgba('#ffffff', Math.min(1, 1.3 * a))], [r + 3.5, rgba(col, 0.7 * a)], [r + th * 0.12, rgba(VC.magenta, 0.14 * a)], [r + th * 0.28, rgba(sec, 0.04 * a)], [R, 'rgba(0,0,0,0)'],
      ]);
    }
    // organic brightness variation around the circumference: rotating noisy conic mask (rings only)
    const cg = ctx.createConicGradient(((f * 0.8) * Math.PI) / 180, x, y);
    for (let k = 0; k <= 36; k++) {
      const n = noise1((k % 36) * 0.55, 17) * 0.7 + noise1((k % 36) * 1.7 + 3, 29) * 0.3;
      cg.addColorStop(k / 36, `rgba(0,0,0,${(0.35 + 0.65 * n).toFixed(3)})`);
    }
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = cg;
    ctx.beginPath();
    for (const {r, th} of list) {
      const R = r + th * 0.45 + 4, inner = Math.max(0, r - th * 1.25 - 1);
      ctx.moveTo(x + R, y);
      ctx.ellipse(x, y, R, R * squash, 0, 0, Math.PI * 2);
      if (inner > 0) {
        ctx.moveTo(x + inner, y);
        ctx.ellipse(x, y, inner, inner * squash, 0, Math.PI * 2, 0, true);
      }
    }
    ctx.fill(); // nonzero: outer CW, inner CCW → union of annuli (overlaps stay filled)
    if (distort) {
      for (const {r, th, a} of list) {
        const R = r + 20;
        // chromatic double edge (adds light)
        ctx.globalCompositeOperation = 'lighter';
        ringFill(r, R, [[Math.max(0, r - 14), 'rgba(0,0,0,0)'], [Math.max(0, r - 9), rgba(VC.magenta, 0.55 * a)], [Math.max(0, r - 5), 'rgba(0,0,0,0)'], [r + 6, 'rgba(0,0,0,0)'], [r + 10, rgba(VC.cyan, 0.5 * a)], [r + 16, 'rgba(0,0,0,0)'], [R, 'rgba(0,0,0,0)']]);
        // dark refraction band behind the ring (darkens the scene: needs blend 'normal')
        ctx.globalCompositeOperation = 'destination-over';
        ringFill(r, r + 2, [[Math.max(0, r - th * 0.75), 'rgba(5,2,10,0)'], [Math.max(0, r - th * 0.4), rgba('#05020A', 0.35 * a)], [Math.max(0, r - 14), rgba('#05020A', 0.12 * a)], [r + 2, 'rgba(5,2,10,0)']]);
      }
    }
    const ce = core ? impulse(f, at, 1, 4) * intensity : 0;
    if (ce > 0.01) {
      ctx.globalCompositeOperation = 'lighter';
      radialFill(ctx, x, y, 300, [[0, rgba('#ffffff', clamp01(ce))], [0.1, rgba(hot, 0.75 * clamp01(ce))], [0.28, rgba(col, 0.28 * clamp01(ce))], [0.55, rgba(sec, 0.07 * clamp01(ce))], [1, rgba(sec, 0)]]);
    }
  });
  if (!active) return null;
  const lead = list[0];
  return (
    <>
      {refract && lead && (() => {
        const {r, th, a, t} = lead;
        const R = r + th * 0.6 + 4;
        const m = `radial-gradient(circle closest-side, transparent ${Math.max(0, r - th * 0.9)}px, black ${Math.max(0, r - th * 0.35)}px, black ${Math.max(0, r - 2)}px, transparent ${r + th * 0.15}px)`;
        return (
          <div style={{...full, overflow: 'hidden'}}>
            <div style={{position: 'absolute', left: x - R, top: y - R, width: R * 2, height: R * 2, transform: squash !== 1 ? `scaleY(${squash})` : undefined,
              backdropFilter: `blur(${(5 * (1 - t) + 1.5).toFixed(1)}px) brightness(${(1 + 0.35 * a).toFixed(3)}) saturate(1.3)`, maskImage: m, WebkitMaskImage: m}} />
          </div>
        );
      })()}
      <canvas ref={ref} width={W} height={H} style={{...full, mixBlendMode: blend}} />
    </>
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
  /** Layer compositing (see CanvasBlend). */
  blend?: CanvasBlend;
  seed?: number;
  frame?: number;
};

/** Canvas2D particle explosion: drag-decelerated sparks drawn as motion-blurred streaks with hot heads. */
export const EnergyBurst: React.FC<EnergyBurstProps> = ({
  x, y, at, dur = 55, count = 160, distance = 720, spread = 360, direction = 0, gravity = 0, color, secondary, size = 1, intensity = 1, squash = 1, blend = 'normal', seed = 11, frame,
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
    const fl = impulse(f, at, 1, 5) * intensity;
    if (fl > 0.01) radialFill(ctx, x, y, 300, [[0, rgba('#ffffff', clamp01(fl))], [0.25, rgba(col, 0.5 * clamp01(fl))], [0.6, rgba(sec, 0.12 * clamp01(fl))], [1, rgba(sec, 0)]]);
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
  return <canvas ref={ref} width={W} height={H} style={{...full, mixBlendMode: blend}} />;
};
