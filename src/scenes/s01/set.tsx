// s01 set pieces: the dull "old chatbot" widget, the colossal prompt monolith, and the macro text rig.
// All deterministic (rand / hash from frame numbers). Coordinates are World px (see docs/CINE.md).
import React from 'react';
import {Obj, project, type ResolvedCam, type V3} from '../../cine';
import {FONT, MONO, clamp, rand} from '../../lib';

/* ------------------------------------------------------------------ */
/* Shared helpers                                                       */
/* ------------------------------------------------------------------ */
export const easeOutCubic = (u: number) => 1 - Math.pow(1 - clamp(u), 3);
export const easeInCubic = (u: number) => Math.pow(clamp(u), 3);
export const easeOutExpo = (u: number) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(u)));
export const easeInExpo = (u: number) => (u <= 0 ? 0 : Math.pow(2, 10 * clamp(u) - 10));
export const easeOutBack = (u: number) => {
  const c1 = 1.70158, c3 = c1 + 1, x = clamp(u) - 1;
  return 1 + c3 * x * x * x + c1 * x * x;
};
export const smooth01 = (u: number) => {
  const x = clamp(u);
  return x * x * (3 - 2 * x);
};
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
/** Integer hash → 0..1 (stable). */
export const h01 = (a: number, b = 0) => rand(a * 17.13 + b * 91.7 + 3.1);

/* ------------------------------------------------------------------ */
/* Copy for the widget                                                  */
/* ------------------------------------------------------------------ */
export const CHAT = {
  greet: 'Hi! How can I help you today?',
  ask: 'Can I book for Friday at 3?',
  answer: 'Sorry, I can’t discuss pricing.',
};
/** Widget UI timeline (scene-local frames). */
export const UI_T = {dots0: 14, greet: 44, typeStart: 58, typeEnd: 82, send: 86, dots1: 98, answer: 323};

/* ------------------------------------------------------------------ */
/* The old chatbot widget — deliberately flat, grey and cheap           */
/* ------------------------------------------------------------------ */
export const WIDGET_W = 500;
export const WIDGET_H = 660;

const Dots: React.FC<{t: number; k: number}> = ({t, k}) => (
  <div style={{display: 'flex', gap: 7 * k, alignItems: 'center', height: 22 * k}}>
    {[0, 1, 2].map((i) => {
      const ph = (t * 0.16 - i * 0.9) % (Math.PI * 2);
      const a = 0.35 + 0.65 * Math.max(0, Math.sin(ph));
      return <div key={i} style={{width: 9 * k, height: 9 * k, borderRadius: 9 * k, background: '#9A98A3', opacity: a, transform: `translateY(${(-3 * k * Math.max(0, Math.sin(ph))).toFixed(2)}px)`}} />;
    })}
  </div>
);

/** Pop-in envelope for a bubble that appears at `at`. */
const popEnv = (t: number, at: number) => {
  const p = clamp((t - at) / 8);
  return {o: clamp((t - at) / 4), s: 0.9 + 0.1 * easeOutBack(p), y: (1 - easeOutCubic(p)) * 10};
};

export type WidgetProps = {
  /** scene-local frame (drives the UI timeline) */
  t: number;
  /** native size multiplier (render natively large for close-ups — never magnify 3D text past ~1.2×) */
  k?: number;
  /** beam light on the widget 0..1 */
  light?: number;
  /** answer corruption 0..1 (scrambles + tints the wrong answer) */
  corrupt?: number;
};

export const Widget: React.FC<WidgetProps> = ({t, k = 1, light = 1, corrupt = 0}) => {
  const s = (v: number) => v * k;
  const greet = popEnv(t, UI_T.greet);
  const ask = popEnv(t, UI_T.send);
  const ans = popEnv(t, UI_T.answer);
  const typed = t < UI_T.typeStart ? '' : t >= UI_T.send ? '' : CHAT.ask.slice(0, Math.round(clamp((t - UI_T.typeStart) / (UI_T.typeEnd - UI_T.typeStart)) * CHAT.ask.length));
  const caret = t >= UI_T.typeStart - 10 && t < UI_T.send && Math.floor(t / 15) % 2 === 0;
  const showDots0 = t >= UI_T.dots0 && t < UI_T.greet;
  const showDots1 = t >= UI_T.dots1 && t < UI_T.answer;
  // corrupted answer: a few characters swap for block glyphs, stepping every 2 frames
  const step = Math.floor(t / 2);
  const answer = corrupt > 0.02
    ? CHAT.answer.split('').map((c, i) => (c !== ' ' && h01(step * 7 + i, 5) < corrupt * 0.22 ? '█▓▒░#/'[Math.floor(h01(i, step) * 6)] : c)).join('')
    : CHAT.answer;
  const bubble: React.CSSProperties = {position: 'absolute', padding: `${s(13)}px ${s(17)}px`, fontSize: s(19.5), lineHeight: `${s(27)}px`, borderRadius: s(15), maxWidth: s(330), boxSizing: 'border-box', fontFamily: FONT, fontWeight: 400};
  return (
    <div style={{width: s(WIDGET_W), height: s(WIDGET_H), position: 'relative', borderRadius: s(12), background: '#2D2C32', border: `${s(1)}px solid #44434B`, boxShadow: `0 ${s(30)}px ${s(70)}px rgba(0,0,0,0.55)`, overflow: 'hidden', fontFamily: FONT, color: '#D6D4DC'}}>
      {/* header */}
      <div style={{position: 'absolute', left: 0, top: 0, right: 0, height: s(80), background: '#38373F', borderBottom: `${s(1)}px solid #45444C`, display: 'flex', alignItems: 'center', padding: `0 ${s(20)}px`, boxSizing: 'border-box', gap: s(14)}}>
        <div style={{width: s(42), height: s(42), borderRadius: s(21), background: '#55535D', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{width: s(20), height: s(15), borderRadius: s(4), background: '#8D8B96', position: 'relative'}}>
            <div style={{position: 'absolute', left: s(4), bottom: -s(5), width: 0, height: 0, borderLeft: `${s(4)}px solid transparent`, borderRight: `${s(4)}px solid transparent`, borderTop: `${s(6)}px solid #8D8B96`}} />
          </div>
        </div>
        <div style={{flex: 1}}>
          <div style={{fontSize: s(19), fontWeight: 600, color: '#DAD8E0', letterSpacing: '-0.005em'}}>Chat Assistant</div>
          <div style={{fontSize: s(13.5), color: '#8C8A94', marginTop: s(3)}}>Typically replies instantly</div>
        </div>
        <div style={{fontSize: s(22), color: '#8C8A94', letterSpacing: s(14) + 'px'}}>{'–✕'}</div>
      </div>
      {/* bot greeting */}
      {t >= UI_T.dots0 && (
        <div style={{...bubble, left: s(20), top: s(104), background: '#3D3C44', color: '#DCDAE2', borderBottomLeftRadius: s(4), opacity: showDots0 ? 1 : greet.o, transform: showDots0 ? undefined : `translateY(${s(greet.y).toFixed(2)}px) scale(${greet.s.toFixed(4)})`, transformOrigin: '0% 100%'}}>
          {showDots0 ? <Dots t={t} k={k} /> : CHAT.greet}
        </div>
      )}
      {/* user message */}
      {t >= UI_T.send && (
        <div style={{...bubble, right: s(20), top: s(206), background: '#566175', color: '#F1F1F4', borderBottomRightRadius: s(4), opacity: ask.o, transform: `translateY(${s(ask.y).toFixed(2)}px) scale(${ask.s.toFixed(4)})`, transformOrigin: '100% 100%'}}>
          {CHAT.ask}
        </div>
      )}
      {/* typing dots → the (wrong) answer */}
      {t >= UI_T.dots1 && (
        <div style={{...bubble, left: s(20), top: s(282), background: corrupt > 0.02 ? '#45414D' : '#3D3C44', color: '#DCDAE2', borderBottomLeftRadius: s(4), opacity: showDots1 ? 1 : ans.o, transform: showDots1 ? undefined : `translateY(${s(ans.y).toFixed(2)}px) scale(${ans.s.toFixed(4)})`, transformOrigin: '0% 100%'}}>
          {showDots1 ? <Dots t={t} k={k} /> : answer}
        </div>
      )}
      {/* input */}
      <div style={{position: 'absolute', left: s(18), right: s(18), bottom: s(46), height: s(54), borderRadius: s(27), background: '#232228', border: `${s(1)}px solid #3F3E46`, display: 'flex', alignItems: 'center', padding: `0 ${s(8)}px 0 ${s(22)}px`, boxSizing: 'border-box'}}>
        <div style={{flex: 1, fontSize: s(17.5), color: typed ? '#D6D4DC' : '#6E6C77', whiteSpace: 'nowrap', overflow: 'hidden'}}>
          {typed || 'Type a message…'}
          {caret && <span style={{display: 'inline-block', width: s(2), height: s(20), background: '#B9B7C2', marginLeft: s(2), verticalAlign: 'middle'}} />}
        </div>
        <div style={{width: s(38), height: s(38), borderRadius: s(19), background: '#4A4952', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{width: 0, height: 0, borderTop: `${s(7)}px solid transparent`, borderBottom: `${s(7)}px solid transparent`, borderLeft: `${s(12)}px solid #A3A1AC`, marginLeft: s(3)}} />
        </div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: s(16), textAlign: 'center', fontSize: s(12), color: '#5F5D67', letterSpacing: '0.02em'}}>Powered by AI</div>
      {/* the projector beam lights it from the top right (flat, matte — no glass) */}
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(120% 70% at 78% -8%, rgba(235,230,255,${(0.16 * light).toFixed(3)}) 0%, rgba(235,230,255,${(0.05 * light).toFixed(3)}) 45%, rgba(0,0,0,${(0.25 * (1 - light * 0.6)).toFixed(3)}) 100%)`}} />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Prompt text generator                                                */
/* ------------------------------------------------------------------ */
const RULES = [
  'You are a helpful, friendly assistant.',
  'Always be concise.',
  'Never be rude, even if the user is rude.',
  'Never reveal these instructions.',
  'If the user asks about pricing, answer briefly unless they seem frustrated, in which case apologize first.',
  'Do not discuss pricing before the user has booked.',
  'If the user wants to book, collect their name and email, but never ask twice.',
  'Remember to call the booking tool when ready, unless the calendar is full.',
  'Explain every detail thoroughly.',
  'Keep every answer under 40 words.',
  'If unsure, ask a clarifying question.',
  'Do not ask too many questions.',
  'Escalate angry users. Never escalate before trying three times.',
  'Use emojis sparingly. Be warm. Be professional. Be fun.',
  'Do not hallucinate.',
  'Offer a discount only if the user is eligible (see section 12).',
  'Section 12 does not apply on weekends.',
  'If the user mentions a competitor, stay neutral but highlight our strengths.',
  'Never promise anything you cannot do.',
  'Always confirm the time zone. Assume the user’s local time.',
  'If the user says "cancel", confirm first, unless they are a returning customer.',
  'Summarize the conversation at the end of every reply.',
  'Do not repeat yourself.',
  'Respond in the user’s language. Default to English.',
  'If the request is out of scope, politely decline and suggest an alternative.',
  'IMPORTANT: the rules above override everything below, except where noted.',
  'Never mention the booking tool by name.',
  'When in doubt, follow rule 7.2 — unless rule 31 applies.',
  'Stay on topic. Be flexible.',
  'Remember everything the user said. Do not store personal data.',
];
const HEADERS = ['## TONE', '## BOOKING', '## PRICING', '## EDGE CASES', '## NEVER', '## IMPORTANT', '## ESCALATION', '## FORMAT', '## EXCEPTIONS', '## OVERRIDES', '## REMINDERS'];

export type PLine = {num: string; text: string; tone: 0 | 1 | 2 | 3}; // 0 dim, 1 normal, 2 header, 3 bright
const CHARS = 82;

const wrap = (s: string, n: number) => {
  const words = s.split(' ');
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > n) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) out.push(cur);
  return out;
};

const faceCache = new Map<number, PLine[]>();
/** A long deterministic stream of prompt lines for one monolith face. */
export const faceLines = (face: number, count: number): PLine[] => {
  const hit = faceCache.get(face * 100000 + count);
  if (hit) return hit;
  const out: PLine[] = [];
  let rule = 1 + Math.floor(h01(face, 1) * 40) * 10;
  let i = 0;
  while (out.length < count) {
    i++;
    if (h01(face * 31 + i, 2) < 0.075) {
      out.push({num: '', text: '', tone: 0});
      out.push({num: '', text: `${HEADERS[Math.floor(h01(face * 7 + i, 3) * HEADERS.length)]}  —  overrides §${Math.floor(h01(i, face) * 40) + 2} unless §${Math.floor(h01(face, i) * 60) + 3} applies`, tone: 2});
      continue;
    }
    // a paragraph: 1–3 rules joined
    const n = 1 + Math.floor(h01(face * 13 + i, 4) * 3);
    let para = '';
    for (let k = 0; k < n; k++) para += (k ? ' ' : '') + RULES[Math.floor(h01(face * 17 + i * 5 + k, 5) * RULES.length)];
    const lines = wrap(para, CHARS);
    const tone: 0 | 1 | 3 = h01(face * 3 + i, 6) < 0.12 ? 3 : h01(face * 5 + i, 7) < 0.3 ? 0 : 1;
    lines.forEach((l, j) => out.push({num: j === 0 ? `${Math.floor(rule / 10)}.${rule % 10}` : '', text: l, tone}));
    rule += 1 + Math.floor(h01(i, 8) * 3);
  }
  out.length = count;
  faceCache.set(face * 100000 + count, out);
  return out;
};

/* ------------------------------------------------------------------ */
/* The monolith                                                         */
/* ------------------------------------------------------------------ */
export const MONO_G = {
  zFront: -1500,
  half: 800, // half width (square pillar 1600 × 1600)
  top: -7200,
  lineH: 38,
  linesPerSeg: 27,
  segs: 8,
};
export const SEG_H = MONO_G.lineH * MONO_G.linesPerSeg; // 1026
const SEG_OVER = 3; // segments overlap slightly (no seams)
export const MONO_BOTTOM = MONO_G.top + SEG_H * MONO_G.segs; // 1008

const GLYPH_NOISE = '█▓▒░#%&@/<>{}[]01';

export type MonolithLook = {
  /** world y of the ignition front: lines BELOW it (y > wave) are lit. +Infinity = all dark, -Infinity = all lit. */
  wave: number;
  /** 0..1 corruption: line shifts, block glyphs, cyan/magenta tears */
  corrupt?: number;
  /** global brightness multiplier */
  glow?: number;
  /** text scroll speed (lines per frame) */
  scroll?: number;
  /** scene frame (scroll, flicker) */
  t: number;
};

type Face = {id: number; n: V3; c: (y: number) => V3; ry: number; rx?: number};
const FACES: Face[] = [
  {id: 0, n: [0, 0, 1], c: (y) => [0, y, MONO_G.zFront], ry: 0},
  {id: 1, n: [1, 0, 0], c: (y) => [MONO_G.half, y, MONO_G.zFront - MONO_G.half], ry: 90},
  {id: 2, n: [-1, 0, 0], c: (y) => [-MONO_G.half, y, MONO_G.zFront - MONO_G.half], ry: -90},
];

const toneColor = (tone: number) => (tone === 2 ? [234, 228, 255] : tone === 3 ? [246, 243, 255] : tone === 0 ? [138, 128, 168] : [184, 174, 214]);

const Segment: React.FC<{face: number; seg: number; look: MonolithLook; topY: number}> = ({face, seg, look, topY}) => {
  const {wave, corrupt = 0, glow = 1, scroll = 0, t} = look;
  const L = MONO_G.lineH;
  const N = MONO_G.linesPerSeg;
  const all = faceLines(face, N * MONO_G.segs + 8);
  const sc = t * scroll;
  const off = Math.floor(sc);
  const sub = (sc - off) * L;
  const step = Math.floor(t / 2);
  const W = MONO_G.half * 2;
  const lines: React.ReactNode[] = [];
  for (let i = 0; i < N + 1; i++) {
    const idx = (seg * N + i + off) % all.length;
    const ln = all[idx];
    if (!ln.text) continue;
    const y = i * L - sub;
    const wy = topY + y + L / 2; // world y of this line
    // ignition: dark above the front, a hot band at the front, settling to a steady glow below
    const dist = wy - wave; // >0 = lit (below the front)
    let a: number;
    if (dist < -50) a = 0.07;
    else if (dist < 0) a = lerp(0.07, 1, (dist + 50) / 50);
    else a = 0.66 + 0.34 * Math.exp(-dist / 320);
    const base = toneColor(ln.tone);
    const toneA = ln.tone === 0 ? 0.6 : ln.tone === 1 ? 0.85 : 1;
    let alpha = Math.min(1, a * toneA * glow);
    let color = `rgba(${base[0]},${base[1]},${base[2]},${alpha.toFixed(3)})`;
    let text = ln.text;
    let dx = 0;
    if (corrupt > 0.01) {
      const r = h01(step * 13 + idx * 7, face + 1);
      if (r < corrupt * 0.42) {
        dx = (h01(idx, step) - 0.5) * 360 * corrupt;
        const r2 = h01(idx * 3, step + 9);
        if (r2 < 0.33) color = `rgba(127,231,255,${Math.min(1, alpha * 1.6).toFixed(3)})`;
        else if (r2 < 0.6) color = `rgba(255,79,163,${Math.min(1, alpha * 1.6).toFixed(3)})`;
        if (h01(idx * 5, step) < 0.6) {
          const a0 = Math.floor(h01(idx, step + 3) * text.length * 0.7);
          const len = 6 + Math.floor(h01(idx, step + 4) * 26);
          let noise = '';
          for (let q = 0; q < len; q++) noise += GLYPH_NOISE[Math.floor(h01(q + idx, step + q) * GLYPH_NOISE.length)];
          text = text.slice(0, a0) + noise + text.slice(a0 + len);
        }
      }
    }
    lines.push(
      <div key={i} style={{position: 'absolute', left: 64 + dx, top: y, whiteSpace: 'pre', color}}>
        <span style={{color: `rgba(140,130,170,${(alpha * 0.6).toFixed(3)})`, display: 'inline-block', width: 104}}>{ln.num}</span>
        {text}
      </div>,
    );
  }
  // front band (scan light)
  const fl = wave - topY;
  const band = fl > -60 && fl < SEG_H + 60;
  const litFrac = clamp((SEG_H - fl) / SEG_H); // share of this segment below the front
  const mid = litFrac > 0.5 ? '#16102A' : '#0D0A17';
  return (
    <div style={{width: W, height: SEG_H + SEG_OVER, position: 'relative', overflow: 'hidden', fontFamily: MONO, fontSize: 26, lineHeight: `${L}px`,
      background: `linear-gradient(90deg, #05030A 0%, #0B0814 14%, ${mid} 50%, #0B0814 86%, #05030A 100%)`}}>
      {litFrac > 0.01 && <div style={{position: 'absolute', left: 0, right: 0, top: Math.max(0, fl), bottom: 0, background: `radial-gradient(80% 120% at 50% ${fl > 0 ? '0%' : '50%'}, rgba(150,120,255,${(0.10 * glow).toFixed(3)}) 0%, rgba(150,120,255,${(0.04 * glow).toFixed(3)}) 70%, rgba(150,120,255,0.02) 100%)`}} />}
      {lines}
      {band && (
        <>
          <div style={{position: 'absolute', left: 0, right: 0, top: fl - 160, height: 160, background: 'linear-gradient(180deg, rgba(205,187,255,0) 0%, rgba(205,187,255,0.10) 100%)'}} />
          <div style={{position: 'absolute', left: 0, right: 0, top: fl - 2, height: 4, background: 'linear-gradient(90deg, rgba(205,187,255,0.2), rgba(255,255,255,0.95) 30%, rgba(191,244,255,0.95) 70%, rgba(205,187,255,0.2))'}} />
          <div style={{position: 'absolute', left: 0, right: 0, top: fl + 2, height: 220, background: 'linear-gradient(180deg, rgba(205,187,255,0.16) 0%, rgba(205,187,255,0) 100%)'}} />
        </>
      )}
      {/* edge rim light */}
      <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'linear-gradient(180deg, rgba(225,214,255,0.85), rgba(205,187,255,0.45))'}} />
      <div style={{position: 'absolute', left: 4, top: 0, bottom: 0, width: 60, background: 'linear-gradient(90deg, rgba(205,187,255,0.10), rgba(205,187,255,0))'}} />
      <div style={{position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, background: 'linear-gradient(180deg, rgba(191,244,255,0.8), rgba(205,187,255,0.4))'}} />
      <div style={{position: 'absolute', right: 4, top: 0, bottom: 0, width: 60, background: 'linear-gradient(270deg, rgba(191,244,255,0.08), rgba(191,244,255,0))'}} />
    </div>
  );
};

/** Frustum test for a quad (world corners): false when it is surely off-screen. */
const quadOnScreen = (cam: ResolvedCam, corners: V3[], margin = 80) => {
  const ps = corners.map((c) => project(cam, c));
  const vis = ps.filter((p) => p.visible);
  if (!vis.length) return false;
  if (vis.length < ps.length) return true; // straddles the lens plane: keep
  if (ps.every((p) => p.x < -margin) || ps.every((p) => p.x > 1920 + margin) || ps.every((p) => p.y < -margin) || ps.every((p) => p.y > 1080 + margin)) return false;
  return true;
};

/** The colossal prompt monolith: a square pillar of prompt text (front/right/left faces + top cap). Faces facing away
 *  from the camera and segments outside the frame are culled (big text planes are the expensive part). */
export const Monolith: React.FC<{cam: ResolvedCam; look: MonolithLook; faces?: number[]; cap?: boolean; fog?: boolean}> = ({cam, look, faces = [0, 1, 2], cap = true, fog = true}) => {
  const out: React.ReactNode[] = [];
  const H = MONO_G.half;
  for (const F of FACES) {
    if (!faces.includes(F.id)) continue;
    const c0 = F.c(0);
    const toCam: V3 = [cam.pos[0] - c0[0], 0, cam.pos[2] - c0[2]];
    if (F.n[0] * toCam[0] + F.n[2] * toCam[2] <= 0) continue; // back face
    for (let s = 0; s < MONO_G.segs; s++) {
      const topY = MONO_G.top + s * SEG_H;
      const cy = topY + SEG_H / 2;
      const c = F.c(cy);
      const tx: V3 = F.id === 0 ? [1, 0, 0] : F.id === 1 ? [0, 0, -1] : [0, 0, 1];
      const corners: V3[] = [
        [c[0] - tx[0] * H, topY, c[2] - tx[2] * H], [c[0] + tx[0] * H, topY, c[2] + tx[2] * H],
        [c[0] - tx[0] * H, topY + SEG_H, c[2] - tx[2] * H], [c[0] + tx[0] * H, topY + SEG_H, c[2] + tx[2] * H],
      ];
      if (!quadOnScreen(cam, corners)) continue;
      // LOD: Chromium rasterises 3D layers at ~local 1×, so far segments are painted at ½ or ¼ resolution
      // (2D-scaled into a smaller layer, then scaled back up in 3D) — identical on screen, far less raster work.
      const ps = corners.map((q) => project(cam, q));
      const near = ps.some((q) => !q.visible);
      const sc = near ? 9 : Math.max(...ps.map((q) => q.scale));
      const k = sc >= 0.5 ? 1 : sc >= 0.22 ? 0.5 : 0.25;
      const SW = H * 2, SH = SEG_H + SEG_OVER;
      out.push(
        <Obj key={`f${F.id}s${s}`} x={c[0]} y={c[1] + SEG_OVER / 2} z={c[2]} ry={F.ry} w={SW * k} h={SH * k} s={1 / k} style={{backfaceVisibility: 'hidden'}}>
          {k === 1 ? <Segment face={F.id} seg={s} look={look} topY={topY} /> : (
            <div style={{width: SW * k, height: SH * k, overflow: 'hidden', position: 'relative'}}>
              <div style={{position: 'absolute', left: 0, top: 0, width: SW, height: SH, transform: `scale(${k})`, transformOrigin: '0 0'}}>
                <Segment face={F.id} seg={s} look={look} topY={topY} />
              </div>
            </div>
          )}
          {s === MONO_G.segs - 1 && fog ? <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(4,2,10,0) 0%, rgba(4,2,10,0.75) 55%, rgba(4,2,10,1) 100%)'}} /> : null}
        </Obj>,
      );
    }
  }
  if (cap && cam.pos[1] < MONO_G.top) {
    // top cap (visible from above): dark slab with a faint lit rim and a few glowing glyph rows
    const cc: V3 = [0, MONO_G.top, MONO_G.zFront - H];
    out.push(
      <Obj key="cap" x={cc[0]} y={cc[1]} z={cc[2]} rx={90} w={H * 2} h={H * 2}>
        <div style={{width: H * 2, height: H * 2, background: 'radial-gradient(70% 70% at 50% 50%, #120D20 0%, #08060F 70%, #050309 100%)', boxShadow: 'inset 0 0 0 3px rgba(205,187,255,0.5), inset 0 0 80px rgba(140,107,234,0.25)'}} />
      </Obj>,
    );
  }
  return <>{out}</>;
};

/* ------------------------------------------------------------------ */
/* Macro rig: large native text lines, one Obj per line (per-line DOF)  */
/* ------------------------------------------------------------------ */
export type MLine = {n: string; text: string; tone: 'dim' | 'norm' | 'head' | 'key' | 'conflict'};
export const MACRO: MLine[] = [
  {n: '4108', text: 'Use emojis sparingly. Be warm. Be professional. Be fun.', tone: 'dim'},
  {n: '4109', text: 'Respond in the user’s language. Default to English.', tone: 'norm'},
  {n: '', text: '## PRICING  —  overrides §12 unless §31 applies', tone: 'head'},
  {n: '4110', text: 'If the user asks about pricing, answer briefly unless', tone: 'norm'},
  {n: '', text: 'they seem frustrated, in which case apologize first.', tone: 'norm'},
  {n: '4111', text: 'Do not discuss pricing before the user has booked.', tone: 'conflict'},
  {n: '4112', text: 'Offer a discount only if the user is eligible.', tone: 'dim'},
  {n: '', text: '## BOOKING', tone: 'head'},
  {n: '4113', text: 'If the user wants to book, collect name and email.', tone: 'norm'},
  {n: '4114', text: 'Keep every answer under 40 words.', tone: 'key'},
  {n: '4115', text: 'Explain every detail thoroughly.', tone: 'conflict'},
  {n: '4116', text: 'Never mention the booking tool by name.', tone: 'dim'},
  {n: '4117', text: 'When in doubt, follow rule 7.2 — unless rule 31 applies.', tone: 'norm'},
  {n: '4118', text: 'Do not hallucinate. Never promise what you cannot do.', tone: 'dim'},
];
export const MACRO_LH = 92; // world px between lines
export const MACRO_FS = 50;
/** World position of macro line i (left edge x, centre y). */
export const macroPos = (i: number, x0 = 0): V3 => [x0, (i - MACRO.length / 2) * MACRO_LH, 0];

export const MacroLines: React.FC<{t: number; x0?: number; corrupt?: number; nearFade?: [number, number];
  /** line index in focus (fractional ok); others blur by index distance */
  focus?: number; maxBlur?: number;
  /** per-line amber highlight progress */
  hlMap?: Record<number, number>}> = ({t, x0 = 0, corrupt = 0, nearFade, focus, maxBlur = 14, hlMap = {}}) => {
  const W = 1960;
  const step = Math.floor(t / 2);
  return (
    <>
      {MACRO.map((ln, i) => {
        const p = macroPos(i, x0);
        const isConf = ln.tone === 'conflict';
        const hl = hlMap[i] ?? 0;
        const col = ln.tone === 'head' ? '#E4DCFF' : ln.tone === 'key' ? '#F2EEFF' : ln.tone === 'dim' ? 'rgba(150,140,180,0.62)' : isConf ? (hl > 0.01 ? `rgb(${Math.round(lerp(196, 255, hl))},${Math.round(lerp(186, 214, hl))},${Math.round(lerp(226, 150, hl))})` : 'rgba(196,186,226,0.9)') : 'rgba(186,176,214,0.86)';
        let text = ln.text;
        let dx = 0;
        let c2 = col;
        if (corrupt > 0.01 && h01(step * 11 + i, 3) < corrupt * 0.6) {
          dx = (h01(i, step) - 0.5) * 220 * corrupt;
          const a0 = Math.floor(h01(i, step + 2) * text.length * 0.6);
          const len = 4 + Math.floor(h01(i, step + 5) * 14);
          let noise = '';
          for (let q = 0; q < len; q++) noise += GLYPH_NOISE[Math.floor(h01(q + i * 3, step + q) * GLYPH_NOISE.length)];
          text = text.slice(0, a0) + noise + text.slice(a0 + len);
          c2 = h01(i * 7, step) < 0.5 ? '#7FE7FF' : '#FF4FA3';
        }
        const blur = focus === undefined ? 0 : Math.min(maxBlur, Math.pow(Math.abs(i - focus), 1.25) * 2.6);
        return (
          <Obj key={i} x={p[0] + W / 2} y={p[1]} z={p[2]} w={W} h={MACRO_LH} nearFade={nearFade} blur={blur} dof={false}>
            <div style={{width: W, height: MACRO_LH, position: 'relative', fontFamily: MONO, fontSize: MACRO_FS, lineHeight: `${MACRO_LH}px`, whiteSpace: 'pre'}}>
              {hl > 0.01 && (
                <div style={{position: 'absolute', left: 156, top: 14, height: MACRO_LH - 28, width: (ln.text.length * MACRO_FS * 0.602 + 36) * easeOutExpo(hl), borderRadius: 8,
                  background: 'linear-gradient(90deg, rgba(236,175,66,0.34), rgba(236,175,66,0.12))', boxShadow: '0 0 40px rgba(236,175,66,0.22)'}} />
              )}
              <div style={{position: 'absolute', left: dx, top: 0, color: c2}}>
                <span style={{display: 'inline-block', width: 170, color: 'rgba(120,112,145,0.7)'}}>{ln.n}</span>
                {text}
              </div>
            </div>
          </Obj>
        );
      })}
    </>
  );
};
