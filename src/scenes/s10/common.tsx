// s10 shared helpers: beat → local frames, easing envelopes, typography.
import React from 'react';
import {B, DISPLAY, FONT} from '../../lib';
import {EASES, clamp01, mix, smoothstep} from '../../cine';

/** Scene start (beat 140) and the final hit frame (beat 160 kick, detected at 4298). */
export const FROM = B(140);
export const HIT_G = 4298;
/** local frame of beat k */
export const lb = (k: number) => B(k) - FROM;
export const HIT = HIT_G - FROM; // 537

export {clamp01, mix, smoothstep};
export const eo = EASES.expoOut;
export const ei = EASES.expoIn;
export const eio = EASES.expoInOut;
export const qo = EASES.quintOut;
export const qio = EASES.quintInOut;
export const co = EASES.cubicOut;
export const cio = EASES.cubicInOut;
export const bo = EASES.backOut;

/** eased 0→1 over [start, start+dur] */
export const pe = (t: number, start: number, dur: number, e: (u: number) => number = eo) => e(clamp01((t - start) / Math.max(1e-6, dur)));
/** 1 on frame `at`, exponential decay after (0 before) */
export const decay = (t: number, at: number, tau = 6) => (t < at ? 0 : Math.exp(-(t - at) / tau));
/** piecewise-linear keyframes with optional easing per segment */
export const kf = (t: number, keys: [number, number][], e: (u: number) => number = EASES.smooth) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [a, va] = keys[i - 1];
      const [b, vb] = keys[i];
      return mix(va, vb, e(clamp01((t - a) / Math.max(1e-6, b - a))));
    }
  }
  return keys[keys.length - 1][1];
};

/* ------------------------------------------------------------------ */
/* Typography                                                           */
/* ------------------------------------------------------------------ */
export const CHROME = 'linear-gradient(176deg, #FFFFFF 0%, #FFFFFF 30%, #E6DCFF 52%, #B9A2FF 74%, #E7F4B9 100%)';
export const CHROME_H = 'linear-gradient(100deg, #FFFFFF 0%, #F1EBFF 35%, #C8B4FF 70%, #E7F4B9 100%)';

export const gradText = (bg = CHROME): React.CSSProperties => ({
  backgroundImage: bg,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  WebkitTextFillColor: 'transparent',
});

/** A line of display type revealed through a mask (slides up + de-blurs). p: 0..1 reveal, out: 0..1 exit. */
export const MaskLine: React.FC<{
  text: string;
  p: number;
  out?: number;
  size: number;
  weight?: number;
  tracking?: number;
  bg?: string;
  style?: React.CSSProperties;
  glow?: number;
}> = ({text, p, out = 0, size, weight = 850, tracking = -0.045, bg = CHROME, style, glow = 0.35}) => {
  if (p <= 0 || out >= 1) return null;
  const y = (1 - p) * 105 - out * 0; // % of line height
  const blur = (1 - p) * 10 + out * 14;
  const o = smoothstep(0, 0.35, p) * (1 - smoothstep(0.1, 1, out));
  const base: React.CSSProperties = {
    fontFamily: DISPLAY,
    fontWeight: weight,
    fontSize: size,
    lineHeight: 1.0,
    letterSpacing: `${tracking + out * 0.06}em`,
    whiteSpace: 'nowrap',
  };
  return (
    <div style={{overflow: 'hidden', padding: `${size * 0.1}px ${size * 0.2}px ${size * 0.16}px`, margin: `${-size * 0.1}px ${-size * 0.2}px ${-size * 0.16}px`, ...style}}>
      <div
        style={{
          position: 'relative',
          transform: `translateY(${y.toFixed(2)}%) scale(${(1 + out * 0.04).toFixed(4)})`,
          transformOrigin: '0% 100%',
          opacity: o,
          filter: blur > 0.4 ? `blur(${blur.toFixed(2)}px)` : undefined,
        }}
      >
        {glow > 0 && (
          <div aria-hidden style={{...base, position: 'absolute', left: 0, top: 0, color: `rgba(150,115,255,${0.18 * glow})`, textShadow: `0 0 ${Math.round(34 * glow)}px rgba(150,115,255,${0.9 * glow}), 0 0 ${Math.round(90 * glow)}px rgba(127,231,255,${0.35 * glow})`}}>{text}</div>
        )}
        <div style={{...base, position: 'relative', ...gradText(bg)}}>{text}</div>
      </div>
    </div>
  );
};

/** Small HUD label (uppercase, tracked). */
export const HudLabel: React.FC<{children: React.ReactNode; color?: string; size?: number; style?: React.CSSProperties}> = ({children, color = '#BFF4FF', size = 15, style}) => (
  <div style={{fontFamily: FONT, fontWeight: 600, fontSize: size, letterSpacing: '0.32em', textTransform: 'uppercase', color, whiteSpace: 'nowrap', ...style}}>{children}</div>
);
