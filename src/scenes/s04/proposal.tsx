// Shot H (beats 48–50): the proposal. Rows of "Proposed changes" fly in on half beats (48, 48.5, 49, 49.5) and
// each projects a tiny hologram of what it creates: an intent choice, a state orb, a function card, a judgment.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {DISPLAY, FONT, MONO, kick, C} from '../../lib';
import {World, Obj, CamKey, addCam, handheld, kickPush, resolveCam, project, FloorGrid, V3, camPath} from '../../cine';
import {DustField, Glint} from '../../vfx';
import {UITheme, useUI} from '../../ui/theme';
import {Icon, Pill} from '../../ui/kit';
import {GlassPane, TypedChip, Beam3D} from '../../ui/glass';
import {CHANGES} from '../../ui/screens';
import {Sky, HudTag, HoloOrb, kf, sat, pr, hit, easeOutExpo} from './common';

export const CARD_W = 1760, CARD_H = 1060;
export const ROW_Y = (i: number) => -250 + i * 196;
const ROW_X = -CARD_W / 2 + 70; // left edge of rows
/** frames (since the shot's cut) at which row i starts flying; it lands LAND_R later */
export const ROW_START = [0, 13, 26, 40];
export const LAND_R = 7;
/** where each hologram hovers (relative to card centre) */
export const HOLO_POS: V3[] = [[560, ROW_Y(0) - 10, 300], [640, ROW_Y(1) - 20, 380], [560, ROW_Y(2) + 4, 300], [600, ROW_Y(3) + 6, 330]];

const Row: React.FC<{i: number; lt: number}> = ({i, lt}) => {
  const th = useUI();
  const [a, b] = CHANGES[i];
  const p = pr(lt, ROW_START[i] + LAND_R - 1, 10);
  return (
    <div style={{width: 1180, height: 170, display: 'flex', alignItems: 'center', gap: 36, fontFamily: FONT, color: th.text}}>
      <div style={{width: 96, height: 96, borderRadius: 48, background: th.chip, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 44, color: th.accentText, flex: 'none',
        boxShadow: `inset 0 0 0 2px rgba(255,255,255,0.8), 0 0 ${(30 * hit(lt, ROW_START[i] + LAND_R, 8)).toFixed(0)}px rgba(127,231,255,0.9)`}}>
        {p > 0.6 ? <Icon.check size={48} sw={3} color={th.greenText} /> : i + 1}
      </div>
      <div>
        <div style={{fontWeight: 700, fontSize: 50, letterSpacing: '-0.01em', whiteSpace: 'nowrap'}}>{a}</div>
        <div style={{fontSize: 33, color: th.textSoft, marginTop: 6, whiteSpace: 'nowrap'}}>{b}</div>
      </div>
    </div>
  );
};

/** row pose: flies in from the right, slightly toward the camera */
const rowPose = (i: number, lt: number) => {
  const u = pr(lt, ROW_START[i], LAND_R);
  const e = easeOutExpo(u);
  return {x: 1500 * (1 - e), z: 420 * (1 - e), ry: -38 * (1 - e), o: sat(u * 3)};
};

const Holo: React.FC<{i: number; lt: number; t: number; f: number}> = ({i, lt, t, f}) => {
  const p = pr(lt, ROW_START[i] + LAND_R + 1, 14);
  if (p <= 0) return null;
  const k = kick(f, 10);
  if (i === 1)
    return (
      <div style={{position: 'relative'}}>
        <HoloOrb size={250} label="collect_details" icon={<Icon.doc size={56} color="#fff" sw={2} />} tone="cyan" glow={0.7 + 0.5 * k} p={p} />
      </div>
    );
  if (i === 2)
    return (
      <div style={{transform: `scale(${(0.6 + 0.4 * easeOutExpo(p)).toFixed(3)})`, opacity: sat(p * 3)}}>
        <GlassPane look="holo" w={560} h={176} radius={30} glow={0.6 + 0.5 * k} padding="26px 30px">
          <div style={{fontFamily: MONO, fontSize: 36, color: '#FFD27A', textShadow: '0 0 16px rgba(255,192,77,0.8)', whiteSpace: 'nowrap'}}>ƒ book_appointment</div>
          <div style={{display: 'flex', gap: 12, marginTop: 18}}>
            {['name', 'email', 'time'].map((x) => <div key={x} style={{fontFamily: MONO, fontSize: 22, color: '#EDE6FF', padding: '6px 14px', borderRadius: 999, background: 'rgba(140,107,234,0.26)', boxShadow: 'inset 0 0 0 1px rgba(205,187,255,0.35)'}}>{x}</div>)}
            <div style={{fontFamily: MONO, fontSize: 22, color: '#72F2C8', padding: '6px 14px', borderRadius: 999, background: 'rgba(60,220,170,0.14)'}}>async</div>
          </div>
        </GlassPane>
      </div>
    );
  if (i === 0) return <TypedChip look="holo" name="intent" value="booking" conf={0.92} kind="choice" size={40} p={p} pulse={0.5 * k} />;
  return <TypedChip look="holo" name="booked" value="yes" conf={0.96} kind="noul" size={40} p={p} pulse={0.5 * k} />;
};

export const ProposalSet: React.FC<{lt: number; t: number; f: number; rowsAll?: boolean; holos?: boolean}> = ({lt, t, f, rowsAll, holos = true}) => {
  const k = kick(f, 9);
  const valid = pr(lt, 50, 12);
  return (
    <>
      <Obj x={0} y={0} z={-500} dof={false}>
        <div style={{width: 3600, height: 2200, background: `radial-gradient(50% 50% at 50% 50%, rgba(140,107,234,${(0.32 + 0.1 * k).toFixed(3)}), rgba(127,231,255,0.05) 55%, transparent 75%)`}} />
      </Obj>
      {/* card backplate + header */}
      <Obj x={0} y={0} z={0}>
        <GlassPane look="frost" w={CARD_W} h={CARD_H} radius={56} glow={0.35} padding="54px 70px">
          <UITheme look="frost">
            <div style={{display: 'flex', alignItems: 'center', gap: 24}}>
              <Icon.doc size={56} />
              <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 58, letterSpacing: '-0.02em', color: C.plum}}>Proposed changes</div>
              <div style={{flex: 1}} />
              <div style={{opacity: valid, transform: `scale(${(0.7 + 0.3 * easeOutExpo(valid)).toFixed(3)})`}}>
                <Pill tone="pistachio" style={{fontSize: 34, padding: '14px 28px', gap: 12}}><Icon.check size={34} sw={3} color={C.plum} />Validated</Pill>
              </div>
            </div>
          </UITheme>
        </GlassPane>
      </Obj>
      {/* rows (separate 3D objects so they can fly in) */}
      {[0, 1, 2, 3].map((i) => {
        const q = rowsAll ? {x: 0, z: 0, ry: 0, o: 1} : rowPose(i, lt);
        if (q.o <= 0) return null;
        return (
          <Obj key={i} x={ROW_X + 590 + q.x} y={ROW_Y(i)} z={8 + q.z} ry={q.ry} o={q.o}>
            <UITheme look="frost"><Row i={i} lt={rowsAll ? 999 : lt} /></UITheme>
          </Obj>
        );
      })}
      {/* holograms + beams */}
      {holos && [0, 1, 2, 3].map((i) => {
        const hp = HOLO_POS[i];
        const p = rowsAll ? 1 : pr(lt, ROW_START[i] + LAND_R, 12);
        if (p <= 0) return null;
        const bob = 10 * Math.sin((t + i * 17) / 14);
        return (
          <React.Fragment key={i}>
            <Beam3D a={[hp[0] - 40, hp[1] + 30, 10]} b={[hp[0], hp[1] + bob, hp[2] - 40]} o={0.9 * p} thick={3} draw={p} pulse={((t + i * 9) % 30) / 30} />
            <Obj x={hp[0]} y={hp[1] + bob} z={hp[2]}>
              <Holo i={i} lt={rowsAll ? 999 : lt} t={t} f={f} />
            </Obj>
          </React.Fragment>
        );
      })}
    </>
  );
};

export const ProposalShot: React.FC<{lt: number; t: number; from: number}> = ({lt, t, from}) => {
  const f = t + from;
  const keys: CamKey[] = [
    {at: 0, target: [-20, ROW_Y(0) - 40, 120], yaw: -27, pitch: -17, roll: -6, dist: 2080, focal: 32},
    {at: 53, ease: 'linear', target: [60, ROW_Y(3) - 60, 120], yaw: -16, pitch: -12, roll: -3, dist: 1960},
  ];
  const cam = addCam(camPath(lt, keys), handheld(lt, 0.7, 31), kickPush(f, 24));
  const rc = resolveCam(cam);
  // focus follows the newest row
  const cur = ROW_START.reduce((a, s, i) => (lt >= s ? i : a), 0);
  const focusP: V3 = [0, ROW_Y(cur), 60];
  const glints = [0, 1, 2, 3].map((i) => ({i, p: project(rc, [ROW_X + 48, ROW_Y(i), 20]), g: hit(lt, ROW_START[i] + LAND_R, 7)}));
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <Sky cam={cam} from={from} t={t} haze={0.4} />
      <World camera={cam} focus={focusP} aperture={7} backdrop={<FloorGrid y={760} step={170} opacity={0.3} center={[0, -500]} extent={4200} fade={[900, 4000]} />}>
        <ProposalSet lt={lt} t={t} f={f} />
      </World>
      {glints.map(({i, p, g}) => (g > 0.02 && p.visible ? <Glint key={i} x={p.x} y={p.y} size={200} intensity={1.3 * g} spin={1.2} frame={t} /> : null))}
      <DustField frame={t} count={70} camY={lt * 2} boost={kick(f) * 0.5} />
      <HudTag x={150} y={150} t={lt - 2} label="Generated proposal" value={`changes ${Math.min(4, cur + (lt >= ROW_START[cur] + LAND_R ? 1 : 0))} / 4`} />
    </AbsoluteFill>
  );
};
