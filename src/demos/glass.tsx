import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import type {SceneProps} from '../cine/types';
import {FONT, DISPLAY, MONO, prog, expoOut, expoInOut, smooth, clamp, kick, rand} from '../lib';
import {Stage, Cam, Avatar} from '../ui/kit';
import {ChatPanel, Msg, DEFAULT_CHAT} from '../ui/app';
import {DashboardMain, BuildMain, GNode, GEdge} from '../ui/screens';
import {GlassPane, TypedChip, ExplodedStack} from '../ui/glass';
import {HoloAppFrame, SignalBars3D, HoloGraph} from '../ui/holo';

/**
 * Glass UI showcase (demo:glass), 600 frames:
 *   A    0–110  frost HoloAppFrame assembles from depth, then explodes in 3D with data beams
 *   B  110–200  holo HoloAppFrame, low-angle orbit, re-assembles (lock flash)
 *   C  200–270  macro on SignalBars3D field
 *   D  270–340  SignalBars3D wall + floating TypedChips
 *   E  340–420  HoloGraph (glass orbs + light trails + token)
 *   F1 420–480  ExplodedStack fan of GlassPanes with floor reflections + sheen
 *   F2 480–540  ChatPanel in real backdrop-blur glass + TypedChips
 *   G  540–600  holo HoloAppFrame with BuildMain (any main content), chrome title strip
 */

const kf = (t: number, pts: [number, number][], ease = expoInOut) =>
  interpolate(t, pts.map((p) => p[0]), pts.map((p) => p[1]), {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});

const AUDIO = 2900; // borrow drop-2 energy for audio-reactive values

const Space: React.FC<{t: number; hue?: number}> = ({t, hue = 0}) => (
  <AbsoluteFill style={{background: 'radial-gradient(100% 90% at 50% 38%, #1c0c38 0%, #0c0519 52%, #04020a 100%)', overflow: 'hidden'}}>
    <AbsoluteFill style={{background: `radial-gradient(38% 42% at ${26 + 5 * Math.sin(t / 90)}% ${30 + hue}%, rgba(140,107,234,0.32), transparent 70%), radial-gradient(32% 36% at ${78 + 4 * Math.cos(t / 80)}% 68%, rgba(127,231,255,0.10), transparent 70%), radial-gradient(28% 30% at 62% 12%, rgba(231,244,185,0.05), transparent 70%)`}} />
    {Array.from({length: 46}).map((_, i) => {
      const x = (rand(i) * 1920 + t * (0.15 + rand(i * 2) * 0.3)) % 1920;
      const y = (rand(i * 7.1) * 1080 - t * (0.1 + rand(i * 3) * 0.2) + 1080) % 1080;
      const s = 1.5 + rand(i * 1.7) * 2.5;
      return <div key={i} style={{position: 'absolute', left: x, top: y, width: s, height: s, borderRadius: '50%', background: '#D9CCFF', opacity: 0.25 + 0.35 * Math.abs(Math.sin(t / 30 + i))}} />;
    })}
  </AbsoluteFill>
);

const Hud: React.FC<{k: string; title: string}> = ({k, title}) => (
  <div style={{position: 'absolute', left: 120, bottom: 86, fontFamily: FONT, color: '#CDBBFF'}}>
    <div style={{fontSize: 16, fontWeight: 600, letterSpacing: '0.3em', textTransform: 'uppercase', opacity: 0.8}}>{k}</div>
    <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 40, letterSpacing: '-0.03em', color: '#F4F0FF', marginTop: 6}}>{title}</div>
  </div>
);

const App: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{position: 'absolute', left: 160, top: 40, width: 1600, height: 1000, transformStyle: 'preserve-3d'}}>{children}</div>
);

/* ---------------- A: frost assemble + explode ---------------- */
const ShotA: React.FC<{t: number}> = ({t}) => {
  const fa = t + AUDIO;
  const assemble = clamp((t - 2) / 50);
  const ex = kf(t, [[56, 0], [96, 1.15], [110, 1.22]]);
  const cam: Cam = {
    rx: kf(t, [[0, 10], [54, 6], [100, 12], [110, 13]], smooth),
    ry: kf(t, [[0, -16], [54, -10], [100, -34], [110, -37]], smooth),
    rz: kf(t, [[0, -2], [110, 1]], smooth),
    s: kf(t, [[0, 0.78], [54, 0.84], [100, 0.7], [110, 0.69]]),
    x: kf(t, [[0, 60], [100, 150], [110, 160]]),
    y: kf(t, [[0, 10], [110, 20]]),
  };
  return (
    <AbsoluteFill>
      <Space t={t} />
      <Stage cam={cam} persp={2000}>
        <App>
          <HoloAppFrame look="frost" t={t + 40} navT={t} assemble={assemble} explode={ex} spacing={170} spread={70} beams={1} glow={0.3} sheen={prog(t, 48, 36)} pool={0.7}
            main={({explode}) => <DashboardMain f={fa} t={t + 40} e={explode * 1.2} />} />
        </App>
      </Stage>
      <Hud k="frost · HoloAppFrame" title={t < 56 ? 'Assemble' : 'Explode'} />
    </AbsoluteFill>
  );
};

/* ---------------- B: holo hero orbit ---------------- */
const ShotB: React.FC<{t: number}> = ({t}) => {
  const fa = t + AUDIO + 200;
  const ex = kf(t, [[0, 1.3], [52, 1.1], [76, 0], [90, 0]]);
  const cam: Cam = {
    rx: kf(t, [[0, -12], [52, -6], [90, 4]], smooth),
    ry: kf(t, [[0, 34], [52, 18], [90, -4]], smooth),
    rz: kf(t, [[0, 4], [90, 0]], smooth),
    s: kf(t, [[0, 0.7], [52, 0.76], [76, 0.86], [90, 0.88]]),
    x: kf(t, [[0, -160], [90, 0]]),
    y: kf(t, [[0, 60], [90, 0]]),
  };
  const lock = prog(t, 70, 16);
  return (
    <AbsoluteFill>
      <Space t={t + 300} hue={10} />
      <Stage cam={cam} persp={1800}>
        <App>
          <HoloAppFrame look="holo" t={t + 200} explode={ex} spacing={160} spread={60} fan={-3} beams={1} glow={0.6 + 0.6 * kick(fa)} pool={0.8} sheen={lock > 0 && lock < 1 ? lock : undefined}
            main={({explode}) => <DashboardMain f={fa} t={t + 200} e={explode * 1.3} />} />
        </App>
      </Stage>
      <Hud k="holo · HoloAppFrame" title={t < 70 ? 'Exploded, low angle' : 'Re-assembled'} />
    </AbsoluteFill>
  );
};

/* ---------------- C: macro SignalBars3D field ---------------- */
const ShotC: React.FC<{t: number}> = ({t}) => {
  const cam: Cam = {
    rx: kf(t, [[0, 6], [70, 0]], smooth),
    ry: kf(t, [[0, -24], [70, 14]], smooth),
    rz: kf(t, [[0, -3], [70, 2]], smooth),
    s: kf(t, [[0, 1.55], [70, 1.28]], smooth),
    x: kf(t, [[0, 260], [70, -160]], smooth),
    y: kf(t, [[0, -40], [70, 30]], smooth),
  };
  return (
    <AbsoluteFill>
      <Space t={t + 600} />
      <Stage cam={cam} persp={1500} crisp>
        <div style={{position: 'absolute', left: 960 - 459, top: 620 - 255, transformStyle: 'preserve-3d'}}>
          <SignalBars3D layout="field" f={t + AUDIO + 380} t={t} reveal={0} tilt={64} highlight={22} />
        </div>
      </Stage>
      <Hud k="holo · SignalBars3D" title="Field, macro" />
    </AbsoluteFill>
  );
};

/* ---------------- D: wall + typed chips ---------------- */
const ShotD: React.FC<{t: number}> = ({t}) => {
  const fa = t + AUDIO + 520;
  const cam: Cam = {rx: kf(t, [[0, 4], [70, 8]], smooth), ry: kf(t, [[0, 14], [70, -10]], smooth), s: kf(t, [[0, 0.86], [70, 0.92]], smooth), x: kf(t, [[0, 40], [70, -30]], smooth), y: -40};
  const chips: [string, string, number | undefined, 'score' | 'noul' | 'choice', number, number, number, number][] = [
    ['enjoyment', '2', 0.91, 'score', 1420, 250, 200, 6],
    ['goal_clear', 'yes', 0.94, 'noul', 470, 250, 160, 14],
    ['intent', 'booking', 0.88, 'choice', 1300, 830, 240, 22],
  ];
  return (
    <AbsoluteFill>
      <Space t={t + 900} />
      <Stage cam={cam} persp={2000}>
        <div style={{position: 'absolute', left: 960 - 760, top: 150, transformStyle: 'preserve-3d'}}>
          <SignalBars3D layout="wall" panel f={fa} t={t} reveal={0} rows={1} barW={20} gap={11} maxH={360} highlight={7} />
        </div>
        {chips.map(([n, v, c, k, x, y, z, at], i) => (
          <div key={n} style={{position: 'absolute', left: x, top: y + 10 * Math.sin(t / 24 + i), transform: `translate(-50%,-50%) translateZ(${z}px)`}}>
            <TypedChip name={n} value={v} conf={c} kind={k} look="holo" size={30} p={prog(t, at, 26)} pulse={0.5 * kick(fa, 10)} />
          </div>
        ))}
      </Stage>
      <Hud k="holo · SignalBars3D + TypedChip" title="Signal Wall" />
    </AbsoluteFill>
  );
};

/* ---------------- E: HoloGraph ---------------- */
const NODES: GNode[] = [
  {id: 'start', x: 160, y: 380, start: true, at: 0},
  {id: 'discover', x: 560, y: 220, icon: 'chat', at: 6},
  {id: 'collect_details', x: 980, y: 420, icon: 'doc', at: 12},
  {id: 'follow_up', x: 1400, y: 220, icon: 'mail', at: 18},
  {id: 'booked', x: 1400, y: 600, icon: 'calendar', at: 24},
];
const EDGES: GEdge[] = [
  {a: 'start', b: 'discover', at: 8},
  {a: 'discover', b: 'collect_details', at: 14, label: 'goal_clear · yes'},
  {a: 'collect_details', b: 'follow_up', at: 20, bend: 40},
  {a: 'collect_details', b: 'booked', at: 26, bend: -40, label: 'booking'},
  {a: 'follow_up', b: 'discover', at: 32, bend: 120, dashed: true, label: 'retry'},
];
const ShotE: React.FC<{t: number}> = ({t}) => {
  const rx = kf(t, [[0, 58], [80, 40]], smooth);
  const ry = kf(t, [[0, -12], [80, 10]], smooth);
  const rz = kf(t, [[0, 6], [80, -4]], smooth);
  const cam: Cam = {rx, ry, rz, s: kf(t, [[0, 0.95], [80, 1.08]], smooth), x: kf(t, [[0, 40], [80, -40]], smooth), y: kf(t, [[0, 120], [80, 80]], smooth)};
  return (
    <AbsoluteFill>
      <Space t={t + 1200} hue={-8} />
      <Stage cam={cam} persp={1600}>
        <div style={{position: 'absolute', left: 960 - 780, top: 540 - 410, transformStyle: 'preserve-3d'}}>
          <HoloGraph t={t} nodes={NODES} edges={EDGES} w={1560} h={820} orb={180} lift={90} face={{rx, ry, rz}} tokenPath={['start', 'discover', 'collect_details', 'booked']} tokenAt={28} tokenStep={16} />
        </div>
      </Stage>
      <Hud k="holo · HoloGraph + GlassOrbNode" title="States" />
    </AbsoluteFill>
  );
};

/* ---------------- F1: ExplodedStack fan + floor reflections + sheen ---------------- */
const ShotF1: React.FC<{t: number}> = ({t}) => {
  const fa = t + AUDIO + 700;
  const ex = kf(t, [[2, 0], [34, 1], [60, 1.04]]);
  const cam: Cam = {rx: kf(t, [[0, 9], [60, 5]], smooth), ry: kf(t, [[0, -10], [60, 6]], smooth), s: kf(t, [[0, 1.12], [60, 1.0]], smooth), y: -40};
  const val = 1.7 * prog(t, 20, 40);
  const panes = [
    <GlassPane key="j" w={440} h={300} titleBar="judgment · score" sheen={prog(t, 26, 30)} reflect={0.42} reflectGap={22} glow={0.3}>
      <div style={{padding: '22px 28px'}}>
        <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 34, letterSpacing: '-0.02em'}}>User enjoyment</div>
        <div style={{marginTop: 18, height: 18, borderRadius: 9, background: 'rgba(120,92,180,0.14)', overflow: 'hidden'}}><div style={{width: `${val * 50}%`, height: '100%', borderRadius: 9, background: 'linear-gradient(90deg, #8C6BEA, #36997D)', boxShadow: '0 0 14px #36997D'}} /></div>
        <div style={{marginTop: 22}}><TypedChip name="enjoyment" value={val.toFixed(1)} conf={0.91} kind="score" size={22} glow={0.3} /></div>
      </div>
    </GlassPane>,
    <GlassPane key="a" w={440} h={300} sheen={prog(t, 31, 30)} reflect={0.42} reflectGap={22} glow={0.5 + 0.5 * kick(fa)}>
      <div style={{height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16}}>
        <Avatar size={110} glow={0.5} wink={t > 40 && t < 48 ? 0 : 1} />
        <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 40, letterSpacing: '-0.035em'}}>Bot Studio</div>
      </div>
    </GlassPane>,
    <GlassPane key="c" w={440} h={300} titleBar="welcome_assistant.botscript" sheen={prog(t, 36, 30)} reflect={0.42} reflectGap={22} glow={0.3}>
      <div style={{padding: '22px 28px', fontFamily: MONO, fontSize: 21, lineHeight: 1.65}}>
        <span style={{color: '#6A45E0'}}>policy</span> next {'{'}<br />&nbsp;&nbsp;<span style={{color: '#6A45E0'}}>when</span> = goal_clear.yes {'>='} <span style={{color: '#C9700A'}}>0.90</span>;<br />&nbsp;&nbsp;<span style={{color: '#6A45E0'}}>then</span> {'{'} goto discover; {'}'}<br />{'}'}
      </div>
    </GlassPane>,
  ];
  return (
    <AbsoluteFill>
      <Space t={t + 1500} />
      <AbsoluteFill style={{background: 'radial-gradient(42% 34% at 50% 40%, rgba(160,130,255,0.42), rgba(160,130,255,0.12) 55%, transparent 80%), radial-gradient(20% 22% at 74% 36%, rgba(127,231,255,0.22), transparent 80%)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 600, height: 480, background: 'linear-gradient(to bottom, transparent, rgba(140,107,234,0.14) 18%, rgba(140,107,234,0.05) 55%, transparent)'}} />
      <Stage cam={cam} persp={2200}>
        <div style={{position: 'absolute', left: 960 - 260, top: 470 - 170, transformStyle: 'preserve-3d'}}>
          <ExplodedStack w={520} h={340} explode={ex} spacing={-60} dx={560} dy={-10} ry={-12} items={panes} />
        </div>
      </Stage>
      <Hud k="frost · ExplodedStack · GlassPane" title="Fan out, reflect, sweep" />
    </AbsoluteFill>
  );
};

/* ---------------- F2: chat in real backdrop-blur glass ---------------- */
const ShotF2: React.FC<{t: number}> = ({t}) => {
  const fa = t + AUDIO + 800;
  const msgs: Msg[] = [...DEFAULT_CHAT, {from: 'user', text: 'Thursday afternoon works!', at: 8, react: {emoji: '🔥', at: 22}}, {from: 'bot', text: 'Perfect. Locking in Thursday.', at: 48, typingFrom: 28, tag: 'create_lead · async'}];
  const chips: [string, string, number | undefined, 'score' | 'noul' | 'choice', number, number, number][] = [
    ['enjoyment', '2', 0.91, 'score', 470, 330, 10],
    ['goal_clear', 'yes', 0.94, 'noul', 440, 500, 18],
    ['intent', 'booking', 0.88, 'choice', 490, 670, 26],
  ];
  return (
    <AbsoluteFill>
      <Space t={t + 1700} />
      <div style={{position: 'absolute', left: 620, top: 300, fontFamily: DISPLAY, fontWeight: 900, fontSize: 330, lineHeight: 0.9, letterSpacing: '-0.05em', color: 'transparent', backgroundImage: 'linear-gradient(100deg, #FFFFFF 0%, #E2D6FF 40%, #B49BF2 70%, #E7F4B9 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', transform: `translateX(${120 - t * 3}px)`, whiteSpace: 'nowrap'}}>think.</div>
      <div style={{position: 'absolute', left: 1180, top: 110, transform: `translateY(${(1 - expoOut(clamp(t / 24))) * 50}px)`}}>
        <ChatPanel look="frost" t={t} msgs={msgs} w={500} h={860} blur={24} glow={0.5} sheen={prog(t, 50, 30)} />
      </div>
      {chips.map(([n, v, c, k, x, y, at], i) => (
        <div key={n} style={{position: 'absolute', left: x, top: y + 8 * Math.sin(t / 20 + i), transform: 'translate(-50%,-50%)'}}>
          <TypedChip name={n} value={v} conf={c} kind={k} look="holo" size={32} p={prog(t, at, 24)} pulse={0.6 * kick(fa, 10)} />
        </div>
      ))}
      <Hud k="frost · ChatPanel blur={24} · TypedChip" title="Chat in real glass" />
    </AbsoluteFill>
  );
};

/* ---------------- G: holo Build with AI, exploded ---------------- */
const ShotG: React.FC<{t: number}> = ({t}) => {
  const ex = kf(t, [[0, 0.2], [40, 1.1], [60, 1.2]]);
  const cam: Cam = {rx: kf(t, [[0, 16], [60, 10]], smooth), ry: kf(t, [[0, 24], [60, 36]], smooth), rz: kf(t, [[0, -3], [60, -1]], smooth), s: kf(t, [[0, 0.74], [60, 0.66]], smooth), x: kf(t, [[0, -40], [60, -120]], smooth), y: 70};
  return (
    <AbsoluteFill>
      <Space t={t + 2000} hue={6} />
      <Stage cam={cam} persp={2000}>
        <App>
          <HoloAppFrame look="holo" active="Build with AI" t={t} explode={ex} spacing={160} spread={60} beams={0.8} pool={0.6} chrome="Bot Studio · Welcome assistant"
            main={({explode}) => <BuildMain t={t + 30} e={explode * 1.2} typeAt={0} pressAt={40} proposalAt={44} />} />
        </App>
      </Stage>
      <Hud k="holo · HoloAppFrame + BuildMain" title="Any main content" />
    </AbsoluteFill>
  );
};

export const Scene: React.FC<SceneProps> = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#05020A'}}>
      {f < 110 && <ShotA t={f} />}
      {f >= 110 && f < 200 && <ShotB t={f - 110} />}
      {f >= 200 && f < 270 && <ShotC t={f - 200} />}
      {f >= 270 && f < 340 && <ShotD t={f - 270} />}
      {f >= 340 && f < 420 && <ShotE t={f - 340} />}
      {f >= 420 && f < 480 && <ShotF1 t={f - 420} />}
      {f >= 480 && f < 540 && <ShotF2 t={f - 480} />}
      {f >= 540 && <ShotG t={f - 540} />}
    </AbsoluteFill>
  );
};

