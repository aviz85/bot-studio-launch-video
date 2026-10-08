// s09 chapter 1 (beats 120–128): the conversation as glass objects floating in 3D.
// The chat behaves like a 3D scroll: each new message rises in front, older ones float up and back in depth.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT, MONO, clamp, lerp, kick} from '../../lib';
import {World, Obj, CamSpec, CamKey, V3, addCam, camPath, handheld, drift, kickPush, kickZoom, project, resolveCam, depthOf, rackFocus, MotionBlur, camMotion} from '../../cine';
import {DustField, Bokeh, EnergyBurst, Sparkles, Glint, LensFlare, FlareBurst, Shockwave} from '../../vfx';
import {GlassPane} from '../../ui/glass';
import {Icon} from '../../ui/kit';
import {SpaceLayer, GridLayer, GlassBubble, BubbleSpec, bubbleBoxW, FeatureChip, ScreenBeam, HudLabel, eo, bo, p01, win} from './kit';

type LFn = (k: number) => number;

/* ------------------------------------------------------------------ */
/* Data                                                                 */
/* ------------------------------------------------------------------ */
export const chatMsgs = (L: LFn): BubbleSpec[] => [
  {who: 'user', text: 'Can I book for Thursday?', w: 590, at: L(120), react: {emoji: '❤️', at: L(121)}},
  {who: 'bot', text: 'Absolutely! 🗓️', w: 372, at: L(122), typingFrom: L(121.5)},
  {who: 'bot', text: 'Checking Thursday slots now…', w: 668, at: L(123), typingFrom: L(122.5)},
  {who: 'bot', text: 'Thursday, 3:00 PM is yours.', w: 650, at: L(125), typingFrom: L(124.5), tag: {text: 'Booking confirmed', at: L(125.5)}},
  {who: 'user', text: 'Amazing 🔥', w: 290, at: L(126), react: {emoji: '🙌', at: L(126.5)}},
];

const FS = 40;
const BASE: V3 = [0, 170, 0];
const STEP: V3 = [0, -168, -270];
const EDGE = 400; // bubbles anchor: bot left edge at -EDGE, user right edge at +EDGE
export const LANE: V3 = [220, 600, -1550];
const LANE_W = 940, LANE_H = 290;

const arrival = (m: BubbleSpec) => m.typingFrom ?? m.at;
const entry = (m: BubbleSpec, t: number, first: boolean) => eo((t - arrival(m) + (first ? 1 : 2)) / (first ? 11 : 14));

/** Scroll position: number of arrived messages (eased). */
const scrollAt = (msgs: BubbleSpec[], t: number) => msgs.reduce((s, m, i) => s + entry(m, t, i === 0), 0);

/** World position (centre) of message i at scene frame t. */
export const msgPos = (msgs: BubbleSpec[], i: number, t: number): V3 => {
  const m = msgs[i];
  const S = scrollAt(msgs, t);
  const age = S - (i + 1);
  const bw = bubbleBoxW(m);
  const x = m.who === 'bot' ? -EDGE + bw / 2 : EDGE - bw / 2;
  const fl = Math.sin(t / 37 + i * 1.9) * 9;
  let p: V3 = [x + Math.sin(t / 53 + i) * 10 + age * (m.who === 'bot' ? -14 : 14), BASE[1] + STEP[1] * age + fl, BASE[2] + STEP[2] * age];
  if (i === 0) {
    // the opening question slams in from in front of the lens
    const e = entry(m, t, true);
    p = [p[0] + (1 - e) * 120, p[1] - (1 - e) * 60, p[2] + (1 - e) * 900];
  }
  return p;
};

const laneW2 = (lx: number, ly: number): V3 => [LANE[0] - LANE_W / 2 + lx, LANE[1] - LANE_H / 2 + ly, LANE[2]];
const SLOTS = [
  {label: 'Thu 1:00 PM', x: 170},
  {label: 'Thu 2:00 PM', x: 470},
  {label: 'Thu 3:00 PM', x: 770},
];
export const SLOT3 = laneW2(770, 168);

/* ------------------------------------------------------------------ */
/* Background lane (Clerk running the booking)                          */
/* ------------------------------------------------------------------ */
const Lane: React.FC<{t: number; L: LFn}> = ({t, L}) => {
  const a = L(123.25), b = L(124.75);
  const act = win(t, L(123) - 4, L(126), 10, 20);
  const u = clamp((t - a) / (b - a));
  const ue = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  const x0 = 40, x1 = SLOTS[2].x;
  const px = lerp(x0, x1, ue);
  const done = t >= b;
  const doneP = eo((t - b) / 12);
  const g = 0.25 + 0.75 * act;
  const TY = 236;
  return (
    <GlassPane look="holo" w={LANE_W} h={LANE_H} radius={44} glow={0.25 + 0.8 * act} flash={done ? Math.exp(-(t - b) / 8) : 0} shadow={false}>
      {/* header: what is running */}
      <div style={{position: 'absolute', left: 30, top: 24, display: 'flex', alignItems: 'center', gap: 18}}>
        <div style={{width: 66, height: 66, borderRadius: 20, background: 'radial-gradient(circle at 35% 30%, #FFE7B0, #ECAF42 60%, #9C6A10)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 ${30 * g}px rgba(255,192,77,${0.7 * g})`}}>
          <Icon.calendar size={38} color="#2A1A05" sw={2.4} />
        </div>
        <div>
          <HudLabel text="Clerk · background" size={16} color="#FFD27A" />
          <div style={{fontFamily: MONO, fontSize: 34, color: '#F3EEFF', marginTop: 4, whiteSpace: 'nowrap'}}>create_booking<span style={{color: '#FFC27A'}}> · async</span></div>
        </div>
      </div>
      <div style={{position: 'absolute', right: 34, top: 44, fontFamily: MONO, fontSize: 24, color: done ? '#72F2C8' : 'rgba(216,203,255,0.8)', whiteSpace: 'nowrap', textShadow: done ? '0 0 12px rgba(69,227,176,0.8)' : undefined}}>
        {done ? '✓ done' : u > 0 ? `running${'.'.repeat(1 + (Math.floor(t / 5) % 3))}` : 'idle'}
      </div>
      {/* slots */}
      {SLOTS.map((s, i) => {
        const scanned = px >= s.x - 40 && u > 0;
        const free = i === 2;
        const hit = free ? doneP : scanned ? 1 : 0;
        const col = free ? '69,227,176' : '255,192,77';
        return (
          <div key={i} style={{position: 'absolute', left: s.x - 135, top: 120, width: 270, height: 76, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: FONT, fontWeight: 650, fontSize: 30, whiteSpace: 'nowrap',
            color: hit > 0 ? (free ? '#72F2C8' : '#FFD27A') : 'rgba(230,222,255,0.88)',
            background: hit > 0 ? `rgba(${col},${0.12 + 0.12 * hit})` : 'rgba(140,107,234,0.14)',
            boxShadow: `inset 0 0 0 1.5px rgba(${hit > 0 ? col : '180,155,242'},${hit > 0 ? 0.8 : 0.32}), 0 0 ${30 * hit}px rgba(${col},${0.6 * hit})`,
            textDecoration: !free && hit > 0 ? 'line-through' : undefined, transform: `scale(${free && done ? lerp(1.22, 1, doneP) : 1})`}}>
            {free && done ? <Icon.check size={28} color="#72F2C8" sw={3.2} /> : null}
            {s.label}
          </div>
        );
      })}
      {/* track + packet */}
      <div style={{position: 'absolute', left: x0, right: 40, top: TY, height: 4, borderRadius: 2, background: 'rgba(180,155,242,0.22)'}} />
      <div style={{position: 'absolute', left: x0, width: Math.max(0, px - x0), top: TY - 2, height: 8, borderRadius: 4, background: 'linear-gradient(90deg, rgba(140,107,234,0.2), #8C6BEA 40%, #7FE7FF)', boxShadow: `0 0 ${18 * g}px rgba(127,231,255,${0.8 * g})`, opacity: u > 0 ? 1 : 0}} />
      {u > 0 && !done ? <div style={{position: 'absolute', left: px - 150, top: TY - 14, width: 170, height: 32, borderRadius: 16, background: 'linear-gradient(90deg, rgba(127,231,255,0), rgba(127,231,255,0.65) 70%, #FFFFFF 92%, rgba(255,255,255,0))'}} /> : null}
      {u > 0 && !done ? <div style={{position: 'absolute', left: px - 14, top: TY - 12, width: 28, height: 28, borderRadius: 14, background: '#fff', boxShadow: '0 0 24px 8px rgba(127,231,255,0.9)'}} /> : null}
    </GlassPane>
  );
};

/* ------------------------------------------------------------------ */
/* Feature chips anchored near what they describe                       */
/* ------------------------------------------------------------------ */
type ChipDef = {icon: string; text: string; at: number; until?: number; anchor: (t: number) => V3; extra?: React.ReactNode};
const chipDefs = (msgs: BubbleSpec[], L: LFn): ChipDef[] => [
  {icon: 'bolt', text: 'Instant reaction', at: L(121) + 5, anchor: (t) => {const p = msgPos(msgs, 0, t); return [p[0] - 170, p[1] - 118, p[2] + 40];}},
  {icon: 'chat', text: 'Paced message groups', at: L(123) + 6, until: L(125.75), anchor: (t) => {const p = msgPos(msgs, 1, t); return [p[0] + 560, p[1] + 74, p[2] + 40];}},
  {icon: 'calendar', text: 'Booking ran in the background', at: L(124) + 3, anchor: () => laneW2(600, 360)},
  {
    icon: 'paperclip', text: 'Files · voice · GIFs', at: L(126.5) + 6, anchor: (t) => {const p = msgPos(msgs, 4, t); return [p[0] - 587, p[1] - 50, p[2] - 200];},
    extra: (
      <div style={{display: 'flex', gap: 8, marginLeft: 6}}>
        {['mic', 'doc'].map((k) => {const I = Icon[k]; return <div key={k} style={{width: 34, height: 34, borderRadius: 10, background: 'rgba(127,231,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 0 1px rgba(127,231,255,0.5)'}}><I size={20} color="#BFF4FF" /></div>;})}
        <div style={{height: 34, padding: '0 8px', borderRadius: 10, background: 'rgba(231,244,185,0.18)', display: 'flex', alignItems: 'center', fontFamily: MONO, fontWeight: 700, fontSize: 17, color: '#E7F4B9', boxShadow: 'inset 0 0 0 1px rgba(231,244,185,0.5)'}}>GIF</div>
      </div>
    ),
  },
];

/* ------------------------------------------------------------------ */
/* The set (inside a World)                                             */
/* ------------------------------------------------------------------ */
const ChatSet: React.FC<{t: number; f: number; L: LFn; msgs: BubbleSpec[]; near: [number, number]}> = ({t, f, L, msgs, near}) => {
  const chips = chipDefs(msgs, L);
  const k = kick(f, 9);
  let newestIdx = -1;
  msgs.forEach((q, j) => { if (t >= arrival(q) - 2) newestIdx = j; });
  return (
    <>
      {/* background lane (far) */}
      <Obj x={LANE[0]} y={LANE[1]} z={LANE[2]} o={0.3 + 0.7 * win(t, L(122.75), L(126.5), 14, 24)}>
        <Lane t={t} L={L} />
      </Obj>
      {/* bubbles: draw far → near */}
      {msgs.map((m, i) => ({m, i})).reverse().map(({m, i}) => {
        if (t < arrival(m) - 2) return null;
        const p = msgPos(msgs, i, t);
        const e = entry(m, t, i === 0);
        const newest = i === newestIdx;
        return (
          <Obj key={i} x={p[0]} y={p[1]} z={p[2]} o={clamp(e * 1.6)} ry={m.who === 'bot' ? 4 : -4} nearFade={near}>
            <GlassBubble b={m} t={t} fs={FS} glow={newest ? 0.75 + 0.4 * k : 0.45} />
          </Obj>
        );
      })}
      {/* chips */}
      {chips.map((c, i) => {
        const p = (t - c.at) / 16;
        if (p <= 0) return null;
        const a = c.anchor(t);
        return (
          <Obj key={`c${i}`} x={a[0]} y={a[1] + Math.sin(t / 21 + i * 2) * 7} z={a[2]} billboard>
            <FeatureChip icon={c.icon} text={c.text} p={p} o={c.until !== undefined ? 1 - p01(t, c.until, 8) : 1} pulse={0.6 * k} extra={c.extra} />
          </Obj>
        );
      })}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* One framed chat shot                                                 */
/* ------------------------------------------------------------------ */
export type ChatShotProps = {t: number; from: number; L: LFn; cam: CamSpec; aperture?: number; focus?: number | V3; blur?: {vx: number; vy: number}; near?: [number, number]; flare?: number; heartFx?: boolean; maxBlur?: number; children?: React.ReactNode};

/** a distant light source behind the conversation (drives a parallax anamorphic flare) */
const LIGHT: V3 = [-2000, -2000, -2800];

export const ChatShot: React.FC<ChatShotProps> = ({t, from, L, cam, aperture = 0, focus, blur, near = [60, 360], flare = 0.55, heartFx = false, maxBlur = 22, children}) => {
  const f = t + from;
  const msgs = chatMsgs(L);
  const rc = resolveCam(cam);
  const k = kick(f, 8);
  // heart burst + confirmation fx, in screen space at projected anchors
  const heartAt = L(121);
  const m0 = msgPos(msgs, 0, t);
  const heartP = project(rc, [m0[0] - 210, m0[1] + 50, m0[2] + 10]);
  const m3 = msgPos(msgs, 3, t);
  const conf = project(rc, [m3[0] - 150, m3[1] + 40, m3[2] + 6]);
  const slot = project(rc, SLOT3);
  const lp = project(rc, LIGHT);
  const beamA = L(125) - 6;
  const world = (
    <World camera={rc} aperture={aperture} focus={focus} maxBlur={maxBlur} backdrop={<GridLayer floorY={900} grid={0.3} />}>
      <ChatSet t={t} f={f} L={L} msgs={msgs} near={near} />
    </World>
  );
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <SpaceLayer from={from} cam={rc} haze={0.3} />
      {blur ? <MotionBlur vx={blur.vx} vy={blur.vy}>{world}</MotionBlur> : world}
      <DustField camX={-rc.yaw * 22} camY={rc.pitch * 22} boost={0.5 * k} count={120} frame={t} />
      {flare > 0 && lp.visible && lp.x > -400 && lp.x < 2400 && lp.y > -400 && lp.y < 1400 ? <LensFlare x={lp.x} y={lp.y} intensity={flare * (0.8 + 0.35 * k)} scale={0.8} streak={0.9} ghosts={0.6} rays={10} flicker={0.25} frame={t} /> : null}
      {/* ❤️ reaction burst */}
      {heartFx && t >= heartAt - 1 && t < heartAt + 50 && heartP.visible ? (
        <>
          <EnergyBurst x={heartP.x} y={heartP.y} at={heartAt} dur={40} count={70} distance={300 * heartP.scale} color="#FF8FCB" secondary="#CDBBFF" size={0.8} frame={t} />
          <Sparkles area={{x: heartP.x - 260, y: heartP.y - 220, w: 520, h: 440}} count={26} boost={Math.exp(-(t - heartAt) / 14)} opacity={clamp(1 - (t - heartAt) / 50)} frame={t} seed={7} />
          <Glint x={heartP.x} y={heartP.y} size={260 * heartP.scale} intensity={1.5 * Math.exp(-Math.max(0, t - heartAt) / 9)} color="#FFC2E4" frame={t} />
        </>
      ) : null}
      {/* booking result returns from the background lane to the chat */}
      {t >= beamA && t < L(126) && slot.visible && conf.visible ? (
        <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
          <ScreenBeam a={{x: slot.x, y: slot.y}} b={{x: conf.x, y: conf.y}} draw={eo((t - beamA) / 9)} o={1 - p01(t, L(125.5), 14)} color="69,227,176" width={3} bend={-0.15} />
        </svg>
      ) : null}
      {t >= L(125) - 1 && t < L(125) + 60 && conf.visible ? (
        <FlareBurst x={conf.x} y={conf.y} at={L(125)} dur={56} peak={1.1} scale={0.6} flash={0.12} color="#9FFFD9" secondary="#8C6BEA" ghosts={0.4} frame={t} />
      ) : null}
      {children}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Cameras (lt = frames since the shot's cut)                           */
/* ------------------------------------------------------------------ */
export const chatCams = (L: LFn) => {
  const s1: CamKey[] = [
    {at: 0, target: [60, 150, -60], yaw: -27, pitch: 14, dist: 1450, roll: -7, focal: 28, shiftX: 300},
    {at: L(121.5) - L(120) + 4, ease: 'quintOut', target: [40, 130, -100], yaw: -15, pitch: 10, dist: 960, roll: -5},
  ];
  const s2: CamKey[] = [
    {at: 0, target: [-20, 90, -180], yaw: 20, pitch: -6, dist: 1450, roll: 6, focal: 35, shiftX: 300},
    {at: L(123.5) - L(121.5), ease: 'linear', target: [-60, 30, -260], yaw: 10, pitch: -7, dist: 1680, roll: 4, shiftX: 268},
  ];
  const s3: CamKey[] = [
    {at: 0, pos: [-700, 20, 820], lookAt: [260, 420, -1300], focal: 30, roll: -4, shiftX: 320},
    {at: L(125) - L(123.5), ease: 'cubicInOut', pos: [-300, 240, 250], lookAt: [230, 610, -1560], roll: -2, shiftX: 330, focal: 32},
  ];
  const s4: CamKey[] = [
    {at: 0, yaw: -12, pitch: 3, dist: 2150, roll: 4, focal: 85},
    {at: L(126) - L(125), ease: 'linear', yaw: -7, dist: 1950, roll: 2.5},
  ];
  const s5: CamKey[] = [
    {at: 0, target: [190, 190, -20], yaw: -4, pitch: 3, dist: 760, roll: -2, focal: 26},
    {at: L(128) - L(126), ease: 'expoOut', target: [40, -20, -300], yaw: -22, pitch: 12, dist: 1250, roll: -6},
  ];
  return {s1, s2, s3, s4, s5};
};

export {msgPos as chatMsgPos};
