// Shots B–D (beats 42–45): the holographic prompt card in 3D.
//  B 42 → 43.5  "Describe it." — low-angle dutch wide, typing completes, copy lands left.
//  C 43.5 → 44  crash zoom onto "Build a proposal", energy charging, click on 43.75.
//  D 44 → 45    the press: energy burst + shockwave on the glass + flare, camera recoils; 3 bolts fly out.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {kick} from '../../lib';
import {World, Obj, CamSpec, addCam, handheld, kickPush, kickShake, resolveCam, project, FloorGrid, V3, camPath, CamKey, camMotion, MotionBlur} from '../../cine';
import {DustField, FlareBurst, EnergyBurst, Flash, Shockwave, Glint, LensFlare, Bokeh} from '../../vfx';
import {UITheme} from '../../ui/theme';
import {BuildPromptCard} from '../../ui/screens';
import {Sky, Copy, HudTag, Brackets, typedAt, TYPE_END, N_CHARS, kf, sat, pr, hit, easeOutExpo, easeInExpo} from './common';

/** card time for BuildPromptCard: its typing (46 f for the whole text) is driven by our typing timeline */
const PRESS_T = 100; // scene-local press frame (beat 43.75)
export const cardTime = (t: number) => (t < TYPE_END ? (46 * typedAt(t)) / N_CHARS : 46 + (t - TYPE_END));
const CARD_PRESS = cardTime(PRESS_T);

const Z = 2; // zoom of the card (render natively large)
/** button centre relative to the card centre (world px, card at zoom 2) */
export const BTN: V3 = [690, 262, 0];

const Card: React.FC<{t: number; glow?: number}> = ({t, glow = 0}) => (
  <div style={{zoom: Z}}>
    <UITheme look="holo">
      <BuildPromptCard t={cardTime(t)} typeAt={0} pressAt={CARD_PRESS} w={1100} />
    </UITheme>
  </div>
);

/** the world: card + floor + a few depth props */
const PromptSet: React.FC<{t: number; f: number; charge?: number; ring?: number; ringA?: number}> = ({t, f, charge = 0, ring = 0, ringA = 0}) => {
  const k = kick(f, 8);
  return (
    <>
      {/* light pool behind the card */}
      <Obj x={0} y={0} z={-260} dof={false}>
        <div style={{width: 3000, height: 1500, background: `radial-gradient(50% 50% at 50% 50%, rgba(140,107,234,${(0.34 + 0.12 * k).toFixed(3)}), rgba(127,231,255,0.06) 50%, transparent 72%)`}} />
      </Obj>
      <Obj x={0} y={0} z={0}><Card t={t} /></Obj>
      {/* charge halo behind the button */}
      {charge > 0.01 && (
        <Obj x={BTN[0]} y={BTN[1]} z={-6} dof={false}>
          <div style={{width: 900, height: 420, borderRadius: '50%', background: `radial-gradient(50% 50% at 50% 50%, rgba(207,246,255,${(0.75 * charge).toFixed(3)}), rgba(140,107,234,${(0.55 * charge).toFixed(3)}) 35%, transparent 70%)`}} />
        </Obj>
      )}
      {/* shock ring travelling ON the glass */}
      {ringA > 0.01 && (
        <Obj x={BTN[0]} y={BTN[1]} z={6} dof={false}>
          <div style={{width: 200 + ring * 4200, height: 200 + ring * 4200, borderRadius: '50%', opacity: ringA,
            background: 'radial-gradient(closest-side, transparent 86%, rgba(127,231,255,0.5) 92%, #FFFFFF 96.5%, rgba(205,187,255,0.6) 98.5%, transparent 100%)'}} />
        </Obj>
      )}
      {/* floating depth props: tiny glass chips far behind */}
      {[[-1700, -900, -2600], [1900, -700, -3200], [-2300, 700, -1800], [2500, 900, -2400]].map(([x, y, z], i) => (
        <Obj key={i} x={x} y={y + 20 * Math.sin((t + i * 30) / 40)} z={z}>
          <div style={{width: 380, height: 120, borderRadius: 60, background: 'linear-gradient(160deg, rgba(52,30,94,0.6), rgba(14,7,32,0.6))', boxShadow: 'inset 0 0 0 2px rgba(127,231,255,0.35), 0 0 40px rgba(140,107,234,0.4)'}} />
        </Obj>
      ))}
    </>
  );
};

const Frame: React.FC<{cam: CamSpec; t: number; f: number; from: number; focus?: number | V3; aperture?: number; charge?: number; ring?: number; ringA?: number; floor?: boolean}> = ({cam, t, f, from, focus, aperture = 0, charge, ring, ringA, floor = true}) => (
  <>
    <Sky cam={cam} from={from} t={t} haze={floor ? 0.5 : 0} />
    <World camera={cam} focus={focus} aperture={aperture} backdrop={floor ? <FloorGrid y={900} step={180} opacity={0.32} center={[0, -800]} extent={4200} fade={[900, 4200]} /> : undefined}>
      <PromptSet t={t} f={f} charge={charge} ring={ring} ringA={ringA} />
    </World>
  </>
);

/* ---------------- B: "Describe it." ---------------- */
export const DescribeShot: React.FC<{lt: number; t: number; from: number}> = ({lt, t, from}) => {
  const f = t + from;
  const keys: CamKey[] = [
    {at: 0, target: [-420, -190, 0], yaw: 19, pitch: 11, roll: 6, dist: 3050, focal: 30},
    {at: 40, ease: 'cubicOut', target: [-380, -170, 0], yaw: 13, pitch: 8, roll: 4, dist: 2700},
  ];
  const cam = addCam(camPath(lt, keys), handheld(lt, 0.6, 7), kickPush(f, 30));
  const rc = resolveCam(cam);
  const bp = project(rc, [BTN[0], BTN[1], 10]);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <Frame cam={cam} t={t} f={f} from={from} />
      {bp.visible && <LensFlare x={bp.x} y={bp.y} intensity={0.35 + 0.25 * kick(f, 10)} scale={0.6} streak={0.7} ghosts={0.7} ring={false} frame={t} />}
      <DustField frame={t} count={80} camX={-lt * 3} />
      <Copy words={['Describe', 'it.']} t={lt - 1} x={124} y={150} size={176} accent={[1]} kicker="Step 1 · Prompt" />
      <HudTag x={1770} y={150} t={lt - 6} align="right" label="Prompt" value={`${String(Math.min(N_CHARS, Math.floor(typedAt(t)))).padStart(3, '0')} / 1000`} />
    </AbsoluteFill>
  );
};

/* ---------------- C: button charge (crash zoom) ---------------- */
export const ChargeShot: React.FC<{lt: number; t: number; from: number}> = ({lt, t, from}) => {
  const f = t + from;
  const target: V3 = [BTN[0] - 60, BTN[1] - 10, 0];
  const keys: CamKey[] = [
    {at: 0, target, yaw: -24, pitch: 16, roll: -9, dist: 2700, focal: 30},
    {at: 9, ease: 'expoOut', focal: 58, roll: -12, yaw: -20},
    {at: 13, ease: 'linear', focal: 64, dist: 2600},
  ];
  const at = (x: number) => addCam(camPath(x, keys), handheld(x, 1.2, 9));
  const cam = at(lt);
  const rc = resolveCam(cam);
  const bp = project(rc, [BTN[0], BTN[1], 10]);
  const charge = sat(lt / 13) ** 1.6;
  const m = camMotion(at, lt, [BTN[0], BTN[1], 0]);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <MotionBlur vx={m.dx * 0.4} vy={m.dy * 0.4}>
        <Frame cam={cam} t={t} f={f} from={from} charge={charge} floor={false} />
      </MotionBlur>
      {/* energy sucked into the button */}
      <Inflow x={bp.x} y={bp.y} p={charge} t={t} />
      {bp.visible && <Glint x={bp.x} y={bp.y} size={180 + 260 * charge} intensity={0.4 + 1.3 * charge} spin={2} frame={t} />}
    </AbsoluteFill>
  );
};

/** particles converging on a point (screen space, cheap DOM streaks) */
const Inflow: React.FC<{x: number; y: number; p: number; t: number}> = ({x, y, p, t}) => {
  if (p <= 0.02) return null;
  return (
    <AbsoluteFill style={{mixBlendMode: 'screen', pointerEvents: 'none'}}>
      {Array.from({length: 26}, (_, i) => {
        const a = (i / 26) * Math.PI * 2 + i * 0.37;
        const ph = ((t * 0.09 + i * 0.137) % 1);
        const r = 900 * (1 - ph) * (1 - 0.3 * p) + 30;
        const len = 60 + 160 * p;
        const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
        return <div key={i} style={{position: 'absolute', left: px, top: py, width: len, height: 2 + (i % 3), borderRadius: 2, transformOrigin: '0 50%', transform: `rotate(${(a * 180) / Math.PI}deg)`,
          background: `linear-gradient(90deg, rgba(255,255,255,${(0.9 * p * ph).toFixed(3)}), rgba(127,231,255,0))`}} />;
      })}
    </AbsoluteFill>
  );
};

/* ---------------- D: the press — burst ---------------- */
export const BurstShot: React.FC<{lt: number; t: number; from: number}> = ({lt, t, from}) => {
  const f = t + from;
  const keys: CamKey[] = [
    {at: 0, target: [BTN[0] - 260, BTN[1] - 80, 0], yaw: -26, pitch: -30, roll: -10, dist: 1700, focal: 24},
    {at: 18, ease: 'expoOut', dist: 2900, pitch: -36, roll: -6, yaw: -30},
    {at: 27, ease: 'linear', dist: 3050, pitch: -37},
  ];
  const cam = addCam(camPath(lt, keys), kickShake(f, 2.6, 6), handheld(lt, 1.2, 11));
  const rc = resolveCam(cam);
  const bp = project(rc, [BTN[0], BTN[1], 10]);
  const ru = pr(lt, 0, 24);
  const ring = 1 - (1 - ru) * (1 - ru);
  const ringA = sat(1 - pr(lt, 8, 16)) * (lt >= 0 ? 1 : 0);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, filter: lt < 10 ? `brightness(${(1 + 0.9 * hit(lt, 0, 4)).toFixed(3)})` : undefined}}>
        <Frame cam={cam} t={t} f={f} from={from} ring={ring} ringA={ringA} charge={sat(1 - lt / 8)} />
      </div>
      <Shockwave x={bp.x} y={bp.y} at={t - lt} rings={2} radius={1500} thickness={110} distort frame={t} />
      <EnergyBurst x={bp.x} y={bp.y} at={t - lt} count={220} distance={1000} dur={40} frame={t} />
      <FlareBurst x={bp.x} y={bp.y} at={t - lt} dur={44} peak={2.2} flash={0.35} frame={t} />
      <Flash at={t - lt} dur={12} color="cyan" max={0.28} bloom x={bp.x} y={bp.y} frame={t} />
      <Bolts x={bp.x} y={bp.y} lt={lt} />
      <HudTag x={150} y={150} t={lt - 2} label="Generating proposal" value={`build ▸ ${'■'.repeat(Math.min(12, Math.floor(lt / 2)))}${'□'.repeat(Math.max(0, 12 - Math.floor(lt / 2)))}`} />
    </AbsoluteFill>
  );
};

/** three light bolts fired from the button toward the camera (they become the stat cards) */
const Bolts: React.FC<{x: number; y: number; lt: number}> = ({x, y, lt}) => {
  const defs = [{a: 196, d: 12}, {a: -38, d: 14.5}, {a: 104, d: 17}];
  return (
    <AbsoluteFill style={{mixBlendMode: 'screen', pointerEvents: 'none'}}>
      {defs.map(({a, d}, i) => {
        const u = pr(lt, d, 10);
        if (u <= 0 || u >= 1) return null;
        const e = easeInExpo(u);
        const rad = (a * Math.PI) / 180;
        const dist = 40 + e * 1900;
        const len = 220 + 1100 * e;
        const hx = x + Math.cos(rad) * dist, hy = y + Math.sin(rad) * dist;
        return (
          <div key={i} style={{position: 'absolute', left: hx, top: hy, width: len, height: 12 + 22 * e, marginTop: -(6 + 11 * e), borderRadius: 20, transformOrigin: '0 50%', transform: `rotate(${a + 180}deg)`,
            background: 'linear-gradient(90deg, #FFFFFF 0%, rgba(207,246,255,0.95) 6%, rgba(127,231,255,0.55) 28%, rgba(140,107,234,0) 100%)', boxShadow: '0 0 40px 6px rgba(127,231,255,0.75)'}} />
        );
      })}
    </AbsoluteFill>
  );
};
