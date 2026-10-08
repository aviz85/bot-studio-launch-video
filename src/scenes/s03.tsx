/* ============================================================================================================
 * s03 · REVEAL — DROP 1 · beats 32–40 · global frames 860–1075 (local 0–215)
 * ------------------------------------------------------------------------------------------------------------
 * SHOT LIST (every cut on B(k); local frame = B(k) − 860)
 *  A  32.0  (860, L0)    IGNITION — in: flash (in-only, peak 1). White-out → FlareBurst + hero refract Shockwave +
 *                        floor ring + EnergyBurst + CA kick. 24 mm, camera blown back (dolly 620 → 1350, dutch −8°→−3°).
 *                        ~46 glass shards of the avatar implode from everywhere (reversed explosion, accelerating into
 *                        the lock) while light streaks spiral inward; GodRays ignite behind. Lock = the cut at 33.
 *  B  33.0  (887, L27)   MACRO MEDALLION — in: cyan flash (lock). 55 mm low-angle 3/4 macro orbit on the glass avatar
 *                        medallion (thickness edge, fresnel rim), rack-focus bokeh, GodRays + flare at the antenna.
 *                        33.5: the avatar WINKS (brand "<"), glint.
 *  C  34.0  (913, L53)   TITLE SLAM — in: whip down. Low-angle 28 mm dutch push. "Bot Studio" chrome letters fly in
 *                        from behind the lens (per-letter stagger) and SLAM onto the plane at 34.5 (927): light streak,
 *                        shake, chrome sheen sweep. Medallion glows above.
 *  D  35.0  (940, L80)   LOCKUP — in: soft flash. Frontal eye-level hero lockup, slow push + drift; tagline
 *                        "Bots that think in the open." mask-reveals word by word (screen-space super, held across the
 *                        cut at 36 so it stays readable ~0.85 s).
 *  E  36.0  (967, L107)  MATERIALIZE I — in: zoom-through (fly into the logo light → the app world emerges).
 *                        Wide low 3/4 view (30 mm). Ghost target frame scans in; SIDEBAR flies in from depth on 36,
 *                        TOP BAR on 36.5 (light trails, lock flashes). App framed above the tagline (no overlap).
 *  F  37.0  (994, L134)  MATERIALIZE II — in: whip right. Close low-angle tracking from the right side, 24 mm, dutch +6°,
 *                        shallow DOF. MAIN (dashboard) lands on 37, CHAT flies in past the lens on 37.5.
 *  G  38.0  (1021, L161) HERO ORBIT + LOCK — in: cut into an in-camera speed ramp (heroRamp: whip-in fast → slow-mo
 *                        glide → snap out). Low-angle orbit around the exploded stack with light beams; layers COLLAPSE
 *                        38.5 → 39 and LOCK at 39 (1048): lock-in flashes, base glass fills, light sweep, flare glint.
 *                        Out at 40 (1075): half whip right (s04 should open with `in: whip({dir: 'right'})`).
 * Kick on every beat: kickPush / kickZoom on every camera, kick-pulsed glows (GodRays, halo, antenna bulb, app glow).
 * ============================================================================================================ */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import type {SceneProps} from '../cine/types';
import {
  World, Obj, FloorGrid, CamKey, CamSpec, V3, addCam, handheld, drift, kickPush, kickZoom, kickShake, camPath, camMotion,
  heroRamp, MotionBlur, Shots, ShotInfo, beatShots, beatsToLocal, whip, flashCut, zoomThrough, cut, project, resolveCam, depthOf,
} from '../cine';
import {kick, clamp, lerp} from '../lib';
import {
  SpaceBackdrop, GodRays, FlareBurst, Shockwave, EnergyBurst, Flash, ChromaticAberration, LensFlare, Glint, Bokeh, DustField,
  LightStreak, Swoosh, VolumetricBeams, impulse,
} from '../vfx';
import {AV, ShardCloud, SHARD_LOCK, Medallion, ChromeTitle, LetterPose, Tagline, ConvergeLight} from './s03/art';
import {AppRig} from './s03/app';

/* ------------------------------------------------------------------ */
/* World layout                                                         */
/* ------------------------------------------------------------------ */
const AVP: V3 = [0, -300, 0]; // avatar medallion centre
const TTL: V3 = [0, 130, 0]; // title centre
const FLOOR = 520; // logo-world floor
const APP_FLOOR = 640; // app-world floor

/** Sky for the logo world (screen space, inside the lens). */
const LogoSky: React.FC<{t: number; from: number; camX?: number; rays?: {x: number; y: number; I: number} | null; grid?: number}> = ({t, from, camX = 0, rays, grid = 0.22}) => (
  <>
    <SpaceBackdrop from={from} frame={t} intensity={1.15} haze={0.35} camX={camX} />
    <FloorGrid y={FLOOR} opacity={grid} step={160} fade={[500, 3000]} center={[0, -400]} />
    {rays && rays.I > 0.01 && <GodRays x={rays.x} y={rays.y} intensity={rays.I} length={1500} lobes={26} frame={t} core={0.9} />}
  </>
);

/** Sky for the app world. */
const AppSky: React.FC<{tt: number; from: number; camX: number; glowAt?: {x: number; y: number}; glowI?: number}> = ({tt, from, camX, glowAt, glowI = 1}) => (
  <>
    <SpaceBackdrop from={from} frame={tt} intensity={1.05} haze={0.5} horizon={600} camX={camX} />
    <VolumetricBeams frame={tt} intensity={0.55} beams={[{x: 420 - camX * 0.4, y: -120, angle: 66, width: 10, length: 1500, color: 'lilac', sweep: 5}, {x: 1500 - camX * 0.4, y: -120, angle: 112, width: 12, length: 1500, color: 'cyan', sweep: 6, intensity: 0.8}]} />
    {glowAt && (
      <div style={{position: 'absolute', left: glowAt.x - 900, top: glowAt.y - 600, width: 1800, height: 1200, background: `radial-gradient(50% 50% at 50% 50%, rgba(150,120,255,${(0.32 * glowI).toFixed(3)}) 0%, rgba(127,231,255,${(0.08 * glowI).toFixed(3)}) 40%, transparent 70%)`}} />
    )}
    <FloorGrid y={APP_FLOOR} opacity={0.3} step={150} fade={[700, 3600]} center={[0, -200]} />
  </>
);

/** Small HUD readout for the assembly (top-left, clear of the UI and the tagline). */
const AssemblyHud: React.FC<{lt: number; count: number}> = ({lt, count}) => {
  const p = clamp((lt - 2) / 8);
  if (p <= 0) return null;
  const blink = lt % 16 < 10 ? 1 : 0.35;
  return (
    <div style={{position: 'absolute', left: 128, top: 140, opacity: p, fontFamily: 'Inter', color: '#CDBBFF'}}>
      <div style={{fontWeight: 600, fontSize: 16, letterSpacing: '0.3em', textTransform: 'uppercase', opacity: 0.85}}>Bot Studio · Live Dashboard</div>
      <div style={{width: 260 * p, height: 1, margin: '10px 0', background: 'linear-gradient(90deg, rgba(127,231,255,0.9), rgba(127,231,255,0))'}} />
      <div style={{fontFamily: "'DejaVu Sans Mono', monospace", fontSize: 18, color: '#BFF4FF', letterSpacing: '0.08em'}}>
        <span style={{opacity: blink}}>●</span> ASSEMBLING LAYERS {String(count).padStart(2, '0')}/04
      </div>
    </div>
  );
};

/** Letter pose for the title slam: landed at `land` (shot-local); letters start from behind the lens. */
const slamPose = (lt: number, land: number) => (i: number, n: number): LetterPose => {
  const c = i - (n - 1) / 2;
  const start = -1 + i * 0.8;
  const u = clamp((lt - start) / (land - start));
  const e = Math.pow(u, 2.2);
  const k = 1 - e;
  const settle = lt >= land ? impulse(lt, land, 1, 3.2) : 0;
  return {
    x: c * 90 * k, y: 120 * k, z: -1500 * k, rx: 58 * k, ry: -c * 5 * k, rz: (i % 2 ? 6 : -5) * k,
    o: clamp(u * 4), blur: 5 * k, s: 1 + 0.05 * settle,
  };
};
const landed = (): LetterPose => ({x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, o: 1, blur: 0, s: 1});

/* ------------------------------------------------------------------ */
/* Scene                                                                */
/* ------------------------------------------------------------------ */
export const Scene: React.FC<SceneProps> = ({from, dur}) => {
  const t = useCurrentFrame();
  const f = t + from;
  const L = (k: number) => beatsToLocal(from, k);

  /* ---------- A · IGNITION ---------- */
  const keysA: CamKey[] = [
    {at: 0, target: AVP, yaw: 16, pitch: 6, dist: 640, roll: -8, focal: 24},
    {at: L(33) - L(32), ease: 'expoOut', yaw: 3, pitch: 3, dist: 1380, roll: -3},
  ];
  const shotA = (lt: number) => {
    const cam = addCam(camPath(lt, keysA), handheld(lt, 1.3, 5), kickShake(f, 1.8, 6), kickZoom(f, 0.025));
    const rc = resolveCam(cam);
    const pa = project(rc, AVP);
    const rays = {x: pa.x, y: pa.y, I: 0.15 + 0.95 * clamp((lt - 2) / 22) + 0.3 * kick(f)};
    const ca = 16 * impulse(lt, 0, 1, 3);
    const lockI = clamp((lt - (SHARD_LOCK - 6)) / 6);
    return (
      <AbsoluteFill>
        <ChromaticAberration amount={ca}>
          <World camera={rc} backdrop={<LogoSky t={t} from={from} rays={rays} camX={-rc.pos[0] * 0.3} />}>
            <Obj x={AVP[0]} y={AVP[1]} z={AVP[2]}>
              <ShardCloud t={lt} />
            </Obj>
          </World>
          <ConvergeLight x={pa.x} y={pa.y} t={lt} radius={(AV / 2) * pa.scale} end={SHARD_LOCK} intensity={1} />
          <EnergyBurst x={pa.x} y={pa.y} at={0} frame={lt} count={190} distance={900} dur={46} />
        </ChromaticAberration>
        {/* hero refraction only while the ring is young and bright (backdrop-filter is the priciest effect here) */}
        <Shockwave x={pa.x} y={pa.y} at={0} frame={lt} rings={3} distort refract={lt < 18} radius={1250} dur={32} />
        <Shockwave x={960} y={890} at={2} frame={lt} squash={0.2} radius={1600} rings={1} thickness={120} intensity={0.8} />
        <FlareBurst x={pa.x} y={pa.y} at={0} frame={lt} dur={60} peak={2} flash={0.45} />
        <Flash at={0} frame={lt} dur={12} color="cyan" max={0.35} bloom x={pa.x} y={pa.y} />
        {/* lock: rim catches light as the last shards seat */}
        <Glint x={pa.x + 0.36 * AV * pa.scale} y={pa.y - 0.33 * AV * pa.scale} size={260} intensity={1.4 * lockI} color="cyan" frame={lt} />
      </AbsoluteFill>
    );
  };

  /* ---------- B · MACRO MEDALLION ---------- */
  const keysB: CamKey[] = [
    {at: 0, target: [AVP[0], AVP[1] + 10, AVP[2]], yaw: -36, pitch: 9, dist: 1720, roll: -5, focal: 55},
    {at: L(34) - L(33), ease: 'sine', yaw: -15, pitch: 5, dist: 1960, roll: -2},
  ];
  const shotB = (lt: number) => {
    const cam = addCam(camPath(lt, keysB), handheld(lt, 0.7, 7), kickPush(f, 34));
    const rc = resolveCam(cam);
    const pa = project(rc, AVP);
    const bulbP = project(rc, [AVP[0], AVP[1] - AV * (24.4 / 64), AVP[2] + 2]);
    const wk = L(33.5) - L(33);
    const wink = lt < wk ? 0 : lt < wk + 2 ? 0.5 : 1;
    const k = kick(f);
    return (
      <AbsoluteFill>
        <World camera={rc} aperture={11} focus={AVP} backdrop={<LogoSky t={t} from={from} rays={{x: pa.x, y: pa.y, I: 1.05 + 0.35 * k}} camX={-rc.pos[0] * 0.3} grid={0.18} />}>
          <Obj x={AVP[0]} y={AVP[1]} z={AVP[2]}>
            <Medallion wink={wink} glow={1 + 0.5 * k} sheen={clamp((lt - 4) / 22)} rimHot={0.4 * k} bulb={0.55 + 0.45 * k} />
          </Obj>
          {/* drifting leftover splinters near the lens (out of focus) */}
          {[0, 1, 2, 3].map((i) => (
            <Obj key={i} x={AVP[0] + [-520, 430, -260, 610][i] + lt * [1.2, -1, 0.8, -1.4][i]} y={AVP[1] + [-260, 210, 300, -330][i]} z={[620, 520, 380, 300][i]} rz={lt * 2 + i * 70} ry={lt * 3 + i * 40} w={70} h={90}>
              <div style={{width: 70, height: 90, clipPath: 'polygon(50% 0%, 100% 70%, 20% 100%)', background: 'linear-gradient(140deg, rgba(255,255,255,0.85), rgba(160,130,255,0.6) 50%, rgba(127,231,255,0.5))'}} />
            </Obj>
          ))}
        </World>
        <Bokeh frame={t} focus={0.95} count={26} boost={0.5 * k} camX={rc.pos[0] * 0.4} />
        <LensFlare x={bulbP.x} y={bulbP.y} intensity={0.55 + 0.35 * k} scale={0.55} ghosts={0.5} rays={10} ring={false} frame={t} />
        <Glint x={pa.x + 0.14 * AV * pa.scale} y={pa.y - 0.03 * AV * pa.scale} size={200} intensity={1.6 * impulse(lt, wk + 1, 1, 6)} color="white" frame={lt} />
      </AbsoluteFill>
    );
  };

  /* ---------- C · TITLE SLAM ---------- */
  const keysC: CamKey[] = [
    {at: 0, target: [0, 40, 0], yaw: -20, pitch: 12, dist: 1600, roll: -7, focal: 28},
    {at: L(35) - L(34), ease: 'quintOut', yaw: -7, pitch: 9, dist: 1330, roll: -2.5},
  ];
  const landC = L(34.5) - L(34);
  const shotC = (lt: number) => {
    const slam = impulse(lt, landC, 1, 5);
    const cam = addCam(camPath(lt, keysC), handheld(lt, 0.8, 9), kickPush(f, 26), {roll: 1.2 * slam, shiftY: 10 * slam});
    const rc = resolveCam(cam);
    const pa = project(rc, AVP);
    const pt = project(rc, TTL);
    const k = kick(f);
    return (
      <AbsoluteFill>
        <World camera={rc} backdrop={<LogoSky t={t} from={from} rays={{x: pa.x, y: pa.y, I: 0.85 + 0.35 * k}} camX={-rc.pos[0] * 0.3} />}>
          <Obj x={AVP[0]} y={AVP[1]} z={AVP[2]}>
            <Medallion wink={1} glow={0.9 + 0.5 * k} bulb={0.5 + 0.5 * k} rimHot={0.3 * k} />
          </Obj>
          <Obj x={TTL[0]} y={TTL[1]} z={TTL[2]}>
            <ChromeTitle pose={slamPose(lt, landC)} sheen={clamp((lt - landC) / 16)} glow={1 + 1.5 * slam} />
          </Obj>
        </World>
        <LightStreak start={landC - 4} dur={22} frame={lt} angle={0} count={6} spread={60} offset={pt.y - 540 + 70} length={1400} thickness={3} intensity={1.1} />
        <Flash at={landC} frame={lt} dur={9} color="violet" max={0.28} bloom x={pt.x} y={pt.y} />
        <DustField frame={t} count={90} boost={0.6 * k} camX={rc.pos[0] * 0.5} />
      </AbsoluteFill>
    );
  };

  /* ---------- D · LOCKUP + TAGLINE ---------- */
  const keysD: CamKey[] = [
    {at: 0, target: [0, 60, 0], yaw: 6, pitch: 2.5, dist: 2700, roll: 1.4, focal: 35},
    {at: L(36) - L(35), ease: 'sine', yaw: 2, pitch: 1, dist: 2520, roll: 0.3},
  ];
  const shotD = (lt: number) => {
    const cam = addCam(camPath(lt, keysD), drift(lt, 1.2, 4), kickZoom(f, 0.012));
    const rc = resolveCam(cam);
    const pa = project(rc, AVP);
    const k = kick(f);
    return (
      <AbsoluteFill>
        <World camera={rc} backdrop={<LogoSky t={t} from={from} rays={{x: pa.x, y: pa.y, I: 0.9 + 0.3 * k}} camX={-rc.pos[0] * 0.3} />}>
          <Obj x={AVP[0]} y={AVP[1]} z={AVP[2]}>
            <Medallion wink={1} glow={1 + 0.4 * k} bulb={0.5 + 0.5 * k} thick={0.6} sheen={clamp((lt - 6) / 26)} />
          </Obj>
          <Obj x={TTL[0]} y={TTL[1]} z={TTL[2]}>
            <ChromeTitle pose={landed} sheen={clamp((lt + 10) / 30)} />
          </Obj>
        </World>
        <LensFlare x={pa.x + 0.33 * AV * pa.scale} y={pa.y - 0.36 * AV * pa.scale} intensity={0.5 + 0.3 * k} scale={0.45} ghosts={0.6} rays={12} streak={0.9} frame={t} />
      </AbsoluteFill>
    );
  };

  /* ---------- E/F/G · the app materializes ---------- */
  const fly = {side: L(36), top: L(36.5), main: L(37), chat: L(37.5)};
  const lockAt = L(39);
  const explodeAt = (x: number) => {
    // exploded while layers arrive; collapse accelerates 38.5 → 39 into the lock
    const c = clamp((x - L(38.5)) / (lockAt - L(38.5)));
    return x < L(38.5) ? 1 + 0.06 * clamp((x - L(36)) / (L(38.5) - L(36))) : 1.06 * (1 - Math.pow(c, 2.2));
  };
  const appWorld = (lt0: number, cam: CamSpec, opts: {aperture?: number; focus?: V3; beams?: number; ghost?: number; sheen?: number; lite?: boolean} = {}) => {
    const rc = resolveCam(cam);
    const pc = project(rc, [0, 0, 0]);
    const k = kick(f);
    const x = lt0; // scene-local frame on the rig clock
    return {
      rc,
      node: (
        <World camera={rc} aperture={opts.aperture ?? 0} focus={opts.focus} maxBlur={14} backdrop={<AppSky tt={t} from={from} camX={-rc.pos[0] * 0.25} glowAt={{x: pc.x, y: pc.y}} glowI={0.8 + 0.6 * k} />}>
          <AppRig t={x} f={f} fly={fly} explode={explodeAt(x)} spacing={230} spread={80} lockAt={lockAt} beams={opts.beams ?? 0.6} ghost={opts.ghost ?? 1} sheen={opts.sheen} pulse={k} lite={opts.lite} />
        </World>
      ),
    };
  };

  const keysE: CamKey[] = [
    {at: 0, target: [0, 40, 250], yaw: -31, pitch: 9, dist: 2900, roll: -3.5, focal: 30, shiftY: -100},
    {at: L(37) - L(36), ease: 'sine', yaw: -22, pitch: 7, dist: 2600, roll: -2},
  ];
  const shotE = (lt: number) => {
    const cam = addCam(camPath(lt, keysE), handheld(lt, 0.6, 11), kickPush(f, 30));
    const w = appWorld(L(36) + lt, cam, {beams: 0.5});
    const landed = (L(36) + lt >= fly.side + 6 ? 1 : 0) + (L(36) + lt >= fly.top + 6 ? 1 : 0);
    return (
      <AbsoluteFill>
        {w.node}
        <DustField frame={t} count={70} boost={0.5 * kick(f)} />
        <AssemblyHud lt={lt} count={landed} />
      </AbsoluteFill>
    );
  };

  const keysF: CamKey[] = [
    {at: 0, target: [250, 20, 330], yaw: 33, pitch: 13, dist: 2050, roll: 6, focal: 24},
    {at: L(38) - L(37), ease: 'sine', yaw: 21, pitch: 10, dist: 1760, roll: 3},
  ];
  const shotF = (lt: number) => {
    const cam = addCam(camPath(lt, keysF), handheld(lt, 0.8, 13), kickPush(f, 30));
    const w = appWorld(L(37) + lt, cam, {beams: 0.6, aperture: 6, focus: [-16, 34, 1.6 * 230]});
    return <AbsoluteFill>{w.node}</AbsoluteFill>;
  };

  const durG = L(40) - L(38);
  const rampG = heroRamp(durG, 110, {fast: 3.2, slow: 0.24});
  const keysG: CamKey[] = [
    {at: 0, target: [0, 10, 240], yaw: -64, pitch: 17, dist: 2500, roll: -10, focal: 24},
    {at: 24, yaw: -42, pitch: 14, dist: 2100, roll: -6},
    {at: 72, target: [0, 0, 60], yaw: -16, pitch: 11, dist: 1800, roll: -2.5},
    {at: 110, ease: 'quadIn', target: [0, 0, 0], yaw: 12, pitch: 8, dist: 1700, roll: 0},
  ];
  // in-camera whip pan out of the scene: expo-in pan to the right over the last ~7 frames (velocity blur follows)
  const WHIP_PRE = 7.2;
  const whipU = (x: number) => clamp((x - (durG - WHIP_PRE)) / WHIP_PRE);
  const whipPan = (x: number) => 60 * Math.pow(2, 10 * whipU(x) - 10) * (whipU(x) > 0 ? 1 : 0);
  const camGAt = (x: number) => addCam(camPath(rampG.time(x), keysG), {pan: whipPan(x)});
  const shotG = (lt: number, info?: ShotInfo) => {
    const base = camGAt(lt);
    const cam = addCam(base, handheld(lt, 0.5, 17), kickPush(f, 26));
    const m = camMotion(camGAt, lt, [0, 0, 120]);
    const lockLt = lockAt - L(38);
    // last frames: the whip pan smears everything — swap in cheap stand-in content once the blur is heavy
    const wu = whipU(lt);
    const lite = wu > 0.6;
    void info;
    const w = appWorld(L(38) + lt, cam, {beams: lite ? 0 : 0.8, sheen: clamp((lt - lockLt + 1) / 26), lite});
    const pc = project(w.rc, [APP_TR[0], APP_TR[1], 2]);
    const lk = impulse(lt, lockLt, 1, 9);
    const corners = APP_CORNERS.map((c) => project(w.rc, c));
    const sweep = clamp((lt - lockLt - 1) / 24);
    return (
      <AbsoluteFill>
        <AbsoluteFill style={wu > 0.3 ? {filter: `brightness(${(1 + 0.5 * wu * wu).toFixed(3)}) saturate(${(1 + 0.2 * wu).toFixed(3)})`} : undefined}>
          <MotionBlur vx={m.dx} vy={m.dy} shutter={0.6}>{w.node}</MotionBlur>
        </AbsoluteFill>
        {wu > 0 && <LightStreak start={durG - 8} dur={14} frame={lt} angle={180} count={9} spread={900} length={1600} thickness={3} intensity={1.2} seed={23} />}
        {/* light sweep across the locked glass (clipped to the window's projected quad) */}
        {sweep > 0 && sweep < 1 && (
          <AbsoluteFill style={{clipPath: `polygon(${corners.map((c) => `${c.x.toFixed(1)}px ${c.y.toFixed(1)}px`).join(', ')})`, mixBlendMode: 'screen', background: `linear-gradient(112deg, transparent ${(lerp(-25, 125, sweep) - 18).toFixed(1)}%, rgba(170,220,255,0.22) ${(lerp(-25, 125, sweep) - 6).toFixed(1)}%, rgba(255,255,255,0.85) ${lerp(-25, 125, sweep).toFixed(1)}%, rgba(127,231,255,0.35) ${(lerp(-25, 125, sweep) + 2).toFixed(1)}%, transparent ${(lerp(-25, 125, sweep) + 10).toFixed(1)}%)`}} />
        )}
        {/* lock-in glints on the four corners */}
        {corners.map((c, i) => (
          <Glint key={i} x={c.x} y={c.y} size={150} intensity={1.5 * impulse(lt, lockLt + i * 2, 1, 5)} color={i % 2 ? 'white' : 'cyan'} frame={lt} />
        ))}
        <LensFlare x={pc.x} y={pc.y} intensity={1.3 * lk + 0.18 * kick(f)} scale={0.7} ghosts={0.8} frame={t} />
        <Flash at={lockLt} frame={lt} dur={12} color="violet" max={0.18} bloom x={pc.x} y={pc.y} />
      </AbsoluteFill>
    );
  };

  const shots = beatShots(from, dur, [
    {beat: 32, name: 'A ignition', in: flashCut({dur: 12, split: 0, peak: 1}), render: (lt) => shotA(lt)},
    {beat: 33, name: 'B macro', in: flashCut({dur: 8, split: 0.35, color: '#D8F6FF', peak: 0.75}), render: (lt) => shotB(lt)},
    {beat: 34, name: 'C title', in: whip({dir: 'down', dur: 10}), render: (lt) => shotC(lt)},
    {beat: 35, name: 'D lockup', in: flashCut({dur: 6, split: 0.3, color: '#E9E0FF', peak: 0.4}), render: (lt) => shotD(lt)},
    {beat: 36, name: 'E materialize', in: zoomThrough({dur: 14, depth: 2.0, blur: 0.85}), render: (lt) => shotE(lt)},
    {beat: 37, name: 'F track', in: whip({dir: 'right', dur: 10}), render: (lt) => shotF(lt)},
    {beat: 38, name: 'G hero', in: cut(), render: (lt, _p, info) => shotG(lt, info)},
  ]);

  return (
    <AbsoluteFill style={{background: '#04020A', overflow: 'hidden'}}>
      <Shots shots={shots} t={t} />
      {/* tagline super: 35 → held across the cut at 36, out before main lands */}
      <Tagline t={t} at={L(35) + 2} out={L(36.5) - 3} y={834} size={74} />
      {/* whip-out light at the scene boundary */}
      <Swoosh start={dur - 10} dur={20} angle={-6} frame={t} intensity={0.9} />
    </AbsoluteFill>
  );
};

/** Top-right corner of the app window (world) — flare glint at the lock. */
const APP_TR: V3 = [780, -480, 0];
const APP_CORNERS: V3[] = [[-786, -486, 4], [786, -486, 4], [786, 486, 4], [-786, 486, 4]];
// keep tree-shaking quiet for helpers referenced only in comments
void depthOf;
void lerp;
