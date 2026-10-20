// s02 typography: per-word mask reveals for the big statement lines, and a word whose glyphs are filled with
// live signal bars ("see"). All pure functions of the frame.
import React from 'react';
import {DISPLAY, band, clamp, expoOut} from '../../lib';

export const GRAD_V = 'linear-gradient(180deg, #FFFFFF 8%, #EDE6FF 46%, #B9A2FA 82%, #9F84F0 100%)';
export const GRAD_H = 'linear-gradient(100deg, #FFFFFF 0%, #F0EAFF 34%, #C9B6FF 64%, #E7F4B9 100%)';

export type WordSpec = {
  w: string;
  /** local frame the word starts rising */
  at: number;
  /** CSS background for the glyph fill (background-clip: text); 'signal' = live signal bars */
  fill?: string | 'signal';
  /** extra space after the word (em) */
  gap?: number;
};

/** Background layers that fill glyphs with luminous signal bars (green ≥ .62, purple, amber < .30). */
const signalBg = (f: number, size: number) => {
  const bw = Math.round(size * 0.034);
  const pitch = Math.round(size * 0.05);
  const n = Math.ceil((size * 2.1) / pitch);
  const imgs: string[] = [];
  const sizes: string[] = [];
  const pos: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.abs(Math.sin(i * 1.37 + f / 7.5));
    const b = 0.5 + 0.5 * Math.sin(i * 0.61 - f / 13);
    const v = clamp(0.18 + 0.72 * a * (0.55 + 0.45 * b) + 0.25 * band(f, i % 5), 0.12, 1);
    const rgb = v >= 0.62 ? '69,227,176' : v < 0.3 ? '255,192,77' : '170,140,255';
    imgs.push(`linear-gradient(to top, rgba(${rgb},0.55) 0%, rgba(${rgb},0.95) 78%, #FFFFFF 100%)`);
    // bar heights sweep through the x-height band of lowercase glyphs (~22%..80% of the line box)
    sizes.push(`${bw}px ${Math.round(18 + 66 * v)}%`);
    pos.push(`${i * pitch}px 100%`);
  }
  imgs.push('linear-gradient(180deg, rgba(240,236,255,0.5), rgba(170,145,255,0.38))');
  sizes.push('100% 100%');
  pos.push('0 0');
  return {backgroundImage: imgs.join(', '), backgroundSize: sizes.join(', '), backgroundPosition: pos.join(', '), backgroundRepeat: 'no-repeat'};
};

/** A statement line: each word rises out of its own mask box with a de-blur. */
export const Statement: React.FC<{
  words: WordSpec[];
  t: number;
  /** global frame (signal fill) */
  f: number;
  size: number;
  weight?: number;
  /** rise duration (frames) */
  dur?: number;
  glow?: number;
  /** extra glow on 'signal' words (0..1, e.g. kick) */
  pulse?: number;
  tracking?: string;
  /** reflections: plain gradient instead of the live signal-bar fill (40 gradient layers) */
  cheap?: boolean;
  style?: React.CSSProperties;
}> = ({words, t, f, size, weight = 900, dur = 16, glow = 0.55, pulse = 0, tracking = '-0.045em', cheap, style}) => (
  <div
    style={{
      position: 'relative', isolation: 'isolate', display: 'flex', alignItems: 'flex-end', whiteSpace: 'nowrap', fontFamily: DISPLAY, fontWeight: weight, fontSize: size, lineHeight: 1,
      letterSpacing: tracking, ...style,
    }}
  >
    {/* soft halo behind the line (a gradient — far cheaper than a drop-shadow filter on huge 3D text) */}
    {glow > 0 && <div style={{position: 'absolute', zIndex: -1, left: '-6%', right: '-6%', top: '-10%', bottom: '-6%', background: `radial-gradient(50% 50% at 50% 56%, rgba(150,115,255,${(0.34 * glow).toFixed(3)}) 0%, rgba(120,80,230,${(0.14 * glow).toFixed(3)}) 55%, transparent 100%)`}} />}
    {words.map((wd, i) => {
      const u = clamp((t - wd.at) / dur);
      const e = expoOut(u);
      const blur = (1 - e) * size * 0.07;
      const sig = wd.fill === 'signal' && !cheap;
      const fillStyle: React.CSSProperties = sig
        ? {...signalBg(f, size), WebkitTextStroke: `${Math.max(1.5, size * 0.006).toFixed(1)}px rgba(214,255,240,${(0.55 + 0.4 * pulse).toFixed(3)})`}
        : {backgroundImage: wd.fill === 'signal' ? 'linear-gradient(180deg, #E9FFF6, #45E3B0 60%, #AA8CFF)' : wd.fill ?? GRAD_V};
      return (
        <span key={i} style={{display: 'inline-block', overflow: 'hidden', padding: '0.08em 0.05em 0.2em', marginRight: `${wd.gap ?? 0.18}em`, opacity: u <= 0 ? 0 : undefined}}>
          <span
            style={{
              display: 'inline-block', transform: `translateY(${((1 - e) * 108).toFixed(2)}%)`, color: 'transparent', WebkitBackgroundClip: 'text', backgroundClip: 'text',
              filter: blur > 0.4 ? `blur(${blur.toFixed(2)}px)` : undefined,
              ...fillStyle,
            }}
          >
            {wd.w}
          </span>
        </span>
      );
    })}
  </div>
);

/** Tiny HUD label: uppercase Inter 600, wide tracking. */
export const HudLabel: React.FC<{children: React.ReactNode; color?: string; size?: number; tracking?: string; style?: React.CSSProperties}> = ({children, color = '#CDBBFF', size = 15, tracking = '0.32em', style}) => (
  <div style={{fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: size, letterSpacing: tracking, textTransform: 'uppercase', color, whiteSpace: 'nowrap', ...style}}>{children}</div>
);
