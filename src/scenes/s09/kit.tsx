// s09 local kit: backdrop, glass chat bubbles, holo feature chips, copy typography, screen-space beams.
// Owned by the s09 scene agent (local versions of things the shared UI does not provide at cinematic scale).
import React from 'react';
import {B, FONT, DISPLAY, MONO, C, clamp, lerp, prog, expoOut, backOut} from '../../lib';
import {FloorGrid, ResolvedCam} from '../../cine';
import {SpaceBackdrop} from '../../vfx';
import {Avatar, Icon} from '../../ui/kit';
import {Rim} from '../../ui/skin';

/** Local frame of global beat k for a scene starting at `from`. */
export const mkL = (from: number) => (k: number) => B(k) - from;
export const eo = (u: number) => expoOut(clamp(u));
export const bo = (u: number) => backOut(clamp(u));
export const p01 = (t: number, a: number, d: number) => clamp((t - a) / Math.max(1e-6, d));
/** Smooth window: rises over `inD` after a, falls over `outD` before b. */
export const win = (t: number, a: number, b: number, inD = 8, outD = 8) => Math.min(p01(t, a, inD), 1 - p01(t, b - outD, outD));

export const EMOJI_FONT = "'Inter', 'Noto Color Emoji', system-ui, sans-serif";

/* ------------------------------------------------------------------ */
/* Backdrop: screen-space space layer (outside the World, so lens shift  */
/* never exposes its edge) + camera-projected grid floor (inside).       */
/* ------------------------------------------------------------------ */
export const SpaceLayer: React.FC<{from: number; cam: ResolvedCam; haze?: number; intensity?: number; palette?: 'violet' | 'cyan' | 'mixed'}> = ({from, cam, haze = 0.35, intensity = 1, palette = 'violet'}) => {
  const horizon = 540 + cam.persp * Math.tan((cam.pitch * Math.PI) / 180) + cam.shiftY;
  return <SpaceBackdrop from={from} camX={-cam.yaw * 16} camY={cam.pitch * 16} haze={haze} horizon={Math.max(-200, Math.min(1300, horizon))} intensity={intensity} palette={palette} />;
};
export const GridLayer: React.FC<{floorY?: number; grid?: number; gridColor?: string}> = ({floorY = 620, grid = 0.32, gridColor = 'rgb(180,155,242)'}) =>
  grid > 0 ? <FloorGrid y={floorY} opacity={grid} step={170} extent={4400} center={[0, -900]} fade={[900, 4200]} far={11000} color={gridColor} width={1.6} /> : null;

/* ------------------------------------------------------------------ */
/* Glass chat bubble (frost), rendered natively large                    */
/* ------------------------------------------------------------------ */
export type BubbleSpec = {
  who: 'user' | 'bot';
  text: string;
  /** full bubble body width (px) */
  w: number;
  at: number;
  typingFrom?: number;
  react?: {emoji: string; at: number};
  tag?: {text: string; at: number};
};

const AV = 78; // avatar size
const GAP = 18;
export const bubbleBoxW = (b: BubbleSpec) => b.w + AV + GAP;
export const bubbleH = (b: BubbleSpec, fs: number) => Math.round(fs * 1.36 + 2 * fs * 0.62 + (b.tag ? fs * 1.5 : 0));

const TypingDots: React.FC<{t: number; s: number}> = ({t, s}) => (
  <div style={{display: 'flex', gap: s * 0.32, alignItems: 'center', height: '100%'}}>
    {[0, 1, 2].map((i) => {
      const a = Math.abs(Math.sin(t / 6.5 - i * 0.75));
      return <div key={i} style={{width: s * 0.36, height: s * 0.36, borderRadius: '50%', background: `rgba(106,69,224,${0.35 + 0.65 * a})`, transform: `translateY(${-s * 0.14 * a}px)`, boxShadow: `0 0 ${s * 0.3 * a}px rgba(140,107,234,0.8)`}} />;
    })}
  </div>
);

export const GlassBubble: React.FC<{b: BubbleSpec; t: number; fs?: number; glow?: number; flash?: number}> = ({b, t, fs = 40, glow = 0.6, flash = 0}) => {
  const bot = b.who === 'bot';
  const typingFrom = b.typingFrom ?? b.at;
  if (t < typingFrom - 1) return null;
  const typing = t < b.at;
  const pad = fs * 0.62;
  const H0 = Math.round(fs * 1.36 + 2 * pad);
  const tagH = b.tag ? fs * 1.5 : 0;
  const grow = typing ? 0 : eo((t - b.at) / 12);
  const dotsW = fs * 3.3;
  const bodyW = b.typingFrom !== undefined ? lerp(dotsW, b.w, grow) : b.w;
  const tagP = b.tag ? bo((t - b.tag.at) / 16) : 0;
  const bodyH = H0 + tagH * eo((t - (b.tag?.at ?? 1e9) + 7) / 9);
  const textO = typing ? 0 : clamp((t - b.at - 1) / 6);
  const rp = b.react ? bo((t - b.react.at) / 14) : 0;
  const ring = b.react ? p01(t, b.react.at, 18) : 0;
  const fl = Math.max(flash, b.tag ? Math.exp(-Math.max(0, t - b.tag.at) / 6) * (t >= b.tag.at ? 1 : 0) : 0);
  const bg = bot
    ? 'linear-gradient(160deg, rgba(255,255,255,0.96) 0%, rgba(248,244,255,0.9) 42%, rgba(232,222,253,0.86) 100%)'
    : 'linear-gradient(160deg, rgba(238,230,255,0.97) 0%, rgba(216,201,250,0.92) 50%, rgba(194,174,248,0.88) 100%)';
  const rim = 'linear-gradient(150deg, rgba(255,255,255,1) 0%, rgba(232,222,255,0.9) 18%, rgba(127,231,255,0.8) 42%, rgba(255,255,255,0.08) 70%, rgba(205,187,255,0.6) 100%)';
  const boxW = bubbleBoxW(b);
  return (
    <div style={{position: 'relative', width: boxW, height: bodyH, fontFamily: EMOJI_FONT}}>
      {/* avatar / user icon */}
      <div style={{position: 'absolute', top: 0, [bot ? 'left' : 'right']: 0, width: AV, height: AV}}>
        {bot ? (
          <Avatar size={AV} glow={0.7} />
        ) : (
          <div style={{width: AV, height: AV, borderRadius: '50%', background: 'linear-gradient(160deg, rgba(255,255,255,0.95), rgba(226,214,255,0.85))', boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.9), 0 0 30px rgba(140,107,234,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Icon.user size={AV * 0.56} color={C.plum} sw={2.2} />
          </div>
        )}
      </div>
      {/* body */}
      <div
        style={{
          position: 'absolute', top: 0, [bot ? 'left' : 'right']: AV + GAP, width: bodyW, height: bodyH, borderRadius: fs * 0.85,
          [bot ? 'borderTopLeftRadius' : 'borderTopRightRadius']: fs * 0.22,
          background: bg,
          boxShadow: [
            'inset 0 1.5px 0 rgba(255,255,255,0.95)',
            `inset 0 -${fs * 0.5}px ${fs}px -${fs * 0.5}px rgba(140,107,234,0.28)`,
            `0 ${fs * 0.7}px ${fs * 1.4}px -${fs * 0.6}px rgba(6,2,16,0.75)`,
            `0 0 ${fs * 1.6 * glow}px rgba(140,107,234,${0.55 * glow})`,
            fl > 0.01 ? `0 0 ${fs * 1.8 * fl}px rgba(127,231,255,${0.75 * fl})` : '',
          ].filter(Boolean).join(', '),
          overflow: 'hidden',
        } as React.CSSProperties}
      >
        <div style={{position: 'absolute', inset: 0, borderRadius: 'inherit', background: 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.1) 18%, rgba(255,255,255,0) 32%)'}} />
        <div style={{position: 'absolute', inset: 0, borderRadius: 'inherit', background: 'radial-gradient(120% 80% at 10% 0%, rgba(255,255,255,0.45), transparent 55%)'}} />
        {typing || grow < 0.35 ? (
          <div style={{position: 'absolute', left: pad, top: 0, height: H0, opacity: typing ? 1 : 1 - grow / 0.35}}>
            <TypingDots t={t} s={fs} />
          </div>
        ) : null}
        <div style={{position: 'absolute', left: pad, top: pad * 0.92, whiteSpace: 'nowrap', fontWeight: 600, fontSize: fs, lineHeight: 1.36, letterSpacing: '-0.012em', color: C.plum, opacity: textO, transform: `translateY(${(1 - textO) * fs * 0.25}px)`}}>
          {b.text}
        </div>
        {b.tag && tagP > 0 ? (
          <div style={{position: 'absolute', left: pad, top: H0 - fs * 0.2, display: 'flex', alignItems: 'center', gap: fs * 0.25, padding: `${fs * 0.16}px ${fs * 0.38}px ${fs * 0.16}px ${fs * 0.18}px`, borderRadius: 999, background: 'linear-gradient(160deg, rgba(222,246,232,0.98), rgba(196,236,214,0.92))', boxShadow: `inset 0 0 0 1.5px rgba(54,153,125,0.45), 0 0 ${fs * 0.8 * fl}px rgba(69,227,176,${0.9 * fl})`, transform: `scale(${lerp(0.5, 1, tagP)})`, transformOrigin: '0% 50%', opacity: clamp(tagP * 2), fontWeight: 700, fontSize: fs * 0.62, color: C.green, whiteSpace: 'nowrap'}}>
            <div style={{width: fs * 0.72, height: fs * 0.72, borderRadius: '50%', background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 ${fs * 0.5}px rgba(54,153,125,0.8)`}}>
              <Icon.check size={fs * 0.5} color="#fff" sw={3.4} />
            </div>
            {b.tag.text}
          </div>
        ) : null}
        <Rim gradient={rim} width={1.6} opacity={0.95 + fl} z={4} />
      </div>
      {/* reaction */}
      {b.react && t >= b.react.at ? (
        <div style={{position: 'absolute', top: bodyH - fs * 0.62, [bot ? 'left' : 'right']: (bot ? AV + GAP + bodyW : AV + GAP + bodyW) - fs * 1.1, width: fs * 1.7, height: fs * 1.7}}>
          {ring < 1 ? <div style={{position: 'absolute', left: '50%', top: '50%', width: fs * (1.7 + 3.4 * eo(ring)), height: fs * (1.7 + 3.4 * eo(ring)), transform: 'translate(-50%,-50%)', borderRadius: '50%', boxShadow: `inset 0 0 0 ${3 * (1 - ring)}px rgba(255,170,220,${0.9 * (1 - ring)}), 0 0 ${24 * (1 - ring)}px rgba(255,140,200,${0.8 * (1 - ring)})`}} /> : null}
          <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: 'linear-gradient(160deg, rgba(255,255,255,0.98), rgba(240,232,255,0.92))', boxShadow: `inset 0 0 0 1.5px rgba(255,255,255,1), 0 ${fs * 0.3}px ${fs * 0.7}px -${fs * 0.2}px rgba(6,2,16,0.6), 0 0 ${fs * (0.6 + 1.2 * (1 - ring))}px rgba(255,150,210,${0.4 + 0.5 * (1 - ring)})`, transform: `scale(${rp})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fs * 0.95, fontFamily: "'Noto Color Emoji'"}}>
            {b.react.emoji}
          </div>
        </div>
      ) : null}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Holo feature chip                                                     */
/* ------------------------------------------------------------------ */
export const FeatureChip: React.FC<{icon: string; text: string; p: number; fs?: number; pulse?: number; extra?: React.ReactNode}> = ({icon, text, p, fs = 27, pulse = 0, extra}) => {
  if (p <= 0) return null;
  const I = Icon[icon] ?? Icon.sparkle;
  const pe = bo(p);
  const g = 0.7 + 0.6 * pulse;
  return (
    <div
      style={{
        display: 'inline-flex', alignItems: 'center', gap: fs * 0.5, padding: `${fs * 0.42}px ${fs * 0.8}px ${fs * 0.42}px ${fs * 0.42}px`, borderRadius: 999, whiteSpace: 'nowrap',
        fontFamily: FONT, fontWeight: 600, fontSize: fs, letterSpacing: '-0.005em', color: '#F4F0FF',
        background: 'linear-gradient(160deg, rgba(52,30,98,0.86) 0%, rgba(22,11,46,0.84) 60%, rgba(16,30,52,0.84) 100%)',
        boxShadow: `inset 0 0 0 1.5px rgba(127,231,255,${0.55 + 0.3 * pulse}), inset 0 1px 0 rgba(255,255,255,0.35), 0 ${fs * 0.5}px ${fs * 1.2}px -${fs * 0.5}px rgba(0,0,0,0.8), 0 0 ${fs * 1.3 * g}px rgba(127,231,255,${0.32 * g})`,
        transform: `scale(${lerp(0.55, 1, pe)}) translateY(${(1 - eo(p)) * fs}px)`, opacity: clamp(p * 3),
      }}
    >
      <div style={{width: fs * 1.45, height: fs * 1.45, borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at 35% 30%, #FFFFFF 0%, #7FE7FF 38%, #8C6BEA 100%)', boxShadow: `0 0 ${fs * 0.8}px rgba(127,231,255,0.75)`}}>
        <I size={fs * 0.82} color="#140A2A" sw={2.4} />
      </div>
      {text}
      {extra}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Copy typography: masked, blurred, tracking-in gradient lines          */
/* ------------------------------------------------------------------ */
export type TLine = {text: string; at: number; size: number; grad?: string; weight?: number; tracking?: number; gap?: number};
export const GRAD_A = 'linear-gradient(100deg, #FFFFFF 0%, #F1EAFF 35%, #CDBBFF 75%, #B49BF2 100%)';
export const GRAD_B = 'linear-gradient(100deg, #E2D6FF 0%, #CDBBFF 30%, #DCEFB4 75%, #E7F4B9 100%)';
export const GRAD_C = 'linear-gradient(100deg, #FFFFFF 0%, #CFF6FF 40%, #CDBBFF 100%)';

export const Title: React.FC<{lines: TLine[]; t: number; out?: number; align?: 'left' | 'right' | 'center'; x: number; y: number; w?: number; sheen?: number[]; kicker?: {text: string; at: number}; glow?: number}> = ({lines, t, out, align = 'left', x, y, w = 1700, sheen = [], kicker, glow = 0.55}) => {
  const outP = out !== undefined ? p01(t, out, 12) : 0;
  if (outP >= 1) return null;
  // sheen band: most recent sweep start
  let sh = -1;
  for (const s of sheen) if (t >= s && t < s + 26) sh = (t - s) / 26;
  const sx = lerp(-30, 130, sh);
  const sheenLayer = sh >= 0 ? `linear-gradient(100deg, rgba(255,255,255,0) ${sx - 10}%, rgba(255,255,255,0.95) ${sx}%, rgba(255,255,255,0) ${sx + 10}%), ` : '';
  const left = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
  return (
    <div style={{position: 'absolute', left, top: y, width: w, textAlign: align, pointerEvents: 'none'}}>
      {kicker ? (() => {
        const kp = eo((t - kicker.at) / 18);
        if (kp <= 0) return null;
        return (
          <div style={{display: 'flex', alignItems: 'center', justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center', gap: 16, marginBottom: 18, opacity: kp * (1 - outP), fontFamily: FONT, fontWeight: 600, fontSize: 20, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#CDBBFF'}}>
            <div style={{width: 46 * kp, height: 3, borderRadius: 2, background: '#E7F4B9', boxShadow: '0 0 10px rgba(231,244,185,0.8)'}} />
            {kicker.text}
          </div>
        );
      })() : null}
      {lines.map((l, i) => {
        const p = eo((t - l.at) / 22);
        const po = clamp(outP * 1.6 - i * 0.12);
        if (p <= 0) return <div key={i} style={{height: l.size * 1.02 + (l.gap ?? 0)}} />;
        const tr = lerp(0.06, l.tracking ?? -0.042, p);
        return (
          <div key={i} style={{overflow: 'hidden', height: l.size * 1.02, marginTop: l.gap ?? 0, paddingBottom: 0}}>
            <div
              style={{
                display: 'inline-block', whiteSpace: 'nowrap', fontFamily: DISPLAY, fontWeight: l.weight ?? 900, fontSize: l.size, lineHeight: 1.02, letterSpacing: `${tr}em`,
                color: 'transparent', backgroundImage: `${sheenLayer}${l.grad ?? GRAD_A}`, WebkitBackgroundClip: 'text', backgroundClip: 'text',
                transform: `translateY(${((1 - p) * 0.9 - po * 1.05) * 100}%)`,
                filter: `blur(${((1 - p) * 10 + po * 12).toFixed(2)}px) drop-shadow(0 0 ${(26 * glow).toFixed(0)}px rgba(140,107,234,${(0.55 * glow).toFixed(2)}))`,
                opacity: clamp(p * 1.4) * (1 - po),
                paddingRight: l.size * 0.08,
              } as React.CSSProperties}
            >
              {l.text}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Screen-space light beam (cubic, glowing, travelling pulse)            */
/* ------------------------------------------------------------------ */
type Pt = {x: number; y: number};
const bez = (a: Pt, c1: Pt, c2: Pt, b: Pt, u: number): Pt => {
  const v = 1 - u;
  return {x: v * v * v * a.x + 3 * v * v * u * c1.x + 3 * v * u * u * c2.x + u * u * u * b.x, y: v * v * v * a.y + 3 * v * v * u * c1.y + 3 * v * u * u * c2.y + u * u * u * b.y};
};
export const ScreenBeam: React.FC<{a: Pt; b: Pt; draw: number; o?: number; color?: string; core?: string; width?: number; pulse?: number; bend?: number}> = ({a, b, draw, o = 1, color = '127,231,255', core = '255,255,255', width = 3, pulse, bend = 0.45}) => {
  if (draw <= 0 || o <= 0.01) return null;
  const dx = (b.x - a.x) * bend;
  const c1 = {x: a.x + dx, y: a.y}, c2 = {x: b.x - dx, y: b.y};
  const d = `M${a.x.toFixed(1)} ${a.y.toFixed(1)} C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  const dr = clamp(draw);
  const head = bez(a, c1, c2, b, dr);
  const pp = pulse !== undefined && pulse > 0 && pulse < 1 ? bez(a, c1, c2, b, pulse) : null;
  return (
    <g opacity={o}>
      <path d={d} pathLength={1} strokeDasharray={`${dr} 1`} stroke={`rgba(${color},0.16)`} strokeWidth={width * 7} strokeLinecap="round" fill="none" />
      <path d={d} pathLength={1} strokeDasharray={`${dr} 1`} stroke={`rgba(${color},0.55)`} strokeWidth={width * 2.4} strokeLinecap="round" fill="none" />
      <path d={d} pathLength={1} strokeDasharray={`${dr} 1`} stroke={`rgba(${core},0.95)`} strokeWidth={width * 0.8} strokeLinecap="round" fill="none" />
      {dr < 1 ? <circle cx={head.x} cy={head.y} r={width * 5} fill={`rgba(${color},0.35)`} /> : null}
      {dr < 1 ? <circle cx={head.x} cy={head.y} r={width * 2.2} fill="#fff" /> : null}
      {pp ? <circle cx={pp.x} cy={pp.y} r={width * 4} fill={`rgba(${color},0.4)`} /> : null}
      {pp ? <circle cx={pp.x} cy={pp.y} r={width * 1.6} fill="#fff" /> : null}
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* Tiny HUD label                                                        */
/* ------------------------------------------------------------------ */
export const HudLabel: React.FC<{text: string; o?: number; color?: string; size?: number; style?: React.CSSProperties}> = ({text, o = 1, color = '#BFF4FF', size = 16, style}) => (
  <div style={{fontFamily: FONT, fontWeight: 600, fontSize: size, letterSpacing: '0.3em', textTransform: 'uppercase', color, opacity: o, whiteSpace: 'nowrap', ...style}}>{text}</div>
);

export {MONO, FONT, DISPLAY};
