import React from 'react';
import {FONT, DISPLAY, prog, expoOut, backOut, lerp, clamp} from '../lib';
import {Icon, Avatar, Card, Pill} from './kit';
import {useUI, Look, MaybeTheme} from './theme';
import {GlassUnder, Rim, glassRoot} from './skin';

export const APP_W = 1600;
export const APP_H = 1000;

export const NAV: [string, string][] = [
  ['General', 'home'], ['States', 'layers'], ['Policies', 'shield'], ['Judgments', 'scale'], ['Prompt chunks', 'doc'],
  ['Automations', 'bolt'], ['Functions', 'braces'], ['Evaluation', 'chart'], ['Versions', 'history'], ['BotScript', 'code'],
];

/** 3D-aware positioned box inside the app (coordinates in app space). */
export const Part: React.FC<{x: number; y: number; w: number; h: number; z?: number; o?: number; s?: number; ty?: number; rx?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({x, y, w, h, z = 0, o = 1, s = 1, ty = 0, rx = 0, children, style}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, transform: `translateZ(${z}px) translateY(${ty}px) rotateX(${rx}deg) scale(${s})`, transformStyle: 'preserve-3d', opacity: o, ...style}}>{children}</div>
);

export const Sidebar: React.FC<{active: string; t?: number}> = ({active, t = 999}) => {
  const th = useUI();
  return (
    <div style={{width: 250, height: APP_H, padding: '26px 16px', boxSizing: 'border-box', fontFamily: FONT, color: th.text, position: 'relative'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 34, paddingLeft: 10}}>
        <Avatar size={46} glow={th.dark ? 0.6 : 0} />
        <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 26, letterSpacing: '-0.02em', textShadow: th.dark ? `0 0 18px rgba(${th.glow},0.6)` : undefined}}>Bot Studio</div>
      </div>
      <NavRow label="Live Dashboard" icon="home" active={active === 'Live Dashboard'} p={prog(t, 0, 20)} />
      <div style={{height: 1, background: th.divider, margin: '12px 10px'}} />
      {NAV.map(([l, ic], i) => (
        <NavRow key={l} label={l} icon={ic} active={active === l} p={prog(t, 2 + i * 2, 20)} />
      ))}
      <div style={{position: 'absolute', bottom: 34, left: 16, right: 16}}>
        <NavRow label="Build with AI" icon="sparkle" active={active === 'Build with AI'} p={prog(t, 20, 20)} />
      </div>
    </div>
  );
};

const NavRow: React.FC<{label: string; icon: string; active: boolean; p: number}> = ({label, icon, active, p}) => {
  const th = useUI();
  const I = Icon[icon];
  const fg = active ? th.onPistachio : th.text;
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '11px 16px', borderRadius: 16, background: active ? th.pistachio : 'transparent', color: fg, fontWeight: active ? 700 : 500, fontSize: 19, marginBottom: 3, opacity: p, transform: `translateX(${(1 - p) * -20}px)`,
        boxShadow: active ? (th.dark ? 'inset 0 0 0 1px rgba(231,244,185,0.45), 0 0 22px -4px rgba(231,244,185,0.45)' : '0 6px 18px -8px rgba(110,140,30,0.5)') : undefined,
      }}
    >
      <I size={23} color={fg} />
      {label}
    </div>
  );
};

export const TopBar: React.FC<{title?: string}> = ({title = 'Welcome assistant'}) => {
  const th = useUI();
  return (
    <div style={{height: 76, display: 'flex', alignItems: 'center', gap: 22, fontFamily: FONT, color: th.text, width: 1330}}>
      <div style={{fontSize: 23, fontWeight: 600}}>{title}</div>
      <div style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, color: th.textSoft}}>
        <div style={{width: 9, height: 9, borderRadius: 5, background: th.sig.green, boxShadow: th.dark ? `0 0 8px ${th.sig.green}` : undefined}} /> Saved
      </div>
      <div style={{flex: 1}} />
      <div style={{fontSize: 26, letterSpacing: 2, color: th.text}}>•••</div>
      <Pill tone="lilac2" style={{padding: '10px 26px'}}>Demo</Pill>
    </div>
  );
};

export const PageTitle: React.FC<{title: string; sub: string; p?: number; right?: React.ReactNode}> = ({title, sub, p = 1, right}) => {
  const th = useUI();
  return (
    <div style={{display: 'flex', alignItems: 'flex-start', fontFamily: FONT, color: th.text, opacity: p, transform: `translateY(${(1 - p) * 20}px)`}}>
      <div>
        <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 50, letterSpacing: '-0.03em', lineHeight: 1, textShadow: th.dark ? `0 0 26px rgba(${th.glow},0.55)` : undefined}}>{title}</div>
        <div style={{width: 94 * p, height: 5, borderRadius: 3, background: th.accent, marginTop: 10, boxShadow: th.dark ? `0 0 12px ${th.accent}` : undefined}} />
        <div style={{fontSize: 21, color: th.textSoft, marginTop: 10}}>{sub}</div>
      </div>
      <div style={{flex: 1}} />
      {right}
    </div>
  );
};

/* ---------------- Chat ---------------- */
export type Msg = {from: 'bot' | 'user'; text: string; at: number; react?: {emoji: string; at: number}; typingFrom?: number; tag?: string};

export const UserIcon: React.FC<{size?: number}> = ({size = 44}) => {
  const th = useUI();
  return (
    <div style={{width: size, height: size, borderRadius: size / 2, background: th.surfaceStrong, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: th.dark ? `inset 0 0 0 1px ${th.insetBorder}` : '0 4px 12px rgba(57,41,75,0.1)', flex: 'none'}}>
      <Icon.user size={size * 0.55} />
    </div>
  );
};

export const Bubble: React.FC<{m: Msg; t: number; width?: number}> = ({m, t, width = 230}) => {
  const th = useUI();
  const p = prog(t, m.at, 22, backOut);
  const pa = prog(t, m.at, 14);
  const typing = m.typingFrom !== undefined && t >= m.typingFrom && t < m.at;
  if (t < (m.typingFrom ?? m.at)) return null;
  const bot = m.from === 'bot';
  const rp = m.react ? prog(t, m.react.at, 20, backOut) : 0;
  return (
    <div style={{display: 'flex', gap: 12, alignItems: 'flex-start', flexDirection: bot ? 'row' : 'row-reverse', marginBottom: 18, fontFamily: FONT}}>
      {bot ? <Avatar size={44} /> : <UserIcon />}
      <div style={{position: 'relative', transformOrigin: bot ? '0% 0%' : '100% 0%', transform: typing ? undefined : `scale(${lerp(0.6, 1, p)})`, opacity: typing ? 1 : pa}}>
        <div
          style={{
            background: bot ? th.bubbleBot : th.bubbleUser, padding: '14px 18px', borderRadius: 20, borderTopLeftRadius: bot ? 6 : 20, borderTopRightRadius: bot ? 20 : 6, fontSize: 19, lineHeight: 1.35, color: th.text, maxWidth: width,
            boxShadow: th.dark ? `inset 0 0 0 1px ${bot ? 'rgba(180,155,242,0.28)' : 'rgba(127,231,255,0.3)'}` : th.look === 'frost' ? 'inset 0 1px 0 rgba(255,255,255,0.9)' : undefined,
          }}
        >
          {typing ? <TypingDots t={t} /> : m.text}
          {m.tag && !typing && <div style={{marginTop: 8}}><Pill tone="green" style={{fontSize: 14, padding: '4px 10px'}}><Icon.check size={14} color={th.greenText} sw={3} />{m.tag}</Pill></div>}
        </div>
        {m.react && t >= m.react.at && (
          <div style={{position: 'absolute', bottom: -16, [bot ? 'right' : 'left']: -10, background: th.surfaceStrong, borderRadius: 16, padding: '2px 7px', fontSize: 22, boxShadow: '0 6px 16px rgba(57,41,75,0.2)', transform: `scale(${rp})`, fontFamily: 'Noto Color Emoji'} as React.CSSProperties}>{m.react.emoji}</div>
        )}
      </div>
    </div>
  );
};

const TypingDots: React.FC<{t: number}> = ({t}) => {
  const th = useUI();
  return (
    <div style={{display: 'flex', gap: 6, padding: '6px 4px'}}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{width: 9, height: 9, borderRadius: 5, background: th.accent, opacity: 0.35 + 0.65 * Math.abs(Math.sin(t / 7 - i * 0.7)), transform: `translateY(${-3 * Math.abs(Math.sin(t / 7 - i * 0.7))}px)`}} />
      ))}
    </div>
  );
};

export const DEFAULT_CHAT: Msg[] = [
  {from: 'bot', text: 'What would you like to explore?', at: -100},
  {from: 'user', text: 'I need a booking assistant.', at: -100},
  {from: 'bot', text: 'Great. What should it help your visitors book?', at: -100},
];

export const ChatPanel: React.FC<{t: number; msgs?: Msg[]; state?: string; input?: string; w?: number; h?: number; look?: Look; glow?: number; sheen?: number; flash?: number; blur?: number}> = ({t, msgs = DEFAULT_CHAT, state = 'collect_details', input = 'Say something...', w = 360, h = 895, look, glow, sheen, flash, blur}) => (
  <MaybeTheme look={look}>
    <ChatBody t={t} msgs={msgs} state={state} input={input} w={w} h={h} glow={glow} sheen={sheen} flash={flash} blur={blur} />
  </MaybeTheme>
);

const ChatBody: React.FC<{t: number; msgs: Msg[]; state: string; input: string; w: number; h: number; glow?: number; sheen?: number; flash?: number; blur?: number}> = ({t, msgs, state, input, w, h, glow, sheen, flash, blur}) => {
  const th = useUI();
  return (
    <Card style={{width: w, height: h, padding: 26, boxSizing: 'border-box'}} glow={glow} sheen={sheen} flash={flash} blur={blur}>
      <div style={{display: 'flex', alignItems: 'center'}}>
        <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 32, letterSpacing: '-0.02em', textShadow: th.dark ? `0 0 20px rgba(${th.glow},0.5)` : undefined}}>Try your bot</div>
        <div style={{flex: 1}} />
        <div style={{width: 44, height: 44, borderRadius: 22, background: th.inset, boxShadow: th.look !== 'solid' ? `inset 0 0 0 1px ${th.insetBorder}` : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Icon.refresh size={22} /></div>
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, marginBottom: 26, fontSize: 18, color: th.textSoft}}>
        Current state <Pill tone="lilac" style={{fontSize: 17, padding: '6px 14px'}}>{state}</Pill>
      </div>
      <div style={{position: 'absolute', left: 26, right: 26, top: 150, bottom: 110, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden'}}>
        {msgs.map((m, i) => <Bubble key={i} m={m} t={t} width={w - 140} />)}
      </div>
      <div style={{position: 'absolute', left: 22, right: 22, bottom: 22, height: 70, borderRadius: 35, boxShadow: `inset 0 0 0 1.5px ${th.fieldBorder}${th.dark ? `, 0 0 18px -6px rgba(${th.glow2},0.5)` : ''}`, display: 'flex', alignItems: 'center', paddingLeft: 24, fontSize: 19, color: th.textFaint, background: th.field}}>
        {input}
        <div style={{position: 'absolute', right: 6, width: 60, height: 60, borderRadius: 30, background: th.accentGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 20px -6px rgba(106,69,224,0.7)${th.dark ? `, 0 0 24px rgba(${th.glow},0.6)` : ''}`}}>
          <Icon.send size={26} color="#fff" />
        </div>
      </div>
    </Card>
  );
};

/** App window base (look-aware glass). */
export const AppBase: React.FC<{glow?: number; radius?: number; style?: React.CSSProperties}> = ({glow = 0, radius = 40, style}) => {
  const th = useUI();
  const r = glassRoot(th, {fill: th.frame, glow});
  return (
    <div style={{position: 'absolute', inset: 0, borderRadius: radius, overflow: 'hidden', zIndex: 0, ...r, boxShadow: th.look === 'solid' ? `0 60px 140px -30px rgba(10,4,20,0.8), 0 0 ${80 * glow}px rgba(140,107,234,${0.6 * glow}), 0 0 0 1.5px rgba(255,255,255,0.6) inset` : r.boxShadow, ...style}}>
      {th.look !== 'solid' && <GlassUnder th={th} />}
      <Rim gradient={th.rim} width={th.rimWidth} />
    </div>
  );
};

/** Full app window. `e` explodes layers along Z. (Look follows the nearest <UITheme>, or `look`.) */
export const AppFrame: React.FC<{active: string; t: number; e?: number; main: React.ReactNode; chat?: React.ReactNode; navT?: number; glow?: number; look?: Look}> = ({active, t, e = 0, main, chat, navT = 999, glow = 0, look}) => (
  <MaybeTheme look={look}>
    <div style={{position: 'relative', width: APP_W, height: APP_H, transformStyle: 'preserve-3d'}}>
      <AppBase glow={glow} />
      <Part x={14} y={0} w={250} h={APP_H} z={e * 60}><Sidebar active={active} t={navT} /></Part>
      <Part x={276} y={6} w={1300} h={76} z={e * 40}><TopBar /></Part>
      <Part x={264} y={86} w={940} h={895} z={e * 120}>{main}</Part>
      <Part x={1222} y={86} w={360} h={895} z={e * 200}>{chat ?? <ChatPanel t={t} />}</Part>
    </div>
  </MaybeTheme>
);

export const clampP = clamp;
export {expoOut};
