// s06 Part B set pieces: the Judgment editor ("User enjoyment") rebuilt as separate frost-glass rows floating a
// few px above a glass back pane (real parallax + per-row depth of field), and the typed-signal chips.
// Content is authored at product scale and rendered with CSS `zoom: Z` so text rasterises crisply in macro shots.
import React from 'react';
import {DISPLAY, FONT, MONO} from '../../lib';
import {Icon} from '../../ui/kit';
import {GlassPane, TypedChip} from '../../ui/glass';
import {UITheme, useUI} from '../../ui/theme';
import {Obj, V3} from '../../cine';
import {EZ, clamp01, imp, mixN, pr} from './util';

/** native magnification of the editor (world px per product px) */
export const Z = 1.5;
/** product content width of the rows */
export const RW = 920;
export const PANE_W = 1000;
export const PANE_H = 800;
export const PANE_Y = -32; // product px, pane centre relative to the rig origin
export const LIFT = 18; // product px the rows float above the pane

export type RowKey = 'header' | 'type' | 'question' | 'critLabel' | 'crit0' | 'crit1' | 'crit2' | 'measure' | 'footer';
export const ROW: Record<RowKey, {y: number; h: number}> = {
  header: {y: -340, h: 96},
  type: {y: -234, h: 86},
  question: {y: -134, h: 82},
  critLabel: {y: -67, h: 26},
  crit0: {y: -17, h: 52},
  crit1: {y: 45, h: 52},
  crit2: {y: 107, h: 52},
  measure: {y: 206, h: 84},
  footer: {y: 302, h: 48},
};
/** world position of a point on a row (product px x offset from centre) */
export const rowPt = (k: RowKey, x = 0, dy = 0): V3 => [x * Z, (ROW[k].y + dy) * Z, LIFT * Z];

/* ------------------------------------------------------------------ */
/* State                                                                */
/* ------------------------------------------------------------------ */
export type EdState = {
  seg: number; // 0 Noul → 1 Score
  segFlash: number;
  crit: number[]; // slam progress per row 0..1 (0 = not launched)
  critFlash: number[];
  critLand: number[]; // land frames
  measure: number; // row reveal 0..1
  val: number; // 0..1.7 measured score
  fillGlow: number;
  sheen: number; // pane light sweep 0..1 (outside → none)
};

/* ------------------------------------------------------------------ */
/* Rows                                                                 */
/* ------------------------------------------------------------------ */
const Lbl: React.FC<{children: React.ReactNode}> = ({children}) => <div style={{fontWeight: 700, fontSize: 19, marginBottom: 8, letterSpacing: '-0.005em'}}>{children}</div>;

const Header: React.FC = () => {
  const th = useUI();
  return (
    <div>
      <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
        <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 48, letterSpacing: '-0.025em'}}>User enjoyment</div>
        <div style={{flex: 1}} />
        <div style={{display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 999, background: th.chip, color: th.chipText, fontSize: 18, fontWeight: 600}}><Icon.globe size={18} />Global · Before reply</div>
      </div>
      <div style={{fontSize: 21, color: th.textSoft, marginTop: 6}}>Measure how much the user is enjoying the conversation.</div>
    </div>
  );
};

const TypeRow: React.FC<{seg: number; flash: number}> = ({seg, flash}) => {
  const th = useUI();
  const left = mixN(0, 33.333, seg);
  return (
    <div>
      <Lbl>Type</Lbl>
      <div style={{position: 'relative', display: 'flex', background: th.inset, borderRadius: 16, padding: 6, boxShadow: `inset 0 0 0 1px ${th.insetBorder}`}}>
        <div style={{position: 'absolute', top: 6, bottom: 6, left: `calc(${left.toFixed(3)}% + 6px)`, width: 'calc(33.333% - 12px)', borderRadius: 12, background: th.accentGrad,
          boxShadow: `0 8px 20px -6px rgba(106,69,224,0.7), 0 0 ${Math.round(10 + 40 * flash)}px rgba(140,107,234,${(0.3 + 0.6 * flash).toFixed(3)})`}} />
        {['Noul', 'Score', 'Choice'].map((x, i) => {
          const on = i === 1 ? seg > 0.5 : i === 0 ? seg <= 0.5 : false;
          return <div key={x} style={{flex: 1, position: 'relative', textAlign: 'center', padding: '12px 0', fontSize: 21, fontWeight: 600, color: on ? '#fff' : th.text}}>{x}</div>;
        })}
      </div>
    </div>
  );
};

const QuestionRow: React.FC = () => {
  const th = useUI();
  return (
    <div>
      <Lbl>Question</Lbl>
      <div style={{boxShadow: `inset 0 0 0 1.5px ${th.fieldBorder}`, background: th.field, borderRadius: 16, padding: '13px 18px', fontSize: 21, display: 'flex'}}>
        How much is the user enjoying this conversation?<span style={{marginLeft: 'auto', fontSize: 15, color: th.textFaint, alignSelf: 'flex-end'}}>48/500</span>
      </div>
    </div>
  );
};

const CRIT = ['No expressed enjoyment', 'Some interest', 'Clear enthusiasm'];
const CritRow: React.FC<{i: number; hit: number; flash: number}> = ({i, hit, flash}) => {
  const th = useUI();
  const hb = hit > 0.01;
  return (
    <div style={{display: 'flex', gap: 12, height: 52}}>
      <div style={{width: 56, borderRadius: 14, background: hb ? `rgba(231,244,185,${(0.5 + 0.45 * hit).toFixed(3)})` : th.chip, color: th.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22,
        boxShadow: `${hb ? `0 0 ${Math.round(24 * hit)}px rgba(200,230,120,${(0.7 * hit).toFixed(3)}), ` : ''}inset 0 0 0 1.5px rgba(255,255,255,${(0.6 + 0.4 * flash).toFixed(3)})`}}>{i}</div>
      <div style={{flex: 1, display: 'flex', alignItems: 'center', borderRadius: 14, padding: '0 18px', fontSize: 21,
        background: hb ? `rgba(248,252,232,${(0.6 + 0.3 * hit).toFixed(3)})` : th.field,
        boxShadow: `inset 0 0 0 1.5px ${hb ? '#B9DA5A' : th.fieldBorder}${flash > 0.02 ? `, 0 0 ${Math.round(30 * flash)}px rgba(127,231,255,${(0.8 * flash).toFixed(3)})` : ''}`}}>
        {CRIT[i]}
        {hb && <span style={{marginLeft: 'auto', fontFamily: MONO, fontSize: 16, color: '#5E7F12', fontWeight: 700, opacity: hit}}>● match</span>}
      </div>
    </div>
  );
};

const MeasureRow: React.FC<{val: number; glow: number; armed: number}> = ({val, glow, armed}) => {
  const th = useUI();
  const w = (val / 2) * 100;
  const a = clamp01(armed);
  return (
    <div>
      <div style={{display: 'flex', alignItems: 'center', marginBottom: 10}}>
        <Lbl>Live measurement</Lbl>
        <div style={{flex: 1}} />
        <div style={{display: 'flex', alignItems: 'center', gap: 10, padding: '6px 16px', borderRadius: 999, background: a > 0.5 ? 'rgba(231,244,185,0.95)' : th.chip, color: '#39294B', fontFamily: MONO, fontSize: 19, fontWeight: 700,
          boxShadow: a > 0.5 ? `0 0 ${Math.round(8 + 28 * glow)}px rgba(200,230,120,${(0.25 + 0.6 * glow).toFixed(3)})` : undefined, marginTop: -6}}>
          {a > 0.5 ? <>score {val.toFixed(2)} <span style={{fontWeight: 500, opacity: 0.7}}>· conf 0.91</span></> : <span style={{opacity: 0.6}}>waiting for a message…</span>}
        </div>
      </div>
      <div style={{position: 'relative', height: 26, borderRadius: 13, background: th.track, boxShadow: 'inset 0 1px 3px rgba(57,41,75,0.18)'}}>
        {[0.5, 1, 1.5].map((m) => <div key={m} style={{position: 'absolute', left: `${(m / 2) * 100}%`, top: 4, bottom: 4, width: 1.5, background: 'rgba(57,41,75,0.2)'}} />)}
        <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${w.toFixed(3)}%`, borderRadius: 13, background: `linear-gradient(90deg, ${th.sig.purple}, #6FCFA9 60%, ${th.sig.green})`,
          boxShadow: `0 0 ${Math.round(14 + 40 * glow)}px rgba(54,153,125,${(0.5 + 0.4 * glow).toFixed(3)}), inset 0 1px 0 rgba(255,255,255,0.6)`}}>
          {val > 0.02 && <div style={{position: 'absolute', right: -6, top: -9, width: 44, height: 44, borderRadius: 22, background: `radial-gradient(closest-side, rgba(255,255,255,${(0.6 + 0.4 * glow).toFixed(3)}), rgba(127,231,255,0.4) 55%, transparent)`}} />}
        </div>
      </div>
      <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: MONO, fontSize: 14, color: th.textFaint}}><span>0</span><span>1</span><span>2</span></div>
    </div>
  );
};

const FooterRow: React.FC = () => {
  const th = useUI();
  const chip = (k: string, v: string) => (
    <div style={{display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 12, background: th.inset, boxShadow: `inset 0 0 0 1px ${th.insetBorder}`, fontSize: 17}}>
      <span style={{color: th.textSoft}}>{k}</span><span style={{fontWeight: 700}}>{v}</span>
    </div>
  );
  return <div style={{display: 'flex', gap: 12}}>{chip('Scope', 'Global')}{chip('Run on', 'User message')}{chip('Phase', 'Before reply')}<div style={{flex: 1}} />{chip('Output', 'typed signal')}</div>;
};

/* ------------------------------------------------------------------ */
/* Rig                                                                  */
/* ------------------------------------------------------------------ */
/** One row as a world object (content rendered at product scale × Z via CSS zoom). */
const RowObj: React.FC<{k: RowKey; off?: V3; o?: number; s?: number; children: React.ReactNode; nearFade?: [number, number]}> = ({k, off, o = 1, s = 1, children, nearFade}) => {
  const r = ROW[k];
  return (
    <Obj x={off ? off[0] : 0} y={r.y * Z + (off ? off[1] : 0)} z={LIFT * Z + (off ? off[2] : 0)} w={RW * Z} h={r.h * Z} o={o} s={s} nearFade={nearFade ?? [60, 300]} style={{backfaceVisibility: 'hidden'}}>
      <div style={{zoom: Z, width: RW, height: r.h, fontFamily: FONT}}>{children}</div>
    </Obj>
  );
};

/** Slot placeholder (dashed outline) where a criteria row will land. */
const Slot: React.FC<{k: RowKey; o: number}> = ({k, o}) => {
  const r = ROW[k];
  return (
    <Obj x={0} y={r.y * Z} z={(LIFT - 4) * Z} w={RW * Z} h={r.h * Z} o={o} style={{backfaceVisibility: 'hidden'}}>
      <div style={{zoom: Z, width: RW, height: r.h, borderRadius: 14, boxShadow: 'inset 0 0 0 2px rgba(106,69,224,0.45), 0 0 18px rgba(127,231,255,0.25)', background: 'repeating-linear-gradient(115deg, rgba(106,69,224,0.16) 0 12px, rgba(255,255,255,0.1) 12px 24px)', display: 'flex', alignItems: 'center', paddingLeft: 78, boxSizing: 'border-box', fontFamily: MONO, fontSize: 15, color: 'rgba(106,69,224,0.7)', letterSpacing: '0.12em'}}>LEVEL {k.slice(-1)} · AWAITING</div>
    </Obj>
  );
};

export const EditorRig: React.FC<{st: EdState; t: number}> = ({st, t}) => {
  const hit = clamp01((st.val - 1.45) / 0.15);
  return (
    <UITheme look="frost">
      <Obj x={0} y={PANE_Y * Z} z={0} w={PANE_W * Z} h={PANE_H * Z} nearFade={[60, 300]} style={{backfaceVisibility: 'hidden'}}>
        <GlassPane w={PANE_W * Z} h={PANE_H * Z} radius={44} tint="glass" glow={0.6} rim={1.6} sheen={st.sheen} flash={0.6 * st.segFlash} />
      </Obj>
      <RowObj k="header"><Header /></RowObj>
      <RowObj k="type"><TypeRow seg={st.seg} flash={st.segFlash} /></RowObj>
      <RowObj k="question"><QuestionRow /></RowObj>
      <RowObj k="critLabel"><Lbl>Scoring criteria</Lbl></RowObj>
      {[0, 1, 2].map((i) => {
        const k = `crit${i}` as RowKey;
        const p = st.crit[i];
        if (p <= 0) return <Slot key={k} k={k} o={0.9} />;
        // stamp: drops out of the air toward the glass (scale + lift), accelerating, with a tiny settle
        const land = st.critLand[i];
        const d = t - land;
        const u = clamp01(p);
        const e = Math.pow(u, 1.8);
        const zOff = u < 1 ? (1 - e) * 520 : -8 * Math.exp(-d / 3) * Math.sin(d * 0.9);
        const sc = u < 1 ? 1 + 0.38 * (1 - e) : 1 + 0.02 * Math.exp(-d / 3) * Math.sin(d * 0.9 + 1.2);
        return <RowObj key={k} k={k} off={[(1 - e) * 380, 0, zOff]} s={sc} o={clamp01(u * 2.5)}><CritRow i={i} hit={i === 2 ? hit : 0} flash={st.critFlash[i]} /></RowObj>;
      })}
      <RowObj k="measure" off={[0, 0, 40 * st.measure * (1 - st.measure) * 4]}><MeasureRow val={st.val} glow={st.fillGlow} armed={st.measure} /></RowObj>
      <RowObj k="footer"><FooterRow /></RowObj>
    </UITheme>
  );
};

/* ------------------------------------------------------------------ */
/* Typed-signal chips                                                   */
/* ------------------------------------------------------------------ */
export type ChipDef = {name: string; value: string; conf?: number; kind: 'score' | 'noul'; tone?: 'green' | 'purple' | 'amber' | 'cyan'; phi0: number; z: number};
/** Ring in front of the card plane: angle phi (deg, 0 = right, + = clockwise on screen), radius rx × ry, depth z. */
export const CHIPS: ChipDef[] = [
  {name: 'enjoyment', value: '2', kind: 'score', phi0: 212, z: 560},
  {name: 'goal_clear', value: 'yes', conf: 0.94, kind: 'noul', phi0: -32, z: 420},
  {name: 'frustration', value: '0', kind: 'score', tone: 'amber', phi0: 148, z: 380},
  {name: 'needs_person', value: 'no', kind: 'noul', tone: 'cyan', phi0: 44, z: 560},
];
export const ORBIT = {rx: 950, ry: 540, cy: -20, w: 0.2};

/** Chip world position at scene time t. launch in scene frames; orbitT0 = frame the orbit clock starts. */
export const chipPos = (c: ChipDef, t: number, launch: number, orbitT0: number, i: number): V3 | null => {
  if (t < launch) return null;
  const ph = ((c.phi0 + ORBIT.w * (t - orbitT0)) * Math.PI) / 180;
  const slot: V3 = [ORBIT.rx * Math.cos(ph), ORBIT.cy + ORBIT.ry * Math.sin(ph), c.z + 90 * Math.sin((t + i * 37) / 28)];
  const src: V3 = rowPt('measure', 300 - i * 60, 0);
  src[2] += 40;
  const k = clamp01((t - launch) / 16);
  const u = EZ.expoOut(k);
  // arc toward the camera mid-flight
  const lift = Math.sin(Math.PI * k) * 380;
  return [mixN(src[0], slot[0], u), mixN(src[1], slot[1], u), mixN(src[2], slot[2], u) + lift];
};

export const Chip3D: React.FC<{c: ChipDef; pos: V3; t: number; launch: number; f: number; kickV: number}> = ({c, pos, t, launch, kickV}) => {
  const p = clamp01((t - launch) / 10);
  const fl = imp(t, launch + 6, 8);
  return (
    <Obj x={pos[0]} y={pos[1]} z={pos[2]} billboard nearFade={[80, 380]} s={0.55 + 0.45 * EZ.backOut(p)}>
      <div style={{transform: 'translate(-0%, 0)'}}>
        <TypedChip name={c.name} value={c.value} conf={c.conf} kind={c.kind} tone={c.tone} look="holo" size={62} p={0.4 + 0.6 * p} pulse={0.6 * fl + 0.35 * kickV} glow={0.7} />
      </div>
    </Obj>
  );
};

/** Faint light tethers from the measurement row to each chip (projected in 2D by the caller). */
export const tetherAlpha = (t: number, launch: number) => clamp01((t - launch) / 6) * (0.35 + 0.65 * imp(t, launch, 14));
export {pr};
