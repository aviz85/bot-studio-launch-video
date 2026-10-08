// s08 helpers: beat grid, cinematic copy, scrims, the implosion particle field, the "old chatbot" widget, HUD rect projection.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, DISPLAY, FONT, MONO, clamp, prog, expoOut, rand} from '../../lib';
import {project, CamSpec, ResolvedCam, V3} from '../../cine';
import {useCanvasDraw, full} from '../../vfx';

/** Scene start (global) and local frame of beat k. s08 always starts on beat 96. */
export const S0 = B(96);
export const lb = (k: number) => B(k) - S0;

export const smoothstep = (a: number, b: number, v: number) => {
  const x = clamp((v - a) / (b - a));
  return x * x * (3 - 2 * x);
};
export const lin01 = (t: number, a: number, d: number) => clamp((t - a) / Math.max(1e-6, d));

/* ------------------------------------------------------------------ */
/* Copy: Inter Display 900, gradient fill + travelling sheen, per-word mask/blur reveal  */
/* ------------------------------------------------------------------ */
export type CopyLine = {
  text: string;
  /** local frame the first word starts revealing */
  at: number;
  size: number;
  /** gradient: 'lilac' (white→lilac), 'live' (pistachio→green), 'white' */
  tone?: 'lilac' | 'live' | 'white' | 'dim';
  weight?: number;
  /** frames between words */
  stagger?: number;
  /** reveal duration per word */
  dur?: number;
  /** extra element before the text (e.g. a live dot) */
  lead?: React.ReactNode;
};

const GRAD: Record<string, string> = {
  lilac: 'linear-gradient(178deg, #FFFFFF 8%, #F0E9FF 42%, #CDB9FF 78%, #A88BF5 100%)',
  live: 'linear-gradient(178deg, #FBFFE9 6%, #E7F4B9 45%, #9FE3C2 82%, #45E3B0 100%)',
  white: 'linear-gradient(178deg, #FFFFFF 0%, #F4F0FF 60%, #DCD0FF 100%)',
  dim: 'linear-gradient(178deg, #E9E4F4 0%, #C9C1DA 60%, #9C93B2 100%)',
};

export type CopyOut = {at: number; mode: 'blur' | 'fly' | 'suck'; dur?: number; to?: [number, number]};

/** Multi-line kinetic headline. Positioned by its top-left (align left) or top-centre (align center). */
export const Copy: React.FC<{
  t: number; x: number; y: number; lines: CopyLine[]; align?: 'left' | 'center'; out?: CopyOut; tracking?: number; lineGap?: number;
  glow?: number; kicker?: {text: string; at: number; color?: string};
}> = ({t, x, y, lines, align = 'left', out, tracking = -0.045, lineGap = 0.02, glow = 0.55, kicker}) => {
  const first = Math.min(...lines.map((l) => l.at), kicker?.at ?? 1e9);
  if (t < first - 1) return null;
  const outP = out ? lin01(t, out.at, out.dur ?? 16) : 0;
  if (outP >= 1) return null;
  const oe = expoOut(outP);
  // group exit transform
  let groupT = '';
  let groupO = 1;
  let groupBlur = 0;
  if (out && outP > 0) {
    if (out.mode === 'fly') {
      groupT = `scale(${1 + 0.9 * outP * outP}) translateY(${-40 * outP}px)`;
      groupO = 1 - smoothstep(0.15, 1, outP);
      groupBlur = 16 * outP;
    } else if (out.mode === 'suck') {
      const [tx, ty] = out.to ?? [960, 540];
      const e = Math.pow(outP, 2.2);
      groupT = `translate(${(tx - x) * e}px, ${(ty - y) * e}px) scale(${1 - 0.92 * e})`;
      groupO = 1 - smoothstep(0.55, 1, outP);
      groupBlur = 10 * e;
    } else {
      groupO = 1 - oe;
      groupBlur = 14 * oe;
      groupT = `translateY(${-26 * oe}px)`;
    }
  }
  return (
    <div style={{position: 'absolute', left: align === 'left' ? x : x - 1200, top: y, width: align === 'left' ? undefined : 2400, transformOrigin: align === 'left' ? '0% 50%' : '50% 50%', transform: groupT || undefined, opacity: groupO < 1 ? groupO : undefined, filter: groupBlur > 0.3 ? `blur(${groupBlur.toFixed(2)}px)` : undefined}}>
      {kicker && (
        <Kicker t={t} at={kicker.at} text={kicker.text} color={kicker.color} align={align} />
      )}
      <div style={{filter: glow > 0 ? `drop-shadow(0 0 ${28}px rgba(150,115,255,${glow * 0.55})) drop-shadow(0 6px 30px rgba(4,2,10,0.65))` : undefined}}>
        {lines.map((ln, li) => {
          const words = ln.text.split(' ');
          const st = ln.stagger ?? 5;
          const dur = ln.dur ?? 26;
          return (
            <div key={li} style={{display: 'flex', justifyContent: align === 'left' ? 'flex-start' : 'center', alignItems: 'center', gap: `0 ${ln.size * 0.24}px`, fontFamily: DISPLAY, fontWeight: ln.weight ?? 900, fontSize: ln.size, letterSpacing: `${tracking}em`, lineHeight: 1.02, marginTop: li ? ln.size * lineGap : 0, whiteSpace: 'nowrap'}}>
              {ln.lead && t >= ln.at && <span style={{display: 'inline-flex', opacity: prog(t, ln.at, 10), transform: `scale(${0.4 + 0.6 * prog(t, ln.at, 16, expoOut)})`}}>{ln.lead}</span>}
              {words.map((w, i) => {
                const p = prog(t, ln.at + i * st, dur, expoOut);
                if (p <= 0) return <span key={i} style={{display: 'inline-block', visibility: 'hidden'}}>{w}</span>;
                const sh = clamp((t - (ln.at + i * st)) / 34); // sheen travels across each word after reveal
                return (
                  <span key={i} style={{display: 'inline-block', overflow: 'hidden', padding: `0 ${ln.size * 0.04}px ${ln.size * 0.14}px`, margin: `0 ${-ln.size * 0.04}px ${-ln.size * 0.14}px`}}>
                    <span
                      style={{
                        display: 'inline-block',
                        transform: `translateY(${((1 - p) * 92).toFixed(2)}%) skewY(${((1 - p) * 5).toFixed(2)}deg)`,
                        filter: p < 0.98 ? `blur(${((1 - p) * 9).toFixed(2)}px)` : undefined,
                        opacity: Math.min(1, p * 1.6),
                        color: 'transparent',
                        backgroundImage: `linear-gradient(105deg, rgba(255,255,255,0) 38%, rgba(255,255,255,${(0.95 * (1 - sh)).toFixed(3)}) 50%, rgba(255,255,255,0) 62%), ${GRAD[ln.tone ?? 'lilac']}`,
                        backgroundSize: '300% 100%, 100% 100%',
                        backgroundPosition: `${(100 - sh * 100).toFixed(1)}% 0, 0 0`,
                        backgroundRepeat: 'no-repeat',
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                      }}
                    >
                      {w}
                    </span>
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Small uppercase HUD label with a drawing rule. */
export const Kicker: React.FC<{t: number; at: number; text: string; color?: string; align?: 'left' | 'center'}> = ({t, at, text, color = '#BFF4FF', align = 'left'}) => {
  const p = prog(t, at, 22, expoOut);
  if (p <= 0) return null;
  const n = Math.floor(clamp((t - at) / 18) * text.length);
  return (
    <div style={{display: 'flex', alignItems: 'center', justifyContent: align === 'left' ? 'flex-start' : 'center', gap: 16, marginBottom: 18, fontFamily: FONT, fontWeight: 600, fontSize: 18, letterSpacing: '0.32em', textTransform: 'uppercase', color, opacity: p, whiteSpace: 'nowrap', textShadow: `0 0 14px ${color}`}}>
      <div style={{width: 46 * p, height: 2, background: `linear-gradient(90deg, transparent, ${color})`, boxShadow: `0 0 10px ${color}`}} />
      <span>{text.slice(0, n)}<span style={{opacity: 0}}>{text.slice(n)}</span></span>
    </div>
  );
};

/** Pulsing live dot (pistachio core, green bloom). */
export const LiveDot: React.FC<{size: number; pulse: number}> = ({size, pulse}) => (
  <div style={{position: 'relative', width: size, height: size, flex: 'none', marginRight: size * 0.1}}>
    <div style={{position: 'absolute', inset: -size * (0.5 + 0.6 * pulse), borderRadius: '50%', background: `radial-gradient(circle, rgba(69,227,176,${0.35 + 0.4 * pulse}) 0%, rgba(69,227,176,0) 70%)`}} />
    <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #FFFFFF 0%, #E7F4B9 35%, #45E3B0 100%)', boxShadow: `0 0 ${12 + 24 * pulse}px rgba(69,227,176,0.9)`}} />
  </div>
);

/** Soft dark scrim (gradients only) to keep copy legible over a busy frame. */
export const Scrim: React.FC<{x: number; y: number; w: number; h: number; o?: number}> = ({x, y, w, h, o = 0.6}) =>
  o <= 0.01 ? null : <div style={{position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, background: `radial-gradient(50% 50% at 50% 50%, rgba(4,2,12,${o}) 0%, rgba(4,2,12,${o * 0.6}) 45%, rgba(4,2,12,0) 100%)`, pointerEvents: 'none'}} />;

/* ------------------------------------------------------------------ */
/* Implosion: particles spiralling into a point (energy gathering), streaked, additive  */
/* ------------------------------------------------------------------ */
export const Implosion: React.FC<{travel: number; charge: number; x: number; y: number; count?: number; seed?: number; radius?: number}> = ({travel, charge, x, y, count = 700, seed = 3, radius = 1250}) => {
  const ref = useCanvasDraw((ctx) => {
    if (charge < 0.01) return;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    const cols = ['205,187,255', '127,231,255', '255,255,255', '180,150,255', '231,244,185'];
    for (let i = 0; i < count; i++) {
      const r1 = rand(seed * 31 + i * 1.731), r2 = rand(seed * 17 + i * 2.913), r3 = rand(seed * 7 + i * 4.177), r4 = rand(seed + i * 9.31);
      const period = 46 + 70 * r2;
      const ph = ((travel + r1 * period) / period) % 1;
      const r0 = radius * (0.35 + 0.75 * r3);
      const fall = (u: number) => 1 - Math.pow(u, 1.35);
      const ang = (u: number) => r4 * Math.PI * 2 + 0.55 * Math.pow(u, 3) * (r1 > 0.5 ? 1 : -1);
      const u0 = ph, u1 = Math.max(0, ph - 0.06 - 0.09 * charge);
      const rA = r0 * fall(u0), rB = r0 * fall(u1);
      const ax = x + Math.cos(ang(u0)) * rA, ay = y + Math.sin(ang(u0)) * rA * 0.82;
      const bx = x + Math.cos(ang(u1)) * rB, by = y + Math.sin(ang(u1)) * rB * 0.82;
      const fadeIn = clamp(ph / 0.15), fadeOut = clamp((1 - ph) / 0.08);
      const a = charge * fadeIn * fadeOut * (0.25 + 0.75 * r2) * (0.5 + 0.8 * ph);
      if (a < 0.01) continue;
      const c = cols[i % cols.length];
      const g = ctx.createLinearGradient(bx, by, ax, ay);
      g.addColorStop(0, `rgba(${c},0)`);
      g.addColorStop(1, `rgba(${c},${Math.min(1, a).toFixed(3)})`);
      ctx.strokeStyle = g;
      ctx.lineWidth = 0.8 + 2.2 * r3 * (0.4 + ph);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(ax, ay);
      ctx.stroke();
    }
    // hot core
    const R = 60 + 260 * charge;
    const cg = ctx.createRadialGradient(x, y, 0, x, y, R);
    cg.addColorStop(0, `rgba(255,255,255,${(0.9 * charge).toFixed(3)})`);
    cg.addColorStop(0.18, `rgba(215,200,255,${(0.55 * charge).toFixed(3)})`);
    cg.addColorStop(0.5, `rgba(140,107,234,${(0.2 * charge).toFixed(3)})`);
    cg.addColorStop(1, 'rgba(140,107,234,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(x - R, y - R, R * 2, R * 2);
  });
  return <canvas ref={ref} width={1920} height={1080} style={full} />;
};

/* ------------------------------------------------------------------ */
/* The old chatbot widget: dull, flat, grey. Powers off like a CRT.     */
/* ------------------------------------------------------------------ */
export const OldChat: React.FC<{t: number; off: number}> = ({t, off}) => {
  const W = 620, H = 380;
  const p = clamp((t - off) / 16);
  if (p >= 1) {
    const dot = 1 - clamp((t - off - 16) / 20);
    if (dot <= 0) return <div style={{width: W, height: H}} />;
    return (
      <div style={{width: W, height: H, position: 'relative'}}>
        <div style={{position: 'absolute', left: W / 2 - 40, top: H / 2 - 40, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle, rgba(230,225,255,${0.9 * dot}) 0%, rgba(160,150,200,${0.3 * dot}) 18%, transparent 60%)`}} />
      </div>
    );
  }
  const sy = p < 0.55 ? 1 - 0.988 * Math.pow(p / 0.55, 2.4) : 0.012;
  const sx = p < 0.55 ? 1 : 1 - Math.pow((p - 0.55) / 0.45, 1.6);
  const bright = 1 + 3.5 * smoothstep(0.2, 0.6, p);
  const flick = t > off - 22 && t < off ? (rand(Math.floor(t / 2) * 3.1) > 0.55 ? 0.72 : 1) : 1; // pre-death flicker
  const dots = [0, 1, 2].map((i) => 0.3 + 0.5 * Math.abs(Math.sin(t / 9 - i * 0.8)));
  return (
    <div style={{width: W, height: H, transform: `scale(${sx}, ${sy})`, filter: bright > 1.01 || flick < 1 ? `brightness(${(bright * flick).toFixed(3)})` : undefined}}>
      <div style={{width: W, height: H, borderRadius: 18, background: '#26242B', border: '1.5px solid #3A3842', boxSizing: 'border-box', fontFamily: FONT, color: '#8E8A98', position: 'relative', overflow: 'hidden', boxShadow: '0 30px 80px -20px rgba(0,0,0,0.8)'}}>
        <div style={{height: 64, borderBottom: '1.5px solid #34323B', display: 'flex', alignItems: 'center', gap: 14, padding: '0 24px', background: '#2C2A31'}}>
          <div style={{width: 30, height: 30, borderRadius: 15, background: '#4A4752'}} />
          <div style={{fontSize: 21, fontWeight: 600, color: '#9C98A6'}}>Chat assistant</div>
          <div style={{flex: 1}} />
          <div style={{fontSize: 26, color: '#5C5965', letterSpacing: 2}}>×</div>
        </div>
        <div style={{padding: '28px 24px'}}>
          <div style={{display: 'inline-block', background: '#36343C', borderRadius: 14, padding: '16px 20px', fontSize: 22, color: '#ACA8B6'}}>How can I help you today?</div>
          <div style={{display: 'flex', gap: 8, marginTop: 22, marginLeft: 6}}>
            {dots.map((o, i) => <div key={i} style={{width: 11, height: 11, borderRadius: 6, background: '#6E6A78', opacity: o}} />)}
          </div>
        </div>
        <div style={{position: 'absolute', left: 20, right: 20, bottom: 20, height: 60, borderRadius: 12, background: '#2F2D34', border: '1.5px solid #3C3A43', display: 'flex', alignItems: 'center', padding: '0 18px', fontSize: 19, color: '#5E5B67'}}>
          Type a message…
          <div style={{flex: 1}} />
          <div style={{width: 40, height: 40, borderRadius: 10, background: '#45424D'}} />
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* HUD helpers                                                           */
/* ------------------------------------------------------------------ */
/** Screen-space bounding rect of a world-space rectangle (centre c, size w×h, in the XY plane at c.z). */
export const projRect = (cam: CamSpec | ResolvedCam, c: V3, w: number, h: number) => {
  const pts: V3[] = [[c[0] - w / 2, c[1] - h / 2, c[2]], [c[0] + w / 2, c[1] - h / 2, c[2]], [c[0] - w / 2, c[1] + h / 2, c[2]], [c[0] + w / 2, c[1] + h / 2, c[2]]];
  const ps = pts.map((p) => project(cam, p));
  if (ps.some((p) => !p.visible)) return null;
  const xs = ps.map((p) => p.x), ys = ps.map((p) => p.y);
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  return {x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0};
};

/** Exposure overlay (white-out / dip). */
export const Exposure: React.FC<{o: number; color?: string}> = ({o, color = '#FFFFFF'}) =>
  o <= 0.003 ? null : <AbsoluteFill style={{background: color, opacity: Math.min(1, o), pointerEvents: 'none'}} />;

export const monoLabel: React.CSSProperties = {fontFamily: MONO, fontSize: 15, letterSpacing: '0.08em', whiteSpace: 'nowrap'};

/** Local lock-on reticle with thicker, contrasted brackets (the shared Reticle's 2px cyan lines vanish on light frost glass). */
export const Lock: React.FC<{t: number; start: number; dur?: number; x: number; y: number; w: number; h: number; label: string; value?: string; color?: string; side?: 'left' | 'right'}> = ({t, start, dur = 12, x, y, w, h, label, value, color = '#7FE7FF', side = 'right'}) => {
  if (t < start) return null;
  const p = expoOut(clamp((t - start) / dur));
  const locked = t >= start + dur;
  const since = t - start - dur;
  const spread = (1 - p) * 120;
  const rot = (1 - p) * 35;
  const cx = x + w / 2, cy = y + h / 2;
  const Lb = Math.min(48, Math.min(w, h) * 0.38);
  const pad = 14;
  const blink = locked && since < 9 ? (Math.floor(since / 2) % 2 ? 0.45 : 1) : 1;
  const sh = `0 0 12px ${color}, 0 0 1px rgba(10,5,30,0.9), 0 0 0 1px rgba(10,5,30,0.35)`;
  const corner = (sx: number, sy: number) => {
    const bx = cx + sx * (w / 2 + pad + spread), by = cy + sy * (h / 2 + pad + spread);
    return (
      <div key={`${sx}${sy}`} style={{position: 'absolute', left: bx, top: by, width: 0, height: 0}}>
        <div style={{position: 'absolute', left: sx > 0 ? -Lb : 0, top: sy > 0 ? -4 : 0, width: Lb, height: 4, borderRadius: 2, background: color, boxShadow: sh}} />
        <div style={{position: 'absolute', left: sx > 0 ? -4 : 0, top: sy > 0 ? -Lb : 0, width: 4, height: Lb, borderRadius: 2, background: color, boxShadow: sh}} />
      </div>
    );
  };
  const tagX = side === 'right' ? x + w + pad + 26 : x - pad - 26;
  const flash = locked ? Math.exp(-since / 6) : 0;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, pointerEvents: 'none', opacity: clamp((t - start) / 4) * blink}}>
      {flash > 0.02 && <div style={{position: 'absolute', left: x - pad, top: y - pad, width: w + 2 * pad, height: h + 2 * pad, borderRadius: 18, background: `radial-gradient(closest-side, rgba(255,255,255,${0.35 * flash}), rgba(127,231,255,${0.18 * flash}) 70%, transparent)`, mixBlendMode: 'screen'}} />}
      <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transform: `rotate(${rot}deg)`, transformOrigin: `${cx}px ${cy}px`}}>
        {corner(-1, -1)}{corner(1, -1)}{corner(-1, 1)}{corner(1, 1)}
      </div>
      {!locked && <div style={{position: 'absolute', left: x, top: y + h * p, width: w, height: 3, background: `linear-gradient(90deg, transparent, ${color}, transparent)`, boxShadow: `0 0 14px ${color}`}} />}
      {locked && (
        <div style={{position: 'absolute', left: side === 'right' ? tagX : undefined, right: side === 'left' ? 1920 - tagX : undefined, top: y - pad, display: 'flex', flexDirection: 'column', alignItems: side === 'right' ? 'flex-start' : 'flex-end', gap: 6}}>
          <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 15, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#06121A', background: color, padding: '6px 11px', borderRadius: 4, boxShadow: `0 0 18px ${color}`, whiteSpace: 'nowrap'}}>◆ {label}</div>
          {value && <div style={{fontFamily: MONO, fontSize: 17, color: '#F2FFE0', background: 'rgba(6,4,16,0.78)', padding: '5px 10px', borderRadius: 4, letterSpacing: '0.06em', whiteSpace: 'nowrap', opacity: clamp(since / 6)}}>{value}</div>}
        </div>
      )}
    </div>
  );
};
