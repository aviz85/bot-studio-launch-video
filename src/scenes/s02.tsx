/* s02 · "See it think" · beats 16–32 · global 430–860 (local 0–430)
 *
 * SHOT LIST (cuts on B(k); local = B(k) − 430)
 * ── BUILD · half-time kicks 16/18/20/22 → each = light pulse from the distant core + camera push ─────────────────
 *  SH1  16 → 18   (0–54)    IGNITION · low angle, 20 mm, lens 30 px off a holo floor. Black → the far point of light
 *                            ignites on the kick; "What if you could" rises word by word (16, 16.5, 17, 17.5) as giant
 *                            type standing on the floor (with reflection). Slow dolly in + kick push.
 *  SH2  18 → 20   (54–107)  HIGH DUTCH TRACK · flash-cut light pulse on the kick. 30 mm from above-right, roll 8°,
 *                            lateral track across the line; the core and second line glimmer far behind.
 *  SH3  20 → 22   (107–161) ZOOM-THROUGH → HERO · "see it think?" frontal, low, rack focus through foreground shards.
 *                            "see" (20) glyphs filled with live signal bars, "it" (20.5), "think?" (21).
 *  SH4  22 → 24   (161–215) THE DIVE · whip in; speed-ramped fly-over of the giant line toward the core
 *                            (fast on the kick → glide → expo-in into the light); warp lines start; core blooms white.
 * ── SNARE ROLL · teaser strobe montage, cuts on beats then half beats; warp SpeedLines grow every cut ────────────
 *  M1   24        (215–242) flash-white · SIGNAL FIELD, extreme low angle 20 mm, dutch −12°, lateral sweep, bars tower.
 *  M2   25        (242–269) whip → · GLASS ORB "collect_details", 50 mm macro orbit, DOF on background orbs + beams.
 *  M3   26        (269–295) glitch · `when enjoyment ≥ 1.7` typed on smoked glass, grazing 24 mm track along the line.
 *  M4   27        (295–322) whip ↓ · TOP-DOWN god shot spinning + crash zoom onto the decision "Happy start matched".
 *  M5   28        (322–336) cyan flash · CLERK ✓ create_lead, dutch −14° push-in, check stamps in.
 *  M6   28.5      (336–349) whip ← · AVATAR WINK, low-angle macro orbit.
 *  M7   29        (349–363) glitch · TYPED SIGNALS fly-through (chips rush past the lens).
 *  M8   29.5      (363–376) zoom-through · WARP: holo tunnel + max speed lines, the core returns at centre.
 * ── NEAR SILENCE 30–32 ───────────────────────────────────────────────────────────────────────────────────────────
 *  C    30 → 32   (376–430) COLLAPSE · the warp implodes into one glint at centre (contracting ring), motes are sucked
 *                            in, tiny tracked-out "INTRODUCING" (30.5), a flare slowly charges; at 31.5 the label is
 *                            pulled in and the flare inhales to a pinpoint → frame 859 near-black. s03 explodes at 860.
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import type {SceneProps} from '../cine/types';
import {B, kick, clamp, lerp, band} from '../lib';
import {
  World, Obj, FloorGrid, CamSpec, CamKey, V3, addCam, handheld, kickPush, camPath, camMotion, resolveCam, project, depthOf,
  MotionBlur, Shots, Shot, whip, zoomThrough, flashCut, glitchCut, cut, beatsToLocal, makeRamp, rackFocus,
} from '../cine';
import {LensFlare, Glint, LightStreak, Flash, DustField, HoloTunnel, SpeedLines} from '../vfx';
import {SignalBars3D, TypedChip, Beam3D} from '../ui';
import {Statement, HudLabel, GRAD_H, WordSpec} from './s02/type';
import {BuildSky, CoreGlow, WarpBG, InwardMotes, ContractRing} from './s02/env';
import {CodeLine, DecisionPill, DecisionRow, ClerkCard, AvatarHalo, HoloOrb, HOLO, rv} from './s02/fragments';

/* ------------------------------------------------------------------ */
/* Build set (world px; +y down)                                        */
/* ------------------------------------------------------------------ */
const FLOOR = 280;
const L1 = {size: 200, y: FLOOR - 104, z: 0};
const L2 = {size: 340, y: FLOOR - 178, z: -3400};
const CORE: V3 = [0, -4600, -22000];

const ease = {
  in3: (u: number) => u * u * u,
  out3: (u: number) => 1 - Math.pow(1 - u, 3),
  inExpo: (u: number) => (u <= 0 ? 0 : Math.pow(2, 10 * u - 10)),
};

/** Floating holo shards for parallax/depth (cheap gradient panes). */
const SHARDS: {p: V3; w: number; h: number; ry: number; rz: number; kind: number}[] = [
  {p: [-1250, -420, -900], w: 260, h: 150, ry: 24, rz: -4, kind: 0},
  {p: [1320, -260, -1700], w: 320, h: 120, ry: -28, rz: 3, kind: 1},
  {p: [-760, -760, -2600], w: 220, h: 220, ry: 12, rz: 8, kind: 2},
  {p: [980, -900, -4300], w: 300, h: 160, ry: -14, rz: -6, kind: 0},
  {p: [-1500, -180, -5200], w: 280, h: 140, ry: 30, rz: 2, kind: 1},
  {p: [420, -1250, -6400], w: 240, h: 240, ry: -8, rz: -10, kind: 2},
  {p: [-380, -520, -1350 + L2.z], w: 260, h: 120, ry: 18, rz: 5, kind: 1},
  {p: [700, -420, 900 + L2.z], w: 230, h: 140, ry: -22, rz: -5, kind: 0},
];
const Shard: React.FC<{w: number; h: number; kind: number; f: number; i: number}> = ({w, h, kind, f, i}) => (
  <div style={{width: w, height: h, borderRadius: 18, position: 'relative', overflow: 'hidden',
    background: 'linear-gradient(150deg, rgba(70,44,130,0.55), rgba(20,10,44,0.42) 60%, rgba(40,90,120,0.3))',
    boxShadow: 'inset 0 0 0 1.5px rgba(190,170,255,0.55), inset 0 1px 0 rgba(255,255,255,0.4), 0 0 40px rgba(140,107,234,0.35)'}}>
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 2, background: 'linear-gradient(90deg, transparent, #B49BF2, #7FE7FF, transparent)'}} />
    {kind === 0 && (
      <div style={{position: 'absolute', left: 18, right: 18, bottom: 16, top: 34, display: 'flex', gap: 7, alignItems: 'flex-end'}}>
        {Array.from({length: 9}, (_, k) => {
          const v = 0.25 + 0.7 * Math.abs(Math.sin(k * 1.3 + i + f / 11));
          const c = v > 0.62 ? '#45E3B0' : v < 0.35 ? '#FFC04D' : '#AA8CFF';
          return <div key={k} style={{flex: 1, height: `${v * 100}%`, borderRadius: 6, background: `linear-gradient(to top, ${c}55, ${c})`, boxShadow: `0 0 10px ${c}`}} />;
        })}
      </div>
    )}
    {kind === 1 && (
      <div style={{position: 'absolute', left: 20, top: 30, right: 20}}>
        {[0.8, 0.55, 0.7].map((wv, k) => <div key={k} style={{height: 10, borderRadius: 5, width: `${wv * 100}%`, marginBottom: 14, background: k === 0 ? 'rgba(127,231,255,0.7)' : 'rgba(205,187,255,0.45)'}} />)}
      </div>
    )}
    {kind === 2 && (
      <div style={{position: 'absolute', left: '50%', top: '50%', width: w * 0.5, height: w * 0.5, marginLeft: -w * 0.25, marginTop: -w * 0.25, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.8), rgba(127,231,255,0.35) 40%, rgba(140,107,234,0.5) 85%)', boxShadow: '0 0 30px rgba(127,231,255,0.6)'}} />
    )}
  </div>
);

/** One statement line + its floor reflection. */
const LineObj: React.FC<{words: WordSpec[]; size: number; y: number; z: number; t: number; f: number; weight?: number; pulse?: number; nearFade?: [number, number]; refl?: number}> = ({words, size, y, z, t, f, weight, pulse = 0, nearFade, refl = 0.2}) => (
  <>
    <Obj x={0} y={y} z={z} nearFade={nearFade} dof={false}>
      <Statement words={words} t={t} f={f} size={size} weight={weight} pulse={pulse} />
    </Obj>
    {refl > 0 && (
      <Obj x={0} y={2 * FLOOR - y + size * 0.02} z={z} nearFade={nearFade} dof={false} o={refl}
        innerStyle={{transform: 'scaleY(-1)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 38%, rgba(0,0,0,1) 100%)', maskImage: 'linear-gradient(to bottom, transparent 38%, rgba(0,0,0,1) 100%)'}}>
        <Statement words={words} t={t} f={f} size={size} weight={weight} glow={0} />
      </Obj>
    )}
  </>
);

/** Montage frame: a fragment world over the warp background, motion blur, a light-streak bundle and tiny HUD labels. */
type MontProps = {t: number; from: number; warpI: number; warpTravel: number; t0: number; cam: CamSpec; aperture?: number; focus?: number | V3; children: React.ReactNode; label: string; sub: string; vx?: number; vy?: number; streak?: {start: number; angle: number; color?: string; offset?: number}; tint?: string};
const MontFrame: React.FC<MontProps> = ({t, from, warpI, warpTravel, t0, cam, aperture = 0, focus, children, label, sub, vx = 0, vy = 0, streak, tint}) => {
    const body = (
      <AbsoluteFill>
        <World camera={cam} aperture={aperture} focus={focus} backdrop={<WarpBG I={warpI} travel={warpTravel} frame={t} from={from} tint={tint} />}>
          {children}
        </World>
      </AbsoluteFill>
    );
    return (
      <AbsoluteFill>
        {Math.hypot(vx, vy) > 2 ? <MotionBlur vx={vx} vy={vy}>{body}</MotionBlur> : body}
        {streak && <LightStreak start={streak.start} dur={18} angle={streak.angle} count={6} spread={620} offset={streak.offset ?? 0} length={1100} color={streak.color ?? 'cyan'} intensity={0.9} frame={t} seed={Math.round(streak.start)} />}
        <div style={{position: 'absolute', left: 128, top: 138}}>
          <HudLabel color={HOLO.cyan} size={14}>{label}</HudLabel>
          <div style={{fontFamily: "'DejaVu Sans Mono', monospace", fontSize: 13, color: 'rgba(205,187,255,0.7)', marginTop: 6}}>{sub}</div>
        </div>
        <div style={{position: 'absolute', right: 128, top: 138, fontFamily: "'DejaVu Sans Mono', monospace", fontSize: 13, color: 'rgba(205,187,255,0.6)', letterSpacing: '0.12em'}}>{`T+${((t - t0) / 60).toFixed(3)}s`}</div>
      </AbsoluteFill>
    );
};

export const Scene: React.FC<SceneProps> = ({from, dur}) => {
  const t = useCurrentFrame();
  const f = t + from;
  const L = (k: number) => beatsToLocal(from, k);

  // light pulse on the half-time kicks (global frame)
  const pulse = kick(f, 11);

  const W1: WordSpec[] = [
    {w: 'What', at: L(16)}, {w: 'if', at: L(16.5)}, {w: 'you', at: L(17)}, {w: 'could', at: L(17.5), gap: 0},
  ];
  const W2: WordSpec[] = [
    {w: 'see', at: L(20), fill: 'signal', gap: 0.2}, {w: 'it', at: L(20.5), gap: 0.2}, {w: 'think?', at: L(21), fill: GRAD_H, gap: 0},
  ];

  /* ---------------- warp speed (montage) — integrated so it never jumps across cuts ---------------- */
  const wa = L(22), wb = L(30);
  const wu = clamp((t - wa) / (wb - wa));
  const warpI = t < wa ? 0 : 0.08 + 1.05 * Math.pow(wu, 1.6);
  const warpTravel = (wb - wa) * (0.012 * wu + 0.11 * Math.pow(wu, 3) / 3) * 1 + t * 0.004;

  /* ---------------- build world ---------------- */
  const buildWorld = ({cam, aperture = 0, focus, coreI, l2Fade, l1Fade, flare = 1, dust = 1}: {cam: CamSpec; aperture?: number; focus?: number | V3; coreI: number; lt: number; l2Fade?: [number, number]; l1Fade?: [number, number]; flare?: number; dust?: number}) => {
    const rc = resolveCam(cam);
    const cp = project(rc, CORE);
    return (
      <AbsoluteFill>
        <World camera={rc} aperture={aperture} focus={focus}
          backdrop={<>
            <BuildSky from={from} floorY={FLOOR} />
            <CoreGlow p={CORE} intensity={coreI} size={300} />
            <FloorGrid y={FLOOR} step={160} extent={5200} center={[0, -3500]} fade={[1800, 5200]} far={15000} opacity={0.42} color="rgb(170,145,255)" width={2} nearFade={260} />
          </>}>
          {SHARDS.map((s, i) => (
            <Obj key={i} x={s.p[0]} y={s.p[1] + 14 * Math.sin((t + i * 40) / 50)} z={s.p[2]} ry={s.ry} rz={s.rz} nearFade={[60, 420]}>
              <Shard w={s.w} h={s.h} kind={s.kind} f={f} i={i} />
            </Obj>
          ))}
          <LineObj words={W1} size={L1.size} y={L1.y} z={L1.z} t={t} f={f} weight={800} nearFade={l1Fade} />
          <LineObj words={W2} size={L2.size} y={L2.y} z={L2.z} t={t} f={f} weight={900} pulse={pulse} nearFade={l2Fade} />
        </World>
        <DustField count={110} camX={-rc.pos[0] * 0.15} camY={-rc.pos[1] * 0.15} boost={pulse * 0.8} frame={t} opacity={0.7 * dust} />
        {cp.visible && flare > 0 && (
          <LensFlare x={cp.x} y={cp.y} intensity={(0.28 + 0.75 * pulse + 0.15 * band(f, 4)) * flare * coreI} scale={0.8} streak={0.9} ghosts={0.6} rays={10} ring={false} veil={0.35} frame={t} />
        )}
      </AbsoluteFill>
    );
  };

  /* SH1 · ignition, low angle */
  const sh1 = (lt: number) => {
    const keys: CamKey[] = [
      {at: 0, pos: [-170, FLOOR - 30, 1360], lookAt: [40, FLOOR - 230, -3000], focal: 20, roll: -2.5},
      {at: 60, pos: [-90, FLOOR - 34, 1060], roll: -1.2},
    ];
    const cam = addCam(camPath(lt, keys), handheld(lt, 0.6, 2), kickPush(f, 70, 10));
    const lights = clamp(0.2 + lt / 5); // black → lit on the kick
    return (
      <AbsoluteFill style={{filter: lights < 1 ? `brightness(${lights.toFixed(3)})` : undefined}}>
        {buildWorld({cam: cam, coreI: 0.9 + 0.9 * pulse, lt: lt})}
      </AbsoluteFill>
    );
  };

  /* SH2 · high dutch lateral track */
  const sh2 = (lt: number) => {
    const keys: CamKey[] = [
      {at: 0, pos: [1260, -560, 1650], lookAt: [-160, FLOOR - 150, -500], focal: 30, roll: 8},
      {at: 60, pos: [760, -470, 1330], roll: 6},
    ];
    const cam = addCam(camPath(lt, keys), handheld(lt, 0.7, 5), kickPush(f, 60, 10));
    return buildWorld({cam: cam, coreI: 0.9 + 0.9 * pulse, lt: lt});
  };

  /* SH3 · "see it think?" hero with rack focus */
  const sh3 = (lt: number) => {
    const keys: CamKey[] = [
      {at: 0, pos: [-70, FLOOR - 110, L2.z + 2250], lookAt: [0, FLOOR - 300, L2.z], focal: 26, roll: 1.5},
      {at: 56, pos: [40, FLOOR - 95, L2.z + 1900], roll: -1},
    ];
    const cam = addCam(camPath(lt, keys), handheld(lt, 0.55, 7), kickPush(f, 70, 10));
    const rc = resolveCam(cam);
    const near = depthOf(rc, SHARDS[7].p), far = depthOf(rc, [0, L2.y, L2.z]);
    const focus = rackFocus(lt, near, far, 2, 18);
    return buildWorld({cam: cam, aperture: 9, focus: focus, coreI: 1 + 0.9 * pulse, lt: lt});
  };

  /* SH4 · the dive over the line into the core (speed ramp: snap on the kick, glide, expo-in) */
  const r4 = makeRamp([{speed: 2.6, until: 8}, {speed: 0.45, until: 36}, {speed: 3.2}], 7);
  const sh4At = (x: number): CamSpec => {
    const tau = r4.time(x);
    const keys: CamKey[] = [
      {at: 0, pos: [340, FLOOR - 60, L2.z + 2000], lookAt: CORE, focal: 20, roll: 6},
      {at: 30, pos: [120, -560, L2.z + 250], roll: 2},
      {at: 64, pos: [0, -900, L2.z - 2000], roll: -3},
      {at: 92, ease: 'expoIn', pos: [0, -2200, L2.z - 11000], roll: -8},
    ];
    return camPath(tau, keys);
  };
  const sh4 = (lt: number) => {
    const cam = addCam(sh4At(lt), handheld(lt, 0.9, 9), kickPush(f, 80, 9));
    const m = camMotion(sh4At, Math.max(0, lt));
    const end = clamp((lt - 34) / 20);
    const coreI = 1 + 0.9 * pulse + 3.2 * Math.pow(end, 2.2);
    return (
      <MotionBlur vx={m.dx * 0.6} vy={m.dy * 0.6}>
        {buildWorld({cam: cam, coreI: coreI, lt: lt, l2Fade: [80, 700], l1Fade: [80, 500], dust: 1 - end})}
        <SpeedLines intensity={warpI} travel={warpTravel} count={260} glow={0.5} frame={t} />
      </MotionBlur>
    );
  };

  /* ---------------- montage ---------------- */
  const mc = {t, from, warpI, warpTravel, t0: L(24)};

  // M1 · signal field, extreme low angle
  const m1At = (x: number) => camPath(x, [
    {at: 0, pos: [-1250, -70, 1200], lookAt: [-120, -300, -60], focal: 19, roll: -13},
    {at: 30, ease: 'expoOut', pos: [-260, -55, 820], lookAt: [220, -340, -160], roll: -7},
  ]);
  const m1 = (lt: number) => {
    const m = camMotion(m1At, lt, [0, -250, 0]);
    return (
      <MontFrame {...mc} cam={addCam(m1At(lt), handheld(lt, 1.2, 11))} label="Judge · signal wall" sub="45 typed signals · live" vx={m.dx * 0.5} vy={m.dy * 0.5} streak={{start: L(24) - 4, angle: 8, offset: -220}}>
        <Obj x={0} y={0} z={0}>
          <SignalBars3D layout="field" f={f} t={999} tilt={90} cols={9} rows={4} count={36} barW={58} gap={42} maxH={560} labels={false} highlight={13}
            values={(i, ff) => clamp(0.14 + 0.86 * Math.abs(Math.sin(i * 2.17 + ff * 0.19)) * (0.62 + 0.38 * Math.sin(i * 0.71 + ff * 0.05)))} />
        </Obj>
      </MontFrame>
    );
  };

  // M2 · glass orb macro orbit
  const m2At = (x: number) => camPath(x, [
    {at: 0, target: [0, 0, 0], yaw: 42, pitch: 12, dist: 2100, focal: 50, roll: -10},
    {at: 28, ease: 'expoOut', yaw: 8, pitch: -3, dist: 1650, roll: 3},
  ]);
  const m2 = (lt: number) => {
    const cam = addCam(m2At(lt), handheld(lt, 1, 12));
    const m = camMotion(m2At, lt);
    return (
      <MontFrame {...mc} cam={cam} aperture={8} focus={[0, 0, 0]} label="State · collect_details" sub="active · token arrived" vx={m.dx * 0.5} vy={m.dy * 0.5} streak={{start: L(25) - 2, angle: 172, color: 'violet', offset: 160}}>
        {/* beams stop short of every orb plane: a ribbon crossing an orb's plane forces a BSP split (light square artefact) */}
        <Obj x={0} y={0} z={0}><Beam3D a={[-60, 12, -90]} b={[-760, 158, -1030]} o={0.9} thick={3} pulse={(lt / 20) % 1} /></Obj>
        <Obj x={0} y={0} z={0}><Beam3D a={[60, -15, -110]} b={[900, -218, -1700]} o={0.8} thick={3} color="205,187,255" pulse={((lt + 10) / 22) % 1} /></Obj>
        <Obj x={-820} y={170} z={-1100} billboard><HoloOrb size={300} label="discover" icon="chat" tone="lilac" active={0.4} t={t} /></Obj>
        <Obj x={950} y={-230} z={-1800} billboard><HoloOrb size={300} label="booked" icon="calendar" tone="green" active={0.3} t={t} /></Obj>
        <Obj x={0} y={0} z={0} billboard><HoloOrb size={440} label="collect_details" icon="doc" tone="cyan" active={1} t={t * 1.6} p={0.4 + 0.6 * rv(lt, -2, 10)} /></Obj>
      </MontFrame>
    );
  };

  // M3 · policy code line, grazing track
  const m3At = (x: number) => camPath(x, [
    {at: 0, pos: [-1550, -250, 760], lookAt: [-300, 0, 0], focal: 24, roll: 7},
    {at: 30, ease: 'expoOut', pos: [-560, -150, 1180], lookAt: [180, 10, 0], roll: 3},
  ]);
  const m3 = (lt: number) => {
    const m = camMotion(m3At, lt);
    return (
      <MontFrame {...mc} cam={addCam(m3At(lt), handheld(lt, 1.1, 13))} label="Policy · when / and / then" sub="acknowledge_happy_start · global" vx={m.dx * 0.5} vy={m.dy * 0.5} streak={{start: L(26) - 3, angle: 0, color: 'violet', offset: 260}}>
        <Obj x={0} y={0} z={0}>
          <CodeLine p={clamp((lt + 3) / 15)} t={lt} sheen={clamp((lt - 6) / 18)} flash={Math.max(0, 1 - lt / 8)} />
        </Obj>
      </MontFrame>
    );
  };

  // M4 · top-down spinning crash zoom on the decision
  const m4At = (x: number) => camPath(x, [
    {at: 0, target: [0, 0, 0], yaw: -62, pitch: -88, dist: 2700, focal: 26},
    {at: 28, ease: 'expoOut', yaw: -6, pitch: -80, dist: 1080},
  ]);
  const m4 = (lt: number) => {
    const cam = addCam(m4At(lt), handheld(lt, 1, 14));
    return (
      <MontFrame {...mc} cam={cam} label="Decision · runtime" sub="policy matched · turn 8" streak={{start: L(27) - 3, angle: 32, color: 'pistachio', offset: -380}}>
        {/* HUD ring on the floor */}
        <Obj x={0} y={2} z={0} rx={90}>
          <div style={{width: 1500, height: 1500, borderRadius: '50%', border: '2px dashed rgba(127,231,255,0.35)', boxShadow: 'inset 0 0 120px rgba(69,227,176,0.18), 0 0 60px rgba(127,231,255,0.15)', transform: `rotate(${(lt * 1.5).toFixed(1)}deg)`}} />
        </Obj>
        <Obj x={0} y={1} z={0} rx={90}>
          <div style={{width: 1040, height: 1040, borderRadius: '50%', border: '1.5px solid rgba(205,187,255,0.3)', background: 'radial-gradient(closest-side, rgba(69,227,176,0.16), transparent 70%)'}} />
        </Obj>
        <Obj x={-60} y={0} z={300} rx={90}><DecisionRow size={40} o={0.75} /></Obj>
        <Obj x={0} y={-1} z={-40} rx={90}><DecisionPill p={clamp((lt - 1) / 9)} t={lt} size={66} pulse={Math.max(0, 1 - Math.abs(lt - 8) / 8)} /></Obj>
      </MontFrame>
    );
  };

  // M5 · Clerk ✓
  const m5At = (x: number) => camPath(x, [
    {at: 0, pos: [620, -380, 1750], lookAt: [0, 0, 0], focal: 32, roll: -15},
    {at: 16, ease: 'expoOut', pos: [280, -200, 1100], roll: -11},
  ]);
  const m5 = (lt: number) => (
    <MontFrame {...mc} cam={addCam(m5At(lt), handheld(lt, 1.3, 15))} label="Clerk · async function" sub="create_lead → L-2048" streak={{start: L(28) - 2, angle: 200, offset: 300}}>
      <Obj x={0} y={0} z={0} ry={-16}><ClerkCard p={clamp((lt - 1) / 7)} t={lt} flash={Math.max(0, 1 - lt / 6)} /></Obj>
    </MontFrame>
  );

  // M6 · avatar wink
  const m6At = (x: number) => camPath(x, [
    {at: 0, target: [0, 0, 0], yaw: -34, pitch: 20, dist: 1650, focal: 40, roll: 11},
    {at: 15, ease: 'expoOut', yaw: -8, pitch: 9, dist: 1200, roll: 4},
  ]);
  const m6 = (lt: number) => {
    const wink = lt < 3 ? 0 : lt < 6 ? (lt - 3) / 3 : lt < 11 ? 1 : 1 - (lt - 11) / 4;
    return (
      <MontFrame {...mc} cam={addCam(m6At(lt), handheld(lt, 1.3, 16))} label="Speaker · voice" sub="writes the reply" streak={{start: L(28.5) - 2, angle: -20, color: 'violet'}}>
        <Obj x={0} y={0} z={0} billboard><AvatarHalo size={420} wink={clamp(wink)} t={t} /></Obj>
      </MontFrame>
    );
  };

  // M7 · typed signals fly-through
  const m7At = (x: number) => camPath(x, [
    {at: 0, pos: [60, -40, 2300], lookAt: [0, 0, -3000], focal: 22, roll: -6},
    {at: 16, ease: 'cubicIn', pos: [-40, 20, 300], roll: 6},
  ]);
  const chips: [string, string, number, 'score' | 'noul' | 'choice', V3][] = [
    ['enjoyment', '1.7', 0.91, 'score', [-330, -150, 1500]],
    ['goal_clear', 'yes', 0.94, 'noul', [360, 110, 900]],
    ['intent', 'booking', 0.88, 'choice', [-300, 190, 250]],
    ['frustration', '0.12', 0.86, 'score', [300, -200, -500]],
  ];
  const m7 = (lt: number) => (
    <MontFrame {...mc} cam={addCam(m7At(lt), handheld(lt, 1.4, 17))} label="Typed signals" sub="noul · score · choice" streak={{start: L(29) - 2, angle: 160, offset: -200}}>
      {chips.map(([n, v, c, k, p], i) => (
        <Obj key={n} x={p[0]} y={p[1]} z={p[2]} billboard nearFade={[60, 500]}>
          <TypedChip name={n} value={v} conf={c} kind={k} look="holo" size={58} glow={0.9} pulse={0.4} />
        </Obj>
      ))}
    </MontFrame>
  );

  // M8 · warp tunnel, the core returns
  const m8 = (lt: number) => {
    const u = clamp(lt / 13);
    const tr = warpTravel * 6 + u * u * 4;
    return (
      <AbsoluteFill style={{background: '#04020A'}}>
        <HoloTunnel travel={tr} roll={-12 + lt * 2.2} intensity={0.85} speed={0} frame={t} />
        <SpeedLines intensity={1.25} travel={warpTravel * 1.4} count={360} glow={0.7} frame={t} />
        <AbsoluteFill style={{background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,${(0.55 + 0.4 * u).toFixed(3)}) 0%, rgba(200,245,255,${(0.35 + 0.3 * u).toFixed(3)}) ${(3 + 4 * u).toFixed(1)}%, rgba(140,107,234,0.18) ${(16 + 10 * u).toFixed(1)}%, transparent 45%)`}} />
        <Glint x={960} y={540} size={260 + 120 * u} intensity={1 + 0.6 * u} frame={t} />
      </AbsoluteFill>
    );
  };

  /* ---------------- collapse 30 → 32 ---------------- */
  const collapse = (lt: number) => {
    const imp = clamp(lt / 9); // implosion of the warp
    const sc = 1 - ease.inExpo(imp) * 0.995 - imp * 0.004;
    const end = clamp((lt - 44) / 9); // final inhale 31.6 → 32
    const charge = clamp((lt - 12) / 34);
    const flashI = lt >= 8 ? Math.exp(-(lt - 8) / 4) : 0;
    const glintI = lt < 8 ? 0 : 0.55 + 1.1 * flashI + 1.0 * Math.pow(charge, 1.4) + 0.6 * end;
    const glintS = (150 + 120 * charge) * (1 - 0.7 * end) + 60 * flashI;
    const flareI = (0.05 + 0.55 * Math.pow(charge, 1.6)) * (1 - 0.65 * end);
    const labelIn = clamp((lt - (L(30.5) - L(30))) / 12);
    const labelSuck = clamp((lt - (L(31.5) - L(30))) / 9);
    const track = 0.42 + 0.5 * (1 - Math.pow(1 - clamp((lt - (L(30.5) - L(30))) / 30), 3)) - 1.1 * ease.in3(labelSuck);
    return (
      <AbsoluteFill style={{background: '#020106'}}>
        <AbsoluteFill style={{background: `radial-gradient(60% 55% at 50% 50%, rgba(60,30,120,${(0.22 * charge * (1 - end)).toFixed(3)}), transparent 70%)`}} />
        {imp < 1 && (
          <AbsoluteFill style={{transform: `scale(${Math.max(0.001, sc).toFixed(4)})`, transformOrigin: '50% 50%', opacity: 1 - imp * 0.5, WebkitMaskImage: 'radial-gradient(closest-side, black 35%, transparent 100%)', maskImage: 'radial-gradient(closest-side, black 35%, transparent 100%)', filter: `brightness(${(1 + 1.5 * imp).toFixed(3)})`}}>
            {m8(13 + lt)}
          </AbsoluteFill>
        )}
        <ContractRing p={lt / 10} />
        <InwardMotes t={lt} pull={0.25 + 0.75 * charge} count={64} opacity={clamp((lt - 8) / 8) * (1 - end)} />
        {flareI > 0.02 && <LensFlare x={960} y={540} intensity={flareI} scale={0.7} streak={0.35 + 0.75 * charge - 0.85 * end} ghosts={0.25} rays={0} ring={false} veil={0.25} flicker={0.15} frame={t} />}
        {glintI > 0.01 && <Glint x={960} y={540} size={glintS} intensity={glintI} spin={0.6} frame={t} />}
        {labelIn > 0 && labelSuck < 1 && (
          <div style={{position: 'absolute', left: 0, right: 0, top: 606, display: 'flex', justifyContent: 'center', opacity: labelIn * (1 - ease.in3(labelSuck)),
            transform: `translateY(${(-62 * ease.in3(labelSuck)).toFixed(2)}px) scale(${(1 - 0.6 * ease.in3(labelSuck)).toFixed(4)})`}}>
            <HudLabel color="#DCD0FF" size={19} tracking={`${Math.max(-0.4, track).toFixed(3)}em`} style={{paddingLeft: `${Math.max(0, track).toFixed(3)}em`, textShadow: '0 0 14px rgba(170,140,255,0.8)'}}>Introducing</HudLabel>
          </div>
        )}
      </AbsoluteFill>
    );
  };

  /* ---------------- shots ---------------- */
  const shots: Shot[] = [
    {name: 'SH1 ignition', from: L(16), to: L(18), render: (lt) => sh1(lt)},
    {name: 'SH2 high dutch', from: L(18), to: L(20), in: flashCut({dur: 8, split: 0.25, peak: 0.42, color: '#CDBBFF', punch: 0.04}), render: (lt) => sh2(lt)},
    {name: 'SH3 see it think', from: L(20), to: L(22), in: zoomThrough({dur: 14, depth: 2.2, color: '#DCCBFF'}), render: (lt) => sh3(lt)},
    {name: 'SH4 dive', from: L(22), to: L(24), in: whip({dir: 'up', dur: 10, color: '#CDBBFF'}), render: (lt) => sh4(lt)},
    {name: 'M1 bars', from: L(24), to: L(25), in: flashCut({dur: 12, split: 0.5, peak: 1, color: '#EAFBFF', punch: 0.08}), render: (lt) => m1(lt)},
    {name: 'M2 orb', from: L(25), to: L(26), in: whip({dir: 'right', dur: 8}), render: (lt) => m2(lt)},
    {name: 'M3 code', from: L(26), to: L(27), in: glitchCut({dur: 8, slices: false, seed: 2}), render: (lt) => m3(lt)},
    {name: 'M4 decision', from: L(27), to: L(28), in: whip({dir: 'down', dur: 8, color: '#E7F4B9'}), render: (lt) => m4(lt)},
    {name: 'M5 clerk', from: L(28), to: L(28.5), in: flashCut({dur: 6, peak: 0.6, color: '#7FE7FF'}), render: (lt) => m5(lt)},
    {name: 'M6 avatar', from: L(28.5), to: L(29), in: whip({dir: 'left', dur: 7}), render: (lt) => m6(lt)},
    {name: 'M7 chips', from: L(29), to: L(29.5), in: glitchCut({dur: 6, slices: false, seed: 5}), render: (lt) => m7(lt)},
    {name: 'M8 warp', from: L(29.5), to: L(30), in: zoomThrough({dur: 8, depth: 1.8}), render: (lt) => m8(lt)},
    {name: 'C collapse', from: L(30), to: dur, in: cut(), render: (lt) => collapse(lt)},
  ];

  return (
    <AbsoluteFill style={{background: '#04020A'}}>
      <Shots shots={shots} t={t} />
      {/* light pulse on the half-time kicks: bloom from the core direction */}
      {t < L(24) && <Flash at={L(16)} dur={20} color="violet" max={0.22} bloom x={960} y={420} frame={t} />}
      {t < L(24) && <Flash at={L(20)} dur={18} color="violet" max={0.18} bloom x={960} y={470} frame={t} />}
    </AbsoluteFill>
  );
};
