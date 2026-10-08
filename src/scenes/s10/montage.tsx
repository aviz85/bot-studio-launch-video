// s10 Act B — montage of the real product designs as glass panes in 3D, one cut per beat (152–160),
// with a statement word slammed every 2 beats: "Describe." "Build." "See." "Ship."
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {kick} from '../../lib';
import {World, Obj, CamKey, camPath, camMotion, addCam, handheld, kickZoom, MotionBlur, V3, resolveCam, project, FloorGrid, m4mul, m4translate, m4rotX, m4rotY, m4rotZ, m4apply} from '../../cine';
import {SpaceBackdrop, LightStreak, Bokeh} from '../../vfx';
import {Sheen} from '../../ui';
import {lb, HIT, clamp01, mix, smoothstep, eo, decay, gradText, CHROME} from './common';
import {DISPLAY, MONO} from '../../lib';

export const DW = 1586;
export const DH = 992;

/** A real product design as a translucent glass pane: frosted bezel, luminous rim, specular, sheen sweep. */
export const DesignPane: React.FC<{name: string; sheen?: number; glow?: number; flash?: number; dim?: number}> = ({name, sheen, glow = 0.6, flash = 0, dim = 0}) => {
  const PAD = 16;
  return (
    <div
      style={{
        position: 'relative', width: DW + PAD * 2, height: DH + PAD * 2, borderRadius: 40, boxSizing: 'border-box', padding: PAD,
        background: 'linear-gradient(150deg, rgba(255,255,255,0.42) 0%, rgba(214,200,255,0.22) 40%, rgba(127,231,255,0.14) 100%)',
        boxShadow: `inset 0 1.5px 0 rgba(255,255,255,0.95), inset 0 0 0 1.5px rgba(255,255,255,0.35), 0 0 ${Math.round(90 + 80 * flash)}px ${Math.round(-10 + 20 * flash)}px rgba(${flash > 0.05 ? '127,231,255' : '150,115,255'},${(0.35 + 0.25 * glow + 0.4 * flash).toFixed(3)})`,
      }}
    >
      <div style={{position: 'relative', width: DW, height: DH, borderRadius: 26, overflow: 'hidden', background: 'rgba(236,230,250,0.55)'}}>
        <Img src={staticFile(`designs/${name}.png`)} style={{width: DW, height: DH, display: 'block', opacity: 0.94}} />
        {/* glass: top specular, diagonal reflection band, violet depth tint at the bottom */}
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.06) 7%, rgba(255,255,255,0) 18%), linear-gradient(116deg, rgba(255,255,255,0) 34%, rgba(255,255,255,0.16) 41%, rgba(255,255,255,0.04) 47%, rgba(255,255,255,0) 52%), linear-gradient(0deg, rgba(110,80,210,0.16) 0%, rgba(110,80,210,0) 36%)'}} />
        {dim > 0 && <div style={{position: 'absolute', inset: 0, background: `rgba(14,6,30,${dim})`}} />}
        {sheen !== undefined && sheen > 0 && sheen < 1 && <Sheen p={sheen} strength={0.75} width={14} z={4} />}
      </div>
      {/* cyan rim line across the top edge */}
      <div style={{position: 'absolute', left: 40, right: 40, top: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.95), rgba(127,231,255,0.9), transparent)'}} />
      {flash > 0.03 && <div style={{position: 'absolute', inset: 0, borderRadius: 40, boxShadow: `inset 0 0 0 3px rgba(210,248,255,${flash})`}} />}
    </div>
  );
};

/** HUD reticle: four cyan corner brackets converging onto a UI element + a tracked label tag. */
const Reticle3D: React.FC<{w: number; h: number; label: string; lt: number}> = ({w, h, label, lt}) => {
  const p = eo(clamp01((lt - 3) / 9));
  if (p <= 0) return null;
  const sc = mix(1.35, 1, p);
  const lock = decay(lt, 12, 5);
  const c = `rgba(127,231,255,${(0.55 + 0.45 * p).toFixed(3)})`;
  const L = Math.min(46, w * 0.22, h * 0.45);
  const corner = (st: React.CSSProperties) => <div style={{position: 'absolute', width: L, height: L, ...st, filter: undefined, boxShadow: `0 0 ${10 + 18 * lock}px rgba(127,231,255,${0.5 + 0.5 * lock})`}} />;
  const b = `4px solid ${c}`;
  return (
    <div style={{position: 'relative', width: w, height: h, transform: `scale(${sc.toFixed(4)})`, opacity: smoothstep(0, 0.3, p)}}>
      {lock > 0.03 && <div style={{position: 'absolute', inset: 0, borderRadius: 10, background: `rgba(127,231,255,${0.16 * lock})`}} />}
      {corner({left: 0, top: 0, borderLeft: b, borderTop: b, borderTopLeftRadius: 8})}
      {corner({right: 0, top: 0, borderRight: b, borderTop: b, borderTopRightRadius: 8})}
      {corner({left: 0, bottom: 0, borderLeft: b, borderBottom: b, borderBottomLeftRadius: 8})}
      {corner({right: 0, bottom: 0, borderRight: b, borderBottom: b, borderBottomRightRadius: 8})}
      <div style={{position: 'absolute', left: 0, bottom: h + 12, padding: '7px 14px', borderRadius: 8, whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 22, letterSpacing: '0.12em', color: '#BFF4FF',
        background: 'rgba(8,4,24,0.82)', boxShadow: `inset 0 0 0 1.5px rgba(127,231,255,0.6), 0 0 ${16 + 20 * lock}px rgba(127,231,255,0.45)`, opacity: smoothstep(0.5, 1, p)}}>
        {label.slice(0, Math.round(label.length * clamp01((lt - 6) / 8)))}
      </div>
    </div>
  );
};

/** Thin back-plate (empty frosted glass) for exploded depth behind a pane. */
const BackPlate: React.FC<{o?: number}> = ({o = 1}) => (
  <div style={{width: DW + 32, height: DH + 32, borderRadius: 40, opacity: o, background: 'linear-gradient(150deg, rgba(200,180,255,0.20), rgba(127,231,255,0.06))', boxShadow: 'inset 0 0 0 1.5px rgba(205,187,255,0.5), inset 0 1.5px 0 rgba(255,255,255,0.6)'}} />
);

/* ------------------------------------------------------------------ */
/* Montage shots                                                        */
/* ------------------------------------------------------------------ */
type MShot = {
  beat: number;
  design: string;
  /** pane rotation */
  rot: [number, number, number];
  keys: CamKey[];
  focus?: V3;
  aperture?: number;
  plates?: number; // exploded glass layers behind
  deck?: boolean; // version stack
  floor?: number; // FloorGrid y (god shot)
  /** HUD reticle locked onto a UI element: [x, y, w, h] in pane-centred px + label */
  ret?: [number, number, number, number, string];
};

export const MONTAGE: MShot[] = [
  {beat: 152, design: '05-policies', ret: [-63, -6, 900, 210, 'POLICY · WHEN → THEN'], rot: [0, -26, 0], plates: 2,
    keys: [{at: 0, target: [-60, 60, 0], yaw: -36, pitch: 15, dist: 2500, roll: -8, focal: 26, shiftX: 400},
      {at: 10, ease: 'expoOut', yaw: -24, pitch: 11, dist: 2020, roll: -5},
      {at: 30, yaw: -19, pitch: 9, dist: 1880, roll: -4}]},
  {beat: 153, design: '07-judgment-editor', ret: [96, -268, 240, 66, 'TYPE · SCORE'], rot: [10, -16, 0], aperture: 12, focus: [117, -262, 50],
    keys: [{at: 0, target: [-40, -250, 40], yaw: -50, pitch: 10, dist: 1600, roll: 11, focal: 40, shiftX: 400},
      {at: 9, ease: 'expoOut', target: [90, -262, 50], yaw: -42, dist: 1380, roll: 9},
      {at: 30, target: [150, -262, 50], yaw: -39, dist: 1330, roll: 8}]},
  {beat: 154, design: '03-states', ret: [-87, 43, 880, 170, 'STATES · 4 STEPS'], rot: [90, 0, 0], plates: 2, floor: 420,
    keys: [{at: 0, target: [0, 0, 0], yaw: 34, pitch: -58, dist: 3100, roll: 10, focal: 30, shiftX: -440},
      {at: 10, ease: 'expoOut', yaw: 14, pitch: -68, dist: 2350, roll: 4},
      {at: 30, yaw: 8, pitch: -72, dist: 2200, roll: 2}]},
  {beat: 155, design: '10-functions', ret: [56, 22, 660, 190, 'CLERK · CREATE_LEAD'], rot: [0, 34, 0], plates: 1,
    keys: [{at: 0, target: [420, 0, 0], yaw: 46, pitch: -6, dist: 1900, roll: 12, focal: 28, shiftX: -380},
      {at: 9, ease: 'expoOut', target: [60, 0, 0], yaw: 36, dist: 1750, roll: 10},
      {at: 30, target: [-80, 0, 0], yaw: 33, dist: 1700, roll: 9}]},
  {beat: 156, design: '01-live-dashboard', ret: [-204, -25, 660, 550, 'SIGNAL WALL · LIVE'], rot: [0, -12, 0], plates: 3,
    keys: [{at: 0, target: [0, 40, 0], yaw: -20, pitch: 8, dist: 3000, roll: -3, focal: 32, shiftX: 400},
      {at: 10, ease: 'expoOut', yaw: -14, pitch: 6, dist: 2200, roll: -2},
      {at: 30, yaw: -11, pitch: 5, dist: 2050, roll: -1.5}]},
  {beat: 157, design: '11-evaluation', ret: [-74, 284, 920, 170, 'EVAL · PASSED'], rot: [-30, -18, 0],
    keys: [{at: 0, target: [0, 120, 0], yaw: -26, pitch: 30, dist: 2300, roll: -14, focal: 26, shiftX: 400},
      {at: 9, ease: 'expoOut', yaw: -18, pitch: 24, dist: 1950, roll: -11},
      {at: 30, yaw: -15, pitch: 22, dist: 1860, roll: -10}]},
  {beat: 158, design: '12-versions', ret: [-68, -248, 930, 100, 'VERSION 4 · CURRENT'], rot: [0, 24, 0], deck: true,
    keys: [{at: 0, target: [0, 0, -300], yaw: 40, pitch: 6, dist: 3200, roll: 6, focal: 30, shiftX: -400},
      {at: 10, ease: 'expoOut', yaw: 30, dist: 2700, roll: 4},
      {at: 30, yaw: 26, dist: 2600, roll: 3}]},
  {beat: 159, design: '13-botscript', ret: [-68, 149, 900, 120, 'BOTSCRIPT · VALID'], rot: [0, 30, 0], aperture: 9, focus: [-100, -60, 0],
    keys: [{at: 0, target: [320, -40, 0], yaw: 44, pitch: 8, dist: 1800, roll: -7, focal: 30, shiftX: -380},
      {at: 8, ease: 'expoOut', target: [-40, -60, 0], yaw: 38, pitch: 6, dist: 1680, roll: -6},
      {at: 16, target: [-140, -70, 0], yaw: 36, pitch: 6, dist: 1650, roll: -6}]},
  {beat: 159.5, design: '15-all-bots', rot: [0, -20, 0],
    keys: [{at: 0, target: [0, 0, 0], yaw: -24, pitch: 6, dist: 3000, roll: -7, focal: 30, shiftX: -330},
      {at: 7, ease: 'expoOut', yaw: -20, dist: 2700, roll: -6}]},
  {beat: 159.75, design: '14-ai-builder', rot: [0, 22, 0],
    keys: [{at: 0, target: [0, 0, 0], yaw: 26, pitch: -5, dist: 3000, roll: 8, focal: 30, shiftX: -330},
      {at: 6, ease: 'expoOut', yaw: 22, dist: 2650, roll: 7}]},
];

/* ---- composition guard: shift each shot so its pane never overlaps the statement word ---- */
const PW = (DW + 32) / 2, PH = (DH + 32) / 2;
const objM = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => m4mul(m4mul(m4mul(m4translate(x, y, z), m4rotY(ry)), m4rotX(rx)), m4rotZ(rz));
/** pane instances of a shot: [matrix of the pane centre] at shot time lt */
const paneMats = (m: MShot, lt: number) => {
  const R = objM(0, 0, 0, m.rot[0], m.rot[1], m.rot[2]);
  const out = [m4mul(R, m4translate(m.deck ? -260 * eo(clamp01(lt / 18)) : 0, 0, 0))];
  if (m.deck) for (const i of [2, 1]) out.push(m4mul(R, m4translate(i * 120 * (0.7 + 0.3 * eo(clamp01(lt / 16))), -i * 40, -i * 230)));
  return out;
};
const PERIM: [number, number][] = [];
for (let i = 0; i <= 160; i++) { const u = -1 + (2 * i) / 160; PERIM.push([u * PW, -PH], [u * PW, PH], [-PW, u * PH], [PW, u * PH]); }

export const wordFor = (beat: number) => {
  let w = WORDS[0];
  for (const x of WORDS) if (x.beat <= beat + 1e-6) w = x;
  return w;
};
/** on-screen box of a word (measured advance widths of Inter Display 900, tracking −0.05em) */
export const wordBox = (w: typeof WORDS[number]) => {
  const width = w.size * w.em;
  const x0 = w.side === 'L' ? 130 : 1790 - width;
  return {x0, x1: x0 + width, y0: 540 - w.size * 0.52, y1: 540 + w.size * 0.42};
};
const shiftCache: Record<number, number> = {};
export const autoShift = (idx: number) => {
  if (shiftCache[idx] !== undefined) return shiftCache[idx];
  const m = MONTAGE[idx];
  const dur = (idx < MONTAGE.length - 1 ? lb(MONTAGE[idx + 1].beat) : HIT) - lb(m.beat);
  const w = wordFor(m.beat);
  const b = wordBox(w);
  const MARGIN = 56;
  let need = 0;
  for (let lt = 3; lt <= dur + 2; lt += 2) {
    const cam = resolveCam(camPath(lt, m.keys));
    for (const M of paneMats(m, lt)) {
      for (const [px, py] of PERIM) {
        const pr = project(cam, m4apply(M, [px, py, 0]));
        if (!pr.visible || pr.depth < 60 || pr.y < b.y0 - 30 || pr.y > b.y1 + 30) continue;
        if (w.side === 'L') need = Math.max(need, b.x1 + MARGIN - pr.x);
        else need = Math.min(need, b.x0 - MARGIN - pr.x);
      }
    }
  }
  shiftCache[idx] = need;
  return need;
};

/** Render one montage shot at shot-local time lt. f = global frame. */
export const MontageShot: React.FC<{m: MShot; lt: number; t: number; f: number; from: number; idx: number; mbOff?: boolean}> = ({m, lt, t, f, from, idx, mbOff}) => {
  const extra = autoShift(idx);
  const base = (x: number) => {
    const c = camPath(x, m.keys);
    return {...c, shiftX: (c.shiftX ?? 0) + extra};
  };
  const cam = addCam(base(lt), handheld(lt + idx * 40, 1.1, idx + 3), kickZoom(f, 0.02));
  const rc = resolveCam(cam);
  const mo = camMotion(base, lt, [0, 0, 0]);
  const sheen = clamp01((lt - 2) / 22);
  const flash = decay(lt, 0, 5);
  const [rx, ry, rz] = m.rot;
  const world = (
    <World camera={rc} backdrop={m.floor ? <FloorGrid y={m.floor} step={180} extent={4000} center={[0, 0]} fade={[1200, 3800]} opacity={0.35} /> : undefined}>
      <Obj rx={rx} ry={ry} rz={rz}>
        {m.plates ? Array.from({length: m.plates}, (_, i) => (
          <Obj key={i} z={-(m.plates! - i) * (170 + 60 * (1 - eo(clamp01(lt / 16))))} x={(m.plates! - i) * 70} y={-(m.plates! - i) * 46} dof={0.7}>
            <BackPlate o={0.9 - i * 0.15} />
          </Obj>
        )) : null}
        {m.deck ? [2, 1].map((i) => (
          <Obj key={`d${i}`} z={-i * 230} x={i * 120 * (0.7 + 0.3 * eo(clamp01(lt / 16)))} y={-i * 40} dof={0.7}>
            <DesignPane name={m.design} dim={0.25 + 0.2 * i} glow={0.3} />
          </Obj>
        )) : null}
        <Obj x={m.deck ? -260 * eo(clamp01(lt / 18)) : 0}>
          <DesignPane name={m.design} sheen={sheen} flash={flash} />
        </Obj>
        {m.ret && (
          <Obj x={m.ret[0] + (m.deck ? -260 * eo(clamp01(lt / 18)) : 0)} y={m.ret[1]} z={36}>
            <Reticle3D w={m.ret[2]} h={m.ret[3]} label={m.ret[4]} lt={lt} />
          </Obj>
        )}
      </Obj>
    </World>
  );
  const sp = Math.hypot(mo.dx, mo.dy);
  return (
    <AbsoluteFill>
      <SpaceBackdrop from={from} frame={t} camX={rc.yaw * 12 + rc.shiftX * 0.3} camY={-rc.pitch * 8} haze={0.2} intensity={1.15} seed={5 + idx} />
      {sp > 8 && !mbOff ? <MotionBlur vx={mo.dx} vy={mo.dy} shutter={0.6}>{world}</MotionBlur> : world}
      <Bokeh frame={t} count={12} focus={0.05} opacity={0.5} seed={idx * 7 + 2} camX={-(rc.yaw * 30 + rc.shiftX * 0.6 + lt * 6)} camY={rc.pitch * 20} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Statement words                                                      */
/* ------------------------------------------------------------------ */
export const WORDS: {text: string; beat: number; side: 'L' | 'R'; size: number; em: number}[] = [
  {text: 'Describe.', beat: 152, side: 'L', size: 178, em: 4.25},
  {text: 'Build.', beat: 154, side: 'R', size: 236, em: 2.45},
  {text: 'See.', beat: 156, side: 'L', size: 300, em: 2.0},
  {text: 'Ship.', beat: 158, side: 'R', size: 262, em: 2.25},
];

const CUTS_MID = [153, 155, 157, 159, 159.5, 159.75].map((k) => lb(k));

/** Huge statement type, one word per 2 beats: slam (scale + blur + chroma ghosts), jolt on mid cuts, strobe at the end. */
export const MontageWords: React.FC<{t: number; f: number}> = ({t, f}) => {
  const wi = WORDS.findIndex((w, i) => t >= lb(w.beat) && t < (i < WORDS.length - 1 ? lb(WORDS[i + 1].beat) : HIT));
  if (wi < 0) return null;
  const w = WORDS[wi];
  const s0 = lb(w.beat);
  const end = wi < WORDS.length - 1 ? lb(WORDS[wi + 1].beat) : HIT;
  const lt = t - s0;
  const slam = eo(clamp01(lt / 8));
  const sc = mix(1.32, 1, slam) * (1 + 0.035 * clamp01(lt / (end - s0)));
  const blur = Math.max(0, 16 * (1 - clamp01(lt / 6)));
  const ghost = decay(lt, 0, 5);
  // jolt on the mid-cuts
  let jx = 0, jb = 0;
  for (const c of CUTS_MID) if (t >= c && t < c + 8 && c > s0) { const d = decay(t, c, 2.2); jx += (w.side === 'L' ? -1 : 1) * 16 * d; jb += 5 * d; }
  // strobe into the hit
  const strobeO = t >= lb(159.5) ? (Math.floor((t - lb(159.5)) / 2) % 2 === 0 ? 1 : 0.35) : 1;
  const o = clamp01(lt / 2) * (1 - smoothstep(end - 3, end, t)) * strobeO;
  const totalBlur = blur + jb;
  const left = w.side === 'L' ? 130 : undefined;
  const right = w.side === 'R' ? 130 : undefined;
  const origin = w.side === 'L' ? '0% 50%' : '100% 50%';
  const base: React.CSSProperties = {fontFamily: DISPLAY, fontWeight: 900, fontSize: w.size, lineHeight: 1, letterSpacing: '-0.05em', whiteSpace: 'nowrap'};
  const top = 540 - w.size * 0.56;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left, right, top, transform: `translateX(${jx.toFixed(1)}px) scale(${sc.toFixed(4)})`, transformOrigin: origin, opacity: o, filter: totalBlur > 0.4 ? `blur(${totalBlur.toFixed(2)}px)` : undefined}}>
        {ghost > 0.04 && (
          <>
            <div style={{...base, position: 'absolute', left: -22 * ghost, top: 0, color: `rgba(127,231,255,${0.75 * ghost})`, mixBlendMode: 'screen'}}>{w.text}</div>
            <div style={{...base, position: 'absolute', left: 22 * ghost, top: 0, color: `rgba(255,90,200,${0.6 * ghost})`, mixBlendMode: 'screen'}}>{w.text}</div>
          </>
        )}
        <div style={{...base, position: 'absolute', left: 0, top: 0, color: 'rgba(150,115,255,0.2)', textShadow: '0 0 40px rgba(150,115,255,0.85), 0 0 110px rgba(127,231,255,0.35)'}}>{w.text}</div>
        <div style={{...base, position: 'relative', ...gradText(CHROME)}}>{w.text}</div>
      </div>
      {/* horizontal light streak through the word on the slam */}
      <LightStreak start={s0 - 4} dur={18} angle={w.side === 'L' ? 0 : 180} count={5} spread={w.size * 0.7} offset={0} length={1100} thickness={3} intensity={0.9} frame={t} seed={wi + 3} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 540 - 2, height: 4, opacity: 0.9 * decay(lt, 0, 6), background: 'linear-gradient(90deg, transparent, rgba(191,244,255,0.9), transparent)'}} />
    </AbsoluteFill>
  );
};
