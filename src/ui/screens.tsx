import React from 'react';
import {C, FONT, DISPLAY, MONO, prog, expoOut, backOut, lerp, clamp, band, rand, kick} from '../lib';
import {Icon, Avatar, Card, Pill, Shine} from './kit';
import {PageTitle, Part} from './app';

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
export const signalColor = (v: number) => (v >= 0.62 ? C.green : v < 0.3 ? C.amber : C.purple);

export const SignalWall: React.FC<{f: number; t: number; reveal?: number; live?: number; cols?: number; w?: number; h?: number; title?: boolean}> = ({f, t, reveal = 0, live = 1, cols = 3, w = 590, h = 580, title = true}) => {
  const rows = Math.ceil(METRICS.length / cols);
  return (
    <Card style={{width: w, height: h, padding: '24px 22px', boxSizing: 'border-box'}}>
      {title && <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 27, marginBottom: 16, letterSpacing: '-0.01em'}}>Signal Wall</div>}
      <div style={{display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoFlow: 'column', gridTemplateRows: `repeat(${rows}, 1fr)`, columnGap: 18, rowGap: 0, height: h - (title ? 92 : 48)}}>
        {METRICS.map((m, i) => {
          const p = prog(t, reveal + (i % rows) * 1.2 + Math.floor(i / rows) * 4, 26);
          const v = signalValue(i, f, live) * p;
          const col = signalColor(v);
          return (
            <div key={m} style={{display: 'flex', alignItems: 'center', gap: 10, opacity: clamp(p * 1.5)}}>
              <div style={{width: '52%', fontSize: 14.5, color: C.plum, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{m}</div>
              <div style={{flex: 1, height: 13, borderRadius: 7, background: '#EEE9F6', overflow: 'hidden'}}>
                <div style={{width: `${v * 100}%`, height: '100%', borderRadius: 7, background: `linear-gradient(90deg, ${col}, ${col}DD)`, boxShadow: `0 0 10px ${col}88`}} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

const Row: React.FC<{icon?: string; children: React.ReactNode; p: number; bg?: string; color?: string}> = ({icon, children, p, bg = '#F3EFFA', color = C.plum}) => {
  const I = icon ? Icon[icon] : null;
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 10, background: bg, color, borderRadius: 12, padding: '8px 12px', fontSize: 16, marginBottom: 7, opacity: p, transform: `translateX(${(1 - p) * 30}px)`}}>
      {I && <I size={18} color={color} />}
      {children}
    </div>
  );
};

export const SpeakerPrompt: React.FC<{t: number; at: number}> = ({t, at}) => (
  <Card style={{width: 335, height: 250, padding: 18, boxSizing: 'border-box'}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 20, marginBottom: 12}}><Icon.doc size={22} />Speaker prompt</div>
    <Row icon="doc" p={prog(t, at, 18)}>System</Row>
    <Row icon="layers" p={prog(t, at + 5, 18)}>State · collect_details</Row>
    <Row icon="sparkle" p={prog(t, at + 10, 18)} bg={C.pistachio}>Chunk · acknowledge</Row>
    <div style={{fontSize: 14.5, color: C.plumSoft, lineHeight: 1.4, padding: '4px 4px', opacity: prog(t, at + 16, 20)}}>
      Acknowledge the user's request, confirm what we're collecting, and ask a focused next question.
    </div>
  </Card>
);

const Spinner: React.FC<{t: number; size?: number; color?: string}> = ({t, size = 18, color = C.purple}) => (
  <div style={{width: size, height: size, borderRadius: '50%', border: `3px solid ${color}33`, borderTopColor: color, transform: `rotate(${t * 12}deg)`, boxSizing: 'border-box'}} />
);

export const ClerkActivity: React.FC<{t: number; at: number; done?: number; w?: number; h?: number; big?: boolean}> = ({t, at, done = 1e9, w = 335, h = 200, big}) => {
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
        <Pill bg={C.lilac} color={C.purpleDeep} style={{fontSize: 13 * s, padding: '3px 10px'}}>Async</Pill>
      </div>
      <div style={{background: C.lilac, color: C.purpleDeep, borderRadius: 12, padding: `${6 * s}px 14px`, fontFamily: MONO, fontSize: 16 * s, marginBottom: 8 * s}}>create_lead</div>
      {steps.map((st, i) => {
        const p = prog(t, st.at, 16);
        const isRun = i === 3;
        const isWait = i === 4;
        const ok = isWait ? t >= done : isRun ? t >= done : t >= st.at + 6;
        return (
          <div key={i} style={{display: 'flex', alignItems: 'center', gap: 10, fontSize: (st.sub ? 13.5 : 15) * s, marginBottom: 3 * s, paddingLeft: st.sub ? 26 * s : 0, opacity: p, transform: `translateY(${(1 - p) * 8}px)`, color: isWait && t >= done ? C.green : C.plum, fontWeight: isWait && t >= done ? 700 : 400}}>
            {!st.sub && (isRun && !ok ? <Spinner t={t} size={16 * s} /> : <div style={{width: 16 * s, height: 16 * s, borderRadius: 9, background: ok ? C.green : 'transparent', border: ok ? 'none' : `2px solid ${C.lilac2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box'}}>{ok && <Icon.check size={11 * s} color="#fff" sw={3.5} />}</div>)}
            <span style={{flex: 1}}>{st.label}</span>
            {st.sub && ok && <Icon.check size={15 * s} color={C.green} sw={3} />}
          </div>
        );
      })}
    </Card>
  );
};

export const Decisions: React.FC<{t: number; at: number}> = ({t, at}) => (
  <Card style={{width: 335, height: 106, padding: '12px 16px', boxSizing: 'border-box'}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 18, marginBottom: 6}}><Icon.scale size={20} />Decisions</div>
    <Row icon="check" p={prog(t, at, 18, backOut)} bg="#E3F3EA" color={C.green}>Happy start matched</Row>
    <Row icon="clock" p={prog(t, at + 10, 18, backOut)} bg="#FCF0D6" color="#B47A10">Collect details → follow up</Row>
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
  const x0 = 60 * scale + 20, x1 = w - (70 * scale + 30);
  const lineP = prog(t, at, step * 7 + 10, expoOut);
  return (
    <Card style={{width: w, height: h, padding: 20, boxSizing: 'border-box'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 21 * scale}}><Icon.clock size={24 * scale} />Turn timeline</div>
      <div style={{position: 'absolute', left: x0, top: h * 0.56, width: (x1 - x0) * lineP, height: 3, background: `linear-gradient(90deg, ${C.purple}, ${C.green})`, borderRadius: 2}} />
      {TIMELINE.map((e, i) => {
        const x = x0 + (x1 - x0) * (e.ms / 1240);
        const p = prog(t, at + i * step, 18, backOut);
        const up = i % 2 === 1 ? false : true;
        const fs = 15 * scale;
        return (
          <div key={i} style={{position: 'absolute', left: x, top: h * 0.56 + 1, transform: 'translate(-50%,-50%)', opacity: clamp(p * 2)}}>
            <div style={{width: 20 * scale, height: 20 * scale, borderRadius: '50%', border: `${4 * scale}px solid ${e.c}`, background: '#fff', transform: `scale(${p})`, boxSizing: 'border-box', boxShadow: `0 0 ${14 * p}px ${e.c}`}} />
            <div style={{position: 'absolute', left: '50%', [up ? 'bottom' : 'top']: 26 * scale, transform: 'translateX(-50%)', textAlign: 'center', whiteSpace: 'nowrap', fontSize: fs, color: C.plum, fontWeight: 600}}>
              {e.label}
              <div style={{fontWeight: 400, color: C.plumSoft}}>{Math.round(e.ms * clamp(p)).toLocaleString('en-US')} ms</div>
            </div>
          </div>
        );
      })}
    </Card>
  );
};

/** Live dashboard main area (940x895). e = explode depth. */
export const DashboardMain: React.FC<{f: number; t: number; e?: number; rv?: number; live?: number}> = ({f, t, e = 0, rv = 0, live = 1}) => {
  const turn = 8;
  return (
    <div style={{position: 'relative', width: 940, height: 895, transformStyle: 'preserve-3d', fontFamily: FONT, color: C.plum}}>
      <Part x={14} y={6} w={920} h={100} z={e * 30}>
        <PageTitle title="Live Dashboard" sub="See every signal, decision and action." p={prog(t, rv, 24)}
          right={<div style={{display: 'flex', gap: 14, alignItems: 'center', marginTop: 4}}>
            <Pill bg={C.pistachio} style={{fontSize: 19}}><div style={{width: 11, height: 11, borderRadius: 6, background: C.green, boxShadow: `0 0 ${6 + 10 * kick(f)}px ${C.green}`}} />Live · Turn {turn}</Pill>
            <Pill bg="#fff" style={{fontSize: 17, border: '1.5px solid #E4DCF3'}}>Current state <span style={{background: C.lilac, borderRadius: 999, padding: '3px 12px'}}>collect_details</span></Pill>
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
  const n = Math.floor(clamp((t - typeAt) / 46) * PROMPT_TEXT.length);
  const press = t >= pressAt && t < pressAt + 10 ? 0.94 : 1;
  const ripple = prog(t, pressAt, 30);
  const caret = Math.floor(t / 15) % 2 === 0 && t < pressAt;
  return (
    <Card style={{width: w, padding: '34px 40px', boxSizing: 'border-box'}}>
      <div style={{display: 'flex', gap: 30}}>
        <div style={{width: 110, height: 110, borderRadius: 30, background: 'radial-gradient(circle at 40% 35%, #FFFFFF, #E9E0FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 30px -10px rgba(140,107,234,0.6)'}}>
          <div style={{transform: `rotate(${t * 1.2}deg) scale(${1 + 0.08 * Math.sin(t / 8)})`}}><Icon.sparkle size={62} color={C.purpleDeep} sw={2.2} /></div>
        </div>
        <div style={{flex: 1}}>
          <div style={{fontWeight: 800, fontSize: 30, fontFamily: DISPLAY}}>Describe what you want to build</div>
          <div style={{fontSize: 19, color: C.plumSoft, marginTop: 4}}>Be specific about your bot's purpose, what it should handle and any key requirements.</div>
          <div style={{marginTop: 20, border: `2px solid ${t >= typeAt && t < pressAt ? C.purple : '#E4DCF3'}`, borderRadius: 20, padding: '20px 24px', minHeight: 96, fontSize: 25, lineHeight: 1.45, color: C.plum, boxShadow: t >= typeAt && t < pressAt ? '0 0 0 6px rgba(140,107,234,0.15)' : undefined}}>
            {PROMPT_TEXT.slice(0, n)}
            {caret && <span style={{display: 'inline-block', width: 3, height: 30, background: C.purpleDeep, verticalAlign: 'middle', marginLeft: 2}} />}
          </div>
          <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: 22}}>
            <div style={{position: 'relative', transform: `scale(${press})`}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 12, padding: '18px 34px', borderRadius: 999, background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})`, color: '#fff', fontWeight: 700, fontSize: 24, boxShadow: `0 14px 30px -8px rgba(106,69,224,0.7), 0 0 ${40 * (1 - ripple) * (t >= pressAt ? 1 : 0)}px rgba(140,107,234,0.9)`}}>
                <Icon.sparkle size={24} color="#fff" />Build a proposal<Icon.arrow size={24} color="#fff" />
              </div>
              {t >= pressAt && <div style={{position: 'absolute', left: '50%', top: '50%', width: 400, height: 400, marginLeft: -200, marginTop: -200, borderRadius: '50%', border: `3px solid ${C.purple}`, transform: `scale(${ripple})`, opacity: 1 - ripple}} />}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export const StatCard: React.FC<{icon: string; n: number; label: string; sub: string; p: number; w?: number}> = ({icon, n, label, sub, p, w = 340}) => {
  const I = Icon[icon];
  return (
    <Card style={{width: w, padding: '26px 28px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 22}}>
      <div style={{width: 76, height: 76, borderRadius: 38, background: C.lilac, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><I size={38} color={C.purpleDeep} /></div>
      <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 70, lineHeight: 1, color: C.plum}}>{Math.round(n * clamp(p * 1.4))}</div>
      <div>
        <div style={{fontWeight: 700, fontSize: 26}}>{label}</div>
        <div style={{fontSize: 18, color: C.plumSoft}}>{sub}</div>
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

export const ChangesCard: React.FC<{t: number; at: number; step: number; w?: number}> = ({t, at, step, w = 1100}) => (
  <Card style={{width: w, padding: '28px 34px', boxSizing: 'border-box'}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14}}>
      <Icon.doc size={28} /><div style={{fontWeight: 800, fontSize: 28, fontFamily: DISPLAY}}>Proposed changes</div>
      <div style={{flex: 1}} />
      <Pill bg={C.pistachio} style={{fontSize: 18, opacity: prog(t, at + step * 4, 18)}}><Icon.check size={18} sw={3} />Validated</Pill>
    </div>
    {CHANGES.map(([a, b], i) => {
      const p = prog(t, at + i * step, 22, backOut);
      return (
        <div key={i} style={{display: 'flex', alignItems: 'center', gap: 20, padding: '12px 0', borderTop: i ? '1px solid #F0EBF8' : undefined, opacity: clamp(p), transform: `translateX(${(1 - p) * 60}px)`}}>
          <div style={{width: 46, height: 46, borderRadius: 23, background: C.lilac, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 21, color: C.purpleDeep}}>{i + 1}</div>
          <div>
            <div style={{fontWeight: 700, fontSize: 23}}>{a}</div>
            <div style={{fontSize: 18, color: C.plumSoft}}>{b}</div>
          </div>
        </div>
      );
    })}
  </Card>
);

/* =============== State graph =============== */
export type GNode = {id: string; x: number; y: number; icon?: string; start?: boolean; at: number; label?: string};
export type GEdge = {a: string; b: string; at: number; bend?: number; dashed?: boolean; label?: string};

export const Graph: React.FC<{t: number; nodes: GNode[]; edges: GEdge[]; w: number; h: number; active?: string; e?: number; tokenPath?: string[]; tokenAt?: number; tokenStep?: number}> = ({t, nodes, edges, w, h, active, e = 0, tokenPath, tokenAt = 0, tokenStep = 27}) => {
  const N = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const R = 82;
  const path = (ed: GEdge) => {
    const A = N[ed.a], Bn = N[ed.b];
    const dx = Bn.x - A.x, dy = Bn.y - A.y, d = Math.hypot(dx, dy);
    const ux = dx / d, uy = dy / d;
    const sx = A.x + ux * (R + 14), sy = A.y + uy * (R + 14), ex = Bn.x - ux * (R + 18), ey = Bn.y - uy * (R + 18);
    const bend = ed.bend ?? 0;
    const mx = (sx + ex) / 2 - uy * bend, my = (sy + ey) / 2 + ux * bend;
    return {d: `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`, sx, sy, mx, my, ex, ey};
  };
  // token position
  let tok: {x: number; y: number} | null = null;
  if (tokenPath && t >= tokenAt) {
    const k = (t - tokenAt) / tokenStep;
    const i = Math.min(tokenPath.length - 1, Math.floor(k));
    if (i < tokenPath.length - 1) {
      const ed = edges.find((x) => x.a === tokenPath[i] && x.b === tokenPath[i + 1]);
      if (ed) {
        const P = path(ed); const u = expoOut(k - i);
        tok = {x: (1 - u) ** 2 * P.sx + 2 * (1 - u) * u * P.mx + u * u * P.ex, y: (1 - u) ** 2 * P.sy + 2 * (1 - u) * u * P.my + u * u * P.ey};
      }
    }
  }
  const activeNow = tokenPath && t >= tokenAt ? tokenPath[Math.min(tokenPath.length - 1, Math.floor((t - tokenAt) / tokenStep + 0.6))] : active;
  return (
    <div style={{position: 'relative', width: w, height: h, transformStyle: 'preserve-3d'}}>
      <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', transform: `translateZ(${e * 10}px)`}}>
        <defs>
          <marker id="arr" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill={C.purple} /></marker>
          <linearGradient id="eg" x1="0" x2="1"><stop offset="0" stopColor="#B49BF2" /><stop offset="1" stopColor={C.purpleDeep} /></linearGradient>
        </defs>
        {edges.map((ed, i) => {
          const P = path(ed);
          const p = prog(t, ed.at, 26);
          const len = 1200;
          return (
            <g key={i} opacity={p > 0 ? 1 : 0}>
              <path d={P.d} stroke="rgba(140,107,234,0.25)" strokeWidth={14} fill="none" strokeDasharray={len} strokeDashoffset={len * (1 - p)} strokeLinecap="round" />
              <path d={P.d} stroke="url(#eg)" strokeWidth={4.5} fill="none" strokeDasharray={ed.dashed ? '10 10' : len} strokeDashoffset={ed.dashed ? -t * 1.5 : len * (1 - p)} markerEnd={p > 0.9 ? 'url(#arr)' : undefined} strokeLinecap="round" opacity={ed.dashed ? p : 1} />
              {ed.label && <text x={P.mx} y={P.my - 14} textAnchor="middle" fontFamily={FONT} fontSize={20} fontWeight={600} fill={C.purpleDeep} opacity={prog(t, ed.at + 10, 20)}>{ed.label}</text>}
            </g>
          );
        })}
        {tok && <circle cx={tok.x} cy={tok.y} r={12} fill="#fff" stroke={C.purpleDeep} strokeWidth={5} style={{filter: 'drop-shadow(0 0 12px #8C6BEA)'}} />}
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
                  <path d="M22 12 Q16 8 16 16 L16 84 Q16 92 22 88 L86 54 Q92 50 86 46 Z" fill="#7FD1B0" />
                </svg>
                <div style={{position: 'relative', fontFamily: FONT, fontWeight: 700, fontSize: 28, color: C.plum, marginLeft: -24}}>{n.label ?? n.id}</div>
              </div>
            ) : (
              <div style={{width: R * 2, height: R * 2, borderRadius: '50%', background: isAct ? 'radial-gradient(circle at 40% 30%, #FFFFFF, #D9CCFA)' : 'radial-gradient(circle at 40% 30%, #F7F3FF, #E2D8F8)', border: `3px solid ${isAct ? C.purple : '#CDBEF3'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: isAct ? `0 0 0 14px rgba(140,107,234,0.18), 0 0 60px rgba(140,107,234,0.8), 0 20px 40px -10px rgba(57,41,75,0.4)` : '0 20px 40px -12px rgba(57,41,75,0.35)', fontFamily: FONT}}>
                {I && <I size={36} color={C.plum} />}
                <div style={{fontSize: 20, fontWeight: 600, color: C.plum}}>{n.label ?? n.id}</div>
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
  const seg = prog(t, at + 6, 22, expoOut); // slide Noul -> Score
  const crit = ['No expressed enjoyment', 'Some interest', 'Clear enthusiasm'];
  const meter = prog(t, at + 40, 40, expoOut);
  const val = 1.7 * meter + 0.06 * Math.sin(f / 9) * meter;
  return (
    <Card style={{width: w, padding: '34px 40px', boxSizing: 'border-box'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
        <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 46, letterSpacing: '-0.02em'}}>User enjoyment</div>
        <div style={{flex: 1}} />
        <Pill bg={C.lilac} style={{fontSize: 18}}><Icon.globe size={18} />Global · Before reply</Pill>
      </div>
      <div style={{fontSize: 21, color: C.plumSoft, marginTop: 4}}>Measure how much the user is enjoying the conversation.</div>
      <div style={{fontWeight: 700, fontSize: 19, marginTop: 24, marginBottom: 8}}>Type</div>
      <div style={{position: 'relative', display: 'flex', background: '#F3EFFA', borderRadius: 16, padding: 6}}>
        <div style={{position: 'absolute', top: 6, bottom: 6, left: `calc(${lerp(0, 33.33, seg)}% + 6px)`, width: 'calc(33.33% - 12px)', borderRadius: 12, background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})`, boxShadow: '0 8px 20px -6px rgba(106,69,224,0.7)'}} />
        {['Noul', 'Score', 'Choice'].map((x, i) => (
          <div key={x} style={{flex: 1, position: 'relative', textAlign: 'center', padding: '12px 0', fontSize: 20, fontWeight: 600, color: (i === 1 && seg > 0.5) || (i === 0 && seg <= 0.5) ? '#fff' : C.plum}}>{x}</div>
        ))}
      </div>
      <div style={{fontWeight: 700, fontSize: 19, marginTop: 20, marginBottom: 8}}>Question</div>
      <div style={{border: '1.5px solid #E4DCF3', borderRadius: 16, padding: '14px 18px', fontSize: 21}}>How much is the user enjoying this conversation?</div>
      <div style={{fontWeight: 700, fontSize: 19, marginTop: 20, marginBottom: 8}}>Scoring criteria</div>
      {crit.map((c, i) => {
        const p = prog(t, at + 14 + i * 9, 22, backOut);
        const hit = meter > 0.2 && Math.round(val) === i;
        return (
          <div key={i} style={{display: 'flex', gap: 12, marginBottom: 10, opacity: clamp(p), transform: `translateX(${(1 - p) * 50}px)`}}>
            <div style={{width: 54, height: 50, borderRadius: 14, background: hit ? C.pistachio : C.lilac, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 21}}>{i}</div>
            <div style={{flex: 1, border: `1.5px solid ${hit ? '#B9DA5A' : '#E4DCF3'}`, background: hit ? '#F8FCE8' : '#fff', borderRadius: 14, padding: '12px 18px', fontSize: 20}}>{c}</div>
          </div>
        );
      })}
      <div style={{marginTop: 18, display: 'flex', alignItems: 'center', gap: 18, opacity: prog(t, at + 36, 18)}}>
        <div style={{fontWeight: 700, fontSize: 19, width: 180}}>Live measurement</div>
        <div style={{flex: 1, height: 22, borderRadius: 11, background: '#EEE9F6', overflow: 'hidden'}}>
          <div style={{width: `${(val / 2) * 100}%`, height: '100%', borderRadius: 11, background: `linear-gradient(90deg, ${C.purple}, ${C.green})`, boxShadow: `0 0 18px ${C.green}`}} />
        </div>
        <Pill bg={C.pistachio} style={{fontSize: 20, fontFamily: MONO}}>score {val.toFixed(2)} · conf 0.91</Pill>
      </div>
    </Card>
  );
};

/* =============== Policies =============== */
export const PolicyCard: React.FC<{t: number; at: number; step: number; w?: number}> = ({t, at, step, w = 1240}) => {
  const conds: [string, string, string, string, string?][] = [
    ['chart', 'User enjoyment', '≥', '1.7'],
    ['chart', 'Confidence', '≥', '80', '%'],
    ['doc', 'Current state', 'is', 'start'],
  ];
  const brP = prog(t, at + step * 1, 30);
  return (
    <Card style={{width: w, padding: '30px 38px', boxSizing: 'border-box'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
        <div style={{width: 54, height: 54, borderRadius: 27, background: C.lilac, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 24, color: C.purpleDeep}}>1</div>
        <div>
          <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 34}}>Acknowledge a happy start</div>
          <div style={{fontSize: 19, color: C.plumSoft}}>When the user seems to be enjoying the conversation, acknowledge it and keep things going.</div>
        </div>
        <div style={{flex: 1}} />
        <Pill bg="#E3F3EA" color={C.green} style={{fontSize: 20}}><Icon.globe size={20} color={C.green} />Global</Pill>
      </div>
      <div style={{display: 'flex', marginTop: 26}}>
        <div style={{width: 110, fontWeight: 800, fontSize: 26, paddingTop: 14}}>When</div>
        <div style={{position: 'relative', flex: 1, paddingLeft: 100}}>
          <svg width={60} height={200} style={{position: 'absolute', left: 30, top: 0}}>
            <path d="M58 32 H30 V166 H58" stroke="#CDBEF3" strokeWidth={3} fill="none" strokeDasharray={300} strokeDashoffset={300 * (1 - brP)} />
          </svg>
          <div style={{position: 'absolute', left: 0, top: 80, background: C.lilac, borderRadius: 12, padding: '6px 14px', fontWeight: 800, fontSize: 17, opacity: brP, transform: `scale(${lerp(0.5, 1, brP)})`}}>AND</div>
          {conds.map(([ic, a, op, v, unit], i) => {
            const p = prog(t, at + i * step * 0.5, 24, backOut);
            const I = Icon[ic];
            return (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: 18, background: '#F6F3FB', borderRadius: 16, padding: '12px 18px', marginBottom: 12, opacity: clamp(p), transform: `translateY(${(1 - p) * -40}px) scale(${lerp(0.9, 1, p)})`}}>
                <I size={26} />
                <div style={{width: 250, fontSize: 21, fontWeight: 500}}>{a}</div>
                <div style={{width: 110, background: '#fff', borderRadius: 12, padding: '8px 14px', fontSize: 21, border: '1.5px solid #E4DCF3'}}>{op}</div>
                <div style={{width: 200, background: '#fff', borderRadius: 12, padding: '8px 14px', fontSize: 21, border: '1.5px solid #E4DCF3', display: 'flex'}}>{v}<span style={{flex: 1}} />{unit}</div>
                <div style={{flex: 1}} />
                <div style={{fontSize: 22, color: '#A79BB8'}}>✕</div>
              </div>
            );
          })}
        </div>
      </div>
      {[
        ['Then', <Pill key="a" bg={C.lilac} style={{fontSize: 21, padding: '12px 20px'}}><Icon.chat size={22} />Include acknowledge-enjoyment · Next reply</Pill>],
        ['Scope', <div key="b" style={{display: 'flex', gap: 20, alignItems: 'center', width: '100%'}}><Pill bg="#fff" style={{fontSize: 21, padding: '12px 20px', border: '1.5px solid #E4DCF3'}}><Icon.globe size={22} />Global</Pill><div style={{flex: 1}} /><Pill bg="#E3F3EA" color={C.green} style={{fontSize: 19, opacity: prog(t, at + step * 3, 18), transform: `scale(${lerp(0.7, 1, prog(t, at + step * 3, 18, backOut))})`}}><Icon.check size={20} color={C.green} sw={3} />Creates 1 judgment and 1 prompt chunk</Pill></div>],
      ].map(([lab, node], i) => {
        const p = prog(t, at + step * (2 + i * 0.5), 24, backOut);
        return (
          <div key={i} style={{display: 'flex', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTop: '1px solid #F0EBF8', opacity: clamp(p), transform: `translateX(${(1 - p) * 60}px)`}}>
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

export const CodeCard: React.FC<{t: number; at: number; cps?: number; w?: number; h?: number; validAt?: number}> = ({t, at, cps = 2.4, w = 1100, h = 860, validAt = 1e9}) => {
  let budget = Math.max(0, (t - at) * cps * 6);
  const vp = prog(t, validAt, 22, backOut);
  return (
    <Card style={{width: w, height: h, padding: 0, boxSizing: 'border-box'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 16, padding: '20px 30px', background: '#F6F3FB', borderBottom: '1px solid #ECE6F6'}}>
        <div style={{display: 'flex', gap: 8}}>{['#FF8A8A', '#F7C85C', '#7FD1B0'].map((c) => <div key={c} style={{width: 14, height: 14, borderRadius: 7, background: c}} />)}</div>
        <div style={{fontWeight: 700, fontSize: 22, fontFamily: FONT}}>welcome_assistant.botscript</div>
        <div style={{flex: 1}} />
        <Pill bg={C.pistachio} style={{fontSize: 20, transform: `scale(${vp})`, opacity: clamp(vp)}}><div style={{width: 24, height: 24, borderRadius: 12, background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Icon.check size={15} color="#fff" sw={3.5} /></div>Valid</Pill>
      </div>
      <div style={{padding: '22px 0', fontFamily: MONO, fontSize: 24, lineHeight: 1.5}}>
        {CODE.map((line, i) => {
          const parts: React.ReactNode[] = [];
          for (const [txt, col] of line) {
            if (budget <= 0) break;
            const take = Math.min(txt.length, Math.floor(budget));
            parts.push(<span key={parts.length} style={{color: col}}>{txt.slice(0, take)}</span>);
            budget -= txt.length;
          }
          budget -= 4;
          const shown = parts.length > 0 || budget > 0;
          return (
            <div key={i} style={{display: 'flex', minHeight: 36, opacity: shown ? 1 : 0.25}}>
              <div style={{width: 76, textAlign: 'right', paddingRight: 24, color: '#BDB2CF'}}>{i + 1}</div>
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
  const I = b.icon === 'avatar' ? null : Icon[b.icon];
  const badgeLive = b.badge !== 'Draft';
  return (
    <Card style={{width: w, padding: 28, boxSizing: 'border-box'}}>
      <div style={{display: 'flex', alignItems: 'flex-start'}}>
        <div style={{width: 84, height: 84, borderRadius: 42, background: C.lilac, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{I ? <I size={42} color={C.purpleDeep} /> : <Avatar size={76} />}</div>
        <div style={{flex: 1}} />
        <Pill bg={badgeLive ? '#E3F3EA' : '#FCF0D6'} color={badgeLive ? C.green : '#B47A10'} style={{fontSize: 17}}>{b.badge}</Pill>
      </div>
      <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 30, marginTop: 18}}>{b.name}</div>
      <div style={{fontSize: 20, color: C.purpleDeep, fontWeight: 600, marginTop: 2}}>{b.kind}</div>
      <div style={{marginTop: 18, height: 52, borderRadius: 16, background: '#EEE8FA', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontWeight: 700, fontSize: 21, color: C.purpleDeep}}>Open <Icon.arrow size={22} color={C.purpleDeep} /></div>
    </Card>
  );
};

export {Shine};
