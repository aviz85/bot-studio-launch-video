// s07 shared helpers: environment, copy typography, light pulses along polylines, small math.
import React from 'react';
import {AbsoluteFill, interpolate, Easing} from 'remotion';
import {DISPLAY, FONT, MONO, B} from '../../lib';
import {FloorGrid, useCam, project, V3} from '../../cine';

export const FROM = B(80);
/** scene-local frame of beat k */
export const L = (k: number) => B(k) - FROM;

export const cl = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const ss = (a: number, b: number, v: number) => {
  const x = cl((v - a) / (b - a));
  return x * x * (3 - 2 * x);
};
export const eOutExpo = (u: number) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u));
export const eInExpo = (u: number) => (u <= 0 ? 0 : Math.pow(2, 10 * (u - 1)));
export const eOutBack = (u: number, s = 1.70158) => 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2);
export const eInOutCubic = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
/** 0→1 progress of t in [a, a+d] */
export const pr = (t: number, a: number, d: number) => cl((t - a) / d);
/** keyframe helper */
export const kf = (t: number, pts: [number, number][], ease: (u: number) => number = Easing.bezier(0.45, 0, 0.2, 1)) =>
  interpolate(t, pts.map((p) => p[0]), pts.map((p) => p[1]), {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
/** decaying pulse after `at` (attack 1–2 frames) */
export const hit = (t: number, at: number, tau = 8, attack = 1.5) => {
  const d = t - at;
  if (d < 0) return 0;
  if (d < attack) return d / attack;
  return Math.exp(-(d - attack) / tau);
};
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

/* ------------------------------------------------------------------ */
/* Environment (inside <World backdrop>)                                 */
/* ------------------------------------------------------------------ */
/** Deep violet space gradient + nebula pools; parallax from the camera yaw/pitch (cheap gradients only). */
export const Sky: React.FC<{hue?: 'violet' | 'cyan'; glow?: number}> = ({hue = 'violet', glow = 1}) => {
  const cam = useCam();
  const px = cam ? -cam.yaw * 9 : 0;
  const py = cam ? cam.pitch * 9 : 0;
  const a = hue === 'violet' ? '140,107,234' : '127,231,255';
  return (
    // oversized so lens shift/zoom (inside the World) never exposes an edge
    <div style={{position: 'absolute', left: -700, top: -500, width: 1920 + 1400, height: 1080 + 1000, background: '#04020A'}}>
      <div style={{position: 'absolute', left: 700, top: 500, width: 1920, height: 1080, overflow: 'visible'}}>
        <div style={{position: 'absolute', left: -700, top: -500, right: -700, bottom: -500, background: 'radial-gradient(58% 62% at 50% 45%, #1A0B36 0%, #0D0620 46%, #04020A 88%)'}} />
        <AbsoluteFill style={{background: `radial-gradient(40% 46% at ${30 + px * 0.012}% ${32 + py * 0.01}%, rgba(${a},${0.30 * glow}), transparent 70%), radial-gradient(34% 40% at ${80 + px * 0.008}% ${64 + py * 0.008}%, rgba(127,231,255,${0.09 * glow}), transparent 72%), radial-gradient(26% 28% at ${60 + px * 0.01}% ${14 + py * 0.01}%, rgba(231,244,185,${0.045 * glow}), transparent 72%)`, overflow: 'visible'}} />
      </div>
    </div>
  );
};

/** Star field projected through the camera (true parallax for a few hundred far points, batched in one SVG). */
const STARS: V3[] = Array.from({length: 150}, (_, i) => {
  const r1 = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  const r2 = Math.sin(i * 39.3468 + 11.135) * 24634.6345;
  const r3 = Math.sin(i * 73.156 + 52.235) * 12345.6789;
  const u = r1 - Math.floor(r1), v = r2 - Math.floor(r2), w = r3 - Math.floor(r3);
  const th = u * Math.PI * 2, ph = (v - 0.5) * Math.PI * 0.9;
  const R = 9000 + w * 6000;
  return [Math.cos(ph) * Math.sin(th) * R, Math.sin(ph) * R * 0.6 - 1200, Math.cos(ph) * Math.cos(th) * R];
});
export const Stars: React.FC<{o?: number; t: number}> = ({o = 1, t}) => {
  const cam = useCam();
  if (!cam) return null;
  const dots: React.ReactNode[] = [];
  STARS.forEach((p, i) => {
    const q = project(cam, [p[0] + cam.pos[0], p[1] + cam.pos[1], p[2] + cam.pos[2]]);
    if (!q.visible || q.x < -10 || q.x > 1930 || q.y < -10 || q.y > 1090) return;
    const tw = 0.45 + 0.55 * Math.abs(Math.sin(t / (20 + (i % 7) * 6) + i));
    const s = i % 11 === 0 ? 3 : i % 3 === 0 ? 2 : 1.4;
    dots.push(<circle key={i} cx={q.x.toFixed(1)} cy={q.y.toFixed(1)} r={s} fill={i % 13 === 0 ? '#BFF4FF' : '#E2D6FF'} opacity={(o * tw * (i % 3 === 0 ? 0.9 : 0.5)).toFixed(2)} />);
  });
  return <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>{dots}</svg>;
};

export const Env: React.FC<{t: number; floor?: number; grid?: number; hue?: 'violet' | 'cyan'; glow?: number; gridColor?: string}> = ({t, floor = 620, grid = 0.32, hue, glow, gridColor = 'rgb(180,155,242)'}) => (
  <>
    <Sky hue={hue} glow={glow} />
    <Stars t={t} />
    {grid > 0 && <FloorGrid y={floor} step={150} extent={3600} center={[0, -400]} opacity={grid} color={gridColor} fade={[700, 3400]} />}
  </>
);

/* ------------------------------------------------------------------ */
/* Copy typography                                                      */
/* ------------------------------------------------------------------ */
const GRAD = 'linear-gradient(100deg, #FFFFFF 0%, #EFE8FF 30%, #C9B6FF 62%, #E7F4B9 100%)';

/** Big statement, word-by-word mask/blur reveal, tight tracking, gradient fill.
 *  t = frames since the copy start; out = frames at which it starts leaving (relative). */
export const Copy: React.FC<{
  lines: string[]; t: number; x: number; y: number; size?: number; out?: number; align?: 'left' | 'right'; stagger?: number; kicker?: string; kickerColor?: string;
}> = ({lines, t, x, y, size = 104, out = 1e9, align = 'left', stagger = 4, kicker, kickerColor = '#7FE7FF'}) => {
  if (t < -2) return null;
  const words = lines.map((l) => l.split(' '));
  let wi = 0;
  const outP = cl((t - out) / 10);
  const outE = outP * outP;
  if (outP >= 1) return null;
  return (
    <div style={{position: 'absolute', left: align === 'left' ? x : undefined, right: align === 'right' ? 1920 - x : undefined, top: y, textAlign: align, pointerEvents: 'none', opacity: 1 - outE, transform: `translateY(${-outE * 30}px)`, filter: outE > 0.02 ? `blur(${(outE * 10).toFixed(1)}px)` : undefined}}>
      {kicker && (
        <div style={{fontFamily: FONT, fontWeight: 600, fontSize: 20, letterSpacing: '0.32em', textTransform: 'uppercase', color: kickerColor, marginBottom: 18, opacity: cl(t / 8), transform: `translateX(${(1 - eOutExpo(cl(t / 14))) * -24}px)`, textShadow: `0 0 16px ${kickerColor}`}}>
          {kicker}
        </div>
      )}
      {words.map((ws, li) => (
        <div key={li} style={{display: 'flex', gap: size * 0.24, justifyContent: align === 'left' ? 'flex-start' : 'flex-end', lineHeight: 1.02, height: size * 1.06}}>
          {ws.map((w) => {
            const k = wi++;
            const p = cl((t - k * stagger) / 14);
            const e = eOutExpo(p);
            return (
              <div key={k} style={{position: 'relative', overflow: 'hidden', paddingBottom: size * 0.1, marginBottom: -size * 0.1}}>
                <div
                  style={{
                    fontFamily: DISPLAY, fontWeight: 850, fontSize: size, letterSpacing: '-0.045em', whiteSpace: 'nowrap',
                    backgroundImage: GRAD, backgroundSize: '200% 100%', backgroundPosition: `${40 - 40 * e}% 0`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
                    transform: `translateY(${(1 - e) * size * 0.95}px)`, opacity: cl(p * 2.2),
                    filter: p < 0.7 ? `blur(${((1 - p / 0.7) * 6).toFixed(1)}px)` : undefined,
                  }}
                >
                  {w}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** Soft dark gradient behind copy for contrast (no blur filter). */
export const CopyShade: React.FC<{o?: number; side?: 'left' | 'top'}> = ({o = 1, side = 'left'}) => (
  <AbsoluteFill style={{background: side === 'left' ? `linear-gradient(90deg, rgba(4,2,10,${0.62 * o}) 0%, rgba(4,2,10,${0.35 * o}) 32%, transparent 55%)` : `linear-gradient(180deg, rgba(4,2,10,${0.6 * o}) 0%, rgba(4,2,10,${0.3 * o}) 26%, transparent 45%)`, pointerEvents: 'none'}} />
);

/* ------------------------------------------------------------------ */
/* Polylines + light pulses (SVG, used flat inside a 3D Obj)            */
/* ------------------------------------------------------------------ */
export type Pt = [number, number];
export const polyLen = (pts: Pt[]) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
export const polyAt = (pts: Pt[], u: number): Pt => {
  const total = polyLen(pts);
  let d = cl(u) * total;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d <= l || i === pts.length - 1) {
      const k = l > 0 ? cl(d / l) : 0;
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    }
    d -= l;
  }
  return pts[pts.length - 1];
};
export const polyD = (pts: Pt[], ox = 0, oy = 0) => pts.map((p, i) => `${i ? 'L' : 'M'}${(p[0] - ox).toFixed(1)} ${(p[1] - oy).toFixed(1)}`).join(' ');

/** A circuit trace: dim base line + lit portion (draw 0..1) + travelling pulses (array of 0..1 positions). Coordinates relative to (ox, oy). */
export const Trace: React.FC<{pts: Pt[]; ox: number; oy: number; draw?: number; lit?: number; pulses?: number[]; color?: string; base?: number; width?: number; id?: string}> = ({pts, ox, oy, draw = 1, lit = 0, pulses = [], color = '127,231,255', base = 0.22, width = 3}) => {
  const d = polyD(pts, ox, oy);
  const len = polyLen(pts);
  const dl = len * cl(draw);
  return (
    <>
      <path d={d} stroke={`rgba(${color},${base})`} strokeWidth={width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {lit > 0.01 && dl > 0.5 && (
        <>
          <path d={d} stroke={`rgba(${color},${0.22 * lit})`} strokeWidth={width * 5} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${dl} ${len + 10}`} />
          <path d={d} stroke={`rgba(${color},${0.85 * lit})`} strokeWidth={width * 1.2} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${dl} ${len + 10}`} />
          <path d={d} stroke={`rgba(255,255,255,${0.75 * lit})`} strokeWidth={width * 0.45} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${dl} ${len + 10}`} />
        </>
      )}
      {pulses.map((u, i) => {
        if (u <= 0 || u >= 1) return null;
        const segL = Math.min(140, len * 0.3);
        const off = -(u * (len + segL) - segL);
        const [hx, hy] = polyAt(pts, u * (len + segL) / len > 1 ? 1 : (u * (len + segL)) / len);
        const fadeEnd = u * (len + segL) > len ? 1 - ((u * (len + segL)) - len) / segL : 1;
        return (
          <g key={i} opacity={cl(fadeEnd)}>
            <path d={d} stroke={`rgba(${color},0.55)`} strokeWidth={width * 6} fill="none" strokeLinecap="round" strokeDasharray={`${segL} ${len + segL * 2}`} strokeDashoffset={off} />
            <path d={d} stroke="rgba(255,255,255,0.95)" strokeWidth={width * 1.4} fill="none" strokeLinecap="round" strokeDasharray={`${segL} ${len + segL * 2}`} strokeDashoffset={off} />
            <circle cx={hx - ox} cy={hy - oy} r={width * 9} fill={`url(#s07glow)`} />
          </g>
        );
      })}
    </>
  );
};
export const GlowDefs: React.FC<{color?: string}> = ({color = '127,231,255'}) => (
  <defs>
    <radialGradient id="s07glow">
      <stop offset="0%" stopColor="rgba(255,255,255,1)" />
      <stop offset="22%" stopColor={`rgba(${color},0.9)`} />
      <stop offset="60%" stopColor={`rgba(${color},0.25)`} />
      <stop offset="100%" stopColor={`rgba(${color},0)`} />
    </radialGradient>
  </defs>
);

/** Small mono HUD label */
export const Hud: React.FC<{children: React.ReactNode; color?: string; size?: number; style?: React.CSSProperties}> = ({children, color = '#7FE7FF', size = 15, style}) => (
  <div style={{fontFamily: MONO, fontSize: size, letterSpacing: '0.18em', textTransform: 'uppercase', color, whiteSpace: 'nowrap', textShadow: `0 0 10px ${color}`, ...style}}>{children}</div>
);
