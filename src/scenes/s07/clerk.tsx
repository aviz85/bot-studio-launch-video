// s07 Part B: Clerk laser-scans the chat, extracted fields fly into the create_lead function card,
// the function runs in a background lane while the chat keeps talking, ✓ result.
import React from 'react';
import {Obj, V3} from '../../cine';
import {UITheme, GlassPane, Icon, Avatar, TypedChip, Beam3D} from '../../ui';
import {DISPLAY, FONT, MONO} from '../../lib';
import {L, cl, pr, eOutExpo, eOutBack, eInOutCubic, hit, lerp, ss} from './common';

/* ---------------- timing (scene-local) ---------------- */
export const CT = {
  scanA: L(88) + 2, // laser starts
  scanB: L(89) - 2, // laser done
  lockName: L(88.5) - 1,
  lockEmail: L(88.75) + 1,
  lift: L(89),
  fly: L(89.5) - 3,
  slot: L(90),
  config: L(90.5),
  spawn: L(91),
  typing2: L(90.5) + 4,
  msg2: L(91.25),
  typing3: L(92.25),
  msg3: L(92.75),
  result: L(94),
  resultLand: L(94.5),
};

/* ---------------- chat layout (world) ---------------- */
export const CHAT = {x: -560, y: 0, w: 780, h: 1000};
const CL = CHAT.x - CHAT.w / 2; // left edge -820
const CR = CHAT.x + CHAT.w / 2; // right edge -40
const MSG_BOTTOM = 316; // world y of the message-area bottom
const MSG_TOP = -330;
const GAP = 26;
const LINE = 40;

type M = {id: string; from: 'bot' | 'user' | 'sys'; lines: string[]; w: number; at: number; typing?: number};
export const MSGS: M[] = [
  {id: 'm0', from: 'bot', lines: ['Great! What name and email', 'should I use for the booking?'], w: 470, at: -999},
  {id: 'm1', from: 'user', lines: ['I’m Alex Morgan,', 'alex@example.com'], w: 360, at: -999},
  {id: 'm2', from: 'bot', lines: ['Thanks, Alex! Setting that up.'], w: 470, at: CT.msg2, typing: CT.typing2},
  {id: 'm3', from: 'bot', lines: ['Meanwhile, what time suits you?'], w: 490, at: CT.msg3, typing: CT.typing3},
  {id: 'm4', from: 'sys', lines: ['Lead created · L-2048'], w: 420, at: CT.resultLand},
];
const bubH = (m: M, typing: boolean) => (m.from === 'sys' ? 64 : typing ? 78 : m.lines.length * LINE + 40);

/** Layout of the chat at frame t: world centre of each visible bubble. */
export const chatLayout = (t: number) => {
  const items: {m: M; y: number; h: number; p: number; typing: boolean}[] = [];
  // walk from newest to oldest stacking up from the bottom
  let bottom = MSG_BOTTOM;
  for (let i = MSGS.length - 1; i >= 0; i--) {
    const m = MSGS[i];
    const start = m.typing ?? m.at;
    if (t < start) continue;
    const typing = m.typing !== undefined && t < m.at;
    const grow = eOutExpo(cl((t - start) / 12));
    const grow2 = typing ? 1 : m.typing !== undefined ? eOutExpo(cl((t - m.at) / 10)) : 1;
    const hFull = bubH(m, false);
    const h = typing ? bubH(m, true) : m.typing !== undefined ? lerp(bubH(m, true), hFull, grow2) : hFull;
    const slot = (h + GAP) * (m.at < -900 ? 1 : grow);
    items.push({m, y: bottom - h / 2, h, p: m.at < -900 ? 1 : grow, typing});
    bottom -= slot;
  }
  return items;
};
/** world x of a bubble's centre */
const bubX = (m: M) => (m.from === 'bot' ? CL + 34 + 60 + 16 + m.w / 2 : m.from === 'user' ? CR - 34 - 60 - 16 - m.w / 2 : CHAT.x);
/** where the user bubble's name / email fragments sit (world), for scan + chips */
export const userBubbleAt = (t: number) => {
  const it = chatLayout(t).find((x) => x.m.id === 'm1');
  const y = it ? it.y : MSG_BOTTOM - 61;
  const m = MSGS[1];
  const left = bubX(m) - m.w / 2;
  const top = y - bubH(m, false) / 2;
  return {x: bubX(m), y, w: m.w, h: bubH(m, false), name: [left + 24 + 52 + 86, top + 20 + 20, 34] as V3, email: [left + 24 + 134, top + 20 + LINE + 20, 34] as V3};
};

/* ---------------- chat pieces ---------------- */
const ChatPanelBg: React.FC<{t: number; glow?: number}> = ({t, glow = 0.35}) => (
  <UITheme look="frost">
    <GlassPane w={CHAT.w} h={CHAT.h} radius={40} glow={glow} tint="frame" sheen={pr(t, L(91) - 6, 34)}>
      <div style={{position: 'absolute', left: 38, top: 36, right: 38, display: 'flex', alignItems: 'center', fontFamily: FONT}}>
        <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 44, letterSpacing: '-0.03em', color: '#39294B'}}>Try your bot</div>
        <div style={{flex: 1}} />
        <div style={{width: 58, height: 58, borderRadius: 29, background: 'rgba(240,234,253,0.8)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Icon.refresh size={28} /></div>
      </div>
      <div style={{position: 'absolute', left: 38, top: 108, display: 'flex', alignItems: 'center', gap: 14, fontSize: 23, color: '#5D4B77', fontFamily: FONT}}>
        Current state
        <div style={{padding: '7px 16px', borderRadius: 999, background: 'rgba(222,211,250,0.9)', color: '#39294B', fontWeight: 600, fontSize: 22}}>collect_details</div>
      </div>
      <div style={{position: 'absolute', left: 30, right: 30, bottom: 30, height: 92, borderRadius: 46, background: 'rgba(255,255,255,0.6)', boxShadow: 'inset 0 0 0 1.5px rgba(214,200,245,0.95)', display: 'flex', alignItems: 'center', paddingLeft: 32, fontSize: 25, color: 'rgba(57,41,75,0.48)', fontFamily: FONT}}>
        Say something...
        <div style={{position: 'absolute', right: 9, width: 74, height: 74, borderRadius: 37, background: 'linear-gradient(135deg, #8C6BEA, #6A45E0)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px -6px rgba(106,69,224,0.7)'}}>
          <Icon.send size={32} color="#fff" />
        </div>
      </div>
    </GlassPane>
  </UITheme>
);

const Dots: React.FC<{t: number}> = ({t}) => (
  <div style={{display: 'flex', gap: 9, padding: '8px 4px'}}>
    {[0, 1, 2].map((i) => (
      <div key={i} style={{width: 13, height: 13, borderRadius: 7, background: '#8C6BEA', opacity: 0.35 + 0.65 * Math.abs(Math.sin(t / 7 - i * 0.7)), transform: `translateY(${-4 * Math.abs(Math.sin(t / 7 - i * 0.7))}px)`}} />
    ))}
  </div>
);

/** Scan state for the user bubble: laser y (0..1 down the bubble), locks. */
const scanState = (t: number) => {
  const u = pr(t, CT.scanA, CT.scanB - CT.scanA);
  return {u: eInOutCubic(u), on: t >= CT.scanA - 2 && t <= CT.scanB + 8, name: pr(t, CT.lockName, 6), email: pr(t, CT.lockEmail, 6)};
};

const Frag: React.FC<{lock: number; t: number; at: number; children: React.ReactNode}> = ({lock, t, at, children}) => {
  const fl = hit(t, at, 8);
  const pad = lerp(14, 6, eOutExpo(lock));
  return (
    <span style={{position: 'relative', display: 'inline-block'}}>
      {lock > 0 && <span style={{position: 'absolute', left: -6, right: -6, top: 1, bottom: -1, borderRadius: 8, background: `rgba(127,231,255,${0.16 + 0.3 * fl})`, boxShadow: `0 0 ${10 + 24 * fl}px rgba(127,231,255,${0.35 + 0.5 * fl})`}} />}
      {lock > 0 && [0, 1, 2, 3].map((c) => (
        <span key={c} style={{position: 'absolute', width: 12, height: 12, [c < 2 ? 'top' : 'bottom']: -pad, [c % 2 ? 'right' : 'left']: -pad - 6, borderColor: '#1F9DBA', borderStyle: 'solid', borderWidth: 0, [c < 2 ? 'borderTopWidth' : 'borderBottomWidth']: 3, [c % 2 ? 'borderRightWidth' : 'borderLeftWidth']: 3, opacity: lock} as React.CSSProperties} />
      ))}
      <span style={{position: 'relative', color: lock > 0.5 ? '#0F5F78' : undefined, fontWeight: lock > 0.5 ? 700 : undefined}}>{children}</span>
    </span>
  );
};

const Bubble: React.FC<{m: M; t: number; typing: boolean; p: number}> = ({m, t, typing, p}) => {
  const bot = m.from === 'bot';
  const pop = eOutBack(cl((t - (typing ? m.typing! : m.at)) / 14), 2);
  const sc = m.at < -900 ? 1 : lerp(0.55, 1, pop);
  if (m.from === 'sys') {
    const fl = hit(t, m.at, 12);
    return (
      <div style={{transform: `scale(${sc})`, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 26px', borderRadius: 999, background: 'linear-gradient(135deg, rgba(218,241,229,0.96), rgba(231,244,185,0.92))', boxShadow: `inset 0 0 0 1.5px rgba(255,255,255,0.9), 0 0 ${20 + 50 * fl}px rgba(69,227,176,${0.45 + 0.4 * fl}), 0 14px 30px -14px rgba(20,60,40,0.6)`, fontFamily: FONT, fontWeight: 700, fontSize: 27, color: '#1F6E57', whiteSpace: 'nowrap'}}>
        <div style={{width: 36, height: 36, borderRadius: 18, background: '#36997D', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Icon.check size={22} color="#fff" sw={3.5} /></div>
        Lead created<span style={{opacity: 0.5}}>·</span><span style={{fontFamily: MONO}}>L-2048</span>
      </div>
    );
  }
  const scan = m.id === 'm1' ? scanState(t) : null;
  const h = bubH(m, typing);
  return (
    <div style={{display: 'flex', gap: 16, alignItems: 'flex-start', flexDirection: bot ? 'row' : 'row-reverse', width: m.w + 76, fontFamily: FONT, transformOrigin: bot ? '0% 0%' : '100% 0%', transform: `scale(${sc})`, opacity: cl(p * 2)}}>
      {bot ? <Avatar size={60} /> : (
        <div style={{width: 60, height: 60, borderRadius: 30, background: 'rgba(255,255,255,0.86)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', boxShadow: '0 4px 12px rgba(57,41,75,0.15)'}}><Icon.user size={32} /></div>
      )}
      <div style={{position: 'relative', width: typing ? 120 : m.w, height: h, boxSizing: 'border-box', padding: '20px 24px', borderRadius: 26, [bot ? 'borderTopLeftRadius' : 'borderTopRightRadius']: 8, background: bot ? 'rgba(243,239,250,0.9)' : 'rgba(214,200,245,0.94)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.95), 0 10px 26px -14px rgba(40,20,80,0.5)', fontSize: 30, lineHeight: `${LINE}px`, color: '#39294B', overflow: 'hidden', whiteSpace: 'nowrap'} as React.CSSProperties}>
        {typing ? <Dots t={t} /> : m.id === 'm1' && scan ? (
          <>
            <div>I’m <Frag lock={scan.name} t={t} at={CT.lockName}>Alex Morgan</Frag>,</div>
            <div><Frag lock={scan.email} t={t} at={CT.lockEmail}>alex@example.com</Frag></div>
            {scan.on && (
              <>
                <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: `${scan.u * 100}%`, background: 'linear-gradient(180deg, rgba(127,231,255,0) 0%, rgba(127,231,255,0.10) 70%, rgba(127,231,255,0.32) 100%)'}} />
              </>
            )}
          </>
        ) : m.lines.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
};

/** The laser plane (separate Obj in front of the bubble so its glow can spill past the bubble). */
const Laser: React.FC<{t: number; w: number; h: number}> = ({t, w, h}) => {
  const s = scanState(t);
  if (!s.on) return null;
  const o = ss(CT.scanA - 2, CT.scanA + 3, t) * (1 - ss(CT.scanB, CT.scanB + 8, t));
  const y = s.u * h;
  return (
    <div style={{position: 'relative', width: w + 220, height: h + 120, opacity: o}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 60 + y - 40, height: 80, background: 'radial-gradient(50% 50% at 50% 50%, rgba(127,231,255,0.55), rgba(127,231,255,0.12) 55%, transparent 75%)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 60 + y - 2, height: 4, background: 'linear-gradient(90deg, transparent, #BFF4FF 12%, #FFFFFF 50%, #BFF4FF 88%, transparent)', boxShadow: '0 0 18px #7FE7FF, 0 0 40px rgba(127,231,255,0.7)'}} />
      {/* edge brackets of the scan frame */}
      {[0, 1].map((side) => (
        <div key={side} style={{position: 'absolute', [side ? 'right' : 'left']: 60, top: 40, bottom: 40, width: 18, borderColor: 'rgba(127,231,255,0.8)', borderStyle: 'solid', borderWidth: 0, borderTopWidth: 2, borderBottomWidth: 2, [side ? 'borderRightWidth' : 'borderLeftWidth']: 2} as React.CSSProperties} />
      ))}
      <div style={{position: 'absolute', left: 60, top: h + 84, fontFamily: MONO, fontSize: 15, letterSpacing: '0.2em', color: '#BFF4FF', textShadow: '0 0 8px rgba(127,231,255,0.8)', background: 'rgba(12,6,28,0.78)', padding: '6px 12px', borderRadius: 8, boxShadow: 'inset 0 0 0 1px rgba(127,231,255,0.45)', whiteSpace: 'nowrap'}}>CLERK · EXTRACTING FIELDS · {Math.round(s.u * 100)}%</div>
    </div>
  );
};

export const ChatRig: React.FC<{t: number; laser?: boolean; glow?: number}> = ({t, laser = true, glow}) => {
  const items = chatLayout(t);
  const ub = userBubbleAt(t);
  return (
    <>
      <Obj key="panel" x={CHAT.x} y={CHAT.y} z={0}><ChatPanelBg t={t} glow={glow} /></Obj>
      {items.map(({m, y, typing, p}) => {
        const vis = ss(MSG_TOP - 30, MSG_TOP + 50, y);
        if (vis <= 0.01) return null;
        const x = bubX(m) + (m.from === 'sys' ? 0 : m.from === 'bot' ? -38 : 38);
        return (
          <Obj key={m.id} x={x} y={y} z={m.from === 'sys' ? 40 : 22} o={vis < 1 ? vis : 1}>
            <Bubble m={m} t={t} typing={typing} p={p} />
          </Obj>
        );
      })}
      {laser && t >= CT.scanA - 3 && t <= CT.scanB + 9 && (
        <Obj key="laser" x={ub.x} y={ub.y} z={60}><Laser t={t} w={ub.w} h={ub.h} /></Obj>
      )}
    </>
  );
};

/* ---------------- function card (holo) ---------------- */
export const FN = {x: 640, y: -80, z: -260, ry: -16, w: 880, h: 840};
const fnLocal = (lx: number, ly: number, lz = 0): V3 => {
  // card-local (top-left origin) → world, matching Obj rotateY(ry)
  const x = lx - FN.w / 2, y = ly - FN.h / 2;
  const a = (FN.ry * Math.PI) / 180;
  return [FN.x + x * Math.cos(a) + lz * Math.sin(a), FN.y + y, FN.z - x * Math.sin(a) + lz * Math.cos(a)];
};
const PROW = [252, 330, 408];
const VCOL = 612; // value slot left
export const SLOT = {name: fnLocal(VCOL + 120, PROW[0] + 30, 24), email: fnLocal(VCOL + 120, PROW[1] + 30, 24), center: fnLocal(FN.w / 2, FN.h / 2), lane: fnLocal(FN.w / 2, FN.h - 40, 0)};

const Th: React.FC<{children: React.ReactNode; w: number}> = ({children, w}) => <div style={{width: w, fontSize: 18, color: 'rgba(205,187,255,0.6)', fontWeight: 600}}>{children}</div>;
const Fld: React.FC<{w: number; mono?: boolean; children: React.ReactNode; hot?: number}> = ({w, mono, children, hot = 0}) => (
  <div style={{width: w, height: 56, borderRadius: 12, boxSizing: 'border-box', display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: 23, fontFamily: mono ? MONO : FONT, color: '#F3EEFF', background: hot > 0 ? `rgba(231,244,185,${0.1 + 0.12 * hot})` : 'rgba(8,4,20,0.5)', boxShadow: `inset 0 0 0 1.5px ${hot > 0 ? `rgba(231,244,185,${0.4 + 0.5 * hot})` : 'rgba(127,231,255,0.28)'}${hot > 0 ? `, 0 0 ${18 * hot}px rgba(231,244,185,${0.5 * hot})` : ''}`, whiteSpace: 'nowrap', overflow: 'hidden'}}>{children}</div>
);

export const FnCard: React.FC<{t: number; progress: number}> = ({t, progress}) => {
  const fill = (at: number) => pr(t, at - 2, 8);
  const fn = fill(CT.slot), fe = fill(CT.slot + 2);
  const cfg = pr(t, CT.config, 10);
  const fl = hit(t, CT.slot, 10) + 0.8 * hit(t, CT.result, 12);
  const done = t >= CT.result;
  const rv = pr(t, CT.result, 8);
  return (
    <UITheme look="holo">
      <GlassPane w={FN.w} h={FN.h} radius={34} glow={0.35 + 0.4 * cfg} flash={cl(fl)} rim={1.2}>
        <div style={{position: 'absolute', inset: 0, fontFamily: FONT, color: '#F3EEFF', padding: '34px 36px', boxSizing: 'border-box'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
            <div style={{width: 54, height: 54, borderRadius: 16, background: 'radial-gradient(circle at 35% 30%, #FFE7B0, #FFC04D 60%)', color: '#2A1606', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 30, boxShadow: '0 0 22px rgba(255,192,77,0.6)'}}>ƒ</div>
            <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 46, letterSpacing: '-0.025em', textShadow: '0 0 22px rgba(160,130,255,0.55)'}}>Create lead</div>
            <div style={{flex: 1}} />
            <div style={{fontFamily: MONO, fontSize: 21, padding: '8px 14px', borderRadius: 10, background: 'rgba(140,107,234,0.26)', color: '#CDBBFF', boxShadow: 'inset 0 0 0 1px rgba(160,130,255,0.4)'}}>create_lead</div>
          </div>
          <div style={{fontSize: 22, color: 'rgba(216,203,255,0.78)', marginTop: 12}}>Save contact details provided by the visitor.</div>
          <div style={{fontWeight: 800, fontSize: 25, marginTop: 26, fontFamily: DISPLAY}}>Parameters</div>
          <div style={{display: 'flex', gap: 16, marginTop: 12}}><Th w={200}>Name</Th><Th w={150}>Type</Th><Th w={210}>Required</Th><Th w={240}>Value</Th></div>
          {[['full_name', 'String', true, 'Alex Morgan', fn], ['email', 'Email', true, 'alex@example.com', fe], ['interest', 'String', false, '', 0]].map(([n, ty, req, val, hot], i) => (
            <div key={i} style={{position: 'absolute', left: 36, top: PROW[i], display: 'flex', alignItems: 'center', gap: 16}}>
              <Fld w={200} mono>{n as string}</Fld>
              <Fld w={150}>{ty as string}<span style={{flex: 1}} /><span style={{fontSize: 14, opacity: 0.6}}>▾</span></Fld>
              <div style={{width: 210, display: 'flex', alignItems: 'center', gap: 12, fontSize: 22, color: req ? '#F3EEFF' : 'rgba(205,187,255,0.6)'}}>
                <div style={{width: 26, height: 26, borderRadius: 7, background: req ? 'linear-gradient(135deg, #A98BFF, #6A45E0)' : 'transparent', boxShadow: req ? '0 0 12px rgba(160,130,255,0.6)' : 'inset 0 0 0 2px rgba(180,155,242,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{req ? <Icon.check size={18} color="#fff" sw={3.5} /> : null}</div>
                {req ? 'Required' : 'Optional'}
              </div>
              <Fld w={240} hot={hot as number}><span style={{color: '#EEF8CC', opacity: cl((hot as number) * 3), fontFamily: MONO, fontSize: 21}}>{(hot as number) > 0 ? (val as string) : ''}</span></Fld>
            </div>
          ))}
          <div style={{position: 'absolute', left: 36, top: 492, fontWeight: 800, fontSize: 25, fontFamily: DISPLAY}}>Return value</div>
          <div style={{position: 'absolute', left: 36, top: 532, display: 'flex', alignItems: 'center', gap: 16}}>
            <Fld w={200} mono>lead_id</Fld>
            <Fld w={150}>String</Fld>
            <Fld w={466} hot={rv}>{done ? <span style={{fontFamily: MONO, color: '#EEF8CC', fontSize: 22}}>L-2048 <span style={{color: '#72F2C8'}}>✓ returned</span></span> : <span style={{color: 'rgba(205,187,255,0.55)', fontSize: 21}}>Unique identifier for the created lead</span>}</Fld>
          </div>
          <div style={{position: 'absolute', left: 36, top: 620, fontWeight: 800, fontSize: 25, fontFamily: DISPLAY}}>Configuration</div>
          <div style={{position: 'absolute', left: 36, top: 662, display: 'flex', gap: 14}}>
            {['Clerk extracts arguments', 'Async'].map((x, i) => {
              const on = pr(t, CT.config + i * 3, 8);
              return (
                <div key={x} style={{padding: '10px 20px', borderRadius: 999, fontSize: 21, fontWeight: 600, color: on > 0.5 ? '#0B0618' : '#CDBBFF', background: on > 0.5 ? (i ? 'linear-gradient(135deg, #BFF4FF, #7FE7FF)' : 'linear-gradient(135deg, #E9E0FF, #A98BFF)') : 'rgba(140,107,234,0.2)', boxShadow: `inset 0 0 0 1.5px rgba(190,168,255,0.5), 0 0 ${24 * on}px rgba(${i ? '127,231,255' : '160,130,255'},${0.7 * on})`}}>{x}</div>
              );
            })}
            <div style={{padding: '10px 20px', borderRadius: 999, fontSize: 21, color: 'rgba(205,187,255,0.8)', background: 'rgba(140,107,234,0.14)'}}>Timeout 30 s</div>
          </div>
          {/* run strip */}
          <div style={{position: 'absolute', left: 36, right: 36, bottom: 30, height: 64, borderRadius: 18, background: 'rgba(8,4,20,0.55)', boxShadow: `inset 0 0 0 1.5px rgba(${done ? '69,227,176' : '127,231,255'},${0.3 + 0.4 * cl(progress * 3)})`, overflow: 'hidden', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14, opacity: 0.35 + 0.65 * cl(pr(t, CT.spawn - 6, 8))}}>
            <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress * 100}%`, background: done ? 'linear-gradient(90deg, rgba(69,227,176,0.1), rgba(69,227,176,0.4))' : 'linear-gradient(90deg, rgba(127,231,255,0.06), rgba(127,231,255,0.3))'}} />
            {done ? <div style={{position: 'relative', width: 26, height: 26, borderRadius: 13, background: '#45E3B0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 14px #45E3B0'}}><Icon.check size={16} color="#06231C" sw={3.5} /></div>
              : <div style={{position: 'relative', width: 24, height: 24, borderRadius: 12, border: '3px solid rgba(127,231,255,0.25)', borderTopColor: '#7FE7FF', transform: `rotate(${t * 14}deg)`, boxSizing: 'border-box'}} />}
            <div style={{position: 'relative', fontFamily: MONO, fontSize: 20, letterSpacing: '0.08em', color: done ? '#B9FBE2' : '#BFF4FF'}}>{t < CT.spawn ? 'READY' : done ? 'DONE · RETURNED L-2048' : 'RUNNING IN BACKGROUND · ASYNC'}</div>
          </div>
        </div>
      </GlassPane>
    </UITheme>
  );
};

/* ---------------- background lane ---------------- */
export type LaneGeo = {x: number; y: number; z: number; ry: number};
export const LANE = {x: 300, y: 610, z: -720, ry: -12, w: 1900, h: 170};
export const laneProgress = (t: number) => {
  if (t < CT.spawn) return 0;
  const u = pr(t, CT.spawn, CT.result - CT.spawn);
  // eager start, steady middle, snap at the end
  return cl(0.08 * eOutExpo(cl(u * 4)) + 0.92 * Math.pow(u, 1.25));
};
export const laneLocal = (u: number, g: LaneGeo = LANE): V3 => {
  const x = -LANE.w / 2 + 420 + u * (LANE.w - 420 - 230);
  const a = (g.ry * Math.PI) / 180;
  return [g.x + x * Math.cos(a), g.y - LANE.h / 2 + 80, g.z - x * Math.sin(a)];
};
const STEPS = ['Extract', 'Validate', 'POST create-lead', 'Await result', 'Return'];

export const Lane: React.FC<{t: number}> = ({t}) => {
  const p = laneProgress(t);
  const appear = eOutExpo(pr(t, CT.spawn - 4, 14));
  const done = t >= CT.result;
  const fl = hit(t, CT.result, 12);
  const trackW = LANE.w - 420 - 230;
  return (
    <div style={{opacity: cl(appear * 1.5), transform: `scaleX(${lerp(0.2, 1, appear)})`, transformOrigin: '0% 50%'}}>
      <UITheme look="holo">
        <GlassPane w={LANE.w} h={LANE.h} radius={30} glow={0.25 + 0.6 * fl} flash={fl} rim={1.3} tint="glass">
          <div style={{position: 'absolute', inset: 0, fontFamily: FONT, color: '#F3EEFF'}}>
            <div style={{position: 'absolute', left: 34, top: 30, fontFamily: MONO, fontSize: 18, letterSpacing: '0.24em', color: '#7FE7FF', textShadow: '0 0 10px #7FE7FF'}}>BACKGROUND LANE · ASYNC</div>
            <div style={{position: 'absolute', left: 34, top: 70, display: 'flex', alignItems: 'center', gap: 14}}>
              <div style={{width: 46, height: 46, borderRadius: 14, background: 'radial-gradient(circle at 35% 30%, #FFE7B0, #FFC04D 60%)', color: '#2A1606', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 26}}>ƒ</div>
              <div style={{fontFamily: MONO, fontSize: 32, fontWeight: 700}}>create_lead</div>
            </div>
            {/* track */}
            <div style={{position: 'absolute', left: 420, top: 74, width: trackW, height: 12, borderRadius: 6, background: 'rgba(180,155,242,0.16)'}}>
              <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${p * 100}%`, borderRadius: 6, background: done ? 'linear-gradient(90deg, rgba(69,227,176,0.4), #45E3B0)' : 'linear-gradient(90deg, rgba(127,231,255,0.15), #7FE7FF)', boxShadow: `0 0 18px ${done ? '#45E3B0' : '#7FE7FF'}`}} />
              {!done && p > 0 && <div style={{position: 'absolute', left: `${p * 100}%`, top: -24, width: 60, height: 60, marginLeft: -30, borderRadius: 30, background: 'radial-gradient(closest-side, #FFFFFF, rgba(127,231,255,0.8) 35%, rgba(127,231,255,0) 100%)'}} />}
              {STEPS.map((s, i) => {
                const at = i / (STEPS.length - 1);
                const on = p >= at - 0.001;
                return (
                  <div key={s} style={{position: 'absolute', left: `${at * 100}%`, top: -8, width: 0}}>
                    <div style={{position: 'absolute', left: -14, top: 0, width: 28, height: 28, borderRadius: 14, background: on ? (done || i < STEPS.length - 1 ? '#45E3B0' : '#7FE7FF') : 'rgba(30,16,60,0.95)', boxShadow: on ? '0 0 14px rgba(69,227,176,0.9)' : 'inset 0 0 0 2px rgba(180,155,242,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{on && <Icon.check size={16} color="#06231C" sw={3.5} />}</div>
                    <div style={{position: 'absolute', left: -120, width: 240, top: 44, textAlign: 'center', fontSize: 22, fontWeight: 600, color: on ? '#F3EEFF' : 'rgba(205,187,255,0.45)', whiteSpace: 'nowrap'}}>{s}</div>
                  </div>
                );
              })}
            </div>
            {/* result */}
            <div style={{position: 'absolute', right: 30, top: 50, width: 190, height: 70, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: MONO, fontSize: 26, fontWeight: 700, color: done ? '#06231C' : 'rgba(205,187,255,0.5)', background: done ? 'linear-gradient(135deg, #B9FBE2, #45E3B0)' : 'rgba(140,107,234,0.12)', boxShadow: done ? `0 0 ${24 + 40 * fl}px rgba(69,227,176,0.8)` : 'inset 0 0 0 1.5px rgba(180,155,242,0.3)'}}>
              {done ? 'L-2048' : <span style={{fontSize: 20, letterSpacing: '0.1em'}}>{`${Math.round(p * 100)}%`}</span>}
            </div>
          </div>
        </GlassPane>
      </UITheme>
    </div>
  );
};

/* ---------------- extracted field chips ---------------- */
type ChipP = {pos: V3; o: number; glow: number; s: number};
/** world path of a field chip: lift off the bubble (89) → fly (89.5) → slot into the card (90) */
export const chipAt = (t: number, which: 'name' | 'email'): ChipP | null => {
  if (t < CT.lift - 2 || t > CT.slot + 3) return null;
  const ub = userBubbleAt(CT.lift);
  const a = which === 'name' ? ub.name : ub.email;
  const lifted: V3 = [a[0] + (which === 'name' ? 250 : 300), a[1] + (which === 'name' ? -30 : 50), 110];
  const end = which === 'name' ? SLOT.name : SLOT.email;
  const lu = eOutExpo(pr(t, CT.lift - 2, 14));
  const fu = pr(t, CT.fly, CT.slot - CT.fly);
  const fe = fu < 0.5 ? 4 * fu * fu * fu : 1 - Math.pow(-2 * fu + 2, 3) / 2;
  const p0: V3 = [lerp(a[0], lifted[0], lu), lerp(a[1], lifted[1], lu), lerp(a[2], lifted[2], lu)];
  const arc = Math.sin(Math.PI * fe);
  const pos: V3 = fu <= 0 ? p0 : [lerp(lifted[0], end[0], fe), lerp(lifted[1], end[1], fe) - 160 * arc * (which === 'name' ? 1 : 0.6), lerp(lifted[2], end[2], fe) + 260 * arc];
  const o = cl((t - (CT.lift - 2)) / 4) * (1 - cl((t - CT.slot) / 3));
  return {pos, o, glow: 0.6 + 0.8 * hit(t, CT.lift, 10) + 0.6 * ss(0.6, 1, fu), s: lerp(0.8, 1, lu)};
};

export const FieldChips: React.FC<{t: number; trails?: boolean}> = ({t, trails = true}) => (
  <>
    {(['name', 'email'] as const).map((w) => {
      const c = chipAt(t, w);
      if (!c) return null;
      const ghosts = trails && t > CT.fly ? [1, 2, 3, 4, 5].map((k) => chipAt(t - k * 1.2, w)).filter(Boolean) as ChipP[] : [];
      return (
        <React.Fragment key={w}>
          {ghosts.map((g, k) => (
            <Obj key={`g${k}`} x={g.pos[0]} y={g.pos[1]} z={g.pos[2]} billboard dof={false}>
              <div style={{width: 220 - k * 24, height: 60 - k * 6, borderRadius: 40, background: `radial-gradient(closest-side, rgba(191,244,255,${0.42 - k * 0.07}), rgba(127,231,255,0))`}} />
            </Obj>
          ))}
          <Obj x={c.pos[0]} y={c.pos[1]} z={c.pos[2]} s={c.s} o={c.o} billboard>
            <TypedChip look="holo" kind="field" tone="cyan" size={34} name={w === 'name' ? 'full_name' : 'email'} value={w === 'name' ? 'Alex Morgan' : 'alex@example.com'} glow={c.glow} p={1} />
          </Obj>
        </React.Fragment>
      );
    })}
  </>
);

/** light beam from the card's run strip down into the lane at spawn */
export const SpawnBeam: React.FC<{t: number}> = ({t}) => {
  const d = pr(t, CT.spawn - 4, 10);
  if (d <= 0) return null;
  const o = 1 - 0.7 * pr(t, CT.spawn + 10, 30);
  const a = SLOT.lane;
  const b = laneLocal(0.0);
  return <Beam3D a={a} b={[b[0] - 380, b[1] - 60, b[2]]} draw={d} o={o} thick={3} pulse={pr(t, CT.spawn - 2, 16)} />;
};
