// s09 chapter 3 (beats 132–140): BotScript streams in as holo glass in 3D, "Valid ✓" stamps on 136, then code
// lines project light beams into the UI pieces they define (state orb, policy pill, function chip, signal bar).
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {FONT, DISPLAY, MONO, clamp, lerp, kick} from '../../lib';
import {World, Obj, CamSpec, V3, resolveCam, project, MotionBlur} from '../../cine';
import {DustField, DataRain, FlareBurst, Shockwave, GodRays} from '../../vfx';
import {GlassPane, TypedChip} from '../../ui/glass';
import {GlassOrbNode} from '../../ui/holo';
import {Icon} from '../../ui/kit';
import {CODE, codeColor} from '../../ui/screens';
import {THEMES, withA} from '../../ui/theme';
import {SpaceLayer, GridLayer, ScreenBeam, eo, bo, p01} from './kit';

type LFn = (k: number) => number;
const TH = THEMES.holo;

export const PW = 1150, PH = 1074;
const FS = 30, LH = 44;
const TOP = -PH / 2 + 52 + 26; // first line top (panel local)
export const lineY = (i: number) => TOP + LH * i + LH / 2;
export const LINE_X0 = -PW / 2 + 36; // gutter start
export const landAt = (L: LFn, i: number) => L(132) + 4 + i * 4.1;
export const STAMP: V3 = [PW / 2 - 175, -PH / 2 + 30, 40];
/** the stamp's check circle (light source for its flare) */
export const STAMP_CHECK: V3 = [PW / 2 - 175 - 92, -PH / 2 + 30 - 10, 44];
export const stampAt = (L: LFn) => L(136);

/** Beam sources (line index) → UI pieces. */
export const LINKS = [
  {line: 11, key: 'signal', pos: [1330, -410, 240] as V3, at: (L: LFn) => L(137.5), rgb: '170,140,255'},
  {line: 17, key: 'policy', pos: [1220, -170, 360] as V3, at: (L: LFn) => L(138), rgb: '69,227,176'},
  {line: 18, key: 'orb', pos: [1480, 60, 200] as V3, at: (L: LFn) => L(138.5), rgb: '127,231,255'},
  {line: 20, key: 'fn', pos: [1180, 250, 330] as V3, at: (L: LFn) => L(139), rgb: '255,192,77'},
];
const BEAM_LEAD = 9;

/** End of a code line's text (world), where its beam leaves. */
export const lineEnd = (i: number): V3 => {
  const len = CODE[i].reduce((s, [txt]) => s + txt.length, 0);
  return [LINE_X0 + 74 + len * FS * 0.602 + 14, lineY(i), 4];
};

/* ------------------------------------------------------------------ */
const CodeLine: React.FC<{i: number; t: number; L: LFn; hl: number; hlRgb: string}> = ({i, t, L, hl, hlRgb}) => {
  const at = landAt(L, i);
  const e = eo((t - at) / 11);
  if (e <= 0.001) return null;
  const line = CODE[i];
  const streak = 1 - e;
  return (
    <Obj x={LINE_X0 + 520} y={lineY(i)} z={3 + 820 * (1 - e)} dof={1}>
      <div style={{position: 'relative', width: 1040, height: LH, transform: `translateX(${(1 - e) * 760}px)`, opacity: clamp(e * 1.8)}}>
        {hl > 0.01 ? <div style={{position: 'absolute', left: 60, right: -20, top: 2, bottom: 2, borderRadius: 10, background: `linear-gradient(90deg, rgba(${hlRgb},${0.26 * hl}), rgba(${hlRgb},${0.08 * hl}) 70%, rgba(${hlRgb},0))`, boxShadow: `inset 3px 0 0 rgba(${hlRgb},${hl})`}} /> : null}
        {streak > 0.02 ? <div style={{position: 'absolute', left: 200, top: LH / 2 - 9, width: 1300, height: 18, borderRadius: 9, background: 'linear-gradient(90deg, rgba(127,231,255,0), rgba(170,140,255,0.35) 25%, rgba(127,231,255,0.85) 60%, rgba(255,255,255,1) 72%, rgba(127,231,255,0))', boxShadow: '0 0 30px rgba(127,231,255,0.6)', opacity: streak}} /> : null}
        <div style={{position: 'absolute', left: 0, top: 0, width: 56, textAlign: 'right', fontFamily: MONO, fontSize: FS * 0.86, lineHeight: `${LH}px`, color: TH.code.lineNo}}>{i + 1}</div>
        <div style={{position: 'absolute', left: 74, top: 0, whiteSpace: 'pre', fontFamily: MONO, fontSize: FS, lineHeight: `${LH}px`}}>
          {line.map(([txt, col], j) => {
            const c = codeColor(TH, col);
            const glow = c.startsWith('#') && c !== TH.code.plain;
            return <span key={j} style={{color: c, textShadow: glow ? `0 0 12px ${withA(c, 0.55)}` : undefined}}>{txt}</span>;
          })}
        </div>
      </div>
    </Obj>
  );
};

/** Light bar that sweeps down the slab with the newest landing line (the "write head"). */
const WriteHead: React.FC<{t: number; L: LFn}> = ({t, L}) => {
  const first = landAt(L, 0), last = landAt(L, CODE.length - 1);
  const o = Math.min(clamp((t - first + 4) / 6), 1 - clamp((t - last - 6) / 12));
  if (o <= 0.01) return null;
  const u = clamp((t - first) / (last - first));
  const y = lineY(0) + (lineY(CODE.length - 1) - lineY(0)) * u;
  return (
    <Obj x={0} y={y + LH / 2} z={8} dof={false}>
      <div style={{position: 'relative', width: PW - 40, height: 90, opacity: o}}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 44, background: 'linear-gradient(180deg, rgba(127,231,255,0), rgba(127,231,255,0.10))'}} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 43, height: 3, background: 'linear-gradient(90deg, rgba(127,231,255,0), rgba(127,231,255,0.9) 20%, #FFFFFF 50%, rgba(127,231,255,0.9) 80%, rgba(127,231,255,0))', boxShadow: '0 0 18px rgba(127,231,255,0.9), 0 0 42px rgba(140,107,234,0.7)'}} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 46, height: 40, background: 'linear-gradient(180deg, rgba(127,231,255,0.07), rgba(127,231,255,0))'}} />
      </div>
    </Obj>
  );
};

const Stamp: React.FC<{t: number; L: LFn}> = ({t, L}) => {
  const at = stampAt(L);
  if (t < at - 6) return null;
  const pre = clamp((t - (at - 6)) / 6); // flight
  const post = t >= at ? t - at : -1;
  const s = post < 0 ? lerp(2.6, 1, pre * pre * pre) : 1 + 0.12 * Math.exp(-post / 3) * Math.cos(post * 0.9);
  const z = post < 0 ? lerp(700, 0, pre * pre * pre) : 0;
  const glow = post < 0 ? pre : Math.exp(-post / 14);
  return (
    <Obj x={STAMP[0]} y={STAMP[1]} z={STAMP[2] + z} rz={-6} dof={false}>
      <div style={{display: 'inline-flex', alignItems: 'center', gap: 20, padding: '16px 44px 16px 18px', borderRadius: 999, transform: `scale(${s})`, opacity: clamp(pre * 2),
        background: 'linear-gradient(160deg, rgba(240,250,205,0.98), rgba(214,236,160,0.95))',
        boxShadow: `inset 0 0 0 2px rgba(255,255,255,0.9), inset 0 -3px 0 rgba(54,153,125,0.3), 0 18px 40px -14px rgba(0,0,0,0.8), 0 0 ${40 + 80 * glow}px rgba(231,244,185,${0.45 + 0.5 * glow})`,
        fontFamily: DISPLAY, fontWeight: 800, fontSize: 58, letterSpacing: '-0.02em', color: '#1F4A3C', whiteSpace: 'nowrap'}}>
        <div style={{width: 72, height: 72, borderRadius: 36, background: 'radial-gradient(circle at 35% 30%, #7FF0C8, #36997D 65%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(69,227,176,0.9)'}}>
          <Icon.check size={44} color="#fff" sw={3.6} />
        </div>
        Valid
      </div>
    </Obj>
  );
};

/** A small holo signal meter (the judgment's measured value vs its threshold). */
const SignalCard: React.FC<{t: number; at: number}> = ({t, at}) => {
  const v = 0.94 * eo((t - at) / 20);
  const ok = v >= 0.9;
  return (
    <div style={{width: 420, padding: '22px 28px', borderRadius: 30, boxSizing: 'border-box', background: 'linear-gradient(160deg, rgba(56,32,100,0.82), rgba(14,7,32,0.8))', boxShadow: 'inset 0 0 0 1.5px rgba(170,140,255,0.7), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 40px -6px rgba(170,140,255,0.6)', fontFamily: FONT, color: '#F3EEFF'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 12, fontWeight: 650, fontSize: 26}}>
        <Icon.chart size={28} color="#CDBBFF" />goal_clear
        <div style={{flex: 1}} />
        <span style={{fontFamily: MONO, fontWeight: 700, fontSize: 30, color: ok ? '#45E3B0' : '#AA8CFF', textShadow: `0 0 14px ${ok ? 'rgba(69,227,176,0.9)' : 'rgba(170,140,255,0.8)'}`}}>{v.toFixed(2)}</span>
      </div>
      <div style={{position: 'relative', marginTop: 18, height: 20, borderRadius: 10, background: 'rgba(180,155,242,0.16)'}}>
        <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${v * 100}%`, borderRadius: 10, background: ok ? 'linear-gradient(90deg, #8C6BEA, #45E3B0)' : 'linear-gradient(90deg, #6A45E0, #AA8CFF)', boxShadow: `0 0 18px ${ok ? 'rgba(69,227,176,0.85)' : 'rgba(170,140,255,0.7)'}`}} />
        <div style={{position: 'absolute', left: '90%', top: -8, bottom: -8, width: 2, background: 'rgba(255,255,255,0.8)', boxShadow: '0 0 8px #fff'}} />
      </div>
      <div style={{marginTop: 10, fontFamily: MONO, fontSize: 18, color: 'rgba(216,203,255,0.7)'}}>noul · threshold 0.90</div>
    </div>
  );
};

const Piece: React.FC<{k: string; t: number; at: number; f: number}> = ({k, t, at, f}) => {
  const p = (t - at) / 16;
  if (p <= 0) return null;
  const pe = bo(p);
  const pulse = 0.5 * kick(f, 10);
  const node =
    k === 'orb' ? <GlassOrbNode size={210} label="discover" icon="chat" active={1} t={t} tone="cyan" look="holo" p={clamp(p)} /> :
    k === 'policy' ? <TypedChip name="goal_clear" value="yes" conf={0.94} kind="noul" look="holo" size={36} p={clamp(p)} pulse={pulse} /> :
    k === 'fn' ? <TypedChip name="create_lead" value="async" kind="fn" look="holo" size={36} p={clamp(p)} pulse={pulse} /> :
    <SignalCard t={t} at={at} />;
  return <div style={{transform: k === 'orb' ? undefined : `scale(${lerp(0.6, 1, pe)})`, opacity: k === 'orb' ? 1 : clamp(p * 2.5)}}>{node}</div>;
};

/* ------------------------------------------------------------------ */
export const CodeShot: React.FC<{t: number; from: number; L: LFn; cam: CamSpec; aperture?: number; focus?: number | V3; blur?: {vx: number; vy: number}; pieces?: boolean; rain?: number; rays?: number; children?: React.ReactNode}> = ({t, from, L, cam, aperture = 0, focus, blur, pieces = false, rain = 0.5, rays = 0, children}) => {
  const f = t + from;
  const rc = resolveCam(cam);
  const pr = project({...rc, shiftX: 0, shiftY: 0, zoom: 1}, [PW * 0.32, -PH * 0.42, -80]);
  const sa = stampAt(L);
  const stampFlash = t >= sa ? Math.exp(-(t - sa) / 9) : 0;
  const k = kick(f, 8);
  const hlOf = (i: number) => {
    const ln = LINKS.find((q) => q.line === i);
    if (!ln) return {hl: 0, rgb: '127,231,255'};
    return {hl: eo((t - (ln.at(L) - BEAM_LEAD - 4)) / 8), rgb: ln.rgb};
  };
  const world = (
    <World camera={rc} aperture={aperture} focus={focus} backdrop={<><GridLayer floorY={800} grid={0.3} />{rays > 0 && pr.visible ? <GodRays x={pr.x} y={pr.y} intensity={rays} length={1500} lobes={18} color="#B49BF2" secondary="#7FE7FF" core={0.5} frame={t} /> : null}</>}>
      <Obj x={0} y={0} z={0} dof={false}>
        <GlassPane look="holo" w={PW} h={PH} radius={34} titleBar="welcome_assistant.botscript" glow={0.55 + 0.35 * k} flash={stampFlash} sheen={t >= sa && t < sa + 30 ? (t - sa) / 30 : undefined} shadow={false}>
          <div style={{position: 'absolute', inset: 0, background: `radial-gradient(70% 55% at 22% 28%, rgba(127,231,255,${0.1 + 0.05 * k}), transparent 70%), radial-gradient(60% 50% at 80% 80%, rgba(170,140,255,0.14), transparent 70%)`}} />
          <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 96, background: 'linear-gradient(90deg, rgba(140,107,234,0.12), rgba(140,107,234,0.03))', borderRight: '1px solid rgba(180,155,242,0.16)'}} />
        </GlassPane>
      </Obj>
      <Obj x={LINE_X0 + 28} y={0} z={2} dof={false}>
        <div style={{position: 'relative', width: 56, height: PH}}>
          {CODE.map((_, i) => (t < landAt(L, i) + 2 ? <div key={i} style={{position: 'absolute', left: 0, width: 56, top: lineY(i) + PH / 2 - LH / 2, textAlign: 'right', fontFamily: MONO, fontSize: FS * 0.86, lineHeight: `${LH}px`, color: 'rgba(205,187,255,0.16)'}}>{i + 1}</div> : null))}
        </div>
      </Obj>
      {CODE.map((_, i) => {
        const h = hlOf(i);
        return <CodeLine key={i} i={i} t={t} L={L} hl={h.hl} hlRgb={h.rgb} />;
      })}
      <WriteHead t={t} L={L} />
      <Stamp t={t} L={L} />
      {pieces ? LINKS.map((ln) => (
        <Obj key={ln.key} x={ln.pos[0]} y={ln.pos[1] + Math.sin(t / 23 + ln.line) * 8} z={ln.pos[2]} billboard dof={false}>
          <Piece k={ln.key} t={t} at={ln.at(L)} f={f} />
        </Obj>
      )) : null}
    </World>
  );
  const st = project(rc, STAMP_CHECK);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <SpaceLayer from={from} cam={rc} haze={0.3} palette="mixed" />
      {rain > 0 ? <AbsoluteFill style={{opacity: rain}}><DataRain intensity={0.6} density={0.24} fontSize={20} frame={t} seed={9} /></AbsoluteFill> : null}
      {blur ? <MotionBlur vx={blur.vx} vy={blur.vy}>{world}</MotionBlur> : world}
      {pieces ? (
        <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
          {LINKS.map((ln) => {
            const at = ln.at(L);
            const a = project(rc, lineEnd(ln.line));
            const piece = project(rc, ln.pos);
            const pieceEdge = {x: piece.x - (ln.key === 'orb' ? 120 : ln.key === 'signal' ? 230 : 170) * piece.scale, y: piece.y};
            const d = eo((t - (at - BEAM_LEAD)) / BEAM_LEAD);
            const pul = ((t - at) / 26) % 1;
            return <ScreenBeam key={ln.key} a={{x: a.x, y: a.y}} b={pieceEdge} draw={d} color={ln.rgb} width={2.6} pulse={t > at ? pul : undefined} bend={0.5} />;
          })}
        </svg>
      ) : null}
      <DustField camX={-rc.yaw * 20} camY={rc.pitch * 20} count={90} boost={0.4 * k} frame={t} seed={44} />
      {t >= sa - 1 && t < sa + 70 && st.visible ? (
        <>
          <Shockwave x={st.x} y={st.y} at={sa} dur={36} radius={760} thickness={60} rings={2} intensity={0.75} core={false} frame={t} />
          <FlareBurst x={st.x} y={st.y} at={sa} dur={70} peak={1.5} scale={0.7} flash={0.25} color="#E7F4B9" secondary="#7FE7FF" frame={t} />
        </>
      ) : null}
      {children}
    </AbsoluteFill>
  );
};
