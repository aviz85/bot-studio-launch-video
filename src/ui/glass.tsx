import React from 'react';
import {C, FONT, MONO, clamp, expoOut} from '../lib';
import {useUI, Look, MaybeTheme, Theme} from './theme';
import {Rim, Sheen, GlassUnder, glassRoot} from './skin';

/* =====================================================================
 * GlassPane — base translucent window primitive (look-aware)
 * ===================================================================== */
export type GlassPaneProps = {
  /** size in px (or any CSS length) */
  w?: number | string;
  h?: number | string;
  radius?: number;
  /** render in a specific look (else nearest <UITheme>) */
  look?: Look;
  /** which theme fill: surface (card), glass (thinner), frame (window base), strong (near-opaque) */
  tint?: 'surface' | 'glass' | 'frame' | 'strong';
  /** explicit CSS background (overrides tint) */
  fill?: string;
  /** rim intensity (0 = none, 1 = default, 2 = hot) */
  rim?: number;
  /** top specular + corner light 0..1 */
  specular?: number;
  /** violet outer bloom 0..1.5 */
  glow?: number;
  /** drop shadow + bloom (default true) */
  shadow?: boolean;
  /** backdrop-filter blur px. Default theme.blur (0 → gradient fallback). Only safe when the pane stays fully on screen; see docs/GLASS.md */
  blur?: number;
  /** frost grain / scanline opacity overrides */
  noise?: number;
  scan?: number;
  /** light-sweep progress 0..1 (animate it) */
  sheen?: number;
  /** rim flash 0..1 (e.g. when a layer locks into place) */
  flash?: number;
  /** title bar with brand traffic lights; string = title text */
  titleBar?: boolean | string;
  /** floor reflection opacity (true = 0.32). Uses -webkit-box-reflect; flattens 3D children. */
  reflect?: number | boolean;
  /** gap between pane and reflection (px) */
  reflectGap?: number;
  /** keep children in 3D (no content clipping) */
  preserve3d?: boolean;
  padding?: number | string;
  style?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
  children?: React.ReactNode;
};

export const TRAFFIC = [C.purple, C.amber, C.green];

const TitleBar: React.FC<{th: Theme; title?: string}> = ({th, title}) => (
  <div style={{position: 'relative', height: 52, display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px', borderBottom: `1px solid ${th.divider}`, fontFamily: FONT, flex: 'none'}}>
    {TRAFFIC.map((c) => (
      <div key={c} style={{width: 14, height: 14, borderRadius: 7, background: `radial-gradient(circle at 35% 30%, #fff 0%, ${c} 45%)`, boxShadow: th.dark ? `0 0 10px ${c}, inset 0 0 0 1px rgba(255,255,255,0.3)` : `0 1px 3px rgba(57,41,75,0.3), inset 0 0 0 1px rgba(255,255,255,0.5)`}} />
    ))}
    {title && <div style={{position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: 18, fontWeight: 600, color: th.textSoft, letterSpacing: '0.01em', pointerEvents: 'none'}}>{title}</div>}
  </div>
);

const PaneBody: React.FC<GlassPaneProps> = ({
  w, h, radius = 28, tint = 'surface', fill, rim = 1, specular = 1, glow = 0, shadow = true, blur, noise, scan, sheen, flash = 0,
  titleBar, reflect, reflectGap = 14, preserve3d, padding, style, contentStyle, children,
}) => {
  const th = useUI();
  const bg = fill ?? (tint === 'glass' ? th.surfaceGlass : tint === 'frame' ? th.frame : tint === 'strong' ? th.surfaceStrong : th.surface);
  const root = glassRoot(th, {fill: bg, glow, shadow, blur, flash});
  const refl = reflect === true ? 0.32 : typeof reflect === 'number' ? reflect : 0;
  const tb = titleBar ? <TitleBar th={th} title={typeof titleBar === 'string' ? titleBar : undefined} /> : null;
  return (
    <div
      style={{
        position: 'relative', width: w, height: h, borderRadius: radius, fontFamily: FONT, color: th.text,
        transformStyle: preserve3d ? 'preserve-3d' : undefined,
        ...(refl > 0 ? ({WebkitBoxReflect: `below ${reflectGap}px linear-gradient(to bottom, transparent 0%, transparent ${Math.round(100 - 45 * clamp(refl * 2))}%, rgba(255,255,255,${refl}) 100%)`} as React.CSSProperties) : {}),
        ...style,
      }}
    >
      {/* backplate: fill, shadow, specular, grain, scanlines */}
      <div style={{position: 'absolute', inset: 0, borderRadius: 'inherit', overflow: 'hidden', zIndex: 0, ...root}}>
        {th.look !== 'solid' && <GlassUnder th={th} specular={specular} noise={noise} scan={scan} z={0} />}
      </div>
      {/* content */}
      <div
        style={{
          position: 'relative', width: '100%', height: h === undefined ? undefined : '100%', boxSizing: 'border-box', borderRadius: 'inherit',
          display: 'flex', flexDirection: 'column',
          overflow: preserve3d ? undefined : 'hidden', transformStyle: preserve3d ? 'preserve-3d' : undefined,
          // coplanar 3D siblings sort unreliably in Chromium: lift content 1px above the backplate
          transform: preserve3d ? 'translateZ(1px)' : undefined,
        }}
      >
        {tb}
        <div style={{position: 'relative', flex: 1, padding, boxSizing: 'border-box', transformStyle: preserve3d ? 'preserve-3d' : undefined, ...contentStyle}}>{children}</div>
      </div>
      {/* front: sheen + rim */}
      {sheen !== undefined && sheen > 0 && sheen < 1 && (
        <div style={{position: 'absolute', inset: 0, borderRadius: 'inherit', overflow: 'hidden', pointerEvents: 'none'}}>
          <Sheen p={sheen} color={th.dark ? '200,235,255' : '255,255,255'} strength={th.dark ? 0.4 : 0.65} z={0} />
        </div>
      )}
      <Rim gradient={th.rim || 'linear-gradient(150deg, rgba(255,255,255,0.9), rgba(255,255,255,0.2))'} width={th.rimWidth} opacity={(th.rim ? rim : rim * 0.5) * (1 + flash)} z={0} />
      {flash > 0 && <Rim gradient={`linear-gradient(150deg, rgba(${th.glow2},1), rgba(255,255,255,0.95) 40%, rgba(${th.glow},0.9))`} width={th.rimWidth + 1.5} opacity={flash} z={0} />}
    </div>
  );
};

/** Base translucent window. Look-aware (frost / holo / solid). */
export const GlassPane: React.FC<GlassPaneProps> = (p) => <MaybeTheme look={p.look}><PaneBody {...p} /></MaybeTheme>;

/* =====================================================================
 * ExplodedStack — fan a list of panes out in Z and re-stack
 * ===================================================================== */
export type ExplodedStackProps = {
  /** back → front */
  items: React.ReactNode[];
  /** box every item is centred in */
  w: number;
  h: number;
  /** 0 = stacked, 1 = exploded (can exceed 1) */
  explode: number;
  /** Z distance between neighbours at explode = 1 (px) */
  spacing?: number;
  /** per-item lateral offset at explode = 1 (px) */
  dx?: number;
  dy?: number;
  /** per-item extra rotation at explode = 1 (deg) — fans the deck */
  rx?: number;
  ry?: number;
  rz?: number;
  /** spread symmetric around the middle item (default) or from the back item */
  center?: boolean;
  /** 0..0.9: later items start exploding later (cascade) */
  stagger?: number;
  /** 0..1 assembly progress (items fly in from depth). Omit = assembled */
  assemble?: number;
  /** fraction of the assembly timeline between consecutive items (default 0.12) */
  assembleStagger?: number;
  /** Z the items fly in from (negative = from behind, positive = from the camera) */
  flyZ?: number;
  flyY?: number;
  style?: React.CSSProperties;
};

/** progress of item i in a staggered 0..1 timeline */
export const staggerP = (p: number, i: number, n: number, stg: number) => {
  const span = Math.max(0.05, 1 - stg * Math.max(0, n - 1));
  return clamp((p - i * stg) / span);
};

export const ExplodedStack: React.FC<ExplodedStackProps> = ({items, w, h, explode, spacing = 160, dx = 0, dy = 0, rx = 0, ry = 0, rz = 0, center = true, stagger = 0, assemble, assembleStagger = 0.12, flyZ = -1600, flyY = 0, style}) => {
  const n = items.length;
  return (
    <div style={{position: 'relative', width: w, height: h, transformStyle: 'preserve-3d', ...style}}>
      {items.map((it, i) => {
        const c = center ? i - (n - 1) / 2 : i;
        // cascade: with stagger, item i reaches full spread later (continuous at explode = 1, linear beyond)
        const ee = stagger > 0 ? staggerP(Math.min(explode, 1), i, n, stagger / Math.max(1, n - 1)) * Math.max(1, explode) : explode;
        const a = assemble === undefined ? 1 : expoOut(staggerP(assemble, i, n, assembleStagger));
        const z = c * spacing * ee + (1 - a) * flyZ;
        const op = assemble === undefined ? 1 : clamp(a * 3);
        return (
          <div
            key={i}
            style={{
              position: 'absolute', left: 0, top: 0, width: w, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', transformStyle: 'preserve-3d',
              transform: `translate3d(${c * dx * ee}px, ${c * dy * ee + (1 - a) * flyY}px, ${z}px) rotateX(${c * rx * ee + (1 - a) * 18}deg) rotateY(${c * ry * ee}deg) rotateZ(${c * rz * ee}deg)`,
              opacity: op < 1 ? op : undefined,
            }}
          >
            {it}
          </div>
        );
      })}
    </div>
  );
};

/* =====================================================================
 * Beam3D — thin light beam between two 3D points (crossed ribbons)
 * ===================================================================== */
export const Beam3D: React.FC<{
  a: [number, number, number];
  b: [number, number, number];
  /** 0..1 intensity */
  o?: number;
  thick?: number;
  color?: string; // rgb triplet
  /** travelling pulse position 0..1 (undefined = none) */
  pulse?: number;
  /** draw-on progress 0..1 */
  draw?: number;
}> = ({a, b, o = 1, thick = 2, color = '127,231,255', pulse, draw = 1}) => {
  if (o <= 0.002 || draw <= 0) return null;
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const L = Math.hypot(dx, dy, dz);
  if (L < 1) return null;
  const phi = Math.asin(dy / L);
  const theta = Math.atan2(-dz, dx);
  const len = L * clamp(draw);
  const ribbon = (rot: string) => (
    <div style={{position: 'absolute', left: 0, top: -thick * 3, width: len, height: thick * 6, transform: rot, transformOrigin: '0 50%'}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: thick * 2, height: thick * 2, borderRadius: thick, background: `linear-gradient(90deg, rgba(${color},0) 0%, rgba(${color},${0.55 * o}) 18%, rgba(${color},${0.55 * o}) 82%, rgba(${color},0) 100%)`}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: thick * 2.5, height: thick, background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,${0.85 * o}) 30%, rgba(255,255,255,${0.85 * o}) 70%, rgba(255,255,255,0) 100%)`}} />
      {pulse !== undefined && pulse > 0 && pulse < 1 && (
        <div style={{position: 'absolute', left: `${pulse * 100}%`, top: 0, width: Math.max(30, len * 0.18), height: thick * 6, marginLeft: -Math.max(30, len * 0.18) / 2, borderRadius: thick * 3, background: `radial-gradient(closest-side, rgba(255,255,255,${o}), rgba(${color},${0.7 * o}) 45%, rgba(${color},0))`}} />
      )}
    </div>
  );
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformStyle: 'preserve-3d', transform: `translate3d(${a[0]}px, ${a[1]}px, ${a[2]}px) rotateY(${theta}rad) rotateZ(${phi}rad)`}}>
      <div style={{position: 'absolute', left: 0, top: 0, transformStyle: 'preserve-3d'}}>
        {ribbon('')}
        {ribbon('rotateX(90deg)')}
      </div>
    </div>
  );
};

/* =====================================================================
 * TypedChip — floating typed-signal chip ("enjoyment · 2", "goal_clear · yes 0.94")
 * ===================================================================== */
export type SignalKind = 'score' | 'noul' | 'choice' | 'field' | 'fn';
const KIND_GLYPH: Record<SignalKind, string> = {score: 'Σ', noul: '✓', choice: '◆', field: '⌁', fn: 'ƒ'};

export const TypedChip: React.FC<{
  name: string;
  value: string | number;
  conf?: number | string;
  kind?: SignalKind;
  look?: Look;
  /** base font size — render natively large for close-ups (default 26) */
  size?: number;
  /** reveal 0..1 */
  p?: number;
  /** extra emission 0..1 (e.g. kick) */
  pulse?: number;
  glow?: number;
  /** accent tone */
  tone?: 'green' | 'purple' | 'amber' | 'cyan';
  style?: React.CSSProperties;
}> = (props) => <MaybeTheme look={props.look}><ChipBody {...props} /></MaybeTheme>;

const ChipBody: React.FC<React.ComponentProps<typeof TypedChip>> = ({name, value, conf, kind = 'score', size = 26, p = 1, pulse = 0, glow = 0.6, tone, style}) => {
  const th = useUI();
  const tn = tone ?? (kind === 'noul' ? 'green' : kind === 'choice' ? 'cyan' : kind === 'fn' ? 'amber' : 'purple');
  const acc = tn === 'green' ? th.sig.green : tn === 'amber' ? th.sig.amber : tn === 'cyan' ? (th.dark ? '#7FE7FF' : '#1F9DBA') : th.dark ? '#C3AEFF' : C.purpleDeep;
  const accRgb = tn === 'green' ? (th.dark ? '69,227,176' : '54,153,125') : tn === 'amber' ? '236,175,66' : tn === 'cyan' ? '127,231,255' : '140,107,234';
  const pe = expoOut(clamp(p));
  const s = size;
  const g = glow + pulse;
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: 'relative', display: 'inline-flex', alignItems: 'center', gap: s * 0.42, padding: `${s * 0.36}px ${s * 0.62}px ${s * 0.36}px ${s * 0.36}px`, borderRadius: 999, whiteSpace: 'nowrap',
        fontFamily: MONO, fontSize: s, color: th.text, opacity: clamp(p * 2.5), transform: `translateY(${(1 - pe) * s * 0.8}px)`,
        background: th.dark ? 'linear-gradient(160deg, rgba(46,26,86,0.78), rgba(16,8,34,0.72))' : 'linear-gradient(160deg, rgba(255,255,255,0.9), rgba(242,236,255,0.78))',
        boxShadow: [
          th.dark ? `inset 0 0 0 1.5px rgba(${accRgb},${0.55 + 0.4 * pulse})` : `inset 0 0 0 1.5px rgba(255,255,255,0.95)`,
          th.dark ? 'inset 0 1px 0 rgba(255,255,255,0.25)' : `inset 0 -1px 0 rgba(${accRgb},0.25)`,
          `0 ${s * 0.5}px ${s * 1.2}px -${s * 0.6}px rgba(10,4,24,0.6)`,
          g > 0 ? `0 0 ${Math.round(s * 1.3 * g)}px rgba(${accRgb},${(th.dark ? 0.55 : 0.4) * Math.min(1.4, g)})` : '',
        ].filter(Boolean).join(', '),
        ...style,
      }}
    >
      <div style={{width: s * 1.35, height: s * 1.35, borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 800, fontSize: s * 0.72, color: th.dark ? '#0B0618' : '#fff', background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.9), ${acc} 55%)`, boxShadow: `0 0 ${s * 0.6 * (0.5 + g)}px rgba(${accRgb},0.7)`}}>{KIND_GLYPH[kind]}</div>
      <span style={{color: th.textSoft}}>{name}</span>
      <span style={{color: th.textFaint}}>·</span>
      <span style={{color: acc, fontWeight: 700, textShadow: th.dark ? `0 0 ${s * 0.5}px rgba(${accRgb},0.8)` : undefined}}>{value}</span>
      {conf !== undefined && <span style={{fontSize: s * 0.72, color: th.textSoft, padding: `${s * 0.08}px ${s * 0.3}px`, borderRadius: 999, background: th.dark ? 'rgba(255,255,255,0.07)' : 'rgba(140,107,234,0.1)'}}>{typeof conf === 'number' ? conf.toFixed(2) : conf}</span>}
    </div>
  );
};

/* =====================================================================
 * Reflect — wrap any flat node with a floor reflection (box-reflect)
 * ===================================================================== */
export const Reflect: React.FC<{gap?: number; opacity?: number; fade?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({gap = 12, opacity = 0.3, fade = 0.45, children, style}) => (
  <div style={{display: 'inline-block', WebkitBoxReflect: `below ${gap}px linear-gradient(to bottom, transparent 0%, transparent ${Math.round((1 - fade) * 100)}%, rgba(255,255,255,${opacity}) 100%)`, ...style} as React.CSSProperties}>{children}</div>
);

/**
 * Soft light pool under a pane (cheap fake reflection for 3D scenes). Place inside a preserve-3d parent.
 * `floor` lays it flat on a floor plane (rotateX 90°: reads better from high angles but costs more — the plane can get huge on screen).
 */
export const LightPool: React.FC<{x: number; y: number; w: number; d?: number; o?: number; color?: string; z?: number; floor?: boolean}> = ({x, y, w, d = 260, o = 0.5, color = '140,107,234', z = 0, floor}) => (
  <div style={{position: 'absolute', left: x - w / 2, top: floor ? y : y - d / 2, width: w, height: d, transformOrigin: '50% 0%', transform: floor ? `translateZ(${z}px) rotateX(90deg)` : `translateZ(${z}px)`, background: `radial-gradient(50% 50% at 50% ${floor ? 0 : 50}%, rgba(${color},${o}), rgba(${color},${o * 0.3}) 45%, transparent 75%)`, pointerEvents: 'none'}} />
);

