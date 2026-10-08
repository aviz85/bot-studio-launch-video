// s02 environment pieces: camera-locked horizon glow, the distant light core, the montage warp background and the
// pre-drop collapse layers (inward motes, contracting ring, charging glint). Cheap gradients + one canvas each.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {useCam, ResolvedCam, V3, FRAME_W, FRAME_H} from '../../cine';
import {SpaceBackdrop, SpeedLines, useCanvasDraw, prng} from '../../vfx';
import {clamp} from '../../lib';

/** Project a world point into lens space (no 2D zoom/shift) — for screen-space layers inside a World backdrop. */
export const rawProject = (c: ResolvedCam, p: V3) => {
  const q0 = p[0] - c.pos[0], q1 = p[1] - c.pos[1], q2 = p[2] - c.pos[2];
  const depth = -(q0 * c.b[0] + q1 * c.b[1] + q2 * c.b[2]);
  const xc = q0 * c.r[0] + q1 * c.r[1] + q2 * c.r[2];
  const yc = q0 * c.d[0] + q1 * c.d[1] + q2 * c.d[2];
  const s = depth > 1e-3 ? c.persp / depth : 0;
  return {x: FRAME_W / 2 + xc * s, y: FRAME_H / 2 + yc * s, depth, s};
};

/** Horizon haze band for a floor plane at world y, following camera heading, pitch and roll. Backdrop layer. */
export const Horizon: React.FC<{y: number; intensity?: number; band?: number; color?: string}> = ({y, intensity = 1, band = 260, color = '140,107,234'}) => {
  const c = useCam();
  if (!c) return null;
  const fl = Math.hypot(c.f[0], c.f[2]) || 1;
  const nx = c.f[0] / fl, nz = c.f[2] / fl;
  const D = 200000;
  const a = rawProject(c, [c.pos[0] + nx * D + nz * D * 0.5, y, c.pos[2] + nz * D - nx * D * 0.5]);
  const b = rawProject(c, [c.pos[0] + nx * D - nz * D * 0.5, y, c.pos[2] + nz * D + nx * D * 0.5]);
  if (a.depth <= 0 || b.depth <= 0) return null;
  const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const I = intensity;
  return (
    <div
      style={{
        position: 'absolute', left: mx - 2400, top: my - band, width: 4800, height: band * 2, transform: `rotate(${ang.toFixed(2)}deg)`, transformOrigin: '50% 50%',
        background: `linear-gradient(180deg, transparent 0%, rgba(${color},${(0.10 * I).toFixed(3)}) 30%, rgba(${color},${(0.42 * I).toFixed(3)}) 48.5%, rgba(226,214,255,${(0.75 * I).toFixed(3)}) 50%, rgba(${color},${(0.30 * I).toFixed(3)}) 52%, rgba(40,20,80,${(0.35 * I).toFixed(3)}) 62%, transparent 100%)`,
      }}
    />
  );
};

/** The distant point of light: a soft radial bloom at a world point (backdrop layer, behind objects). */
export const CoreGlow: React.FC<{p: V3; intensity?: number; size?: number}> = ({p, intensity = 1, size = 520}) => {
  const c = useCam();
  if (!c) return null;
  const q = rawProject(c, p);
  if (q.depth <= 0) return null;
  const I = Math.max(0, intensity);
  const s = size * (0.7 + 0.5 * Math.min(2, I));
  return (
    <>
      <div style={{position: 'absolute', left: q.x - s * 2, top: q.y - s * 2, width: s * 4, height: s * 4, borderRadius: '50%', background: `radial-gradient(closest-side, rgba(150,115,255,${(0.34 * Math.min(1.4, I)).toFixed(3)}), rgba(120,80,230,${(0.12 * Math.min(1.4, I)).toFixed(3)}) 45%, transparent 100%)`}} />
      <div style={{position: 'absolute', left: q.x - s / 2, top: q.y - s / 2, width: s, height: s, borderRadius: '50%', background: `radial-gradient(closest-side, rgba(255,255,255,${Math.min(1, 0.9 * I).toFixed(3)}) 0%, rgba(200,245,255,${Math.min(1, 0.55 * I).toFixed(3)}) 12%, rgba(127,231,255,${(0.18 * Math.min(1.5, I)).toFixed(3)}) 34%, transparent 100%)`}} />
    </>
  );
};

/** Deep-space sky for the build: nebula canvas + horizon haze; camera-aware parallax. */
export const BuildSky: React.FC<{from: number; floorY: number; intensity?: number; frame?: number}> = ({from, floorY, intensity = 1, frame}) => {
  const c = useCam();
  const camX = c ? -c.yaw * 14 : 0;
  const camY = c ? c.pitch * 14 : 0;
  return (
    <>
      <SpaceBackdrop from={from} intensity={0.6 * intensity} haze={0} stars={220} camX={camX} camY={camY} frame={frame} />
      <Horizon y={floorY} intensity={0.85 * intensity} />
    </>
  );
};

/** Montage background: deep violet void + warp speed lines growing with `I`. */
export const WarpBG: React.FC<{I: number; travel: number; frame: number; from: number; x?: number; y?: number; tint?: string}> = ({I, travel, frame, from, x = 960, y = 540, tint}) => (
  <>
    <SpaceBackdrop from={from} intensity={0.55} haze={0} stars={160} frame={frame} />
    {tint ? <AbsoluteFill style={{background: tint}} /> : null}
    <SpeedLines intensity={I} travel={travel} x={x} y={y} count={300} glow={0.45} frame={frame} />
  </>
);

/** Motes being sucked into (x, y): radial streaks moving inward, accelerating with `pull` (0..1). One canvas. */
export const InwardMotes: React.FC<{t: number; pull: number; x?: number; y?: number; count?: number; opacity?: number}> = ({t, pull, x = 960, y = 540, count = 70, opacity = 1}) => {
  const ref = useCanvasDraw((ctx, w) => {
    if (opacity < 0.01) return;
    const s = w / FRAME_W;
    ctx.scale(s, s);
    ctx.globalCompositeOperation = 'lighter';
    const rnd = prng(77);
    for (let i = 0; i < count; i++) {
      const th = rnd() * Math.PI * 2;
      const r0 = 260 + rnd() * 900;
      const ph = rnd();
      const sp = 0.004 + rnd() * 0.006;
      // progress toward the centre: loops slowly, accelerating with pull
      const k = ((ph + t * sp * (0.4 + 2.6 * pull)) % 1 + 1) % 1;
      const r = r0 * Math.pow(1 - k, 1.6);
      const tail = Math.min(r, 6 + 140 * pull * (1 - k));
      const a = opacity * (0.25 + 0.6 * rnd()) * Math.sin(Math.PI * Math.min(1, k * 1.15));
      if (a < 0.02 || r < 3) continue;
      const cx = Math.cos(th), cy = Math.sin(th) * 0.86;
      const hx = x + cx * r, hy = y + cy * r;
      const tx = x + cx * (r + tail), ty = y + cy * (r + tail);
      const g = ctx.createLinearGradient(hx, hy, tx, ty);
      const col = i % 3 === 0 ? '127,231,255' : i % 3 === 1 ? '205,187,255' : '255,255,255';
      g.addColorStop(0, `rgba(${col},${a.toFixed(3)})`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.2 + 1.6 * rnd();
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }
  });
  return <canvas ref={ref} width={FRAME_W} height={FRAME_H} style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}} />;
};

/** A ring of light contracting into (x, y): r goes from r0 to 0 as p goes 0 → 1. */
export const ContractRing: React.FC<{p: number; x?: number; y?: number; r0?: number}> = ({p, x = 960, y = 540, r0 = 1250}) => {
  if (p <= 0 || p >= 1) return null;
  const r = r0 * (1 - p) * (1 - p);
  const a = clamp(Math.sin(Math.PI * p) * 1.4);
  return (
    <AbsoluteFill style={{mixBlendMode: 'screen', pointerEvents: 'none', background: `radial-gradient(circle at ${x}px ${y}px, transparent ${Math.max(0, r - 90).toFixed(1)}px, rgba(140,107,234,${(0.35 * a).toFixed(3)}) ${Math.max(0, r - 24).toFixed(1)}px, rgba(220,250,255,${(0.9 * a).toFixed(3)}) ${r.toFixed(1)}px, rgba(127,231,255,${(0.4 * a).toFixed(3)}) ${(r + 6).toFixed(1)}px, transparent ${(r + 30).toFixed(1)}px)`}} />
  );
};
