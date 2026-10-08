// s10 Act A — "A bot that builds bots.": the Build-with-AI sparkle spawns glass bot cards that multiply into an
// infinite wall receding into fog. Set pieces + per-shot camera rigs.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {DISPLAY, FONT, kick} from '../../lib';
import {World, Obj, FloorGrid, ResolvedCam, resolveCam, project, depthOf, CamSpec, V3, MotionBlur, camMotion} from '../../cine';
import {SpaceBackdrop, Glint, GodRays} from '../../vfx';
import {Avatar, Icon, BOTS, BotCard, UITheme, Rim, Sheen} from '../../ui';
import {lb, clamp01, mix, smoothstep, eo, ei, eio, decay, HudLabel} from './common';

/* ------------------------------------------------------------------ */
/* Wall layout                                                          */
/* ------------------------------------------------------------------ */
export const PX = 500; // column pitch
export const PY = 372; // row pitch
export const CW = 420; // card width
export const CH = 300; // card height
export const SPARK: V3 = [0, 0, 760]; // the Build-with-AI sparkle, in front of the wall centre (A1, A6)
const SPARK_HI: V3 = [0, -585, 640]; // after A1 it rises to hover in the gap above the 3x3 so it never covers a card
/** sparkle position over time (local frames) */
export const sparkAt = (t: number): V3 => {
  if (t >= lb(150.5)) return SPARK;
  const u = eio(clamp01((t - 44) / 22));
  return [mix(SPARK[0], SPARK_HI[0], u), mix(SPARK[1], SPARK_HI[1], u), mix(SPARK[2], SPARK_HI[2], u)];
};
export const FLOOR_Y = 1520;

type BotDef = {name: string; kind: string; icon: string; badge: string};
const EXTRA: [string, string, string][] = [
  ['Returns assistant', 'Post-purchase', 'refresh'], ['Lead qualifier', 'Sales', 'chart'], ['FAQ guide', 'Self-service', 'chat'],
  ['Renewal helper', 'Retention', 'shield'], ['Quote builder', 'Sales', 'doc'], ['Ticket triage', 'Support', 'bolt'],
  ['Trial coach', 'Activation', 'sparkle'], ['Survey runner', 'Research', 'doc'], ['Travel planner', 'Hospitality', 'globe'],
  ['Product finder', 'Commerce', 'sparkle'], ['Invoice chaser', 'Accounts', 'shield'], ['IT helpdesk', 'Internal', 'gear'],
  ['Menu helper', 'Restaurants', 'chat'], ['Warranty desk', 'Operations', 'shield'], ['Course guide', 'Education', 'doc'],
  ['Delivery tracker', 'Logistics', 'bolt'], ['Plan advisor', 'Sales', 'chart'], ['Policy explainer', 'Insurance', 'scale'],
  ['Venue booker', 'Events', 'calendar'], ['Churn rescuer', 'Retention', 'sparkle'], ['Status notifier', 'Operations', 'mail'],
  ['Demo scheduler', 'Sales', 'clock'], ['Docs navigator', 'Developers', 'code'], ['Refund helper', 'Accounts', 'refresh'],
];
const BADGES = ['Live', 'Version 3', 'Draft', 'Version 5', 'Live', 'Version 2', 'Live', 'Version 8'];

export type Slot = {i: number; c: number; r: number; x: number; y: number; land: number; named: number; b: BotDef; seed: number};

const NAMED_ORDER: [number, number, number][] = [
  // [c, r, land local frame]
  [0, 0, lb(140.5)],
  [-1, 0, lb(141.5)], [1, 0, lb(141.5)],
  [0, -1, lb(142)], [0, 1, lb(142)],
  [-1, -1, lb(142.5)], [1, 1, lb(142.5)],
  [1, -1, lb(143)], [-1, 1, lb(143)],
];

const buildSlots = (): Slot[] => {
  const out: Slot[] = [];
  let k = 0;
  NAMED_ORDER.forEach(([c, r, land], n) => {
    out.push({i: out.length, c, r, x: c * PX, y: r * PY, land, named: n, b: BOTS[n] as BotDef, seed: n + 1});
  });
  for (let c = -12; c <= 14; c++) {
    for (let r = -3; r <= 3; r++) {
      if (Math.abs(c) <= 1 && Math.abs(r) <= 1) continue;
      const hsh = Math.abs(Math.sin(c * 12.9898 + r * 78.233) * 43758.5453) % 1;
      let land: number;
      if (c >= -1) {
        // right / up / down growth: a wave rippling out from the 3x3 (starts on 143.5, rolls through 146)
        const d = Math.hypot(Math.max(0, c - 1) * 1.0, Math.max(0, Math.abs(r) - 1) * 1.25);
        land = lb(143.5) + 2 + d * 4.6 + hsh * 3;
      } else {
        // left half fills after the title has gone (146 →)
        land = lb(146) + (Math.abs(c) - 2) * 3.4 + Math.abs(r) * 1.6 + hsh * 3;
      }
      const e = EXTRA[(k * 7 + 3) % EXTRA.length];
      out.push({i: out.length, c, r, x: c * PX, y: r * PY, land, named: -1, b: {name: e[0], kind: e[1], icon: e[2], badge: BADGES[k % BADGES.length]}, seed: 20 + k});
      k++;
    }
  }
  return out;
};
export const SLOTS = buildSlots();

/* ------------------------------------------------------------------ */
/* Cards                                                                */
/* ------------------------------------------------------------------ */
export type Look = 'frost' | 'holo';

/** Cheap glass bot card in the BotCard layout. lod 0 = full, 1 = no icons, 2 = silhouette only. */
export const GlassBot: React.FC<{b: BotDef; lod: number; look: Look; sheen?: number; flash?: number; lit?: number}> = ({b, lod, look, sheen, flash = 0, lit = 0}) => {
  const holo = look === 'holo';
  const I = Icon[b.icon] ?? Icon.sparkle;
  const live = b.badge !== 'Draft';
  const txt = holo ? '#F3EEFF' : '#39294B';
  const sub = holo ? '#CDBBFF' : '#6A45E0';
  const bg = holo
    ? `linear-gradient(160deg, rgba(64,38,116,${0.66 + 0.2 * lit}) 0%, rgba(28,15,54,0.6) 50%, rgba(14,7,32,0.66) 100%)`
    : 'linear-gradient(160deg, rgba(255,255,255,0.86) 0%, rgba(250,247,255,0.72) 40%, rgba(236,227,255,0.62) 100%)';
  return (
    <div
      style={{
        position: 'relative', width: CW, height: CH, borderRadius: 28, boxSizing: 'border-box', padding: 28, fontFamily: FONT, color: txt, overflow: 'hidden',
        background: bg,
        boxShadow: lod < 2
          ? holo
            ? `inset 0 1px 0 rgba(200,240,255,0.55), 0 0 ${26 + 40 * flash}px -6px rgba(127,231,255,${0.3 + 0.6 * flash})`
            : `inset 0 1px 0 rgba(255,255,255,0.95), 0 0 ${28 + 40 * flash}px -8px rgba(${flash > 0.05 ? '127,231,255' : '140,107,234'},${0.55 + 0.4 * flash})`
          : undefined,
        border: lod >= 1 ? `1.5px solid ${holo ? 'rgba(160,215,255,0.5)' : 'rgba(255,255,255,0.8)'}` : undefined,
      }}
    >
      {/* specular */}
      <div style={{position: 'absolute', inset: 0, background: holo ? 'linear-gradient(180deg, rgba(200,230,255,0.16) 0%, rgba(200,230,255,0) 26%)' : 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 9%, rgba(255,255,255,0) 24%)'}} />
      {lod < 2 ? (
        <>
          <div style={{display: 'flex', alignItems: 'flex-start', position: 'relative'}}>
            <div style={{width: 84, height: 84, borderRadius: 42, background: holo ? 'rgba(140,107,234,0.3)' : 'rgba(222,211,250,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: holo ? 'inset 0 0 0 1px rgba(160,130,255,0.5), 0 0 22px -6px rgba(160,130,255,0.8)' : undefined}}>
              {lod === 0 ? (b.icon === 'avatar' ? <Avatar size={76} /> : <I size={42} color={holo ? '#CDBBFF' : '#6A45E0'} />) : <div style={{width: 40, height: 40, borderRadius: 20, background: holo ? 'rgba(205,187,255,0.5)' : 'rgba(106,69,224,0.45)'}} />}
            </div>
            <div style={{flex: 1}} />
            <div style={{padding: '8px 16px', borderRadius: 999, fontWeight: 600, fontSize: 17, whiteSpace: 'nowrap',
              background: live ? (holo ? 'rgba(60,220,170,0.16)' : 'rgba(218,241,229,0.95)') : (holo ? 'rgba(255,190,80,0.16)' : 'rgba(252,238,208,0.95)'),
              color: live ? (holo ? '#72F2C8' : '#24805A') : (holo ? '#FFD27A' : '#A46B06')}}>{b.badge}</div>
          </div>
          <div style={{position: 'relative', fontFamily: DISPLAY, fontWeight: 800, fontSize: 30, marginTop: 18, letterSpacing: '-0.01em', whiteSpace: 'nowrap', textShadow: holo ? '0 0 18px rgba(170,140,255,0.6)' : undefined}}>{b.name}</div>
          <div style={{position: 'relative', fontSize: 20, color: sub, fontWeight: 600, marginTop: 2}}>{b.kind}</div>
          <div style={{position: 'relative', marginTop: 18, height: 52, borderRadius: 16, background: holo ? 'rgba(140,107,234,0.14)' : 'rgba(240,234,253,0.75)', boxShadow: `inset 0 0 0 1px ${holo ? 'rgba(180,155,242,0.24)' : 'rgba(255,255,255,0.8)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontWeight: 700, fontSize: 21, color: sub}}>
            Open {lod === 0 && <Icon.arrow size={22} color={sub} />}
          </div>
          {lod === 0 && holo && <Rim gradient="linear-gradient(150deg, rgba(127,231,255,1) 0%, rgba(190,168,255,0.8) 26%, rgba(140,107,234,0.16) 58%, rgba(127,231,255,0.55) 100%)" width={1.5} opacity={1 + flash} />}
        </>
      ) : (
        <>
          <div style={{width: 84, height: 84, borderRadius: 42, background: holo ? 'rgba(160,130,255,0.3)' : 'rgba(205,187,255,0.8)'}} />
          <div style={{marginTop: 22, width: 250, height: 22, borderRadius: 11, background: holo ? 'rgba(230,220,255,0.3)' : 'rgba(57,41,75,0.4)'}} />
          <div style={{marginTop: 12, width: 160, height: 16, borderRadius: 8, background: holo ? 'rgba(205,187,255,0.2)' : 'rgba(106,69,224,0.35)'}} />
          <div style={{marginTop: 22, height: 52, borderRadius: 16, background: holo ? 'rgba(140,107,234,0.16)' : 'rgba(240,234,253,0.8)'}} />
        </>
      )}
      {sheen !== undefined && sheen > 0 && sheen < 1 && <Sheen p={sheen} color={holo ? '200,240,255' : '255,255,255'} strength={holo ? 0.7 : 0.75} width={22} z={5} />}
      {flash > 0.03 && <div style={{position: 'absolute', inset: 0, borderRadius: 28, boxShadow: `inset 0 0 0 2.5px rgba(200,245,255,${0.9 * flash}), inset 0 0 40px rgba(127,231,255,${0.45 * flash})`}} />}
    </div>
  );
};

/** Shared BotCard (frost) with sheen + lock flash overlays (for the nine named hero cards). */
const HeroBot: React.FC<{n: number; sheen?: number; flash?: number; look: Look}> = ({n, sheen, flash = 0, look}) => (
  <UITheme look={look}>
    <div style={{position: 'relative', width: CW, borderRadius: 28}}>
      <BotCard b={BOTS[n]} w={CW} />
      {sheen !== undefined && sheen > 0 && sheen < 1 && (
        <div style={{position: 'absolute', inset: 0, borderRadius: 28, overflow: 'hidden'}}><Sheen p={sheen} strength={0.8} width={22} color={look === 'holo' ? '200,240,255' : '255,255,255'} z={5} /></div>
      )}
      {flash > 0.03 && <div style={{position: 'absolute', inset: 0, borderRadius: 28, boxShadow: `inset 0 0 0 2.5px rgba(200,245,255,${0.95 * flash}), 0 0 ${30 + 60 * flash}px rgba(127,231,255,${0.6 * flash})`}} />}
    </div>
  </UITheme>
);

/* ------------------------------------------------------------------ */
/* The sparkle (Build with AI)                                          */
/* ------------------------------------------------------------------ */
const STAR = 'M0,-100 C7,-32 32,-7 100,0 C32,7 7,32 0,100 C-7,32 -32,7 -100,0 C-32,-7 -7,-32 0,-100Z';
export const SparkleGlyph: React.FC<{size: number; t: number; charge?: number}> = ({size, t, charge = 0}) => {
  const pulse = 0.5 + 0.5 * Math.sin(t / 7);
  return (
    <div style={{position: 'relative', width: size, height: size}}>
      <div style={{position: 'absolute', left: -size * 1.2, top: -size * 1.2, width: size * 3.4, height: size * 3.4, borderRadius: '50%',
        background: `radial-gradient(closest-side, rgba(255,255,255,${0.5 + 0.4 * charge}), rgba(190,168,255,${0.42 + 0.2 * pulse}) 22%, rgba(127,231,255,0.14) 48%, rgba(140,107,234,0) 72%)`}} />
      <svg width={size} height={size} viewBox="-110 -110 220 220" style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', transform: `rotate(${(t * 0.6).toFixed(2)}deg)`}}>
        <defs>
          <radialGradient id="s10star" cx="0" cy="0" r="100" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="0.3" stopColor="#F4EFFF" />
            <stop offset="0.72" stopColor="#B7A0FF" />
            <stop offset="1" stopColor="#7FE7FF" />
          </radialGradient>
        </defs>
        <path d={STAR} fill="url(#s10star)" />
        <path d={STAR} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" />
        <g transform="translate(70,-66) scale(0.24)"><path d={STAR} fill="#E7F4B9" /></g>
        <g transform="translate(-74,62) scale(0.16)"><path d={STAR} fill="#BFF4FF" /></g>
      </svg>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Set                                                                  */
/* ------------------------------------------------------------------ */
export type FactoryOpts = {
  /** depth fog [start, end] in px from the lens */
  fog?: [number, number];
  look?: Look;
  /** light sweeps: [local start frame, speed px/frame along +x (negative = right→left)] */
  sweeps?: [number, number][];
  /** collapse into the sparkle (A6): start frame */
  inhale?: number;
  sparkle?: number; // sparkle size (world px)
  showSpark?: boolean;
  /** extra lift of every card's lock flash (e.g. on a wall-wide pulse) */
  pulse?: number;
};

const sweepAt = (t: number, x: number, sweeps: [number, number][]) => {
  for (const [s, v] of sweeps) {
    const x0 = v > 0 ? -7000 : 7500;
    const pos = x0 + (t - s) * v; // sweep front position
    const u = (pos - x) / (Math.abs(v) * 14) * Math.sign(v);
    if (u > -0.05 && u < 1.05) return clamp01(u);
  }
  return undefined;
};

/** Card transform at local time t (named: fly out of the sparkle; extras: flip into place). Returns null before spawn. */
export const cardState = (s: Slot, t: number, inhale?: number) => {
  const FL = s.named >= 0 ? (s.named === 0 ? 14 : 13) : 13;
  const u = (t - (s.land - FL)) / FL;
  if (u <= 0) return null;
  const e = eo(clamp01(u));
  let x: number, y: number, z: number, ry: number, rz: number, sc: number, o: number;
  if (s.named >= 0) {
    const arc = Math.sin(Math.PI * clamp01(u)) * 160;
    const S0 = sparkAt(s.land - FL);
    x = mix(S0[0], s.x, e);
    y = mix(S0[1], s.y, e) - arc * 0.6;
    z = mix(S0[2], 0, e);
    ry = (1 - e) * (s.c < 0 ? 70 : s.c > 0 ? -70 : -50);
    rz = (1 - e) * (s.r < 0 ? -14 : 14);
    sc = mix(0.08, 1, eo(clamp01(u * 1.15)));
    o = smoothstep(0, 0.25, u);
  } else {
    x = s.x; y = s.y; z = 460 * (1 - e);
    ry = (1 - e) * (s.c < 0 ? 75 : -75);
    rz = 0; sc = mix(0.85, 1, e);
    o = smoothstep(0, 0.4, u);
  }
  if (inhale !== undefined && t > inhale) {
    // vortex into the sparkle: far cards first, accelerating
    const dist = Math.hypot(s.c, s.r * 1.3);
    const st = inhale + Math.max(0, 14 - dist) * 0.85;
    const q = clamp01((t - st) / 17);
    const qe = Math.pow(q, 2.3);
    const ang = qe * 1.5;
    const rx0 = mix(s.x, SPARK[0], qe), ry0 = mix(s.y, SPARK[1], qe);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    x = rx0 * ca - ry0 * sa; y = rx0 * sa + ry0 * ca;
    z = mix(z, SPARK[2], qe);
    sc *= 1 - 0.92 * qe;
    rz += ang * 57;
    o *= 1 - smoothstep(0.82, 1, q);
  }
  return {x, y, z, ry, rz, sc, o, flash: decay(t, s.land, 7)};
};

export const FactorySet: React.FC<{t: number; cam: ResolvedCam; opts?: FactoryOpts}> = ({t, cam, opts}) => {
  const o: FactoryOpts = opts ?? {};
  const fog = o.fog ?? [3200, 9000];
  const look = o.look ?? 'frost';
  const sweeps = o.sweeps ?? [];
  const items: React.ReactNode[] = [];
  for (const s of SLOTS) {
    const st = cardState(s, t, o.inhale);
    if (!st) continue;
    const p: V3 = [st.x, st.y, st.z];
    const depth = depthOf(cam, p);
    if (depth < 30) continue;
    const scr = cam.persp / depth;
    let op = st.o * (1 - smoothstep(fog[0], fog[1], depth)) * (1 - smoothstep(10.5 * PX, 13.5 * PX, Math.abs(st.x)));
    if (op < 0.01) continue;
    const proj = project(cam, p);
    if (proj.x < -900 || proj.x > 2820 || proj.y < -700 || proj.y > 1780) continue;
    const sheen = sweepAt(t, st.x, sweeps);
    const flash = Math.max(st.flash, (o.pulse ?? 0) * 0.6);
    const lod = s.named >= 0 && scr > 0.42 ? -1 : scr > 0.5 ? 0 : scr > 0.13 ? 1 : 2;
    items.push(
      <Obj key={s.i} x={st.x} y={st.y} z={st.z} ry={st.ry} rz={st.rz} s={st.sc} o={op} nearFade={[60, 420]} dof={s.named >= 0 ? 1 : 0.6}>
        {lod === -1 ? <HeroBot n={s.named} sheen={sheen} flash={flash} look="frost" /> : <GlassBot b={s.b} lod={lod} look={s.named >= 0 ? 'frost' : look} sheen={sheen} flash={flash} />}
      </Obj>,
    );
  }
  return <>{items}</>;
};

/* ------------------------------------------------------------------ */
/* A full frame of the factory: backdrop + World + overlays            */
/* ------------------------------------------------------------------ */
export const FactoryFrame: React.FC<{
  t: number; f: number; from: number; cam: CamSpec; opts?: FactoryOpts; aperture?: number; focus?: number | V3;
  mb?: {vx: number; vy: number}; spark?: number; glint?: number; floor?: boolean; label?: boolean; rays?: number; dim?: number;
}> = ({t, f, from, cam, opts, aperture = 0, focus, mb, spark = 1, glint = 0, floor = true, label = false, rays = 0, dim = 0}) => {
  const rc = resolveCam(cam);
  const SP = sparkAt(t);
  const sp = project(rc, SP);
  const sparkSize = opts?.sparkle ?? 230;
  const world = (
    <World
      camera={rc}
      aperture={aperture}
      focus={focus}
      backdrop={
        <>
          <SpaceBackdrop from={from} frame={t} camX={rc.yaw * 18} camY={-rc.pitch * 14} haze={0.35} intensity={1.1} />
          {floor && <FloorGrid y={FLOOR_Y} step={250} extent={9000} center={[0, -1500]} fade={[2500, 9000]} far={14000} opacity={0.28} />}
        </>
      }
    >
      <FactorySet t={t} cam={rc} opts={opts} />
      {spark > 0.01 && opts?.showSpark !== false && (
        <Obj x={SP[0]} y={SP[1]} z={SP[2]} billboard o={spark} dof={0.5}>
          <SparkleGlyph size={sparkSize} t={t} charge={glint} />
        </Obj>
      )}
      {label && t < 36 && (
        <Obj x={SP[0]} y={SP[1] + sparkSize * 0.74} z={SP[2]} billboard o={spark * (1 - smoothstep(22, 34, t))} dof={0.5}>
          <HudLabel color="#E2D6FF" size={22}>Build with AI</HudLabel>
        </Obj>
      )}
    </World>
  );
  return (
    <AbsoluteFill>
      {mb && Math.hypot(mb.vx, mb.vy) > 1.5 ? <MotionBlur vx={mb.vx} vy={mb.vy}>{world}</MotionBlur> : world}
      {dim > 0.01 && <AbsoluteFill style={{background: `radial-gradient(55% 60% at ${sp.x.toFixed(0)}px ${sp.y.toFixed(0)}px, rgba(4,2,10,${(0.3 * dim).toFixed(3)}) 0%, rgba(4,2,10,${(0.75 * dim).toFixed(3)}) 65%, rgba(4,2,10,${(0.92 * dim).toFixed(3)}) 100%)`}} />}
      {rays > 0.01 && sp.visible && <GodRays x={sp.x} y={sp.y} intensity={rays} frame={t} lobes={18} length={1500} dust={0.6} />}
      {glint > 0.01 && sp.visible && <Glint x={sp.x} y={sp.y} size={260 + 300 * glint} intensity={glint * (0.8 + 0.4 * kick(f, 8))} frame={t} />}
    </AbsoluteFill>
  );
};
