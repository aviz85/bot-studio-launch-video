/* =====================================================================================================
 * s08 · "Live" · beats 96–120 (global 2579–3224) · BREAKDOWN → DROP 2 → LIVE DASHBOARD HERO
 *
 * SHOT LIST (every cut on B(k); local frame = B(k) − 2579)
 *  PART A — breakdown (music almost silent, riser into 104)
 *   A1  96–100  (0–108)    MACRO BEAM. A single volumetric beam switches on; the dull grey "old chatbot" widget adrift
 *                          in it, lit dust, 85 mm-feel slow push + drift. "Not another chatbot." (96.5/97/97.5, soft
 *                          mask-blur reveal). The widget flickers and powers off like a CRT on 99.
 *   A2 100–102  (108–161)  LOW ANGLE, slow orbit. Light-leak dissolve (violet) into the winking avatar forming in the
 *                          beam (100); "A bot studio." (100.5); wink on 101.
 *   A3 102–104  (161–215)  AXIAL GATHER. Hard cut on 102: frontal wide lens, particles spiral INTO the avatar's core,
 *                          god rays + speed lines build, dolly-in accelerates (expo-in), copy is sucked into the core,
 *                          exposure blows to white at 104.
 *  PART B — DROP 2 (2794) · the Live Dashboard hero
 *   B1 104–106  (215–269)  DROP: flash-cut in, FlareBurst + shockwave rings + energy burst + CA. LOW-ANGLE (24 mm, ~100 px
 *                          above the floor) lateral track along the 3D Signal Wall bar field pumping to kick/bands,
 *                          threshold colours, flares riding the brightest caps. "See every signal." (104.5).
 *   B2 106–108  (269–322)  WHIP → long-lens (55 mm) dutch side track down the wall, DOF, flares. "Live." punch on 106.
 *   B3 108–110  (322–376)  FLASH → speed-ramped PULL-BACK (snap-in: fast→glide) from the Signal Wall card back through
 *                          the exploded frost layers + two cover-glass sheets, data beams between layers.
 *   B4 110–112  (376–430)  GLITCH CUT → low-angle hero 3/4 of the whole dashboard; layers SNAP together on 111
 *                          (rim flash + glint), light sweep across the glass 111→112.
 *   B5 112–114  (430–484)  WHIP → orbit + RACK FOCUS onto the Speaker prompt assembling on 16ths
 *                          (System 112.25 → State 112.75 → Chunk 113.25 → body 113.75): each row flies in from
 *                          the foreground through the focus plane and lands in its slot (focus follows the chip).
 *   B6 114–116  (484–537)  FLASH → high-angle crane on Decisions ("Happy start matched" green 114.25, amber 114.75) and
 *                          Clerk activity ticks (115, 115.25, 115.5, spinner 115.75). "Every decision, explained." (114)
 *   B7 116–118  (537–591)  SPIN → dutch close tracking the turn timeline, markers pop every 16th (116.25…117.75),
 *                          reticle locks "Last token".
 *   B8 118–120  (591–645)  WHIP → opposite dutch on the live chat: "Thursday afternoon works!" (118.25) + 🔥 (118.5);
 *                          the music drops out → slow-mo hold, reticles lock; push in → OUT: zoomThrough half on 120.
 *  COPY: "Not another chatbot." 96.5–99.5 · "A bot studio." 100.5–103.5 · "See every signal. / Live." 104.5–108.25 ·
 *        "Every decision, explained." 114–119.5 (bottom-left; B6–B8 keep the UI above that band).
 * ===================================================================================================== */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {B, kick, band, clamp, prog, expoOut, rand} from '../lib';
import type {SceneProps} from '../cine/types';
import {
  World, Obj, CamSpec, CamKey, V3, addCam, handheld, drift, kickPush, kickZoom, kickShake, camPath, camMotion, MotionBlur,
  Shots, beatShots, whip, zoomThrough, flashCut, glitchCut, lightLeakDissolve, spinBlur, cut, FloorGrid, resolveCam, depthOf,
  project, snapIn, makeRamp, rackFocus, mix,
} from '../cine';
import {
  SpaceBackdrop, DustField, Bokeh, GodRays, VolumetricBeams, SpeedLines, Glint, LensFlare, FlareBurst, Shockwave, EnergyBurst,
  Flash, ChromaticAberration, HUDFrame, Reticle, impulse,
} from '../vfx';
import {Avatar, UITheme, SignalBars3D, signalValue} from '../ui';
import {S0, lb, lin01, smoothstep, Copy, LiveDot, Scrim, Implosion, OldChat, projRect, Exposure, Lock} from './s08/kit';
import {DashRig, DashTimes, dashPos, CoverGlass, PromptChip, speakerRowOffset, fieldVal} from './s08/dash';

const L = lb;

/* ------------------------------------------------------------------ */
/* Timing of UI events (local frames)                                   */
/* ------------------------------------------------------------------ */
const TIMES: DashTimes = {
  speaker: [L(112.25), L(112.75), L(113.25), L(113.75)],
  decisions: [L(114.25), L(114.75)],
  clerk: [L(115), L(115.25), L(115.5), L(115.75)],
  timeline: [L(116.25), (L(117.75) - L(116.25)) / 6], // first marker + step (one 16th)
  chatUser: L(118.25),
  chatReact: L(118.5),
};

/* ------------------------------------------------------------------ */
/* Signal field (B1/B2)                                                 */
/* ------------------------------------------------------------------ */
const FY = 320; // world y of the bar-field floor
const F_COLS = 15, F_ROWS = 3, F_BW = 56, F_GAP = 46, F_PITCH = F_BW + F_GAP, F_MAXH = 600;
const F_W = F_COLS * F_PITCH, F_D = F_ROWS * F_PITCH;
const barTop = (i: number, f: number): V3 => {
  const c = i % F_COLS, r = Math.floor(i / F_COLS);
  return [-F_W / 2 + c * F_PITCH + F_PITCH / 2, FY - fieldVal(i, f) * F_MAXH, -F_D / 2 + r * F_PITCH + F_PITCH / 2];
};

const FieldSet: React.FC<{f: number}> = ({f}) => (
  <Obj x={0} y={FY} z={0} w={F_W} h={F_D} dof={false}>
    <SignalBars3D layout="field" f={f} cols={F_COLS} rows={F_ROWS} barW={F_BW} gap={F_GAP} maxH={F_MAXH} tilt={90} values={fieldVal} highlight={22} />
  </Obj>
);

/** Flares riding the brightest visible caps. */
const CapFlares: React.FC<{cam: CamSpec; f: number; n?: number; scale?: number; seed?: number}> = ({cam, f, n = 2, scale = 0.42, seed = 1}) => {
  const rc = resolveCam(cam);
  const caps = Array.from({length: F_COLS * F_ROWS}, (_, i) => ({i, v: fieldVal(i, f), p: project(rc, barTop(i, f))}))
    .filter((c) => c.p.visible && c.p.x > 80 && c.p.x < 1840 && c.p.y > 60 && c.p.y < 1020 && c.v > 0.62)
    .sort((a, b) => b.v - a.v)
    .slice(0, n);
  return (
    <>
      {caps.map((c, k) => (
        <LensFlare key={c.i} x={c.p.x} y={c.p.y} intensity={0.35 + 0.9 * (c.v - 0.6) + 0.4 * kick(f, 8)} scale={scale * (k ? 0.7 : 1)} streak={k ? 0.35 : 0.6} ghosts={k ? 0 : 0.5} rays={k ? 0 : 10} ring={false} veil={0.2} seed={seed + c.i} />
      ))}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Environments                                                         */
/* ------------------------------------------------------------------ */
const SpaceBG: React.FC<{cam: CamSpec; from: number; floorY: number; intensity?: number; grid?: number; horizon?: number}> = ({cam, from, floorY, intensity = 1, grid = 0.42, horizon}) => {
  const rc = resolveCam(cam);
  const hz = horizon ?? clamp(540 + Math.tan((rc.pitch * Math.PI) / 180) * rc.persp, -200, 1300);
  return (
    <>
      <SpaceBackdrop from={from} intensity={intensity} camX={-rc.yaw * 9} camY={rc.pitch * 9} horizon={hz} haze={0.55} />
      {grid > 0 && <FloorGrid y={floorY} opacity={grid} step={120} extent={4200} center={[0, -400]} fade={[900, 4000]} color="rgb(185,160,250)" />}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Scene                                                                */
/* ------------------------------------------------------------------ */
const AVA: V3 = [0, -120, 0];
// A3 camera (also used by the scene-level copy to aim the "suck" into the core)
const A3T = L(104) - L(102);
const A3KEYS: CamKey[] = [
  {at: 0, target: AVA, yaw: 0, pitch: 2, dist: 1750, roll: 0, focal: 30},
  {at: A3T, ease: 'expoIn', dist: 980, roll: -7, pitch: 0},
];
const chargeAt = (x: number) => clamp((x - L(102)) / (L(104) - L(102)));
const a3Cam = (lt: number) => addCam(camPath(lt, A3KEYS), handheld(lt, 0.25 + 1.4 * chargeAt(lt + L(102)), 6));

export const Scene: React.FC<SceneProps> = ({from, dur}) => {
  const t = useCurrentFrame();
  const f = t + from;

  /* ======================= PART A ======================= */
  const beam = (I: number, x = 960) => (
    <>
      <VolumetricBeams intensity={I} beams={[{x, y: -180, angle: 90, width: 15, length: 1450, color: '#E2D8FF', sweep: 1.2}, {x: x + 6, y: -180, angle: 90, width: 6, length: 1300, color: '#FFFFFF', intensity: 0.7, sweep: 0.8}]} />
      <GodRays x={x} y={-300} spread={30} direction={90} lobes={8} contrast={3.4} dust={1.8} core={0} length={1500} intensity={0.75 * I} speed={0.03} color="#DCD0FF" />
    </>
  );

  const A1 = (lt: number) => {
    const keys: CamKey[] = [
      {at: 0, target: [0, -150, 0], yaw: -9, pitch: 4, dist: 2050, roll: -1.5, focal: 50},
      {at: 108, ease: 'sine', yaw: 3, pitch: 1.5, dist: 1720, roll: 1},
    ];
    const cam = addCam(camPath(lt, keys), drift(lt, 0.8, 5));
    const on = lt < 0 ? 0 : clamp(lt / 7) * (lt < 9 && lt % 3 === 1 ? 0.55 : 1); // the stage light clunks on with a stutter
    const dying = 1 - 0.7 * smoothstep(L(99), L(99) + 16, lt);
    const pw = project(cam, [0, -150, 0]);
    return (
      <AbsoluteFill style={{background: '#020106'}}>
        <World camera={cam} backdrop={<SpaceBackdrop from={from} intensity={0.22} stars={90} haze={0} audio={0.3} />}>
          <Obj x={0} y={-195} z={0} ry={-7} rx={4} w={620} h={380}><OldChat t={lt} off={L(99)} /></Obj>
        </World>
        {beam(on * dying, pw.x)}
        <Bokeh count={18} focus={0.95} opacity={0.35 * on} camX={-lt * 0.6} />
        <AbsoluteFill style={{background: 'radial-gradient(75% 70% at 50% 40%, transparent 35%, rgba(2,1,6,0.85) 100%)'}} />
      </AbsoluteFill>
    );
  };

  const avatarNode = (glow: number, wink: number, s = 1) => (
    <Obj x={AVA[0]} y={AVA[1]} z={AVA[2]} w={360} h={360} billboard s={s}>
      <div style={{width: 360, height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <Avatar size={330} wink={wink} glow={glow} />
      </div>
    </Obj>
  );
  const winkAt = (lt: number) => {
    const d = lt - (L(101) - L(100));
    return d < 0 || d > 14 ? 1 : d < 4 ? 1 - d / 4 : d < 9 ? 0 : (d - 9) / 5;
  };

  const A2 = (lt: number) => {
    const keys: CamKey[] = [
      {at: -20, target: [0, -140, 0], yaw: -16, pitch: 12, dist: 1650, roll: -3, focal: 35},
      {at: 53, ease: 'sine', yaw: -6, pitch: 9, dist: 1480, roll: -1.5},
    ];
    const cam = addCam(camPath(lt, keys), drift(lt, 0.7, 9));
    const form = prog(lt, 0, 34, expoOut);
    const pa = project(cam, [AVA[0] + 60, AVA[1] - 150, 0]);
    return (
      <AbsoluteFill style={{background: '#020106'}}>
        <World camera={cam} backdrop={<SpaceBackdrop from={from} intensity={0.3} stars={110} haze={0} audio={0.3} />}>
          <Obj x={0} y={120} z={0} rx={90} w={900} h={900} dof={false}>
            <div style={{width: 900, height: 900, borderRadius: '50%', background: 'radial-gradient(circle, rgba(205,187,255,0.32) 0%, rgba(140,107,234,0.12) 35%, transparent 68%)'}} />
          </Obj>
          {form > 0.01 && avatarNode(0.5 + 0.6 * form, winkAt(lt), 0.8 + 0.2 * form)}
        </World>
        {beam(0.85, project(cam, AVA).x)}
        <Glint x={pa.x} y={pa.y} size={220} intensity={1.5 * Math.exp(-Math.abs(lt - 4) / 7)} />
        <Glint x={pa.x + 40} y={pa.y + 70} size={120} intensity={1.2 * Math.exp(-Math.abs(lt - (L(101) - L(100)) - 4) / 5)} color="pistachio" />
        <Bokeh count={18} focus={0.95} opacity={0.35} camX={-lt * 0.8} seed={4} />
        <AbsoluteFill style={{background: 'radial-gradient(75% 70% at 50% 40%, transparent 35%, rgba(2,1,6,0.85) 100%)'}} />
      </AbsoluteFill>
    );
  };

  // gather: travel integral for the implosion (accelerating)
  const travelAt = (x: number) => {
    let s = 0;
    for (let k = L(102); k < x; k++) s += 0.6 + 2.6 * Math.pow(chargeAt(k), 1.6);
    return s;
  };
  const A3 = (lt: number) => {
    const cam = a3Cam(lt);
    const g = lt + L(102);
    const ch = chargeAt(g);
    const p = project(cam, AVA);
    return (
      <AbsoluteFill style={{background: '#020106'}}>
        <World camera={cam} backdrop={<SpaceBackdrop from={from} intensity={0.35 + 0.7 * ch} stars={140} haze={0} audio={0.4} />}>
          {avatarNode(1.1 + 1.6 * ch, 1, 1)}
        </World>
        <GodRays x={p.x} y={p.y} intensity={0.25 + 1.3 * ch * ch} lobes={26} contrast={2.4} length={1500} core={0.6 + ch} speed={0.15 + 0.6 * ch} dust={0.8} />
        <Implosion travel={travelAt(g)} charge={0.3 + 0.8 * ch} x={p.x} y={p.y} count={620} />
        <SpeedLines intensity={smoothstep(L(102.75), L(104), g) * 0.8} x={p.x} y={p.y} travel={g * 0.012 + Math.pow(ch, 3) * 3.2} count={220} color="#CDBBFF" />
        <Glint x={p.x} y={p.y} size={260 + 420 * ch} intensity={0.3 + 2.2 * ch * ch} spin={0.6 + 4 * ch} />
        <AbsoluteFill style={{background: `radial-gradient(70% 68% at 50% 40%, transparent ${30 + 30 * ch}%, rgba(2,1,6,${0.85 - 0.5 * ch}) 100%)`}} />
      </AbsoluteFill>
    );
  };

  /* ======================= PART B ======================= */
  const life = (lt: number, amp = 0.6, seed = 1, push = 22): CamSpec[] => [handheld(lt, amp, seed), kickPush(f, push), kickZoom(f, 0.012)] as CamSpec[];
  const DROP = L(104);
  const keyLight = () => {
    const k = kick(f, 10);
    return (
      <>
        <AbsoluteFill style={{background: `radial-gradient(55% 60% at 100% 0%, rgba(150,236,255,${(0.13 + 0.12 * k).toFixed(3)}) 0%, rgba(140,107,234,${(0.08 + 0.06 * k).toFixed(3)}) 40%, transparent 75%)`, pointerEvents: 'none'}} />
        <AbsoluteFill style={{background: 'radial-gradient(90% 80% at 50% 45%, transparent 55%, rgba(3,1,8,0.55) 100%)', pointerEvents: 'none'}} />
      </>
    );
  };

  // B1 — drop: low-angle hero track along the Signal Wall
  const B1 = (lt: number) => {
    const keys: CamKey[] = [
      {at: 0, target: [380, FY - 230, 0], yaw: -82, pitch: 5, dist: 1750, roll: -1, focal: 24},
      {at: 22, ease: 'expoOut', target: [260, FY - 220, 0], yaw: -60, pitch: 6.5, dist: 1180, roll: -5},
      {at: 54, ease: 'linear', target: [-60, FY - 230, 0], yaw: -52, pitch: 7, dist: 1110, roll: -6},
    ];
    const at = (x: number) => addCam(camPath(x, keys), ...life(x, 0.7, 2, 26));
    const cam = at(lt);
    const m = camMotion(at, lt, [0, FY - 200, 0]);
    const ph = project(cam, barTop(22, f));
    const pc = project(cam, [0, FY, 0]);
    const ca = 2 + 16 * impulse(lt, 0, 1, 7);
    return (
      <AbsoluteFill>
        <MotionBlur vx={m.dx} vy={m.dy} threshold={1.5}>
          <ChromaticAberration amount={lt < 22 ? ca : 0}>
            <World camera={cam} backdrop={<SpaceBG cam={cam} from={from} floorY={FY + 1} intensity={1.2} />}>
              <FieldSet f={f} />
            </World>
          </ChromaticAberration>
        </MotionBlur>
        <CapFlares cam={cam} f={f} n={2} seed={3} />
        <Shockwave x={pc.x} y={pc.y} at={DROP} squash={0.24} radius={1700} rings={2} thickness={110} />
        <Shockwave x={ph.x} y={ph.y} at={DROP} rings={3} distort radius={1300} />
        <EnergyBurst x={ph.x} y={ph.y} at={DROP} count={180} distance={820} />
        <FlareBurst x={ph.x} y={ph.y} at={DROP} dur={80} peak={2} sustain={0.35} seed={21} />
        <Flash at={DROP} dur={12} color="cyan" max={0.35} bloom x={ph.x} y={ph.y} />
        <DustField camX={-lt * 3} boost={kick(f) * 0.7} count={120} />
      </AbsoluteFill>
    );
  };

  // B2 — long-lens dutch side track
  const B2 = (lt: number) => {
    const keys: CamKey[] = [
      {at: -8, target: [560, FY - 250, 0], yaw: -13, pitch: 3.5, dist: 2500, roll: -8, focal: 55, shiftY: 400},
      {at: 22, ease: 'linear', target: [210, FY - 250, 0], yaw: -11.5, pitch: 3.9, dist: 2455, roll: -8.4, shiftY: 330},
      {at: 60, ease: 'linear', target: [-380, FY - 250, 0], yaw: -9, pitch: 4.5, dist: 2380, roll: -9, shiftY: 280},
    ];
    const at = (x: number) => addCam(camPath(x, keys), ...life(x, 0.6, 3, 18));
    const cam = at(lt);
    const m = camMotion(at, lt, [0, FY - 250, 0]);
    return (
      <AbsoluteFill>
        <MotionBlur vx={m.dx} vy={m.dy} threshold={1.5}>
          <World camera={cam} backdrop={<SpaceBG cam={cam} from={from} floorY={FY + 1} intensity={1.1} />}>
            <FieldSet f={f} />
          </World>
        </MotionBlur>
        <CapFlares cam={cam} f={f} n={2} scale={0.5} seed={7} />
        <DustField camX={-lt * 5} boost={kick(f) * 0.7} count={110} seed={6} />
      </AbsoluteFill>
    );
  };

  // B3 — speed-ramped pull-back through the exploded glass layers (the stack telescopes back as we retreat)
  const B3dur = L(110) - L(108);
  const r3 = snapIn(B3dur, 96, {fast: 4.4, at: 0.32});
  const E3 = (tau: number) => 1.3 + 1.7 * (1 - expoOut(clamp(tau / 80)));
  const B3 = (lt: number) => {
    const tau = r3.time(Math.max(0, lt));
    const E = E3(tau);
    const sig = dashPos('sig', E);
    const keys: CamKey[] = [
      {at: 0, pos: [sig[0] - 30, sig[1] - 40, sig[2] + 760], lookAt: [sig[0] + 10, sig[1] - 20, sig[2]], focal: 24, roll: -5},
      {at: 34, ease: 'linear', pos: [-80, -230, 1500], lookAt: [-30, -30, 300], roll: -2},
      {at: 96, ease: 'quintOut', pos: [330, -420, 2150], lookAt: [30, 20, 200], roll: 2},
    ];
    const at = (x: number) => addCam(camPath(r3.time(Math.max(0, x)), keys), ...life(x, 0.5, 4, 14));
    const cam = at(lt);
    const m = camMotion(at, lt, [0, 0, 300]);
    const sheetZ = sig[2] + 720;
    const sheetO = 1 - smoothstep(34, 62, tau);
    return (
      <AbsoluteFill>
        <MotionBlur vx={m.dx} vy={m.dy} threshold={2}>
          <World camera={cam} backdrop={<SpaceBG cam={cam} from={from} floorY={700} intensity={1} />}>
            <UITheme look="frost">
              <DashRig t={lt + L(108)} f={f} E={E} times={TIMES} beams={1} nf={[60, 380]} glow={0.25} crisp={{sig: 1.6}} />
            </UITheme>
            {sheetO > 0.01 && (
              <>
                <Obj x={0} y={-10} z={sheetZ} w={1760} h={1080} nearFade={[60, 420]} dof={false} o={sheetO}>
                  <CoverGlass w={1760} h={1080} label="Signal wall · 45 live" sub="TURN 08 · COLLECT_DETAILS" />
                </Obj>
                <Obj x={30} y={-20} z={sheetZ + 380} w={1900} h={1180} nearFade={[60, 420]} dof={false} o={sheetO * 0.8}>
                  <CoverGlass w={1900} h={1180} label="Live dashboard" sub="JUDGE · SPEAKER · CLERK" />
                </Obj>
              </>
            )}
          </World>
        </MotionBlur>
        <DustField camX={-tau * 2} boost={kick(f) * 0.6} count={110} seed={8} />
      </AbsoluteFill>
    );
  };

  // B4 — low-angle hero, layers SNAP together on 111, light sweep
  const SNAP = L(111) - L(110);
  const B4 = (lt: number) => {
    const sn = clamp((lt - (SNAP - 11)) / 11);
    const E = lt < SNAP - 11 ? 1.3 + 0.06 * Math.sin(lt / 9) : 1.3 * (1 - Math.pow(sn, 3));
    const keys: CamKey[] = [
      {at: 0, target: [0, 20, 150], yaw: 34, pitch: 11, dist: 2250, roll: 4, focal: 28},
      {at: SNAP, ease: 'cubicIn', yaw: 25, pitch: 9, dist: 2050, roll: 3},
      {at: 54, ease: 'expoOut', yaw: 19, pitch: 8, dist: 1960, roll: 2},
    ];
    const cam = addCam(camPath(lt, keys), ...life(lt, 0.5, 5, 20), kickShake(f, 0.6), {zoom: 1 + 0.035 * impulse(lt, SNAP, 1, 8)});
    const lock = impulse(lt, SNAP, 1, 9);
    const corner = project(cam, [770, -480, 0]);
    return (
      <AbsoluteFill>
        <World camera={cam} backdrop={<SpaceBG cam={cam} from={from} floorY={700} intensity={1.15} />}>
          <UITheme look="frost">
            <DashRig t={lt + L(110)} f={f} E={E} times={TIMES} beams={1} flash={lock} sheen={lt >= SNAP ? prog(lt, SNAP + 2, 34, (x) => x) : undefined} glow={0.3 + 0.5 * lock} />
          </UITheme>
        </World>
        <FlareBurst x={corner.x} y={corner.y} at={L(111)} dur={50} peak={1.3} scale={0.6} ghosts={0.6} seed={5} flash={0.25} />
        <DustField camX={-lt * 2} boost={kick(f) * 0.6} count={100} seed={9} />
      </AbsoluteFill>
    );
  };

  // B5 — orbit + rack focus: the Speaker prompt assembles, rows fly in from the foreground through the focus plane
  const B5 = (lt: number) => {
    const tt = lt + L(112);
    const E = 0.25 + 0.6 * expoOut(clamp(lt / 50));
    const spk = dashPos('speaker', E);
    const keys: CamKey[] = [
      {at: -6, target: [spk[0] - 20, spk[1] + 20, spk[2]], yaw: 40, pitch: -6, dist: 1250, roll: 4, focal: 45, shiftX: 120, shiftY: -20, zoom: 1.12},
      {at: 54, ease: 'sine', yaw: 10, pitch: 2, dist: 1150, roll: -2, zoom: 1.22},
    ];
    const cam = addCam(camPath(lt, keys), ...life(lt, 0.45, 6, 14));
    const rc = resolveCam(cam);
    // chips: fly from near the lens into their slots, landing exactly on their 16th
    const chips = [0, 1, 2].map((i) => {
      const land = TIMES.speaker[i];
      const u = clamp((tt - (land - 16)) / 16);
      const e = 1 - Math.pow(1 - u, 3);
      const [ox, oy] = speakerRowOffset(i);
      const slot: V3 = [spk[0] + ox, spk[1] + oy, spk[2] + 3];
      const start: V3 = [slot[0] - 260 + 220 * i, slot[1] + 230 - 170 * i, slot[2] + 760];
      const p: V3 = [mix(start[0], slot[0], e), mix(start[1], slot[1], e), mix(start[2], slot[2], e)];
      return {i, u, p, tilt: (1 - e) * (i % 2 ? 18 : -18)};
    });
    const flying = chips.find((c) => c.u > 0 && c.u < 1);
    const focusD = flying ? mix(depthOf(rc, flying.p), depthOf(rc, spk), smoothstep(0.35, 1, flying.u)) : depthOf(rc, spk);
    return (
      <AbsoluteFill>
        <World camera={cam} focus={focusD} aperture={16} maxBlur={16} backdrop={<SpaceBG cam={cam} from={from} floorY={700} grid={0.3} />}>
          <UITheme look="frost">
            <DashRig t={tt} f={f} E={E} times={TIMES} crisp={{speaker: 2}} skip={['side', 'top', 'base', 'mainPane', 'timeline', 'decisions']} flyRows />
            {chips.filter((c) => c.u > 0 && c.u < 1).map((c) => (
              <Obj key={c.i} x={c.p[0]} y={c.p[1]} z={c.p[2]} ry={c.tilt} w={299 * 2} h={35 * 2} s={0.5} nearFade={[40, 200]}>
                <div style={{zoom: 2}}><PromptChip i={c.i} glow={c.u} /></div>
              </Obj>
            ))}
          </UITheme>
        </World>
        <DustField camX={-lt * 2} boost={kick(f) * 0.5} count={90} seed={10} focus={0.4} />
        {keyLight()}
      </AbsoluteFill>
    );
  };

  // B6 — high-angle crane on Decisions + Clerk (subject kept high: the copy band below stays clear)
  const B6 = (lt: number) => {
    const E = 0.7;
    const dec = dashPos('decisions', E);
    const clk = dashPos('clerk', E);
    const mid: V3 = [(dec[0] + clk[0]) / 2 + 10, (dec[1] + clk[1]) / 2 + 10, (dec[2] + clk[2]) / 2];
    const keys: CamKey[] = [
      {at: -6, target: mid, yaw: -20, pitch: -36, dist: 1380, roll: 6, focal: 50, shiftX: 300, shiftY: -250, zoom: 1.22},
      {at: 54, ease: 'sine', yaw: -11, pitch: -29, dist: 1320, roll: 4, zoom: 1.3},
    ];
    const cam = addCam(camPath(lt, keys), ...life(lt, 0.45, 7, 14));
    const rc = resolveCam(cam);
    const fd = rackFocus(lt, depthOf(rc, clk), depthOf(rc, dec), 0, 12);
    const pg = project(cam, [dec[0] - 140, dec[1] - 7, dec[2]]);
    return (
      <AbsoluteFill>
        <World camera={cam} focus={fd} aperture={9} maxBlur={12} backdrop={<SpaceBG cam={cam} from={from} floorY={700} grid={0.3} />}>
          <UITheme look="frost">
            <DashRig t={lt + L(114)} f={f} E={E} times={TIMES} crisp={{decisions: 2, clerk: 2}} skip={['side', 'top', 'base', 'mainPane', 'timeline', 'title', 'chat']} />
          </UITheme>
        </World>
        <Glint x={pg.x} y={pg.y} size={260} intensity={1.8 * impulse(t, TIMES.decisions[0], 1, 10)} color="pistachio" />
        <LensFlare x={pg.x} y={pg.y} intensity={1.1 * impulse(t, TIMES.decisions[0], 1, 16)} scale={0.5} ghosts={0.4} rays={0} ring={false} color="#9FF5D0" secondary="#45E3B0" />
        <DustField camX={-lt * 2} boost={kick(f) * 0.5} count={90} seed={11} focus={0.4} />
        {keyLight()}
      </AbsoluteFill>
    );
  };

  // B7 — dutch close on the turn timeline; the camera tracks the markers as they pop
  const B7 = (lt: number) => {
    const E = 0.55;
    const tl = dashPos('timeline', E);
    const mx = (u: number) => tl[0] - 470 + 80 + 760 * u; // marker x along the line (u = ms / 1240)
    const ly = tl[1] + 11;
    const tt = lt + L(116);
    const follow = smoothstep(TIMES.timeline[0] - 6, TIMES.timeline[0] + 6 * TIMES.timeline[1] + 10, tt);
    const keys: CamKey[] = [
      {at: -6, target: [mx(0.05), ly, tl[2]], yaw: -24, pitch: 8, dist: 1150, roll: -10, focal: 50, shiftX: 180, shiftY: -170, zoom: 1.42},
    ];
    const base = camPath(lt, keys);
    const cam = addCam({...base, target: [mix(mx(0.08), mx(0.88), follow), ly, tl[2]], yaw: mix(-24, -12, follow), roll: mix(-10, -7, follow)}, ...life(lt, 0.45, 8, 14));
    const rr = projRect(cam, [mx(1), ly - 20, tl[2]], 210, 140);
    return (
      <AbsoluteFill>
        <World camera={cam} focus={[mx(mix(0.08, 0.88, follow)), ly, tl[2]]} aperture={10} maxBlur={12} backdrop={<SpaceBG cam={cam} from={from} floorY={700} grid={0.35} />}>
          <UITheme look="frost">
            <DashRig t={tt} f={f} E={E} times={TIMES} crisp={{timeline: 2}} skip={['side', 'top', 'base', 'mainPane', 'title', 'speaker']} />
          </UITheme>
        </World>
        {rr && <Lock t={t} x={rr.x} y={rr.y} w={rr.w} h={rr.h} start={L(117.75) + 2} dur={10} label="Last token" value="1,240 ms · traced" side="left" />}
        <DustField camX={-lt * 3} boost={kick(f) * 0.5} count={90} seed={12} focus={0.4} />
        {keyLight()}
      </AbsoluteFill>
    );
  };

  // B8 — the live chat; the music drops out → slow-mo hold, reticle locks; push in → zoom-through exit on 120
  const r8 = makeRamp([{speed: 1, until: L(118.55) - L(118)}, {speed: 0.2, until: L(119.6) - L(118)}, {speed: 2.6}], 8);
  const B8 = (lt: number) => {
    const E = 0.5;
    const ch = dashPos('chat', E);
    const tau = r8.time(lt);
    const bub: V3 = [ch[0] + 40, ch[1] + 255, ch[2]];
    const keys: CamKey[] = [
      {at: -6, target: [bub[0] - 30, bub[1] - 40, bub[2]], yaw: 26, pitch: -4, dist: 1400, roll: 8, focal: 50, shiftX: 260, shiftY: -310, zoom: 1.18},
      {at: 40, ease: 'sine', yaw: 18, pitch: -2, dist: 1300, roll: 7, zoom: 1.26},
      {at: 66, ease: 'expoIn', target: [bub[0] - 10, bub[1] - 10, bub[2]], yaw: 6, dist: 820, roll: 2, shiftX: 60, shiftY: -60, zoom: 1.55},
    ];
    const at = (x: number) => addCam(camPath(r8.time(x), keys), handheld(x, 0.35, 9), kickPush(f, 10));
    const cam = at(lt);
    const tUI = tau + L(118);
    const rb = projRect(cam, [ch[0] - 18, ch[1] + 288, ch[2]], 214, 82);
    return (
      <AbsoluteFill>
        <World camera={cam} focus={bub} aperture={8} maxBlur={12} backdrop={<SpaceBG cam={cam} from={from} floorY={700} grid={0.3} />}>
          <UITheme look="frost">
            <DashRig t={tUI} f={f} E={E} times={TIMES} crisp={{chat: 2}} skip={['side', 'top', 'title', 'base', 'mainPane', 'speaker', 'sig']} />
          </UITheme>
        </World>
        {rb && <Lock t={t} x={rb.x} y={rb.y} w={rb.w} h={rb.h} start={L(119)} dur={10} label="User · turn 9" value="🔥 reacted · 0 ms" />}
        <DustField camX={-tau * 2} boost={kick(f) * 0.5} count={90} seed={13} focus={0.4} />
        {keyLight()}
      </AbsoluteFill>
    );
  };

  const shots = beatShots(from, dur, [
    {beat: 96, name: 'A1 beam', render: A1},
    {beat: 100, name: 'A2 avatar', in: lightLeakDissolve({dur: 30, color: 'violet', strength: 0.8}), render: A2},
    {beat: 102, name: 'A3 gather', in: cut(), render: A3},
    {beat: 104, name: 'B1 drop wall', in: flashCut({dur: 18, split: 0, peak: 1}), render: B1},
    {beat: 106, name: 'B2 side track', in: whip({dir: 'right', dur: 10}), render: B2},
    {beat: 108, name: 'B3 pull-back', in: flashCut({dur: 8, color: '#BFF4FF', peak: 0.35}), render: B3},
    {beat: 110, name: 'B4 snap', in: glitchCut({dur: 8, slices: false, seed: 4}), render: B4},
    {beat: 112, name: 'B5 speaker', in: whip({dir: 'left', dur: 10}), render: B5},
    {beat: 114, name: 'B6 decisions', in: flashCut({dur: 8, peak: 0.6}), render: B6},
    {beat: 116, name: 'B7 timeline', in: spinBlur({dur: 12, angle: 60, dir: -1, blur: 0.5}), render: B7},
    {beat: 118, name: 'B8 chat', in: whip({dir: 'right', dur: 10}), out: zoomThrough({dur: 14, depth: 1.9, blur: 0}), render: B8},
  ]);

  /* ---------- scene-level overlays: copy, HUD, white-out ---------- */
  const suckTo = (() => {
    const p = project(a3Cam(L(103.4) - L(102)), AVA);
    return [p.x, p.y] as [number, number];
  })();
  const whiteOut = t < L(104) ? Math.pow(lin01(t, L(103.3), L(104) - L(103.3) - 1), 2.4) : 0;
  const fadeIn = t < 6 ? 1 - t / 6 : 0;
  return (
    <AbsoluteFill style={{background: '#020106'}}>
      <Shots shots={shots} t={t} />

      {/* PART A copy */}
      <Copy t={t} x={960} y={800} align="center" lines={[{text: 'Not another chatbot.', at: L(96.5), size: 104, stagger: L(97) - L(96.5), dur: 30, tone: 'white', weight: 800}]} out={{at: L(99.5), mode: 'blur', dur: 16}} glow={0.35} />
      <Copy t={t} x={960} y={790} align="center" lines={[{text: 'A bot studio.', at: L(100.5), size: 132, stagger: 7, dur: 26, tone: 'lilac'}]} out={{at: L(103), mode: 'suck', dur: L(103.75) - L(103), to: suckTo}} glow={0.6} />
      <Exposure o={whiteOut} />

      {/* PART B copy 1 */}
      {t >= L(104) && t < L(108.2) && (
        <>
          <Scrim x={560} y={300} w={1200} h={520} o={0.45 * lin01(t, L(104) + 8, 14) * (1 - lin01(t, L(107.6), 12))} />
          <Copy t={t} x={124} y={150} kicker={{text: 'Live dashboard · signal wall', at: L(104.25)}}
            lines={[
              {text: 'See every signal.', at: L(104.5), size: 116, stagger: 6, dur: 24, tone: 'lilac'},
              {text: 'Live.', at: L(106), size: 116, dur: 18, tone: 'live', lead: <LiveDot size={46} pulse={kick(f, 8)} />},
            ]}
            out={{at: L(107.6), mode: 'fly', dur: 12}} />
        </>
      )}

      {/* PART B copy 2 */}
      {t >= L(113.85) && (
        <>
          <Scrim x={560} y={880} w={1300} h={300} o={0.5 * lin01(t, L(114) + 5, 10) * (1 - lin01(t, L(119.5), 14))} />
          <Copy t={t} x={124} y={798} kicker={{text: 'Decisions · Clerk · Timeline', at: L(113.85), color: '#E7F4B9'}}
            lines={[{text: 'Every decision, explained.', at: L(114), size: 86, stagger: 6, dur: 24, tone: 'lilac'}]}
            out={{at: L(119.5), mode: 'blur', dur: 12}} />
        </>
      )}

      {/* HUD garnish during the hero */}
      {t >= L(104) && <HUDFrame start={L(104) + 4} from={from} title="Bot Studio // Live" subtitle="Turn 08 · collect_details" footer="Judge · Speaker · Clerk" opacity={0.7} />}

      <Exposure o={fadeIn} color="#020106" />
    </AbsoluteFill>
  );
};
