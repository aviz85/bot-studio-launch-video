// Motion blur family, all single-pass SVG filters on a wrapper (the DOM renders once):
//  • <MotionBlur>  directional (anisotropic feGaussianBlur stdDeviation="x y", any angle), driven by velocity
//  • <ZoomBlur>    radial zoom streaks (N displaced copies via a ramp displacement map, averaged)
//  • <SpinBlur>    rotational blur around frame centre (same technique)
//  • <GlitchFx>    slice displacement + RGB split (feTurbulence bands → discrete → displacement)
//  • <Echo>        multi-sample ghost trail: re-renders a subtree at earlier times (N× cost — use for whips)
// Filter ids are unique per instance (React useId). Wrappers are full-frame 1920×1080 boxes.
import React, {useId} from 'react';
import {AbsoluteFill, Img} from 'remotion';
import {FRAME_H, FRAME_W} from './camera';
import {rand} from '../lib';

const useFid = (p: string) => `cine-${p}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
const full: React.CSSProperties = {position: 'absolute', left: 0, top: 0, width: FRAME_W, height: FRAME_H};

/** Gaussian std (px) that reads like a camera shutter for an image moving `speed` px/frame. shutter 0.5 = 180°. */
export const shutterBlur = (speed: number, shutter = 0.5) => Math.abs(speed) * shutter * 0.42;

/* ------------------------------------------------------------------ */
/* Directional                                                         */
/* ------------------------------------------------------------------ */
export type MotionBlurProps = {
  /** image velocity in px/frame (x, y). Blur follows the direction. */
  vx?: number; vy?: number;
  /** shutter fraction (0.5 = 180°). */
  shutter?: number;
  /** clamp for the blur std (px, default 140) */
  max?: number;
  /** OR set raw axis-aligned std devs directly (ignores vx/vy) */
  sx?: number; sy?: number;
  /** below this std (px) no filter is applied (default 0.6) */
  threshold?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

/** Directional motion blur on a full-frame wrapper. Unique filter id per instance. */
export const MotionBlur: React.FC<MotionBlurProps> = ({vx = 0, vy = 0, shutter = 0.5, max = 140, sx, sy, threshold = 0.6, style, children}) => {
  const id = useFid('mb');
  let ax: number, ay: number, angle = 0;
  if (sx !== undefined || sy !== undefined) { ax = sx ?? 0; ay = sy ?? 0; }
  else {
    const sp = Math.hypot(vx, vy);
    const L = Math.min(max, shutterBlur(sp, shutter));
    if (Math.abs(vy) <= Math.abs(vx) * 0.08) { ax = L; ay = 0; }
    else if (Math.abs(vx) <= Math.abs(vy) * 0.08) { ax = 0; ay = L; }
    else { ax = L; ay = 0; angle = (Math.atan2(vy, vx) * 180) / Math.PI; }
  }
  ax = Math.min(max, ax); ay = Math.min(max, ay);
  if (ax < threshold && ay < threshold) return <div style={{...full, ...style}}>{children}</div>;
  const rotated = angle !== 0;
  return (
    <div style={{...full, ...style}}>
      <svg width={0} height={0} style={{position: 'absolute'}} aria-hidden>
        <defs>
          <filter id={id} x={rotated ? '-40%' : '0'} y={rotated ? '-80%' : '0'} width={rotated ? '180%' : '100%'} height={rotated ? '260%' : '100%'} colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`${ax.toFixed(2)} ${ay.toFixed(2)}`} edgeMode={rotated ? 'none' : 'duplicate'} />
          </filter>
        </defs>
      </svg>
      {rotated ? (
        <div style={{...full, transform: `rotate(${angle}deg)`, filter: `url(#${id})`}}>
          <div style={{...full, transform: `rotate(${-angle}deg)`}}>{children}</div>
        </div>
      ) : (
        <div style={{...full, filter: `url(#${id})`}}>{children}</div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Ramp displacement maps (data URIs, synchronous in Chromium)         */
/* ------------------------------------------------------------------ */
const svgUri = (s: string) => `data:image/svg+xml;utf8,${encodeURIComponent(s)}`;
// R = 0.5 + (x-cx)/1920 (0..1), G = 0.5 + (y-cy)/1920 (0.219..0.781)
const ZOOM_MAP = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${FRAME_W}" height="${FRAME_H}"><defs><linearGradient id="a" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="rgb(0,56,0)"/><stop offset="1" stop-color="rgb(255,56,0)"/></linearGradient><linearGradient id="b" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="rgb(0,0,0)"/><stop offset="1" stop-color="rgb(0,143,0)"/></linearGradient></defs><rect width="${FRAME_W}" height="${FRAME_H}" fill="url(#a)"/><rect width="${FRAME_W}" height="${FRAME_H}" fill="url(#b)" style="mix-blend-mode:plus-lighter"/></svg>`);
// R = 0.5 − (y−cy)/1920 (0.781..0.219), G = 0.5 + (x−cx)/1920 (0..1)  → rotation field
const SPIN_MAP = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${FRAME_W}" height="${FRAME_H}"><defs><linearGradient id="a" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="rgb(199,0,0)"/><stop offset="1" stop-color="rgb(56,0,0)"/></linearGradient><linearGradient id="b" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="rgb(0,0,0)"/><stop offset="1" stop-color="rgb(0,255,0)"/></linearGradient></defs><rect width="${FRAME_W}" height="${FRAME_H}" fill="url(#a)"/><rect width="${FRAME_W}" height="${FRAME_H}" fill="url(#b)" style="mix-blend-mode:plus-lighter"/></svg>`);

/** Preload helper so the first rendered frame already has the map decoded. */
const Preload: React.FC<{src: string}> = ({src}) => <Img src={src} style={{position: 'absolute', width: 2, height: 2, opacity: 0, pointerEvents: 'none'}} />;

const avgChain = (n: number, prefix: string) => {
  // running average of results `${prefix}0..n-1` → final result `${prefix}avg`
  const out: React.ReactNode[] = [];
  for (let k = 1; k < n; k++) {
    out.push(<feComposite key={k} in={k === 1 ? `${prefix}0` : `${prefix}acc${k - 1}`} in2={`${prefix}${k}`} operator="arithmetic" k1={0} k2={k / (k + 1)} k3={1 / (k + 1)} k4={0} result={k === n - 1 ? `${prefix}avg` : `${prefix}acc${k}`} />);
  }
  return out;
};

const DispStack: React.FC<{id: string; map: string; scales: number[]; soften: number}> = ({id, map, scales, soften}) => (
  <svg width={0} height={0} style={{position: 'absolute'}} aria-hidden>
    <defs>
      <filter id={id} x={0} y={0} width={FRAME_W} height={FRAME_H} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feImage href={map} x={0} y={0} width={FRAME_W} height={FRAME_H} preserveAspectRatio="none" result="map" />
        {scales.map((s, k) => (
          <feDisplacementMap key={k} in="SourceGraphic" in2="map" scale={+s.toFixed(2)} xChannelSelector="R" yChannelSelector="G" result={`d${k}`} />
        ))}
        {scales.length > 1 ? avgChain(scales.length, 'd') : null}
        {soften > 0.3 ? <feGaussianBlur in={scales.length > 1 ? 'davg' : 'd0'} stdDeviation={soften.toFixed(2)} edgeMode="duplicate" /> : null}
      </filter>
    </defs>
  </svg>
);

export type ZoomBlurProps = {
  /** streak length as a fraction of the distance from centre (0.1 = 10% magnification range). 0 = off. */
  amount: number;
  /** number of samples (3–8, default 6). Cost ≈ samples × ~8 ms at 1080p. */
  samples?: number;
  /** 'in' = streaks grow outward from the image (default, flying forward); 'center' = symmetric */
  mode?: 'in' | 'center';
  style?: React.CSSProperties;
  children?: React.ReactNode;
};
/** Radial zoom blur around frame centre. Also fills borders when the content is scaled below 1. */
export const ZoomBlur: React.FC<ZoomBlurProps> = ({amount, samples = 6, mode = 'in', style, children}) => {
  const id = useFid('zb');
  if (Math.abs(amount) < 0.004) return <div style={{...full, ...style}}>{children}</div>;
  const n = Math.max(2, Math.round(samples));
  const scales = Array.from({length: n}, (_, k) => {
    const u = k / (n - 1);
    const m = mode === 'in' ? 1 + amount * u : 1 + amount * (u - 0.5);
    return FRAME_W * (1 / m - 1);
  });
  return (
    <div style={{...full, ...style}}>
      <Preload src={ZOOM_MAP} />
      <DispStack id={id} map={ZOOM_MAP} scales={scales} soften={Math.min(6, amount * 18)} />
      <div style={{...full, filter: `url(#${id})`}}>{children}</div>
    </div>
  );
};

export type SpinBlurProps = {
  /** total blur arc in degrees (e.g. 6). 0 = off. Small-angle approximation: keep ≤ 14°. */
  angle: number;
  samples?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};
/** Rotational blur around frame centre (single DOM render, N-sample displacement). */
export const SpinBlur: React.FC<SpinBlurProps> = ({angle, samples = 6, style, children}) => {
  const id = useFid('sb');
  if (Math.abs(angle) < 0.15) return <div style={{...full, ...style}}>{children}</div>;
  const n = Math.max(2, Math.round(samples));
  const a = Math.min(14, Math.abs(angle)) * (Math.PI / 180);
  const scales = Array.from({length: n}, (_, k) => FRAME_W * a * (k / (n - 1) - 0.5));
  return (
    <div style={{...full, ...style}}>
      <Preload src={SPIN_MAP} />
      <DispStack id={id} map={SPIN_MAP} scales={scales} soften={Math.min(4, Math.abs(angle) * 0.4)} />
      <div style={{...full, filter: `url(#${id})`}}>{children}</div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Glitch                                                               */
/* ------------------------------------------------------------------ */
export type GlitchFxProps = {
  /** 0..1 intensity (0 = no filter) */
  amount: number;
  /** changes the slice pattern — pass a frame-derived integer for per-frame variation */
  seed?: number;
  /** max horizontal slice shift in px at amount 1 (default 160) */
  shift?: number;
  /** RGB split px at amount 1 (default 14) */
  rgb?: number;
  /** slice density (cycles per px vertically, default 0.012 → chunky bands) */
  density?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};
export const GlitchFx: React.FC<GlitchFxProps> = ({amount, seed = 1, shift = 160, rgb = 14, density = 0.012, style, children}) => {
  const id = useFid('gl');
  if (amount < 0.01) return <div style={{...full, ...style}}>{children}</div>;
  const n = 24;
  const table = Array.from({length: n}, (_, i) => (rand(seed * 7.13 + i * 3.7) < 0.55 ? 0.5 : rand(seed * 1.9 + i * 11.3))).map((v) => v.toFixed(3)).join(' ');
  const s = Math.round(rand(seed * 3.3) * 1000);
  const k = rgb * amount;
  return (
    <div style={{...full, ...style}}>
      <svg width={0} height={0} style={{position: 'absolute'}} aria-hidden>
        <defs>
          <filter id={id} x={0} y={0} width={FRAME_W} height={FRAME_H} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency={`0 ${(density * (0.6 + rand(seed * 5.1))).toFixed(5)}`} numOctaves={1} seed={s} result="n" />
            <feComponentTransfer in="n" result="ns">
              <feFuncR type="linear" slope={3.2} intercept={-1.1} />
            </feComponentTransfer>
            <feComponentTransfer in="ns" result="map">
              <feFuncR type="discrete" tableValues={table} />
              <feFuncG type="discrete" tableValues="0.5" />
              <feFuncB type="discrete" tableValues="0.5" />
              <feFuncA type="discrete" tableValues="1" />
            </feComponentTransfer>
            <feDisplacementMap in="SourceGraphic" in2="map" scale={+(shift * amount).toFixed(1)} xChannelSelector="R" yChannelSelector="G" result="d" />
            <feColorMatrix in="d" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
            <feOffset in="r" dx={k.toFixed(1)} dy={0} result="r2" />
            <feColorMatrix in="d" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
            <feColorMatrix in="d" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
            <feOffset in="b" dx={(-k).toFixed(1)} dy={0} result="b2" />
            <feBlend in="r2" in2="g" mode="screen" result="rg" />
            <feBlend in="rg" in2="b2" mode="screen" />
          </filter>
        </defs>
      </svg>
      <div style={{...full, filter: `url(#${id})`}}>{children}</div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Echo (multi-sample trail)                                            */
/* ------------------------------------------------------------------ */
export type EchoProps = {
  t: number;
  /** render the subject at time tt */
  render: (tt: number) => React.ReactNode;
  /** ghost copies (default 4). Cost: (n+1)× render. */
  n?: number;
  /** total time span (frames) covered by the ghosts (default 3 = ~one 180° shutter at fast whips) */
  span?: number;
  /** opacity of the nearest ghost, each next one × decay (default 0.55 / 0.6) */
  first?: number;
  decay?: number;
  /** blend of ghosts (default 'screen' — luminous trails on dark) */
  blend?: React.CSSProperties['mixBlendMode'];
};
/** Ghost trail: draws `n` copies at earlier times with decreasing opacity, then the subject on top. */
export const Echo: React.FC<EchoProps> = ({t, render, n = 4, span = 3, first = 0.55, decay = 0.6, blend = 'screen'}) => (
  <AbsoluteFill>
    {Array.from({length: n}, (_, i) => n - i).map((i) => (
      <AbsoluteFill key={i} style={{opacity: first * Math.pow(decay, i - 1), mixBlendMode: blend}}>{render(t - (span * i) / n)}</AbsoluteFill>
    ))}
    <AbsoluteFill>{render(t)}</AbsoluteFill>
  </AbsoluteFill>
);
