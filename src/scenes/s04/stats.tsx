// Shots E–G (beats 45, 46, 47): the three stat cards slam toward the camera, one per beat, each from a different
// angle, counters roll on impact. G ends on a speed-ramped pull-back revealing the assembled row.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {kick} from '../../lib';
import {World, Obj, CamSpec, CamKey, addCam, handheld, kickPush, resolveCam, project, FloorGrid, V3, camPath, MotionBlur} from '../../cine';
import {DustField, Flash, Glint, EnergyBurst, LightStreak, FlareBurst} from '../../vfx';
import {UITheme} from '../../ui/theme';
import {StatCard} from '../../ui/screens';
import {Sky, HudTag, kf, sat, pr, hit} from './common';

export const STATS: [string, number, string, string][] = [
  ['layers', 4, 'states', 'Conversation flow'],
  ['scale', 6, 'judgments', 'Decision rules'],
  ['shield', 5, 'policies', 'Safety and behavior'],
];
const Z = 3;
export const CARD_W = 340 * Z, CARD_H = 128 * Z; // card size in world px
export const HOME: V3[] = [[-1150, 0, 0], [0, 0, 0], [1150, 0, 0]];
/** start offsets for each card's slam, in the slam camera's basis: [right, down, AWAY from the lens] + tumble */
const START: {o: V3; rx: number; ry: number; rz: number}[] = [
  {o: [-760, -220, 1350], rx: -28, ry: 62, rz: -26},
  {o: [640, -720, 1350], rx: 58, ry: -36, rz: 24},
  {o: [720, 700, 1250], rx: -60, ry: -42, rz: -20},
];
export const LAND = 7; // frames from the cut to impact (≈ B(k + 0.25))

/** the opening camera of each slam (set by StatShot so the launch point is framed) */
const START_CAM: (ReturnType<typeof resolveCam> | null)[] = [null, null, null];
const startPos = (i: number): V3 => {
  const c = START_CAM[i];
  const H = HOME[i], o = START[i].o;
  if (!c) return [H[0], H[1], H[2] - o[2]];
  return [H[0] + c.r[0] * o[0] + c.d[0] * o[1] + c.f[0] * o[2], H[1] + c.r[1] * o[0] + c.d[1] * o[1] + c.f[1] * o[2], H[2] + c.r[2] * o[0] + c.d[2] * o[1] + c.f[2] * o[2]];
};

/** pose of card i at frames since its cut (lc); lc < 0 → not yet launched */
const pose = (i: number, lc: number) => {
  const H = HOME[i], S = {...START[i], p: startPos(i)};
  if (lc >= LAND) {
    const d = lc - LAND;
    const bounce = -70 * Math.exp(-d / 4.5) * Math.sin(d * 0.75 + 0.2); // recoil away from the lens, damped
    const wob = Math.exp(-d / 5) * Math.sin(d * 0.9);
    return {p: [H[0], H[1], H[2] + bounce] as V3, rx: 2.5 * wob, ry: -3 * wob, rz: 1.5 * wob, flying: false};
  }
  const u = sat(lc / LAND);
  const e = Math.pow(u, 1.35);
  const L = (a: number, b: number) => a + (b - a) * e;
  return {p: [L(S.p[0], H[0]), L(S.p[1], H[1]), L(S.p[2], H[2])] as V3, rx: L(S.rx, 0), ry: L(S.ry, 0), rz: L(S.rz, 0), flying: true};
};

const OneCard: React.FC<{i: number; lc: number}> = ({i, lc}) => {
  const [ic, n, l, sub] = STATS[i];
  const p = pr(lc, LAND - 1, 13);
  const fl = hit(lc, LAND, 7);
  const sweep = pr(lc, LAND + 1, 18);
  return (
    <div style={{position: 'relative'}}>
      <div style={{zoom: Z}}>
        <UITheme look="frost">
          <StatCard icon={ic} n={n} label={l} sub={sub} p={lc >= LAND - 1 ? p : 0} w={340} />
        </UITheme>
      </div>
      {/* impact rim flash + light sweep */}
      {fl > 0.02 && <div style={{position: 'absolute', inset: 0, borderRadius: 84, boxShadow: `inset 0 0 0 ${(2 + 4 * fl).toFixed(1)}px rgba(207,246,255,${fl.toFixed(3)}), 0 0 ${(40 + 80 * fl).toFixed(0)}px rgba(127,231,255,${(0.8 * fl).toFixed(3)})`}} />}
      {lc >= LAND && lc < LAND + 14 && (
        <div style={{position: 'absolute', inset: 0, borderRadius: 84, transform: `scale(${(1 + 0.22 * pr(lc, LAND, 14) ** 0.6).toFixed(3)})`, opacity: 1 - pr(lc, LAND, 14),
          boxShadow: 'inset 0 0 0 4px rgba(207,246,255,0.9), 0 0 40px rgba(127,231,255,0.6)'}} />
      )}
      {sweep > 0 && sweep < 1 && (
        <div style={{position: 'absolute', inset: 0, borderRadius: 84, overflow: 'hidden', mixBlendMode: 'screen'}}>
          <div style={{position: 'absolute', inset: 0, background: `linear-gradient(105deg, transparent ${(sweep * 160 - 40).toFixed(1)}%, rgba(255,255,255,0.75) ${(sweep * 160 - 25).toFixed(1)}%, transparent ${(sweep * 160 - 10).toFixed(1)}%)`}} />
        </div>
      )}
    </div>
  );
};

const CardObj: React.FC<{i: number; lc: number}> = ({i, lc}) => {
  const q = pose(i, lc);
  return (
    <Obj x={q.p[0]} y={q.p[1]} z={q.p[2]} rx={q.rx} ry={q.ry} rz={q.rz}>
      <OneCard i={i} lc={lc} />
    </Obj>
  );
};

const Props: React.FC<{t: number; f: number}> = ({t, f}) => {
  const k = kick(f, 9);
  return (
    <>
      {/* soft glow wall behind the row */}
      <Obj x={0} y={-40} z={-700} dof={false}>
        <div style={{width: 4200, height: 1600, background: `radial-gradient(50% 50% at 50% 50%, rgba(140,107,234,${(0.3 + 0.1 * k).toFixed(3)}), rgba(127,231,255,0.05) 55%, transparent 75%)`}} />
      </Obj>
      {/* light pools under the slots */}
      {HOME.map((h, i) => (
        <Obj key={i} x={h[0]} y={640} z={0} rx={90} dof={false}>
          <div style={{width: 1300, height: 700, background: 'radial-gradient(50% 50% at 50% 50%, rgba(160,130,255,0.32), transparent 70%)'}} />
        </Obj>
      ))}
    </>
  );
};

/** One stat-slam shot. `which` card slams at the cut; earlier cards are already home. */
export const StatShot: React.FC<{which: 0 | 1 | 2; lt: number; t: number; from: number; keys: CamKey[]; label: string}> = ({which, lt, t, from, keys, label}) => {
  const f = t + from;
  const camAt = (x: number) => addCam(camPath(x, keys), handheld(x, 0.9, 20 + which), kickPush(f, 26));
  START_CAM[which] = resolveCam(camPath(0, keys));
  // impact shake (custom, on the slam frame)
  const sh = hit(lt, LAND, 4) * 1.0;
  const cam: CamSpec = addCam(camAt(lt), {roll: sh * 1.2 * Math.sin(lt * 2.1), shiftX: sh * 14 * Math.sin(lt * 3.3), shiftY: sh * 10 * Math.cos(lt * 2.7), zoom: 1 + 0.025 * sh});
  const rc = resolveCam(cam);
  // screen velocity of the flying card → directional blur on its own layer
  const a = project(rc, pose(which, lt - 1).p), b = project(rc, pose(which, lt).p);
  const flying = lt < LAND;
  const vx = flying ? b.x - a.x : 0, vy = flying ? b.y - a.y : 0;
  const hp = project(rc, HOME[which]);
  const others = [0, 1, 2].filter((i) => i < which);
  const s0 = project(rc, startPos(which));
  const flightAngle = (Math.atan2(hp.y - s0.y, hp.x - s0.x) * 180) / Math.PI;
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <Sky cam={cam} from={from} t={t} haze={0.55} />
      <World camera={cam} focus={HOME[which]} aperture={8} backdrop={<FloorGrid y={640} step={200} opacity={0.34} center={[0, -400]} extent={4600} fade={[900, 4400]} />}>
        <Props t={t} f={f} />
        {others.map((i) => <CardObj key={i} i={i} lc={999} />)}
        {!flying && <CardObj i={which} lc={lt} />}
      </World>
      {flying && (
        <MotionBlur vx={vx} vy={vy} shutter={0.7}>
          <World camera={cam}><CardObj i={which} lc={lt} /></World>
        </MotionBlur>
      )}
      <LightStreak start={t - lt - 2} dur={13} angle={flightAngle} count={6} spread={300} length={1100} thickness={3} intensity={0.9} seed={7 + which} frame={t} />
      <EnergyBurst x={hp.x} y={hp.y} at={t - lt + LAND} count={90} distance={900} dur={26} size={0.9} frame={t} />
      <Flash at={t - lt + LAND} dur={9} color="white" max={0.22} bloom x={hp.x} y={hp.y} frame={t} />
      <FlareBurst x={hp.x - 0.46 * CARD_W * hp.scale} y={hp.y - 0.4 * CARD_H * hp.scale} at={t - lt + LAND} dur={26} peak={1.1} scale={0.55} ghosts={0.5} flash={0} seed={3 + which} frame={t} />
      <Glint x={hp.x + 0.44 * CARD_W * hp.scale} y={hp.y - 0.42 * CARD_H * hp.scale} size={260} intensity={1.4 * hit(lt, LAND + 1, 9)} spin={1.5} frame={t} />
      <DustField frame={t} count={70} camX={-lt * 2} boost={kick(f) * 0.5} />
      <HudTag x={150} y={150} t={lt - LAND} label={label} value={`${STATS[which][1]} ${STATS[which][2]} · generated`} />
    </AbsoluteFill>
  );
};

/* Camera keys for the three slams (lt = frames since the cut). Card ≈ 1020 px wide → framed at ~0.9×. */
export const KEYS_E: CamKey[] = [
  {at: 0, target: [-1080, 10, 0], yaw: 30, pitch: 12, roll: -10, dist: 1700, focal: 28},
  {at: 27, ease: 'cubicOut', yaw: 24, pitch: 9, roll: -8, dist: 1560},
];
export const KEYS_F: CamKey[] = [
  {at: 0, target: [40, -20, 0], yaw: -22, pitch: -26, roll: 9, dist: 1850, focal: 30},
  {at: 27, ease: 'cubicOut', yaw: -16, pitch: -21, roll: 7, dist: 1700},
];
export const KEYS_G: CamKey[] = [
  {at: 0, target: [1100, 20, 0], yaw: -32, pitch: 21, roll: -7, dist: 1500, focal: 26},
  {at: 11, ease: 'cubicOut', yaw: -29, pitch: 19, roll: -7, dist: 1460},
  {at: 27, ease: 'expoInOut', target: [0, 10, 0], yaw: -6, pitch: 7, roll: -2, dist: 3150, focal: 28},
];
