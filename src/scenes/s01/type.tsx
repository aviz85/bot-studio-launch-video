// s01 typography: mask/blur reveal lines with a light sweep, and a glitch-typed headline.
import React from 'react';
import {DISPLAY, clamp} from '../../lib';
import {easeInCubic, easeOutCubic, easeOutExpo, h01, lerp} from './set';

export const GRAD_MAIN = 'linear-gradient(100deg, #FFFFFF 0%, #F1ECFF 38%, #CDBBFF 78%, #B49BF2 100%)';
export const GRAD_SOFT = 'linear-gradient(100deg, #D9D3E8 0%, #BDB3D6 60%, #9F94BF 100%)';

export type RevealProps = {
  text: string;
  /** frame the reveal starts (scene-local) */
  at: number;
  /** frame the exit starts (optional) */
  out?: number;
  t: number;
  x: number;
  /** top of the line box */
  y: number;
  size: number;
  weight?: number;
  grad?: string;
  /** reveal duration */
  dur?: number;
  /** exit duration */
  outDur?: number;
  /** light sweep across the glyphs after the reveal */
  sweep?: boolean;
  align?: 'left' | 'center';
  tracking?: number;
};

/** A headline line that rises out of a mask edge (expo), de-blurs, and settles its tracking; optional light sweep;
 *  exits by tracking out + blurring up. Text sits inside a clipped box sized for descenders. */
export const RevealLine: React.FC<RevealProps> = ({text, at, out, t, x, y, size, weight = 900, grad = GRAD_MAIN, dur = 18, outDur = 14, sweep = true, align = 'left', tracking = -0.045}) => {
  if (t < at - 1) return null;
  const p = easeOutExpo(clamp((t - at) / dur));
  const q = out !== undefined ? easeInCubic(clamp((t - out) / outDur)) : 0;
  if (q >= 1) return null;
  const boxH = size * 1.32;
  const rise = (1 - p) * boxH * 0.92 - q * size * 0.25;
  const blur = (1 - p) * 10 + q * 16;
  const track = tracking + (1 - p) * 0.06 + q * 0.12;
  const o = clamp((t - at) / 5) * (1 - q);
  const sw = sweep ? clamp((t - at - dur * 0.55) / 40) : 1;
  const swPos = lerp(130, -40, easeOutCubic(sw)); // background-position % for the sweep band
  const bg = sweep && sw < 1
    ? `linear-gradient(105deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0) 60%), ${grad}`
    : grad;
  return (
    <div style={{position: 'absolute', left: align === 'center' ? 0 : x, right: align === 'center' ? 0 : undefined, top: y, height: boxH, overflow: 'hidden', textAlign: align, paddingRight: 40}}>
      <div style={{
        display: 'inline-block', fontFamily: DISPLAY, fontWeight: weight, fontSize: size, lineHeight: `${boxH}px`, letterSpacing: `${track.toFixed(4)}em`, whiteSpace: 'nowrap',
        backgroundImage: bg, backgroundSize: sweep && sw < 1 ? '300% 100%, 100% 100%' : '100% 100%', backgroundPosition: sweep && sw < 1 ? `${swPos.toFixed(1)}% 0, 0 0` : '0 0',
        WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        transform: `translateY(${rise.toFixed(2)}px)`, filter: blur > 0.3 ? `blur(${blur.toFixed(2)}px)` : undefined, opacity: o < 1 ? o : undefined, paddingRight: '0.08em',
      }}>{text}</div>
    </div>
  );
};

const POOL = 'ABCDEFGHJKLMNOPQRSTUVWXYZ#%&@?/<>01█▓▒';

/** Glitch-typed headline: characters resolve in a scrambled order through random glyphs; afterwards it holds with
 *  intermittent RGB tears and slice offsets driven by `g` (0..1). Centered lines. */
export const GlitchType: React.FC<{lines: string[]; at: number; t: number; y: number; size: number; lineGap?: number; g: number; typeDur?: number; seed?: number; o?: number}> = ({lines, at, t, y, size, lineGap = 1.05, g, typeDur = 18, seed = 1, o = 1}) => {
  if (t < at || o <= 0.003) return null;
  const step = Math.floor(t / 2);
  const all = lines.join('\n');
  const n = all.length;
  // reveal order: per-char random threshold
  const shown = (i: number) => {
    const th = 0.15 + 0.85 * h01(i * 3 + seed, 11);
    return (t - at) / typeDur >= th;
  };
  const charAt = (c: string, i: number) => {
    if (c === ' ' || c === '\n') return c;
    if (shown(i)) {
      // occasional late flicker on resolved chars
      if (g > 0.35 && h01(step * 5 + i, seed + 2) < (g - 0.35) * 0.08) return POOL[Math.floor(h01(i, step) * POOL.length)];
      return c;
    }
    const near = (t - at) / typeDur >= (0.15 + 0.85 * h01(i * 3 + seed, 11)) - 0.35;
    return near ? POOL[Math.floor(h01(i * 7, step + seed) * POOL.length)] : ' ';
  };
  let k = 0;
  const rendered = all.split('\n').map((ln) => {
    const s = ln.split('').map((c) => charAt(c, k++)).join('');
    k++; // newline
    return s;
  });
  const typing = clamp((t - at) / typeDur);
  // tear strength: high while typing, then intermittent bursts
  const burst = h01(step, seed + 7) < 0.22 + 0.5 * g ? 1 : 0.15;
  const tear = Math.min(1, (1 - typing) * 0.9 + g * burst);
  const jx = (h01(step, seed + 3) - 0.5) * 26 * tear;
  const split = 4 + 14 * tear;
  const lh = size * lineGap;
  const block = (color: string, dx: number, dy: number, extra?: React.CSSProperties) => (
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, textAlign: 'center', transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`, ...extra}}>
      {rendered.map((ln, i) => (
        <div key={i} style={{fontFamily: DISPLAY, fontWeight: 900, fontSize: size, lineHeight: `${lh}px`, letterSpacing: '-0.045em', whiteSpace: 'pre', color}}>{ln}</div>
      ))}
    </div>
  );
  // two slice bands that offset horizontally
  const bands = [0, 1].map((b) => {
    const by = h01(step * 3 + b, seed + 5) * lh * rendered.length;
    const bh = 8 + h01(step * 7 + b, seed + 6) * 40;
    const bx = (h01(step * 11 + b, seed + 8) - 0.5) * 120 * tear;
    return {by, bh, bx};
  });
  const H = lh * rendered.length + 20;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: y, height: H, opacity: o < 1 ? o : undefined}}>
      {block('rgba(127,231,255,0.75)', jx - split, 0)}
      {block('rgba(255,79,163,0.75)', jx + split, 0)}
      {block('#FFFFFF', jx, 0)}
      {tear > 0.2 && bands.map((b, i) => (
        <div key={i} style={{position: 'absolute', left: 0, right: 0, top: 0, height: H, clipPath: `inset(${b.by.toFixed(1)}px 0 ${Math.max(0, H - b.by - b.bh).toFixed(1)}px 0)`}}>
          <div style={{position: 'absolute', inset: 0, background: 'transparent'}} />
          {block(i ? '#BFF4FF' : '#FFD1EA', jx + b.bx, 0)}
        </div>
      ))}
    </div>
  );
};
