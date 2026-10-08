/* =====================================================================================================
 * s06 · "Minds & judgments" · beats 64–80 (global frames 1719–2149) · Drop 1 groove, kick every beat
 * -----------------------------------------------------------------------------------------------------
 * SHOT LIST (cuts on B(k); slams land on the 1/16 after the kick, B(k+.25), where the SFX reads clean)
 *  PART A — "Three minds. One runtime."  (holo smoked-glass monoliths on a holographic floor in deep space)
 *   A1  64    JUDGE      low-angle hero, 24mm, dutch −7°. Judge monolith slams in from depth (lands 64.25):
 *                        floor shockwave, sparks, flare on the emblem, camera jolt. in: flash (in-half, from s05)
 *   A2  65.5  macro      half-beat insert: 50mm macro on Judge's live signal bars, shallow DOF.   hard cut
 *   A3  66    SPEAKER    whip right → ¾ dutch +8°, Speaker slams from deep right (66.25); bubbles pop 66.75/67.25
 *   A4  67.5  macro      half-beat insert: chat bubbles macro, 3rd bubble 67.75.                  hard cut
 *   A5  68    CLERK      whip down → high angle (−38°) crane-down; Clerk meteors in from high/far (68.25);
 *                        field checks ✓ 68.75 / 69.25 / 69.75
 *   A6  69    TRIO       flash → wide low-angle reveal of the arc + dormant core; "Three minds." ; power-up charge
 *   A7  70    CORE       flash → beams fire from all three emblems (70), core ignites (70.25): flare burst,
 *                        shockwave, god rays; orbiting camera; "One runtime." (70.5); accelerating push into core
 *  PART B — "Measure meaning. Get typed signals."  (frost Judgment editor rebuilt as floating glass rows)
 *   B1  72    TYPE       zoom-through out of the core → macro on Type segment, Noul→Score snaps (72.25)
 *   B2  73    CRITERIA   whip up → low lateral track; criteria rows 0 (73.25) and 1 (74.25) slam onto the glass
 *   B3  74.5  CRITERIA   whip left → high ¾ dutch; row 2 (75.25); rack focus to the measurement row
 *   B4  76    MEASURE    hard cut + crash zoom → macro: bar fills to 1.70 with glow (76→76.75), row 2 lights
 *   B5  77    SIGNALS    flash → typed-signal chips burst out (77.25/77.75/78.25/78.75) and orbit in 3D,
 *                        orbiting camera, rack focus card ↔ chips; "Get typed signals."
 *   B6  79    HERO       cut → hero wide of card + orbiting chips, lockup; whip out (right) at 80
 * ===================================================================================================== */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import type {SceneProps} from '../cine/types';
import {B, kick} from '../lib';
import {
  World, Obj, CamSpec, CamKey, V3, addCam, handheld, drift, kickPush, kickZoom, camPath, camMotion, project, resolveCam, depthOf,
  MotionBlur, Shots, Shot, whip, zoomThrough, flashCut, cut, FloorGrid, EASES,
} from '../cine';
import {SpaceBackdrop, DustField, Bokeh, Shockwave, EnergyBurst, FlareBurst, LensFlare, GodRays, Flash, Glint, Reticle, SpeedLines} from '../vfx';
import {Monolith, Core, CoreLabel, ROLES, Role, MW, MH, EMBLEM_Y, MINI_Y} from './s06/minds';
import {Line, Kicker, GRAD_PISTACHIO, GRAD_CYAN} from './s06/type';
import {EditorRig, EdState, CHIPS, Chip3D, chipPos, rowPt, tetherAlpha} from './s06/editor';
import {EZ, add3, clamp01, imp, jolt, kf, onPane, pr, slam, win} from './s06/util';

/* ------------------------------------------------------------------ */
/* Part A world                                                         */
/* ------------------------------------------------------------------ */
const FLOOR = 520;
const MCY = FLOOR - MH / 2 - 4;
type Slot = {pos: V3; ry: number; off: V3};
const SLOT: Record<string, Slot> = {
  judge: {pos: [-660, MCY, -380], ry: 32, off: [-1100, -140, -2000]},
  speaker: {pos: [0, MCY, -700], ry: 0, off: [1900, -320, -5200]},
  clerk: {pos: [660, MCY, -380], ry: -32, off: [700, -1500, -3000]},
};
const CORE: V3 = [0, 290, 110];

/** scene-local timing (computed from `from`) */
const timing = (from: number) => {
  const L = (k: number) => B(k) - from;
  return {
    L,
    land: {judge: L(64.25), speaker: L(66.25), clerk: L(68.25)} as Record<string, number>,
    start: {judge: L(64), speaker: L(66), clerk: L(68)} as Record<string, number>,
    coreIn: L(69) - 2, charge0: L(69.25), fire: L(70), ignite: L(70.25),
    // part B
    seg0: L(72) + 3, seg1: L(72.25) + 1,
    critLaunch: [L(73), L(74), L(75)], critLand: [L(73.25), L(74.25), L(75.25)],
    measureOn: L(75.5), fill0: L(76), fill1: L(76.75),
    chipLaunch: [L(77), L(77.5), L(78), L(78.5)], chipLand: [L(77.25), L(77.75), L(78.25), L(78.75)],
  };
};
type Tm = ReturnType<typeof timing>;

const monoPos = (role: Role, t: number, tm: Tm): V3 | null => {
  const s = SLOT[role.key];
  const o = slam(t, tm.start[role.key], tm.land[role.key], s.off, 40);
  return o ? add3(s.pos, o) : null;
};

/** Is a vertical pane (centre c, rotated ry, size w×h) at least partly inside the frame? Off-screen planes are
 *  culled: besides the raster cost, an off-screen pane can corrupt Chromium's 3D plane sorting (seen as a hard clip). */
const paneInView = (rc: ReturnType<typeof resolveCam>, c: V3, ry: number, w: number, h: number, margin = 80) => {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, front = 0;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) {
    const q = project(rc, onPane(c, ry, (sx * w) / 2, (sy * h) / 2));
    if (!q.visible) continue;
    front++;
    x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y);
  }
  if (!front) return false;
  if (front < 5) return true; // straddles the lens plane: keep (nearFade handles it)
  return x1 > -margin && x0 < 1920 + margin && y1 > -margin && y0 < 1080 + margin;
};

/** Floor light pools under the monoliths/core, drawn in 2D from projected ellipses (cheap, exact perspective). */
const FloorPools: React.FC<{cam: CamSpec; t: number; tm: Tm}> = ({cam, t, tm}) => {
  const rc = resolveCam(cam);
  if (rc.pos[1] >= FLOOR - 4) return null;
  const pools: React.ReactNode[] = [];
  const pool = (key: string, c: V3, r: number, rgb: string, a: number) => {
    const p0 = project(rc, [c[0], FLOOR, c[2]]);
    const px = project(rc, [c[0] + r, FLOOR, c[2]]);
    const pz = project(rc, [c[0], FLOOR, c[2] + r]);
    if (!p0.visible || !px.visible || !pz.visible || a < 0.01) return;
    const rx = Math.max(Math.hypot(px.x - p0.x, px.y - p0.y), 4);
    const ry = Math.max(Math.abs(pz.y - p0.y), 2);
    pools.push(<div key={key} style={{position: 'absolute', left: p0.x - rx, top: p0.y - ry, width: rx * 2, height: ry * 2, borderRadius: '50%', background: `radial-gradient(closest-side, rgba(${rgb},${a.toFixed(3)}), rgba(${rgb},${(a * 0.35).toFixed(3)}) 45%, transparent)`}} />);
  };
  for (const r of ROLES) {
    const p = monoPos(r, t, tm);
    if (!p) continue;
    const landed = t >= tm.land[r.key];
    const k = imp(t, tm.land[r.key], 10);
    pool(r.key, [p[0], 0, p[2]], 420 + 260 * k, r.rgb, landed ? 0.32 + 0.4 * k : 0.12);
  }
  const ig = pr(t, tm.ignite, 20, EZ.expoOut);
  if (ig > 0) pool('core', CORE, 700 + 300 * imp(t, tm.ignite, 14), '170,140,255', 0.18 + 0.3 * ig);
  return <AbsoluteFill>{pools}</AbsoluteFill>;
};

/** Speed streaks from the monolith corners while they fly in (projected, gradient strokes). */
const Trails: React.FC<{cam: CamSpec; t: number; tm: Tm}> = ({cam, t, tm}) => {
  const rc = resolveCam(cam);
  const segs: React.ReactNode[] = [];
  for (const r of ROLES) {
    const st = tm.start[r.key], ld = tm.land[r.key];
    if (t < st || t > ld + 3) continue;
    const s = SLOT[r.key];
    const tn = Math.min(t, ld);
    const now = add3(s.pos, slam(tn, st, ld, s.off, 0));
    const back = add3(s.pos, slam(Math.max(st, tn - 4), st, ld, s.off, 0) ?? s.off);
    const fade = t > ld ? 1 - (t - ld) / 3 : 1;
    [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, -0.6], [0, 0.4]].forEach(([cx, cy], k) => {
      const a = project(rc, onPane(now, s.ry, (cx * MW) / 2, (cy * MH) / 2));
      const b = project(rc, onPane(back, s.ry, (cx * MW) / 2, (cy * MH) / 2));
      if (!a.visible || !b.visible) return;
      const id = `s06t-${r.key}-${k}`;
      segs.push(
        <g key={id} opacity={fade}>
          <defs>
            <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={b.x} y1={b.y} x2={a.x} y2={a.y}>
              <stop offset="0" stopColor={r.col} stopOpacity={0} />
              <stop offset="0.75" stopColor={r.col} stopOpacity={0.6} />
              <stop offset="1" stopColor="#FFFFFF" stopOpacity={0.95} />
            </linearGradient>
          </defs>
          <line x1={b.x} y1={b.y} x2={a.x} y2={a.y} stroke={`url(#${id})`} strokeWidth={k > 3 ? 10 : 4} strokeLinecap="round" />
        </g>,
      );
    });
  }
  if (!segs.length) return null;
  return <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', mixBlendMode: 'screen'}}>{segs}</svg>;
};

/** Energy beams from each emblem into the core (projected SVG, layered strokes, no filters). */
const Beams: React.FC<{cam: CamSpec; t: number; tm: Tm}> = ({cam, t, tm}) => {
  if (t < tm.fire) return null;
  const rc = resolveCam(cam);
  const c = project(rc, CORE);
  if (!c.visible) return null;
  const head = clamp01((t - tm.fire) / Math.max(1, tm.ignite - tm.fire));
  const sustain = 0.75 + 0.25 * Math.sin(t / 3);
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', mixBlendMode: 'screen'}}>
      <defs>
        {ROLES.map((r) => {
          const s = SLOT[r.key];
          const a = project(rc, onPane(s.pos, s.ry, 0, EMBLEM_Y, 6));
          return (
            <linearGradient key={r.key} id={`s06b-${r.key}`} gradientUnits="userSpaceOnUse" x1={a.x} y1={a.y} x2={c.x} y2={c.y}>
              <stop offset="0" stopColor={r.col} />
              <stop offset="0.7" stopColor={r.light} />
              <stop offset="1" stopColor="#FFFFFF" />
            </linearGradient>
          );
        })}
      </defs>
      {ROLES.map((r, i) => {
        const s = SLOT[r.key];
        const a = project(rc, onPane(s.pos, s.ry, 0, EMBLEM_Y, 6));
        if (!a.visible) return null;
        const hx = a.x + (c.x - a.x) * head, hy = a.y + (c.y - a.y) * head;
        // slight arc: control point lifted perpendicular
        const mx = (a.x + hx) / 2, my = (a.y + hy) / 2 - 40 * (i - 1) * 0;
        const d = `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${hx.toFixed(1)} ${hy.toFixed(1)}`;
        const len = Math.hypot(hx - a.x, hy - a.y);
        const I = (head < 1 ? 1 : sustain) * (1 + 0.8 * imp(t, tm.ignite, 6));
        const sw = Math.max(0.6, Math.min(1.6, (a.scale + c.scale) / 2));
        return (
          <g key={r.key}>
            <path d={d} stroke={`rgba(${r.rgb},0.14)`} strokeWidth={46 * sw} strokeLinecap="round" fill="none" opacity={I} />
            <path d={d} stroke={`rgba(${r.rgb},0.35)`} strokeWidth={16 * sw} strokeLinecap="round" fill="none" opacity={I} />
            <path d={d} stroke={`url(#s06b-${r.key})`} strokeWidth={6 * sw} strokeLinecap="round" fill="none" opacity={Math.min(1, I)} />
            <path d={d} stroke="#FFFFFF" strokeWidth={2.2 * sw} strokeLinecap="round" fill="none" opacity={Math.min(1, 0.9 * I)} />
            {head >= 1 && <path d={d} stroke="#FFFFFF" strokeWidth={7 * sw} strokeLinecap="round" fill="none" strokeDasharray={`${len * 0.06} ${len * 0.22}`} strokeDashoffset={-((t - tm.ignite) * 34) % (len * 0.28)} opacity={0.75} />}
            {head < 1 && <circle cx={hx} cy={hy} r={22 * sw} fill="#FFFFFF" opacity={0.95} />}
            {head < 1 && <circle cx={hx} cy={hy} r={60 * sw} fill={`rgba(${r.rgb},0.35)`} />}
          </g>
        );
      })}
    </svg>
  );
};

/** Screen-space impact effects for the monolith landings and the core ignition (each returns null outside its window). */
const ImpactFx: React.FC<{cam: CamSpec; t: number; tm: Tm; lite?: boolean; fade?: number}> = ({cam, t, tm, lite, fade = 1}) => {
  const rc = resolveCam(cam);
  const out: React.ReactNode[] = [];
  for (const r of ROLES) {
    const at = tm.land[r.key];
    if (t < at || t > at + 60) continue;
    const s = SLOT[r.key];
    const b0 = project(rc, [s.pos[0], FLOOR, s.pos[2]]);
    const bx = project(rc, [s.pos[0] + 120, FLOOR, s.pos[2]]);
    const bz = project(rc, [s.pos[0], FLOOR, s.pos[2] + 120]);
    const em = project(rc, onPane(s.pos, s.ry, 0, EMBLEM_Y, 8));
    if (b0.visible && bx.visible) {
      const r1 = Math.max(1, Math.hypot(bx.x - b0.x, bx.y - b0.y));
      const rad = Math.max(200, Math.min(2200, r1 * 7.5));
      const sq = bz.visible ? Math.max(0.1, Math.min(0.8, Math.abs(bz.y - b0.y) / r1)) : 0.25;
      out.push(<Shockwave key={`sw${r.key}`} x={b0.x} y={b0.y} at={at} dur={34} radius={rad} squash={sq} rings={2} gap={4} thickness={70} color={r.col} secondary="cyan" intensity={0.9} core={false} />);
      out.push(<EnergyBurst key={`eb${r.key}`} x={b0.x} y={b0.y - 10} at={at} dur={40} count={90} distance={Math.min(900, rad * 0.55)} spread={150} direction={-90} gravity={0.22} squash={0.7} color={r.col} secondary="white" seed={r.idx * 7} />);
    }
    if (em.visible) out.push(<FlareBurst key={`fb${r.key}`} x={em.x} y={em.y} at={at} dur={46} peak={1.3} flash={0.25} scale={0.6} streak={0.9} secondary={r.col} ghosts={0.6} rays={10} seed={r.idx * 3} />);
    out.push(<Flash key={`fl${r.key}`} at={at} dur={9} color={r.col} max={0.22} />);
  }
  // core ignition
  if (t >= tm.ignite - 1) {
    const c = project(rc, CORE);
    if (c.visible) {
      const g = pr(t, tm.ignite, 24, EZ.expoOut);
      if (!lite && fade > 0.05) out.push(<GodRays key="gr" x={c.x} y={c.y} intensity={fade * (0.25 + 0.65 * g + 0.4 * imp(t, tm.ignite, 10))} length={1400} lobes={18} color="lilac" secondary="cyan" core={0.6} dust={0.8} />);
      out.push(<Shockwave key="csw" x={c.x} y={c.y} at={tm.ignite} dur={40} radius={1300} rings={3} distort thickness={110} intensity={1} />);
      out.push(<EnergyBurst key="ceb" x={c.x} y={c.y} at={tm.ignite} dur={50} count={160} distance={780} />);
      out.push(<FlareBurst key="cfb" x={c.x} y={c.y} at={tm.ignite} dur={70} peak={2} sustain={0.55} flash={0.25} scale={1} seed={11} />);
      out.push(<Flash key="cfl" at={tm.ignite} dur={10} color="white" max={0.3} bloom x={c.x} y={c.y} />);
    }
  }
  return <>{out}</>;
};

/** HUD tags locked to each monolith top (projected). */
const RoleTags: React.FC<{cam: CamSpec; t: number; tm: Tm}> = ({cam, t, tm}) => {
  const rc = resolveCam(cam);
  return (
    <>
      {ROLES.map((r) => {
        const at = tm.land[r.key] + 4;
        if (t < at) return null;
        const s = SLOT[r.key];
        const p = project(rc, onPane(s.pos, s.ry, -MW / 2, -MH / 2 - 40, 0));
        if (!p.visible || p.x < 60 || p.x > 1860 || p.y < 60 || p.y > 1020) return null;
        const q = pr(t, at, 14, EZ.expoOut);
        return (
          <div key={r.key} style={{position: 'absolute', left: p.x, top: p.y, display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Inter', fontWeight: 600, fontSize: 14, letterSpacing: '0.3em', color: r.light, opacity: q, whiteSpace: 'nowrap', textShadow: `0 0 10px ${r.col}`}}>
            <div style={{width: 10, height: 10, border: `1.5px solid ${r.col}`, transform: `rotate(45deg) scale(${q})`}} />
            {`MIND 0${r.idx} · ${r.name.toUpperCase()}`}
          </div>
        );
      })}
    </>
  );
};

/** Full Part A frame for a camera. */
const PartA: React.FC<{cam: CamSpec; t: number; f: number; from: number; tm: Tm; focus?: number | V3; aperture?: number; mb?: {vx: number; vy: number}; tags?: boolean; reflect?: number; lite?: boolean; warp?: number}> = ({cam, t, f, from, tm, focus, aperture = 0, mb, tags = true, reflect = 0.22, lite, warp = 0}) => {
  const rc = resolveCam(cam);
  const charge = pr(t, tm.charge0, tm.fire - tm.charge0, EZ.sine);
  const fire = pr(t, tm.fire, 8, EZ.expoOut);
  const on = pr(t, tm.ignite, 10, EZ.expoOut);
  const coreV = pr(t, tm.coreIn, 18, EZ.expoOut);
  const coreS = coreV * (1 + 0.35 * on + 0.18 * imp(t, tm.ignite, 8));
  const world = (
    <World camera={cam} focus={focus} aperture={aperture} backdrop={<><FloorGrid y={FLOOR} step={150} extent={3600} center={[0, -500]} opacity={0.42} color="rgb(185,160,255)" fade={[700, 3400]} /><FloorPools cam={cam} t={t} tm={tm} /></>}>
      {ROLES.map((r) => {
        const p = monoPos(r, t, tm);
        if (!p) return null;
        const s = SLOT[r.key];
        if (!paneInView(rc, p, s.ry, MW, MH, 30)) return null;
        const fl = imp(t, tm.land[r.key], 7) + 0.8 * imp(t, tm.fire, 8);
        return (
          <Obj key={r.key} x={p[0]} y={p[1]} z={p[2]} ry={s.ry} w={MW} h={MH} nearFade={[60, 360]}>
            <Monolith role={r} t={t} f={f} land={tm.land[r.key]} charge={charge} fire={fire} flash={Math.min(1, fl)} reflect={lite ? 0 : reflect} />
          </Obj>
        );
      })}
      {coreV > 0.01 && (
        <Obj x={CORE[0]} y={CORE[1]} z={CORE[2]} billboard s={coreS} nearFade={[80, 420]}>
          <Core t={t} f={f} on={on} charge={charge} size={260} />
        </Obj>
      )}
      <Obj x={CORE[0]} y={CORE[1] + 225} z={CORE[2]} billboard nearFade={[80, 420]}>
        <CoreLabel t={t} at={tm.ignite + 6} />
      </Obj>
    </World>
  );
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <SpaceBackdrop from={from} camX={-rc.yaw * 14} camY={rc.pitch * 10} horizon={560} haze={0.45} intensity={0.72} />
      {!lite && warp < 0.25 && mb && (Math.abs(mb.vx) > 1.2 || Math.abs(mb.vy) > 1.2) ? <MotionBlur vx={mb.vx} vy={mb.vy}>{world}</MotionBlur> : world}
      <Trails cam={cam} t={t} tm={tm} />
      <Beams cam={cam} t={t} tm={tm} />
      {!lite && <ImpactFx cam={cam} t={t} tm={tm} fade={1 - warp} />}
      {lite && (() => { const c = project(rc, CORE); return c.visible ? <LensFlare x={c.x} y={c.y} intensity={1.1} scale={0.9} ghosts={0.4} rays={10} seed={11} /> : null; })()}
      {t >= tm.coreIn && t < tm.ignite + 2 && (() => { const c = project(rc, CORE); return c.visible ? <Glint x={c.x} y={c.y} size={160 + 260 * charge} intensity={0.5 + 1.3 * charge + 1.2 * imp(t, tm.coreIn + 4, 8)} color="cyan" spin={1.2} /> : null; })()}
      {!lite && <DustField camX={-rc.yaw * 30} camY={rc.pitch * 20} boost={0.4 * imp(t, tm.ignite, 12)} />}
      {tags && <RoleTags cam={cam} t={t} tm={tm} />}
      {warp > 0.01 && (() => { const c = project(rc, CORE); return <SpeedLines intensity={warp} x={c.visible ? c.x : 960} y={c.visible ? c.y : 540} travel={t * 0.02 + warp * warp * 3} count={300} color="#E6FBFF" />; })()}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Part B world                                                         */
/* ------------------------------------------------------------------ */
const edState = (t: number, tm: Tm): EdState => {
  const seg = t < tm.seg0 ? 0 : EZ.backOut(clamp01((t - tm.seg0) / (tm.seg1 - tm.seg0 + 2)));
  const fillP = pr(t, tm.fill0, tm.fill1 - tm.fill0, EZ.expoOut);
  const sw = (a: number, d: number) => { const u = (t - a) / d; return u > 0 && u < 1 ? u : -1; };
  const s1 = sw(tm.seg1, 34), s2 = sw(tm.fill1, 30);
  return {
    seg, segFlash: imp(t, tm.seg1, 8),
    crit: tm.critLaunch.map((a, i) => (t < a ? 0 : clamp01((t - a) / (tm.critLand[i] - a)))),
    critFlash: tm.critLand.map((a) => imp(t, a, 7)),
    critLand: tm.critLand,
    measure: pr(t, tm.measureOn, 14, EZ.expoOut),
    val: 1.7 * fillP + (fillP > 0.98 ? 0.025 * Math.sin((t - tm.fill1) / 5) : 0),
    fillGlow: Math.min(1, 0.3 * fillP + 0.8 * imp(t, tm.fill1, 12) + (t > tm.fill0 && t < tm.fill1 ? 0.3 : 0)),
    sheen: s1 >= 0 ? s1 : s2 >= 0 ? s2 : -1,
  };
};

const CARD_C: V3 = [0, -40, 0];

const PartB: React.FC<{cam: CamSpec; t: number; f: number; from: number; tm: Tm; focus?: number | V3; aperture?: number; mb?: {vx: number; vy: number}; reticle?: boolean; barFlare?: boolean; lite?: boolean; bleed?: boolean; warp?: number}> = ({cam, t, f, from, tm, focus, aperture = 0, mb, reticle, barFlare, lite, bleed, warp = 0}) => {
  const rc = resolveCam(cam);
  const st = edState(t, tm);
  const kv = kick(f, 8);
  const chips = CHIPS.map((c, i) => ({c, i, pos: chipPos(c, t, tm.chipLaunch[i], tm.chipLaunch[0], i)}));
  const cc = project(rc, CARD_C);
  const world = (
    <World camera={cam} focus={focus} aperture={aperture} backdrop={<FloorGrid y={900} step={180} extent={4200} center={[0, -400]} opacity={0.26} color="rgb(185,160,255)" fade={[900, 4200]} far={12000} />}>
      <EditorRig st={st} t={t} />
      {chips.map(({c, i, pos}) => pos && <Chip3D key={c.name} c={c} pos={pos} t={t} launch={tm.chipLaunch[i]} f={f} kickV={kv} />)}
    </World>
  );
  // tethers from the measurement row to each chip
  const src = project(rc, rowPt('measure', 300, 0));
  const tethers = chips.map(({c, i, pos}) => {
    if (!pos || !src.visible) return null;
    const q = project(rc, pos);
    if (!q.visible) return null;
    const a = tetherAlpha(t, tm.chipLaunch[i]);
    return <line key={c.name} x1={src.x} y1={src.y} x2={q.x} y2={q.y} stroke="#BFF4FF" strokeWidth={1.6} strokeDasharray="2 7" opacity={0.55 * a} />;
  });
  // bar head flare during the fill
  const head = barFlare && st.measure > 0.5 ? project(rc, rowPt('measure', -460 + 920 * (st.val / 2), 15)) : null;
  const segP = project(rc, rowPt('type', 0, 14));
  return (
    <AbsoluteFill style={{overflow: bleed ? 'visible' : 'hidden'}}>
      {/* bleed: oversize the backdrop while a zoom-through scales this shot below 1 (no black frame edges) */}
      {bleed && <div style={{position: 'absolute', left: -1100, top: -700, width: 4120, height: 2480, background: 'radial-gradient(closest-side, #1A0B34 0%, #0E0620 55%, #06030E 100%)'}} />}
      <SpaceBackdrop from={from} camX={-rc.yaw * 14} camY={rc.pitch * 10} haze={0} intensity={0.6} seed={7} />
      {cc.visible && <div style={{position: 'absolute', left: cc.x - 1100 * cc.scale - 200, top: cc.y - 800 * cc.scale - 200, width: 2200 * cc.scale + 400, height: 1600 * cc.scale + 400, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(150,120,255,0.42), rgba(127,231,255,0.10) 55%, transparent)'}} />}
      {mb && (Math.abs(mb.vx) > 1.2 || Math.abs(mb.vy) > 1.2) ? <MotionBlur vx={mb.vx} vy={mb.vy}>{world}</MotionBlur> : world}
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, mixBlendMode: 'screen'}}>{tethers}</svg>
      {segP.visible && <Glint x={segP.x} y={segP.y} size={260} intensity={1.6 * imp(t, tm.seg1, 7)} color="cyan" />}
      {head && head.visible && <LensFlare x={head.x} y={head.y} intensity={0.7 + 0.9 * st.fillGlow} scale={0.75} streak={0.9} ghosts={0.6} rays={10} ring={false} veil={0.35} color="cyan" secondary="#45E3B0" />}
      {reticle && segP.visible && <Reticle x={segP.x - 260 * segP.scale} y={segP.y - 40 * segP.scale} w={520 * segP.scale} h={80 * segP.scale} start={tm.seg1 - 2} dur={12} label="Type" value="SCORE · 0–2" color="#7FE7FF" accent="#E7F4B9" />}
      {chips.map(({c, i, pos}) => {
        if (!pos) return null;
        const q = project(rc, pos);
        const a = imp(t, tm.chipLand[i], 6);
        return q.visible && a > 0.05 ? <Glint key={c.name} x={q.x} y={q.y} size={180} intensity={1.2 * a} color="cyan" /> : null;
      })}
      {!lite && <Bokeh camX={-rc.yaw * 40} camY={rc.pitch * 30} count={26} opacity={0.6} boost={0.3 * kv} />}
      {warp > 0.01 && <SpeedLines intensity={warp} x={segP.visible ? segP.x : 960} y={segP.visible ? segP.y : 540} travel={t * 0.02 + 3 + (1 - warp) * 2} count={300} color="#E6FBFF" />}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Copy overlay                                                         */
/* ------------------------------------------------------------------ */
const CopyA: React.FC<{t: number; tm: Tm}> = ({t, tm}) => {
  const {L} = tm;
  if (t < L(69) - 1 || t > L(72)) return null;
  const out = L(71.5);
  return (
    <>
      <div style={{position: 'absolute', left: 160, top: -330, width: 1600, height: 820, background: 'radial-gradient(closest-side, rgba(4,2,10,0.6), rgba(4,2,10,0.28) 55%, transparent)', opacity: win(t, L(69) - 2, out + 10, 10, 10)}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 112, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <Kicker text="Judge · Speaker · Clerk" t={t} at={L(69)} out={out} size={19} />
        <div style={{display: 'flex', gap: 34, marginTop: 4}}>
          <Line text="Three minds." t={t} at={L(69) + 2} out={out} size={112} exit="zoom" />
          <Line text="One runtime." t={t} at={L(70.5)} out={out} size={112} grad={GRAD_PISTACHIO} glow="rgba(231,244,185,0.45)" exit="zoom" reserve />
        </div>
      </div>
    </>
  );
};

const CopyB: React.FC<{t: number; tm: Tm; dur: number}> = ({t, tm, dur}) => {
  const {L} = tm;
  const outA = L(76) - 10;
  // whip-out: ride the same strip as the shot whip (dur 10, split .6 → pre 6 frames before the scene end)
  const u = clamp01((t - (dur - 6)) / 6);
  const wx = -1920 * 0.6 * EASES.expoIn(u);
  const blocks: React.ReactNode[] = [];
  if (t >= L(73) - 1 && t < outA + 12) {
    blocks.push(
      <div key="a" style={{position: 'absolute', left: 128, top: 330, display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
        <Kicker text="Judge · Score 0–2" t={t} at={L(73)} out={outA} size={19} />
        <div style={{marginTop: 6}}><Line text="Measure" t={t} at={L(73) + 2} out={outA} size={128} /></div>
        <div style={{marginTop: -26}}><Line text="meaning." t={t} at={L(73) + 8} out={outA} size={128} /></div>
      </div>,
    );
  }
  if (t >= L(77.5) - 1) {
    blocks.push(
      <div key="b" style={{position: 'absolute', left: 128, top: 112, display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
        <Kicker text="Noul · Score · Choice" t={t} at={L(77.5)} size={19} />
        <div style={{display: 'flex', gap: 30, marginTop: 4}}>
          <Line text="Get typed" t={t} at={L(77.5) + 2} size={112} />
          <Line text="signals." t={t} at={L(77.5) + 10} size={112} grad={GRAD_CYAN} glow="rgba(127,231,255,0.45)" reserve />
        </div>
      </div>,
    );
  }
  if (!blocks.length) return null;
  const scrimA = win(t, L(73) - 2, outA + 10, 10, 10), scrimB = win(t, L(77.5) - 2, dur + 20, 10, 1);
  return (
    <AbsoluteFill style={{transform: u > 0 ? `translateX(${wx.toFixed(1)}px)` : undefined}}>
      {scrimA > 0 && <div style={{position: 'absolute', left: -520, top: 0, width: 1500, height: 1080, background: 'radial-gradient(closest-side, rgba(4,2,10,0.66), rgba(4,2,10,0.3) 60%, transparent)', opacity: scrimA}} />}
      {scrimB > 0 && <div style={{position: 'absolute', left: -200, top: -330, width: 1700, height: 800, background: 'radial-gradient(closest-side, rgba(4,2,10,0.62), rgba(4,2,10,0.28) 60%, transparent)', opacity: scrimB}} />}
      {blocks}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Scene                                                                */
/* ------------------------------------------------------------------ */
export const Scene: React.FC<SceneProps> = ({from, dur}) => {
  const t = useCurrentFrame();
  const f = t + from;
  const tm = timing(from);
  const {L} = tm;
  const J = SLOT.judge, S = SLOT.speaker, C = SLOT.clerk;

  // A1 — Judge low-angle hero
  const a1: CamKey[] = [
    {at: 0, target: onPane(J.pos, J.ry, 0, -150), yaw: -27, pitch: 24, dist: 1180, roll: -8, focal: 22},
    {at: L(65.5) - L(64), yaw: -17, pitch: 19, dist: 980, roll: -5},
  ];
  // A2 — macro on Judge's live bars
  const a2: CamKey[] = [
    {at: 0, target: onPane(J.pos, J.ry, -10, MINI_Y + 10), yaw: -46, pitch: 4, dist: 1020, roll: 4, focal: 50},
    {at: 14, dist: 930, yaw: -40},
  ];
  // A3 — Speaker ¾ dutch
  const a3: CamKey[] = [
    {at: 0, target: [0, -90, -700], yaw: -34, pitch: 9, dist: 1560, roll: 8, focal: 28},
    {at: L(67.5) - L(66), yaw: -22, pitch: 6, dist: 1300, roll: 6},
  ];
  // A4 — macro chat bubbles
  const a4: CamKey[] = [
    {at: 0, target: onPane(S.pos, S.ry, 20, MINI_Y + 30), yaw: 30, pitch: -6, dist: 1200, roll: 6, focal: 50},
    {at: 14, dist: 1100, yaw: 25},
  ];
  // A5 — Clerk high angle, crane down
  const a5: CamKey[] = [
    {at: 0, target: [640, -60, -380], yaw: 44, pitch: -42, dist: 2050, roll: 2, focal: 26},
    {at: L(69) - L(68), ease: 'quintInOut', yaw: 26, pitch: -12, dist: 1450, roll: -2},
  ];
  // A6 — wide low-angle trio
  const a6: CamKey[] = [
    {at: 0, target: [60, -120, -420], yaw: 10, pitch: 12, dist: 2450, roll: -3, focal: 24},
    {at: L(70) - L(69), yaw: 3, pitch: 10, dist: 2300, roll: -1.5},
  ];
  // A7 — core: crash-in, orbit, accelerating push into the core
  const A7 = L(72) - L(70);
  const a7: CamKey[] = [
    {at: 0, target: [60, -10, 0], yaw: -34, pitch: 7, dist: 2700, roll: -6, focal: 24},
    {at: 9, ease: 'expoOut', dist: 2300, yaw: -26},
    {at: A7 - 14, ease: 'linear', yaw: 16, pitch: 5, dist: 2080, roll: 4, target: [-30, 10, 0]},
    {at: A7, ease: 'expoIn', yaw: 22, pitch: 2, dist: 700, roll: 7, target: CORE},
  ];

  // B1 — macro on the Type segment
  const b1: CamKey[] = [
    {at: 0, target: rowPt('type', -60, 14), yaw: -30, pitch: 38, dist: 2600, roll: -14, focal: 40},
    {at: 9, ease: 'expoOut', yaw: -24, pitch: 34, dist: 1480, roll: -9},
    {at: L(73) - L(72), ease: 'linear', yaw: -16, pitch: 30, dist: 1330, roll: -6},
  ];
  // B2 — low lateral track along the criteria rows
  const b2: CamKey[] = [
    {at: 0, target: [0, 120, 0], yaw: -40, pitch: 16, dist: 2050, roll: 4, focal: 35, shiftX: 430},
    {at: L(74.5) - L(73), yaw: -24, pitch: 12, dist: 1880, roll: 3},
  ];
  // B3 — high ¾ from the left, rack to the measurement row
  const b3: CamKey[] = [
    {at: 0, target: [0, 140, 0], yaw: 34, pitch: -30, dist: 2700, roll: -8, focal: 35, shiftX: 470},
    {at: L(76) - L(74.5), yaw: 22, pitch: -22, dist: 2450, roll: -5},
  ];
  // B4 — measurement macro with a crash zoom in
  const b4: CamKey[] = [
    {at: 0, target: rowPt('measure', 60, 12), yaw: -26, pitch: 28, dist: 2500, roll: 8, focal: 40},
    {at: 8, ease: 'expoOut', dist: 1520},
    {at: L(77) - L(76), ease: 'linear', yaw: -19, pitch: 25, dist: 1420, roll: 6},
  ];
  // B5 — chips burst out: pull back + orbit
  const b5: CamKey[] = [
    {at: 0, target: rowPt('measure', 0, 0), yaw: -24, pitch: 10, dist: 1400, roll: -5, focal: 30, shiftX: 120, shiftY: 40},
    {at: 18, ease: 'expoOut', target: [0, 40, 0], dist: 2300, yaw: -22, pitch: 9, shiftX: 230, shiftY: 175},
    {at: L(79) - L(77), ease: 'linear', yaw: -8, pitch: 7, dist: 2400, roll: -2},
  ];
  // B6 — hero wide, slow push, whip out
  const b6: CamKey[] = [
    {at: 0, target: [0, -60, 0], yaw: 14, pitch: -18, dist: 3250, roll: 7, focal: 30, shiftX: 60, shiftY: 105},
    {at: L(80) - L(79), yaw: 20, pitch: -15, dist: 3020, roll: 8},
  ];
  const bLife = (lt: number, amp: number, seed: number) => [handheld(lt, amp, seed), kickPush(f, 16), jolt(t, tm.seg1, 0.6), ...tm.critLand.map((a) => jolt(t, a, 0.7)), jolt(t, tm.fill1, 0.5)];
  const rackB5 = (cam: CamSpec): number => {
    const rc = resolveCam(cam);
    const dCard = depthOf(rc, CARD_C);
    let w = 0, dChip = dCard;
    tm.chipLand.forEach((a, i) => {
      const k = Math.exp(-Math.pow((t - (a + 3)) / 7, 2));
      const p = chipPos(CHIPS[i], t, tm.chipLaunch[i], tm.chipLaunch[0], i);
      if (p && k > w) { w = k; dChip = depthOf(rc, p); }
    });
    return dCard + (dChip - dCard) * w;
  };

  const life = (lt: number, amp: number, seed: number) => [handheld(lt, amp, seed), kickPush(f, 18), jolt(t, tm.land.judge, 1.1), jolt(t, tm.land.speaker, 1), jolt(t, tm.land.clerk, 1.2), jolt(t, tm.ignite, 1.4)];

  const shots: Shot[] = [
    {from: 0, to: L(65.5), name: 'A1 judge', in: flashCut({dur: 14, split: 0.5, peak: 0.9, color: '#E6FBFF'}), // in-half; matches s05's out-half flash
      render: (lt, _p, info) => <PartA cam={addCam(camPath(lt, a1), ...life(lt, 0.8, 1))} t={info.t} f={info.t + from} from={from} tm={tm} />},
    {from: L(65.5), to: L(66), name: 'A2 judge macro', in: cut(),
      render: (lt, _p, info) => {
        const cam = addCam(camPath(lt, a2), handheld(lt, 0.6, 2), kickZoom(f, 0.02));
        return <PartA cam={cam} t={info.t} f={info.t + from} from={from} tm={tm} focus={onPane(J.pos, J.ry, 0, MINI_Y)} aperture={12} tags={false} reflect={0} />;
      }},
    {from: L(66), to: L(67.5), name: 'A3 speaker', in: whip({dir: 'right', dur: 10}),
      render: (lt, _p, info) => {
        const cam = addCam(camPath(lt, a3), ...life(lt, 0.8, 3));
        return <PartA cam={cam} t={info.t} f={info.t + from} from={from} tm={tm} focus={[0, -90, -700]} aperture={6} />;
      }},
    {from: L(67.5), to: L(68), name: 'A4 speaker macro', in: cut(),
      render: (lt, _p, info) => <PartA cam={addCam(camPath(lt, a4), handheld(lt, 0.6, 4), kickZoom(f, 0.02))} t={info.t} f={info.t + from} from={from} tm={tm} focus={onPane(S.pos, S.ry, 0, MINI_Y)} aperture={12} tags={false} reflect={0} />},
    {from: L(68), to: L(69), name: 'A5 clerk', in: whip({dir: 'down', dur: 10}),
      render: (lt, _p, info) => <PartA cam={addCam(camPath(lt, a5), ...life(lt, 0.9, 5))} t={info.t} f={info.t + from} from={from} tm={tm} />},
    {from: L(69), to: L(70), name: 'A6 trio', in: flashCut({dur: 8, peak: 0.4}),
      render: (lt, _p, info) => <PartA cam={addCam(camPath(lt, a6), ...life(lt, 0.6, 6))} t={info.t} f={info.t + from} from={from} tm={tm} />},
    {from: L(70), to: L(72), name: 'A7 core', in: flashCut({dur: 8, peak: 0.45}),
      render: (lt, _p, info) => {
        const at = (x: number) => camPath(x, a7);
        const m = camMotion(at, lt, CORE);
        const cam = addCam(at(lt), ...life(lt, 0.7, 7));
        const warp = Math.pow(clamp01((lt - (A7 - 14)) / 14), 1.6);
        return <PartA cam={cam} t={info.t} f={info.t + from} from={from} tm={tm} mb={{vx: m.dx, vy: m.dy}} tags={false} warp={warp} />;
      }},
    {from: L(72), to: L(73), name: 'B1 type', in: flashCut({dur: 14, split: 0.5, peak: 1, color: '#EAF8FF', punch: 0.1}),
      render: (lt, _p, info) => {
        const cam = addCam(camPath(lt, b1), ...bLife(lt, 0.6, 11));
        return <PartB cam={cam} t={info.t} f={info.t + from} from={from} tm={tm} focus={rowPt('type', -60, 14)} aperture={18 * clamp01((lt - 2) / 10)} reticle warp={Math.pow(1 - clamp01(lt / 12), 1.5)} />;
      }},
    {from: L(73), to: L(74.5), name: 'B2 criteria', in: whip({dir: 'up', dur: 10}),
      render: (lt, _p, info) => {
        const cam = addCam(camPath(lt, b2), ...bLife(lt, 0.7, 12));
        return <PartB cam={cam} t={info.t} f={info.t + from} from={from} tm={tm} focus={[0, 40, 30]} aperture={9} />;
      }},
    {from: L(74.5), to: L(76), name: 'B3 criteria high', in: whip({dir: 'left', dur: 10}),
      render: (lt, _p, info) => {
        const cam = addCam(camPath(lt, b3), ...bLife(lt, 0.7, 13));
        const rc = resolveCam(cam);
        const fa = depthOf(rc, rowPt('crit2')), fb = depthOf(rc, rowPt('measure'));
        const k = EZ.cubicInOut(clamp01((info.t - (tm.measureOn - 2)) / 16));
        return <PartB cam={cam} t={info.t} f={info.t + from} from={from} tm={tm} focus={fa + (fb - fa) * k} aperture={12} />;
      }},
    {from: L(76), to: L(77), name: 'B4 measure', in: cut(),
      render: (lt, _p, info) => {
        const at = (x: number) => camPath(x, b4);
        const m = camMotion(at, lt, rowPt('measure', 120, 10));
        const cam = addCam(at(lt), ...bLife(lt, 0.5, 14));
        return <PartB cam={cam} t={info.t} f={info.t + from} from={from} tm={tm} focus={rowPt('measure', 0, 15)} aperture={18 * clamp01((lt - 3) / 8)} mb={{vx: m.dx, vy: m.dy}} barFlare />;
      }},
    {from: L(77), to: L(79), name: 'B5 signals', in: flashCut({dur: 8, peak: 0.6, color: '#BFF4FF'}),
      render: (lt, _p, info) => {
        const at = (x: number) => camPath(x, b5);
        const m = camMotion(at, lt, [0, 60, 0]);
        const cam = addCam(at(lt), ...bLife(lt, 0.7, 15));
        return <PartB cam={cam} t={info.t} f={info.t + from} from={from} tm={tm} focus={rackB5(cam)} aperture={14 * clamp01((lt - 5) / 10)} mb={{vx: m.dx, vy: m.dy}} />;
      }},
    {from: L(79), to: dur, name: 'B6 hero', in: cut(), out: whip({dir: 'right', dur: 10}), // out-half; s07 opens with the matching in-half
      render: (lt, _p, info) => {
        const cam = addCam(camPath(lt, b6), ...bLife(lt, 0.6, 16));
        return <PartB cam={cam} t={info.t} f={info.t + from} from={from} tm={tm} focus={CARD_C} aperture={8} />;
      }},
  ];

  return (
    <AbsoluteFill style={{background: '#04020A'}}>
      <Shots shots={shots} t={t} />
      <CopyA t={t} tm={tm} />
      <CopyB t={t} tm={tm} dur={dur} />
    </AbsoluteFill>
  );
};
