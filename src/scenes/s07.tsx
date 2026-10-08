/*
 * s07 · "Rules & real work" · beats 80–96 (global 2149–2579, 430 f) · Drop 1 groove, fills/stops at 82.5, 91.5, 95.5
 *
 * SHOT LIST (cuts on B(k); local = B(k) − 2149)
 * ── PART A · Policies as a living circuit (holo glass) ──────────────────────────────────────────────
 *  A1  80   → 82   (0–54)    LOW-ANGLE DUTCH lateral track along the WHEN rows. Row "User enjoyment ≥ 1.7" slams in
 *                             on 80, "Confidence ≥ 80 %" on 81; rack focus row→row. in: whip→ (cross-scene half from s06)
 *  A2  82   → 84   (54–108)  TOP-DOWN GOD SHOT: the policy board laid flat over the holo floor, slow yaw spin.
 *                             "Current state is start" drops in on 82; music stop 82.5 → slow-mo; on 83 the AND bracket
 *                             traces with a light pulse; 83.5 the pulse races down the output trace toward THEN. in: whip↑
 *  A3  84   → 85   (108–135) MACRO, low angle, Dutch: THEN "Include acknowledge-enjoyment · Next reply" slams onto the
 *                             trace (flare burst), push-in with shallow DOF. in: flash cut
 *  A4  85   → 88   (135–215) WIDE LOW-ANGLE HERO, speed-ramped (snap in → glide → accelerate out). Scope "Global"
 *                             toggles (85), "✓ Creates 1 judgment and 1 prompt chunk" stamps (86, flare + burst), the
 *                             whole circuit pulses on every kick. COPY "Decide in rules / you can read." (85.25→88). in: whip←
 * ── PART B · Clerk & async (frost chat · holo function card · background lane) ─────────────────────
 *  B1  88   → 89.5 (215–255) MACRO on the user bubble "I’m Alex Morgan, alex@example.com": laser scan sweeps down,
 *                             reticles lock name (88.5) and email (88.75); typed field chips lift off (89). in: zoom-through
 *  B2  89.5 → 91   (255–296) TRACKING SHOT riding with the glowing chips (light trails) into the create_lead card; they
 *                             slot into full_name / email on 90; "Clerk extracts arguments" + "Async" light (90.5).
 *                             COPY "Real tools." (90→91.5). in: whip→
 *  B3  91   → 92   (296–323) CRANE UP + PULL BACK reveal: function spawns the background lane (beam + comet), bot replies
 *                             "Thanks, Alex! Setting that up." (91.25); slow-mo through the music stop 91.5–92. in: flash
 *  B4  92   → 94   (323–376) DUTCH LATERAL TRACK past the chat with the lane running behind it (DOF), "Meanwhile, what
 *                             time suits you?" (92.75), rack focus to the lane (93.25). COPY "Running in the background." in: cut
 *  B5  94   → 96   (376–430) HERO: lane completes → ✓ burst (flare, energy, ring) "Lead created · L-2048" flies into the
 *                             chat (94.5); slow decelerating push, then light decays to a single glint for the breakdown.
 *                             in: flash (mint)
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import type {SceneProps} from '../cine/types';
import {B, kick} from '../lib';
import {
  World, Obj, CamSpec, CamKey, V3, addCam, handheld, drift, kickPush, kickZoom, camPath, camMotion, MotionBlur, Shots, Shot,
  whip, zoomThrough, flashCut, cut, resolveCam, depthOf, project, ShotInfo,
} from '../cine';
import {DustField, LensFlare, FlareBurst, EnergyBurst, Shockwave, Flash, Glint, LightStreak} from '../vfx';
import {Env, Copy, CopyShade, L, cl, pr, kf, hit, ss, lerp, Hud} from './s07/common';
import {PolicyRig, PT, POLICY_ANCHORS} from './s07/policy';
import {ChatRig, FnCard, FN, Lane, LANE, LaneGeo, FieldChips, SpawnBeam, CT, laneProgress, laneLocal, chipAt, userBubbleAt, SLOT, CHAT} from './s07/clerk';

/* ------------------------------------------------------------------ */
/* Sets                                                                 */
/* ------------------------------------------------------------------ */
const PolicySet: React.FC<{t: number; f: number; flat?: boolean}> = ({t, f, flat}) =>
  flat ? (
    <Obj rx={90} dof={false}>
      <PolicyRig t={t} f={f} />
    </Obj>
  ) : (
    <PolicyRig t={t} f={f} />
  );

const ClerkSet: React.FC<{t: number; laser?: boolean; lane?: LaneGeo; chips?: boolean}> = ({t, laser, lane = LANE, chips = true}) => (
  <>
    <Obj x={lane.x} y={lane.y} z={lane.z} ry={lane.ry}><Lane t={t} /></Obj>
    <Obj x={FN.x} y={FN.y} z={FN.z} ry={FN.ry}><FnCard t={t} progress={laneProgress(t)} /></Obj>
    {lane === LANE && <SpawnBeam t={t} />}
    <ChatRig t={t} laser={laser} />
    {chips && <FieldChips t={t} />}
  </>
);

type FrameProps = {
  cam: CamSpec; t: number; f: number; set: 'policy' | 'flat' | 'clerk'; focus?: number | V3; aperture?: number; mb?: {vx: number; vy: number} | null;
  floor?: number; grid?: number; children?: React.ReactNode; dust?: number; lane?: LaneGeo; chips?: boolean;
  /** sharp foreground objects drawn in a second World with the same camera (not motion-blurred) */
  fg?: React.ReactNode;
};
const Frame: React.FC<FrameProps> = ({cam, t, f, set, focus, aperture = 0, mb, floor, grid = 0.3, children, dust = 1, lane, chips, fg}) => {
  const rc = resolveCam(cam);
  const world = (
    <World camera={rc} focus={focus} aperture={aperture} maxBlur={18} backdrop={<Env t={t} floor={floor ?? (set === 'clerk' ? 780 : 640)} grid={grid} />}>
      {set === 'clerk' ? <ClerkSet t={t} lane={lane} chips={chips} /> : <PolicySet t={t} f={f} flat={set === 'flat'} />}
    </World>
  );
  return (
    <AbsoluteFill>
      {mb && Math.hypot(mb.vx, mb.vy) > 3 ? <MotionBlur vx={mb.vx} vy={mb.vy} max={45}>{world}</MotionBlur> : world}
      {fg && <World camera={rc}>{fg}</World>}
      {dust > 0 && <DustField count={110} opacity={0.75 * dust} camX={-rc.yaw * 14} camY={rc.pitch * 10} boost={0.6 * kick(f)} seed={7} />}
      {children}
    </AbsoluteFill>
  );
};

/** true while a cut transition overlaps this shot (the transition already blurs/streaks the frame) */
const inTx = (info: ShotInfo) => !!(info.tin || info.tout);
/** 0 during a transition overlap, easing back to 1 over 6 f (DOF ramps instead of popping) */
const txK = (info: ShotInfo, inPost: number, outPre: number) => ss(inPost, inPost + 6, info.t - info.from) * ss(outPre, outPre + 6, info.to - info.t);

/* projected screen point of a world point for a camera */
const scr = (cam: CamSpec, p: V3) => project(resolveCam(cam), p);
/* rig-flat transform for anchors (rotateX 90): (x, y, z) → (x, −z, y) */
const flatP = (p: V3): V3 => [p[0], -p[2], p[1]];

/* ------------------------------------------------------------------ */
/* Camera paths (shot-local frames)                                     */
/* ------------------------------------------------------------------ */
const A1: CamKey[] = [
  {at: 0, target: [-110, -262, 36], yaw: -33, pitch: 13, dist: 1120, roll: -8, focal: 32},
  {at: 26, target: [40, -228, 36], yaw: -27, pitch: 11, dist: 1040, roll: -6.5},
  {at: 54, target: [170, -180, 36], yaw: -21, pitch: 10, dist: 980, roll: -5},
];
const A2: CamKey[] = [
  {at: 0, target: [-150, 0, -30], pitch: -82, yaw: -34, dist: 1700, roll: 0, focal: 28},
  {at: 12, ease: 'expoOut', yaw: -20, dist: 1500},
  {at: 27, ease: 'linear', yaw: -16, dist: 1460},
  {at: 40, ease: 'cubicOut', target: [-170, 0, 20], yaw: -4, pitch: -78, dist: 1300},
  {at: 54, ease: 'expoIn', target: [-200, 0, 70], yaw: 6, pitch: -70, dist: 1100},
];
const A3: CamKey[] = [
  {at: 0, target: [-150, 160, 36], yaw: 36, pitch: 13, dist: 980, roll: 9, focal: 40},
  {at: 27, ease: 'cubicOut', target: [-90, 165, 36], yaw: 27, pitch: 9, dist: 820, roll: 5},
];
const A4: CamKey[] = [
  {at: 0, target: [80, 30, 0], yaw: -40, pitch: 11, dist: 3200, roll: -6, focal: 30, shiftX: 390},
  {at: 16, ease: 'expoOut', yaw: -27, pitch: 9, dist: 2320, roll: -4},
  {at: 66, ease: 'linear', yaw: -19, pitch: 8, dist: 2160, roll: -3},
  {at: 80, ease: 'expoIn', yaw: -9, pitch: 6, dist: 1650, roll: -1, target: [200, 40, 0]},
];

const B3: CamKey[] = [
  {at: 0, target: [560, 0, -260], yaw: -24, pitch: 4, dist: 1650, roll: -4, focal: 28, shiftX: 330, shiftY: 60},
  {at: 12, ease: 'expoOut', target: [200, 150, -340], yaw: -14, pitch: -10, dist: 2600, roll: -2, shiftX: 330, shiftY: 140},
  {at: 27, ease: 'linear', target: [180, 160, -350], yaw: -11, pitch: -13, dist: 2780, roll: -1, shiftX: 320, shiftY: 150},
];
const B4: CamKey[] = [
  {at: 0, target: [-600, 120, 0], yaw: 17, pitch: 5, dist: 1420, roll: -5, focal: 32, shiftX: 400},
  {at: 53, ease: 'linear', target: [-560, 140, 0], yaw: 9, pitch: 4, dist: 1340, roll: -3},
];
const B5: CamKey[] = [
  {at: 0, target: [170, 150, -330], yaw: -9, pitch: 6, dist: 2380, roll: -2, focal: 30},
  {at: 30, ease: 'cubicOut', yaw: -5, pitch: 4, dist: 2200, roll: -1},
  {at: 54, ease: 'linear', yaw: -3, pitch: 3, dist: 2140, roll: 0},
];

/** B4 cheat: the lane is re-placed behind the chat (left, deep) so chat + lane share the frame */
const LANE_B4: LaneGeo = {x: -1300, y: 240, z: -980, ry: -12};

/* B2 follows the chips: target = chip centroid, then eases onto the card */
const chipCentroid = (t: number): V3 => {
  const a = chipAt(Math.min(t, CT.slot), 'name'), b = chipAt(Math.min(t, CT.slot), 'email');
  if (!a || !b) return SLOT.center;
  return [(a.pos[0] + b.pos[0]) / 2, (a.pos[1] + b.pos[1]) / 2, (a.pos[2] + b.pos[2]) / 2];
};
const camB2 = (t: number): CamSpec => {
  const c = chipCentroid(t);
  const settle = ss(CT.slot - 12, CT.slot + 6, t);
  const card: V3 = [680, -40, -260];
  const target: V3 = [lerp(c[0], card[0], settle), lerp(c[1], card[1], settle), lerp(c[2], card[2], settle)];
  const u = pr(t, L(89.5), L(91) - L(89.5));
  const e = (u2: number) => 1 - Math.pow(1 - u2, 3);
  return {target, yaw: kf(u, [[0, 10], [0.35, -8], [0.6, -14], [1, -16]], e), pitch: kf(u, [[0, 3], [0.6, 7], [1, 8]], e), dist: kf(u, [[0, 1050], [0.35, 1180], [0.6, 1270], [1, 1300]], e), roll: kf(u, [[0, -2], [0.6, -3], [1, -3]], e), focal: 32, shiftX: kf(u, [[0, 0], [0.35, 150], [0.6, 235], [1, 250]], e), shiftY: kf(u, [[0, 0], [0.6, -18], [1, -20]], e)};
};

/* ------------------------------------------------------------------ */
/* Scene                                                                */
/* ------------------------------------------------------------------ */
export const Scene: React.FC<SceneProps> = ({from, dur}) => {
  const t = useCurrentFrame();
  const f = t + from;

  const shots: Shot[] = [
    /* A1 · low-angle dutch lateral track — rows 1 & 2 */
    {
      name: 'A1 rows low-angle', from: 0, to: L(82), in: whip({dir: 'right', dur: 10}),
      render: (lt, _p, info) => {
        const cam = addCam(camPath(lt, A1), handheld(lt, 0.6, 3), kickPush(f, 16));
        const rc = resolveCam(cam);
        const fA = depthOf(rc, POLICY_ANCHORS.row(0)), fB = depthOf(rc, POLICY_ANCHORS.row(1));
        const focus = lerp(fA, fB, ss(PT.rows[1] - 8, PT.rows[1] + 4, t));
        const fl = scr(cam, [-560, -330, 0]);
        return (
          <Frame cam={cam} t={t} f={f} set="policy" focus={focus} aperture={7 * txK(info, 4, 6)}>
            <LensFlare x={fl.x - 200 + lt * 2} y={fl.y - 120} intensity={0.5} scale={0.7} ghosts={0.5} rays={10} seed={4} />
            <Hud style={{position: 'absolute', left: 124, top: 900}}>POLICY 01 · WHEN</Hud>
          </Frame>
        );
      },
    },
    /* A2 · top-down god shot — row 3, AND bracket pulse */
    {
      name: 'A2 god shot', from: L(82), to: L(84), in: whip({dir: 'up', dur: 10}),
      render: (lt, _p, info) => {
        const cam = addCam(camPath(lt, A2), drift(lt, 0.8, 5), kickZoom(f, 0.012));
        const and = scr(cam, flatP(POLICY_ANCHORS.and));
        return (
          <Frame cam={cam} t={t} f={f} set="flat" floor={520} grid={0.35}>
            <Glint x={and.x} y={and.y} size={260} intensity={1.4 * hit(t, PT.and + 3, 14)} color="cyan" />
            <Flash at={PT.and} dur={12} color="cyan" max={0.18} bloom x={and.x} y={and.y} />
            <Hud style={{position: 'absolute', left: 124, top: 900}}>POLICY 01 · WHEN ∧ THEN</Hud>
          </Frame>
        );
      },
    },
    /* A3 · macro on THEN */
    {
      name: 'A3 THEN macro', from: L(84), to: L(85), in: flashCut({dur: 8, peak: 0.75}),
      render: (lt, _p, info) => {
        const cam = addCam(camPath(lt, A3), handheld(lt, 0.9, 7), kickPush(f, 22));
        const rc = resolveCam(cam);
        const p = scr(cam, [POLICY_ANCHORS.then[0] - 260, POLICY_ANCHORS.then[1], 60]);
        return (
          <Frame cam={cam} t={t} f={f} set="policy" focus={depthOf(rc, POLICY_ANCHORS.then)} aperture={13 * txK(info, 5.6, 6)}>
            <FlareBurst x={p.x} y={p.y} at={PT.then + 1} dur={50} peak={1.3} scale={0.7} flash={0.25} sustain={0.25} seed={11} />
            <LightStreak start={PT.then - 2} dur={18} angle={0} count={5} offset={p.y - 540} spread={160} intensity={0.7} />
          </Frame>
        );
      },
    },
    /* A4 · wide hero with copy — Scope, ✓, living circuit */
    {
      name: 'A4 hero + copy', from: L(85), to: L(88), in: whip({dir: 'left', dur: 10}),
      render: (lt, _p, info) => {
        const at = (x: number) => addCam(camPath(x, A4), drift(x, 0.7, 9));
        const cam = addCam(at(lt), kickPush(f, 14));
        const m = camMotion(at, lt, [80, 30, 0]);
        const ck = scr(cam, [POLICY_ANCHORS.check[0] - 225, POLICY_ANCHORS.check[1], 60]);
        const lf = scr(cam, [-700, -470, 0]);
        return (
          <Frame cam={cam} t={t} f={f} set="policy" mb={inTx(info) ? null : {vx: m.dx, vy: m.dy}}>
            <LensFlare x={lf.x + lt * 1.5} y={lf.y} intensity={0.45} scale={0.8} ghosts={0.6} seed={5} />
            <FlareBurst x={ck.x} y={ck.y} at={PT.check + 1} dur={60} peak={1.5} scale={0.8} flash={0.3} sustain={0.2} seed={12} color="#B9FBE2" />
            <EnergyBurst x={ck.x} y={ck.y} at={PT.check + 1} dur={40} count={70} distance={360} color="#B9FBE2" size={0.8} />
            <CopyShade o={ss(L(85), L(85.5), t)} />
            <Copy lines={['Decide in rules', 'you can read.']} t={t - L(85.25)} x={120} y={380} size={96} out={L(87.75) - L(85.25)} kicker="Policies · When ∧ Then" />
          </Frame>
        );
      },
    },
    /* B1 · macro laser scan */
    {
      name: 'B1 scan macro', from: L(88), to: L(89.5), in: zoomThrough({dur: 13, depth: 2.0}),
      render: (lt, _p, info) => {
        const ub = userBubbleAt(t);
        const B1: CamKey[] = [
          {at: 0, target: [ub.x - 15, ub.y - 18, 30], yaw: 12, pitch: 5, dist: 860, roll: -5, focal: 40},
          {at: 40, ease: 'linear', target: [ub.x, ub.y + 6, 30], yaw: 3, pitch: 3, dist: 790, roll: -2},
        ];
        const cam = addCam(camPath(lt, B1), handheld(lt, 0.7, 11), kickPush(f, 12));
        const rc = resolveCam(cam);
        const gn = scr(cam, ub.name), ge = scr(cam, ub.email);
        return (
          <Frame cam={cam} t={t} f={f} set="clerk" focus={depthOf(rc, [ub.x, ub.y, 30])} aperture={11 * txK(info, 5.6, 6)}>
            <Glint x={gn.x + 110} y={gn.y - 26} size={160} intensity={1.2 * hit(t, CT.lockName, 10)} color="cyan" />
            <Glint x={ge.x + 150} y={ge.y - 26} size={160} intensity={1.2 * hit(t, CT.lockEmail, 10)} color="cyan" rotate={20} />
          </Frame>
        );
      },
    },
    /* B2 · chips fly into create_lead */
    {
      name: 'B2 chips → create_lead', from: L(89.5), to: L(91), in: whip({dir: 'right', dur: 10}),
      render: (lt, _p, info) => {
        const cam = addCam(camB2(t), handheld(lt, 0.8, 13), kickPush(f, 14));
        const m = camMotion((x) => camB2(x + from - from), t, SLOT.center);
        const sl = scr(cam, SLOT.name), se = scr(cam, SLOT.email);
        return (
          <Frame cam={cam} t={t} f={f} set="clerk" mb={inTx(info) ? null : {vx: m.dx * 0.6, vy: m.dy * 0.6}} chips={false} fg={<FieldChips t={t} />}>
            <Flash at={CT.slot} dur={10} color="cyan" max={0.16} bloom x={(sl.x + se.x) / 2} y={(sl.y + se.y) / 2} />
            <Glint x={sl.x + 90} y={sl.y} size={200} intensity={1.3 * hit(t, CT.slot, 12)} color="pistachio" />
            <Glint x={se.x + 110} y={se.y} size={170} intensity={1.1 * hit(t, CT.slot + 2, 12)} color="pistachio" rotate={25} />
          </Frame>
        );
      },
    },
    /* B3 · crane up / pull back: lane spawns */
    {
      name: 'B3 pull back · lane spawns', from: L(91), to: L(92), in: flashCut({dur: 6, peak: 0.45, color: '#BFF4FF'}),
      render: (lt, _p, info) => {
        const at = (x: number) => addCam(camPath(x, B3), drift(x, 0.6, 15));
        const cam = at(lt);
        const m = camMotion(at, lt, [100, 130, -350]);
        const l0 = scr(cam, laneLocal(0));
        return (
          <Frame cam={cam} t={t} f={f} set="clerk" mb={inTx(info) ? null : {vx: m.dx, vy: m.dy}}>
            <LightStreak start={CT.spawn - 2} dur={26} angle={-8} count={6} offset={l0.y - 540} spread={120} intensity={0.8} />
          </Frame>
        );
      },
    },
    /* B4 · parallel: chat talks while the lane runs */
    {
      name: 'B4 parallel', from: L(92), to: L(94), in: cut(),
      render: (lt, _p, info) => {
        const cam = addCam(camPath(lt, B4), handheld(lt, 0.6, 17), kickPush(f, 12));
        const rc = resolveCam(cam);
        const near = depthOf(rc, [CHAT.x, 120, 20]);
        const far = depthOf(rc, laneLocal(0.55, LANE_B4));
        const focus = lerp(near, far, ss(L(93.25) - 6, L(93.25) + 10, t));
        return <Frame cam={cam} t={t} f={f} set="clerk" focus={focus} aperture={9 * txK(info, -6, 3)} lane={LANE_B4} />;
      },
    },
    /* B5 · ✓ result burst, then decay */
    {
      name: 'B5 result + decay', from: L(94), to: dur, in: flashCut({dur: 10, peak: 0.7, color: '#E6FFF4'}),
      render: (lt, _p, info) => {
        const cam = addCam(camPath(lt, B5), drift(lt, 0.5, 19), kickZoom(f, 0.008 * (1 - ss(L(95), L(95.5), t))));
        const le = scr(cam, laneLocal(1));
        const decay = ss(L(95.5) - 4, L(96) - 2, t);
        return (
          <>
            <Frame cam={cam} t={t} f={f} set="clerk" dust={1 - 0.6 * decay}>
              <Shockwave x={le.x} y={le.y} at={CT.result} dur={40} radius={700} rings={2} intensity={0.8} color="#B9FBE2" />
              <EnergyBurst x={le.x} y={le.y} at={CT.result} dur={46} count={110} distance={520} color="#B9FBE2" />
              <FlareBurst x={le.x} y={le.y} at={CT.result} dur={64} peak={1.5} scale={0.9} flash={0.35} sustain={0.15} seed={21} color="#B9FBE2" />
            </Frame>
            {decay > 0 && <AbsoluteFill style={{background: '#04020A', opacity: 0.88 * decay}} />}
            {decay > 0 && <Glint x={le.x} y={le.y} size={220} intensity={0.9 * decay * (1 - ss(L(96) - 6, L(96), t) * 0.3)} color="cyan" />}
          </>
        );
      },
    },
  ];

  // Part B copy (screen-locked over the cuts)
  const realT = t - L(90) - 3;
  const runT = t - L(91.75);
  return (
    <AbsoluteFill style={{background: '#04020A'}}>
      <Shots shots={shots} t={t} />
      {realT > -2 && t < L(91.75) + 2 && (
        <>
          <CopyShade o={ss(L(90), L(90.25), t) * (1 - ss(L(91.5), L(91.75), t))} side="top" />
          <Copy lines={['Real tools.']} t={realT} x={120} y={150} size={104} out={L(91.5) - L(90) - 7} kicker="Clerk · create_lead" />
        </>
      )}
      {runT > -2 && t < L(94) + 4 && (
        <>
          <CopyShade o={ss(L(91.75), L(92), t) * (1 - ss(L(93.75), L(94), t))} side="top" />
          <Copy lines={['Running in', 'the background.']} t={runT} x={120} y={150} size={96} out={L(93.75) - L(91.75)} kicker="Async · Background lane" />
        </>
      )}
    </AbsoluteFill>
  );
};
