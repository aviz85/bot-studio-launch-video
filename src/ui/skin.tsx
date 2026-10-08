import React from 'react';
import {lerp, clamp} from '../lib';
import {Theme, NOISE_URL, SCANLINES} from './theme';

/**
 * Low-level glass dressing shared by Card and GlassPane.
 * All overlays are absolutely positioned and inherit the parent's border radius.
 */

const fill: React.CSSProperties = {position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none'};

/** 1px luminous gradient rim (mask-composite ring; works in headless Chromium). */
export const Rim: React.FC<{gradient: string; width?: number; opacity?: number; z?: number}> = ({gradient, width = 1.5, opacity = 1, z = 2}) => {
  if (!gradient || opacity <= 0.001) return null;
  return (
    <div
      style={{
        ...fill,
        zIndex: z,
        padding: width,
        background: gradient,
        opacity: Math.min(1, opacity),
        WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
      } as React.CSSProperties}
    />
  );
};

/** Light sweep across the glass. p: 0..1 (outside → nothing). */
export const Sheen: React.FC<{p?: number; strength?: number; width?: number; color?: string; angle?: number; z?: number}> = ({p, strength = 0.55, width = 16, color = '255,255,255', angle = 108, z = 3}) => {
  if (p === undefined || p <= 0 || p >= 1) return null;
  const x = lerp(-30, 130, p);
  return (
    <div
      style={{
        ...fill,
        zIndex: z,
        background: `linear-gradient(${angle}deg, transparent ${x - width}%, rgba(${color},${strength * 0.22}) ${x - width / 2.5}%, rgba(${color},${strength}) ${x}%, rgba(${color},${strength * 0.22}) ${x + width / 2.5}%, transparent ${x + width}%)`,
      }}
    />
  );
};

/** Background-side decoration: specular highlight, frost grain, scanlines, inner sheen. Rendered under content (z -1). */
export const GlassUnder: React.FC<{th: Theme; specular?: number; noise?: number; scan?: number; z?: number}> = ({th, specular = 1, noise, scan, z = -1}) => {
  const n = noise ?? th.noise;
  const s = scan ?? th.scan;
  return (
    <>
      {th.specular && specular > 0 && <div style={{...fill, zIndex: z, background: th.specular, opacity: clamp(specular)}} />}
      {th.look !== 'solid' && specular > 0 && (
        <div style={{...fill, zIndex: z, background: th.dark
          ? 'radial-gradient(120% 70% at 12% 0%, rgba(150,120,255,0.20), transparent 55%)'
          : 'radial-gradient(120% 70% at 12% 0%, rgba(255,255,255,0.38), transparent 55%)', opacity: clamp(specular)}} />
      )}
      {n > 0 && <div style={{...fill, zIndex: z, backgroundImage: NOISE_URL, backgroundSize: '180px 180px', opacity: n}} />}
      {s > 0 && <div style={{...fill, zIndex: z, background: SCANLINES(s)}} />}
    </>
  );
};

/** Root style for a glass surface. */
export const glassRoot = (th: Theme, o: {fill?: string; glow?: number; shadow?: boolean | 'card' | 'pane'; blur?: number; flash?: number} = {}): React.CSSProperties => {
  const blur = o.blur ?? th.blur;
  const glow = o.glow ?? 0;
  const flash = o.flash ?? 0;
  const extra: string[] = [];
  if (glow > 0) extra.push(`0 0 ${Math.round(80 * glow)}px rgba(${th.glow},${0.6 * Math.min(glow, 1.5)})`);
  if (flash > 0) extra.push(`0 0 ${Math.round(30 + 50 * flash)}px rgba(${th.glow2},${0.7 * flash})`);
  const sh = o.shadow === false ? '' : o.shadow === 'card' ? th.cardShadow : th.shadow;
  const shadows = [sh, th.inner, ...extra].filter(Boolean).join(', ');
  return {
    background: o.fill ?? th.surface,
    boxShadow: shadows,
    border: th.rim ? undefined : `1px solid ${th.border}`,
    ...(blur > 0 ? ({backdropFilter: `blur(${blur}px) saturate(1.5)`, WebkitBackdropFilter: `blur(${blur}px) saturate(1.5)`} as React.CSSProperties) : {}),
  };
};
