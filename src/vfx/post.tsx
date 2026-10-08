/* Wrappers that post-process their children: Bloom, ChromaticAberration, Glitch. */
import React from 'react';
import {VC, clamp01, colorOf, hash, hash2, rgba, useF, useSafeId} from './util';

/* ======================================================================
 * Bloom
 * ==================================================================== */
export type BloomProps = {
  children: React.ReactNode;
  /** Glow strength (opacity of the screen-blended glow layers). 0 = off. */
  intensity?: number;
  /** Blur radius of the tight glow in px (wide glow = 3.2×). */
  radius?: number;
  /** Bright-pass threshold 0..1: only content brighter than this glows (0 = everything glows). */
  threshold?: number;
  /** Single tight glow layer only (half the cost). */
  cheap?: boolean;
  /** Extra saturation of the glow (1 = none). */
  saturate?: number;
  /** Wrapper style (default: full-frame absolute box). Children are rendered twice/three times inside identical boxes. */
  style?: React.CSSProperties;
};

const fullBox: React.CSSProperties = {position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'};

/** Adds a soft glow to bright children: a bright-passed, blurred duplicate (two radii unless `cheap`) screen-blended on top.
 *  Wrap only the bright thing (logo, headline, light UI), not whole scenes. */
export const Bloom: React.FC<BloomProps> = ({children, intensity = 0.8, radius = 14, threshold = 0.3, cheap = false, saturate = 1.25, style}) => {
  const I = Math.max(0, intensity);
  const t = Math.min(0.95, Math.max(0, threshold));
  const c = (1 + t) / (1 - t);
  const b = 0.5 + 0.5 / c;
  const pass = t > 0.01 ? `brightness(${b.toFixed(3)}) contrast(${c.toFixed(3)}) ` : '';
  return (
    <div style={{...fullBox, ...style}}>
      {children}
      {I > 0.01 && (
        <div style={{...fullBox, pointerEvents: 'none', mixBlendMode: 'screen', opacity: clamp01(I), filter: `${pass}saturate(${saturate}) blur(${radius}px)`}}>{children}</div>
      )}
      {I > 0.01 && !cheap && (
        <div style={{...fullBox, pointerEvents: 'none', mixBlendMode: 'screen', opacity: clamp01(I * 0.7), filter: `${pass}saturate(${saturate}) blur(${radius * 3.2}px)`}}>{children}</div>
      )}
    </div>
  );
};

/* ======================================================================
 * ChromaticAberration
 * ==================================================================== */
export type ChromaticAberrationProps = {
  children: React.ReactNode;
  /** Channel offset in px (R one way, B the other). 0 = bypass. Animate for impacts (e.g. 14·impulse). */
  amount?: number;
  /** Split direction in degrees (0 = horizontal). */
  angle?: number;
  style?: React.CSSProperties;
};

/** RGB split (red one way, green+blue the other) via SVG feColorMatrix + feOffset; children rendered once. Bypassed when amount < 0.25. */
export const ChromaticAberration: React.FC<ChromaticAberrationProps> = ({children, amount = 6, angle = 0, style}) => {
  const id = useSafeId('ca');
  const on = Math.abs(amount) >= 0.25;
  const dx = Math.cos((angle * Math.PI) / 180) * amount;
  const dy = Math.sin((angle * Math.PI) / 180) * amount;
  return (
    <div style={{...fullBox, ...style}}>
      {on && (
        <svg width="0" height="0" style={{position: 'absolute'}} aria-hidden>
          <filter id={id} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
            <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
            <feOffset in="r" dx={-dx} dy={-dy} result="ro" />
            <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="gb" />
            <feOffset in="gb" dx={dx} dy={dy} result="gbo" />
            <feBlend in="ro" in2="gbo" mode="screen" />
          </filter>
        </svg>
      )}
      <div style={{...fullBox, filter: on ? `url(#${id})` : undefined}}>{children}</div>
    </div>
  );
};

/* ======================================================================
 * Glitch
 * ==================================================================== */
export type GlitchProps = {
  children: React.ReactNode;
  /** 0 = clean (bypass), 1 = strong. Animate it (e.g. impulse at a cut). */
  amount?: number;
  /** Max horizontal slice displacement in px at amount 1. */
  displace?: number;
  /** RGB split in px at amount 1. */
  rgb?: number;
  /** Slice density (higher = thinner slices). */
  density?: number;
  /** Frames each glitch pattern holds (digital stutter). */
  hold?: number;
  /** Block-noise overlay (cyan/magenta/white rectangles + tear lines). */
  blocks?: boolean;
  seed?: number;
  frame?: number;
  style?: React.CSSProperties;
};

/** Digital glitch: banded horizontal slice displacement (feTurbulence → quantised → feDisplacementMap),
 *  RGB split and block noise; pattern re-seeded every `hold` frames. Bypassed at amount 0. */
export const Glitch: React.FC<GlitchProps> = ({children, amount = 1, displace = 90, rgb = 10, density = 1, hold = 2, blocks = true, seed = 1, frame, style}) => {
  const f = useF(frame);
  const id = useSafeId('gl');
  const step = Math.floor(f / Math.max(1, hold));
  const gate = hash2(step, seed) > 0.22 ? 1 : 0.25;
  const A = clamp01(amount) * gate;
  const on = A > 0.01;
  const sd = Math.floor(hash2(step, seed + 7) * 9999);
  // table: mostly neutral (0.5) with a few strongly displaced bands; vary per step
  const tv: string[] = [];
  const NT = 9;
  for (let i = 0; i < NT; i++) {
    const r = hash2(step * 31 + i, seed);
    const mid = Math.abs(i - (NT - 1) / 2) < 1.6; // centre entries are hit most often → keep them mostly neutral
    tv.push(r < (mid ? 0.72 : 0.4) ? '0.5' : (0.5 + (hash2(i + 9, step) - 0.5) * 1.0).toFixed(3));
  }
  const freqY = (0.0035 + 0.011 * hash2(step, seed + 3)) * density;
  const split = rgb * A * (hash2(step, seed + 5) > 0.5 ? 1 : -1);
  return (
    <div style={{...fullBox, ...style}}>
      {on && (
        <svg width="0" height="0" style={{position: 'absolute'}} aria-hidden>
          <filter id={id} x="-5%" y="0%" width="110%" height="100%" colorInterpolationFilters="sRGB">
            {/* noise computed only in a 2px column, quantised, then tiled across → horizontal slice bands at ~zero cost */}
            <feTurbulence type="fractalNoise" baseFrequency={`0.0006 ${freqY.toFixed(4)}`} numOctaves={1} seed={sd} x="0" y="-100" width="2" height="4400" result="n" />
            <feComponentTransfer in="n" result="q">
              <feFuncR type="discrete" tableValues={tv.join(' ')} />
              <feFuncG type="discrete" tableValues="0.5" />
              <feFuncB type="discrete" tableValues="0.5" />
              <feFuncA type="discrete" tableValues="1" />
            </feComponentTransfer>
            <feTile in="q" x="-4000" y="-4000" width="12000" height="12000" result="t" />
            <feDisplacementMap in="SourceGraphic" in2="t" scale={displace * A} xChannelSelector="R" yChannelSelector="G" result="d" />
            <feColorMatrix in="d" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
            <feOffset in="r" dx={-split} dy={0} result="ro" />
            <feColorMatrix in="d" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="gb" />
            <feOffset in="gb" dx={split} dy={0} result="gbo" />
            <feBlend in="ro" in2="gbo" mode="screen" />
          </filter>
        </svg>
      )}
      <div style={{...fullBox, filter: on ? `url(#${id})` : undefined}}>{children}</div>
      {on && blocks && <GlitchBlocks amount={A} step={step} seed={seed} />}
    </div>
  );
};

/** Block noise + tear lines overlay used by Glitch (also usable standalone over anything). */
export const GlitchBlocks: React.FC<{amount: number; step: number; seed?: number; color?: string; secondary?: string}> = ({amount, step, seed = 1, color, secondary}) => {
  const c1 = colorOf(color, VC.cyan);
  const c2 = colorOf(secondary, VC.magenta);
  const n = Math.round(3 + 9 * amount);
  return (
    <div style={{...fullBox, pointerEvents: 'none', overflow: 'hidden'}}>
      {Array.from({length: n}).map((_, i) => {
        const r = (k: number) => hash2(step * 97 + i * 13 + k, seed);
        const kind = r(1);
        const y = r(2) * 100;
        const h = kind < 0.5 ? 0.25 + r(3) * 1.2 : 1 + r(3) * 6;
        const x = r(4) * 100;
        const w = kind < 0.5 ? 30 + r(5) * 70 : 3 + r(5) * 18;
        const col = kind < 0.33 ? '#ffffff' : kind < 0.66 ? c1 : c2;
        return (
          <div key={i} style={{position: 'absolute', left: `${kind < 0.5 ? x * 0.3 : x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%`, mixBlendMode: kind < 0.5 ? 'screen' : 'difference',
            background: kind < 0.5
              ? `linear-gradient(90deg, transparent, ${rgba(col, 0.35 * amount)} 20%, ${rgba(col, 0.55 * amount)} 60%, transparent)`
              : `repeating-linear-gradient(90deg, ${rgba(col, 0.7 * amount)} 0px, ${rgba(col, 0.7 * amount)} 3px, transparent 3px, transparent 7px)`,
            opacity: 0.4 + 0.6 * hash(step + i)}} />
        );
      })}
    </div>
  );
};
