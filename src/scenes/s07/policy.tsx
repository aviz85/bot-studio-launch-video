// s07 Part A: the policy "Acknowledge a happy start" rebuilt as a living holo circuit in 3D.
// Card-local coordinates: origin = card centre, card spans x −750..750, y −450..420 (y down). Raised parts sit at +z.
import React from 'react';
import {Obj} from '../../cine';
import {UITheme, GlassPane, Icon} from '../../ui';
import {DISPLAY, FONT, MONO, BEAT} from '../../lib';
import {L, cl, pr, eOutExpo, eOutBack, hit, Trace, GlowDefs, Pt, lerp} from './common';

/* ---------------- timing (scene-local frames) ---------------- */
export const PT = {
  rows: [4, L(81), L(82)],
  and: L(83),
  out: L(83.5),
  then: L(84),
  scope: L(85),
  check: L(86),
};

/* ---------------- layout ---------------- */
const CW = 1500, CH = 870, OX = -750, OY = -450;
export const ROW_Y = [-205, -105, -5];
const ROW_L = -420, ROW_W = 1070, ROW_H = 84;
const BR_X = -470;
const OUT_X = -530;
export const THEN_Y = 182;
export const SCOPE_Y = 310;
export const THEN = {x: -70, y: THEN_Y, w: 700};
export const CHECK = {x: 400, y: SCOPE_Y, w: 520};
const RAISE = 36;

const AND_Y = ROW_Y[1];
const rowPaths: Pt[][] = ROW_Y.map((y) => [[ROW_L, y], [BR_X, y], [BR_X, AND_Y]]);
const outPath: Pt[] = [[BR_X - 34, AND_Y], [OUT_X, AND_Y], [OUT_X, THEN_Y], [ROW_L, THEN_Y]];
const thenToCheck: Pt[] = [[THEN.x + THEN.w / 2, THEN_Y], [CHECK.x, THEN_Y], [CHECK.x, SCOPE_Y - 36]];
const scopePath: Pt[] = [[OUT_X, THEN_Y], [OUT_X, SCOPE_Y], [ROW_L, SCOPE_Y]];
const busR: Pt[][] = ROW_Y.map((y) => [[ROW_L + ROW_W, y], [705, y], [705, SCOPE_Y], [CHECK.x + CHECK.w / 2, SCOPE_Y]]);
const decor: Pt[][] = [
  [[705, -372], [705, ROW_Y[0]]],
  [[-700, 360], [-600, 360], [-560, 400], [200, 400], [240, 360], [705, 360], [705, SCOPE_Y]],
  [[-700, -290], [-620, -290], [-590, -260], [-590, 80], [OUT_X, 80]],
  [[120, -290], [690, -290], [705, -275]],
];

/** beat phase helpers for the "living" pulses after the policy is complete */
const beatU = (f: number, lag = 0) => {
  const x = (f - lag) / BEAT;
  return x - Math.floor(x);
};

/* ---------------- base card (flat: header, labels, traces) ---------------- */
const BaseCard: React.FC<{t: number; f: number}> = ({t, f}) => {
  const andP = pr(t, PT.and, 12);
  const live = t >= PT.check ? 1 : 0;
  const u = beatU(f, 2);
  // pulses: rows → AND at the bracket moment, then output down to Then, then to ✓; afterwards, every beat
  const rowPulse = (i: number) => (t >= PT.and - 2 && t < PT.out + 4 ? [pr(t, PT.and - 2 + i * 1.5, 12)] : live ? [cl(u * 1.6)] : []);
  const outPulse = t >= PT.out - 2 && t < PT.then + 6 ? [pr(t, PT.out - 2, 16)] : live ? [cl(u * 1.6 - 0.45)] : [];
  const chkPulse = t >= PT.check - 12 && t < PT.check + 4 ? [pr(t, PT.check - 12, 13)] : live ? [cl(u * 1.6 - 0.75)] : [];
  const scopePulse = t >= PT.scope - 10 && t < PT.scope + 4 ? [pr(t, PT.scope - 10, 12)] : [];
  const lit = (a: number) => cl(pr(t, a, 10));
  const busP = live ? [cl(u * 1.4 - 0.1)] : [];
  return (
    <UITheme look="holo">
      <GlassPane w={CW} h={CH} radius={34} glow={0.3} rim={1.2} flash={0.6 * hit(t, PT.check, 10)}>
        <div style={{position: 'absolute', inset: 0, fontFamily: FONT, color: '#F3EEFF'}}>
          {/* header */}
          <div style={{position: 'absolute', left: 40, top: 36, width: 64, height: 64, borderRadius: 32, background: 'rgba(140,107,234,0.32)', boxShadow: 'inset 0 0 0 1.5px rgba(190,168,255,0.6), 0 0 22px rgba(160,130,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 30, color: '#E8DEFF'}}>1</div>
          <div style={{position: 'absolute', left: 130, top: 26, fontFamily: DISPLAY, fontWeight: 800, fontSize: 44, letterSpacing: '-0.02em', textShadow: '0 0 24px rgba(160,130,255,0.55)', whiteSpace: 'nowrap'}}>Acknowledge a happy start</div>
          <div style={{position: 'absolute', left: 131, top: 84, fontSize: 22, color: 'rgba(216,203,255,0.78)', whiteSpace: 'nowrap'}}>When the user seems to be enjoying the conversation, acknowledge it and keep things going.</div>
          <div style={{position: 'absolute', right: 44, top: 40, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderRadius: 999, background: 'rgba(60,220,170,0.14)', boxShadow: 'inset 0 0 0 1.5px rgba(114,242,200,0.5)', color: '#72F2C8', fontWeight: 600, fontSize: 23}}>
            <Icon.globe size={24} color="#72F2C8" />Global
          </div>
          {/* inner section */}
          <div style={{position: 'absolute', left: 26, right: 26, top: 140, bottom: 30, borderRadius: 26, background: 'linear-gradient(170deg, rgba(140,107,234,0.10), rgba(10,5,24,0.18))', boxShadow: 'inset 0 0 0 1px rgba(180,155,242,0.16)'}} />
          {[['When', ROW_Y[0]], ['Then', THEN_Y], ['Scope', SCOPE_Y]].map(([l, y]) => (
            <div key={l as string} style={{position: 'absolute', left: 58, top: (y as number) - OY - 22, fontFamily: DISPLAY, fontWeight: 800, fontSize: 34, letterSpacing: '-0.01em', color: '#F3EEFF', textShadow: '0 0 16px rgba(160,130,255,0.5)'}}>{l}</div>
          ))}
          <div style={{position: 'absolute', left: 60, right: 60, top: THEN_Y - OY - 66, height: 1, background: 'rgba(180,155,242,0.16)'}} />
          <div style={{position: 'absolute', left: 60, right: 60, top: SCOPE_Y - OY - 68, height: 1, background: 'rgba(180,155,242,0.16)'}} />
          {/* "+ Add condition" ghost */}
          <div style={{position: 'absolute', left: ROW_L - OX, top: 52 - OY, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 18px', borderRadius: 999, background: 'rgba(140,107,234,0.14)', color: 'rgba(205,187,255,0.7)', fontSize: 20, fontWeight: 600}}>
            <Icon.plus size={20} color="rgba(205,187,255,0.7)" />Add condition
          </div>
          {/* circuit */}
          <svg width={CW} height={CH} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
            <GlowDefs />
            {decor.map((p, i) => <Trace key={`d${i}`} pts={p} ox={OX} oy={OY} base={0.1} width={2} lit={live * 0.35} pulses={live ? [cl(beatU(f, 6 + i * 5) * 1.3)] : []} color="180,155,255" />)}
            {busR.map((p, i) => <Trace key={`b${i}`} pts={p} ox={OX} oy={OY} base={0.12} width={2.4} lit={live * 0.6} pulses={busP} color="180,155,255" />)}
            {rowPaths.map((p, i) => <Trace key={`r${i}`} pts={p} ox={OX} oy={OY} base={0.2 + 0.15 * cl(pr(t, PT.rows[i], 6))} width={4} draw={1} lit={lit(PT.and + i * 1.5)} pulses={rowPulse(i)} />)}
            <Trace pts={outPath} ox={OX} oy={OY} base={0.2} width={4} draw={pr(t, PT.out - 2, 16)} lit={lit(PT.out - 2)} pulses={outPulse} />
            <Trace pts={scopePath} ox={OX} oy={OY} base={0.14} width={3} draw={pr(t, PT.scope - 10, 12)} lit={lit(PT.scope - 6)} pulses={scopePulse} color="180,155,255" />
            <Trace pts={thenToCheck} ox={OX} oy={OY} base={0.18} width={4} draw={pr(t, PT.check - 12, 13)} lit={lit(PT.check - 4)} pulses={chkPulse} color="160,255,200" />
            {/* vias */}
            {([[BR_X, ROW_Y[0]], [BR_X, ROW_Y[2]], [OUT_X, AND_Y], [OUT_X, THEN_Y], [705, SCOPE_Y], [CHECK.x, THEN_Y], [705, ROW_Y[0]], [-590, 80]] as Pt[]).map(([x, y], i) => (
              <g key={`v${i}`}>
                <circle cx={x - OX} cy={y - OY} r={7} fill="rgba(10,5,24,0.9)" stroke={`rgba(127,231,255,${0.35 + 0.5 * andP})`} strokeWidth={2.5} />
                <circle cx={x - OX} cy={y - OY} r={2.5} fill={`rgba(255,255,255,${0.3 + 0.6 * andP})`} />
              </g>
            ))}
          </svg>
        </div>
      </GlassPane>
    </UITheme>
  );
};

/* ---------------- raised parts ---------------- */
const fieldBox: React.CSSProperties = {height: 54, borderRadius: 12, background: 'rgba(8,4,20,0.55)', boxShadow: 'inset 0 0 0 1.5px rgba(127,231,255,0.32)', display: 'flex', alignItems: 'center', padding: '0 18px', fontSize: 26, color: '#F3EEFF', boxSizing: 'border-box'};

const Slab: React.FC<{w: number; h: number; flash?: number; glow?: number; children: React.ReactNode; tone?: 'violet' | 'cyan' | 'green'; radius?: number}> = ({w, h, flash = 0, glow = 0, children, tone = 'violet', radius = 20}) => {
  const rgb = tone === 'green' ? '69,227,176' : tone === 'cyan' ? '127,231,255' : '180,155,255';
  return (
    <div style={{
      position: 'relative', width: w, height: h, borderRadius: radius, boxSizing: 'border-box',
      background: tone === 'green' ? 'linear-gradient(160deg, rgba(30,90,80,0.78), rgba(10,34,32,0.72))' : 'linear-gradient(160deg, rgba(64,40,118,0.80) 0%, rgba(30,16,60,0.74) 55%, rgba(18,10,40,0.78) 100%)',
      boxShadow: `inset 0 0 0 1.5px rgba(${rgb},${0.38 + 0.6 * flash}), inset 0 1px 0 rgba(220,240,255,0.5), 0 18px 30px -18px rgba(0,0,0,0.9), 0 0 ${Math.round(18 + 50 * (flash + glow))}px rgba(${rgb},${0.18 + 0.5 * flash + 0.3 * glow})`,
      fontFamily: FONT, color: '#F3EEFF', display: 'flex', alignItems: 'center',
    }}>
      <div style={{position: 'absolute', inset: 0, borderRadius: radius, background: 'linear-gradient(180deg, rgba(210,230,255,0.16) 0%, transparent 34%)'}} />
      {flash > 0.02 && <div style={{position: 'absolute', inset: 0, borderRadius: radius, background: `rgba(${rgb},${0.22 * flash})`}} />}
      {children}
    </div>
  );
};

const CONDS: [string, string, string, string, string?][] = [
  ['chart', 'User enjoyment', '≥', '1.7'],
  ['chart', 'Confidence', '≥', '80', '%'],
  ['doc', 'Current state', 'is', 'start'],
];

const CondRow: React.FC<{i: number; t: number}> = ({i, t}) => {
  const [ic, a, op, v, unit] = CONDS[i];
  const I = Icon[ic];
  const fl = hit(t, PT.rows[i], 9);
  const led = cl(pr(t, PT.and + i * 1.5 + 6, 8));
  return (
    <Slab w={ROW_W} h={ROW_H} flash={fl}>
      <div style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 22, padding: '0 22px', width: '100%'}}>
        <I size={32} color="#BFF4FF" />
        <div style={{width: 300, fontSize: 29, fontWeight: 600, whiteSpace: 'nowrap'}}>{a}</div>
        <div style={{...fieldBox, width: 130, justifyContent: 'space-between'}}>{op}<span style={{fontSize: 16, opacity: 0.6}}>▾</span></div>
        <div style={{...fieldBox, width: 250, fontFamily: MONO, color: '#E7F4B9', textShadow: '0 0 12px rgba(231,244,185,0.6)'}}>{v}<span style={{flex: 1}} />{unit}</div>
        <div style={{flex: 1}} />
        <div style={{width: 18, height: 18, borderRadius: 9, background: led > 0 ? `rgba(69,227,176,${0.25 + 0.75 * led})` : 'rgba(180,155,255,0.25)', boxShadow: led > 0 ? `0 0 ${10 + 18 * led}px rgba(69,227,176,${led})` : undefined}} />
        <div style={{fontSize: 26, color: 'rgba(205,187,255,0.45)', marginRight: 6}}>✕</div>
      </div>
    </Slab>
  );
};

const AndChip: React.FC<{t: number}> = ({t}) => {
  const p = eOutBack(cl(pr(t, PT.and - 1, 12)), 2.2);
  const fl = hit(t, PT.and + 4, 10);
  return (
    <div style={{transform: `scale(${lerp(0.75, 1, p)})`, padding: '10px 18px', borderRadius: 14, fontFamily: FONT, fontWeight: 800, fontSize: 24, letterSpacing: '0.04em', color: p > 0.3 ? '#0B0618' : '#CDBBFF', background: p > 0.3 ? `linear-gradient(135deg, #BFF4FF, #9C7DFF)` : 'rgba(40,22,74,0.9)', boxShadow: `inset 0 0 0 1.5px rgba(127,231,255,0.7), 0 0 ${16 + 40 * fl}px rgba(127,231,255,${0.4 + 0.5 * fl})`}}>AND</div>
  );
};

const ThenPill: React.FC<{t: number}> = ({t}) => {
  const fl = hit(t, PT.then + 2, 10);
  return (
    <Slab w={THEN.w} h={76} flash={fl} glow={t > PT.check ? 0.3 : 0} radius={38}>
      <div style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 14, padding: '0 26px', fontSize: 27, fontWeight: 600, whiteSpace: 'nowrap'}}>
        <Icon.chat size={30} color="#BFF4FF" />Include acknowledge-enjoyment<span style={{opacity: 0.5}}>·</span><span style={{color: '#CDBBFF'}}>Next reply</span>
        <span style={{fontSize: 16, opacity: 0.6, marginLeft: 6}}>▾</span>
      </div>
    </Slab>
  );
};

const ScopeBox: React.FC<{t: number}> = ({t}) => {
  const fl = hit(t, PT.scope + 1, 10);
  const spin = eOutExpo(pr(t, PT.scope - 2, 22)) * 360;
  return (
    <Slab w={320} h={72} flash={fl} radius={16} tone="cyan">
      <div style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px', fontSize: 27, fontWeight: 600, width: '100%'}}>
        <div style={{transform: `rotateY(${spin}deg)`}}><Icon.globe size={30} color="#BFF4FF" /></div>Global<span style={{flex: 1}} /><span style={{fontSize: 16, opacity: 0.6}}>▾</span>
      </div>
    </Slab>
  );
};

const CheckChip: React.FC<{t: number}> = ({t}) => {
  const fl = hit(t, PT.check + 1, 12);
  return (
    <Slab w={CHECK.w} h={64} flash={fl} glow={0.5} radius={32} tone="green">
      <div style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px', fontSize: 24, fontWeight: 600, color: '#B9FBE2', whiteSpace: 'nowrap'}}>
        <div style={{width: 34, height: 34, borderRadius: 17, background: '#45E3B0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 ${16 + 30 * fl}px rgba(69,227,176,0.9)`}}><Icon.check size={22} color="#06231C" sw={3.5} /></div>
        Creates 1 judgment and 1 prompt chunk
      </div>
    </Slab>
  );
};

/** Slam-in transform for a raised part landing at `at`: flies from +z (toward camera) with expo-out, lands ~2 f after `at`. */
const land = (t: number, at: number, dz = 520, lead = 7, dur = 16) => {
  const p = eOutExpo(cl((t - (at - lead)) / dur));
  return {z: RAISE + (1 - p) * dz, o: cl((t - (at - lead)) / 3), p};
};

/** The whole policy rig. Wrap in an <Obj> to place/rotate it. `flat` content is the same; orientation is the parent's. */
export const PolicyRig: React.FC<{t: number; f: number}> = ({t, f}) => {
  const parts: React.ReactNode[] = [];
  ROW_Y.forEach((y, i) => {
    if (t < PT.rows[i] - 8) return;
    const l = land(t, PT.rows[i], 560, i === 0 ? 4 : 7, i === 0 ? 12 : 16);
    parts.push(<Obj key={`row${i}`} x={ROW_L + ROW_W / 2} y={y} z={l.z} o={l.o}><CondRow i={i} t={t} /></Obj>);
  });
  if (t >= PT.and - 2) parts.push(<Obj key="and" x={BR_X} y={AND_Y} z={RAISE - 12}><AndChip t={t} /></Obj>);
  if (t >= PT.then - 8) {
    const l = land(t, PT.then, 700);
    parts.push(<Obj key="then" x={THEN.x} y={THEN.y} z={l.z} o={l.o}><ThenPill t={t} /></Obj>);
  }
  if (t >= PT.scope - 8) {
    const l = land(t, PT.scope, 420);
    parts.push(<Obj key="scope" x={-260} y={SCOPE_Y} z={l.z - 6} o={l.o}><ScopeBox t={t} /></Obj>);
  }
  if (t >= PT.check - 8) {
    const l = land(t, PT.check, 640);
    const sc = 1 + 0.25 * (1 - l.p);
    parts.push(<Obj key="check" x={CHECK.x} y={CHECK.y} z={l.z + 10} s={sc} o={l.o}><CheckChip t={t} /></Obj>);
  }
  return (
    <>
      <Obj key="base" x={0} y={OY + CH / 2} z={0}><BaseCard t={t} f={f} /></Obj>
      {parts}
    </>
  );
};

/** card-local → useful world anchors (unrotated rig at origin) */
export const POLICY_ANCHORS = {
  center: [0, -15, 0] as [number, number, number],
  row: (i: number) => [ROW_L + ROW_W / 2, ROW_Y[i], RAISE] as [number, number, number],
  and: [BR_X, ROW_Y[1], RAISE] as [number, number, number],
  then: [THEN.x, THEN.y, RAISE] as [number, number, number],
  check: [CHECK.x, CHECK.y, RAISE] as [number, number, number],
};
