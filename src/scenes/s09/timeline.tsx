// s09 chapter 2 (beats 128–132): macro tracking along the turn timeline. A playhead snaps from event to event on
// half beats (speed-ramped between them), markers pop and their ms counters roll. Timings are illustrative.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {FONT, MONO, clamp, lerp, kick} from '../../lib';
import {World, Obj, CamSpec, V3, ResolvedCam, resolveCam, useCam, MotionBlur, project} from '../../cine';
import {DustField, FlareBurst, Shockwave} from '../../vfx';
import {SpaceLayer, GridLayer, HudLabel, eo, bo, p01} from './kit';

type LFn = (k: number) => number;

export const TL = [
  {label: 'Message sent', ms: 0, c: '#AA8CFF', rgb: '170,140,255'},
  {label: 'Judge complete', ms: 200, c: '#45E3B0', rgb: '69,227,176'},
  {label: 'Fields extracted', ms: 350, c: '#FFC04D', rgb: '255,192,77'},
  {label: 'Prompt ready', ms: 420, c: '#AA8CFF', rgb: '170,140,255'},
  {label: 'First token', ms: 520, c: '#FFC04D', rgb: '255,192,77'},
  {label: 'Function result', ms: 780, c: '#7FE7FF', rgb: '127,231,255'},
  {label: 'Last token', ms: 1240, c: '#45E3B0', rgb: '69,227,176'},
];
export const RAIL_X0 = -1500, RAIL_X1 = 1500;
export const tlX = (ms: number) => RAIL_X0 + (ms / 1240) * (RAIL_X1 - RAIL_X0);
export const popAt = (L: LFn, i: number) => L(128 + i * 0.5);
const FLOOR = 420;

const inOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

/** Playhead x at scene frame t: snaps marker to marker, arriving on each half beat. */
export const playX = (L: LFn, t: number) => {
  if (t <= popAt(L, 0)) return tlX(0);
  for (let i = 0; i < TL.length - 1; i++) {
    const a = popAt(L, i), b = popAt(L, i + 1);
    if (t < b) return lerp(tlX(TL[i].ms), tlX(TL[i + 1].ms), inOut(clamp((t - a) / (b - a))));
  }
  return tlX(1240);
};
/** Playhead time value (ms) for the rolling HUD counter. */
export const playMs = (L: LFn, t: number) => ((playX(L, t) - RAIL_X0) / (RAIL_X1 - RAIL_X0)) * 1240;
/** Smoothed playhead (camera follow with lag). */
export const followX = (L: LFn, t: number, lag = 6) => {
  let s = 0, w = 0;
  for (let k = 0; k < 18; k++) {
    const q = Math.exp(-k / lag);
    s += q * playX(L, t - k);
    w += q;
  }
  return s / w;
};

/* raw projection inside the World (lens space, no zoom/shift) */
const projRaw = (c: ResolvedCam, p: V3) => {
  const q0 = p[0] - c.pos[0], q1 = p[1] - c.pos[1], q2 = p[2] - c.pos[2];
  const depth = -(q0 * c.b[0] + q1 * c.b[1] + q2 * c.b[2]);
  const xc = q0 * c.r[0] + q1 * c.r[1] + q2 * c.r[2];
  const yc = q0 * c.d[0] + q1 * c.d[1] + q2 * c.d[2];
  const s = c.persp / Math.max(1, depth);
  return {x: 960 + xc * s, y: 540 + yc * s, depth, s};
};

/** Rail, ticks and progress drawn as camera-projected 2D SVG (cheap, exact, no giant 3D planes). */
const RailSvg: React.FC<{t: number; L: LFn; f: number}> = ({t, L, f}) => {
  const c = useCam();
  if (!c) return null;
  const px = playX(L, t);
  const near = 60;
  const seg = (x0: number, x1: number, y = 0, n = 40) => {
    let d = '';
    let pen = false;
    for (let i = 0; i <= n; i++) {
      const x = lerp(x0, x1, i / n);
      const p = projRaw(c, [x, y, 0]);
      if (p.depth < near) { pen = false; continue; }
      d += `${pen ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      pen = true;
    }
    return d;
  };
  const mid = projRaw(c, [px, 0, 0]);
  const w = (k: number) => Math.max(0.6, Math.min(30, k * mid.s));
  // ticks
  let ticks = '', ticksBig = '';
  const labels: React.ReactNode[] = [];
  for (let ms = 0; ms <= 1240; ms += 20) {
    const x = tlX(ms);
    const big = ms % 100 === 0;
    const a = projRaw(c, [x, 26, 0]), b = projRaw(c, [x, big ? 70 : 46, 0]);
    if (a.depth < near || b.depth < near) continue;
    if (a.x < -100 || a.x > 2020) continue;
    const s = `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    if (big) {
      ticksBig += s;
      const lp = projRaw(c, [x, 100, 0]);
      if (lp.s > 0.25) labels.push(<text key={ms} x={lp.x} y={lp.y} fill="rgba(205,187,255,0.55)" fontFamily="DejaVu Sans Mono" fontSize={Math.min(40, 17 * lp.s)} textAnchor="middle">{ms}</text>);
    } else ticks += s;
  }
  const k = kick(f, 8);
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      <defs>
        <linearGradient id="s09rail" gradientUnits="userSpaceOnUse" x1={projRaw(c, [RAIL_X0, 0, 0]).x} y1={0} x2={mid.x} y2={0}>
          <stop offset="0%" stopColor="#8C6BEA" />
          <stop offset="60%" stopColor="#7FE7FF" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>
      <path d={seg(RAIL_X0 - 300, RAIL_X1 + 300, 0, 80)} stroke="rgba(180,155,242,0.22)" strokeWidth={w(10)} fill="none" strokeLinecap="round" />
      <path d={ticks} stroke="rgba(205,187,255,0.35)" strokeWidth={w(2.5)} fill="none" />
      <path d={ticksBig} stroke="rgba(205,187,255,0.6)" strokeWidth={w(3.5)} fill="none" />
      {labels}
      {px > RAIL_X0 + 2 ? (
        <>
          <path d={seg(RAIL_X0, px, 0, 60)} stroke="rgba(127,231,255,0.18)" strokeWidth={w(46 + 20 * k)} fill="none" strokeLinecap="round" />
          <path d={seg(RAIL_X0, px, 0, 60)} stroke="url(#s09rail)" strokeWidth={w(12)} fill="none" strokeLinecap="round" />
          <path d={seg(RAIL_X0, px, 0, 60)} stroke="rgba(255,255,255,0.9)" strokeWidth={w(3.5)} fill="none" strokeLinecap="round" />
        </>
      ) : null}
      {mid.depth > near ? (
        <>
          <circle cx={mid.x} cy={mid.y} r={w(70)} fill="rgba(127,231,255,0.12)" />
          <circle cx={mid.x} cy={mid.y} r={w(30)} fill="rgba(127,231,255,0.35)" />
          <circle cx={mid.x} cy={mid.y} r={w(13)} fill="#FFFFFF" />
        </>
      ) : null}
    </svg>
  );
};

/** One event marker + its label card. */
const Marker: React.FC<{i: number; t: number; L: LFn; f: number}> = ({i, t, L, f}) => {
  const e = TL[i];
  const at = popAt(L, i);
  const p = bo((t - at) / 14);
  const lit = t >= at;
  const ring = p01(t, at, 22);
  const cnt = Math.round(e.ms * eo((t - at) / 16));
  const k = kick(f, 10);
  const up = true;
  const cy = i % 2 === 0 ? -235 : -420;
  const conn = -cy - 75 - 40;
  const cardP = eo((t - at - 2) / 14);
  return (
    <>
      <Obj x={tlX(e.ms)} y={0} z={3} dof={false}>
        <div style={{position: 'relative', width: 86, height: 86}}>
          {lit && ring < 1 ? <div style={{position: 'absolute', left: -70 * eo(ring), top: -70 * eo(ring), width: 86 + 140 * eo(ring), height: 86 + 140 * eo(ring), borderRadius: '50%', boxShadow: `inset 0 0 0 ${4 * (1 - ring)}px rgba(${e.rgb},${1 - ring}), 0 0 ${30 * (1 - ring)}px rgba(${e.rgb},${0.8 * (1 - ring)})`}} /> : null}
          <div style={{position: 'absolute', inset: 0, borderRadius: '50%', transform: `scale(${lit ? 0.55 + 0.45 * p : 0.55})`,
            background: lit ? `radial-gradient(circle at 35% 30%, #FFFFFF 0%, rgba(${e.rgb},0.9) 30%, rgba(14,7,30,0.9) 70%)` : 'rgba(20,10,40,0.85)',
            boxShadow: `inset 0 0 0 7px ${lit ? e.c : 'rgba(180,155,242,0.35)'}, 0 0 ${lit ? 40 + 30 * k : 0}px rgba(${e.rgb},0.85)`}} />
        </div>
      </Obj>
      {cardP > 0 ? (
        <Obj x={tlX(e.ms)} y={cy} z={3}>
          <div style={{position: 'relative', width: 380, height: 150, opacity: clamp(cardP * 1.5), transform: `translateY(${(1 - cardP) * (up ? 40 : -40)}px) scale(${lerp(0.85, 1, cardP)})`}}>
            {/* connector */}
            <div style={{position: 'absolute', left: 189, width: 2, [up ? 'top' : 'bottom']: 150, height: conn * cardP, background: `linear-gradient(${up ? 180 : 0}deg, rgba(${e.rgb},0.9), rgba(${e.rgb},0.1))`, boxShadow: `0 0 12px rgba(${e.rgb},0.7)`}} />
            <div style={{position: 'absolute', inset: 0, borderRadius: 30, background: 'linear-gradient(160deg, rgba(56,32,100,0.78) 0%, rgba(22,11,46,0.74) 55%, rgba(12,6,30,0.8) 100%)', boxShadow: `inset 0 0 0 1.5px rgba(${e.rgb},0.65), inset 0 1px 0 rgba(255,255,255,0.3), 0 20px 40px -20px rgba(0,0,0,0.9), 0 0 ${36 + 24 * k}px -6px rgba(${e.rgb},0.55)`}} />
            <div style={{position: 'absolute', left: 0, right: 0, top: 18, textAlign: 'center', fontFamily: FONT, fontWeight: 650, fontSize: 30, color: '#F3EEFF', whiteSpace: 'nowrap', letterSpacing: '-0.01em'}}>{e.label}</div>
            <div style={{position: 'absolute', left: 0, right: 0, top: 64, textAlign: 'center', fontFamily: MONO, fontWeight: 700, fontSize: 50, color: e.c, whiteSpace: 'nowrap', textShadow: `0 0 18px rgba(${e.rgb},0.8)`}}>
              {cnt.toLocaleString('en-US')}<span style={{fontSize: 28, color: 'rgba(216,203,255,0.75)', marginLeft: 8}}>ms</span>
            </div>
          </div>
        </Obj>
      ) : null}
    </>
  );
};

/** The timeline set inside a World. */
export const TimelineShot: React.FC<{t: number; from: number; L: LFn; cam: CamSpec; aperture?: number; focus?: number | V3; blur?: {vx: number; vy: number}; children?: React.ReactNode}> = ({t, from, L, cam, aperture = 0, focus, blur, children}) => {
  const f = t + from;
  const rc = resolveCam(cam);
  const world = (
    <World camera={rc} aperture={aperture} focus={focus} backdrop={<><GridLayer floorY={FLOOR} grid={0.34} /><RailSvg t={t} L={L} f={f} /></>}>
      {/* light pools on the floor under lit markers + the playhead */}
      {TL.map((e, i) => {
        const lit = eo((t - popAt(L, i)) / 10);
        if (lit <= 0) return null;
        return (
          <Obj key={`p${i}`} x={tlX(e.ms)} y={FLOOR} z={0} rx={90} dof={false}>
            <div style={{width: 760, height: 520, borderRadius: '50%', background: `radial-gradient(closest-side, rgba(${e.rgb},${0.38 * lit}), rgba(${e.rgb},${0.12 * lit}) 45%, rgba(${e.rgb},0))`}} />
          </Obj>
        );
      })}
      <Obj x={playX(L, t)} y={FLOOR} z={0} rx={90} dof={false}>
        <div style={{width: 1100, height: 420, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(127,231,255,0.32), rgba(127,231,255,0.08) 50%, rgba(127,231,255,0))'}} />
      </Obj>
      {TL.map((_, i) => <Marker key={i} i={i} t={t} L={L} f={f} />)}
    </World>
  );
  const last = popAt(L, 6);
  const lp = project(rc, [tlX(1240), 0, 0]);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <SpaceLayer from={from} cam={rc} haze={0.25} intensity={0.9} />
      {blur ? <MotionBlur vx={blur.vx} vy={blur.vy}>{world}</MotionBlur> : world}
      <DustField camX={-rc.pos[0] * 0.25} camY={rc.pitch * 20} count={110} boost={0.4 * kick(f, 8)} frame={t} seed={31} />
      {t >= last - 1 && t < last + 70 && lp.visible ? (
        <>
          <Shockwave x={lp.x} y={lp.y} at={last} dur={34} radius={520 * Math.min(1.6, lp.scale)} thickness={50} rings={2} core={false} intensity={0.8} frame={t} />
          <FlareBurst x={lp.x} y={lp.y} at={last} dur={64} peak={1.3} scale={0.75} flash={0.18} color="#9FFFD9" frame={t} />
        </>
      ) : null}
      {children}
    </AbsoluteFill>
  );
};

/** Big rolling HUD readout of the playhead time. */
export const MsReadout: React.FC<{t: number; L: LFn; o: number; x: number; y: number}> = ({t, L, o, x, y}) => {
  if (o <= 0.01) return null;
  const ms = Math.round(playMs(L, t));
  return (
    <div style={{position: 'absolute', left: x, top: y, opacity: o, textAlign: 'right'}}>
      <HudLabel text="Turn 8 · trace" size={15} color="#BFF4FF" style={{marginBottom: 6}} />
      <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 54, color: '#F3EEFF', textShadow: '0 0 20px rgba(127,231,255,0.7)', whiteSpace: 'nowrap'}}>
        {ms.toLocaleString('en-US').padStart(5, ' ')}<span style={{fontSize: 26, color: '#BFF4FF', marginLeft: 10}}>ms</span>
      </div>
    </div>
  );
};
