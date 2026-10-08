import React, {createContext, useContext} from 'react';
import {C} from '../lib';

/**
 * UI look system. Every UI component reads its colours from the nearest <UITheme>.
 *   frost — light translucent Lilac Pop glass (default)
 *   holo  — dark smoked glass with luminous lilac/cyan content (sci-fi HUD)
 *   solid — the opaque v1 product look
 */
export type Look = 'frost' | 'holo' | 'solid';

export type Theme = {
  look: Look;
  dark: boolean;
  /* fills */
  frame: string; //         app-window base fill
  surface: string; //       card / pane fill (css background)
  surfaceGlass: string; //  extra-transparent fill (Card glass prop)
  surfaceStrong: string; // near-opaque fill (inputs, popovers)
  inset: string; //         nested rows / chips inside a card
  insetBorder: string;
  field: string; //         input fields
  fieldBorder: string;
  fieldFocus: string;
  /* type */
  text: string;
  textSoft: string;
  textFaint: string;
  icon: string;
  divider: string;
  track: string; //         empty part of bars / meters
  /* accents */
  accent: string;
  accentDeep: string;
  accentGrad: string;
  accentText: string; //    accent-coloured text (purpleDeep in solid)
  onAccent: string;
  chip: string;
  chipText: string;
  chip2: string;
  pistachio: string;
  onPistachio: string;
  greenSoft: string;
  greenText: string;
  amberSoft: string;
  amberText: string;
  sig: {green: string; amber: string; purple: string};
  /* glass dressing */
  rim: string; //           luminous gradient rim ('' = none)
  rimWidth: number;
  border: string; //        plain 1px border colour
  shadow: string; //        outer shadow + bloom for top-level panes (GlassPane, app window)
  cardShadow: string; //    lighter shadow for cards (cheap: small blur radii)
  inner: string; //         inset highlights / inner glow
  specular: string; //      top specular gradient ('' = none)
  glow: string; //          rgb triplet for glows, e.g. '140,107,234'
  glow2: string; //         secondary glow (cyan in holo)
  noise: number; //         frost grain opacity
  scan: number; //          scanline opacity (holo)
  blur: number; //          backdrop-filter blur px (0 = gradient fallback, see docs/GLASS.md)
  barGlow: number; //       multiplier for bar / indicator emission
  bubbleBot: string;
  bubbleUser: string;
  code: {kw: string; str: string; num: string; cm: string; plain: string; lineNo: string; header: string};
};

const SOLID: Theme = {
  look: 'solid',
  dark: false,
  frame: `linear-gradient(160deg, #F8F5FD, ${C.canvas})`,
  surface: C.white,
  surfaceGlass: 'rgba(255,255,255,0.78)',
  surfaceStrong: C.white,
  inset: '#F3EFFA',
  insetBorder: 'transparent',
  field: C.white,
  fieldBorder: '#E4DCF3',
  fieldFocus: C.purple,
  text: C.plum,
  textSoft: C.plumSoft,
  textFaint: '#A79BB8',
  icon: C.plum,
  divider: '#F0EBF8',
  track: '#EEE9F6',
  accent: C.purple,
  accentDeep: C.purpleDeep,
  accentGrad: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})`,
  accentText: C.purpleDeep,
  onAccent: '#fff',
  chip: C.lilac,
  chipText: C.plum,
  chip2: C.lilac2,
  pistachio: C.pistachio,
  onPistachio: C.plum,
  greenSoft: '#E3F3EA',
  greenText: C.green,
  amberSoft: '#FCF0D6',
  amberText: '#B47A10',
  sig: {green: C.green, amber: C.amber, purple: C.purple},
  rim: '',
  rimWidth: 1,
  border: 'rgba(255,255,255,0.9)',
  shadow: '0 30px 80px -20px rgba(57,41,75,0.35), 0 8px 24px -8px rgba(57,41,75,0.18)',
  cardShadow: '0 30px 80px -20px rgba(57,41,75,0.35), 0 8px 24px -8px rgba(57,41,75,0.18)',
  inner: 'inset 0 1px 0 rgba(255,255,255,0.9)',
  specular: '',
  glow: '140,107,234',
  glow2: '140,107,234',
  noise: 0,
  scan: 0,
  blur: 0,
  barGlow: 0.6,
  bubbleBot: '#F3EFFA',
  bubbleUser: C.lilac2,
  code: {kw: C.purpleDeep, str: '#2E8B57', num: '#E0861A', cm: '#9A8DB0', plain: C.plum, lineNo: '#BDB2CF', header: '#F6F3FB'},
};

const FROST: Theme = {
  ...SOLID,
  look: 'frost',
  frame: 'linear-gradient(160deg, rgba(246,240,255,0.80) 0%, rgba(230,219,255,0.64) 45%, rgba(212,196,250,0.58) 100%)',
  surface: 'linear-gradient(160deg, rgba(255,255,255,0.84) 0%, rgba(251,248,255,0.72) 38%, rgba(241,234,255,0.64) 100%)',
  surfaceGlass: 'linear-gradient(160deg, rgba(255,255,255,0.62) 0%, rgba(246,241,255,0.48) 50%, rgba(232,222,252,0.42) 100%)',
  surfaceStrong: 'rgba(255,255,255,0.86)',
  inset: 'rgba(240,234,253,0.72)',
  insetBorder: 'rgba(255,255,255,0.75)',
  field: 'rgba(255,255,255,0.6)',
  fieldBorder: 'rgba(214,200,245,0.95)',
  textSoft: '#5D4B77',
  textFaint: 'rgba(57,41,75,0.48)',
  divider: 'rgba(57,41,75,0.09)',
  track: 'rgba(120,92,180,0.14)',
  chip: 'rgba(222,211,250,0.85)',
  chip2: 'rgba(204,188,246,0.9)',
  pistachio: 'rgba(231,244,185,0.95)',
  greenSoft: 'rgba(218,241,229,0.9)',
  amberSoft: 'rgba(252,238,208,0.92)',
  amberText: '#A46B06',
  rim: 'linear-gradient(150deg, rgba(255,255,255,1) 0%, rgba(232,222,255,0.9) 18%, rgba(127,231,255,0.75) 42%, rgba(255,255,255,0.06) 70%, rgba(205,187,255,0.55) 100%)',
  rimWidth: 1.5,
  border: 'rgba(255,255,255,0.35)',
  shadow: '0 40px 80px -34px rgba(8,3,20,0.75), 0 0 60px -20px rgba(140,107,234,0.65)',
  cardShadow: '0 16px 34px -20px rgba(20,8,44,0.55), 0 0 24px -12px rgba(140,107,234,0.5)',
  inner: 'inset 0 1px 0 rgba(255,255,255,0.95), inset 0 0 0 1px rgba(255,255,255,0.14)',
  specular: 'linear-gradient(180deg, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.16) 7%, rgba(255,255,255,0) 20%)',
  glow2: '127,231,255',
  noise: 0.07,
  barGlow: 0.75,
  bubbleBot: 'rgba(243,239,250,0.82)',
  bubbleUser: 'rgba(214,200,245,0.9)',
  code: {kw: C.purpleDeep, str: '#24805A', num: '#C9700A', cm: '#8C7FA6', plain: C.plum, lineNo: 'rgba(57,41,75,0.35)', header: 'rgba(246,243,251,0.6)'},
};

const HOLO: Theme = {
  ...SOLID,
  look: 'holo',
  dark: true,
  frame: 'linear-gradient(160deg, rgba(40,22,74,0.40) 0%, rgba(18,9,36,0.32) 60%, rgba(10,5,24,0.38) 100%)',
  surface: 'linear-gradient(160deg, rgba(52,30,94,0.62) 0%, rgba(24,13,46,0.55) 48%, rgba(14,7,32,0.62) 100%)',
  surfaceGlass: 'linear-gradient(160deg, rgba(52,30,94,0.42) 0%, rgba(20,10,40,0.36) 60%, rgba(12,6,28,0.42) 100%)',
  surfaceStrong: 'rgba(14,7,30,0.86)',
  inset: 'rgba(140,107,234,0.13)',
  insetBorder: 'rgba(180,155,242,0.22)',
  field: 'rgba(8,4,20,0.5)',
  fieldBorder: 'rgba(127,231,255,0.32)',
  fieldFocus: '#7FE7FF',
  text: '#F3EEFF',
  textSoft: 'rgba(216,203,255,0.8)',
  textFaint: 'rgba(205,187,255,0.46)',
  icon: '#DCD0FF',
  divider: 'rgba(180,155,242,0.16)',
  track: 'rgba(180,155,242,0.13)',
  accent: '#9C7DFF',
  accentDeep: '#7650F2',
  accentGrad: 'linear-gradient(135deg, #A98BFF, #6A45E0)',
  accentText: '#CDBBFF',
  onAccent: '#fff',
  chip: 'rgba(140,107,234,0.26)',
  chipText: '#ECE4FF',
  chip2: 'rgba(140,107,234,0.4)',
  pistachio: 'rgba(231,244,185,0.16)',
  onPistachio: '#EEF8CC',
  greenSoft: 'rgba(60,220,170,0.14)',
  greenText: '#72F2C8',
  amberSoft: 'rgba(255,190,80,0.14)',
  amberText: '#FFD27A',
  sig: {green: '#45E3B0', amber: '#FFC04D', purple: '#AA8CFF'},
  rim: 'linear-gradient(150deg, rgba(127,231,255,1) 0%, rgba(190,168,255,0.8) 26%, rgba(140,107,234,0.16) 58%, rgba(127,231,255,0.55) 100%)',
  rimWidth: 1.5,
  border: 'rgba(180,155,242,0.28)',
  shadow: '0 34px 70px -30px rgba(0,0,0,0.9), 0 0 50px -14px rgba(127,231,255,0.34), 0 0 70px -26px rgba(140,107,234,0.75)',
  cardShadow: '0 16px 34px -20px rgba(0,0,0,0.8), 0 0 22px -10px rgba(127,231,255,0.35)',
  inner: 'inset 0 1px 0 rgba(200,240,255,0.55), inset 0 0 0 1px rgba(140,107,234,0.1)',
  specular: 'linear-gradient(180deg, rgba(200,230,255,0.18) 0%, rgba(200,230,255,0.05) 9%, rgba(200,230,255,0) 22%)',
  glow: '160,130,255',
  glow2: '127,231,255',
  noise: 0.05,
  scan: 0.07,
  barGlow: 1.5,
  bubbleBot: 'rgba(140,107,234,0.2)',
  bubbleUser: 'rgba(127,231,255,0.16)',
  code: {kw: '#C3AEFF', str: '#7FEBC8', num: '#FFC27A', cm: 'rgba(205,187,255,0.5)', plain: '#EEE8FF', lineNo: 'rgba(205,187,255,0.32)', header: 'rgba(140,107,234,0.14)'},
};

export const THEMES: Record<Look, Theme> = {solid: SOLID, frost: FROST, holo: HOLO};
export const themeFor = (look: Look = 'frost'): Theme => THEMES[look] ?? FROST;

const Ctx = createContext<Theme>(FROST);

/** Provide a look (and optional overrides) to every UI component below. */
export const UITheme: React.FC<{look?: Look; blur?: number; override?: Partial<Theme>; children?: React.ReactNode}> = ({look = 'frost', blur, override, children}) => {
  let th: Theme = themeFor(look as Look);
  if (blur !== undefined || override) th = {...th, ...(override ?? {}), ...(blur !== undefined ? {blur} : {})} as Theme;
  return <Ctx.Provider value={th}>{children}</Ctx.Provider>;
};

/** Current theme tokens. */
export const useUI = (): Theme => useContext(Ctx);

/** Wrap children in a different look only when `look` is given (helper for components with a `look` prop). */
export const MaybeTheme: React.FC<{look?: Look; children?: React.ReactNode}> = ({look, children}) =>
  look ? <UITheme look={look}>{children}</UITheme> : <>{children}</>;

/** Threshold colour of a signal value for a theme (pass ≥ .62 green, < .3 amber waiting, else purple). */
export const sigColor = (th: Theme, v: number) => (v >= 0.62 ? th.sig.green : v < 0.3 ? th.sig.amber : th.sig.purple);

/** Semantic tones for pills / rows. */
export type Tone = 'lilac' | 'lilac2' | 'pistachio' | 'green' | 'amber' | 'white' | 'accent' | 'ghost';
export const toneColors = (th: Theme, tone: Tone): {bg: string; fg: string; border?: string} => {
  switch (tone) {
    case 'lilac2': return {bg: th.chip2, fg: th.accentText};
    case 'pistachio': return {bg: th.pistachio, fg: th.onPistachio};
    case 'green': return {bg: th.greenSoft, fg: th.greenText};
    case 'amber': return {bg: th.amberSoft, fg: th.amberText};
    case 'white': return {bg: th.field, fg: th.text, border: th.fieldBorder};
    case 'accent': return {bg: th.accentGrad, fg: th.onAccent};
    case 'ghost': return {bg: 'transparent', fg: th.textSoft, border: th.divider};
    default: return {bg: th.chip, fg: th.chipText};
  }
};

/* ---------------- textures ---------------- */
/** Static frost grain (tiny tiled SVG turbulence; rasterised once, cheap). */
export const NOISE_URL = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.6 -0.55'/></filter><rect width='180' height='180' filter='url(#n)'/></svg>",
)}")`;

export const SCANLINES = (alpha: number) => `repeating-linear-gradient(0deg, rgba(190,225,255,${alpha}) 0px, rgba(190,225,255,${alpha}) 1px, transparent 1px, transparent 4px)`;

/** rgba() from a theme glow triplet. */
export const glowA = (rgb: string, a: number) => `rgba(${rgb},${a})`;

/** Hex (#RRGGBB) → rgba with alpha. Leaves non-hex colours untouched. */
export const withA = (hex: string, a: number) => {
  if (!hex.startsWith('#') || hex.length !== 7) return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
