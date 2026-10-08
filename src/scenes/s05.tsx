/* =====================================================================================================
 * s05 · STATES — beats 52–64 (global frames 1397–1719) · Drop-1 groove, kick on every beat
 * -----------------------------------------------------------------------------------------------------
 * The state graph as a holographic structure in deep space: glass orbs (GlassOrbNode, billboarded CSS 3D)
 * joined by light-trail edges (camera-projected SVG ribbons with a software z-test against the orbs),
 * energy pulses, floor light pools + reflections, and a comet token that runs the happy path.
 *
 * SHOT LIST (every cut on B(k))                                       transition IN        camera
 *  1  52.0–54.0  GOD        top-down god shot on the start orb, yaw     zoomThrough (½,      28mm, pitch −89
 *                           spin + crane up; start pops 52 · trail ·     from s04)
 *                           discover 53; floor "map table" rings
 *                           HUD counters; "Map every step." 53/53.5/54
 *  2  54.0–56.0  GOD TRACK  tilted overhead (−62°) tracking +x with the  whip → right         30mm
 *                           build front: collect_details 54, follow_up 55;
 *                           frost "Collect details" state editor springs
 *                           out of the orb on 54.5 (types the prompt)
 *  3  56.0–58.0  TILT       booked lands ON the cut (flare burst); crane  flashCut             23mm, −87° → +8.5°,
 *                           from top-down into a low-angle hero near the floor, dutch;          dutch −6°
 *                           branch → human_handoff draws, pops 57.5
 *                           ("needs a person"); "Branch anywhere." 57/57.5
 *  4  58.0–60.0  HERO DUTCH low angle from the other side (+10° roll)     whip → left          20mm, pitch +11
 *                           cycle follow_up→discover "needs more" arcs overhead 58→59,
 *                           dashed return human_handoff→discover 58.5→59.5, volumetric beams
 *  5  60.0–62.0  FLY A      flash → in-camera rocket dolly from far behind flashCut + dolly    18mm free cam
 *                           the start orb into a chase cam behind the token:
 *                           start→discover(61)→collect(62); per-hop speed
 *                           ramp (whip between orbs, slow-mo glide past them), speed lines,
 *                           reticle locks the active state, "Current state ▸ …"
 *  6  62.0–64.0  FLY B      whip past collect_details → low side-track:  whip → right         18mm free cam
 *                           follow_up(63) → booked(63.5) lock, flare burst, god rays,
 *                           floor shockwave; push into booked → flashCut OUT (½) into s06 at 64
 * Life: handheld + kickPush (GLOBAL f) on every shot; audio-reactive SpaceBackdrop.
 * ===================================================================================================== */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import type {SceneProps} from '../cine/types';
import type {V3} from '../cine/types';
import {
  World, CamSpec, CamKey, ResolvedCam, addCam, handheld, kickPush, kickZoom, camPath, resolveCam, project,
  beatShots, whip, zoomThrough, flashCut, MotionBlur, Shots, smoothstep,
} from '../cine';
import type {ShotInfo} from '../cine';
import {SpaceBackdrop, DustField, Bokeh, Glint, FlareBurst, LensFlare, SpeedLines, VolumetricBeams, LightStreak, GodRays, Shockwave} from '../vfx';
import {B, clamp} from '../lib';
import {GraphBack, GraphLight, GraphOrbs, TokenState, graphCounts} from './s05/layers';
import {N, NODES, R, TOKEN_NODE_S, TOKEN_PATH, TOKEN_POLY, polyAt, polyDir, vAdd, vLerp, vNorm} from './s05/graph';
import {Headline, GraphHud, CurrentState, LockReticle} from './s05/copy';
import {StateEditorPane, EDITOR_W, EDITOR_H} from './s05/editor';

/* ------------------------------------------------------------------ */
/* token timing (GLOBAL frames): one hop per beat, speed-ramped        */
/* ------------------------------------------------------------------ */
const HOPS = [
  {a: 0, b: 1, f0: B(60), f1: B(61)},
  {a: 1, b: 2, f0: B(61), f1: B(62)},
  {a: 2, b: 3, f0: B(62), f1: B(63)},
  {a: 3, b: 4, f0: B(63), f1: B(63.5)},
];
/** fast–slow–fast per hop: leaves a node on a whip, glides in slow motion as it arrives */
const hopEase = (u: number) => 0.24 * u + 0.76 * (0.5 - 0.5 * Math.cos(Math.PI * clamp(u)));
const tokenS = (f: number) => {
  if (f <= HOPS[0].f0) return TOKEN_NODE_S[0];
  for (const h of HOPS) if (f < h.f1) return TOKEN_NODE_S[h.a] + (TOKEN_NODE_S[h.b] - TOKEN_NODE_S[h.a]) * hopEase((f - h.f0) / (h.f1 - h.f0));
  return TOKEN_NODE_S[4];
};
/** state the token is in (switches at arrival) + the frame it arrived */
const tokenState = (f: number) => {
  let id = TOKEN_PATH[0], at = B(60);
  for (const h of HOPS) if (f >= h.f1 - 2) { id = TOKEN_PATH[h.b]; at = h.f1; }
  return {id, at};
};
/** point on the token path, extrapolated before the start */
const pathPt = (sl: number): V3 => {
  if (sl >= 0) return polyAt(TOKEN_POLY, sl);
  const d = polyDir(TOKEN_POLY, 0);
  return vAdd(TOKEN_POLY.pts[0], [d[0] * sl, d[1] * sl, d[2] * sl]);
};

/* ------------------------------------------------------------------ */
/* view: one camera onto the whole graph world                          */
/* ------------------------------------------------------------------ */
const horizonY = (c: ResolvedCam) => {
  const yaw = c.yaw * Math.PI / 180;
  const p = project(c, [c.pos[0] + Math.sin(yaw) * 1e5, c.pos[1], c.pos[2] - Math.cos(yaw) * 1e5]);
  return p.visible ? p.y : -2000;
};

type ViewProps = {
  cam: CamSpec; f: number; uid: string; aperture?: number; focus?: number | V3; token?: TokenState | null;
  activeId?: string | null; mb?: {vx: number; vy: number}; extra?: React.ReactNode; under?: React.ReactNode; grid?: number; bokeh?: boolean; overscan?: boolean;
  /** a whip is smearing this shot: skip garnish nobody can see (dust, bokeh, speed lines, flares) */
  busy?: boolean;
};
const GraphView: React.FC<ViewProps> = ({cam, f, uid, aperture = 0, focus, token, activeId, mb, extra, under, grid, bokeh, overscan, busy}) => {
  const rc = resolveCam(cam);
  const hz = horizonY(rc);
  const topDown = smoothstep(-25, -60, rc.pitch);
  const body = (
    <AbsoluteFill>
      {/* overscan (only while a zoom-through landing scales the shot down) so the shot edge never shows; never
          during whips, where an overscan would spill onto the neighbouring shot on the strip */}
      <div style={overscan ? {position: 'absolute', left: -150, top: -85, width: 2220, height: 1250, background: '#04020A'} : {position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: overscan ? 150 : 0, top: overscan ? 85 : 0, width: 1920, height: 1080, transform: overscan ? 'scale(1.16)' : undefined}}>
          <SpaceBackdrop frame={f} from={0} camX={clamp(-rc.yaw * 10, -420, 420)} camY={clamp(-rc.pitch * 2.5, -240, 240)} horizon={clamp(overscan ? (hz - 540) / 1.16 + 540 : hz, -400, 1500)} haze={0.55 * (1 - topDown)} intensity={0.85} />
        </div>
      </div>
      {!busy && under}
      <World camera={rc} aperture={aperture} focus={focus} backdrop={<GraphBack f={f} uid={uid} activeId={activeId} grid={grid} />}>
        <GraphOrbs f={f} activeId={activeId} />
      </World>
      <GraphLight cam={rc} f={f} uid={uid} token={token} />
      {!busy && <DustField frame={f} camX={clamp(-rc.yaw * 14, -600, 600)} camY={clamp(-rc.pitch * 4, -300, 300)} count={130} opacity={0.75} />}
      {!busy && bokeh && <Bokeh frame={f} camX={clamp(-rc.yaw * 18, -600, 600)} count={16} opacity={0.5} />}
      {!busy && extra}
    </AbsoluteFill>
  );
  return mb && Math.hypot(mb.vx, mb.vy) > 1.5 ? <MotionBlur vx={mb.vx} vy={mb.vy} shutter={0.45}>{body}</MotionBlur> : body;
};

/** glints on orbs as they pop (projected), + a flare burst for the hero pops */
const PopGlints: React.FC<{rc: ResolvedCam; f: number; ids?: string[]}> = ({rc, f, ids}) => (
  <>
    {NODES.filter((n) => (!ids || ids.includes(n.id)) && f >= n.at - 1 && f < n.at + 26).map((n) => {
      const q = project(rc, n.p);
      if (!q.visible) return null;
      const d = f - n.at;
      const I = d < 0 ? 0.4 : 1.5 * Math.exp(-d / 7);
      return <Glint key={n.id} x={q.x} y={q.y - R * q.scale * 0.15} size={clamp(R * 3.4 * q.scale, 140, 520)} intensity={I} frame={f} color={n.start ? 'pistachio' : 'cyan'} />;
    })}
  </>
);

/** projected screen rect of an orb (for the reticle) */
const orbRect = (rc: ResolvedCam, id: string, pad = 1.18) => {
  const q = project(rc, N[id].p);
  const r = R * q.scale * pad;
  return {x: q.x - r, y: q.y - r, w: 2 * r, h: 2 * r, ok: q.visible && q.depth > 200, q};
};

/** The frost state editor springs out of collect_details as a floating inspector pane (right side), tied to
 *  the orb by a leader beam. Opens on 54.5, types the state prompt, flips away before the 56 cut. */
const EditorOverlay: React.FC<{f: number; rc: ResolvedCam}> = ({f, rc}) => {
  const at = B(54.5) - 3, outAt = B(55.75) - 6;
  if (f < at || f > outAt + 10) return null;
  const pin = 1 - Math.pow(1 - clamp((f - at) / 14), 4);
  const pout = Math.pow(clamp((f - outAt) / 9), 2.4);
  const sc = 0.8 * (0.82 + 0.18 * pin) * (1 - 0.15 * pout);
  const cx = 1506 + 60 * (1 - pin) + 160 * pout, cy = 728;
  const ry = -17 + 34 * (1 - pin) - 40 * pout, rx = 7 - 10 * (1 - pin);
  const o = clamp(pin * 1.6) * (1 - pout);
  const q = project(rc, N.collect_details.p);
  const ax = q.x + R * q.scale * 0.92, ay = q.y;
  const bx = cx - (EDITOR_W * sc) / 2 + 6, by = cy - 40;
  const lp = clamp((f - at) / 8);
  const mx = ax + (bx - ax) * lp, my = ay + (by - ay) * lp;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {q.visible && (
        <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, opacity: o}}>
          <path d={`M${ax.toFixed(1)} ${ay.toFixed(1)} C ${(ax + 120).toFixed(1)} ${ay.toFixed(1)}, ${(mx - 120).toFixed(1)} ${my.toFixed(1)}, ${mx.toFixed(1)} ${my.toFixed(1)}`} fill="none" stroke="rgba(127,231,255,0.35)" strokeWidth={10} strokeLinecap="round" />
          <path d={`M${ax.toFixed(1)} ${ay.toFixed(1)} C ${(ax + 120).toFixed(1)} ${ay.toFixed(1)}, ${(mx - 120).toFixed(1)} ${my.toFixed(1)}, ${mx.toFixed(1)} ${my.toFixed(1)}`} fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
          <circle cx={ax} cy={ay} r={7} fill="#fff" />
          <circle cx={ax} cy={ay} r={16} fill="rgba(127,231,255,0.35)" />
        </svg>
      )}
      <div style={{position: 'absolute', left: cx - EDITOR_W / 2, top: cy - EDITOR_H / 2, width: EDITOR_W, height: EDITOR_H, opacity: o < 1 ? o : undefined,
        transform: `perspective(1700px) rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg) scale(${sc.toFixed(4)})`}}>
        <StateEditorPane f={f} at={at} sheen={clamp((f - at - 6) / 26)} />
      </div>
    </AbsoluteFill>
  );
};

/** true while a whip transition is mid-smear over this shot (|d| small) */
const whipBusy = (info: ShotInfo) => {
  const ph = info.tin?.kind === 'whip' ? info.tin : info.tout?.kind === 'whip' ? info.tout : null;
  return !!ph && Math.abs(ph.d) <= 3;
};

/* ------------------------------------------------------------------ */
/* Scene                                                                */
/* ------------------------------------------------------------------ */
export const Scene: React.FC<SceneProps> = ({from, dur}) => {
  const t = useCurrentFrame();
  const f = t + from;
  const L = (k: number) => B(k) - from;
  const life = (lt: number, amp = 0.7, seed = 1) => [handheld(lt, amp, seed), kickPush(f, 20, 7)];

  /* 1 · GOD — top-down, spinning slowly, descending */
  const k1: CamKey[] = [
    {at: 0, target: [-1250, 0, 250], yaw: -40, pitch: -89, dist: 1200, focal: 28, roll: 0},
    {at: 8, dist: 1260, yaw: -38},
    {at: 32, ease: 'cubicInOut', target: [-980, 0, 240], dist: 1760, yaw: -25},
    {at: L(54) - L(52), ease: 'linear', target: [-800, 0, 240], dist: 1980, yaw: -16},
  ];
  /* 2 · GOD TRACK — tilted overhead, tracking the build front */
  const k2: CamKey[] = [
    {at: 0, target: [-60, 0, 250], yaw: -12, pitch: -63, dist: 2050, roll: -4, focal: 30},
    {at: L(56) - L(54), target: [560, 0, 210], yaw: 7, pitch: -57, dist: 1850, roll: 2},
  ];
  /* 3 · TILT — top-down → low-angle hero */
  const s3 = L(58) - L(56);
  const k3: CamKey[] = [
    {at: 0, target: [560, 0, 160], yaw: 14, pitch: -87, dist: 2950, roll: 0, focal: 23},
    {at: 7, yaw: 11, dist: 2850, target: [540, 0, 150]},
    {at: 40, ease: 'expoInOut', target: [190, 10, 350], yaw: -29, pitch: 8, dist: 2330, roll: -5, focal: 23},
    {at: s3, ease: 'linear', target: [170, 20, 350], yaw: -32, pitch: 8.5, dist: 2150, roll: -6},
  ];
  /* 4 · HERO DUTCH — low angle from the left, looking up at the cycle arc */
  const k4: CamKey[] = [
    {at: 0, target: [-60, -150, -60], yaw: 30, pitch: 11, dist: 1650, roll: 10, focal: 20},
    {at: L(60) - L(58), target: [150, -220, 0], yaw: 23, pitch: 10, dist: 1640, roll: 7},
  ];

  /* 5 · FLY A — chase cam behind the token */
  const chaseCam = (ff: number): CamSpec => {
    const sc = tokenS(ff - 5) - 560;
    const base = pathPt(sc);
    const dir = polyDir(TOKEN_POLY, Math.max(0, sc));
    const side: V3 = vNorm([-dir[2], 0, dir[0]]);
    const pos = vAdd(vAdd(base, [0, -230, 0]), [side[0] * 90, 0, side[2] * 90]);
    const look = vAdd(pathPt(tokenS(ff) + 160), [0, -40, 0]);
    return {pos, lookAt: look, focal: 18};
  };
  /* 6 · FLY B — low side-track, then push into booked */
  const sideCam = (ff: number): CamSpec => {
    const ts = tokenS(ff - 3);
    const base = pathPt(ts - 220);
    const arrive = smoothstep(B(63.3), B(64), ff);
    const posTrack: V3 = [base[0], 215, 470 + 0.55 * base[2]];
    const bk = N.booked.p;
    const posPush: V3 = [bk[0] - 230, bk[1] + 40, bk[2] + 560];
    const pos = vLerp(posTrack, posPush, arrive);
    const look = vLerp(vAdd(pathPt(tokenS(ff) + 420), [0, -40, -60]), bk, smoothstep(B(62.9), B(63.6), ff));
    return {pos, lookAt: look, focal: 18, roll: -6 + 7 * arrive};
  };

  const shots = beatShots(from, dur, [
    {
      beat: 52, name: 'god', in: zoomThrough({dur: 16, blur: 0}),
      render: (lt, _p, info) => {
        const cam = addCam(camPath(lt, k1), ...life(lt, 0.6, 1));
        const rc = resolveCam(cam);
        return <GraphView cam={rc} f={f} uid="s05a" busy={whipBusy(info)} overscan={lt < 9} activeId={f >= N.discover.at ? 'discover' : 'start'} extra={<PopGlints rc={rc} f={f} />} />;
      },
    },
    {
      beat: 54, name: 'god-track', in: whip({dir: 'right', dur: 10}),
      render: (lt, _p, info) => {
        const cam = addCam(camPath(lt, k2), ...life(lt, 0.7, 2));
        const rc = resolveCam(cam);
        const act = f >= N.follow_up.at ? 'follow_up' : 'collect_details';
        return <GraphView cam={rc} f={f} uid="s05b" busy={whipBusy(info)} activeId={act} extra={<><PopGlints rc={rc} f={f} /><EditorOverlay f={f} rc={rc} /></>} />;
      },
    },
    {
      beat: 56, name: 'tilt', in: flashCut({dur: 10, peak: 0.85}),
      render: (lt, _p, info) => {
        const cam = addCam(camPath(lt, k3), ...life(lt, 0.6, 3));
        const rc = resolveCam(cam);
        const bq = project(rc, N.booked.p);
        return (
          <GraphView cam={rc} f={f} uid="s05c" busy={whipBusy(info)} activeId={f >= N.human_handoff.at ? 'human_handoff' : 'booked'} bokeh
            extra={<>
              <PopGlints rc={rc} f={f} ids={['human_handoff']} />
              {bq.visible && <FlareBurst at={L(56)} x={bq.x} y={bq.y} dur={60} peak={1.5} scale={0.85} flash={0.25} sustain={0.0} seed={5} />}
            </>} />
        );
      },
    },
    {
      beat: 58, name: 'hero-dutch', in: whip({dir: 'left', dur: 9}),
      render: (lt, _p, info) => {
        const cam = addCam(camPath(lt, k4), ...life(lt, 0.8, 4));
        const rc = resolveCam(cam);
        return (
          <GraphView cam={rc} f={f} uid="s05d" busy={whipBusy(info)} activeId="discover" bokeh
            under={<VolumetricBeams frame={f} intensity={0.55} beams={[{x: 620, y: -140, angle: 78, width: 10, length: 1500, sweep: 5, color: 'lilac'}, {x: 1380, y: -160, angle: 104, width: 8, length: 1400, sweep: 6, color: 'cyan'}]} />} />
        );
      },
    },
    {
      beat: 60, name: 'fly-a', in: flashCut({dur: 10, split: 0.35, peak: 0.8, color: '#E6FBFF'}),
      render: (lt, _p, info) => {
        const ff = f;
        // in-camera zoom-through: the lens rockets in from far behind the start orb and settles into the chase
        const rocket = 1 - Math.pow(1 - clamp(lt / 18), 4);
        const cam = addCam(chaseCam(ff), {dolly: -1500 * (1 - rocket)}, handheld(lt, 0.9, 5), kickZoom(f, 0.012));
        const rc = resolveCam(cam);
        const ts = tokenS(ff);
        const spd = Math.abs(tokenS(ff) - tokenS(ff - 1));
        const tq = project(rc, pathPt(ts));
        const st = tokenState(ff);
        const lock = orbRect(rc, st.id);
        return (
          <GraphView cam={rc} f={f} uid="s05e" busy={whipBusy(info)} activeId={st.id} token={{s: ts, trail: 520, I: 1}} grid={0.28}
            under={<SpeedLines frame={f} intensity={clamp(spd / 40 + 1.2 * (1 - rocket))} x={tq.visible ? tq.x : 960} y={tq.visible ? tq.y : 540} travel={f * 0.02 + ts / 300 + 6 * rocket} count={220} />}
            extra={<>
              {tq.visible && <LensFlare x={tq.x} y={tq.y} intensity={0.75} scale={0.6} ghosts={0.6} rays={10} frame={f} seed={7} />}
              {st.id !== 'start' && lock.ok && <LockReticle f={f} at={st.at} end={st.at + 16} x={lock.q.x} y={lock.q.y} r={lock.w / 2} label={`state ▸ ${st.id}`} value="ACTIVE" />}
            </>} />
        );
      },
    },
    {
      beat: 62, name: 'fly-b', in: whip({dir: 'right', dur: 10}), out: flashCut({dur: 14, split: 0.5, peak: 0.9, color: '#E6FBFF'}),
      render: (lt, _p, info) => {
        const ff = f;
        const cam = addCam(sideCam(ff), handheld(lt, 0.8, 6), kickPush(f, 16, 7));
        const rc = resolveCam(cam);
        const ts = tokenS(ff);
        const tq = project(rc, pathPt(ts));
        const st = tokenState(ff);
        const lock = orbRect(rc, st.id, 1.12);
        const bq = project(rc, N.booked.p);
        const rays = clamp((ff - B(63.5) + 2) / 6) ;
        return (
          <GraphView cam={rc} f={f} uid="s05f" busy={whipBusy(info)} activeId={st.id} token={{s: ts, trail: 600, I: ff > B(63.5) + 6 ? Math.exp(-(ff - B(63.5) - 6) / 6) : 1}} bokeh
            under={rays > 0 && bq.visible ? <GodRays frame={f} x={bq.x} y={bq.y} intensity={0.9 * rays} lobes={18} length={1500} color="lilac" secondary="cyan" core={0.9} /> : null}
            extra={<>
              {bq.visible && <Shockwave frame={f} at={B(63.5)} x={bq.x} y={bq.y + R * bq.scale * 0.2} dur={36} radius={1100} squash={0.32} rings={2} thickness={70} intensity={0.85} core={false} />}
              {tq.visible && ff < B(63.5) + 4 && <LensFlare x={tq.x} y={tq.y} intensity={0.7} scale={0.55} ghosts={0.5} rays={10} frame={f} seed={9} />}
              {bq.visible && <FlareBurst at={L(63.5)} x={bq.x} y={bq.y} dur={50} peak={1.7} scale={0.9} flash={0.35} sustain={0.5} seed={11} />}
              {lock.ok && st.id !== 'collect_details' && <LockReticle f={f} at={st.at} end={st.id === 'booked' ? undefined : st.at + 18} x={lock.q.x} y={lock.q.y} r={lock.w / 2} label={`state ▸ ${st.id}`} value={st.id === 'booked' ? 'BOOKED ✓' : 'ACTIVE'} />}
            </>} />
        );
      },
    },
  ]);

  const cnt = graphCounts(f);
  const tst = tokenState(f);
  return (
    <AbsoluteFill style={{background: 'radial-gradient(120% 95% at 50% 42%, #24113F 0%, #120726 45%, #04020A 85%)'}}>
      {/* Shots render in their own wrappers; the gradient above shows only where a transition scales a shot down */}
      <Shots shots={shots} t={t} />
      <GraphHud f={f} start={B(52) + 4} end={B(59.75)} nodes={cnt.nodes} edges={cnt.edges} mode={f < B(56) ? 'Map' : 'Branch'} />
      <Headline f={f} kicker="States" kickerAt={B(52.5)} out={B(55.6)} words={[{text: 'Map', at: B(53)}, {text: 'every', at: B(53.5)}, {text: 'step.', at: B(54)}]} />
      <Headline f={f} kicker="Branches · cycles · handoffs" kickerAt={B(56.75)} out={B(59.45)} words={[{text: 'Branch', at: B(57)}, {text: 'anywhere.', at: B(57.5)}]} />
      <CurrentState f={f} start={B(60) + 4} end={B(63.85)} id={tst.id} changedAt={tst.at} />
      <LightStreak frame={t} start={L(58) - 6} dur={16} angle={170} count={5} spread={300} offset={-120} intensity={0.6} />
    </AbsoluteFill>
  );
};

