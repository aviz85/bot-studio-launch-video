import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate} from 'remotion';
import {B, BEAT, C, FONT, DISPLAY, MONO, prog, expoOut, expoInOut, backOut, smooth, lerp, clamp, kick, rand, DURATION} from '../lib';
import {Stage, Layer, NightBG, Words, Caption, Avatar, Card, Pill, Icon, Shine, Flash, Particles} from '../ui/kit';
import {AppFrame, ChatPanel, Msg, DEFAULT_CHAT} from '../ui/app';
import {DashboardMain, Timeline, CodeCard, BOTS, BotCard, SignalWall, Graph} from '../ui/screens';
import {Whip} from './part1';

/* key-framed camera helper: kf = [[frame, value], ...] with smooth easing between */
const kf = (t: number, pts: [number, number][], ease = expoInOut) =>
  interpolate(t, pts.map((p) => p[0]), pts.map((p) => p[1]), {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});

/* ------------------------------------------------------------------ */
/* 10. BREAKDOWN                                                        */
/* ------------------------------------------------------------------ */
export const Breakdown: React.FC = () => {
  const t = useCurrentFrame();
  const charge = prog(t, B(6), B(2), (x) => x * x);
  return (
    <AbsoluteFill style={{background: '#05020A'}}>
      <AbsoluteFill style={{opacity: 0.25 + charge * 0.75}}><NightBG floor={false} intensity={0.4 + charge} /></AbsoluteFill>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', transform: `scale(${1 + 0.06 * prog(t, 0, B(8), smooth) + charge * 0.15})`}}>
        {t < B(4) && <Words text="Not another chatbot." start={4} stagger={B(0.5)} size={124} color="#F2EDFA" weight={700} out={B(3.6)} />}
        {t >= B(4) && (
          <div style={{display: 'flex', alignItems: 'center', gap: 40}}>
            <div style={{transform: `scale(${prog(t, B(4), 30, backOut)})`, filter: `drop-shadow(0 0 ${30 + 60 * charge}px rgba(140,107,234,0.9))`}}><Avatar size={170} wink={t > B(5) && t < B(5) + 12 ? 0 : 1} /></div>
            <Words text="A bot studio." start={B(4) + 6} stagger={B(0.5)} size={150} gradient />
          </div>
        )}
      </AbsoluteFill>
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 50%, rgba(205,187,255,${charge * 0.5}), transparent 60%)`}} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* 11. LIVE DASHBOARD — hero                                            */
/* ------------------------------------------------------------------ */
export const Dashboard: React.FC<{from: number}> = ({from}) => {
  const t = useCurrentFrame();
  const f = t + from;
  const k = kick(f, 8);
  const P = [0, B(4), B(8), B(12), B(16)];
  const cam = {
    s: kf(t, [[0, 1.75], [P[1], 1.75], [P[1] + 50, 0.86], [P[2], 0.9], [P[3], 0.94], [P[3] + 40, 1.25], [P[4], 1.32]]),
    rx: kf(t, [[0, 26], [P[1], 18], [P[1] + 50, 16], [P[2], 12], [P[3], 8], [P[4], 6]], smooth),
    ry: kf(t, [[0, -26], [P[1], -14], [P[1] + 50, -16], [P[2], 4], [P[3], 14], [P[4], 20]], smooth),
    rz: kf(t, [[0, 3], [P[2], 0], [P[4], -1]], smooth),
    x: kf(t, [[0, 520], [P[1], 420], [P[1] + 50, 0], [P[3], 0], [P[3] + 40, -330], [P[4], -360]]),
    y: kf(t, [[0, 120], [P[1], 60], [P[1] + 50, 30], [P[3], 20], [P[3] + 40, -160], [P[4], -170]]),
  };
  const e = kf(t, [[0, 1.4], [P[1] + 50, 1.0], [P[2], 0.8], [P[3] - 10, 0.6], [P[3] + 8, 0], [P[4], 0]]);
  const msgs: Msg[] = [
    ...DEFAULT_CHAT,
    {from: 'user', text: 'Thursday afternoon works!', at: B(9), react: {emoji: '🔥', at: B(9.6)}},
    {from: 'bot', text: 'Perfect. Locking in Thursday.', at: B(11), typingFrom: B(10)},
  ];
  return (
    <AbsoluteFill>
      <NightBG intensity={1.1} />
      <Whip t={t}>
        <Stage cam={{...cam, s: cam.s * (1 + 0.012 * k)}}>
          <Layer x={960} y={540} w={1600} h={1000}>
            <AppFrame active="Live Dashboard" t={t} e={e} glow={0.6 + 0.4 * k} main={<DashboardMain f={f} t={t} e={e} rv={0} />} chat={<ChatPanel t={t} msgs={msgs} />} />
            <Shine p={prog(t, P[2], 40, smooth)} strength={0.5} />
            <Shine p={prog(t, P[3], 40, smooth)} strength={0.5} />
          </Layer>
        </Stage>
      </Whip>
      <Caption kicker="Live Dashboard" title="See every signal. Live." start={B(1)} end={B(8)} />
      <Caption kicker="Decisions · Clerk · Timeline" title="Every decision, explained." start={B(8.5)} end={B(16)} pos="right" />
      <Flash at={0} dur={22} max={1} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* 12. RICH CHAT                                                        */
/* ------------------------------------------------------------------ */
export const ChatScene: React.FC<{from: number}> = ({from}) => {
  const t = useCurrentFrame();
  const f = t + from;
  const k = kick(f, 8);
  const msgs: Msg[] = [
    {from: 'user', text: 'Can I book for Thursday?', at: 4, react: {emoji: '❤️', at: B(1)}},
    {from: 'bot', text: 'Absolutely! 🗓️', at: B(2), typingFrom: B(1.4)},
    {from: 'bot', text: 'Checking Thursday slots now…', at: B(3)},
    {from: 'bot', text: 'Thursday, 3:00 PM is yours.', at: B(5), typingFrom: B(4.2), tag: 'Booking confirmed'},
    {from: 'user', text: 'Amazing 🔥', at: B(6.2), react: {emoji: '🙌', at: B(7)}},
  ];
  const chips = [
    {txt: 'Instant reaction', icon: 'bolt', x: 470, y: 330, at: B(1)},
    {txt: 'Paced message groups', icon: 'chat', x: 1460, y: 420, at: B(3)},
    {txt: 'Booking ran in the background', icon: 'calendar', x: 450, y: 640, at: B(5)},
    {txt: 'Files · voice · GIFs', icon: 'paperclip', x: 1470, y: 720, at: B(6.5)},
  ];
  const sw = prog(t, 0, B(8), smooth);
  return (
    <AbsoluteFill>
      <NightBG />
      <Whip t={t}>
        <Stage cam={{rx: 6, ry: lerp(-12, 10, sw), z: lerp(-60, 60, sw), y: -20, s: 1 + 0.012 * k}}>
          <Layer x={960} y={470} w={560} z={40} s={0.92}><ChatPanel t={t} msgs={msgs} w={560} h={860} state="booking" /></Layer>
          {chips.map((c, i) => {
            const p = prog(t, c.at, 24, backOut);
            const I = Icon[c.icon];
            return (
              <Layer key={i} x={c.x} y={c.y + 8 * Math.sin((t + i * 30) / 22)} w={520} z={180 + i * 30} s={p} o={clamp(p)} ry={c.x < 960 ? 14 : -14}>
                <div style={{display: 'flex', justifyContent: 'center'}}>
                  <Pill bg="rgba(255,255,255,0.95)" style={{fontSize: 27, padding: '16px 26px', boxShadow: '0 20px 50px -10px rgba(0,0,0,0.5)', gap: 12}}><I size={28} color={C.purpleDeep} />{c.txt}</Pill>
                </div>
              </Layer>
            );
          })}
        </Stage>
      </Whip>
      <Caption kicker="Conversation" title="Reacts instantly. Talks naturally." start={B(1)} end={B(8)} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* 13. TIMELINE                                                         */
/* ------------------------------------------------------------------ */
export const TimelineScene: React.FC<{from: number}> = ({from}) => {
  const t = useCurrentFrame();
  const f = t + from;
  const k = kick(f, 8);
  return (
    <AbsoluteFill>
      <NightBG />
      <Whip t={t}>
        <Stage cam={{rx: 16, ry: lerp(-10, 6, prog(t, 0, B(4), smooth)), z: lerp(-40, 80, prog(t, 0, B(4), smooth)), s: 1 + 0.015 * k}}>
          <Layer x={960} y={600} w={1640}><Timeline t={t} at={6} step={BEAT / 2} w={1640} h={330} scale={1.45} /></Layer>
        </Stage>
      </Whip>
      <AbsoluteFill style={{alignItems: 'center', paddingTop: 150}}>
        <Words text="Every millisecond, traced." start={2} stagger={5} size={96} gradient />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* 14. BOTSCRIPT                                                        */
/* ------------------------------------------------------------------ */
export const BotScript: React.FC<{from: number}> = ({from}) => {
  const t = useCurrentFrame();
  const f = t + from;
  const k = kick(f, 8);
  const sw = prog(t, 0, B(8), smooth);
  const sat = [
    {x: 1500, y: 260, z: 240, at: B(2), node: <Pill bg={C.pistachio} style={{fontSize: 24, padding: '14px 22px'}}><Icon.check size={22} sw={3} />goal_clear · yes</Pill>},
    {x: 1560, y: 520, z: 320, at: B(3), node: <div style={{width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle at 40% 30%, #fff, #D9CCFA)', border: `3px solid ${C.purple}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 22, color: C.plum, boxShadow: '0 0 40px rgba(140,107,234,0.8)'}}>discover</div>},
    {x: 1480, y: 790, z: 200, at: B(4), node: <Pill bg="#fff" style={{fontSize: 24, padding: '14px 22px', fontFamily: MONO, color: C.purpleDeep}}>create_lead · async</Pill>},
  ];
  return (
    <AbsoluteFill>
      <NightBG />
      <Whip t={t}>
        <Stage cam={{rx: lerp(10, 6, sw), ry: lerp(24, 10, sw), z: lerp(-200, 0, sw), x: -140, y: 0, s: 1 + 0.012 * k}}>
          <Layer x={840} y={430} w={1100} s={0.82}><CodeCard t={t} at={4} cps={0.95} validAt={B(6)} /><Shine p={prog(t, B(6), 34, smooth)} /></Layer>
          {sat.map((s, i) => {
            const p = prog(t, s.at, 24, backOut);
            return <Layer key={i} x={s.x} y={s.y + 8 * Math.sin((t + i * 25) / 20)} w={380} z={s.z} s={p} o={clamp(p)} ry={-10}><div style={{display: 'flex', justifyContent: 'center'}}>{s.node}</div></Layer>;
          })}
        </Stage>
      </Whip>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        {sat.map((s, i) => <path key={i} d={`M 1220 ${380 + i * 200} C 1300 ${380 + i * 200}, 1320 ${s.y}, ${s.x - 150} ${s.y}`} stroke="#CDBBFF" strokeWidth={2.5} fill="none" strokeDasharray="6 8" strokeDashoffset={-t * 1.5} opacity={prog(t, s.at + 6, 16) * 0.8} />)}
      </svg>
      <Caption kicker="BotScript" title="One script. For people and agents." start={B(1)} end={B(8)} pos="right" />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* 15. BOT FACTORY                                                      */
/* ------------------------------------------------------------------ */
export const Factory: React.FC<{from: number}> = ({from}) => {
  const t = useCurrentFrame();
  const f = t + from;
  const k = kick(f, 8);
  const pull = prog(t, B(8), B(4), expoInOut);
  const sw = prog(t, 0, B(12), smooth);
  return (
    <AbsoluteFill>
      <NightBG intensity={1.1} />
      <Whip t={t}>
        <Stage cam={{rx: lerp(20, 30, pull), ry: lerp(-18, 18, sw), rz: lerp(-4, 4, sw), z: lerp(-200, -1100, pull), y: lerp(60, 120, pull), s: 1 + 0.012 * k}}>
          {/* echoes for infinite factory */}
          {pull > 0 && [-2, -1, 1, 2].map((gx) => [-1, 0, 1].map((gy) => (
            <Layer key={`${gx}_${gy}`} x={960 + gx * 1450} y={540 + gy * 1000} w={1400} h={960} z={-200 * Math.abs(gx)} o={pull * (0.75 - 0.2 * Math.abs(gx))}>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 440px)', gap: 30}}>{BOTS.map((b, i) => <BotCard key={i} b={BOTS[(i + gx * 3 + gy + 9) % 9]} w={440} />)}</div>
            </Layer>
          )))}
          {pull > 0 && [-1, 1].map((gy) => (
            <Layer key={`c${gy}`} x={960} y={540 + gy * 1000} w={1400} h={960} o={pull * 0.75}>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 440px)', gap: 30}}>{BOTS.map((b, i) => <BotCard key={i} b={BOTS[(i + gy + 9) % 9]} w={440} />)}</div>
            </Layer>
          ))}
          {BOTS.map((b, i) => {
            const at = B(1 + i * 0.75);
            const p = prog(t, at, 26, backOut);
            const pz = prog(t, at, 20, expoOut);
            const col = i % 3, row = Math.floor(i / 3);
            return (
              <Layer key={i} x={960 + (col - 1) * 470} y={540 + (row - 1) * 320} w={440} z={lerp(900, 0, pz)} rx={lerp(-50, 0, pz)} s={lerp(0.5, 1, p)} o={clamp(pz * 3)}>
                <BotCard b={b} w={440} />
                <Shine p={prog(t, at + 8, 24, smooth)} />
              </Layer>
            );
          })}
        </Stage>
      </Whip>
      <AbsoluteFill style={{alignItems: 'center', paddingTop: 66}}>
        <div style={{padding: '18px 44px', borderRadius: 40, background: 'rgba(14,8,24,0.55)', backdropFilter: 'blur(8px)'}}>
          <Words text="A bot that builds bots." start={B(0.5)} stagger={5} size={88} gradient />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* 16. MONTAGE — real design screens on every beat                      */
/* ------------------------------------------------------------------ */
const SHOTS = ['01-live-dashboard', '03-states', '05-policies', '07-judgment-editor', '10-functions', '11-evaluation', '12-versions', '13-botscript'];
export const Montage: React.FC<{from: number}> = ({from}) => {
  const t = useCurrentFrame();
  const f = t + from;
  const k = kick(f, 6);
  const i = Math.min(7, Math.floor(t / BEAT));
  const lt = t - i * BEAT;
  const p = clamp(lt / BEAT);
  const angles = [[18, -24], [-14, 22], [20, 18], [-16, -20], [14, -10], [-18, 16], [16, 24], [-12, -18]];
  const [rx, ry] = angles[i];
  const word = ['Describe.', 'Build.', 'See.', 'Ship.'][Math.floor(i / 2)];
  return (
    <AbsoluteFill>
      <NightBG intensity={1.2} />
      <Stage cam={{rx: lerp(rx, rx * 0.4, expoOut(p)), ry: lerp(ry, ry * 0.3, expoOut(p)), z: lerp(-300, 60, expoOut(p)), s: 1 + 0.02 * k}}>
        <Layer x={960} y={540} w={1586 * 0.95} h={992 * 0.95}>
          <div style={{width: '100%', height: '100%', borderRadius: 34, overflow: 'hidden', boxShadow: '0 60px 140px -20px rgba(0,0,0,0.85), 0 0 80px rgba(140,107,234,0.5)'}}>
            <Img src={staticFile(`designs/${SHOTS[i]}.png`)} style={{width: '100%', height: '100%'}} />
          </div>
          <Shine p={clamp(p * 1.3)} strength={0.55} />
        </Layer>
      </Stage>
      <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 50%, rgba(14,8,24,0.65), rgba(14,8,24,0.2) 70%)'}} />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <div key={word} style={{fontFamily: DISPLAY, fontWeight: 900, fontSize: 260, letterSpacing: '-0.05em', color: '#fff', textShadow: '0 10px 60px rgba(106,69,224,0.9)', transform: `scale(${lerp(1.25, 1, prog(t % (BEAT * 2), 0, 14, expoOut))})`, opacity: prog(t % (BEAT * 2), 0, 6)}}>{word}</div>
      </AbsoluteFill>
      <Flash at={i * BEAT} dur={8} max={0.35} color="#CDBBFF" />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* 17. FINAL                                                            */
/* ------------------------------------------------------------------ */
export const Final: React.FC<{from: number}> = ({from}) => {
  const t = useCurrentFrame();
  const end = DURATION - from;
  const pop = prog(t, 0, 40, backOut);
  const fade = prog(t, end - 50, 50, smooth);
  const wink = (t > 70 && t < 82) || (t > 200 && t < 212) ? 0 : 1;
  return (
    <AbsoluteFill style={{background: '#05020A'}}>
      <NightBG intensity={1.2 * (1 - fade)} />
      <Stage cam={{z: lerp(-60, 60, prog(t, 0, end, smooth)), ry: lerp(-6, 6, prog(t, 0, end, smooth))}}>
        <Layer x={960} y={400} w={280} h={280} s={pop} ry={lerp(-360, 0, prog(t, 0, 44, expoOut))}>
          <div style={{filter: 'drop-shadow(0 0 60px rgba(140,107,234,0.95))'}}><Avatar size={280} wink={wink} /></div>
        </Layer>
        <Layer x={960} y={665} w={1600}>
          <Words text="Bot Studio" start={6} stagger={6} size={200} gradient />
        </Layer>
        <Layer x={960} y={800} w={1600} o={prog(t, 30, 24)}>
          <div style={{textAlign: 'center', fontFamily: FONT, fontSize: 44, color: '#E2D6FF', fontWeight: 500}}>Bots that think in the open.</div>
        </Layer>
        <Layer x={960} y={900} w={1600} o={prog(t, 60, 24)}>
          <div style={{display: 'flex', justifyContent: 'center', gap: 18}}>
            {['Judge', 'Speaker', 'Clerk', 'BotScript', 'Live Dashboard'].map((x, i) => (
              <div key={x} style={{opacity: prog(t, 60 + i * 5, 20), transform: `translateY(${(1 - prog(t, 60 + i * 5, 20)) * 20}px)`}}>
                <Pill bg="rgba(205,187,255,0.14)" color="#E2D6FF" style={{fontSize: 22, border: '1px solid rgba(205,187,255,0.35)'}}>{x}</Pill>
              </div>
            ))}
          </div>
        </Layer>
      </Stage>
      <AbsoluteFill style={{background: '#000', opacity: fade}} />
      <Flash at={0} dur={26} max={1} />
    </AbsoluteFill>
  );
};

export {SignalWall, Graph, Particles, Card, rand, MONO, kf};
