// s08: the Live Dashboard rebuilt as separate glass layers placed as cine <Obj>s (local version of HoloAppFrame:
// every card is its own Obj so the camera can fly between / through them with nearFade, per-card DOF and crisp zoom).
import React from 'react';
import {FONT, DISPLAY, MONO, prog, expoOut, backOut, clamp, kick, band, rand} from '../../lib';
import {Obj, V3} from '../../cine';
import {useUI, Card, Pill, Icon, toneColors, withA, GlassPane, Beam3D, Sidebar, TopBar, PageTitle, ChatPanel, DEFAULT_CHAT, Msg, Timeline, SignalMeter, METRICS, signalValue} from '../../ui';

/* ------------------------------------------------------------------ */
/* Layout (world px, app centre at the origin; app is 1600×1000)        */
/* ------------------------------------------------------------------ */
type Key = 'base' | 'side' | 'top' | 'mainPane' | 'title' | 'sig' | 'speaker' | 'clerk' | 'decisions' | 'timeline' | 'chat';
const RECT: Record<Key, [number, number, number, number]> = {
  // app-space left, top, w, h
  base: [0, 0, 1600, 1000],
  side: [12, 12, 240, 976],
  top: [276, 6, 1300, 76],
  mainPane: [252, 78, 964, 912],
  title: [278, 92, 920, 100],
  sig: [264, 198, 590, 580],
  speaker: [869, 198, 335, 250],
  clerk: [869, 460, 335, 200],
  decisions: [869, 672, 335, 106],
  timeline: [264, 792, 940, 189],
  chat: [1222, 86, 360, 895],
};
/** Z (world px) of each layer for explode E (spacing S per layer unit). Mirrors HoloAppFrame + DashboardMain. */
const zOf = (k: Key, E: number, S: number) => {
  const main = 1.6 * S * E;
  switch (k) {
    case 'base': return 0;
    case 'side': return 0.7 * S * E + 2;
    case 'top': return 1.1 * S * E + 4;
    case 'mainPane': return main + 6;
    case 'title': return main + 30 * E + 8;
    case 'sig': return main + 90 * E + 10;
    case 'timeline': return main + 120 * E + 12;
    case 'speaker': return main + 150 * E + 14;
    case 'clerk': return main + 190 * E + 16;
    case 'decisions': return main + 230 * E + 18;
    case 'chat': return 2.4 * S * E + 20;
  }
};
const spreadOf = (k: Key): [number, number] => (k === 'side' ? [-1, 0] : k === 'chat' ? [1, 0] : k === 'top' ? [0, -0.6] : [0, 0]);

/** World-space centre of a layer (for camera targets, focus, HUD projection). */
export const dashPos = (k: Key, E: number, S = 170, spread = 70, dx = 0, dy = 0): V3 => {
  const [l, tp, w, h] = RECT[k];
  const [sx, sy] = spreadOf(k);
  return [l + w / 2 - 800 + sx * spread * E + dx, tp + h / 2 - 500 + sy * spread * E + dy, zOf(k, E, S)];
};
export const dashSize = (k: Key) => [RECT[k][2], RECT[k][3]] as const;

export type DashTimes = {
  /** Speaker prompt rows: System, State, Chunk, body text */
  speaker: [number, number, number, number];
  /** Decisions: green row, amber row */
  decisions: [number, number];
  /** Clerk: extracting, name ✓, email ✓, running function */
  clerk: [number, number, number, number];
  /** timeline first marker + step */
  timeline: [number, number];
  chatUser: number;
  chatReact: number;
};

/** Live signal value: the product's audio-reactive signalValue, pumped by the kick (shared by the 3D field and the card). */
export const fieldVal = (i: number, f: number) => {
  const base = signalValue(i, f, 1);
  const k = kick(f, 9);
  const pump = 0.32 * k * (0.45 + 0.9 * rand(i * 5.1));
  const shimmer = 0.06 * Math.sin(f / 7 + i * 1.3);
  return clamp(0.12 + base * 0.92 + pump + shimmer + 0.1 * band(f, (i + 2) % 5), 0.06, 1);
};

/** Signal Wall card (590×580) driven by fieldVal so it pumps with the music. */
export const SignalWallCard: React.FC<{f: number}> = ({f}) => {
  const th = useUI();
  const cols = 3, rows = Math.ceil(METRICS.length / cols);
  return (
    <Card style={{width: 590, height: 580, padding: '24px 22px', boxSizing: 'border-box'}}>
      <div style={{display: 'flex', alignItems: 'center', fontFamily: DISPLAY, fontWeight: 800, fontSize: 27, marginBottom: 16, letterSpacing: '-0.01em'}}>
        Signal Wall
        <div style={{flex: 1}} />
        <div style={{fontFamily: FONT, fontWeight: 600, fontSize: 14, letterSpacing: '0.16em', color: th.greenText, display: 'flex', alignItems: 'center', gap: 8}}>
          <div style={{width: 9, height: 9, borderRadius: 5, background: th.sig.green, boxShadow: `0 0 ${4 + 10 * kick(f)}px ${th.sig.green}`}} />LIVE
        </div>
      </div>
      <div style={{display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoFlow: 'column', gridTemplateRows: `repeat(${rows}, 1fr)`, columnGap: 18, height: 580 - 92}}>
        {METRICS.map((m, i) => <SignalMeter key={m} label={m} v={fieldVal(i, f)} />)}
      </div>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/* Local cards (custom beat timing)                                     */
/* ------------------------------------------------------------------ */
const Row: React.FC<{icon: string; p: number; hit: number; tone?: 'pistachio' | 'green' | 'amber'; fs?: number; pad?: string; mb?: number; glow?: string; children: React.ReactNode}> = ({icon, p, hit, tone, fs = 16, pad = '8px 12px', mb = 7, glow, children}) => {
  const th = useUI();
  const I = Icon[icon];
  const tc = tone ? toneColors(th, tone) : {bg: th.inset, fg: th.text};
  return (
    <div style={{position: 'relative', marginBottom: mb}}>
      {/* empty slot underneath (the prompt "assembling") */}
      <div style={{position: 'absolute', inset: 0, borderRadius: 12, border: `1.5px dashed ${withA('#8C6BEA', 0.35 * (1 - p))}`}} />
      <div style={{display: 'flex', alignItems: 'center', gap: 10, background: tc.bg, color: tc.fg, borderRadius: 12, padding: pad, fontSize: fs, opacity: clamp(p * 1.4), transform: `translateX(${((1 - p) * 70).toFixed(1)}px)`, boxShadow: `inset 0 0 0 1px ${tone ? 'rgba(255,255,255,0.5)' : th.insetBorder}${glow && hit > 0.02 ? `, 0 0 ${(26 * hit).toFixed(1)}px ${glow}` : ''}`, position: 'relative', overflow: 'hidden'}}>
        <I size={18} color={tc.fg} />
        {children}
        {hit > 0.02 && <div style={{position: 'absolute', inset: 0, background: `linear-gradient(100deg, rgba(255,255,255,0) ${(-30 + 130 * (1 - hit)).toFixed(1)}%, rgba(255,255,255,${(0.85 * hit).toFixed(3)}) ${(-10 + 130 * (1 - hit)).toFixed(1)}%, rgba(255,255,255,0) ${(10 + 130 * (1 - hit)).toFixed(1)}%)`}} />}
      </div>
    </div>
  );
};
const hitOf = (t: number, at: number, tau = 9) => (t < at ? 0 : Math.exp(-(t - at) / tau));

export const SPEAKER_ROWS: [string, string, 'pistachio' | undefined][] = [['doc', 'System', undefined], ['layers', 'State · collect_details', undefined], ['sparkle', 'Chunk · acknowledge', 'pistachio']];
/** Offset of speaker-prompt row i from the card centre (card-local px). */
export const speakerRowOffset = (i: number): [number, number] => [0, -51.5 + 42 * i];

/** A prompt row as a free-flying glass chip (it lands in its slot in the Speaker prompt card). */
export const PromptChip: React.FC<{i: number; glow?: number}> = ({i, glow = 0}) => {
  const th = useUI();
  const [ic, label, tone] = SPEAKER_ROWS[i];
  const I = Icon[ic];
  const tc = tone ? toneColors(th, tone) : {bg: 'rgba(246,241,255,0.92)', fg: th.text};
  return (
    <div style={{width: 299, height: 35, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 10, background: tc.bg, color: tc.fg, borderRadius: 12, padding: '8px 12px', fontSize: 16, fontFamily: FONT, boxShadow: `inset 0 0 0 1.5px rgba(255,255,255,0.9), 0 0 ${18 + 30 * glow}px rgba(160,130,255,${0.55 + 0.4 * glow}), 0 0 4px rgba(255,255,255,0.8)`}}>
      <I size={18} color={tc.fg} />
      {label}
    </div>
  );
};

export const SpeakerCard: React.FC<{t: number; at: DashTimes['speaker']; fly?: boolean}> = ({t, at, fly}) => {
  const th = useUI();
  const rows = SPEAKER_ROWS;
  const tp = prog(t, at[3], 22, expoOut);
  return (
    <Card style={{width: 335, height: 250, padding: 18, boxSizing: 'border-box'}} flash={0.8 * hitOf(t, at[2], 10)}>
      <div style={{display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 20, marginBottom: 12}}><Icon.doc size={22} />Speaker prompt</div>
      {rows.map(([ic, label, tone], i) => (
        <Row key={label} icon={ic} p={fly ? (t >= at[i] ? 1 : 0) : prog(t, at[i], 16, expoOut)} hit={hitOf(t, at[i])} tone={tone} glow="rgba(140,107,234,0.7)">{label}</Row>
      ))}
      <div style={{fontSize: 14.5, color: th.textSoft, lineHeight: 1.4, padding: '4px 4px', opacity: tp, transform: `translateY(${(1 - tp) * 10}px)`}}>
        Acknowledge the user's request, confirm what we're collecting, and ask a focused next question.
      </div>
    </Card>
  );
};

export const DecisionsCard: React.FC<{t: number; at: DashTimes['decisions']}> = ({t, at}) => {
  const g = hitOf(t, at[0], 16);
  return (
    <Card style={{width: 335, height: 106, padding: '10px 14px', boxSizing: 'border-box'}} glow={0.9 * g} flash={0.9 * hitOf(t, at[0], 8)}>
      <div style={{display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 18, marginBottom: 5}}><Icon.scale size={20} />Decisions</div>
      <Row icon="check" p={prog(t, at[0], 18, backOut)} hit={hitOf(t, at[0], 12)} tone="green" fs={15} pad="5px 10px" mb={4} glow="rgba(54,190,140,0.95)">Happy start matched</Row>
      <Row icon="clock" p={prog(t, at[1], 18, backOut)} hit={hitOf(t, at[1], 10)} tone="amber" fs={15} pad="5px 10px" mb={0} glow="rgba(236,175,66,0.9)">Collect details → follow up</Row>
    </Card>
  );
};

const Spinner: React.FC<{t: number; size: number}> = ({t, size}) => {
  const th = useUI();
  return <div style={{width: size, height: size, borderRadius: '50%', border: `3px solid ${withA(th.accent, 0.2)}`, borderTopColor: th.accent, transform: `rotate(${t * 12}deg)`, boxSizing: 'border-box'}} />;
};

export const ClerkCard: React.FC<{t: number; at: DashTimes['clerk']}> = ({t, at}) => {
  const th = useUI();
  const steps = [
    {label: 'Extracting fields', at: at[0]},
    {label: 'Name: Alex Morgan', at: at[1], sub: true},
    {label: 'Email: alex@example.com', at: at[2], sub: true},
    {label: 'Running function', at: at[3], run: true},
    {label: 'Awaiting result', at: at[3] + 10, wait: true},
  ];
  return (
    <Card style={{width: 335, height: 200, padding: 18, boxSizing: 'border-box'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 20, marginBottom: 10}}>
        <Icon.gear size={22} />Clerk activity
        <div style={{flex: 1}} />
        <Pill tone="lilac" color={th.accentText} style={{fontSize: 13, padding: '3px 10px'}}>Async</Pill>
      </div>
      <div style={{background: th.chip, color: th.accentText, borderRadius: 12, padding: '6px 14px', fontFamily: MONO, fontSize: 16, marginBottom: 8}}>create_lead</div>
      {steps.map((st, i) => {
        const p = prog(t, st.at, 14, expoOut);
        const ok = !st.run && !st.wait && t >= st.at + 3;
        const h = hitOf(t, st.at + 3, 8);
        return (
          <div key={i} style={{display: 'flex', alignItems: 'center', gap: 10, fontSize: st.sub ? 13.5 : 15, marginBottom: 3, paddingLeft: st.sub ? 26 : 0, opacity: clamp(p * 1.3), transform: `translateY(${(1 - p) * 8}px)`, color: st.sub ? th.textSoft : th.text, fontWeight: st.run && t >= st.at ? 600 : 400}}>
            {!st.sub && (st.run && t >= st.at ? <Spinner t={t} size={16} /> : (
              <div style={{width: 16, height: 16, borderRadius: 9, background: ok ? th.sig.green : 'transparent', border: ok ? 'none' : `2px solid ${th.chip2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', boxShadow: h > 0.02 ? `0 0 ${16 * h}px ${th.sig.green}` : undefined, transform: `scale(${1 + 0.5 * h})`}}>{ok && <Icon.check size={11} color="#fff" sw={3.5} />}</div>
            ))}
            <span style={{flex: 1}}>{st.label}</span>
            {st.sub && ok && <div style={{transform: `scale(${1 + 0.6 * h})`}}><Icon.check size={15} color={th.greenText} sw={3} /></div>}
          </div>
        );
      })}
    </Card>
  );
};

const TitlePart: React.FC<{f: number}> = ({f}) => {
  const th = useUI();
  return (
    <div style={{width: 920, height: 100, fontFamily: FONT, color: th.text}}>
      <PageTitle title="Live Dashboard" sub="See every signal, decision and action." p={1}
        right={<div style={{display: 'flex', gap: 14, alignItems: 'center', marginTop: 4}}>
          <Pill tone="pistachio" style={{fontSize: 19}}><div style={{width: 11, height: 11, borderRadius: 6, background: th.sig.green, boxShadow: `0 0 ${6 + 14 * kick(f)}px ${th.sig.green}`}} />Live · Turn 8</Pill>
          <Pill tone="white" style={{fontSize: 17}}>Current state <span style={{background: th.chip, color: th.chipText, borderRadius: 999, padding: '3px 12px'}}>collect_details</span></Pill>
        </div>} />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* The rig                                                              */
/* ------------------------------------------------------------------ */
export type DashRigProps = {
  t: number;
  f: number;
  E: number;
  S?: number;
  spread?: number;
  times: DashTimes;
  /** light beams between layers 0..1 */
  beams?: number;
  /** light-sweep progress 0..1 */
  sheen?: number;
  /** rim flash 0..1 (lock) */
  flash?: number;
  glow?: number;
  /** crisp native zoom per card (renders the card k× larger and scales the Obj by 1/k) */
  crisp?: Partial<Record<Key, number>>;
  /** nearFade for every layer */
  nf?: [number, number];
  /** skip layers (cost) */
  skip?: Key[];
  /** DOF multiplier per layer (0 = no DOF) */
  dofK?: Partial<Record<Key, number>>;
  /** speaker rows arrive as flying chips (rendered by the shot) */
  flyRows?: boolean;
};

export const DashRig: React.FC<DashRigProps> = ({t, f, E, S = 170, spread = 70, times, beams = 0, sheen, flash = 0, glow = 0, crisp = {}, nf, skip = [], dofK = {}, flyRows}) => {
  const msgs: Msg[] = [...DEFAULT_CHAT, {from: 'user', text: 'Thursday afternoon works!', at: times.chatUser, react: {emoji: '🔥', at: times.chatReact}}];
  const sh = (i: number) => (sheen === undefined ? undefined : clamp(sheen * 1.4 - i * 0.08));
  const node: Record<Key, React.ReactNode> = {
    base: <GlassPane w={1600} h={1000} radius={40} tint="frame" glow={glow} flash={flash} sheen={sh(0)} />,
    side: (
      <GlassPane w={240} h={976} radius={30} tint="glass" rim={0.8} specular={0.7} flash={flash} sheen={sh(1)}>
        <div style={{position: 'absolute', left: -10, top: -12}}><Sidebar active="Live Dashboard" /></div>
      </GlassPane>
    ),
    top: <TopBar />,
    mainPane: <GlassPane w={964} h={912} radius={34} tint="glass" rim={0.9} flash={flash} sheen={sh(2)} />,
    title: <TitlePart f={f} />,
    sig: <SignalWallCard f={f} />,
    speaker: <SpeakerCard t={t} at={times.speaker} fly={flyRows} />,
    clerk: <ClerkCard t={t} at={times.clerk} />,
    decisions: <DecisionsCard t={t} at={times.decisions} />,
    timeline: <Timeline t={t} at={times.timeline[0]} step={times.timeline[1]} />,
    chat: <ChatPanel t={t} msgs={msgs} sheen={sh(4)} flash={flash} />,
  };
  const keys: Key[] = ['base', 'side', 'top', 'mainPane', 'title', 'sig', 'timeline', 'speaker', 'clerk', 'decisions', 'chat'];
  const beamNodes: React.ReactNode[] = [];
  if (beams > 0 && E > 0.02) {
    const anchors: [Key, [number, number][]][] = [
      ['side', [[20, 20], [220, 20], [20, 956], [220, 956]]],
      ['mainPane', [[24, 24], [940, 24], [24, 888], [940, 888]]],
      ['chat', [[24, 24], [336, 24], [24, 871], [336, 871]]],
      ['decisions', [[10, 10], [325, 96]]],
      ['sig', [[10, 10], [580, 570]]],
    ];
    anchors.forEach(([k, pts], li) => {
      if (skip.includes(k)) return;
      const [l, tp] = RECT[k];
      const [sx, sy] = spreadOf(k);
      const z = zOf(k, E, S);
      pts.forEach(([ax, ay], j) => {
        const u = ((t * 0.02 + j * 0.29 + li * 0.17) % 1 + 1) % 1;
        beamNodes.push(<Beam3D key={`${k}${j}`} a={[l + ax, tp + ay, 0]} b={[l + ax + sx * spread * E, tp + ay + sy * spread * E, z]} o={beams * clamp(E * 2)} color="170,140,255" pulse={u} thick={1.5} />);
      });
    });
  }
  return (
    <>
      {keys.filter((k) => !skip.includes(k)).map((k) => {
        const [x, y, z] = dashPos(k, E, S, spread);
        const [w, h] = dashSize(k);
        const kk = crisp[k] ?? 1;
        return (
          <Obj key={k} x={x} y={y} z={z} w={w * kk} h={h * kk} s={kk !== 1 ? 1 / kk : 1} nearFade={nf} dof={dofK[k] ?? 1}>
            <div style={{width: w, height: h, position: 'relative', zoom: kk !== 1 ? kk : undefined}}>{node[k]}</div>
          </Obj>
        );
      })}
      {beamNodes.length > 0 && <Obj x={-800} y={-500} z={0} dof={false}>{beamNodes}</Obj>}
    </>
  );
};

/** Decorative cover glass in front of the stack: a luminous rim frame with HUD ticks — the camera pulls back through it. */
export const CoverGlass: React.FC<{w: number; h: number; label: string; sub: string; o?: number}> = ({w, h, label, sub, o = 1}) => (
  <div style={{width: w, height: h, position: 'relative', borderRadius: 44, opacity: o < 1 ? o : undefined, background: 'linear-gradient(160deg, rgba(220,205,255,0.10) 0%, rgba(150,120,255,0.04) 40%, rgba(127,231,255,0.06) 100%)', boxShadow: 'inset 0 0 0 2px rgba(205,187,255,0.55), inset 0 0 60px rgba(140,107,234,0.18), 0 0 40px rgba(140,107,234,0.25)'}}>
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 3, borderRadius: 2, background: 'linear-gradient(90deg, transparent, #CDBBFF 20%, #7FE7FF 55%, transparent)'}} />
    {[[40, 40], [w - 40, 40], [40, h - 40], [w - 40, h - 40]].map(([x, y], i) => (
      <div key={i} style={{position: 'absolute', left: x - 26, top: y - 26, width: 52, height: 52, borderLeft: i % 2 === 0 ? '3px solid #BFF4FF' : undefined, borderRight: i % 2 === 1 ? '3px solid #BFF4FF' : undefined, borderTop: i < 2 ? '3px solid #BFF4FF' : undefined, borderBottom: i >= 2 ? '3px solid #BFF4FF' : undefined, boxShadow: '0 0 12px rgba(127,231,255,0.5)'}} />
    ))}
    <div style={{position: 'absolute', left: 90, top: 30, fontFamily: FONT, fontWeight: 600, fontSize: 22, letterSpacing: '0.32em', color: '#BFF4FF', textShadow: '0 0 12px rgba(127,231,255,0.8)'}}>{label}</div>
    <div style={{position: 'absolute', right: 90, bottom: 30, fontFamily: MONO, fontSize: 20, letterSpacing: '0.1em', color: '#CDBBFF'}}>{sub}</div>
    <div style={{position: 'absolute', left: 90, right: 90, bottom: 74, height: 14, background: 'repeating-linear-gradient(90deg, rgba(205,187,255,0.6) 0 2px, transparent 2px 40px)', opacity: 0.7}} />
  </div>
);
