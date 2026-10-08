// s06 typography: big Inter Display statements with per-letter mask/blur reveal, tracking-in and gradient fill.
import React from 'react';
import {DISPLAY, FONT} from '../../lib';
import {EZ, clamp01, pr} from './util';

export const GRAD_LILAC = 'linear-gradient(180deg, #FFFFFF 0%, #F4EFFF 38%, #CDBBFF 78%, #A88CF5 100%)';
export const GRAD_PISTACHIO = 'linear-gradient(180deg, #FFFFFF 0%, #F6FBE4 34%, #E7F4B9 70%, #B8D86A 100%)';
export const GRAD_CYAN = 'linear-gradient(180deg, #FFFFFF 0%, #EAFBFF 36%, #A9EEFF 76%, #7FE7FF 100%)';

/** One headline line. Letters rise out of a mask with a short blur and track in; `out` sends them up and away. */
export const Line: React.FC<{
  text: string;
  t: number;
  at: number;
  out?: number;
  size: number;
  grad?: string;
  weight?: number;
  stagger?: number;
  glow?: string;
  /** exit style: 'up' (rise + blur) or 'zoom' (scale toward camera + blur) */
  exit?: 'up' | 'zoom';
  /** keep the line's layout space before it appears */
  reserve?: boolean;
  style?: React.CSSProperties;
}> = ({text, t, at, out, size, grad = GRAD_LILAC, weight = 900, stagger = 1.3, glow = 'rgba(160,130,255,0.55)', exit = 'up', reserve, style}) => {
  if (t < at - 1) return reserve ? <div style={{display: 'inline-block', whiteSpace: 'nowrap', fontFamily: DISPLAY, fontWeight: weight, fontSize: size, lineHeight: 1.08, letterSpacing: '0.045em', padding: '0.06em 0.04em 0.12em', visibility: 'hidden', ...style}}>{text}</div> : null;
  const chars = [...text];
  const track = -0.045 + 0.09 * (1 - pr(t, at, 30, EZ.expoOut));
  const o = out !== undefined ? pr(t, out, 10, EZ.expoIn) : 0;
  if (o >= 1) return null;
  const exitT = exit === 'zoom' ? `scale(${1 + 0.35 * o})` : `translateY(${-0.25 * size * o}px)`;
  return (
    <div
      style={{
        position: 'relative', display: 'inline-block', whiteSpace: 'nowrap', fontFamily: DISPLAY, fontWeight: weight, fontSize: size, lineHeight: 1.08,
        letterSpacing: `${track.toFixed(4)}em`, padding: '0.06em 0.04em 0.12em', overflow: 'hidden',
        filter: `drop-shadow(0 0 ${Math.round(size * 0.18)}px ${glow})${o > 0 ? ` blur(${(o * 10).toFixed(2)}px)` : ''}`,
        opacity: o > 0 ? 1 - o : undefined, transform: o > 0 ? exitT : undefined, transformOrigin: '50% 60%',
        ...style,
      }}
    >
      {chars.map((ch, i) => {
        const p = pr(t, at + i * stagger, 16, EZ.expoOut);
        const b = (1 - p) * 9;
        return (
          <span
            key={i}
            style={{
              display: 'inline-block', whiteSpace: 'pre', backgroundImage: grad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
              transform: p < 1 ? `translateY(${((1 - p) * 0.95).toFixed(3)}em) scaleY(${(1 + 0.25 * (1 - p)).toFixed(3)})` : undefined,
              opacity: p < 1 ? clamp01(p * 1.6) : undefined,
              filter: b > 0.3 ? `blur(${b.toFixed(2)}px)` : undefined,
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

/** Small uppercase HUD kicker with tracked letters and a leading rule. */
export const Kicker: React.FC<{text: string; t: number; at: number; out?: number; color?: string; size?: number; style?: React.CSSProperties}> = ({text, t, at, out, color = '#7FE7FF', size = 17, style}) => {
  if (t < at) return null;
  const p = pr(t, at, 18, EZ.expoOut);
  const o = out !== undefined ? pr(t, out, 8, EZ.expoIn) : 0;
  if (o >= 1) return null;
  const n = Math.round(text.length * clamp01(p * 1.4));
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 14, fontFamily: FONT, fontWeight: 600, fontSize: size, letterSpacing: '0.32em', textTransform: 'uppercase', color, opacity: 1 - o, whiteSpace: 'nowrap', ...style}}>
      <div style={{width: 46 * p, height: 2, background: `linear-gradient(90deg, transparent, ${color})`, boxShadow: `0 0 10px ${color}`}} />
      <span style={{textShadow: `0 0 12px ${color}`}}>{text.slice(0, n)}</span>
    </div>
  );
};

/** Thin luminous rule that draws in from the left. */
export const Rule: React.FC<{t: number; at: number; out?: number; w: number; color?: string}> = ({t, at, out, w, color = '#CDBBFF'}) => {
  const p = pr(t, at, 22, EZ.expoOut);
  const o = out !== undefined ? pr(t, out, 8, EZ.expoIn) : 0;
  if (p <= 0 || o >= 1) return null;
  return <div style={{width: w * p, height: 2, marginTop: 10, opacity: 1 - o, background: `linear-gradient(90deg, ${color}, rgba(127,231,255,0.8) 60%, transparent)`, boxShadow: '0 0 12px rgba(127,231,255,0.6)'}} />;
};
