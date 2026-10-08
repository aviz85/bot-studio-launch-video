import React from 'react';
import {C, FONT, DISPLAY, MONO, prog, expoOut, backOut, clamp, lerp} from '../lib';
import {Icon} from './kit';
import {APP_W, APP_H, Sidebar, TopBar, ChatPanel} from './app';
import {METRICS, signalValue, GNode, GEdge, edgePath} from './screens';
import {useUI, Look, MaybeTheme, Theme, sigColor, withA} from './theme';
import {GlassPane, Beam3D, LightPool, staggerP, TRAFFIC} from './glass';

/** Camera rotation to cancel so a flat element faces the viewer (billboard). Pass the same angles your Stage uses. */
export type Face = {rx?: number; ry?: number; rz?: number};
export const billboard = (face?: Face) => (face ? `rotateZ(${-(face.rz ?? 0)}deg) rotateY(${-(face.ry ?? 0)}deg) rotateX(${-(face.rx ?? 0)}deg)` : '');

const hexRgb = (hex: string) => {
  if (!hex.startsWith('#') || hex.length !== 7) return '160,130,255';
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};

/* =====================================================================
 * HoloAppFrame — the app window as separate translucent layers in Z
 * ===================================================================== */
export type HoloAppFrameProps = {
  /** local frame for content animations */
  t: number;
  /** main area content (940×895). A function receives the current explode amount. */
  main: React.ReactNode | ((ctx: {explode: number; t: number}) => React.ReactNode);
  /** chat panel override (360×895) */
  chat?: React.ReactNode;
  active?: string;
  title?: string;
  look?: Look;
  /** 0 = assembled, 1 = exploded, >1 = further */
  explode?: number;
  /** Z distance per layer unit at explode = 1 (px) */
  spacing?: number;
  /** lateral spread at explode = 1 (px): sidebar left, chat right, top bar up */
  spread?: number;
  /** per-layer rotateY fan at explode = 1 (deg) */
  fan?: number;
  /** 0..1 assembly progress: layers fly in from depth and lock. Omit = assembled */
  assemble?: number;
  assembleStagger?: number;
  /** Z the layers fly in from (default -1800 = from depth; positive = from camera) */
  flyZ?: number;
  /** light beams between layers 0..1 */
  beams?: number;
  /** outer bloom of the base window */
  glow?: number;
  /** light sweep progress 0..1 (offset per layer) */
  sheen?: number;
  /** sidebar reveal clock (default 999 = shown) */
  navT?: number;
  /** floating title strip with brand traffic lights above the window */
  chrome?: boolean | string;
  /** light pool on the floor under the window 0..1 */
  pool?: number;
  /** backing glass pane behind the main area (default true) */
  mainPane?: boolean;
  style?: React.CSSProperties;
};

type LayerDef = {key: string; x: number; y: number; w: number; h: number; zu: number; sx: number; sy: number; node: React.ReactNode; anchors?: [number, number][]};

export const HoloAppFrame: React.FC<HoloAppFrameProps> = (p) => <MaybeTheme look={p.look}><HoloAppBody {...p} /></MaybeTheme>;

const HoloAppBody: React.FC<HoloAppFrameProps> = ({
  t, main, chat, active = 'Live Dashboard', title, explode = 0, spacing = 150, spread = 60, fan = 0, assemble, assembleStagger = 0.13, flyZ = -1800,
  beams = 0, glow = 0, sheen, navT = 999, chrome, pool = 0, mainPane = true, style,
}) => {
  const th = useUI();
  const e = explode;
  const mainNode = typeof main === 'function' ? main({explode: e, t}) : main;
  const layers: LayerDef[] = [];
  if (chrome) {
    layers.push({key: 'chrome', x: 0, y: -66, w: APP_W, h: 50, zu: 0.35, sx: 0, sy: -0.8, node: (
      <GlassPane w={APP_W} h={50} radius={18} tint="frame" glow={0.2} contentStyle={{display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px'}}>
        {TRAFFIC.map((c) => <div key={c} style={{width: 14, height: 14, borderRadius: 7, background: `radial-gradient(circle at 35% 30%, #fff 0%, ${c} 45%)`, boxShadow: th.dark ? `0 0 10px ${c}` : '0 1px 3px rgba(57,41,75,0.3)'}} />)}
        <div style={{flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 600, color: th.textSoft, marginRight: 70}}>{typeof chrome === 'string' ? chrome : 'Bot Studio'}</div>
      </GlassPane>
    )});
  }
  layers.push({key: 'base', x: 0, y: 0, w: APP_W, h: APP_H, zu: 0, sx: 0, sy: 0, node: <GlassPane w={APP_W} h={APP_H} radius={40} tint="frame" glow={glow} />});
  layers.push({key: 'side', x: 12, y: 12, w: 240, h: 976, zu: 0.7, sx: -1, sy: 0, anchors: [[20, 20], [220, 20], [20, 956], [220, 956]], node: (
    <GlassPane w={240} h={976} radius={30} tint="glass" rim={0.8} specular={0.7}>
      <div style={{position: 'absolute', left: -10, top: -12}}><Sidebar active={active} t={navT} /></div>
    </GlassPane>
  )});
  layers.push({key: 'top', x: 276, y: 6, w: 1300, h: 76, zu: 1.1, sx: 0, sy: -0.6, node: <TopBar title={title} />});
  // main: a FLAT backing pane (one composited quad) + the 3D content as a sibling 2px above it.
  // (A preserve-3d GlassPane would split into several 3D quads incl. a masked rim: ~+240 ms/frame.)
  layers.push({key: 'main', x: 252, y: 78, w: 964, h: 912, zu: 1.6, sx: 0, sy: 0, anchors: [[24, 24], [940, 24], [24, 888], [940, 888]], node: (
    <MainLayer pane={mainPane}>{mainNode}</MainLayer>
  )});
  layers.push({key: 'chat', x: 1222, y: 86, w: 360, h: 895, zu: 2.4, sx: 1, sy: 0, anchors: [[24, 24], [336, 24], [24, 871], [336, 871]], node: null});

  const n = layers.length;
  const placed = layers.map((L, i) => {
    // flying from depth (flyZ < 0): reveal front-to-back so no layer passes behind frosted glass; from the camera: back-to-front
    const order = flyZ < 0 ? n - 1 - i : i;
    const r = assemble === undefined ? 1 : staggerP(assemble, order, n, assembleStagger);
    const a = expoOut(r);
    const flash = assemble === undefined ? 0 : r > 0.4 && r < 0.95 ? Math.sin((Math.PI * (r - 0.4)) / 0.55) : 0;
    const ox = L.sx * spread * e;
    const oy = L.sy * spread * e;
    const z = L.zu * spacing * e + (1 - a) * flyZ + i * 2; // +2px/layer: deterministic sort when assembled
    return {L, a, r, flash, ox, oy, z};
  });

  return (
    <div style={{position: 'relative', width: APP_W, height: APP_H, transformStyle: 'preserve-3d', ...style}}>
      {pool > 0 && <LightPool x={APP_W / 2} y={APP_H + 10} w={APP_W * 1.25} d={220} o={0.5 * pool} z={-20} color={th.dark ? '127,231,255' : '190,170,255'} />}
      {placed.map(({L, a, flash, ox, oy, z}, i) => {
        const sh = sheen !== undefined ? clamp(sheen * 1.4 - i * 0.08) : undefined;
        const content = L.key === 'chat' ? (chat ?? <ChatPanel t={t} sheen={sh} flash={flash} />) : L.node;
        const op = clamp(a * 2.5);
        return (
          <div
            key={L.key}
            style={{
              position: 'absolute', left: L.x, top: L.y, width: L.w, height: L.h, transformStyle: 'preserve-3d',
              transform: `translate3d(${ox}px, ${oy}px, ${z}px) rotateY(${fan * L.zu * e}deg) rotateX(${(1 - a) * -16}deg)`,
              opacity: op < 1 ? op : undefined,
            }}
          >
            <LayerFx flash={flash} sheen={L.key === 'chat' ? undefined : sh}>{content}</LayerFx>
          </div>
        );
      })}
      {beams > 0 && e > 0.02 && placed.flatMap(({L, ox, oy, z, a}, li) =>
        (L.anchors ?? []).map(([ax, ay], k) => {
          const u = ((t * 0.018 + k * 0.29 + li * 0.17) % 1 + 1) % 1;
          return (
            <Beam3D
              key={`${L.key}-${k}`}
              a={[L.x + ax, L.y + ay, 0]}
              b={[L.x + ax + ox, L.y + ay + oy, z]}
              o={beams * clamp(e * 2) * clamp(a)}
              color={th.dark ? '127,231,255' : '170,140,255'}
              pulse={u}
              thick={1.5}
            />
          );
        }),
      )}
    </div>
  );
};

const MainLayer: React.FC<{pane: boolean; flash?: number; sheen?: number; children: React.ReactNode}> = ({pane, flash, sheen, children}) => (
  <div style={{position: 'absolute', inset: 0, transformStyle: 'preserve-3d'}}>
    {pane && <GlassPane w={964} h={912} radius={34} tint="glass" rim={0.9} flash={flash} sheen={sheen} />}
    <div style={{position: 'absolute', left: 12, top: 8, width: 940, height: 895, transformStyle: 'preserve-3d', transform: 'translateZ(2px)'}}>{children}</div>
  </div>
);

/** Passes flash/sheen to direct GlassPane children (keeps layer nodes simple). */
const LayerFx: React.FC<{flash: number; sheen?: number; children: React.ReactNode}> = ({flash, sheen, children}) => {
  if (React.isValidElement(children) && (children.type === GlassPane || children.type === MainLayer)) {
    return React.cloneElement(children as React.ReactElement<any>, {flash: Math.max(flash, (children.props as any).flash ?? 0), sheen: (children.props as any).sheen ?? sheen});
  }
  return <>{children}</>;
};

/* =====================================================================
 * SignalBars3D — the Signal Wall as luminous bars (flat wall or 3D field)
 * ===================================================================== */
export type SignalBars3DProps = {
  /** GLOBAL frame (audio-reactive values) */
  f: number;
  /** local frame for the reveal (default 999 = revealed) */
  t?: number;
  reveal?: number;
  live?: number;
  layout?: 'wall' | 'field';
  /** number of bars (default 45 = METRICS) */
  count?: number;
  /** field: columns × rows (default 9×5). wall: bars per row (default count / rows) */
  cols?: number;
  rows?: number;
  barW?: number;
  /** field: bar depth (default barW) */
  barD?: number;
  gap?: number;
  /** height of a value of 1.0 (px) */
  maxH?: number;
  labels?: boolean;
  /** field: grid floor (default true) */
  floor?: boolean;
  /** field: glass threshold planes at 0.30 / 0.62 (default true) */
  thresholds?: boolean;
  /** field: floor rotateX (deg, default 62). 90 = bars standing up facing camera */
  tilt?: number;
  /** field: floor rotateZ (deg) */
  spin?: number;
  /** bar index to highlight (ring + label) */
  highlight?: number;
  look?: Look;
  /** custom value function */
  values?: (i: number, f: number) => number;
  /** field: also draw the back face of each bar (default false: hidden from usual angles, saves 45 quads) */
  backFaces?: boolean;
  /** wall: show glass back panel + title */
  panel?: boolean;
  style?: React.CSSProperties;
};

export const SignalBars3D: React.FC<SignalBars3DProps> = (p) => <MaybeTheme look={p.look ?? 'holo'}>{p.layout === 'field' ? <BarField {...p} /> : <BarWall {...p} />}</MaybeTheme>;

const barValue = (p: SignalBars3DProps, i: number, t: number, delay: number) => {
  const rp = prog(t, (p.reveal ?? -999) + delay, 30, expoOut);
  const v = (p.values ?? ((k, f) => signalValue(k, f, p.live ?? 1)))(i, p.f);
  return {v: v * rp, rp};
};

const BarWall: React.FC<SignalBars3DProps> = (p) => {
  const th = useUI();
  const count = p.count ?? METRICS.length;
  const rows = p.rows ?? 1;
  const cols = p.cols ?? Math.ceil(count / rows);
  const bw = p.barW ?? 22;
  const gap = p.gap ?? 14;
  const maxH = p.maxH ?? 340;
  const t = p.t ?? 999;
  const labels = p.labels ?? true;
  const labH = labels ? 130 : 0;
  const pitch = bw + gap;
  const W = cols * pitch - gap;
  const rowH = maxH + labH + 40;
  const body = (
    <div style={{position: 'relative', width: W, height: rows * rowH - 40, fontFamily: FONT}}>
      {Array.from({length: rows}).map((_, r) => (
        <div key={r} style={{position: 'absolute', left: 0, top: r * rowH, width: W, height: maxH + labH}}>
          {[0.3, 0.62].map((th0) => (
            <div key={th0} style={{position: 'absolute', left: -12, width: W + 24, top: maxH * (1 - th0), height: 0, borderTop: `1.5px dashed ${withA(th0 > 0.5 ? th.sig.green : th.sig.amber, 0.55)}`}}>
              <div style={{position: 'absolute', right: -6, top: -26, transform: 'translateX(100%)', fontFamily: MONO, fontSize: 16, color: withA(th0 > 0.5 ? th.sig.green : th.sig.amber, 0.9)}}>{th0.toFixed(2)}</div>
            </div>
          ))}
          {Array.from({length: cols}).map((__, c) => {
            const i = r * cols + c;
            if (i >= count) return null;
            const {v, rp} = barValue(p, i, t, c * 0.8 + r * 6);
            const col = sigColor(th, v);
            const rgb = hexRgb(col);
            const hi = p.highlight === i;
            const hgt = Math.max(bw * 0.5, v * maxH);
            return (
              <div key={c} style={{position: 'absolute', left: c * pitch, top: 0, width: bw, height: maxH + labH, opacity: clamp(rp * 2)}}>
                <div style={{position: 'absolute', left: 0, top: 0, width: bw, height: maxH, borderRadius: bw / 2, background: th.track, boxShadow: th.dark ? `inset 0 0 0 1px rgba(180,155,242,0.14)` : 'inset 0 0 0 1px rgba(255,255,255,0.5)'}} />
                <div
                  style={{
                    position: 'absolute', left: 0, bottom: labH, width: bw, height: hgt, borderRadius: bw / 2,
                    background: `linear-gradient(to top, rgba(${rgb},0.25) 0%, rgba(${rgb},0.75) 55%, rgba(${rgb},1) 88%, #fff 100%)`,
                    boxShadow: `0 0 ${Math.round(14 * th.barGlow * (hi ? 2 : 1))}px rgba(${rgb},${th.dark ? 0.75 : 0.5}), inset 0 0 0 1px rgba(255,255,255,0.35)`,
                  }}
                />
                {hi && <div style={{position: 'absolute', left: -10, bottom: labH + hgt - 10, width: bw + 20, height: bw + 20, borderRadius: '50%', border: `2px solid rgba(${rgb},0.9)`, boxShadow: `0 0 18px rgba(${rgb},0.8)`}} />}
                {labels && (
                  <div style={{position: 'absolute', left: bw / 2, top: maxH + 12, transformOrigin: '0 0', transform: 'rotate(55deg)', whiteSpace: 'nowrap', fontSize: 15, fontWeight: hi ? 700 : 500, color: hi ? th.text : th.textSoft}}>{METRICS[i % METRICS.length]}</div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
  if (!p.panel) return <div style={p.style}>{body}</div>;
  return (
    <GlassPane padding="34px 90px 30px 44px" style={p.style}>
      <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 34, marginBottom: 26, textShadow: th.dark ? `0 0 22px rgba(${th.glow},0.6)` : undefined}}>Signal Wall</div>
      {body}
    </GlassPane>
  );
};

const BarField: React.FC<SignalBars3DProps> = (p) => {
  const th = useUI();
  const count = p.count ?? METRICS.length;
  const cols = p.cols ?? 9;
  const rows = p.rows ?? Math.ceil(count / cols);
  const bw = p.barW ?? 56;
  const bd = p.barD ?? bw;
  const gap = p.gap ?? 46;
  const maxH = p.maxH ?? 420;
  const t = p.t ?? 999;
  const tilt = p.tilt ?? 62;
  const spin = p.spin ?? 0;
  const labels = p.labels ?? true;
  const pitch = bw + gap;
  const W = cols * pitch;
  const D = rows * pitch;
  const pad = 70;
  return (
    <div style={{position: 'relative', width: W, height: D, transformStyle: 'preserve-3d', transform: `rotateX(${tilt}deg) rotateZ(${spin}deg)`, fontFamily: FONT, ...p.style}}>
      {(p.floor ?? true) && (
        <div
          style={{
            position: 'absolute', left: -pad, top: -pad, width: W + pad * 2, height: D + pad * 2, borderRadius: 30,
            background: `radial-gradient(70% 70% at 50% 50%, rgba(${th.glow},${th.dark ? 0.22 : 0.18}), transparent 75%), repeating-linear-gradient(0deg, rgba(180,155,242,0.16) 0 1.5px, transparent 1.5px ${pitch / 2}px), repeating-linear-gradient(90deg, rgba(180,155,242,0.16) 0 1.5px, transparent 1.5px ${pitch / 2}px)`,
            boxShadow: `inset 0 0 0 1.5px rgba(${th.glow2},0.35), 0 0 60px -10px rgba(${th.glow},0.5)`,
          }}
        />
      )}
      {/* light pools: one flat layer (batched gradients → 1 composited quad instead of 45) */}
      <div style={{position: 'absolute', left: 0, top: 0, width: W, height: D, transform: 'translateZ(1px)', background: Array.from({length: count}).map((_, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        const {v} = barValue(p, i, t, (c + r) * 1.5);
        const rgb = hexRgb(sigColor(th, v));
        return `radial-gradient(${pitch * 0.8}px ${pitch * 0.8}px at ${c * pitch + pitch / 2}px ${r * pitch + pitch / 2}px, rgba(${rgb},${(0.55 * clamp(v + 0.2)).toFixed(3)}), rgba(${rgb},0))`;
      }).join(', ')}} />
      {labels && (
        <div style={{position: 'absolute', left: 0, top: 0, width: W, height: D, transform: 'translateZ(2px)'}}>
          {Array.from({length: count}).map((_, i) => {
            const c = i % cols, r = Math.floor(i / cols);
            const hi = p.highlight === i;
            return <div key={i} style={{position: 'absolute', left: c * pitch, top: r * pitch + pitch / 2 + bd / 2 + 6, width: pitch, textAlign: 'center', fontSize: 13, lineHeight: 1.1, fontWeight: hi ? 700 : 500, color: hi ? th.text : th.textSoft, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{METRICS[i % METRICS.length]}</div>;
          })}
        </div>
      )}
      {Array.from({length: count}).map((_, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        const {v, rp} = barValue(p, i, t, (c + r) * 1.5);
        const col = sigColor(th, v);
        const rgb = hexRgb(col);
        const hgt = Math.max(4, v * maxH);
        const hi = p.highlight === i;
        const cx = c * pitch + pitch / 2, cy = r * pitch + pitch / 2;
        const edge = `inset 0 0 0 1.5px rgba(${rgb},0.85)`;
        const faceV = `linear-gradient(to bottom, rgba(${rgb},0.16) 0%, rgba(${rgb},0.42) 65%, rgba(${rgb},0.85) 97%, rgba(255,255,255,0.95) 100%)`;
        const faceS = `linear-gradient(to right, rgba(${rgb},0.12) 0%, rgba(${rgb},0.32) 65%, rgba(${rgb},0.7) 97%, rgba(255,255,255,0.8) 100%)`;
        return (
          <div key={`bar${i}`} style={{position: 'absolute', left: cx, top: cy, width: 0, height: 0, transformStyle: 'preserve-3d', opacity: rp < 1 ? clamp(rp * 3) : undefined}}>
            {p.backFaces && <div style={{position: 'absolute', left: -bw / 2, top: 0, width: bw, height: hgt, transformOrigin: '50% 0', transform: `translateY(${-bd / 2}px) rotateX(90deg)`, background: faceV, boxShadow: edge}} />}
            <div style={{position: 'absolute', left: 0, top: -bd / 2, width: hgt, height: bd, transformOrigin: '0 50%', transform: `translateX(${-bw / 2}px) rotateY(-90deg)`, background: faceS, boxShadow: edge}} />
            <div style={{position: 'absolute', left: 0, top: -bd / 2, width: hgt, height: bd, transformOrigin: '0 50%', transform: `translateX(${bw / 2}px) rotateY(-90deg)`, background: faceS, boxShadow: edge}} />
            <div style={{position: 'absolute', left: -bw / 2, top: 0, width: bw, height: hgt, transformOrigin: '50% 0', transform: `translateY(${bd / 2}px) rotateX(90deg)`, background: faceV, boxShadow: edge}} />
            <div style={{position: 'absolute', left: -bw / 2, top: -bd / 2, width: bw, height: bd, transform: `translateZ(${hgt}px)`, background: `radial-gradient(circle at 50% 50%, #fff 0%, rgba(${rgb},1) 55%, rgba(${rgb},0.9) 100%)`, boxShadow: `0 0 ${Math.round((hi ? 40 : 22) * th.barGlow)}px rgba(${rgb},0.9), inset 0 0 0 1.5px rgba(255,255,255,0.7)`}} />
            {hi && <div style={{position: 'absolute', left: -pitch * 0.62, top: -pitch * 0.62, width: pitch * 1.24, height: pitch * 1.24, borderRadius: '50%', transform: 'translateZ(3px)', border: `2.5px solid rgba(${rgb},0.95)`, boxShadow: `0 0 24px rgba(${rgb},0.8), inset 0 0 18px rgba(${rgb},0.5)`}} />}
          </div>
        );
      })}
      {(p.thresholds ?? true) && [0.3, 0.62].map((th0) => {
        // perimeter frame only: a full plane would intersect every bar and force costly BSP splits
        const col = th0 > 0.5 ? th.sig.green : th.sig.amber;
        const rgb = hexRgb(col);
        const x0 = -pad * 0.6, y0 = -pad * 0.6, fw = W + pad * 1.2, fd = D + pad * 1.2, bandW = 16;
        const strip = (st: React.CSSProperties) => <div style={{position: 'absolute', background: `rgba(${rgb},0.10)`, boxShadow: `inset 0 0 0 1.5px rgba(${rgb},0.55)`, ...st}} />;
        return (
          <div key={th0} style={{position: 'absolute', left: x0, top: y0, width: fw, height: fd, transform: `translateZ(${th0 * maxH}px)`, transformStyle: 'preserve-3d'}}>
            {strip({left: 0, top: 0, width: fw, height: bandW, borderRadius: '14px 14px 0 0'})}
            {strip({left: 0, bottom: 0, width: fw, height: bandW, borderRadius: '0 0 14px 14px'})}
            {strip({left: 0, top: bandW, width: bandW, height: fd - bandW * 2})}
            {strip({right: 0, top: bandW, width: bandW, height: fd - bandW * 2})}
            <div style={{position: 'absolute', right: 24, bottom: bandW + 6, fontFamily: MONO, fontSize: 20, color: `rgba(${rgb},0.95)`, textShadow: `0 0 10px rgba(${rgb},0.8)`}}>{th0 > 0.5 ? 'pass ≥ 0.62' : 'wait < 0.30'}</div>
          </div>
        );
      })}
    </div>
  );
};

/* =====================================================================
 * GlassOrbNode — a state as a glowing glass orb
 * ===================================================================== */
export type OrbTone = 'lilac' | 'cyan' | 'green' | 'amber';
const ORB_RGB: Record<OrbTone, string> = {lilac: '160,130,255', cyan: '127,231,255', green: '69,227,176', amber: '255,192,77'};

export type GlassOrbNodeProps = {
  /** diameter px (render natively large for close-ups) */
  size?: number;
  label?: string;
  icon?: string;
  /** 0..1 active glow, pulse rings and orbit ring */
  active?: number;
  /** frame for the pulse animation */
  t?: number;
  tone?: OrbTone;
  /** start state (green, play glyph) */
  start?: boolean;
  look?: Look;
  labelPos?: 'inside' | 'below';
  /** reveal 0..1 */
  p?: number;
  /** billboard against camera rotation */
  face?: Face;
  style?: React.CSSProperties;
};

export const GlassOrbNode: React.FC<GlassOrbNodeProps> = (props) => <MaybeTheme look={props.look}><OrbBody {...props} /></MaybeTheme>;

const OrbBody: React.FC<GlassOrbNodeProps> = ({size = 170, label, icon, active = 0, t = 0, tone, start, labelPos = 'inside', p = 1, face, style}) => {
  const th = useUI();
  const tn: OrbTone = tone ?? (start ? 'green' : 'lilac');
  const rgb = ORB_RGB[tn];
  const s = size;
  const I = start ? Icon.play : icon ? Icon[icon] : null;
  const a = clamp(active);
  if (p <= 0) return null;
  const sc = lerp(0.4, 1, backOut(clamp(p)));
  const dark = th.dark;
  const body = dark
    ? `radial-gradient(circle at 34% 27%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.18) 9%, rgba(255,255,255,0) 22%), radial-gradient(circle at 50% 58%, rgba(${rgb},${0.08 + 0.12 * a}) 0%, rgba(${rgb},${0.16 + 0.14 * a}) 48%, rgba(${rgb},${0.5 + 0.2 * a}) 86%, rgba(235,250,255,0.75) 100%), rgba(14,8,30,0.55)`
    : `radial-gradient(circle at 34% 27%, rgba(255,255,255,1) 0%, rgba(255,255,255,0.5) 10%, rgba(255,255,255,0) 24%), radial-gradient(circle at 50% 58%, rgba(255,255,255,0.55) 0%, rgba(236,228,255,0.6) 45%, rgba(${rgb},${0.5 + 0.2 * a}) 90%, rgba(255,255,255,0.9) 100%)`;
  return (
    <div style={{position: 'relative', width: s, height: s, transform: `${billboard(face)} scale(${sc})`, opacity: p < 0.34 ? clamp(p * 3) : undefined, fontFamily: FONT, ...style}}>
      {/* bloom */}
      <div style={{position: 'absolute', left: -s * 0.55, top: -s * 0.55, width: s * 2.1, height: s * 2.1, borderRadius: '50%', background: `radial-gradient(closest-side, rgba(${rgb},${(dark ? 0.32 : 0.26) * (0.45 + a)}), rgba(${rgb},0) 100%)`}} />
      {/* pulse rings */}
      {a > 0.01 && [0, 0.5].map((k) => {
        const ph = ((t / 46 + k) % 1 + 1) % 1;
        const d = s * (1.04 + 0.75 * ph);
        return <div key={k} style={{position: 'absolute', left: (s - d) / 2, top: (s - d) / 2, width: d, height: d, borderRadius: '50%', boxShadow: `inset 0 0 0 ${2.5 - 1.5 * ph}px rgba(${rgb},${a * (1 - ph) * 0.9}), 0 0 ${14 * (1 - ph)}px rgba(${rgb},${a * (1 - ph) * 0.6})`}} />;
      })}
      {/* orbit ring, back half (2.5D: no plane intersections → no BSP artefacts) */}
      {a > 0.01 && <OrbitHalf s={s} rgb={rgb} a={a} t={t} half="back" />}
      {/* glass body */}
      <div
        style={{
          position: 'absolute', inset: 0, borderRadius: '50%', background: body,
          boxShadow: [
            `inset 0 0 0 ${dark ? 1.5 : 2}px rgba(255,255,255,${dark ? 0.45 : 0.85})`,
            `inset ${-s * 0.06}px ${-s * 0.09}px ${s * 0.18}px rgba(${rgb},${dark ? 0.55 : 0.45})`,
            `inset ${s * 0.04}px ${s * 0.05}px ${s * 0.12}px rgba(255,255,255,${dark ? 0.25 : 0.6})`,
            `0 ${s * 0.12}px ${s * 0.26}px -${s * 0.1}px rgba(0,0,0,0.55)`,
            a > 0 ? `0 0 ${s * 0.45 * a}px rgba(${rgb},${0.85 * a})` : '',
          ].filter(Boolean).join(', '),
        }}
      >
        {/* bottom caustic */}
        <div style={{position: 'absolute', left: '14%', right: '14%', bottom: '5%', height: '34%', borderRadius: '50%', background: `radial-gradient(50% 60% at 50% 100%, rgba(${rgb},${0.55 + 0.35 * a}), rgba(${rgb},0) 100%)`}} />
        {/* specular */}
        <div style={{position: 'absolute', left: '18%', top: '11%', width: '32%', height: '17%', borderRadius: '50%', transform: 'rotate(-32deg)', background: 'radial-gradient(closest-side, rgba(255,255,255,0.95), rgba(255,255,255,0) 100%)'}} />
      </div>
      {/* content */}
      <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: s * 0.04}}>
        {I && <div style={{filter: dark ? `drop-shadow(0 0 ${s * 0.04}px rgba(${rgb},0.9))` : undefined, marginLeft: start ? s * 0.03 : 0}}><I size={s * 0.22} color={dark ? '#fff' : C.plum} sw={2} /></div>}
        {label && labelPos === 'inside' && <div style={{fontSize: Math.max(13, s * 0.105), fontWeight: 650, color: dark ? '#F6F2FF' : C.plum, textShadow: dark ? `0 0 ${s * 0.06}px rgba(${rgb},0.9)` : '0 1px 0 rgba(255,255,255,0.6)', whiteSpace: 'nowrap'}}>{label}</div>}
      </div>
      {a > 0.01 && <OrbitHalf s={s} rgb={rgb} a={a} t={t} half="front" />}
      {label && labelPos === 'below' && (
        <div style={{position: 'absolute', left: '50%', top: s + s * 0.12, transform: 'translateX(-50%)', padding: `${s * 0.04}px ${s * 0.1}px`, borderRadius: 999, whiteSpace: 'nowrap', fontSize: Math.max(14, s * 0.11), fontWeight: 650, color: th.text, background: dark ? 'rgba(20,10,40,0.6)' : 'rgba(255,255,255,0.8)', boxShadow: `inset 0 0 0 1px rgba(${rgb},0.6), 0 0 ${s * 0.12 * (0.4 + a)}px rgba(${rgb},0.5)`}}>{label}</div>
      )}
    </div>
  );
};

/** Half of a tilted orbit ellipse around an orb (back half drawn before the body, front half after). */
const OrbitHalf: React.FC<{s: number; rgb: string; a: number; t: number; half: 'back' | 'front'}> = ({s, rgb, a, t, half}) => {
  const W = s * 1.5, H = s * 0.38;
  const top = s / 2 - H / 2;
  const ang = t * 0.05; // dot angle (rad)
  const dx = Math.cos(ang) * W / 2, dy = Math.sin(ang) * H / 2;
  const dotFront = Math.sin(ang) > 0;
  return (
    <div style={{position: 'absolute', left: (s - W) / 2, top: half === 'back' ? top : s / 2, width: W, height: H / 2 + 8, overflow: 'hidden', pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: 0, top: half === 'back' ? 0 : -H / 2, width: W, height: H, borderRadius: '50%', boxShadow: `inset 0 0 0 2px rgba(${rgb},${(half === 'back' ? 0.45 : 0.85) * a}), 0 0 12px rgba(${rgb},${0.45 * a})`}} />
      {dotFront === (half === 'front') && (
        <div style={{position: 'absolute', left: W / 2 + dx - 6, top: (half === 'back' ? H / 2 : 0) + dy - 6, width: 12, height: 12, borderRadius: 6, background: '#fff', boxShadow: `0 0 12px 4px rgba(${rgb},${a})`, opacity: half === 'back' ? 0.6 : 1}} />
      )}
    </div>
  );
};

/* =====================================================================
 * HoloGraph — orbs + glowing light-trail edges with travelling pulses
 * ===================================================================== */
type QP = ReturnType<typeof edgePath>;
const sampleQuad = (P: QP, n = 24) => {
  const pts: {x: number; y: number; s: number}[] = [];
  let s = 0, px = P.sx, py = P.sy;
  for (let k = 0; k <= n; k++) {
    const u = k / n;
    const x = (1 - u) ** 2 * P.sx + 2 * (1 - u) * u * P.mx + u * u * P.ex;
    const y = (1 - u) ** 2 * P.sy + 2 * (1 - u) * u * P.my + u * u * P.ey;
    s += Math.hypot(x - px, y - py);
    pts.push({x, y, s});
    px = x; py = y;
  }
  return pts;
};
const atLen = (pts: {x: number; y: number; s: number}[], s: number) => {
  for (let k = 1; k < pts.length; k++) {
    if (pts[k].s >= s) {
      const a = pts[k - 1], b = pts[k];
      const u = (s - a.s) / Math.max(0.001, b.s - a.s);
      return {x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u)};
    }
  }
  return pts[pts.length - 1];
};

export type HoloGraphProps = {
  t: number;
  nodes: GNode[];
  edges: GEdge[];
  w: number;
  h: number;
  active?: string;
  /** a light token travels along this node path */
  tokenPath?: string[];
  tokenAt?: number;
  tokenStep?: number;
  /** orb diameter */
  orb?: number;
  /** billboard orbs/labels against the camera rotation */
  face?: Face;
  /** Z lift of the orbs above the edge plane */
  lift?: number;
  /** dotted glow floor under the graph (z = -floorZ) */
  floor?: boolean;
  floorZ?: number;
  /** energy pulse speed (px / frame) */
  speed?: number;
  look?: Look;
  /** explode: lifts nodes further */
  e?: number;
  /** unique id prefix if several graphs share a frame */
  uid?: string;
};

export const HoloGraph: React.FC<HoloGraphProps> = (p) => <MaybeTheme look={p.look ?? 'holo'}><GraphBody {...p} /></MaybeTheme>;

const GraphBody: React.FC<HoloGraphProps> = ({t, nodes, edges, w, h, active, tokenPath, tokenAt = 0, tokenStep = 27, orb = 170, face, lift = 0, floor = true, floorZ = 70, speed = 5, e = 0, uid = 'hg'}) => {
  const th = useUI();
  const N = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const R = orb / 2;
  const geo = edges.map((ed) => {
    const P = edgePath(N[ed.a], N[ed.b], ed.bend ?? 0, R + 16, R + 22);
    const pts = sampleQuad(P);
    return {P, pts, L: pts[pts.length - 1].s};
  });
  const cA = th.dark ? '127,231,255' : '120,90,230';
  const cB = th.dark ? '190,160,255' : '106,69,224';
  // token
  let tok: {x: number; y: number; ei: number; s: number} | null = null;
  if (tokenPath && t >= tokenAt) {
    const k = (t - tokenAt) / tokenStep;
    const i = Math.min(tokenPath.length - 1, Math.floor(k));
    if (i < tokenPath.length - 1) {
      const ei = edges.findIndex((x) => x.a === tokenPath[i] && x.b === tokenPath[i + 1]);
      if (ei >= 0) {
        const s = expoOut(k - i) * geo[ei].L;
        tok = {...atLen(geo[ei].pts, s), ei, s};
      }
    }
  }
  const activeNow = tokenPath && t >= tokenAt ? tokenPath[Math.min(tokenPath.length - 1, Math.floor((t - tokenAt) / tokenStep + 0.75))] : active;
  return (
    <div style={{position: 'relative', width: w, height: h, transformStyle: 'preserve-3d'}}>
      {floor && (
        <div style={{position: 'absolute', left: -120, top: -120, width: w + 240, height: h + 240, transform: `translateZ(${-floorZ}px)`, borderRadius: 40,
          background: `radial-gradient(60% 60% at 50% 50%, rgba(${th.glow},${th.dark ? 0.16 : 0.2}), transparent 80%), radial-gradient(circle, rgba(180,155,242,${th.dark ? 0.35 : 0.45}) 1.6px, transparent 2.2px)`,
          backgroundSize: `100% 100%, 36px 36px`,
          WebkitMaskImage: 'radial-gradient(closest-side, #000 55%, transparent 100%)', maskImage: 'radial-gradient(closest-side, #000 55%, transparent 100%)'}} />
      )}
      {floor && (
        <div style={{position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `translateZ(${-floorZ + 1}px)`, background: nodes.map((n) => {
          const pr = prog(t, n.at, 30);
          const isAct = activeNow === n.id;
          const rgb = n.start ? ORB_RGB.green : isAct ? ORB_RGB.cyan : ORB_RGB.lilac;
          return `radial-gradient(${orb}px ${orb}px at ${n.x}px ${n.y}px, rgba(${rgb},${((isAct ? 0.5 : 0.28) * pr).toFixed(3)}), rgba(${rgb},0))`;
        }).join(', ')}} />
      )}
      <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <defs>
          {geo.map(({P}, i) => (
            <linearGradient key={i} id={`${uid}-g${i}`} gradientUnits="userSpaceOnUse" x1={P.sx} y1={P.sy} x2={P.ex} y2={P.ey}>
              <stop offset="0" stopColor={`rgb(${cA})`} />
              <stop offset="1" stopColor={`rgb(${cB})`} />
            </linearGradient>
          ))}
        </defs>
        {edges.map((ed, i) => {
          const {P, L} = geo[i];
          const pd = prog(t, ed.at, 30);
          if (pd <= 0) return null;
          const off = L * (1 - pd);
          const dash = ed.dashed ? '14 12' : `${L} ${L}`;
          const tx = P.ex - P.mx, ty = P.ey - P.my, tl = Math.hypot(tx, ty) || 1;
          const ux = tx / tl, uy = ty / tl;
          const ah = 16;
          const arrow = `M ${P.ex + ux * 6} ${P.ey + uy * 6} L ${P.ex - ux * ah - uy * ah * 0.6} ${P.ey - uy * ah + ux * ah * 0.6} L ${P.ex - ux * ah + uy * ah * 0.6} ${P.ey - uy * ah - ux * ah * 0.6} Z`;
          const pulseOn = pd > 0.98 && !ed.dashed;
          const po = -(t * speed + i * 37);
          return (
            <g key={i}>
              <path d={P.d} fill="none" stroke={`rgba(${cA},0.13)`} strokeWidth={24} strokeLinecap="round" strokeDasharray={`${L} ${L}`} strokeDashoffset={off} />
              <path d={P.d} fill="none" stroke={`url(#${uid}-g${i})`} strokeWidth={7} strokeLinecap="round" opacity={0.55} strokeDasharray={ed.dashed ? dash : `${L} ${L}`} strokeDashoffset={ed.dashed ? -t * 1.2 : off} />
              <path d={P.d} fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth={2.2} strokeLinecap="round" strokeDasharray={ed.dashed ? dash : `${L} ${L}`} strokeDashoffset={ed.dashed ? -t * 1.2 : off} />
              {pulseOn && <path d={P.d} fill="none" stroke={`rgba(${cA},0.5)`} strokeWidth={14} strokeLinecap="round" strokeDasharray="34 150" strokeDashoffset={po} />}
              {pulseOn && <path d={P.d} fill="none" stroke="#fff" strokeWidth={4.5} strokeLinecap="round" strokeDasharray="34 150" strokeDashoffset={po} />}
              {pd > 0.9 && <path d={arrow} fill={`rgb(${cB})`} stroke="rgba(255,255,255,0.9)" strokeWidth={1.5} opacity={clamp((pd - 0.9) * 10)} />}
              {tok && tok.ei === i && (
                <>
                  <path d={P.d} fill="none" stroke={`rgba(${cA},0.55)`} strokeWidth={16} strokeLinecap="round" strokeDasharray={`${Math.min(tok.s, 140)} ${L + 200}`} strokeDashoffset={-(tok.s - Math.min(tok.s, 140))} />
                  <path d={P.d} fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" strokeDasharray={`${Math.min(tok.s, 140)} ${L + 200}`} strokeDashoffset={-(tok.s - Math.min(tok.s, 140))} />
                </>
              )}
            </g>
          );
        })}
        {tok && (
          <g>
            <circle cx={tok.x} cy={tok.y} r={30} fill={`rgba(${cA},0.25)`} />
            <circle cx={tok.x} cy={tok.y} r={15} fill={`rgba(${cA},0.6)`} />
            <circle cx={tok.x} cy={tok.y} r={8} fill="#fff" />
          </g>
        )}
      </svg>
      {edges.map((ed, i) => {
        if (!ed.label) return null;
        const {pts, L} = geo[i];
        const m = atLen(pts, L / 2);
        const pl = prog(t, ed.at + 12, 20);
        return (
          <div key={`lab${i}`} style={{position: 'absolute', left: m.x, top: m.y, width: 0, height: 0, transformStyle: 'preserve-3d', transform: `translateZ(${lift * 0.5 + 2}px)`}}>
            <div style={{position: 'absolute', transform: `translate(-50%, -50%) ${billboard(face)} translateY(-34px)`, padding: '6px 16px', borderRadius: 999, fontFamily: MONO, fontSize: 20, fontWeight: 600, whiteSpace: 'nowrap', color: th.dark ? '#E9FBFF' : C.purpleDeep, opacity: pl, background: th.dark ? 'rgba(12,6,28,0.72)' : 'rgba(255,255,255,0.88)', boxShadow: `inset 0 0 0 1.5px rgba(${cA},0.7), 0 0 18px -4px rgba(${cA},0.8)`}}>{ed.label}</div>
          </div>
        );
      })}
      {nodes.map((n) => {
        const pr = prog(t, n.at, 30);
        const isAct = activeNow === n.id;
        return (
          <div key={n.id} style={{position: 'absolute', left: n.x, top: n.y, width: 0, height: 0, transformStyle: 'preserve-3d', transform: `translateZ(${lift + e * 60 + (isAct ? 26 : 0)}px)`}}>
            <div style={{position: 'absolute', left: -R, top: -R, transformStyle: 'preserve-3d'}}>
              <GlassOrbNode size={orb} label={n.label ?? n.id} icon={n.icon} start={n.start} active={isAct ? 1 : 0} t={t} tone={n.start ? 'green' : isAct ? 'cyan' : 'lilac'} p={pr} face={face} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
