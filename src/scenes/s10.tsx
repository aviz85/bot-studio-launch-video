/* =====================================================================================================
 * s10 · "Factory & finale" · beats 140–end (global 3761–4591, 830 f). Climax + end card.
 * Music: drop-2 groove (kicks 140,142,143,144,146,147,148,150 · gaps 141, 145 · near-silence 150.5–152),
 *        montage 152–160 (kicks 152,154,155,156,158), FINAL HIT 160 (kick detected 4298), reverb tail → 4440, silence.
 *
 * SHOT LIST (cuts on B(k) / half beats; local frame = B(k) − 3761)
 *  A · "A bot that builds bots."
 *   A1 140    –142    IGNITE    in: flashCut (cross-scene). Macro, low angle on the Build-with-AI sparkle; it ignites
 *                               (FlareBurst + god rays); "Welcome assistant" card flies out and lands 140.5; breath in the
 *                               141 gap (rack focus sparkle→card); 141.5 two more cards burst past the lens.
 *   A2 142    –144    GRID      in: whip right. Medium, front-left: the 3×3 of named frost BotCards slams together on
 *                               half beats; title "A bot that" (142) / "builds bots." (143) in the left negative space.
 *   A3 144    –146    MULTIPLY  in: flash cut. Speed-ramped pull-back (snap–float through the 145 gap–accelerate) with
 *                               speed streaks on the fast phases: the wall ripples outward, holo cards flipping in by the
 *                               dozen; HUD counter ticks up. Title exits on 145.5.
 *   A4 146    –148    SWEEP     in: whip up. Low-angle Dutch tracking shot along the towering wall; light sweep races
 *                               along it on the 146 crash; far cards keep landing into the fog.
 *   A5 148    –150.5  INFINITE  in: zoom-through. Macro on one card → speed-ramped crane/pull-back to the infinite wall
 *                               receding into fog both ways; second light sweep (R→L) on the 150 crash.
 *   A6 150.5  –152    INHALE    in: hard cut (music drops out). Frontal: every card vortexes back into the sparkle,
 *                               a glint charges in the dark; suck-in.
 *  B · montage of the real designs as glass panes (one cut per beat) + statement words every 2 beats; each pane gets a HUD
 *      reticle locking onto its key UI element; a composition guard shifts panes so they never overlap the word
 *   M1 152 policies (low-angle hero)  · flash      "Describe." (L)
 *   M2 153 judgment editor (macro, DOF, dutch) · whip →
 *   M3 154 states (top-down god shot) · flash      "Build." (R)
 *   M4 155 functions (dutch lateral)  · whip ↑
 *   M5 156 live dashboard (exploded push-in) · zoom-through   "See." (L)
 *   M6 157 evaluation (worm's-eye)    · whip ←
 *   M7 158 versions (version deck slides out) · cyan flash    "Ship." (R)
 *   M8 159 botscript (grazing macro, DOF) · glitch
 *   M9 159.5 all bots · strobe flash      M10 159.75 Build with AI · strobe flash (accelerating into the hit)
 *  C · FINAL HIT 4298 (beat 160): white-out flash cut + FlareBurst + Shockwave×2 + EnergyBurst + GodRays + CA punch.
 *   END 160–end: the s03 glass avatar medallion (eyes open → winks once into the brand "<" at 164.25 and holds), "Bot Studio"
 *               (s03 chrome, tracking-in, sheen), tagline (161.5), glass pills (162.5 →), slow push + drift + drifting
 *               dust/bokeh/god rays; fade to black from ~4451, pure black ≥ ~4551.
 * ===================================================================================================== */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import type {SceneProps} from '../cine/types';
import {
  Shots, Shot, CamKey, camPath, addCam, handheld, drift, kickPush, kickZoom, resolveCam, depthOf, project,
  whip, flashCut, zoomThrough, glitchCut, cut, heroRamp,
} from '../cine';
import {FlareBurst, SpeedLines, LightStreak} from '../vfx';
import {MONO} from '../lib';
import {FactoryFrame, SPARK, SLOTS} from './s10/factory';
import {MONTAGE, MontageShot, MontageWords} from './s10/montage';
import {EndCard} from './s10/endcard';
import {lb, HIT, MaskLine, HudLabel, clamp01, mix, smoothstep, pe, eo, decay} from './s10/common';

/* ------------------------------------------------------------------ */
/* Act A camera rigs (shot-local frames)                                */
/* ------------------------------------------------------------------ */
const A1_KEYS: CamKey[] = [
  {at: 0, target: [40, 0, 640], yaw: 30, pitch: 9, dist: 600, roll: -9, focal: 35},
  {at: 14, ease: 'expoOut', yaw: 19, pitch: 7, dist: 900, roll: -6},
  {at: 41, yaw: 15, pitch: 6, dist: 980, roll: -5},
  {at: 54, ease: 'expoIn', yaw: 7, pitch: 4, dist: 1300, roll: -2},
];
const A2_KEYS: CamKey[] = [
  {at: 0, target: [-760, 20, 0], yaw: 22, pitch: 4, dist: 2850, roll: -3, focal: 35},
  {at: 54, target: [-760, 20, 0], yaw: 17, pitch: 3, dist: 2480, roll: -2},
];
const A3_ANIM = 60;
const A3_RAMP = heroRamp(lb(146) - lb(144), A3_ANIM, {fast: 2.8, slow: 0.42, inFrac: 0.14, outFrac: 0.2});
const A3_KEYS: CamKey[] = [
  {at: 0, target: [-760, 20, 0], yaw: 17, pitch: 3, dist: 2450, roll: -2, focal: 35},
  {at: A3_ANIM, ease: 'linear', target: [-760, -30, 0], yaw: 31, pitch: 6, dist: 7200, roll: -6},
];
const A4_KEYS: CamKey[] = [
  {at: 0, pos: [-2700, 1270, 1450], lookAt: [2400, -260, -150], focal: 22, roll: -10},
  {at: 54, pos: [-1000, 1180, 1300], lookAt: [4200, -420, -150], roll: -6},
];
const A5_ANIM = 76;
const A5_RAMP = heroRamp(lb(150.5) - lb(148), A5_ANIM, {fast: 3.2, slow: 0.3, inFrac: 0.12, outFrac: 0.22});
const A5_KEYS: CamKey[] = [
  {at: 0, target: [500, 0, 0], yaw: -4, pitch: 0, dist: 760, roll: 2, focal: 35},
  {at: 18, target: [300, -60, 0], yaw: -12, pitch: -4, dist: 2700, roll: 3},
  {at: 58, target: [-1300, -180, 0], yaw: -32, pitch: -12, dist: 6200, roll: 6},
  {at: A5_ANIM, ease: 'expoIn', target: [-1900, -220, 0], yaw: -38, pitch: -14, dist: 7400, roll: 8},
];
const A6_KEYS: CamKey[] = [
  {at: 0, target: [0, 0, 300], yaw: 0, pitch: 0, dist: 5600, roll: 0, focal: 35},
  {at: lb(152) - lb(150.5), ease: 'expoIn', dist: 2300, roll: 5},
];

/** HUD: number of bots on the wall (ticks as cards land). */
const BotCounter: React.FC<{t: number}> = ({t}) => {
  const a = lb(143.5), m = lb(146), b = lb(148);
  if (t < a || t >= b) return null;
  let n = 0;
  for (const s of SLOTS) if (s.land <= t) n++;
  // left under the title during A2–A3, bottom-right (open sky) during A4
  const right = t >= m;
  const o = right ? smoothstep(m + 4, m + 12, t) * (1 - smoothstep(b - 6, b, t)) : smoothstep(a, a + 8, t) * (1 - smoothstep(m - 6, m - 1, t));
  return (
    <div style={{position: 'absolute', left: right ? undefined : 130, right: right ? 130 : undefined, top: 872, opacity: o, display: 'flex', alignItems: 'center', gap: 16, padding: '10px 18px', borderRadius: 14,
      background: 'linear-gradient(160deg, rgba(30,16,60,0.62), rgba(10,5,24,0.55))', boxShadow: 'inset 0 0 0 1px rgba(127,231,255,0.35)'}}>
      <div style={{width: 10, height: 10, borderRadius: 5, background: '#7FE7FF', boxShadow: '0 0 12px #7FE7FF', opacity: 0.4 + 0.6 * Math.abs(Math.sin(t / 5))}} />
      <HudLabel size={14} color="#CDBBFF">Bots built</HudLabel>
      <div style={{fontFamily: MONO, fontSize: 24, color: '#E7F4B9', letterSpacing: '0.06em'}}>{String(n).padStart(4, '0')}</div>
    </div>
  );
};

/** "A bot that builds bots." — left negative space during A2–A3. */
const Title: React.FC<{t: number}> = ({t}) => {
  const a = lb(142), b = lb(143);
  const out = clamp01((t - lb(145.5)) / 12);
  if (t < a - 1 || out >= 1) return null;
  const p1 = pe(t, a, 14), p2 = pe(t, b, 14);
  return (
    <div style={{position: 'absolute', left: 130, top: 352}}>
      <MaskLine text="A bot that" p={p1} out={out} size={128} />
      <div style={{height: 10}} />
      <MaskLine text="builds bots." p={p2} out={out} size={128} />
      <div style={{marginTop: 30, width: 420 * eo(clamp01((t - b - 6) / 20)), height: 2, opacity: 1 - out, background: 'linear-gradient(90deg, rgba(127,231,255,0.9), rgba(140,107,234,0.5), transparent)'}} />
    </div>
  );
};

export const Scene: React.FC<SceneProps> = ({from, dur}) => {
  const t = useCurrentFrame();
  const f = t + from;

  const shots: Shot[] = [
    {
      name: 'A1 ignite', from: 0, to: lb(142), in: flashCut({dur: 14, split: 0, peak: 0.7}),
      render: (lt) => {
        const at = (x: number) => camPath(x, A1_KEYS);
        const cam = addCam(at(lt), handheld(lt, 0.7, 2), kickPush(f, 18));
        const rc = resolveCam(cam);
        const rack = pe(lt, 17, 20, (u) => u * u * (3 - 2 * u));
        const focus = mix(depthOf(rc, SPARK), depthOf(rc, [0, 0, 0]), rack);
        const sp = project(rc, SPARK);
        return (
          <>
            <FactoryFrame t={t} f={f} from={from} cam={cam} aperture={13} focus={focus} opts={{look: 'holo', fog: [2600, 6000], sparkle: 210}} glint={0.35 + 0.5 * decay(lt, 0, 12)} rays={0.3 + 0.9 * decay(lt, 0, 26)} label />
            <FlareBurst x={sp.x} y={sp.y} at={0} dur={60} peak={1.7} flash={0.22} frame={t} />
          </>
        );
      },
    },
    {
      name: 'A2 grid', from: lb(142), to: lb(144), in: whip({dir: 'right', dur: 10}),
      render: (lt, _p, info) => {
        const cam = addCam(camPath(lt, A2_KEYS), handheld(lt, 0.6, 3), kickPush(f, 30));
        return <FactoryFrame t={t} f={f} from={from} cam={cam} opts={{look: 'holo', fog: [3600, 8000], sparkle: 170, lite: !!info.tin && info.tin.d < 2}} glint={0.25} rays={0.25} />;
      },
    },
    {
      name: 'A3 multiply', from: lb(144), to: lb(146), in: flashCut({dur: 8, peak: 0.55}),
      render: (lt, _p, info) => {
        const at = (x: number) => camPath(A3_RAMP.time(x), A3_KEYS);
        const cam = addCam(at(lt), handheld(lt, 0.6, 4), kickZoom(f, 0.02));
        const st = clamp01((A3_RAMP.speed(lt) - 1) / 2.2) * 0.6;
        return <FactoryFrame t={t} f={f} from={from} cam={cam} opts={{look: 'holo', fog: [4500, 12000], sparkle: 170, lite: !!info.tout}} streak={[st, -A3_RAMP.time(lt) * 0.05]} glint={0.25} rays={0.2} />;
      },
    },
    {
      name: 'A4 sweep', from: lb(146), to: lb(148), in: whip({dir: 'up', dur: 10}),
      render: (lt, _p, info) => {
        const at = (x: number) => camPath(x, A4_KEYS);
        const cam = addCam(at(lt), handheld(lt, 0.9, 5), kickPush(f, 26));
        return (
          <>
            <FactoryFrame t={t} f={f} from={from} cam={cam} opts={{look: 'holo', fog: [4200, 11000], sweeps: [[lb(146) - 16, 300]], sparkle: 170, lite: !!info.tin && info.tin.d < 2}} rays={0} />
            <LightStreak start={lb(146) - 4} dur={26} angle={-14} count={6} spread={300} offset={-120} length={1300} color="cyan" secondary="violet" intensity={0.9} frame={t} seed={11} />
          </>
        );
      },
    },
    {
      name: 'A5 infinite', from: lb(148), to: lb(150.5), in: zoomThrough({dur: 14, depth: 2.6}),
      render: (lt) => {
        const at = (x: number) => camPath(A5_RAMP.time(x), A5_KEYS);
        const cam = addCam(at(lt), handheld(lt, 0.5, 6), kickZoom(f, 0.015));
        const st = clamp01((A5_RAMP.speed(lt) - 1) / 2.4) * 0.7;
        return <FactoryFrame t={t} f={f} from={from} cam={cam} opts={{look: 'holo', fog: [6500, 14500], sweeps: [[lb(150) - 20, -420]], sparkle: 200}} streak={[st, -A5_RAMP.time(lt) * 0.05]} glint={0.3} rays={0.25} />;
      },
    },
    {
      name: 'A6 inhale', from: lb(150.5), to: lb(152), in: cut(),
      render: (lt) => {
        const cam = addCam(camPath(lt, A6_KEYS), drift(lt, 1));
        const charge = smoothstep(4, 38, lt);
        const sp = project(resolveCam(cam), SPARK);
        return (
          <>
            <FactoryFrame t={t} f={f} from={from} cam={cam} opts={{look: 'holo', fog: [7000, 14000], inhale: lb(150.5), sparkle: 200 + 120 * charge}} glint={0.4 + 1.3 * charge} rays={0.15 + 0.6 * charge} floor={false} dim={0.55 + 0.45 * charge} />
            <SpeedLines x={sp.x} y={sp.y} intensity={0.55 * charge} travel={-(lt * 0.02 + eo(clamp01(lt / 40)) * 3)} frame={t} count={220} />
          </>
        );
      },
    },
  ];

  // B · montage
  const MT = [
    flashCut({dur: 12, split: 0.15, peak: 1}),
    whip({dir: 'right', dur: 10, seed: 3}),
    flashCut({dur: 8, peak: 0.85}),
    whip({dir: 'up', dur: 9, seed: 4}),
    zoomThrough({dur: 12, depth: 2.2}),
    whip({dir: 'left', dur: 9, seed: 5}),
    flashCut({dur: 8, peak: 0.9, color: '#BFF4FF'}),
    glitchCut({dur: 7, slices: false, seed: 7}),
    flashCut({dur: 5, peak: 0.7}),
    flashCut({dur: 4, peak: 0.6, color: '#BFF4FF'}),
  ];
  MONTAGE.forEach((m, i) => {
    const s = lb(m.beat);
    const e = i < MONTAGE.length - 1 ? lb(MONTAGE[i + 1].beat) : HIT;
    shots.push({name: `M${i + 1} ${m.design}`, from: s, to: e, in: MT[i], render: (lt, _p, info) => <MontageShot m={m} lt={lt} t={t} f={f} from={from} idx={i} mbOff={!!(info.tin || info.tout)} />});
  });

  // C · final hit + end card
  shots.push({name: 'END', from: HIT, to: dur, in: flashCut({dur: 10, split: 0.4, peak: 1}), render: () => <EndCard t={t} f={f} from={from} dur={dur} />});

  return (
    <AbsoluteFill style={{background: '#04020A'}}>
      <Shots shots={shots} t={t} />
      <Title t={t} />
      <BotCounter t={t} />
      <MontageWords t={t} f={f} />
    </AbsoluteFill>
  );
};
