// Motion-blur family. Every effect is ONE SVG filter on a full-frame wrapper (the DOM renders once) built only from
// primitives that are cheap in Chromium's software path: 1-D feGaussianBlur (edgeMode=duplicate), feOffset,
// feImage of small cached bitmap masks, feComposite, feColorMatrix. (2-D SVG blurs and feDisplacementMap/
// feTurbulence were benchmarked at +1…+4 s per frame and are deliberately NOT used.)
//
//  • <MotionBlur>  directional blur (any angle) driven by velocity             ≈ +0.15 s
//  • <ZoomBlur>    radial zoom streaks, sharp centre (sector-masked 1-D blurs)  ≈ +0.7 s
//  • <SpinBlur>    rotational blur (same, tangential)                          ≈ +0.7 s
//  • <GlitchFx>    band-slice displacement + red/cyan channel split            ≈ +1.0 s
//  • <Echo>        ghost trail: re-renders the subject n times (n × subject cost)
// Filter ids are unique per instance (React useId). Wrappers are full-frame 1920×1080 boxes at (0,0).
import React, {useId} from 'react';
import {AbsoluteFill, Img} from 'remotion';
import {FRAME_H, FRAME_W} from './camera';
import {bandMask, sectorMask} from './masks';

const useFid = (p: string) => `cine-${p}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
const full: React.CSSProperties = {position: 'absolute', left: 0, top: 0, width: FRAME_W, height: FRAME_H};
const REGION = {x: 0, y: 0, width: FRAME_W, height: FRAME_H, filterUnits: 'userSpaceOnUse' as const, colorInterpolationFilters: 'sRGB' as const};
const svgHidden: React.CSSProperties = {position: 'absolute', width: 0, height: 0, overflow: 'hidden'};

/** Ensures a data-URL bitmap is decoded before the frame is captured (Remotion delayRender via <Img>). */
const Preload: React.FC<{src: string}> = ({src}) => (src ? <Img src={src} style={{position: 'absolute', left: 0, top: 0, width: 2, height: 2, opacity: 0, pointerEvents: 'none'}} /> : null);

/** Gaussian std (px) that reads like a camera shutter for an image moving `speed` px/frame. shutter 0.5 = 180°. */
export const shutterBlur = (speed: number, shutter = 0.5) => Math.abs(speed) * shutter * 0.42;

/* ------------------------------------------------------------------ */
/* Directional                                                         */
/* ------------------------------------------------------------------ */
export type MotionBlurProps = {
  /** image velocity in px/frame (x, y). Blur follows the direction (any angle). */
  vx?: number; vy?: number;
  /** shutter fraction (0.5 = 180°, 1 = smeary 360°). */
  shutter?: number;
  /** clamp for the blur std (px, default 150) */
  max?: number;
  /** OR raw axis-aligned std devs in px (ignores vx/vy) */
  sx?: number; sy?: number;
  /** below this std (px) no filter is applied (default 0.6) */
  threshold?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

/** Directional motion blur on a full-frame wrapper (anisotropic feGaussianBlur, edges clamped — no dark borders). */
export const MotionBlur: React.FC<MotionBlurProps> = ({vx = 0, vy = 0, shutter = 0.5, max = 150, sx, sy, threshold = 0.6, style, children}) => {
  const id = useFid('mb');
  let ax: number, ay: number, angle = 0;
  if (sx !== undefined || sy !== undefined) { ax = sx ?? 0; ay = sy ?? 0; }
  else {
    const L = Math.min(max, shutterBlur(Math.hypot(vx, vy), shutter));
    if (Math.abs(vy) <= Math.abs(vx) * 0.1) { ax = L; ay = 0; }
    else if (Math.abs(vx) <= Math.abs(vy) * 0.1) { ax = 0; ay = L; }
    else { ax = L; ay = 0; angle = (Math.atan2(vy, vx) * 180) / Math.PI; }
  }
  ax = Math.min(max, ax); ay = Math.min(max, ay);
  if (ax < threshold && ay < threshold) return <div style={{...full, ...style}}>{children}</div>;
  if (angle !== 0) {
    // blur along the rotated x axis: outer rotated by θ carries the filter, inner rotates content back
    return (
      <div style={{...full, ...style}}>
        <svg style={svgHidden} aria-hidden><defs>
          <filter id={id} x="-40%" y="-80%" width="180%" height="260%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`${ax.toFixed(2)} 0`} />
          </filter>
        </defs></svg>
        <div style={{...full, transform: `rotate(${angle.toFixed(3)}deg)`, filter: `url(#${id})`}}>
          <div style={{...full, transform: `rotate(${(-angle).toFixed(3)}deg)`}}>{children}</div>
        </div>
      </div>
    );
  }
  return (
    <div style={{...full, ...style}}>
      <svg style={svgHidden} aria-hidden><defs>
        <filter id={id} {...REGION}>
          <feGaussianBlur stdDeviation={`${ax.toFixed(2)} ${ay.toFixed(2)}`} edgeMode="duplicate" />
        </filter>
      </defs></svg>
      <div style={{...full, filter: `url(#${id})`}}>{children}</div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Radial: zoom + spin (sector-masked 1-D blurs, sharp centre)          */
/* ------------------------------------------------------------------ */
const SectorBlur: React.FC<{px: number; spin: boolean; core: number; style?: React.CSSProperties; children?: React.ReactNode; prefix: string}> = ({px, spin, core, style, children, prefix}) => {
  const id = useFid(prefix);
  if (px < 0.6) return <div style={{...full, ...style}}>{children}</div>;
  const lr = sectorMask(true, core), tb = sectorMask(false, core);
  const s = px.toFixed(2);
  return (
    <div style={{...full, ...style}}>
      <Preload src={lr} />
      <Preload src={tb} />
      <svg style={svgHidden} aria-hidden><defs>
        <filter id={id} {...REGION}>
          <feGaussianBlur in="SourceGraphic" stdDeviation={`${s} 0`} edgeMode="duplicate" result="h" />
          <feGaussianBlur in="SourceGraphic" stdDeviation={`0 ${s}`} edgeMode="duplicate" result="v" />
          <feImage href={lr} x={0} y={0} width={FRAME_W} height={FRAME_H} preserveAspectRatio="none" result="mlr" />
          <feImage href={tb} x={0} y={0} width={FRAME_W} height={FRAME_H} preserveAspectRatio="none" result="mtb" />
          <feComposite in="h" in2={spin ? 'mtb' : 'mlr'} operator="in" result="a" />
          <feComposite in="v" in2={spin ? 'mlr' : 'mtb'} operator="in" result="b" />
          <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="a" /><feMergeNode in="b" /></feMerge>
        </filter>
      </defs></svg>
      <div style={{...full, filter: `url(#${id})`}}>{children}</div>
    </div>
  );
};

export type ZoomBlurProps = {
  /** streak blur std in px at the frame edge (0 = off). 10 = subtle, 30 = fast push, 60+ = warp. */
  px: number;
  /** fraction of the half-diagonal around the centre that stays sharp (default 0.1) */
  core?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};
/** Radial zoom blur around frame centre (streaks point outward, centre sharp). ≈ +0.7 s/frame at 1080p. */
export const ZoomBlur: React.FC<ZoomBlurProps> = ({px, core = 0.1, style, children}) => <SectorBlur px={px} spin={false} core={core} style={style} prefix="zb">{children}</SectorBlur>;

export type SpinBlurProps = {
  /** tangential blur std in px at the frame edge (0 = off). Use spinBlurPx(deg/frame) to derive from angular speed. */
  px: number;
  core?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};
/** Rotational blur around frame centre (tangential streaks, centre sharp). ≈ +0.7 s/frame at 1080p. */
export const SpinBlur: React.FC<SpinBlurProps> = ({px, core = 0.08, style, children}) => <SectorBlur px={px} spin core={core} style={style} prefix="sb">{children}</SectorBlur>;

/** Blur px for a spin of `degPerFrame` (measured at ~800 px from centre). */
export const spinBlurPx = (degPerFrame: number, shutter = 0.5) => shutterBlur((Math.abs(degPerFrame) * Math.PI / 180) * 800, shutter);
/** Blur px for a zoom whose scale changes by `ratePerFrame` (e.g. 0.08 = +8 %/frame), measured at the frame edge. */
export const zoomBlurPx = (ratePerFrame: number, shutter = 0.5) => shutterBlur(Math.abs(ratePerFrame) * 1000, shutter);

/* ------------------------------------------------------------------ */
/* Glitch                                                               */
/* ------------------------------------------------------------------ */
export type GlitchFxProps = {
  /** 0..1 intensity (0 = no filter) */
  amount: number;
  /** slice pattern — pass a frame-derived integer for per-frame variation (patterns are cached mod 16) */
  seed?: number;
  /** max horizontal slice shift in px at amount 1 (default 140) */
  shift?: number;
  /** red/cyan split px at amount 1 (default 12; 0 = skip the split, cheaper) */
  rgb?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};
/** Slice displacement (two band sets shifted opposite ways) + red/cyan channel split. ≈ +1 s/frame at 1080p. */
export const GlitchFx: React.FC<GlitchFxProps> = ({amount, seed = 1, shift = 140, rgb = 12, style, children}) => {
  const id = useFid('gl');
  if (amount < 0.01) return <div style={{...full, ...style}}>{children}</div>;
  const s = Math.abs(Math.round(seed)) % 16;
  const m1 = bandMask(s, 0.6), m2 = bandMask(s + 16, 0.4);
  const sh = shift * amount;
  const sgn = s % 2 ? 1 : -1;
  const k = rgb * amount;
  return (
    <div style={{...full, ...style}}>
      <Preload src={m1} />
      <Preload src={m2} />
      <svg style={svgHidden} aria-hidden><defs>
        <filter id={id} {...REGION}>
          <feImage href={m1} x={0} y={0} width={FRAME_W} height={FRAME_H} preserveAspectRatio="none" result="m1" />
          <feImage href={m2} x={0} y={0} width={FRAME_W} height={FRAME_H} preserveAspectRatio="none" result="m2" />
          <feOffset in="SourceGraphic" dx={(sgn * sh).toFixed(1)} result="o1" />
          <feOffset in="SourceGraphic" dx={(-sgn * sh * 0.55).toFixed(1)} result="o2" />
          <feComposite in="o1" in2="m1" operator="in" result="s1" />
          <feComposite in="o2" in2="m2" operator="in" result="s2" />
          <feMerge result="sl"><feMergeNode in="SourceGraphic" /><feMergeNode in="s1" /><feMergeNode in="s2" /></feMerge>
          {k > 0.5 ? (
            <>
              <feOffset in="sl" dx={k.toFixed(1)} result="sr" />
              <feColorMatrix in="sr" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="rr" />
              <feColorMatrix in="sl" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="gb" />
              <feComposite in="rr" in2="gb" operator="arithmetic" k1={0} k2={1} k3={1} k4={0} />
            </>
          ) : null}
        </filter>
      </defs></svg>
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
  /** ghost copies (default 3). Cost: (n+1)× the subject — echo LIGHT subjects (a logo, a card), not whole worlds. */
  n?: number;
  /** total time span (frames) covered by the ghosts (default 3) */
  span?: number;
  /** opacity of the nearest ghost; each next one × decay */
  first?: number;
  decay?: number;
  /** blend of ghosts (default 'screen' — luminous trails on dark) */
  blend?: React.CSSProperties['mixBlendMode'];
};
/** Ghost trail: draws `n` copies at earlier times with decreasing opacity, then the subject on top. */
export const Echo: React.FC<EchoProps> = ({t, render, n = 3, span = 3, first = 0.5, decay = 0.6, blend = 'screen'}) => (
  <AbsoluteFill>
    {Array.from({length: n}, (_, i) => n - i).map((i) => (
      <AbsoluteFill key={i} style={{opacity: first * Math.pow(decay, i - 1), mixBlendMode: blend}}>{render(t - (span * i) / n)}</AbsoluteFill>
    ))}
    <AbsoluteFill>{render(t)}</AbsoluteFill>
  </AbsoluteFill>
);
