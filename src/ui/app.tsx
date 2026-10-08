import React from 'react';
import {C, FONT, DISPLAY, prog, expoOut, backOut, lerp, clamp} from '../lib';
import {Icon, Avatar, Card, Pill} from './kit';

export const APP_W = 1600;
export const APP_H = 1000;

const NAV: [string, string][] = [
  ['General', 'home'], ['States', 'layers'], ['Policies', 'shield'], ['Judgments', 'scale'], ['Prompt chunks', 'doc'],
  ['Automations', 'bolt'], ['Functions', 'braces'], ['Evaluation', 'chart'], ['Versions', 'history'], ['BotScript', 'code'],
];

/** 3D-aware positioned box inside the app (coordinates in app space). */
export const Part: React.FC<{x: number; y: number; w: number; h: number; z?: number; o?: number; s?: number; ty?: number; rx?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({x, y, w, h, z = 0, o = 1, s = 1, ty = 0, rx = 0, children, style}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, transform: `translateZ(${z}px) translateY(${ty}px) rotateX(${rx}deg) scale(${s})`, transformStyle: 'preserve-3d', opacity: o, ...style}}>{children}</div>
);

export const Sidebar: React.FC<{active: string; t?: number}> = ({active, t = 999}) => (
  <div style={{width: 250, height: APP_H, padding: '26px 16px', boxSizing: 'border-box', fontFamily: FONT, color: C.plum}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 34, paddingLeft: 10}}>
      <Avatar size={46} />
      <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 26, letterSpacing: '-0.02em'}}>Bot Studio</div>
    </div>
    <NavRow label="Live Dashboard" icon="home" active={active === 'Live Dashboard'} p={prog(t, 0, 20)} />
    <div style={{height: 1, background: 'rgba(57,41,75,0.1)', margin: '12px 10px'}} />
    {NAV.map(([l, ic], i) => (
      <NavRow key={l} label={l} icon={ic} active={active === l} p={prog(t, 2 + i * 2, 20)} />
    ))}
    <div style={{position: 'absolute', bottom: 34, left: 16, right: 16}}>
      <NavRow label="Build with AI" icon="sparkle" active={active === 'Build with AI'} p={prog(t, 20, 20)} />
    </div>
  </div>
);

const NavRow: React.FC<{label: string; icon: string; active: boolean; p: number}> = ({label, icon, active, p}) => {
  const I = Icon[icon];
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 16, padding: '11px 16px', borderRadius: 16, background: active ? C.pistachio : 'transparent', fontWeight: active ? 700 : 500, fontSize: 19, marginBottom: 3, opacity: p, transform: `translateX(${(1 - p) * -20}px)`, boxShadow: active ? '0 6px 18px -8px rgba(110,140,30,0.5)' : undefined}}>
      <I size={23} />
      {label}
    </div>
  );
};

export const TopBar: React.FC<{title?: string}> = ({title = 'Welcome assistant'}) => (
  <div style={{height: 76, display: 'flex', alignItems: 'center', gap: 22, fontFamily: FONT, color: C.plum, width: 1330}}>
    <div style={{fontSize: 23, fontWeight: 600}}>{title}</div>
    <div style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, color: C.plumSoft}}>
      <div style={{width: 9, height: 9, borderRadius: 5, background: C.green}} /> Saved
    </div>
    <div style={{flex: 1}} />
    <div style={{fontSize: 26, letterSpacing: 2, color: C.plum}}>•••</div>
    <Pill bg={C.lilac2} color={C.purpleDeep} style={{padding: '10px 26px'}}>Demo</Pill>
  </div>
);

export const PageTitle: React.FC<{title: string; sub: string; p?: number; right?: React.ReactNode}> = ({title, sub, p = 1, right}) => (
  <div style={{display: 'flex', alignItems: 'flex-start', fontFamily: FONT, color: C.plum, opacity: p, transform: `translateY(${(1 - p) * 20}px)`}}>
    <div>
      <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 50, letterSpacing: '-0.03em', lineHeight: 1}}>{title}</div>
      <div style={{width: 94 * p, height: 5, borderRadius: 3, background: C.purple, marginTop: 10}} />
      <div style={{fontSize: 21, color: C.plumSoft, marginTop: 10}}>{sub}</div>
    </div>
    <div style={{flex: 1}} />
    {right}
  </div>
);

/* ---------------- Chat ---------------- */
export type Msg = {from: 'bot' | 'user'; text: string; at: number; react?: {emoji: string; at: number}; typingFrom?: number; tag?: string};

export const Bubble: React.FC<{m: Msg; t: number; width?: number}> = ({m, t, width = 230}) => {
  const p = prog(t, m.at, 22, backOut);
  const pa = prog(t, m.at, 14);
  const typing = m.typingFrom !== undefined && t >= m.typingFrom && t < m.at;
  if (t < (m.typingFrom ?? m.at)) return null;
  const bot = m.from === 'bot';
  const rp = m.react ? prog(t, m.react.at, 20, backOut) : 0;
  return (
    <div style={{display: 'flex', gap: 12, alignItems: 'flex-start', flexDirection: bot ? 'row' : 'row-reverse', marginBottom: 18, fontFamily: FONT}}>
      {bot ? <Avatar size={44} /> : <div style={{width: 44, height: 44, borderRadius: 22, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(57,41,75,0.1)'}}><Icon.user size={24} /></div>}
      <div style={{position: 'relative', transformOrigin: bot ? '0% 0%' : '100% 0%', transform: typing ? undefined : `scale(${lerp(0.6, 1, p)})`, opacity: typing ? 1 : pa}}>
        <div style={{background: bot ? '#F3EFFA' : C.lilac2, padding: '14px 18px', borderRadius: 20, borderTopLeftRadius: bot ? 6 : 20, borderTopRightRadius: bot ? 20 : 6, fontSize: 19, lineHeight: 1.35, color: C.plum, maxWidth: width}}>
          {typing ? <TypingDots t={t} /> : m.text}
          {m.tag && !typing && <div style={{marginTop: 8}}><Pill bg="#DDF2E8" color={C.green} style={{fontSize: 14, padding: '4px 10px'}}><Icon.check size={14} color={C.green} sw={3} />{m.tag}</Pill></div>}
        </div>
        {m.react && t >= m.react.at && (
          <div style={{position: 'absolute', bottom: -16, [bot ? 'right' : 'left']: -10, background: '#fff', borderRadius: 16, padding: '2px 7px', fontSize: 22, boxShadow: '0 6px 16px rgba(57,41,75,0.2)', transform: `scale(${rp})`, fontFamily: 'Noto Color Emoji'} as React.CSSProperties}>{m.react.emoji}</div>
        )}
      </div>
    </div>
  );
};

const TypingDots: React.FC<{t: number}> = ({t}) => (
  <div style={{display: 'flex', gap: 6, padding: '6px 4px'}}>
    {[0, 1, 2].map((i) => (
      <div key={i} style={{width: 9, height: 9, borderRadius: 5, background: C.purple, opacity: 0.35 + 0.65 * Math.abs(Math.sin(t / 7 - i * 0.7)), transform: `translateY(${-3 * Math.abs(Math.sin(t / 7 - i * 0.7))}px)`}} />
    ))}
  </div>
);

export const DEFAULT_CHAT: Msg[] = [
  {from: 'bot', text: 'What would you like to explore?', at: -100},
  {from: 'user', text: 'I need a booking assistant.', at: -100},
  {from: 'bot', text: 'Great. What should it help your visitors book?', at: -100},
];

export const ChatPanel: React.FC<{t: number; msgs?: Msg[]; state?: string; input?: string; w?: number; h?: number}> = ({t, msgs = DEFAULT_CHAT, state = 'collect_details', input = 'Say something...', w = 360, h = 895}) => (
  <Card style={{width: w, height: h, padding: 26, boxSizing: 'border-box'}}>
    <div style={{display: 'flex', alignItems: 'center'}}>
      <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 32, letterSpacing: '-0.02em'}}>Try your bot</div>
      <div style={{flex: 1}} />
      <div style={{width: 44, height: 44, borderRadius: 22, background: '#F3EFFA', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Icon.refresh size={22} /></div>
    </div>
    <div style={{display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, marginBottom: 26, fontSize: 18, color: C.plumSoft}}>
      Current state <Pill bg={C.lilac} style={{fontSize: 17, padding: '6px 14px'}}>{state}</Pill>
    </div>
    <div style={{position: 'absolute', left: 26, right: 26, top: 150, bottom: 110, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden'}}>
      {msgs.map((m, i) => <Bubble key={i} m={m} t={t} width={w - 140} />)}
    </div>
    <div style={{position: 'absolute', left: 22, right: 22, bottom: 22, height: 70, borderRadius: 35, border: '1.5px solid #E2DAF2', display: 'flex', alignItems: 'center', paddingLeft: 24, fontSize: 19, color: '#A79BB8', background: '#fff'}}>
      {input}
      <div style={{position: 'absolute', right: 6, width: 60, height: 60, borderRadius: 30, background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px -6px rgba(106,69,224,0.7)'}}>
        <Icon.send size={26} color="#fff" />
      </div>
    </div>
  </Card>
);

/** Full app window. `e` explodes layers along Z. */
export const AppFrame: React.FC<{active: string; t: number; e?: number; main: React.ReactNode; chat?: React.ReactNode; navT?: number; glow?: number}> = ({active, t, e = 0, main, chat, navT = 999, glow = 0}) => (
  <div style={{position: 'relative', width: APP_W, height: APP_H, transformStyle: 'preserve-3d'}}>
    <div style={{position: 'absolute', inset: 0, borderRadius: 40, background: `linear-gradient(160deg, #F8F5FD, ${C.canvas})`, boxShadow: `0 60px 140px -30px rgba(10,4,20,0.8), 0 0 ${80 * glow}px rgba(140,107,234,${0.6 * glow}), 0 0 0 1.5px rgba(255,255,255,0.6) inset`}} />
    <Part x={14} y={0} w={250} h={APP_H} z={e * 60}><Sidebar active={active} t={navT} /></Part>
    <Part x={276} y={6} w={1300} h={76} z={e * 40}><TopBar /></Part>
    <Part x={264} y={86} w={940} h={895} z={e * 120}>{main}</Part>
    <Part x={1222} y={86} w={360} h={895} z={e * 200}>{chat ?? <ChatPanel t={t} />}</Part>
  </div>
);

export const clampP = clamp;
export {expoOut};
