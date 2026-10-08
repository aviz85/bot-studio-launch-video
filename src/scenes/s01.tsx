/* =====================================================================================================
 * s01 · "Black box" · beats 0–16 · global frames 0–430 · atmospheric intro, NO kick (cuts breathe, then accelerate)
 *
 * SHOT LIST (cut = B(k); every cut on a beat or half beat)
 *  #  beat        frames    shot / camera                                                    in-transition          copy
 *  1  0  → 4      0–107     ADRIFT — lone flat-grey chat widget in a projector beam, deep     fade up from black +   "You know / chatbots." (b2 → b6)
 *                           space; slow 35mm push-in + drift; the dark monolith is only a      projector flicker
 *                           silhouette behind it. Beam lamp flare top-right, lit dust.
 *  2  4  → 8      107–215   COLOSSUS — low angle, 20mm: the widget is dwarfed by a colossal    hard cut (scale       (title carries over)
 *                           monolith of prompt text that IGNITES bottom→top; crane up along     reveal) + power-up
 *                           the face chasing the light front, speed-ramped (hold → accelerate)  ping
 *                           with vertical motion blur; a light peeks over the top (flare).
 *  3  8  → 9      215–242   ONE — top-down god shot down the face into the abyss (18mm,        whip up               "One"
 *                           rolling vertigo); the tiny lit widget far below.
 *  4  9  → 10     242–269   GIANT — dutch 12°, worm's-eye up the monolith's corner edge,        soft flash cut        "giant"
 *                           both faces converging to a flare at the top.
 *  5  10 → 12     269–322   PROMPT — macro on the prompt text: natively large lines, shallow     zoom-through          "prompt."
 *                           DOF, lateral track; contradicting rules light amber (b10.5), rack
 *                           focus (b11) to "Do not discuss pricing…" (the reason for what's next).
 *  6  12 → 13     322–349   ANSWER — dutch close-up on the widget: the bot replies "Sorry, I     glitch cut            —
 *                           can't discuss pricing." Corruption starts (RGB tears, slices).
 *  7  13 → 14     349–376   WHY — frontal low wide: the monolith corrupts, widget tiny below    glitch cut            "Why did it / say that?" glitch-typed
 *  8  14 → 14.5   376–390   stutter: macro of corrupted rules                                   cut + glitch spike    (holds)
 *  9  14.5 → 15   390–403   stutter: top-down, corrupted                                        cut + glitch spike
 * 10  15 → 15.5   403–416   stutter: corner look-up, corrupted (time stutters/jumps back)        cut + glitch spike
 * 11  15.5 → 16   416–430   COLLAPSE — CRT-off squeeze to a hot line → dot → near-black (s02     cut                   —
 *                           opens from darkness)
 * Life: handheld/drift on every shot, kickPush(f) (no kicks in the intro — breathing glow via band/rms instead).
 * ===================================================================================================== */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import type {SceneProps} from '../cine/types';
import {
  World, Obj, CamKey, CamSpec, addCam, handheld, drift, kickPush, camPath, camMotion, resolveCam, project, MotionBlur,
  Shots, beatShots, whip, flashCut, cut, type ResolvedCam, type V3,
} from '../cine';
import {SpaceBackdrop, DustField, GodRays, LensFlare, HUDFrame, Glitch, Bokeh, Swoosh, Scanlines, Flash, VolumetricBeams} from '../vfx';
import {B, band, clamp, rms} from '../lib';
import {MONO_BOTTOM, MONO_G, MacroLines, Monolith, WIDGET_H, WIDGET_W, Widget, easeInCubic, easeOutCubic, easeOutExpo, h01, lerp, smooth01} from './s01/set';
import {GRAD_SOFT, GlitchType, RevealLine} from './s01/type';

const SPACE = '#04020A';
/** spotlight lamp high above the widget (world) */
const LAMP: V3 = [40, -820, 260];
/** a distant cold light beside the monolith: as the camera pushes in, the monolith's left edge eclipses it */
const FAR_LIGHT: V3 = [-1650, -1500, -9000];
const WIDGET_POS: V3 = [0, 0, 0];

/* ------------------------------------------------------------------ */
/* Timing helpers                                                       */
/* ------------------------------------------------------------------ */
const useTimeline = (from: number) => {
  const L = (k: number) => B(k) - from;
  return {L};
};

/** Exposure at the very start: black → projector flicker → full (scene-local frames). */
const exposure = (t: number) => {
  if (t < 7) return 0;
  const flick = [0.42, 0.5, 0.06, 0.02, 0.62, 0.7, 0.25, 0.75]; // frames 7..14
  if (t < 15) return flick[t - 7];
  return lerp(0.75, 1, smooth01((t - 15) / 18));
};
/** Projector beam intensity (follows the exposure flicker, then breathes with the music). */
const beamAt = (t: number, f: number) => (t < 15 ? exposure(t) : 0.92 + 0.08 * Math.min(1, rms(f) * 2.5));

/** Corruption level 12→16 (scene-local). */
const corruption = (t: number, L: (k: number) => number) => {
  if (t < L(12) - 1) return 0;
  const sp = (at: number, a: number, tau = 5) => (t >= at ? a * Math.exp(-(t - at) / tau) : 0);
  let c = 0.1 + sp(L(12), 0.55, 5);
  if (t >= L(13)) c = 0.2 + sp(L(13), 0.5, 6);
  if (t >= L(14)) c = 0.32 + 0.4 * clamp((t - L(14)) / (L(15.5) - L(14))) + sp(L(14), 0.4, 4) + sp(L(14.5), 0.4, 4) + sp(L(15), 0.45, 4);
  return clamp(c);
};

/** Picture stutter 14.5 → 15.5: frames hold for 3 and sometimes jump back (the old bot "hangs"). */
const stutterTime = (t: number, L: (k: number) => number) => {
  const a = L(14.5) + 3, b = L(15.5);
  if (t < a || t >= b) return t;
  const u = t - a;
  const st = Math.floor(u / 3);
  const back = h01(st, 77) < 0.4 ? Math.round(5 + h01(st, 78) * 9) : 0;
  return a + st * 3 - back;
};

/* ------------------------------------------------------------------ */
/* Shared shot pieces                                                   */
/* ------------------------------------------------------------------ */
const Space: React.FC<{cam: ResolvedCam; t: number; from: number; intensity?: number}> = ({cam, t, from, intensity = 0.7}) => (
  // parallax clamped: the nebula texture only has ~±115 px of margin at 0.15× parallax
  <SpaceBackdrop from={from} frame={t} intensity={intensity} haze={0} stars={220} camX={clamp(-cam.yaw * 24, -420, 420)} camY={clamp(cam.pitch * 24, -420, 420)} audio={0.8} />
);

const WidgetObj: React.FC<{t: number; light?: number; k?: number; ry?: number; corrupt?: number}> = ({t, light = 1, k = 1, ry = -12, corrupt = 0}) => (
  <Obj x={WIDGET_POS[0]} y={WIDGET_POS[1]} z={WIDGET_POS[2]} ry={ry} w={WIDGET_W * k} h={WIDGET_H * k} s={1 / k}>
    <Widget t={t} k={k} light={light} corrupt={corrupt} />
  </Obj>
);

/** Screen-space beam from the lamp onto the widget + lamp flare. */
const Beam: React.FC<{cam: ResolvedCam; t: number; I: number}> = ({cam, t, I}) => {
  const src = project(cam, LAMP);
  const dst = project(cam, [0, 120, 0]);
  if (!src.visible || !dst.visible || I < 0.01) return null;
  const dir = (Math.atan2(dst.y - src.y, dst.x - src.x) * 180) / Math.PI;
  const dist = Math.hypot(dst.x - src.x, dst.y - src.y);
  const half = (Math.atan2(WIDGET_W * 0.75 * dst.scale, dist) * 180) / Math.PI;
  return (
    <>
      <VolumetricBeams beams={[{x: src.x, y: src.y, angle: dir, width: half, length: dist * 1.5, color: '#D9CEFF', intensity: 1.15 * I}]} frame={t} />
      <GodRays x={src.x} y={src.y} direction={dir} spread={half * 2.2} lobes={7} length={dist * 1.4} intensity={0.5 * I} contrast={3} dust={1.8} core={0} speed={0.03} color="#D9CEFF" secondary="#BFF4FF" frame={t} />
    </>
  );
};

/** Flare from a distant light that the monolith's left edge slowly eclipses (the black box swallows the light). */
const EdgeFlare: React.FC<{cam: ResolvedCam; t: number; gain?: number}> = ({cam, t, gain = 1}) => {
  const p = project(cam, FAR_LIGHT);
  if (!p.visible) return null;
  const e = project(cam, [-MONO_G.half, FAR_LIGHT[1], MONO_G.zFront]); // the edge at that height
  const peek = smooth01((e.x - p.x + 12) / 60);
  if (peek < 0.01) return null;
  return <LensFlare x={p.x} y={p.y} intensity={gain * 0.8 * peek} scale={0.7} streak={1.2} ghosts={0.45} rays={12} veil={0.3} frame={t} seed={6} />;
};

/* ------------------------------------------------------------------ */
/* Cameras                                                              */
/* ------------------------------------------------------------------ */
// 1 · ADRIFT: slow push-in (widget framed right, room for copy left)
const S1: CamKey[] = [
  {at: 0, pos: [-600, -150, 2350], lookAt: [-400, -40, 0], roll: -2.2, focal: 35},
  {at: 108, ease: 'sine', pos: [-380, -90, 1720], lookAt: [-345, -22, 0], roll: -0.4},
];

// 2 · COLOSSUS
const cam2 = (lt: number): CamSpec => {
  // worm's-eye under the widget, then a crane that chases the ignition front up the face
  const u = clamp(lt / 108);
  const e = 0.12 * smooth01(u / 0.35) + 0.88 * easeInCubic(Math.max(0, (u - 0.2) / 0.8));
  const py = lerp(980, -5900, e);
  return {
    pos: [lerp(-300, 760, e), py, lerp(820, 300, e)],
    lookAt: [lerp(120, 260, e), py - lerp(2500, 1250, e), MONO_G.zFront - lerp(0, 300, e)],
    focal: 14, roll: lerp(-7, 6, e),
  };
};
const wave2 = (lt: number) => {
  // the front leads the camera: fast through the lower face, then tracks just above frame centre
  const c = cam2(lt);
  const lead = (c.lookAt as V3)[1] - 700;
  const intro = lerp(MONO_BOTTOM + 40, -1500, easeOutCubic(clamp(lt / 30)));
  return Math.min(intro, lt > 18 ? lead : 1e9);
};

// 3 · ONE: top-down vertigo, rolling
const cam3 = (lt: number): CamSpec => ({
  pos: [200, MONO_G.top - 1500 + 1100 * easeOutExpo((lt + 3) / 26), MONO_G.zFront + 560], yaw: 0, pitch: -86, roll: lerp(22, 36, easeOutCubic(lt / 30)), focal: 18,
  tilt: 10 * (1 - easeOutExpo(lt / 12)),
});

// 4 · GIANT: worm's-eye up the corner edge, dutch
const cam4 = (lt: number, crashAt = 1e9): CamSpec => {
  const u = clamp((lt - crashAt) / 9); // in-camera crash zoom into the text right before the cut to the macro
  return {pos: [MONO_G.half + 520, 860 - lt * 4, MONO_G.zFront + 600], lookAt: [lerp(MONO_G.half - 60, MONO_G.half - 420, easeInCubic(u)), lerp(-5600, -2600, easeInCubic(u)), MONO_G.zFront - 60],
    roll: 13 + lt * 0.06 + 10 * easeInCubic(u), focal: lerp(18, 95, easeInCubic(u))};
};

// 5 · PROMPT: macro track along the rules (lines natively 50px; per-line DOF by index distance)
const cam5 = (lt: number): CamSpec => ({pos: [lerp(-760, -650, lt / 56), 330, 560], lookAt: [lerp(250, 330, lt / 56), -60, 0], focal: 28, roll: -4 + 7 * (1 - easeOutExpo(lt / 14)), dolly: -420 * (1 - easeOutExpo(lt / 14))});

// 6 · ANSWER: dutch close-up on the widget (rendered natively ×2)
const cam6 = (lt: number): CamSpec => ({pos: [lerp(250, 215, lt / 27), lerp(-20, -40, lt / 27), lerp(980, 900, lt / 27)], lookAt: [-10, -95, 0], focal: 35, roll: -7});

// 7 · WHY: frontal low wide on the corrupting monolith
const cam7 = (lt: number): CamSpec => ({pos: [lerp(60, 0, lt / 60), 560, lerp(3050, 2850, lt / 60)], lookAt: [0, -1700, MONO_G.zFront], focal: 22, roll: 1.5});

/* ------------------------------------------------------------------ */
/* Scene                                                                */
/* ------------------------------------------------------------------ */
export const Scene: React.FC<SceneProps> = ({from, dur}) => {
  const t0 = useCurrentFrame();
  const {L} = useTimeline(from);
  const t = stutterTime(t0, L);
  const f = t + from;
  const cor = corruption(t, L);

  /* ---------- shot renders ---------- */
  const shot1 = (lt: number) => {
    const cam = resolveCam(addCam(camPath(lt, S1), handheld(lt, 0.35, 3), drift(lt, 0.6), kickPush(f, 20)));
    const I = beamAt(t, f);
    return (
      <AbsoluteFill>
        <Space cam={cam} t={t} from={from} intensity={0.62} />
        <World camera={cam}>
          <Monolith cam={cam} look={{wave: 1e9, t, glow: 1}} faces={[0]} cap={false} />
          <WidgetObj t={t} light={I} />
        </World>
        <EdgeFlare cam={cam} t={t} gain={exposure(t0)} />
        <Beam cam={cam} t={t} I={I} />
        <DustField count={70} opacity={0.5} size={0.9} frame={t} camX={cam.pos[0] * 0.3} seed={11} />
      </AbsoluteFill>
    );
  };

  const shot2 = (lt: number, inWhip = false) => {
    const at = (x: number) => addCam(cam2(x), handheld(x, 0.5, 5));
    const cam = resolveCam(at(lt));
    const w = wave2(lt);
    const m = camMotion(at, lt, cam2(lt).lookAt as V3);
    const top = project(cam, [60, MONO_G.top - 140, MONO_G.zFront - 900]);
    const flareI = top.visible ? clamp((lt - 50) / 50) * clamp(1 - Math.abs(top.y - 300) / 900) : 0;
    const I = beamAt(t, f);
    const world = (
      <AbsoluteFill>
        <Space cam={cam} t={t} from={from} intensity={0.75} />
        <World camera={cam}>
          <Monolith cam={cam} look={{wave: w, t, glow: 0.95 + 0.25 * band(f, 2)}} faces={[0, 1, 2]} />
          <WidgetObj t={t} light={I} />
        </World>
        <Beam cam={cam} t={t} I={I * clamp(1 - lt / 50)} />
      </AbsoluteFill>
    );
    return (
      <AbsoluteFill>
        {inWhip ? world : <MotionBlur vx={m.dx} vy={m.dy} shutter={0.6}>{world}</MotionBlur>}
        {flareI > 0.01 && <LensFlare x={top.x} y={top.y} intensity={0.9 * flareI} scale={0.8} streak={1.1} ghosts={0.8} frame={t} seed={7} />}
        <DustField count={60} opacity={0.4} frame={t} camY={-cam.pos[1] * 0.4} seed={12} />
      </AbsoluteFill>
    );
  };

  const shot3 = (lt: number, corrupt = 0, rollOff = 0) => {
    const cam = resolveCam(addCam({...cam3(lt), roll: (cam3(lt).roll ?? 0) + rollOff}, drift(lt, 1.2), handheld(lt, 0.4 + 2 * corrupt, 7)));
    const wp = project(cam, WIDGET_POS);
    const vp = project(cam, [0, 60000, MONO_G.zFront]); // vanishing point of the face's vertical edges (the abyss)
    return (
      <AbsoluteFill>
        <Space cam={cam} t={t} from={from} intensity={0.55} />
        <World camera={cam}>
          <Monolith cam={cam} look={{wave: -1e9, t, glow: 1.05, corrupt, scroll: 0.15}} faces={[0, 1, 2]} />
          <WidgetObj t={t} light={1} />
        </World>
        {vp.visible && <AbsoluteFill style={{background: `radial-gradient(circle at ${vp.x.toFixed(0)}px ${vp.y.toFixed(0)}px, rgba(160,130,250,0.42) 0%, rgba(120,90,220,0.22) 140px, rgba(100,70,200,0.08) 380px, transparent 700px)`}} />}
        {wp.visible && (
          <>
            <AbsoluteFill style={{background: `radial-gradient(circle at ${wp.x.toFixed(0)}px ${wp.y.toFixed(0)}px, rgba(230,222,255,0.45) 0%, rgba(140,107,234,0.18) 60px, transparent 220px)`}} />
            <LensFlare x={wp.x} y={wp.y} intensity={0.5} scale={0.4} streak={0.6} ghosts={0.25} ring={false} rays={8} frame={t} seed={9} />
          </>
        )}
      </AbsoluteFill>
    );
  };

  const shot4 = (lt: number, corrupt = 0, crashAt = 1e9) => {
    const cam = resolveCam(addCam(cam4(lt, crashAt), handheld(lt, 0.6 + 2 * corrupt, 9)));
    const top = project(cam, [MONO_G.half - 100, MONO_G.top - 220, MONO_G.zFront - 200]);
    return (
      <AbsoluteFill>
        <Space cam={cam} t={t} from={from} intensity={0.8} />
        <World camera={cam}>
          <Monolith cam={cam} look={{wave: -1e9, t, glow: 1.0, corrupt, scroll: 0.12}} faces={[0, 1]} cap={false} />
        </World>
        {top.visible && <LensFlare x={top.x} y={top.y} intensity={0.75} scale={0.7} streak={1} ghosts={0.7} frame={t} seed={3} />}
      </AbsoluteFill>
    );
  };

  const shot5 = (lt: number, corrupt = 0) => {
    const cam = resolveCam(addCam(cam5(lt), handheld(lt, 0.45 + 2 * corrupt, 11), drift(lt)));
    // per-line focus by index distance (rack: key line 9 → conflict line 5 at b11)
    const rack = smooth01((t - L(11)) / 16);
    const focusIdx = corrupt > 0 ? 7 : lerp(9.2, 5, rack);
    const hl = smooth01((t - (L(10.5))) / 12);
    const hl2 = smooth01((t - (L(11) + 12)) / 12);
    return (
      <AbsoluteFill>
        <AbsoluteFill style={{background: 'radial-gradient(90% 80% at 40% 45%, #120C20 0%, #07050D 60%, #030207 100%)'}} />
        <World camera={cam}>
          <MacroBlur focus={focusIdx} t={t} hl={hl} hl2={hl2} corrupt={corrupt} />
        </World>
        <Bokeh count={18} focus={0.05} opacity={0.5} size={1.3} frame={t} seed={21} />
      </AbsoluteFill>
    );
  };

  const shot6 = (lt: number) => {
    const cam = resolveCam(addCam(cam6(lt), handheld(lt, 0.8, 13)));
    return (
      <AbsoluteFill>
        <AbsoluteFill style={{background: 'radial-gradient(60% 90% at 70% 40%, #1A1030 0%, #0A0614 55%, #030207 100%)'}} />
        {/* the monolith, far behind and defocused: a soft dark slab with flickering lines (cheap fake bokeh) */}
        <AbsoluteFill style={{background: 'linear-gradient(90deg, transparent 52%, rgba(205,187,255,0.10) 56%, rgba(10,7,18,0.9) 60%, rgba(12,9,20,0.9) 92%, rgba(205,187,255,0.08) 95%, transparent 98%)', filter: 'blur(6px)'}} />
        <World camera={cam}>
          <WidgetObj t={t} k={2} light={1} corrupt={cor} ry={-8} />
        </World>
      </AbsoluteFill>
    );
  };

  const shot7 = (lt: number, corrupt = 0.4) => {
    const cam = resolveCam(addCam(cam7(lt), handheld(lt, 1.2 + corrupt, 15)));
    return (
      <AbsoluteFill>
        <Space cam={cam} t={t} from={from} intensity={0.7} />
        <World camera={cam}>
          <Monolith cam={cam} look={{wave: -1e9, t, glow: 1.1, corrupt, scroll: 0.3}} faces={[0, 1, 2]} />
          <WidgetObj t={t} light={1} corrupt={corrupt} />
        </World>
      </AbsoluteFill>
    );
  };

  /* ---------- the edit ---------- */
  const shots = beatShots(from, dur, [
    {beat: 0, name: 'adrift', render: (lt) => shot1(lt)},
    {beat: 4, name: 'colossus', in: cut(), render: (lt, _p, info) => shot2(lt, !!info.tout)}, // the whip's own blur replaces the shot blur
    {beat: 8, name: 'one·topdown', in: whip({dir: 'up', dur: 12, color: '#D9CEFF'}), render: (lt) => shot3(lt)},
    {beat: 9, name: 'giant·dutch', in: flashCut({dur: 8, peak: 0.5, color: '#CDBBFF', split: 0.4}), render: (lt) => shot4(lt, 0, L(10) - L(9) - 9)},
    {beat: 10, name: 'prompt·macro', in: flashCut({dur: 10, peak: 0.6, color: '#D9CEFF', split: 0.4, punch: 0.1}), render: (lt) => shot5(lt)},
    {beat: 12, name: 'answer', in: cut(), render: (lt) => shot6(lt)}, // glitch cut: single Glitch pass spikes on the cut + tear bands (cheaper than glitchCut)
    {beat: 13, name: 'why·wide', in: cut(), render: (lt) => shot7(lt, 0.45)},
    {beat: 14, name: 'stutter·macro', in: cut(), render: (lt) => shot5(lt + 40, 0.9)},
    {beat: 14.5, name: 'stutter·top', in: cut(), render: (lt) => shot3(lt + 10, 0.9, 40)},
    {beat: 15, name: 'stutter·corner', in: cut(), render: (lt) => shot4(lt + 8, 1)},
    {beat: 15.5, name: 'collapse', in: cut(), render: (lt) => shot7(lt + 30, 1)},
  ]);

  /* ---------- overlays ---------- */
  // Glitch (slice displacement) only in bursts: it is the expensive filter (~+1.3 s/still over a 3D world, as is a
  // full-frame ChromaticAberration). Between bursts: frame jitter, tear bands, corrupted lines, stutter.
  const cutsG = [L(12), L(13), L(14), L(14.5), L(15)];
  const burst = cutsG.some((c) => t >= c - 1 && t <= c + 2) || h01(Math.floor(t / 2), 91) < 0.18;
  const glitchAmt = t >= L(12) - 1 && burst ? Math.max(0.35, cor) : 0;
  const jit = t >= L(12) && h01(Math.floor(t / 2), 93) < cor * 0.45 ? (h01(t, 94) - 0.5) * 60 * cor : 0;
  const exp = exposure(t0);
  const sideScrim = Math.max(smooth01((t - (L(2) - 4)) / 12) * (1 - smooth01((t - L(4)) / 8)) * 0.6, smooth01((t - (L(8) - 6)) / 10) * (1 - smooth01((t - L(12)) / 4)));
  const centerScrim = smooth01((t - L(13)) / 8);

  // final collapse (CRT off), driven by the real frame t0
  const cs = L(15.5);
  const cu = t0 - cs;
  let collapse: React.CSSProperties | undefined;
  let line: React.ReactNode = null;
  if (cu >= 0) {
    const sy = cu < 5 ? lerp(1, 0.006, Math.pow(cu / 5, 2.2)) : 0.004;
    const sx = cu < 5 ? lerp(1, 1.04, cu / 5) : lerp(1.04, 0.0, easeInCubic((cu - 5) / 7));
    collapse = {transform: `scale(${Math.max(0.0001, sx).toFixed(4)}, ${sy.toFixed(4)})`, filter: `brightness(${(1 + cu * 0.5).toFixed(2)})`};
    const lo = cu < 3 ? cu / 3 : cu < 12 ? 1 : Math.max(0, 1 - (cu - 12) / 2);
    const lw = 1920 * (cu < 5 ? 1 : Math.max(0.004, 1 - easeInCubic((cu - 5) / 7)));
    line = lo > 0.01 ? (
      <AbsoluteFill style={{pointerEvents: 'none'}}>
        <div style={{position: 'absolute', left: 960 - lw / 2, top: 538, width: lw, height: 4, background: 'linear-gradient(90deg, transparent, #BFF4FF 15%, #FFFFFF 50%, #BFF4FF 85%, transparent)', opacity: lo, boxShadow: '0 0 24px rgba(191,244,255,0.8), 0 0 60px rgba(140,107,234,0.6)'}} />
        <div style={{position: 'absolute', left: 960 - 60, top: 540 - 60, width: 120, height: 120, borderRadius: 60, background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(191,244,255,0.4) 25%, transparent 70%)', opacity: lo * clamp((cu - 4) / 4)}} />
      </AbsoluteFill>
    ) : null;
  }

  const content = (
    <AbsoluteFill>
      <Glitch amount={glitchAmt} displace={50 + 90 * cor} rgb={6 + 10 * cor} density={1.2} hold={2} seed={7} frame={t}>
        <AbsoluteFill style={jit ? {transform: `translateX(${jit.toFixed(1)}px)`} : undefined}>
          <Shots shots={shots} t={t} />
        </AbsoluteFill>
      </Glitch>
      {t >= L(12) && <Scanlines opacity={0.08 + 0.12 * cor} spacing={3} roll={3} frame={t} />}
      <TearBands t={t} cuts={[L(12), L(13), L(14), L(14.5), L(15)]} />
      {/* copy scrims */}
      {sideScrim > 0.01 && <AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(4,2,10,0.8) 0%, rgba(4,2,10,0.5) 30%, rgba(4,2,10,0) 56%)', opacity: sideScrim}} />}
      {centerScrim > 0.01 && t < L(15.5) + 2 && <AbsoluteFill style={{background: 'radial-gradient(50% 32% at 50% 47%, rgba(4,2,10,0.72) 0%, rgba(4,2,10,0.35) 60%, rgba(4,2,10,0) 100%)', opacity: centerScrim}} />}
      {/* copy */}
      <RevealLine text="You know" t={t} at={L(2)} out={L(4) - 12} outDur={11} x={150} y={548} size={92} weight={800} grad={GRAD_SOFT} />
      <RevealLine text="chatbots." t={t} at={L(2) + 6} out={L(4) - 10} outDur={10} x={144} y={640} size={172} />
      <RevealLine text="One" t={t} at={L(8)} out={L(12) - 13} outDur={9} x={140} y={226} size={180} />
      <RevealLine text="giant" t={t} at={L(9)} out={L(12) - 12} outDur={9} x={140} y={396} size={180} />
      <RevealLine text="prompt." t={t} at={L(10)} out={L(12) - 11} outDur={9} x={140} y={566} size={180} />
      <GlitchType lines={['Why did it', 'say that?']} at={L(13)} t={t} y={352} size={150} g={cor} seed={3} />
      {/* faint HUD: a recording of the old way */}
      <HUDFrame start={10} from={from} frame={t} opacity={0.3 * (t < L(12) ? 1 : 0.6 + 0.4 * (h01(Math.floor(t / 2), 4) > 0.5 ? 1 : 0))} title="Chat widget // session 0001" subtitle="Model · black box" footer="System prompt · 4,118 rules" />
      <Flash at={L(8)} dur={10} color="#CDBBFF" max={0.18} frame={t} />
      <ZoomStreaks I={Math.exp(-Math.abs(t - L(10)) / 3.2) * (t < L(10) + 10 ? 1 : 0)} />
      <Swoosh start={L(8) - 9} dur={18} angle={-90} width={420} intensity={0.55} color="#D9CEFF" frame={t} seed={4} />
    </AbsoluteFill>
  );

  return (
    <AbsoluteFill style={{background: SPACE, overflow: 'hidden'}}>
      <AbsoluteFill style={collapse ? {...collapse, transformOrigin: '50% 50%'} : undefined}>{content}</AbsoluteFill>
      {line}
      {exp < 1 && <AbsoluteFill style={{background: '#000', opacity: 1 - exp}} />}
    </AbsoluteFill>
  );
};

/** Glitch-cut garnish: a few bright cyan/magenta tear bands + a white scan bar for ±3 frames around each cut (gradients only). */
const TearBands: React.FC<{t: number; cuts: number[]}> = ({t, cuts}) => {
  const c = cuts.find((k) => t >= k - 2 && t <= k + 3);
  if (c === undefined) return null;
  const d = t - c;
  const I = Math.exp(-Math.abs(d) / 1.8);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {Array.from({length: 7}, (_, i) => {
        const y = h01(c * 3 + i, d + 40) * 1080;
        const h = 3 + h01(i, c + d) * 34;
        const x = h01(i * 7, c + d * 3) * 900;
        const w = 300 + h01(i * 3, d + c) * 1200;
        const col = i % 3 === 0 ? 'rgba(255,255,255,0.55)' : i % 3 === 1 ? 'rgba(127,231,255,0.5)' : 'rgba(255,79,163,0.45)';
        return <div key={i} style={{position: 'absolute', left: x, top: y, width: w, height: h, background: `linear-gradient(90deg, transparent, ${col} 25%, ${col} 75%, transparent)`, opacity: I}} />;
      })}
      <AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0 2px, transparent 2px 5px)', opacity: I}} />
    </AbsoluteFill>
  );
};

/** Cheap radial zoom streaks (gradients only) for the in-camera zoom-through into the text. */
const ZoomStreaks: React.FC<{I: number}> = ({I}) => {
  if (I < 0.03) return null;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill style={{background: `repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,255,255,0) 0deg, rgba(225,215,255,${(0.34 * I).toFixed(3)}) 0.5deg, rgba(255,255,255,0) 1.3deg, rgba(255,255,255,0) 3.9deg)`,
        WebkitMaskImage: 'radial-gradient(circle at 50% 50%, transparent 10%, black 48%)', maskImage: 'radial-gradient(circle at 50% 50%, transparent 10%, black 48%)'}} />
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,${(0.5 * I).toFixed(3)}) 0%, rgba(205,187,255,${(0.25 * I).toFixed(3)}) 14%, transparent 40%)`}} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Macro lines with manual per-line focus (blur by index distance)      */
/* ------------------------------------------------------------------ */
const MacroBlur: React.FC<{focus: number; t: number; hl: number; hl2: number; corrupt: number}> = ({focus, t, hl, hl2, corrupt}) => (
  <MacroLines t={t} x0={0} corrupt={corrupt} focus={focus} hlMap={{10: hl, 5: hl2}} />
);
