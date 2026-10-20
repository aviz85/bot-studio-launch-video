// s04 shared helpers: environment, typography, HUD tags, prompt-typing timeline.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {DISPLAY, FONT, MONO, clamp} from '../../lib';
import {CamSpec, resolveCam, track, NumKey} from '../../cine';
import {SpaceBackdrop} from '../../vfx';
import {PROMPT_TEXT} from '../../ui/screens';

export const kf = (t: number, keys: NumKey[]) => track(t, keys);
export const sat = (v: number) => clamp(v, 0, 1);
export const easeOut5 = (u: number) => 1 - Math.pow(1 - sat(u), 5);
export const easeOutExpo = (u: number) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * sat(u)));
export const easeInExpo = (u: number) => (u <= 0 ? 0 : Math.pow(2, 10 * sat(u) - 10));
export const easeInOut3 = (u: number) => {
  const x = sat(u);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
/** progress 0..1 over [a, a+d] */
export const pr = (t: number, a: number, d: number) => sat((t - a) / Math.max(1e-6, d));
/** fast attack, exponential decay */
export const hit = (t: number, at: number, tau = 6, attack = 1) => (t < at ? 0 : t < at + attack ? (t - at) / attack : Math.exp(-(t - at - attack) / tau));

/* ------------------------------------------------------------------ */
/* Prompt typing timeline (scene-local frames)                          */
/* ------------------------------------------------------------------ */
export const PROMPT = PROMPT_TEXT;
export const N_CHARS = PROMPT.length;
const TYPE_T0 = 3;
/** fractional number of characters typed at scene-local frame t (fast, slightly kick-rhythmic, monotonic) */
export const typedAt = (t: number) => {
  const u = t - TYPE_T0;
  if (u <= 0) return 0;
  return Math.min(N_CHARS, 1.36 * u + 1.55 * Math.sin((2 * Math.PI * u) / 13.43));
};
/** scene-local frame where typing completes */
export const TYPE_END = (() => {
  let lo = 0, hi = 200;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (typedAt(m) < N_CHARS) lo = m; else hi = m; }
  return hi;
})();
/** frame at which char j appeared */
const CHAR_T: number[] = Array.from({length: N_CHARS}, (_, j) => {
  let lo = 0, hi = TYPE_END + 1;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (typedAt(m) < j + 1) lo = m; else hi = m; }
  return hi;
});
export const charTime = (j: number) => CHAR_T[Math.max(0, Math.min(N_CHARS - 1, j))];

/* Inter Medium advance widths at 100 px (measured from the installed font with FreeType). */
const CW: Record<string, number> = {' ': 26.66, ',': 30.33, '.': 30.33, C: 73.34, a: 56.78, b: 61.81, d: 61.81, e: 58.73, f: 37.94, g: 61.97, h: 60.16, i: 25.2, k: 55.91, l: 25.2, m: 88.81, n: 60.16, o: 60.41, p: 61.81, r: 38.67, s: 53.86, t: 34.03, u: 60.16, v: 57.47, y: 57.52, '’': 27.73};
const cw = (c: string) => CW[c] ?? 56;
/** word layout of the prompt at font size `fs` (single line): start char index, x, width */
export const layoutWords = (fs: number) => {
  const k = fs / 100;
  const out: {text: string; start: number; x: number; w: number}[] = [];
  let x = 0, idx = 0;
  for (const w of PROMPT.split(' ')) {
    const ww = [...w].reduce((s, c) => s + cw(c), 0) * k;
    out.push({text: w, start: idx, x, w: ww});
    x += ww + CW[' '] * k;
    idx += w.length + 1;
  }
  return out;
};
/** x of the caret after `n` (fractional) characters at font size fs */
export const caretX = (n: number, fs: number) => {
  const k = fs / 100;
  const whole = Math.floor(n);
  let x = 0;
  for (let i = 0; i < Math.min(whole, N_CHARS); i++) x += cw(PROMPT[i]) * k;
  if (whole < N_CHARS) x += (n - whole) * cw(PROMPT[whole]) * k;
  return x;
};

/* ------------------------------------------------------------------ */
/* Environment                                                          */
/* ------------------------------------------------------------------ */
/** Deep-space backdrop that follows the camera: parallax, roll (dutch) and horizon. */
export const Sky: React.FC<{cam: CamSpec; from: number; t: number; haze?: number; intensity?: number; palette?: 'violet' | 'cyan' | 'mixed'; stars?: number}> = ({cam, from, t, haze = 0, intensity = 1, palette = 'violet', stars = 240}) => {
  const rc = resolveCam(cam);
  const horizon = 540 + rc.persp * Math.tan((rc.pitch * Math.PI) / 180);
  const roll = rc.roll;
  const a = Math.abs((roll * Math.PI) / 180), cs = Math.cos(a), sn = Math.sin(a);
  const cover = Math.max((1920 * cs + 1080 * sn) / 1920, (1920 * sn + 1080 * cs) / 1080) * 1.02;
  return (
    <AbsoluteFill style={{transform: Math.abs(roll) > 0.05 ? `rotate(${roll.toFixed(2)}deg) scale(${cover.toFixed(4)})` : undefined}}>
      <SpaceBackdrop from={from} frame={t} haze={haze} horizon={Math.max(-200, Math.min(1400, horizon))} intensity={intensity} palette={palette} stars={stars}
        camX={-rc.yaw * 22} camY={rc.pitch * 22} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Typography                                                           */
/* ------------------------------------------------------------------ */
const GRAD = 'linear-gradient(180deg, #FFFFFF 8%, #EDE6FF 46%, #C2ADFA 100%)';
const GRAD_ACCENT = 'linear-gradient(180deg, #FFFFFF 0%, #F2F9D6 40%, #D9EE95 100%)';

/** Big statement copy: per-word rise + blur-to-sharp + tracking-in, mask wipe, then a light sweep.
 *  t = frames since the reveal starts; out = frames since the exit starts (<0 before). */
export const Copy: React.FC<{
  words: string[]; t: number; out?: number; x: number; y: number; size?: number; accent?: number[]; align?: 'left' | 'right';
  stagger?: number; kicker?: string; dir?: 1 | -1;
}> = ({words, t, out = -1, x, y, size = 150, accent = [], align = 'left', stagger = 3, kicker, dir = 1}) => {
  if (t < 0) return null;
  const exitP = out >= 0 ? easeInExpo(pr(out, 0, 9)) : 0;
  if (exitP >= 1) return null;
  const sweep = pr(t, 14, 26);
  const wipe = easeOutExpo(pr(t, 0, 16));
  return (
    <div style={{position: 'absolute', left: align === 'left' ? x : undefined, right: align === 'right' ? 1920 - x : undefined, top: y, transform: `translateX(${(-dir * exitP * 260).toFixed(1)}px) skewX(${(-dir * exitP * 12).toFixed(2)}deg)`, opacity: 1 - exitP, filter: exitP > 0.02 ? `blur(${(exitP * 18).toFixed(1)}px)` : undefined}}>
      {kicker && (
        <div style={{fontFamily: FONT, fontWeight: 600, fontSize: 19, letterSpacing: '0.34em', textTransform: 'uppercase', color: '#BFF4FF', marginBottom: 14, marginLeft: 6, opacity: sat(t / 8), whiteSpace: 'nowrap', textShadow: '0 0 14px rgba(127,231,255,0.65)'}}>
          {kicker}
        </div>
      )}
      <div style={{position: 'relative', whiteSpace: 'nowrap', fontFamily: DISPLAY, fontWeight: 900, fontSize: size, lineHeight: 1, letterSpacing: '-0.045em',
        WebkitMaskImage: `linear-gradient(90deg, #000 ${(wipe * 112 - 12).toFixed(1)}%, transparent ${(wipe * 112).toFixed(1)}%)`,
        maskImage: `linear-gradient(90deg, #000 ${(wipe * 112 - 12).toFixed(1)}%, transparent ${(wipe * 112).toFixed(1)}%)`,
        paddingBottom: size * 0.12, paddingRight: size * 0.1}}>
        {words.map((w, i) => {
          const p = easeOutExpo(pr(t, i * stagger, 18));
          const b = (1 - p) * 16;
          const isAcc = accent.includes(i);
          return (
            <span key={i} style={{display: 'inline-block', marginRight: i < words.length - 1 ? size * 0.24 : 0, transform: `translate(${((1 - p) * 70 * dir).toFixed(1)}px, ${((1 - p) * size * 0.18).toFixed(1)}px)`, opacity: sat(p * 1.6),
              filter: b > 0.3 ? `blur(${b.toFixed(1)}px)` : undefined, backgroundImage: isAcc ? GRAD_ACCENT : GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
              textShadow: 'none', position: 'relative'}}>
              {w}
            </span>
          );
        })}
        {/* light sweep (text-clipped duplicate) */}
        {sweep > 0 && sweep < 1 && (
          <div aria-hidden style={{position: 'absolute', left: 0, top: 0, whiteSpace: 'nowrap', pointerEvents: 'none',
            backgroundImage: `linear-gradient(105deg, transparent ${(sweep * 140 - 30).toFixed(1)}%, rgba(255,255,255,0.95) ${(sweep * 140 - 20).toFixed(1)}%, rgba(191,244,255,0.9) ${(sweep * 140 - 16).toFixed(1)}%, transparent ${(sweep * 140 - 6).toFixed(1)}%)`,
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}}>
            {words.map((w, i) => <span key={i} style={{display: 'inline-block', marginRight: i < words.length - 1 ? size * 0.24 : 0}}>{w}</span>)}
          </div>
        )}
      </div>
      {/* soft glow under the copy (gradient, cheap) */}
      <div style={{position: 'absolute', left: -size * 0.4, top: size * 0.05, width: '120%', height: size * 1.1, zIndex: -1, background: 'radial-gradient(50% 50% at 40% 50%, rgba(140,107,234,0.28), transparent 75%)', opacity: sat(t / 10)}} />
    </div>
  );
};

/** Small HUD tag: uppercase label + mono readout, with a draw-on rule. */
export const HudTag: React.FC<{x: number; y: number; t: number; label: string; value?: string; align?: 'left' | 'right'; color?: string}> = ({x, y, t, label, value, align = 'left', color = '#BFF4FF'}) => {
  if (t < 0) return null;
  const p = easeOutExpo(pr(t, 0, 14));
  const n = Math.round(label.length * pr(t, 0, 10));
  return (
    <div style={{position: 'absolute', left: align === 'left' ? x : undefined, right: align === 'right' ? 1920 - x : undefined, top: y, fontFamily: FONT, color, opacity: 0.9, textAlign: align}}>
      <div style={{fontWeight: 600, fontSize: 15, letterSpacing: '0.32em', textTransform: 'uppercase', whiteSpace: 'nowrap', textShadow: '0 0 10px rgba(127,231,255,0.5)'}}>{label.slice(0, n)}</div>
      <div style={{height: 1, width: 220 * p, marginTop: 8, marginLeft: align === 'right' ? 'auto' : 0, background: `linear-gradient(${align === 'left' ? 90 : 270}deg, ${color}, transparent)`}} />
      {value && <div style={{fontFamily: MONO, fontSize: 15, marginTop: 8, color: '#E2D6FF', opacity: 0.85 * p, whiteSpace: 'nowrap'}}>{value}</div>}
    </div>
  );
};

/** Corner brackets framing the picture (HUD garnish). */
export const Brackets: React.FC<{t: number; inset?: number; color?: string; o?: number}> = ({t, inset = 96, color = 'rgba(191,244,255,0.55)', o = 1}) => {
  const p = easeOutExpo(pr(t, 0, 16));
  if (p <= 0) return null;
  const L = 46 * p;
  const s: React.CSSProperties = {position: 'absolute', width: L, height: L, borderColor: color, borderStyle: 'solid', borderWidth: 0};
  const ix = inset + 24, iy = inset;
  return (
    <AbsoluteFill style={{opacity: o, pointerEvents: 'none'}}>
      <div style={{...s, left: ix, top: iy, borderLeftWidth: 2, borderTopWidth: 2}} />
      <div style={{...s, right: ix, top: iy, borderRightWidth: 2, borderTopWidth: 2}} />
      <div style={{...s, left: ix, bottom: iy, borderLeftWidth: 2, borderBottomWidth: 2}} />
      <div style={{...s, right: ix, bottom: iy, borderRightWidth: 2, borderBottomWidth: 2}} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Local glass orb (state node). Everything is painted INSIDE its own box: the shared GlassOrbNode's bloom
 * overflows its box and shows a clipped light square in 3D contexts. */
const ORB_RGB = {lilac: '160,130,255', cyan: '127,231,255', green: '69,227,176', amber: '255,192,77'} as const;
export const HoloOrb: React.FC<{size?: number; label?: string; icon?: React.ReactNode; tone?: keyof typeof ORB_RGB; glow?: number; p?: number}> = ({size = 260, label, icon, tone = 'lilac', glow = 0.5, p = 1}) => {
  if (p <= 0) return null;
  const s = size, B = s * 2.2, o = (B - s) / 2;
  const rgb = ORB_RGB[tone];
  const sc = 0.4 + 0.6 * (1 - Math.pow(1 - sat(p), 3)) + 0.06 * Math.sin(Math.PI * sat(p));
  return (
    <div style={{position: 'relative', width: B, height: B, transform: `scale(${sc.toFixed(4)})`, opacity: p < 0.35 ? p / 0.35 : undefined, fontFamily: FONT}}>
      <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(closest-side, rgba(${rgb},${(0.3 * glow + 0.1).toFixed(3)}) 30%, rgba(${rgb},${(0.12 * glow).toFixed(3)}) 55%, rgba(${rgb},0) 100%)`}} />
      <div style={{position: 'absolute', left: o, top: o, width: s, height: s, borderRadius: '50%',
        background: `radial-gradient(circle at 34% 27%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.18) 9%, rgba(255,255,255,0) 22%), radial-gradient(circle at 50% 58%, rgba(${rgb},0.12) 0%, rgba(${rgb},0.22) 48%, rgba(${rgb},0.62) 86%, rgba(235,250,255,0.8) 100%), rgba(14,8,30,0.6)`,
        boxShadow: `inset 0 0 0 1.5px rgba(255,255,255,0.5), inset ${-s * 0.06}px ${-s * 0.09}px ${s * 0.16}px rgba(${rgb},0.55), inset ${s * 0.04}px ${s * 0.05}px ${s * 0.1}px rgba(255,255,255,0.22)`}}>
        <div style={{position: 'absolute', left: '14%', right: '14%', bottom: '5%', height: '34%', borderRadius: '50%', background: `radial-gradient(50% 60% at 50% 100%, rgba(${rgb},0.75), rgba(${rgb},0) 100%)`}} />
        <div style={{position: 'absolute', left: '18%', top: '11%', width: '32%', height: '17%', borderRadius: '50%', transform: 'rotate(-32deg)', background: 'radial-gradient(closest-side, rgba(255,255,255,0.95), rgba(255,255,255,0) 100%)'}} />
        <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: s * 0.04}}>
          {icon}
          {label && <div style={{fontSize: Math.max(14, s * 0.11), fontWeight: 650, color: '#F6F2FF', textShadow: `0 0 ${s * 0.06}px rgba(${rgb},0.95)`, whiteSpace: 'nowrap'}}>{label}</div>}
        </div>
      </div>
    </div>
  );
};
