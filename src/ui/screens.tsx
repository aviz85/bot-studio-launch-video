import React from 'react';
import {C, FONT, DISPLAY, MONO, prog, expoOut, backOut, lerp, clamp, band, rand, kick} from '../lib';
import {Icon, Avatar, Card, Pill, Shine} from './kit';
import {PageTitle, Part} from './app';
import {useUI, Theme, Tone, toneColors, sigColor, withA} from './theme';

/** Holo-only text glow. */
const tg = (th: Theme, a = 0.55, r = 22) => (th.dark ? `0 0 ${r}px rgba(${th.glow},${a})` : undefined);
/** Map a v1 brand colour to the theme's equivalent. */
export const themed = (th: Theme, c: string) =>
  c === C.green ? th.sig.green : c === C.amber ? th.sig.amber : c === C.purple ? th.sig.purple : c === C.purpleDeep ? th.accentText : c === C.plum ? th.text : c;

/* =============== Live Dashboard =============== */
export const METRICS = [
  'Enjoyment', 'Trust', 'Curiosity', 'Clarity', 'Engagement', 'Readiness', 'Intent certainty', 'Goal clarity', 'Detail completeness', 'Name collected', 'Email collected', 'Consent present', 'Next step clarity', 'Tool readiness', 'Sentiment',
  'Frustration', 'Confusion', 'Urgency', 'Human handoff', 'User waiting', 'Conversation pace', 'Topic focus', 'Answer relevance', 'Answer accuracy', 'Instruction fit', 'Tone warmth', 'Reply brevity', 'Follow-up need', 'Task progress', 'Politeness',
  'Lead readiness', 'Contact quality', 'Schedule intent', 'Booking readiness', 'Outcome truthfulness', 'Recovery quality', 'Result clarity', 'Summary quality', 'Actionability', 'Policy alignment', 'Session completion', 'User understanding', 'Goal alignment', 'Final quality', 'Momentum',
];

export const signalValue = (i: number, f: number, live = 1) => {
  const base = 0.2 + 0.65 * rand(i * 3.3);
  const b = band(f, i % 5, 5);
  const wob = 0.08 * Math.sin(f / (18 + rand(i) * 30) + i);
  const v = base * (1 - 0.55 * live) + live * (0.55 * b * (0.55 + rand(i * 2.1) * 0.7)) + wob * live;
  return clamp(v, 0.04, 1);
};
/** Brand (solid/frost) threshold colour. Use `sigColor(theme, v)` for the look-aware version. */
export const signalColor = (v: number) => (v >= 0.62 ? C.green : v < 0.3 ? C.amber : C.purple);

/** A single horizontal signal meter (label + bar). */
export const SignalMeter: React.FC<{label: string; v: number; o?: number; fs?: number; barH?: number}> = ({label, v, o = 1, fs = 14.5, barH = 13}) => {
  const th = useUI();
  const col = sigColor(th, v);
  const g = th.barGlow;
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 10, opacity: o}}>
      <div style={{width: '52%', fontSize: fs, color: th.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{label}</div>
      <div style={{flex: 1, height: barH, borderRadius: barH / 2, background: th.track, overflow: 'hidden', boxShadow: th.dark ? 'inset 0 0 0 1px rgba(180,155,242,0.1)' : undefined}}>
        <div style={{width: `${v * 100}%`, height: '100%', borderRadius: barH / 2, background: th.dark ? `linear-gradient(90deg, ${withA(col, 0.55)}, ${col} 85%, #fff)` : `linear-gradient(90deg, ${col}, ${col}DD)`, boxShadow: `0 0 ${Math.round(10 * g)}px ${withA(col, 0.55)}`}} />
      </div>
    </div>
  );
};

export const SignalWall: React.FC<{f: number; t: number; reveal?: number; live?: number; cols?: number; w?: number; h?: number; title?: boolean}> = ({f, t, reveal = 0, live = 1, cols = 3, w = 590, h = 580, title = true}) => {
  const th = useUI();
  const rows = Math.ceil(METRICS.length / cols);
  return (
    <Card style={{width: w, height: h, padding: '24px 22px', boxSizing: 'border-box'}}>
      {title && <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 27, marginBottom: 16, letterSpacing: '-0.01em', textShadow: tg(th)}}>Signal Wall</div>}
      <div style={{display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoFlow: 'column', gridTemplateRows: `repeat(${rows}, 1fr)`, columnGap: 18, rowGap: 0, height: h - (title ? 92 : 48)}}>
        {METRICS.map((m, i) => {
          const p = prog(t, reveal + (i % rows) * 1.2 + Math.floor(i / rows) * 4, 26);
          return <SignalMeter key={m} label={m} v={signalValue(i, f, live) * p} o={clamp(p * 1.5)} />;
        })}
      </div>
    </Card>
  );
};

const Row: React.FC<{icon?: string; children: React.ReactNode; p: number; tone?: Tone; fs?: number; pad?: string; mb?: number}> = ({icon, children, p, tone, fs = 16, pad = '8px 12px', mb = 7}) => {
  const th = useUI();
  const I = icon ? Icon[icon] : null;
  const tc = tone ? toneColors(th, tone) : {bg: th.inset, fg: th.text};
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 10, background: tc.bg, color: tc.fg, borderRadius: 12, padding: pad, fontSize: fs, marginBottom: mb, opacity: p, transform: `translateX(${(1 - p) * 30}px)`, boxShadow: th.look !== 'solid' ? `inset 0 0 0 1px ${tone ? 'rgba(255,255,255,0.12)' : th.insetBorder}` : undefined}}>
      {I && <I size={18} color={tc.fg} />}
      {children}
    </div>
  );
};

export const SpeakerPrompt: React.FC<{t: number; at: number}> = ({t, at}) => {
  const th = useUI();
  return (
    <Card style={{width: 335, height: 250, padding: 18, boxSizing: 'border-box'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 20, marginBottom: 12}}><Icon.doc size={22} />Speaker prompt</div>
      <Row icon="doc" p={prog(t, at, 18)}>System</Row>
      <Row icon="layers" p={prog(t, at + 5, 18)}>State · collect_details</Row>
      <Row icon="sparkle" p={prog(t, at + 10, 18)} tone="pistachio">Chunk · acknowledge</Row>
      <div style={{fontSize: 14.5, color: th.textSoft, lineHeight: 1.4, padding: '4px 4px', opacity: prog(t, at + 16, 20)}}>
        Acknowledge the user's request, confirm what we're collecting, and ask a focused next question.
      </div>
    </Card>
  );
};

const Spinner: React.FC<{t: number; size?: number; color?: string}> = ({t, size = 18, color}) => {
  const th = useUI();
  const c = color ?? th.accent;
  return <div style={{width: size, height: size, borderRadius: '50%', border: `3px solid ${withA(c, 0.2)}`, borderTopColor: c, transform: `rotate(${t * 12}deg)`, boxSizing: 'border-box', boxShadow: th.dark ? `0 0 10px ${withA(c, 0.6)}` : undefined}} />;
};

export const ClerkActivity: React.FC<{t: number; at: number; done?: number; w?: number; h?: number; big?: boolean}> = ({t, at, done = 1e9, w = 335, h = 200, big}) => {
  const th = useUI();
  const s = big ? 1.25 : 1;
  const steps = [
    {label: 'Extracting fields', at: at},
    {label: 'Name: Alex Morgan', at: at + 8, sub: true},
    {label: 'Email: alex@example.com', at: at + 16, sub: true},
    {label: 'Running function', at: at + 26},
    {label: t >= done ? 'Result: lead_id · L-2048' : 'Awaiting result', at: at + 34},
  ];
  return (
    <Card style={{width: w, height: h, padding: 18 * s, boxSizing: 'border-box'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 20 * s, marginBottom: 10}}>
        <Icon.gear size={22 * s} />Clerk activity
        <div style={{flex: 1}} />
        <Pill tone="lilac" color={th.accentText} style={{fontSize: 13 * s, padding: '3px 10px'}}>Async</Pill>
      </div>
      <div style={{background: th.chip, color: th.accentText, borderRadius: 12, padding: `${6 * s}px 14px`, fontFamily: MONO, fontSize: 16 * s, marginBottom: 8 * s, boxShadow: th.dark ? `inset 0 0 0 1px rgba(${th.glow},0.35), 0 0 16px -4px rgba(${th.glow},0.5)` : undefined}}>create_lead</div>
      {steps.map((st, i) => {
        const p = prog(t, st.at, 16);
        const isRun = i === 3;
        const isWait = i === 4;
        const ok = isWait ? t >= done : isRun ? t >= done : t >= st.at + 6;
        const fin = isWait && t >= done;
        return (
          <div key={i} style={{display: 'flex', alignItems: 'center', gap: 10, fontSize: (st.sub ? 13.5 : 15) * s, marginBottom: 3 * s, paddingLeft: st.sub ? 26 * s : 0, opacity: p, transform: `translateY(${(1 - p) * 8}px)`, color: fin ? th.greenText : st.sub ? th.textSoft : th.text, fontWeight: fin ? 700 : 400}}>
            {!st.sub && (isRun && !ok ? <Spinner t={t} size={16 * s} /> : <div style={{width: 16 * s, height: 16 * s, borderRadius: 9, background: ok ? th.sig.green : 'transparent', border: ok ? 'none' : `2px solid ${th.chip2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', boxShadow: ok && th.dark ? `0 0 10px ${th.sig.green}` : undefined}}>{ok && <Icon.check size={11 * s} color="#fff" sw={3.5} />}</div>)}
            <span style={{flex: 1}}>{st.label}</span>
            {st.sub && ok && <Icon.check size={15 * s} color={th.greenText} sw={3} />}
          </div>
        );
      })}
    </Card>
  );
};

export const Decisions: React.FC<{t: number; at: number}> = ({t, at}) => (
  <Card style={{width: 335, height: 106, padding: '10px 14px', boxSizing: 'border-box'}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 18, marginBottom: 5}}><Icon.scale size={20} />Decisions</div>
    <Row icon="check" p={prog(t, at, 18, backOut)} tone="green" fs={15} pad="5px 10px" mb={4}>Happy start matched</Row>
    <Row icon="clock" p={prog(t, at + 10, 18, backOut)} tone="amber" fs={15} pad="5px 10px" mb={0}>Collect details → follow up</Row>
  </Card>
);

export const TIMELINE = [
  {label: 'Message sent', ms: 0, c: C.purple},
  {label: 'Judge complete', ms: 200, c: C.green},
  {label: 'Fields extracted', ms: 350, c: C.amber},
  {label: 'Prompt ready', ms: 420, c: C.purple},
  {label: 'First token', ms: 520, c: C.amber},
  {label: 'Function result', ms: 780, c: C.purple},
  {label: 'Last token', ms: 1240, c: C.green},
];

export const Timeline: React.FC<{t: number; at: number; step?: number; w?: number; h?: number; scale?: number}> = ({t, at, step = 6, w = 940, h = 189, scale = 1}) => {
  const th = useUI();
  const x0 = 60 * scale + 20, x1 = w - (70 * scale + 30);
  const lineP = prog(t, at, step * 7 + 10, expoOut);
  return (
    <Card style={{width: w, height: h, padding: 20, boxSizing: 'border-box'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 21 * scale}}><Icon.clock size={24 * scale} />Turn timeline</div>
      <div style={{position: 'absolute', left: x0, top: h * 0.56, width: x1 - x0, height: 3, background: th.track, borderRadius: 2}} />
      <div style={{position: 'absolute', left: x0, top: h * 0.56, width: (x1 - x0) * lineP, height: 3, background: `linear-gradient(90deg, ${th.sig.purple}, ${th.sig.green})`, borderRadius: 2, boxShadow: th.dark ? `0 0 12px ${th.sig.purple}` : undefined}} />
      {TIMELINE.map((e, i) => {
        const x = x0 + (x1 - x0) * (e.ms / 1240);
        const p = prog(t, at + i * step, 18, backOut);
        const up = i % 2 === 1 ? false : true;
        const fs = 15 * scale;
        const c = themed(th, e.c);
        return (
          <div key={i} style={{position: 'absolute', left: x, top: h * 0.56 + 1, transform: 'translate(-50%,-50%)', opacity: clamp(p * 2)}}>
            <div style={{width: 20 * scale, height: 20 * scale, borderRadius: '50%', border: `${4 * scale}px solid ${c}`, background: th.dark ? '#120a24' : th.surfaceStrong, transform: `scale(${p})`, boxSizing: 'border-box', boxShadow: `0 0 ${14 * p * (th.dark ? 1.6 : 1)}px ${c}`}} />
            <div style={{position: 'absolute', left: '50%', [up ? 'bottom' : 'top']: 26 * scale, transform: 'translateX(-50%)', textAlign: 'center', whiteSpace: 'nowrap', fontSize: fs, color: th.text, fontWeight: 600}}>
              {e.label}
              <div style={{fontWeight: 400, color: th.textSoft}}>{Math.round(e.ms * clamp(p)).toLocaleString('en-US')} ms</div>
            </div>
          </div>
        );
      })}
    </Card>
  );
};

/** Live dashboard main area (940x895). e = explode depth. */
export const DashboardMain: React.FC<{f: number; t: number; e?: number; rv?: number; live?: number}> = ({f, t, e = 0, rv = 0, live = 1}) => {
  const th = useUI();
  const turn = 8;
  return (
    <div style={{position: 'relative', width: 940, height: 895, transformStyle: 'preserve-3d', fontFamily: FONT, color: th.text}}>
      <Part x={14} y={6} w={920} h={100} z={e * 30}>
        <PageTitle title="Live Dashboard" sub="See every signal, decision and action." p={prog(t, rv, 24)}
          right={<div style={{display: 'flex', gap: 14, alignItems: 'center', marginTop: 4}}>
            <Pill tone="pistachio" style={{fontSize: 19}}><div style={{width: 11, height: 11, borderRadius: 6, background: th.sig.green, boxShadow: `0 0 ${6 + 10 * kick(f)}px ${th.sig.green}`}} />Live · Turn {turn}</Pill>
            <Pill tone="white" style={{fontSize: 17}}>Current state <span style={{background: th.chip, color: th.chipText, borderRadius: 999, padding: '3px 12px'}}>collect_details</span></Pill>
          </div>} />
      </Part>
      <Part x={0} y={112} w={590} h={580} z={e * 90} o={prog(t, rv + 4, 20)}><SignalWall f={f} t={t} reveal={rv + 4} live={live} /></Part>
      <Part x={605} y={112} w={335} h={250} z={e * 150} o={prog(t, rv + 10, 20)}><SpeakerPrompt t={t} at={rv + 14} /></Part>
      <Part x={605} y={374} w={335} h={200} z={e * 190} o={prog(t, rv + 16, 20)}><ClerkActivity t={t} at={rv + 20} done={rv + 80} /></Part>
      <Part x={605} y={586} w={335} h={106} z={e * 230} o={prog(t, rv + 22, 20)}><Decisions t={t} at={rv + 30} /></Part>
      <Part x={0} y={706} w={940} h={189} z={e * 120} o={prog(t, rv + 26, 20)}><Timeline t={t} at={rv + 30} /></Part>
    </div>
  );
};

/* =============== Build with AI =============== */
export const PROMPT_TEXT = 'Create a friendly booking assistant that understands the visitor’s needs, gathers details and books an appointment.';

export const BuildPromptCard: React.FC<{t: number; typeAt: number; pressAt: number; w?: number}> = ({t, typeAt, pressAt, w = 1100}) => {
  const th = useUI();
  const n = Math.floor(clamp((t - typeAt) / 46) * PROMPT_TEXT.length);
  const press = t >= pressAt && t < pressAt + 10 ? 0.94 : 1;
  const ripple = prog(t, pressAt, 30);
  const caret = Math.floor(t / 15) % 2 === 0 && t < pressAt;
  const typing = t >= typeAt && t < pressAt;
  return (
    <Card style={{width: w, padding: '34px 40px', boxSizing: 'border-box'}}>
      <div style={{display: 'flex', gap: 30}}>
        <div style={{width: 110, height: 110, borderRadius: 30, flex: 'none', background: th.dark ? 'radial-gradient(circle at 40% 35%, rgba(169,139,255,0.55), rgba(40,20,80,0.5))' : 'radial-gradient(circle at 40% 35%, #FFFFFF, #E9E0FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: th.dark ? `0 0 34px -6px rgba(${th.glow},0.8), inset 0 0 0 1px rgba(${th.glow2},0.35)` : '0 12px 30px -10px rgba(140,107,234,0.6)'}}>
          <div style={{transform: `rotate(${t * 1.2}deg) scale(${1 + 0.08 * Math.sin(t / 8)})`}}><Icon.sparkle size={62} color={th.dark ? '#E9E1FF' : C.purpleDeep} sw={2.2} /></div>
        </div>
        <div style={{flex: 1}}>
          <div style={{fontWeight: 800, fontSize: 30, fontFamily: DISPLAY, textShadow: tg(th, 0.4)}}>Describe what you want to build</div>
          <div style={{fontSize: 19, color: th.textSoft, marginTop: 4}}>Be specific about your bot's purpose, what it should handle and any key requirements.</div>
          <div style={{marginTop: 20, border: `2px solid ${typing ? th.fieldFocus : th.fieldBorder}`, background: th.field, borderRadius: 20, padding: '20px 24px', minHeight: 96, fontSize: 25, lineHeight: 1.45, color: th.text, boxShadow: typing ? `0 0 0 6px rgba(${th.dark ? th.glow2 : '140,107,234'},0.15)${th.dark ? `, 0 0 30px -6px rgba(${th.glow2},0.6)` : ''}` : undefined}}>
            {PROMPT_TEXT.slice(0, n)}
            {caret && <span style={{display: 'inline-block', width: 3, height: 30, background: th.dark ? th.fieldFocus : C.purpleDeep, verticalAlign: 'middle', marginLeft: 2, boxShadow: th.dark ? `0 0 8px ${th.fieldFocus}` : undefined}} />}
          </div>
          <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: 22}}>
            <div style={{position: 'relative', transform: `scale(${press})`}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 12, padding: '18px 34px', borderRadius: 999, background: th.accentGrad, color: '#fff', fontWeight: 700, fontSize: 24, boxShadow: `0 14px 30px -8px rgba(106,69,224,0.7), 0 0 ${40 * (1 - ripple) * (t >= pressAt ? 1 : 0)}px rgba(140,107,234,0.9)${th.dark ? ', 0 0 26px -4px rgba(169,139,255,0.7)' : ''}`}}>
                <Icon.sparkle size={24} color="#fff" />Build a proposal<Icon.arrow size={24} color="#fff" />
              </div>
              {t >= pressAt && <div style={{position: 'absolute', left: '50%', top: '50%', width: 400, height: 400, marginLeft: -200, marginTop: -200, borderRadius: '50%', border: `3px solid ${th.accent}`, transform: `scale(${ripple})`, opacity: 1 - ripple}} />}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export const StatCard: React.FC<{icon: string; n: number; label: string; sub: string; p: number; w?: number}> = ({icon, n, label, sub, p, w = 340}) => {
  const th = useUI();
  const I = Icon[icon];
  return (
    <Card style={{width: w, padding: '26px 28px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 22}}>
      <div style={{width: 76, height: 76, borderRadius: 38, background: th.chip, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', boxShadow: th.dark ? `inset 0 0 0 1px rgba(${th.glow},0.4), 0 0 20px -4px rgba(${th.glow},0.6)` : undefined}}><I size={38} color={th.accentText} /></div>
      <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 70, lineHeight: 1, color: th.text, textShadow: tg(th, 0.7, 26)}}>{Math.round(n * clamp(p * 1.4))}</div>
      <div>
        <div style={{fontWeight: 700, fontSize: 26}}>{label}</div>
        <div style={{fontSize: 18, color: th.textSoft}}>{sub}</div>
      </div>
    </Card>
  );
};

export const CHANGES = [
  ['Add booking intent', 'Detect when a visitor wants to book an appointment.'],
  ['Collect contact details', 'Gather name, email and any other required information.'],
  ['Call booking function', 'Use your booking integration to create the appointment.'],
  ['Evaluate outcome', 'Check the result and respond with a confirmation or next steps.'],
];

export const ChangesCard: React.FC<{t: number; at: number; step: number; w?: number}> = ({t, at, step, w = 1100}) => {
  const th = useUI();
  return (
    <Card style={{width: w, padding: '28px 34px', boxSizing: 'border-box'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14}}>
        <Icon.doc size={28} /><div style={{fontWeight: 800, fontSize: 28, fontFamily: DISPLAY, textShadow: tg(th, 0.4)}}>Proposed changes</div>
        <div style={{flex: 1}} />
        <Pill tone="pistachio" style={{fontSize: 18, opacity: prog(t, at + step * 4, 18)}}><Icon.check size={18} sw={3} color={th.onPistachio} />Validated</Pill>
      </div>
      {CHANGES.map(([a, b], i) => {
        const p = prog(t, at + i * step, 22, backOut);
        return (
          <div key={i} style={{display: 'flex', alignItems: 'center', gap: 20, padding: '12px 0', borderTop: i ? `1px solid ${th.divider}` : undefined, opacity: clamp(p), transform: `translateX(${(1 - p) * 60}px)`}}>
            <div style={{width: 46, height: 46, borderRadius: 23, background: th.chip, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 21, color: th.accentText, flex: 'none'}}>{i + 1}</div>
            <div>
              <div style={{fontWeight: 700, fontSize: 23}}>{a}</div>
              <div style={{fontSize: 18, color: th.textSoft}}>{b}</div>
            </div>
          </div>
        );
      })}
    </Card>
  );
};

/** Build with AI main area (940×895) for AppFrame / HoloAppFrame. e = explode depth.
 *  typeAt / pressAt drive the prompt card, proposalAt reveals the generated proposal. */
export const BuildMain: React.FC<{t: number; e?: number; typeAt?: number; pressAt?: number; proposalAt?: number; rv?: number}> = ({t, e = 0, typeAt = 0, pressAt = 60, proposalAt = 80, rv = 0}) => {
  const th = useUI();
  const pp = (k: number) => prog(t, proposalAt + k * 6, 26, backOut);
  return (
    <div style={{position: 'relative', width: 940, height: 895, transformStyle: 'preserve-3d', fontFamily: FONT, color: th.text}}>
      <Part x={14} y={6} w={920} h={100} z={e * 30}>
        <PageTitle title="Build with AI" sub="Describe your bot. Review the logic. Make it yours." p={prog(t, rv, 24)} />
      </Part>
      <Part x={0} y={118} w={1100} h={330} z={e * 110} o={prog(t, rv + 4, 20)} s={940 / 1100} style={{transformOrigin: '0 0'}}>
        <BuildPromptCard t={t} typeAt={typeAt} pressAt={pressAt} w={1100} />
      </Part>
      <Part x={0} y={426} w={940} h={150} z={e * 170}>
        <div style={{display: 'flex', gap: 14, transformOrigin: '0 0', transform: 'scale(0.9)', width: 1044}}>
          {([['layers', 4, 'states', 'Conversation flow'], ['scale', 6, 'judgments', 'Decision rules'], ['shield', 5, 'policies', 'Safety and behavior']] as [string, number, string, string][]).map(([ic, n, l, sub], i) => (
            <div key={l} style={{opacity: clamp(pp(i) * 2), transform: `translateY(${(1 - pp(i)) * 40}px)`}}><StatCard icon={ic} n={n} label={l} sub={sub} p={pp(i)} w={338} /></div>
          ))}
        </div>
      </Part>
      <Part x={0} y={560} w={1100} h={400} z={e * 140} o={prog(t, proposalAt + 10, 20)} s={940 / 1100} style={{transformOrigin: '0 0'}}>
        <ChangesCard t={t} at={proposalAt + 14} step={8} w={1100} />
      </Part>
    </div>
  );
};

/* =============== State graph =============== */
export type GNode = {id: string; x: number; y: number; icon?: string; start?: boolean; at: number; label?: string};
export type GEdge = {a: string; b: string; at: number; bend?: number; dashed?: boolean; label?: string};

/** Quadratic edge geometry between two node centres (shared by Graph and HoloGraph). */
export const edgePath = (A: {x: number; y: number}, Bn: {x: number; y: number}, bend = 0, r0 = 96, r1 = 100) => {
  const dx = Bn.x - A.x, dy = Bn.y - A.y, d = Math.hypot(dx, dy) || 1;
  const ux = dx / d, uy = dy / d;
  const sx = A.x + ux * r0, sy = A.y + uy * r0, ex = Bn.x - ux * r1, ey = Bn.y - uy * r1;
  const mx = (sx + ex) / 2 - uy * bend, my = (sy + ey) / 2 + ux * bend;
  return {d: `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`, sx, sy, mx, my, ex, ey, len: Math.hypot(mx - sx, my - sy) + Math.hypot(ex - mx, ey - my)};
};
export const quadAt = (P: {sx: number; sy: number; mx: number; my: number; ex: number; ey: number}, u: number) => ({
  x: (1 - u) ** 2 * P.sx + 2 * (1 - u) * u * P.mx + u * u * P.ex,
  y: (1 - u) ** 2 * P.sy + 2 * (1 - u) * u * P.my + u * u * P.ey,
});

export const Graph: React.FC<{t: number; nodes: GNode[]; edges: GEdge[]; w: number; h: number; active?: string; e?: number; tokenPath?: string[]; tokenAt?: number; tokenStep?: number}> = ({t, nodes, edges, w, h, active, e = 0, tokenPath, tokenAt = 0, tokenStep = 27}) => {
  const th = useUI();
  const N = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const R = 82;
  const path = (ed: GEdge) => edgePath(N[ed.a], N[ed.b], ed.bend ?? 0, R + 14, R + 18);
  let tok: {x: number; y: number} | null = null;
  if (tokenPath && t >= tokenAt) {
    const k = (t - tokenAt) / tokenStep;
    const i = Math.min(tokenPath.length - 1, Math.floor(k));
    if (i < tokenPath.length - 1) {
      const ed = edges.find((x) => x.a === tokenPath[i] && x.b === tokenPath[i + 1]);
      if (ed) tok = quadAt(path(ed), expoOut(k - i));
    }
  }
  const activeNow = tokenPath && t >= tokenAt ? tokenPath[Math.min(tokenPath.length - 1, Math.floor((t - tokenAt) / tokenStep + 0.6))] : active;
  const edgeA = th.dark ? '#7FE7FF' : '#B49BF2';
  const edgeB = th.dark ? '#A98BFF' : C.purpleDeep;
  return (
    <div style={{position: 'relative', width: w, height: h, transformStyle: 'preserve-3d'}}>
      <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', transform: `translateZ(${e * 10}px)`}}>
        <defs>
          <marker id={`arr-${th.look}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill={edgeB} /></marker>
          <linearGradient id={`eg-${th.look}`} x1="0" x2="1"><stop offset="0" stopColor={edgeA} /><stop offset="1" stopColor={edgeB} /></linearGradient>
        </defs>
        {edges.map((ed, i) => {
          const P = path(ed);
          const p = prog(t, ed.at, 26);
          const len = 1200;
          return (
            <g key={i} opacity={p > 0 ? 1 : 0}>
              <path d={P.d} stroke={th.dark ? 'rgba(127,231,255,0.18)' : 'rgba(140,107,234,0.25)'} strokeWidth={14} fill="none" strokeDasharray={len} strokeDashoffset={len * (1 - p)} strokeLinecap="round" />
              <path d={P.d} stroke={`url(#eg-${th.look})`} strokeWidth={4.5} fill="none" strokeDasharray={ed.dashed ? '10 10' : len} strokeDashoffset={ed.dashed ? -t * 1.5 : len * (1 - p)} markerEnd={p > 0.9 ? `url(#arr-${th.look})` : undefined} strokeLinecap="round" opacity={ed.dashed ? p : 1} />
              {ed.label && <text x={P.mx} y={P.my - 14} textAnchor="middle" fontFamily={FONT} fontSize={20} fontWeight={600} fill={th.accentText} opacity={prog(t, ed.at + 10, 20)}>{ed.label}</text>}
            </g>
          );
        })}
        {tok && <circle cx={tok.x} cy={tok.y} r={12} fill="#fff" stroke={th.dark ? '#7FE7FF' : C.purpleDeep} strokeWidth={5} style={{filter: `drop-shadow(0 0 12px ${th.dark ? '#7FE7FF' : '#8C6BEA'})`}} />}
      </svg>
      {nodes.map((n) => {
        const p = prog(t, n.at, 30, backOut);
        const I = n.icon ? Icon[n.icon] : null;
        const isAct = activeNow === n.id;
        return (
          <div key={n.id} style={{position: 'absolute', left: n.x, top: n.y, transform: `translate(-50%,-50%) translateZ(${e * 60 + (isAct ? 40 : 0)}px) scale(${p})`, opacity: clamp(p * 3)}}>
            {n.start ? (
              <div style={{width: 190, height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'}}>
                <svg width={190} height={190} viewBox="0 0 100 100" style={{position: 'absolute', filter: `drop-shadow(0 18px 30px rgba(54,153,125,0.45))${isAct ? ' drop-shadow(0 0 20px #8FE3C3)' : ''}`}}>
                  <path d="M22 12 Q16 8 16 16 L16 84 Q16 92 22 88 L86 54 Q92 50 86 46 Z" fill={th.dark ? 'rgba(69,227,176,0.55)' : th.look === 'frost' ? 'rgba(127,209,176,0.88)' : '#7FD1B0'} stroke={th.look === 'solid' ? 'none' : th.dark ? '#7FF5CC' : 'rgba(255,255,255,0.8)'} strokeWidth={1.2} />
                </svg>
                <div style={{position: 'relative', fontFamily: FONT, fontWeight: 700, fontSize: 28, color: th.text, marginLeft: -24}}>{n.label ?? n.id}</div>
              </div>
            ) : (
              <div
                style={{
                  width: R * 2, height: R * 2, borderRadius: '50%',
                  background: th.dark
                    ? isAct ? 'radial-gradient(circle at 40% 30%, rgba(190,170,255,0.65), rgba(60,30,120,0.6))' : 'radial-gradient(circle at 40% 30%, rgba(120,95,200,0.45), rgba(30,15,60,0.55))'
                    : th.look === 'frost'
                      ? isAct ? 'radial-gradient(circle at 40% 30%, rgba(255,255,255,0.95), rgba(217,204,250,0.85))' : 'radial-gradient(circle at 40% 30%, rgba(255,255,255,0.85), rgba(226,216,248,0.7))'
                      : isAct ? 'radial-gradient(circle at 40% 30%, #FFFFFF, #D9CCFA)' : 'radial-gradient(circle at 40% 30%, #F7F3FF, #E2D8F8)',
                  border: `3px solid ${isAct ? th.accent : th.dark ? 'rgba(127,231,255,0.45)' : '#CDBEF3'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: isAct ? `0 0 0 14px rgba(140,107,234,0.18), 0 0 60px rgba(140,107,234,0.8), 0 20px 40px -10px rgba(57,41,75,0.4)` : th.dark ? '0 0 30px -6px rgba(127,231,255,0.35)' : '0 20px 40px -12px rgba(57,41,75,0.35)', fontFamily: FONT,
                }}
              >
                {I && <I size={36} />}
                <div style={{fontSize: 20, fontWeight: 600, color: th.text}}>{n.label ?? n.id}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* =============== Judgment editor =============== */
export const JudgmentCard: React.FC<{t: number; at: number; f: number; w?: number}> = ({t, at, f, w = 1000}) => {
  const th = useUI();
  const seg = prog(t, at + 6, 22, expoOut); // slide Noul -> Score
  const crit = ['No expressed enjoyment', 'Some interest', 'Clear enthusiasm'];
  const meter = prog(t, at + 40, 40, expoOut);
  const val = 1.7 * meter + 0.06 * Math.sin(f / 9) * meter;
  const hitBg = th.dark ? 'rgba(231,244,185,0.1)' : th.look === 'frost' ? 'rgba(248,252,232,0.85)' : '#F8FCE8';
  const hitBorder = th.dark ? 'rgba(231,244,185,0.7)' : '#B9DA5A';
  return (
    <Card style={{width: w, padding: '34px 40px', boxSizing: 'border-box'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
        <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 46, letterSpacing: '-0.02em', textShadow: tg(th)}}>User enjoyment</div>
        <div style={{flex: 1}} />
        <Pill tone="lilac" style={{fontSize: 18}}><Icon.globe size={18} />Global · Before reply</Pill>
      </div>
      <div style={{fontSize: 21, color: th.textSoft, marginTop: 4}}>Measure how much the user is enjoying the conversation.</div>
      <div style={{fontWeight: 700, fontSize: 19, marginTop: 24, marginBottom: 8}}>Type</div>
      <div style={{position: 'relative', display: 'flex', background: th.inset, borderRadius: 16, padding: 6, boxShadow: th.look !== 'solid' ? `inset 0 0 0 1px ${th.insetBorder}` : undefined}}>
        <div style={{position: 'absolute', top: 6, bottom: 6, left: `calc(${lerp(0, 33.33, seg)}% + 6px)`, width: 'calc(33.33% - 12px)', borderRadius: 12, background: th.accentGrad, boxShadow: `0 8px 20px -6px rgba(106,69,224,0.7)${th.dark ? `, 0 0 24px -2px rgba(${th.glow},0.8)` : ''}`}} />
        {['Noul', 'Score', 'Choice'].map((x, i) => (
          <div key={x} style={{flex: 1, position: 'relative', textAlign: 'center', padding: '12px 0', fontSize: 20, fontWeight: 600, color: (i === 1 && seg > 0.5) || (i === 0 && seg <= 0.5) ? '#fff' : th.text}}>{x}</div>
        ))}
      </div>
      <div style={{fontWeight: 700, fontSize: 19, marginTop: 20, marginBottom: 8}}>Question</div>
      <div style={{boxShadow: `inset 0 0 0 1.5px ${th.fieldBorder}`, background: th.field, borderRadius: 16, padding: '14px 18px', fontSize: 21}}>How much is the user enjoying this conversation?</div>
      <div style={{fontWeight: 700, fontSize: 19, marginTop: 20, marginBottom: 8}}>Scoring criteria</div>
      {crit.map((c, i) => {
        const p = prog(t, at + 14 + i * 9, 22, backOut);
        const hit = meter > 0.2 && Math.round(val) === i;
        return (
          <div key={i} style={{display: 'flex', gap: 12, marginBottom: 10, opacity: clamp(p), transform: `translateX(${(1 - p) * 50}px)`}}>
            <div style={{width: 54, height: 50, borderRadius: 14, background: hit ? th.pistachio : th.chip, color: hit ? th.onPistachio : th.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 21, boxShadow: hit && th.dark ? '0 0 20px -2px rgba(231,244,185,0.6)' : undefined}}>{i}</div>
            <div style={{flex: 1, boxShadow: `inset 0 0 0 1.5px ${hit ? hitBorder : th.fieldBorder}${hit && th.dark ? ', 0 0 22px -6px rgba(231,244,185,0.6)' : ''}`, background: hit ? hitBg : th.field, borderRadius: 14, padding: '12px 18px', fontSize: 20}}>{c}</div>
          </div>
        );
      })}
      <div style={{marginTop: 18, display: 'flex', alignItems: 'center', gap: 18, opacity: prog(t, at + 36, 18)}}>
        <div style={{fontWeight: 700, fontSize: 19, width: 180}}>Live measurement</div>
        <div style={{flex: 1, height: 22, borderRadius: 11, background: th.track, overflow: 'hidden'}}>
          <div style={{width: `${(val / 2) * 100}%`, height: '100%', borderRadius: 11, background: `linear-gradient(90deg, ${th.sig.purple}, ${th.sig.green})`, boxShadow: `0 0 ${18 * th.barGlow}px ${th.sig.green}`}} />
        </div>
        <Pill tone="pistachio" style={{fontSize: 20, fontFamily: MONO}}>score {val.toFixed(2)} · conf 0.91</Pill>
      </div>
    </Card>
  );
};

/* =============== Policies =============== */
export const PolicyCard: React.FC<{t: number; at: number; step: number; w?: number}> = ({t, at, step, w = 1240}) => {
  const th = useUI();
  const conds: [string, string, string, string, string?][] = [
    ['chart', 'User enjoyment', '≥', '1.7'],
    ['chart', 'Confidence', '≥', '80', '%'],
    ['doc', 'Current state', 'is', 'start'],
  ];
  const brP = prog(t, at + step * 1, 30);
  const box: React.CSSProperties = {background: th.field, borderRadius: 12, padding: '8px 14px', fontSize: 21, boxShadow: `inset 0 0 0 1.5px ${th.fieldBorder}`};
  return (
    <Card style={{width: w, padding: '30px 38px', boxSizing: 'border-box'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
        <div style={{width: 54, height: 54, borderRadius: 27, background: th.chip, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 24, color: th.accentText, flex: 'none'}}>1</div>
        <div>
          <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 34, textShadow: tg(th, 0.45)}}>Acknowledge a happy start</div>
          <div style={{fontSize: 19, color: th.textSoft}}>When the user seems to be enjoying the conversation, acknowledge it and keep things going.</div>
        </div>
        <div style={{flex: 1}} />
        <Pill tone="green" style={{fontSize: 20}}><Icon.globe size={20} color={th.greenText} />Global</Pill>
      </div>
      <div style={{display: 'flex', marginTop: 26}}>
        <div style={{width: 110, fontWeight: 800, fontSize: 26, paddingTop: 14}}>When</div>
        <div style={{position: 'relative', flex: 1, paddingLeft: 100}}>
          <svg width={60} height={200} style={{position: 'absolute', left: 30, top: 0}}>
            <path d="M58 32 H30 V166 H58" stroke={th.dark ? 'rgba(127,231,255,0.6)' : '#CDBEF3'} strokeWidth={3} fill="none" strokeDasharray={300} strokeDashoffset={300 * (1 - brP)} />
          </svg>
          <div style={{position: 'absolute', left: 0, top: 80, background: th.chip, color: th.chipText, borderRadius: 12, padding: '6px 14px', fontWeight: 800, fontSize: 17, opacity: brP, transform: `scale(${lerp(0.5, 1, brP)})`}}>AND</div>
          {conds.map(([ic, a, op, v, unit], i) => {
            const p = prog(t, at + i * step * 0.5, 24, backOut);
            const I = Icon[ic];
            return (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: 18, background: th.inset, borderRadius: 16, padding: '12px 18px', marginBottom: 12, opacity: clamp(p), transform: `translateY(${(1 - p) * -40}px) scale(${lerp(0.9, 1, p)})`, boxShadow: th.look !== 'solid' ? `inset 0 0 0 1px ${th.insetBorder}` : undefined}}>
                <I size={26} />
                <div style={{width: 250, fontSize: 21, fontWeight: 500}}>{a}</div>
                <div style={{...box, width: 110}}>{op}</div>
                <div style={{...box, width: 200, display: 'flex'}}>{v}<span style={{flex: 1}} />{unit}</div>
                <div style={{flex: 1}} />
                <div style={{fontSize: 22, color: th.textFaint}}>✕</div>
              </div>
            );
          })}
        </div>
      </div>
      {[
        ['Then', <Pill key="a" tone="lilac" style={{fontSize: 21, padding: '12px 20px'}}><Icon.chat size={22} />Include acknowledge-enjoyment · Next reply</Pill>],
        ['Scope', <div key="b" style={{display: 'flex', gap: 20, alignItems: 'center', width: '100%'}}><Pill tone="white" style={{fontSize: 21, padding: '12px 20px'}}><Icon.globe size={22} />Global</Pill><div style={{flex: 1}} /><Pill tone="green" style={{fontSize: 19, opacity: prog(t, at + step * 3, 18), transform: `scale(${lerp(0.7, 1, prog(t, at + step * 3, 18, backOut))})`}}><Icon.check size={20} color={th.greenText} sw={3} />Creates 1 judgment and 1 prompt chunk</Pill></div>],
      ].map(([lab, node], i) => {
        const p = prog(t, at + step * (2 + i * 0.5), 24, backOut);
        return (
          <div key={i} style={{display: 'flex', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTop: `1px solid ${th.divider}`, opacity: clamp(p), transform: `translateX(${(1 - p) * 60}px)`}}>
            <div style={{width: 210, fontWeight: 800, fontSize: 26}}>{lab as string}</div>
            {node as React.ReactNode}
          </div>
        );
      })}
    </Card>
  );
};

/* =============== BotScript =============== */
type Tok = [string, string];
const K = C.purpleDeep, S = '#2E8B57', N = '#E0861A', CM = '#9A8DB0', P = C.plum;
export const CODE: Tok[][] = [
  [['language', K], [' botscript ', P], ['0.1', N], [';', P]],
  [],
  [['bot', K], [' welcome_assistant {', P]],
  [['  models', K], [' {', P]],
  [['    speaker', P], [' = connection(', P], ['"speaker-provider"', S], [');', P]],
  [['    judge', P], [' = typesafe(', P], ['"jev-1.13.0"', S], [');', P]],
  [['    clerk', P], [' = connection(', P], ['"clerk-provider"', S], [');', P]],
  [['  }', P]],
  [['  initial', K], [' = start;', P]],
  [],
  [['  /* @intent {"text":"Recognize a clear goal."} */', CM]],
  [['  judgment', K], [' goal_clear: ', P], ['noul', K], [' {', P]],
  [['    source', K], [' = conversation; ', P], ['scope', K], [' = global;', P]],
  [['    rubric', K], [' = ', P], ['semantic', K], ['(', P], ['"judge/goal"', S], [');', P]],
  [['  }', P]],
  [],
  [['  policy', K], [' next {', P]],
  [['    when', K], [' = goal_clear.yes >= ', P], ['0.90', N], [';', P]],
  [['    then', K], [' { ', P], ['goto', K], [' discover; }', P]],
  [['  }', P]],
  [['  function', K], [' create_lead(full_name, email) ', P], ['async', K], [';', P]],
  [['}', P]],
];
/** Theme colour for a CODE token colour. */
export const codeColor = (th: Theme, col: string) => (col === K ? th.code.kw : col === S ? th.code.str : col === N ? th.code.num : col === CM ? th.code.cm : col === P ? th.code.plain : col);

export const CodeCard: React.FC<{t: number; at: number; cps?: number; w?: number; h?: number; validAt?: number}> = ({t, at, cps = 2.4, w = 1100, h = 860, validAt = 1e9}) => {
  const th = useUI();
  let budget = Math.max(0, (t - at) * cps * 6);
  const vp = prog(t, validAt, 22, backOut);
  return (
    <Card style={{width: w, height: h, padding: 0, boxSizing: 'border-box'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 16, padding: '20px 30px', background: th.code.header, borderBottom: `1px solid ${th.divider}`}}>
        <div style={{display: 'flex', gap: 8}}>{['#FF8A8A', '#F7C85C', '#7FD1B0'].map((c) => <div key={c} style={{width: 14, height: 14, borderRadius: 7, background: c, boxShadow: th.dark ? `0 0 8px ${c}` : undefined}} />)}</div>
        <div style={{fontWeight: 700, fontSize: 22, fontFamily: FONT}}>welcome_assistant.botscript</div>
        <div style={{flex: 1}} />
        <Pill tone="pistachio" style={{fontSize: 20, transform: `scale(${vp})`, opacity: clamp(vp)}}><div style={{width: 24, height: 24, borderRadius: 12, background: th.sig.green, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Icon.check size={15} color="#fff" sw={3.5} /></div>Valid</Pill>
      </div>
      <div style={{padding: '22px 0', fontFamily: MONO, fontSize: 24, lineHeight: 1.5}}>
        {CODE.map((line, i) => {
          const parts: React.ReactNode[] = [];
          for (const [txt, col] of line) {
            if (budget <= 0) break;
            const take = Math.min(txt.length, Math.floor(budget));
            const c = codeColor(th, col);
            parts.push(<span key={parts.length} style={{color: c, textShadow: th.dark && col !== P ? `0 0 10px ${withA(c.startsWith('#') ? c : '#B49BF2', 0.5)}` : undefined}}>{txt.slice(0, take)}</span>);
            budget -= txt.length;
          }
          budget -= 4;
          const shown = parts.length > 0 || budget > 0;
          return (
            <div key={i} style={{display: 'flex', minHeight: 36, opacity: shown ? 1 : 0.25}}>
              <div style={{width: 76, textAlign: 'right', paddingRight: 24, color: th.code.lineNo}}>{i + 1}</div>
              <div style={{whiteSpace: 'pre'}}>{parts}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

/* =============== Bot cards =============== */
export const BOTS = [
  {name: 'Welcome assistant', kind: 'Lead collection', icon: 'avatar', badge: 'Draft'},
  {name: 'Booking helper', kind: 'Appointments', icon: 'calendar', badge: 'Version 4'},
  {name: 'Support companion', kind: 'Customer support', icon: 'chat', badge: 'Draft'},
  {name: 'Onboarding guide', kind: 'Activation', icon: 'sparkle', badge: 'Version 2'},
  {name: 'Sales scout', kind: 'Qualification', icon: 'chart', badge: 'Version 7'},
  {name: 'Order tracker', kind: 'Operations', icon: 'bolt', badge: 'Live'},
  {name: 'Feedback collector', kind: 'Research', icon: 'doc', badge: 'Draft'},
  {name: 'Billing helper', kind: 'Accounts', icon: 'shield', badge: 'Version 3'},
  {name: 'Event concierge', kind: 'Hospitality', icon: 'calendar', badge: 'Live'},
];

export const BotCard: React.FC<{b: typeof BOTS[number]; w?: number}> = ({b, w = 420}) => {
  const th = useUI();
  const I = b.icon === 'avatar' ? null : Icon[b.icon];
  const badgeLive = b.badge !== 'Draft';
  return (
    <Card style={{width: w, padding: 28, boxSizing: 'border-box'}}>
      <div style={{display: 'flex', alignItems: 'flex-start'}}>
        <div style={{width: 84, height: 84, borderRadius: 42, background: th.chip, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: th.dark ? `inset 0 0 0 1px rgba(${th.glow},0.4), 0 0 24px -6px rgba(${th.glow},0.7)` : undefined}}>{I ? <I size={42} color={th.accentText} /> : <Avatar size={76} />}</div>
        <div style={{flex: 1}} />
        <Pill tone={badgeLive ? 'green' : 'amber'} style={{fontSize: 17}}>{b.badge}</Pill>
      </div>
      <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 30, marginTop: 18, textShadow: tg(th, 0.45)}}>{b.name}</div>
      <div style={{fontSize: 20, color: th.accentText, fontWeight: 600, marginTop: 2}}>{b.kind}</div>
      <div style={{marginTop: 18, height: 52, borderRadius: 16, background: th.inset, boxShadow: th.look !== 'solid' ? `inset 0 0 0 1px ${th.insetBorder}` : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontWeight: 700, fontSize: 21, color: th.accentText}}>Open <Icon.arrow size={22} color={th.accentText} /></div>
    </Card>
  );
};

export {Shine};
