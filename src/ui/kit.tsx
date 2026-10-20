import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FONT, DISPLAY, prog, expoOut, kick, rand, lerp, band, clamp} from '../lib';
import {useUI, UITheme, Look, Tone, toneColors, Theme} from './theme';
import {Rim, Sheen, GlassUnder, glassRoot} from './skin';

/* ---------------- Icons ---------------- */
type IP = {size?: number; color?: string; sw?: number};
const Svg: React.FC<IP & {children: React.ReactNode}> = ({size = 24, color, sw = 2, children}) => {
  const th = useUI();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? th.icon} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
};
export const Icon: Record<string, React.FC<IP>> = {
  home: (p) => <Svg {...p}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></Svg>,
  layers: (p) => <Svg {...p}><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /><path d="M3 17.5l9 5 9-5" opacity={0.6} /></Svg>,
  shield: (p) => <Svg {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /></Svg>,
  scale: (p) => <Svg {...p}><path d="M12 3v18M5 21h14M4 7h16" /><path d="M4 7l-3 7a3.5 3.5 0 0 0 6 0zM20 7l-3 7a3.5 3.5 0 0 0 6 0z" /></Svg>,
  doc: (p) => <Svg {...p}><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6M9 13h7M9 17h7" /></Svg>,
  bolt: (p) => <Svg {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></Svg>,
  braces: (p) => <Svg {...p}><path d="M8 3H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1M16 3h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1" /></Svg>,
  chart: (p) => <Svg {...p}><path d="M5 20V12M10 20V6M15 20v-9M20 20V4" /></Svg>,
  history: (p) => <Svg {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></Svg>,
  code: (p) => <Svg {...p}><path d="M8 6l-6 6 6 6M16 6l6 6-6 6M14 4l-4 16" /></Svg>,
  sparkle: (p) => <Svg {...p}><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" /></Svg>,
  send: (p) => <Svg {...p}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></Svg>,
  user: (p) => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4.5 4.5-6 8-6s7 1.5 8 6" /></Svg>,
  check: (p) => <Svg {...p}><path d="M5 12.5l4.5 4.5L19 7" /></Svg>,
  clock: (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>,
  gear: (p) => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Svg>,
  globe: (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></Svg>,
  chat: (p) => <Svg {...p}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z" /></Svg>,
  mail: (p) => <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></Svg>,
  play: (p) => <Svg {...p}><path d="M7 4l13 8-13 8z" /></Svg>,
  refresh: (p) => <Svg {...p}><path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4" /></Svg>,
  plus: (p) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>,
  arrow: (p) => <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>,
  paperclip: (p) => <Svg {...p}><path d="M21 11l-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7" /></Svg>,
  mic: (p) => <Svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></Svg>,
  calendar: (p) => <Svg {...p}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></Svg>,
};

/* ---------------- Bot avatar (winking robot) ---------------- */
/** The Bot Studio avatar (brand construction shared with the s03 hero logo): deep-violet medallion, white face, the
 *  real logo's "<" wink chevron. wink: 0 = both eyes open, 0..0.7 = right eye closing, ≥ 0.7 = brand wink "<" (default). */
export const Avatar: React.FC<{size?: number; wink?: number; glow?: number}> = ({size = 64, wink = 1, glow = 0}) => {
  const w = clamp(wink);
  const ry = Math.max(0.5, 3.6 * (1 - w / 0.7));
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{overflow: 'visible', filter: glow ? `drop-shadow(0 0 ${12 * glow}px rgba(140,107,234,${0.8 * glow}))` : undefined}}>
      <defs>
        <radialGradient id="avbg2" cx="32%" cy="26%" r="85%">
          <stop offset="0%" stopColor="#C9B6FF" />
          <stop offset="45%" stopColor="#9677F2" />
          <stop offset="100%" stopColor="#5B36D6" />
        </radialGradient>
        <radialGradient id="avhi2" cx="30%" cy="18%" r="55%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="avface2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#EEE8FB" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="31.4" fill="url(#avbg2)" />
      <circle cx="32" cy="32" r="31.4" fill="url(#avhi2)" />
      <circle cx="32" cy="32" r="30.6" fill="none" stroke="#E9E0FF" strokeOpacity={0.55} strokeWidth="0.8" />
      <line x1="32" y1="9.5" x2="32" y2="15.5" stroke={C.plum} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="32" cy="7.6" r="3" fill="#2C1E40" />
      <rect x="13" y="16" width="38" height="32" rx="14" fill="url(#avface2)" />
      <rect x="9.2" y="27" width="4.6" height="10" rx="2.3" fill="#E4DBF7" />
      <rect x="50.2" y="27" width="4.6" height="10" rx="2.3" fill="#E4DBF7" />
      <ellipse cx="24.2" cy="30.2" rx="3.2" ry="3.6" fill={C.plum} />
      {/* right eye: open → closing → brand wink chevron */}
      {w >= 0.7
        ? <path d="M44.6 26.6 L37.6 30.4 L44.6 34.2" stroke={C.plum} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        : <ellipse cx="40.6" cy="30.2" rx="3.2" ry={ry} fill={C.plum} />}
      <path d="M24 38.4 q 8 6.2 16 0" stroke={C.plum} strokeWidth="2.9" fill="none" strokeLinecap="round" />
      <circle cx="19.6" cy="37.2" r="2.3" fill="#F7B6D2" opacity={0.75} />
      <circle cx="44.4" cy="37.2" r="2.3" fill="#F7B6D2" opacity={0.75} />
    </svg>
  );
};

/* ---------------- Panels ---------------- */
export type CardProps = {
  style?: React.CSSProperties;
  children?: React.ReactNode;
  /** extra-transparent fill */
  glass?: boolean;
  /** render this card (and its content) in a specific look */
  look?: Look;
  /** violet outer bloom 0..1.5 */
  glow?: number;
  /** light-sweep progress 0..1 */
  sheen?: number;
  /** rim intensity (default 1) */
  rim?: number;
  /** backdrop-filter blur px (default: theme.blur, normally 0 = fallback) */
  blur?: number;
  /** rim flash on "lock" 0..1 */
  flash?: number;
};

const CardBody: React.FC<CardProps> = ({style, children, glass, glow, sheen, rim = 1, blur, flash = 0}) => {
  const th = useUI();
  return (
    <div
      style={{
        borderRadius: 28,
        fontFamily: FONT,
        color: th.text,
        position: 'relative',
        overflow: 'hidden',
        zIndex: 0,
        ...glassRoot(th, {fill: glass ? th.surfaceGlass : th.surface, glow, blur, flash, shadow: 'card'}),
        ...style,
      }}
    >
      {th.look !== 'solid' && <GlassUnder th={th} />}
      {children}
      <Rim gradient={th.rim} width={th.rimWidth} opacity={rim * (1 + flash)} />
      {flash > 0 && <Rim gradient={`linear-gradient(150deg, rgba(${th.glow2},1), rgba(255,255,255,0.9), rgba(${th.glow},0.8))`} width={th.rimWidth + 1} opacity={flash} />}
      <Sheen p={sheen} color={th.dark ? '200,235,255' : '255,255,255'} strength={th.dark ? 0.35 : 0.6} />
    </div>
  );
};

/** Product card. Look-aware glass (frost by default); `solid` = v1 look. */
export const Card: React.FC<CardProps> = (p) => (p.look ? <UITheme look={p.look}><CardBody {...p} /></UITheme> : <CardBody {...p} />);

/** Map legacy explicit pill colours to semantic tones so old call-sites follow the theme. */
const LEGACY_TONE: Record<string, Tone> = {
  [C.lilac]: 'lilac', [C.lilac2]: 'lilac2', [C.pistachio]: 'pistachio', '#E3F3EA': 'green', '#DDF2E8': 'green', '#FCF0D6': 'amber', '#fff': 'white', '#FFF': 'white', '#ffffff': 'white', '#FFFFFF': 'white',
};

export const Pill: React.FC<{bg?: string; color?: string; style?: React.CSSProperties; children: React.ReactNode; tone?: Tone; glow?: number}> = ({bg, color, style, children, tone, glow = 0}) => {
  const th = useUI();
  const tn: Tone | undefined = tone ?? (bg === undefined ? 'lilac' : LEGACY_TONE[bg]);
  const tc = tn ? toneColors(th, tn) : null;
  const background = tc ? tc.bg : bg;
  const fg = color && !(tn && th.look === 'holo' && (color === C.plum || color === C.green || color === C.purpleDeep)) ? color : tc ? tc.fg : C.plum;
  return (
    <div
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 999, background, color: fg, fontFamily: FONT, fontWeight: 600, fontSize: 18, whiteSpace: 'nowrap',
        boxShadow: [tc?.border ? `inset 0 0 0 1.5px ${tc.border}` : '', th.dark && tn !== 'white' && tn !== 'ghost' ? `inset 0 0 0 1px rgba(255,255,255,0.08)` : '', glow > 0 ? `0 0 ${24 * glow}px rgba(${th.glow},${0.55 * glow})` : ''].filter(Boolean).join(', ') || undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Pick a colour by look: lk(th, light, holo) */
export const lk = (th: Theme, light: string, dark: string) => (th.dark ? dark : light);

/** Moving specular sweep across a surface (p: 0..1). */
export const Shine: React.FC<{p: number; strength?: number; width?: number}> = ({p, strength = 0.75, width = 18}) => {
  if (p <= 0 || p >= 1) return null;
  const x = lerp(-40, 140, p);
  return (
    <div
      style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 'inherit', mixBlendMode: 'screen',
        background: `linear-gradient(105deg, transparent ${x - width}%, rgba(255,255,255,${strength * 0.35}) ${x - width / 3}%, rgba(255,255,255,${strength}) ${x}%, rgba(255,255,255,${strength * 0.35}) ${x + width / 3}%, transparent ${x + width}%)`,
      }}
    />
  );
};

/* ---------------- 3D stage ---------------- */
export type Cam = {rx?: number; ry?: number; rz?: number; x?: number; y?: number; z?: number; s?: number};
/**
 * 3D camera stage. `crisp`: apply the zoom `cam.s` as a 2D scale OUTSIDE the perspective container
 * (x/y are compensated so framing matches). Chromium rasterises 3D layers at ~1x, so a scale inside
 * the 3D transform turns soft above ~1.2x; the outer 2D scale re-rasterises crisply. Use it for macro close-ups.
 */
export const Stage: React.FC<{cam: Cam; children: React.ReactNode; persp?: number; origin?: string; crisp?: boolean}> = ({cam, children, persp = 2200, origin = '50% 50%', crisp}) => {
  const {rx = 0, ry = 0, rz = 0, x = 0, y = 0, z = 0, s = 1} = cam;
  const outer = crisp && s !== 1 ? s : 1;
  const stage = (
    <AbsoluteFill style={{perspective: persp, perspectiveOrigin: '50% 45%'}}>
      <AbsoluteFill
        style={{
          transformStyle: 'preserve-3d',
          transformOrigin: origin,
          transform: `translate3d(${x / outer}px, ${y / outer}px, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s / outer})`,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
  return outer !== 1 ? <AbsoluteFill style={{transform: `scale(${outer})`}}>{stage}</AbsoluteFill> : stage;
};

/** Absolutely positioned 3D layer (centered at cx, cy in a 1920x1080 space). */
export const Layer: React.FC<{x: number; y: number; w: number; h?: number; z?: number; rx?: number; ry?: number; rz?: number; s?: number; o?: number; blur?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({
  x, y, w, h, z = 0, rx = 0, ry = 0, rz = 0, s = 1, o = 1, blur = 0, children, style,
}) => (
  <div
    style={{
      position: 'absolute', left: x, top: y, width: w, height: h,
      transform: `translate(-50%, -50%) translateZ(${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s})`,
      transformStyle: 'preserve-3d', opacity: o, filter: blur > 0.05 ? `blur(${blur}px)` : undefined, ...style,
    }}
  >
    {children}
  </div>
);

/* ---------------- Backgrounds ---------------- */
export const NightBG: React.FC<{intensity?: number; hue?: number; floor?: boolean}> = ({intensity = 1, floor = true}) => {
  const f = useCurrentFrame();
  const k = kick(f, 9);
  const lo = band(f, 0, 4);
  const orbs = [
    {x: 22 + 6 * Math.sin(f / 140), y: 30 + 8 * Math.cos(f / 170), r: 900, c: 'rgba(140,107,234,0.55)'},
    {x: 80 + 5 * Math.cos(f / 160), y: 70 + 6 * Math.sin(f / 120), r: 1000, c: 'rgba(106,69,224,0.45)'},
    {x: 60 + 8 * Math.sin(f / 210), y: 15, r: 700, c: 'rgba(231,244,185,0.12)'},
  ];
  return (
    <AbsoluteFill style={{background: `radial-gradient(120% 90% at 50% 40%, #241338 0%, ${C.night} 70%)`, overflow: 'hidden'}}>
      {orbs.map((o, i) => (
        <div key={i} style={{position: 'absolute', left: `${o.x}%`, top: `${o.y}%`, width: o.r, height: o.r, marginLeft: -o.r / 2, marginTop: -o.r / 2, borderRadius: '50%', background: `radial-gradient(circle, ${o.c} 0%, transparent 65%)`, opacity: intensity * (0.75 + 0.35 * k + 0.1 * lo), filter: 'blur(20px)'}} />
      ))}
      {floor && <GridFloor />}
      <Particles />
      <AbsoluteFill style={{background: 'radial-gradient(130% 100% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)'}} />
    </AbsoluteFill>
  );
};

export const GridFloor: React.FC<{color?: string}> = ({color = 'rgba(180,155,242,0.22)'}) => {
  const f = useCurrentFrame();
  const off = (f * 1.2) % 80;
  return (
    <AbsoluteFill style={{perspective: 700, perspectiveOrigin: '50% 30%', overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute', left: '-50%', width: '200%', top: '58%', height: '120%',
          transform: 'rotateX(78deg)', transformOrigin: '50% 0%',
          backgroundImage: `linear-gradient(${color} 1.5px, transparent 1.5px), linear-gradient(90deg, ${color} 1.5px, transparent 1.5px)`,
          backgroundSize: '80px 80px', backgroundPosition: `0 ${off}px`,
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 50%, transparent 95%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 50%, transparent 95%)',
        }}
      />
    </AbsoluteFill>
  );
};

export const Particles: React.FC<{n?: number; color?: string}> = ({n = 70, color = '#CDBBFF'}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      {Array.from({length: n}).map((_, i) => {
        const sp = 0.2 + rand(i * 3.1) * 0.6;
        const x = (rand(i) * 1920 + Math.sin(f / 90 + i) * 20) % 1920;
        const y = ((rand(i * 7.7) * 1200 - f * sp) % 1200 + 1200) % 1200 - 60;
        const s = 1.5 + rand(i * 1.3) * 3;
        const tw = 0.3 + 0.7 * Math.abs(Math.sin(f / (20 + rand(i) * 40) + i));
        return <div key={i} style={{position: 'absolute', left: x, top: y, width: s, height: s, borderRadius: '50%', background: color, opacity: 0.55 * tw, boxShadow: `0 0 ${s * 4}px ${color}`}} />;
      })}
    </AbsoluteFill>
  );
};

export const LilacBG: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: `radial-gradient(110% 90% at 50% 35%, #FBF9FF 0%, ${C.canvas} 45%, #DCD0F4 100%)`}}>
      <div style={{position: 'absolute', left: `${30 + 10 * Math.sin(f / 120)}%`, top: '20%', width: 1100, height: 1100, marginLeft: -550, borderRadius: '50%', background: 'radial-gradient(circle, rgba(140,107,234,0.18), transparent 65%)'}} />
      <div style={{position: 'absolute', left: `${75 + 6 * Math.cos(f / 140)}%`, top: '55%', width: 900, height: 900, marginLeft: -450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(231,244,185,0.55), transparent 65%)'}} />
      <GridFloor color="rgba(140,107,234,0.14)" />
    </AbsoluteFill>
  );
};

/* ---------------- Kinetic typography ---------------- */
export const Words: React.FC<{
  text: string; start: number; stagger?: number; size?: number; color?: string; weight?: number; gradient?: boolean; align?: 'center' | 'left'; dur?: number; tracking?: number; out?: number;
}> = ({text, start, stagger = 4, size = 120, color = '#fff', weight = 800, gradient, align = 'center', dur = 28, tracking = -0.035, out}) => {
  const f = useCurrentFrame();
  const words = text.split(' ');
  const outP = out !== undefined ? prog(f, out, 14, expoOut) : 0;
  return (
    <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: align === 'center' ? 'center' : 'flex-start', gap: `0 ${size * 0.26}px`, fontFamily: DISPLAY, fontWeight: weight, fontSize: size, letterSpacing: `${tracking}em`, lineHeight: 1.05}}>
      {words.map((w, i) => {
        const p = prog(f, start + i * stagger, dur, expoOut);
        return (
          <span key={i} style={{display: 'inline-block', overflow: 'hidden', paddingBottom: size * 0.12, marginBottom: -size * 0.12}}>
            <span
              style={{
                display: 'inline-block',
                transform: `translateY(${(1 - p) * 105 + outP * -105}%) rotate(${(1 - p) * 6}deg)`,
                filter: `blur(${(1 - p) * 8 + outP * 10}px)`,
                opacity: p * (1 - outP),
                color: gradient ? 'transparent' : color,
                backgroundImage: gradient ? 'linear-gradient(100deg, #FFFFFF 0%, #E2D6FF 40%, #B49BF2 70%, #E7F4B9 100%)' : undefined,
                WebkitBackgroundClip: gradient ? 'text' : undefined,
                backgroundClip: gradient ? 'text' : undefined,
              }}
            >
              {w}
            </span>
          </span>
        );
      })}
    </div>
  );
};

/** Caption chip shown in the lower third during feature scenes. */
export const Caption: React.FC<{kicker: string; title: string; start: number; end: number; dark?: boolean; pos?: 'left' | 'right'}> = ({kicker, title, start, end, dark = true, pos = 'left'}) => {
  const f = useCurrentFrame();
  const p = prog(f, start, 30);
  const o = 1 - prog(f, end - 12, 12);
  const side = pos === 'left' ? {left: 110} : {right: 110, textAlign: 'right' as const};
  return (
    <>
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 420, opacity: o * clamp(p * 1.5), background: dark ? 'linear-gradient(to top, rgba(8,4,16,0.92) 0%, rgba(8,4,16,0.7) 45%, transparent 100%)' : 'linear-gradient(to top, rgba(246,242,253,0.96) 0%, rgba(246,242,253,0.75) 45%, transparent 100%)', pointerEvents: 'none'}} />
    <div style={{position: 'absolute', bottom: 92, ...side, opacity: o, maxWidth: 900}}>
      <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 22, letterSpacing: '0.22em', textTransform: 'uppercase', color: dark ? '#CDBBFF' : C.purpleDeep, opacity: p, transform: `translateX(${(1 - p) * (pos === 'left' ? -30 : 30)}px)`, marginBottom: 10}}>
        <span style={{display: 'inline-block', width: 34 * p, height: 3, background: dark ? '#E7F4B9' : C.purple, verticalAlign: 'middle', marginRight: 14, borderRadius: 2}} />
        {kicker}
      </div>
      <Words text={title} start={start + 4} stagger={3} size={64} color={dark ? '#fff' : C.plum} weight={800} align={pos === 'left' ? 'left' : 'center'} dur={26} gradient={dark} />
    </div>
    </>
  );
};

/** Full-frame flash overlay. */
export const Flash: React.FC<{at: number; dur?: number; color?: string; max?: number}> = ({at, dur = 18, color = '#fff', max = 0.9}) => {
  const f = useCurrentFrame();
  if (f < at || f > at + dur) return null;
  const o = max * Math.pow(1 - (f - at) / dur, 2);
  return <AbsoluteFill style={{background: color, opacity: o, pointerEvents: 'none'}} />;
};
