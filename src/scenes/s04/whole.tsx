// Shot I (beats 50–52): "Get a whole bot." Speed-ramped pull-back from the proposal to the whole assembled system:
// the Build-with-AI page as exploded frost glass, and above it the generated bot as a hologram — state orbs joined
// by light trails, typed judgments, a policy and a function orbiting. At 51.5 the camera accelerates into the
// collect_details orb (zoom-through into s05 "States").
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {MONO, FONT, kick} from '../../lib';
import {World, Obj, CamKey, addCam, handheld, kickPush, resolveCam, project, FloorGrid, V3, camPath} from '../../cine';
import {DustField, LensFlare, Bokeh} from '../../vfx';
import {UITheme} from '../../ui/theme';
import {GlassPane, TypedChip} from '../../ui/glass';
import {Icon} from '../../ui/kit';
import {BuildMain} from '../../ui/screens';
import {Sky, Copy, HudTag, HoloOrb, sat, pr, easeOutExpo} from './common';

/** graph nodes (world px, on a vertical plane at z = GZ) — the same five states s05 opens with */
const GZ = 160;
export const NODES: {id: string; p: [number, number]; icon?: string; start?: boolean; tone?: 'lilac' | 'cyan' | 'green' | 'amber'}[] = [
  {id: 'start', p: [-780, -300], start: true},
  {id: 'discover', p: [-300, -640], icon: 'chat'},
  {id: 'collect_details', p: [260, -380], icon: 'doc', tone: 'cyan'},
  {id: 'follow_up', p: [720, -720], icon: 'mail'},
  {id: 'booked', p: [-70, 40], icon: 'calendar', tone: 'green'},
];
const EDGES: [number, number, number][] = [[0, 1, -50], [1, 2, -50], [2, 3, -40], [2, 4, 60], [3, 1, 150]];
export const ORB_TARGET: V3 = [NODES[2].p[0], NODES[2].p[1], GZ + 40];
const PAGE: V3 = [1240, 330, -380];

const edgeD = (a: [number, number], b: [number, number], bend: number, ox: number, oy: number) => {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  const cx = mx - (dy / L) * bend, cy = my + (dx / L) * bend;
  // trim ends to the orb radius
  const r = 120;
  const sx = a[0] + ((cx - a[0]) / Math.hypot(cx - a[0], cy - a[1])) * r, sy = a[1] + ((cy - a[1]) / Math.hypot(cx - a[0], cy - a[1])) * r;
  const ex = b[0] + ((cx - b[0]) / Math.hypot(cx - b[0], cy - b[1])) * r, ey = b[1] + ((cy - b[1]) / Math.hypot(cx - b[0], cy - b[1])) * r;
  return `M${sx - ox} ${sy - oy} Q${cx - ox} ${cy - oy} ${ex - ox} ${ey - oy}`;
};

/** light-trail edges drawn on one flat plane (cheap: one SVG) */
const Edges: React.FC<{draw: number; t: number}> = ({draw, t}) => {
  const ox = -1000, oy = -1000, w = 2000, h = 1300;
  return (
    <Obj x={ox + w / 2} y={oy + h / 2} z={GZ - 20} w={w} h={h} dof={false}>
      <svg width={w} height={h} style={{overflow: 'visible'}}>
        <defs>
          <linearGradient id="s04e" x1="0" x2="1"><stop offset="0" stopColor="#7FE7FF" /><stop offset="1" stopColor="#B49BF2" /></linearGradient>
        </defs>
        {EDGES.map(([a, b, bend], i) => {
          const d = edgeD(NODES[a].p, NODES[b].p, bend, ox, oy);
          const p = sat(draw * 1.6 - i * 0.22);
          const dash = i === 4 ? '18 16' : undefined;
          return (
            <g key={i} opacity={p > 0 ? 1 : 0}>
              <path d={d} stroke="rgba(140,107,234,0.35)" strokeWidth={26} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={`${p} 1`} />
              <path d={d} stroke="url(#s04e)" strokeWidth={9} fill="none" strokeLinecap="round" pathLength={dash ? undefined : 1} strokeDasharray={dash ?? `${p} 1`} opacity={dash ? p : 1} />
              <path d={d} stroke="#FFFFFF" strokeWidth={3.5} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={`${p} 1`} opacity={0.9} />
              {p >= 1 && <path d={d} stroke="#FFFFFF" strokeWidth={9} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray="0.06 0.94" strokeDashoffset={-(((t * 0.03 + i * 0.27) % 1))} opacity={0.95} style={{filter: 'drop-shadow(0 0 8px #7FE7FF)'}} />}
            </g>
          );
        })}
      </svg>
    </Obj>
  );
};

/** orbiting typed pieces of the bot */
const PIECES: {el: (k: number) => React.ReactNode; p: V3}[] = [
  {p: [-860, -760, 260], el: (k) => <TypedChip look="holo" name="intent" value="booking" conf={0.92} kind="choice" size={34} pulse={0.4 * k} />},
  {p: [1060, -420, 300], el: (k) => <TypedChip look="holo" name="goal_clear" value="yes" conf={0.94} kind="noul" size={34} pulse={0.4 * k} />},
  {p: [-640, 170, 320], el: (k) => <TypedChip look="holo" name="booked" value="yes" conf={0.96} kind="noul" size={34} pulse={0.4 * k} />},
  {p: [560, -60, 340], el: (k) => (
    <GlassPane look="holo" w={430} h={118} radius={26} glow={0.5 + 0.4 * k} padding="18px 24px">
      <div style={{fontFamily: MONO, fontSize: 30, color: '#FFD27A', textShadow: '0 0 14px rgba(255,192,77,0.8)', whiteSpace: 'nowrap'}}>ƒ book_appointment</div>
      <div style={{fontFamily: FONT, fontSize: 19, color: 'rgba(216,203,255,0.8)', marginTop: 8, letterSpacing: '0.2em'}}>CLERK · ASYNC</div>
    </GlassPane>
  )},
  {p: [180, -960, 220], el: (k) => (
    <GlassPane look="holo" w={580} h={104} radius={26} glow={0.4 + 0.4 * k} padding="16px 22px">
      <div style={{fontFamily: MONO, fontSize: 25, color: '#EEE8FF', whiteSpace: 'nowrap'}}><span style={{color: '#C3AEFF'}}>when</span> intent = booking <span style={{color: '#C3AEFF'}}>then</span> collect</div>
      <div style={{fontFamily: FONT, fontSize: 17, color: 'rgba(216,203,255,0.75)', marginTop: 6, letterSpacing: '0.24em'}}>POLICY · GLOBAL</div>
    </GlassPane>
  )},
];

const WholeSet: React.FC<{lt: number; t: number; f: number; e: number}> = ({lt, t, f, e}) => {
  const k = kick(f, 9);
  return (
    <>
      <Obj x={0} y={-400} z={-700} dof={false}>
        <div style={{width: 4200, height: 2600, background: `radial-gradient(50% 50% at 50% 50%, rgba(140,107,234,${(0.34 + 0.1 * k).toFixed(3)}), rgba(127,231,255,0.05) 55%, transparent 75%)`}} />
      </Obj>
      {/* the Build with AI page, exploded frost glass */}
      <Obj x={PAGE[0]} y={PAGE[1]} z={PAGE[2]} ry={-18}>
        <GlassPane look="frost" tint="frame" w={1000} h={960} radius={40} glow={0.4} preserve3d padding={30}>
          <UITheme look="frost">
            <BuildMain t={400} e={e} typeAt={0} pressAt={60} proposalAt={80} />
          </UITheme>
        </GlassPane>
      </Obj>
      {/* the generated bot: orbs + light trails */}
      <Edges draw={pr(lt, 6, 20)} t={t} />
      {NODES.map((n, i) => {
        const p = pr(lt, 2 + i * 3, 14);
        if (p <= 0) return null;
        return (
          <Obj key={n.id} x={n.p[0]} y={n.p[1] + 14 * Math.sin((t + i * 21) / 22)} z={GZ + 40} billboard>
            <HoloOrb size={290} label={n.id} tone={n.start ? 'green' : n.tone ?? 'lilac'} glow={n.id === 'collect_details' ? 0.9 + 0.5 * k : 0.45} p={p}
              icon={(() => { const I = Icon[n.start ? 'play' : n.icon ?? 'doc']; return <I size={64} color="#fff" sw={2} />; })()} />
          </Obj>
        );
      })}
      {PIECES.map((pc, i) => {
        const p = easeOutExpo(pr(lt, 6 + i * 2, 16));
        if (p <= 0) return null;
        // fly up from the page into orbit
        const from: V3 = [PAGE[0] - 200, PAGE[1] - 100, PAGE[2] + 200];
        const a = (t + i * 40) / 60;
        const x = from[0] + (pc.p[0] - from[0]) * p + 18 * Math.cos(a);
        const y = from[1] + (pc.p[1] - from[1]) * p + 14 * Math.sin(a);
        const z = from[2] + (pc.p[2] - from[2]) * p;
        return (
          <Obj key={i} x={x} y={y} z={z} billboard o={sat(p * 2)}>
            {pc.el(k)}
          </Obj>
        );
      })}
    </>
  );
};

/** fast pull-back (expo out) → slow glide → accelerate into the orb (expo in): fast–slow–fast */
const KEYS: CamKey[] = [
  {at: 0, target: [PAGE[0] - 80, PAGE[1] - 60, PAGE[2]], yaw: -24, pitch: -13, roll: -5, dist: 1750, focal: 28},
  {at: 20, ease: 'expoOut', target: [150, -190, 40], yaw: -11, pitch: -4, roll: -2, dist: 3050},
  {at: 38, ease: 'linear', target: [180, -210, 60], yaw: -7, pitch: -3, roll: -1, dist: 2920},
  {at: 54, ease: 'cubicIn', target: ORB_TARGET, yaw: -4, pitch: -2, roll: 3, dist: 520, focal: 30},
];

export const WholeShot: React.FC<{lt: number; t: number; from: number}> = ({lt, t, from}) => {
  const f = t + from;
  const tau = lt;
  const cam = addCam(camPath(lt, KEYS), handheld(lt, 0.6, 41), kickPush(f, 22));
  const rc = resolveCam(cam);
  const e = 1.4 - 0.7 * easeOutExpo(pr(lt, 0, 30));
  const fl = project(rc, [NODES[3].p[0] + 90, NODES[3].p[1] - 90, GZ + 80]);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <Sky cam={cam} from={from} t={t} haze={0.5} />
      <World camera={cam} backdrop={<FloorGrid y={900} step={190} opacity={0.3} center={[0, -500]} extent={4600} fade={[900, 4400]} />}>
        <WholeSet lt={lt} t={t} f={f} e={e} />
      </World>
      {fl.visible && <LensFlare x={fl.x} y={fl.y} intensity={0.4 + 0.2 * kick(f, 10)} scale={0.6} streak={0.9} frame={t} />}
      <DustField frame={t} count={80} camX={-tau * 4} boost={kick(f) * 0.5} />
      <Bokeh frame={t} count={12} focus={0.05} opacity={0.5} camX={-tau * 6} />
      <Copy words={['Get', 'a', 'whole', 'bot.']} t={lt - 8} out={lt - 41} x={124} y={786} size={140} accent={[3]} kicker="Step 2 · Proposal → Bot" />
      <HudTag x={1770} y={150} t={lt - 10} align="right" label="Bot assembled" value="4 states · 6 judgments · 5 policies" />
    </AbsoluteFill>
  );
};
