/* HUD garnish: frame brackets + labels + timecode, target-lock reticle, data tickers. */
import React from 'react';
import {DURATION, FONT, MONO} from '../lib';
import {VC, clamp01, colorOf, easeOutExpo, full, hash2, lin, mix, rgba, useF} from './util';

const lbl: React.CSSProperties = {fontFamily: FONT, fontWeight: 600, fontSize: 13, letterSpacing: '0.3em', textTransform: 'uppercase', whiteSpace: 'nowrap', lineHeight: 1};
const mono: React.CSSProperties = {fontFamily: MONO, fontSize: 13, letterSpacing: '0.06em', whiteSpace: 'nowrap', lineHeight: 1};

/** "hh:mm:ss:ff" at 60 fps. */
export const timecode = (frame: number, fps = 60) => {
  const fr = Math.max(0, Math.floor(frame));
  const ff = fr % fps, s = Math.floor(fr / fps);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}:${p(ff)}`;
};
/** Reveal text progressively (typewriter) with a scrambled leading edge. */
export const typeOn = (text: string, p: number, f = 0, scramble = 2) => {
  const n = Math.floor(clamp01(p) * text.length);
  if (n >= text.length) return text;
  const pool = 'ABCDEF0123456789#/<>_';
  let out = text.slice(0, n);
  for (let i = 0; i < scramble && n + i < text.length; i++) out += text[n + i] === ' ' ? ' ' : pool[Math.floor(hash2(f, n + i) * pool.length)];
  return out;
};

/* ======================================================================
 * HUDFrame
 * ==================================================================== */
export type HUDFrameProps = {
  /** Appear frame (lines draw in, labels type on). */
  start?: number;
  /** Disappear frame (optional). */
  end?: number;
  /** Horizontal / vertical inset of the frame from the edges (px). Default clears a 70px letterbox. */
  insetX?: number;
  insetY?: number;
  color?: string;
  accent?: string;
  /** Top-left label. */
  title?: string;
  /** Top-right label (before the REC/timecode). */
  subtitle?: string;
  /** Bottom-left label. */
  footer?: string;
  /** Show REC dot + timecode + frame counter. */
  readout?: boolean;
  /** Global frame offset (scene `from`) so the timecode reads film time. */
  from?: number;
  opacity?: number;
  frame?: number;
};

/** Cinematic HUD overlay: corner brackets, thin tick rules, tiny tracked-out labels, REC + timecode + frame readout. */
export const HUDFrame: React.FC<HUDFrameProps> = ({
  start = 0, end, insetX = 64, insetY = 92, color, accent, title = 'Bot Studio // Live', subtitle = 'Runtime · Signals', footer = 'Judge · Speaker · Clerk', readout = true, from = 0, opacity = 1, frame,
}) => {
  const f = useF(frame);
  const col = colorOf(color, VC.lilac);
  const acc = colorOf(accent, VC.cyan);
  const p = easeOutExpo(lin(f, start, 30));
  const o = (end !== undefined ? 1 - lin(f, end - 12, 12) : 1) * opacity * clamp01(lin(f, start, 6) * 1.5);
  if (o <= 0.003) return null;
  const arm = 46 * p;
  const gf = f + from;
  const tp = lin(f, start + 8, 26);
  const lineCol = rgba(col, 0.55);
  const corners: [number, number, number, number][] = [[insetX, insetY, 1, 1], [1920 - insetX, insetY, -1, 1], [insetX, 1080 - insetY, 1, -1], [1920 - insetX, 1080 - insetY, -1, -1]];
  const ruleW = (1920 - insetX * 2 - 140) * p;
  return (
    <div style={{...full, opacity: o, color: col}}>
      {corners.map(([cx, cy, sx, sy], i) => (
        <React.Fragment key={i}>
          <div style={{position: 'absolute', left: sx > 0 ? cx : cx - arm, top: cy - 1, width: arm, height: 2, background: `linear-gradient(${sx > 0 ? 90 : 270}deg, ${rgba('#fff', 0.95)}, ${rgba(col, 0.6)})`, boxShadow: `0 0 10px ${rgba(col, 0.6)}`}} />
          <div style={{position: 'absolute', left: cx - 1, top: sy > 0 ? cy : cy - arm, width: 2, height: arm, background: `linear-gradient(${sy > 0 ? 180 : 0}deg, ${rgba('#fff', 0.95)}, ${rgba(col, 0.6)})`, boxShadow: `0 0 10px ${rgba(col, 0.6)}`}} />
          <div style={{position: 'absolute', left: cx + sx * 10 - 2, top: cy + sy * 10 - 2, width: 4, height: 4, background: i === 0 ? acc : rgba(col, 0.8), opacity: p}} />
        </React.Fragment>
      ))}
      {/* top + bottom tick rules */}
      {[insetY, 1080 - insetY].map((yy, i) => (
        <React.Fragment key={i}>
          <div style={{position: 'absolute', left: 960 - ruleW / 2, top: yy, width: ruleW, height: 1, background: `linear-gradient(90deg, transparent, ${lineCol} 20%, ${lineCol} 80%, transparent)`, opacity: 0.6}} />
          <div style={{position: 'absolute', left: 960 - ruleW * 0.3, top: i === 0 ? yy + 1 : yy - 6, width: ruleW * 0.6, height: 5, opacity: 0.45,
            background: `repeating-linear-gradient(90deg, ${rgba(col, 0.8)} 0px, ${rgba(col, 0.8)} 1px, transparent 1px, transparent 24px)`,
            maskImage: 'linear-gradient(90deg, transparent, black 30%, black 70%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, black 30%, black 70%, transparent)'}} />
        </React.Fragment>
      ))}
      {/* side scale */}
      <div style={{position: 'absolute', left: insetX - 1, top: 540 - 160 * p, width: 8, height: 320 * p, opacity: 0.5,
        background: `repeating-linear-gradient(180deg, ${rgba(col, 0.9)} 0px, ${rgba(col, 0.9)} 1px, transparent 1px, transparent 16px)`}} />
      <div style={{position: 'absolute', left: insetX - 1, top: 539, width: 18 * p, height: 2, background: acc, opacity: 0.9}} />
      {/* labels */}
      <div style={{...lbl, position: 'absolute', left: insetX + 22, top: insetY + 18, color: '#fff', opacity: 0.85}}>
        <span style={{color: acc}}>●</span>&nbsp;&nbsp;{typeOn(title, tp, f)}
      </div>
      <div style={{...lbl, position: 'absolute', right: insetX + 22, top: insetY + 18, opacity: 0.75, textAlign: 'right'}}>{typeOn(subtitle, tp, f + 3)}</div>
      {footer && <div style={{...lbl, position: 'absolute', left: insetX + 22, bottom: insetY + 18, opacity: 0.6}}>{typeOn(footer, lin(f, start + 14, 26), f + 5)}</div>}
      {readout && (
        <>
          <div style={{...mono, position: 'absolute', right: insetX + 22, bottom: insetY + 18, opacity: 0.8 * clamp01(tp * 2), textAlign: 'right'}}>
            <span style={{color: '#FF5E7E', opacity: Math.floor(gf / 30) % 2 ? 1 : 0.25}}>●</span>&nbsp; REC&nbsp;&nbsp;
            <span style={{color: '#fff'}}>TC {timecode(gf)}</span>&nbsp;&nbsp;
            <span style={{opacity: 0.6}}>F {String(Math.floor(gf)).padStart(5, '0')}/{DURATION}</span>
          </div>
          <div style={{...mono, position: 'absolute', right: insetX + 22, top: insetY + 40, opacity: 0.45 * clamp01(tp * 2), fontSize: 11}}>1920×1080 · 60 FPS · ƒ/1.4 · 35MM ANA</div>
        </>
      )}
    </div>
  );
};

/* ======================================================================
 * Reticle — target lock-on around a rect
 * ==================================================================== */
export type ReticleProps = {
  /** Target rect (px, top-left origin). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Frame the lock-on starts. */
  start: number;
  /** Frames to lock. */
  dur?: number;
  /** Frame to release (fade out). */
  end?: number;
  label?: string;
  /** Value readout shown after lock (e.g. "0.92 · PASS"). */
  value?: string;
  color?: string;
  accent?: string;
  /** Padding between rect and brackets. */
  pad?: number;
  frame?: number;
};

/** Target-lock reticle: brackets fly in rotated & oversized, converge on the rect, scan line, blink on lock, tag + value. */
export const Reticle: React.FC<ReticleProps> = ({x, y, w, h, start, dur = 26, end, label = 'Lock', value, color, accent, pad = 12, frame}) => {
  const f = useF(frame);
  if (f < start) return null;
  const col = colorOf(color, VC.cyan);
  const acc = colorOf(accent, VC.pistachio);
  const p = easeOutExpo(lin(f, start, dur));
  const locked = f >= start + dur;
  const out = end !== undefined ? lin(f, end, 10) : 0;
  if (out >= 1) return null;
  const blink = locked ? (f - start - dur < 10 ? (Math.floor((f - start - dur) / 2.5) % 2 ? 0.35 : 1) : 1) : 0.6 + 0.4 * Math.sin(f * 0.8);
  const cx = x + w / 2, cy = y + h / 2;
  const spreadPx = (1 - p) * 140;
  const rot = (1 - p) * 45;
  const L = Math.min(40, Math.min(w, h) * 0.3);
  const o = (1 - out) * clamp01(lin(f, start, 5) * 2);
  const R = Math.max(w, h) * 0.5 + 40 + (1 - p) * 120;
  const corner = (sx: number, sy: number, i: number) => {
    const bx = cx + sx * (w / 2 + pad + spreadPx), by = cy + sy * (h / 2 + pad + spreadPx);
    return (
      <div key={i} style={{position: 'absolute', left: bx, top: by, width: 0, height: 0}}>
        <div style={{position: 'absolute', left: sx > 0 ? -L : 0, top: -1, width: L, height: 2, background: col, boxShadow: `0 0 8px ${col}`}} />
        <div style={{position: 'absolute', left: -1, top: sy > 0 ? -L : 0, width: 2, height: L, background: col, boxShadow: `0 0 8px ${col}`}} />
      </div>
    );
  };
  const scanY = y + h * ((f - start) / Math.max(1, dur)) * 1;
  return (
    <div style={{...full, opacity: o * blink}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transform: `rotate(${rot}deg)`, transformOrigin: `${cx}px ${cy}px`}}>
        {corner(-1, -1, 0)}{corner(1, -1, 1)}{corner(-1, 1, 2)}{corner(1, 1, 3)}
      </div>
      {/* rotating dashed ring */}
      {!locked || f - start - dur < 30 ? (
        <svg style={{position: 'absolute', left: cx - R, top: cy - R, width: R * 2, height: R * 2, overflow: 'visible', opacity: locked ? 1 - lin(f, start + dur, 30) : 0.8}}>
          <circle cx={R} cy={R} r={R - 2} fill="none" stroke={rgba(col, 0.6)} strokeWidth={1.2} strokeDasharray="3 9" transform={`rotate(${f * 2.2} ${R} ${R})`} />
          <circle cx={R} cy={R} r={R * 0.86} fill="none" stroke={rgba(col, 0.35)} strokeWidth={1} strokeDasharray={`${R * 0.6} ${R * 0.3}`} transform={`rotate(${-f * 1.4} ${R} ${R})`} />
        </svg>
      ) : null}
      {/* crosshair ticks at mid edges */}
      {[[cx, y - pad - 14, 2, 10], [cx, y + h + pad + 4, 2, 10], [x - pad - 14, cy, 10, 2], [x + w + pad + 4, cy, 10, 2]].map(([tx, ty, tw, th], i) => (
        <div key={i} style={{position: 'absolute', left: tx - tw / 2, top: ty - th / 2, width: tw, height: th, background: col, opacity: p}} />
      ))}
      {/* scan line before lock */}
      {!locked && (
        <div style={{position: 'absolute', left: x, top: scanY, width: w, height: 2, background: `linear-gradient(90deg, transparent, ${col}, transparent)`, boxShadow: `0 0 14px ${col}`, opacity: 0.8}} />
      )}
      {/* target fill flash on lock */}
      {locked && f - start - dur < 14 && (
        <div style={{position: 'absolute', left: x - pad, top: y - pad, width: w + pad * 2, height: h + pad * 2, background: rgba(col, 0.14 * (1 - (f - start - dur) / 14)), mixBlendMode: 'screen'}} />
      )}
      {/* tag */}
      <div style={{position: 'absolute', left: x + w + pad + 18, top: y - pad - 4, display: 'flex', flexDirection: 'column', gap: 6, opacity: locked ? 1 : 0.7}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
          <div style={{width: 26 * p, height: 1, background: col}} />
          <div style={{...lbl, fontSize: 12, color: locked ? '#05020A' : col, background: locked ? col : 'transparent', padding: '5px 8px', border: `1px solid ${col}`}}>
            {locked ? '◆ ' : '◇ '}{typeOn(label, lin(f, start, dur * 0.7), f)}
          </div>
        </div>
        {value && locked && (
          <div style={{...mono, fontSize: 15, color: acc, paddingLeft: 34, textShadow: `0 0 10px ${rgba(acc, 0.7)}`}}>{typeOn(value, lin(f, start + dur, 12), f)}</div>
        )}
        <div style={{...mono, fontSize: 11, color: rgba(col, 0.7), paddingLeft: 34}}>
          X {String(Math.round(cx)).padStart(4, '0')} · Y {String(Math.round(cy)).padStart(4, '0')}
        </div>
      </div>
    </div>
  );
};

/* ======================================================================
 * DataTicker
 * ==================================================================== */
const LOG_LINES = [
  'judge.noul      wants_refund      YES   0.94',
  'judge.score     frustration       0.31  ▲0.04',
  'judge.choice    intent            booking',
  'policy.match    When refund AND verified',
  'state.enter     collect_details',
  'speaker.prompt  +chunk tone.warm',
  'clerk.extract   email   alex.morgan@…',
  'clerk.fn        book_slot()   async',
  'runtime.decide  → offer_slots',
  'signal.wall     42 signals   ok',
  'speaker.token   first   182 ms',
  'clerk.result    ✓ booked   Thu 14:30',
  'judge.noul      is_greeting       NO    0.03',
  'state.branch    escalate? no',
  'policy.global   tone: friendly',
  'botscript.sync  v12   ✓',
];
export type DataTickerProps = {
  x: number;
  y: number;
  width?: number;
  rows?: number;
  /** 'log' = scrolling runtime log, 'hex' = hex dump, 'stats' = one changing metrics line. */
  mode?: 'log' | 'hex' | 'stats';
  /** New rows per second. */
  rate?: number;
  start?: number;
  title?: string;
  color?: string;
  accent?: string;
  fontSize?: number;
  /** Custom log lines (mode 'log'). */
  lines?: string[];
  opacity?: number;
  seed?: number;
  frame?: number;
};

/** Small monospace data readout: scrolling runtime log, hex dump or live stats line. Newest row highlighted & typed on. */
export const DataTicker: React.FC<DataTickerProps> = ({x, y, width = 420, rows = 6, mode = 'log', rate = 5, start = 0, title, color, accent, fontSize = 13, lines, opacity = 1, seed = 2, frame}) => {
  const f = useF(frame);
  if (f < start) return null;
  const col = colorOf(color, VC.lilac);
  const acc = colorOf(accent, VC.cyan);
  const t = ((f - start) * rate) / 60;
  const n = Math.floor(t);
  const frac = t - n;
  const src = lines ?? LOG_LINES;
  const lh = fontSize * 1.55;
  const o = clamp01((f - start) / 8) * opacity;
  const rowText = (i: number) => {
    if (mode === 'hex') {
      let s = (i * 16).toString(16).padStart(6, '0').toUpperCase() + '  ';
      for (let b = 0; b < 8; b++) s += Math.floor(hash2(i * 8 + b, seed) * 256).toString(16).padStart(2, '0').toUpperCase() + ' ';
      return s;
    }
    return src[Math.floor(hash2(i, seed) * src.length * 0.999 + i) % src.length];
  };
  if (mode === 'stats') {
    const v = (k: number, lo: number, hi: number, d = 3) => mix(lo, hi, hash2(Math.floor(f / 6) + k * 100, seed)).toFixed(d);
    return (
      <div style={{position: 'absolute', left: x, top: y, width, opacity: o, ...mono, fontSize, color: col, display: 'flex', gap: 18}}>
        {title && <span style={{...lbl, fontSize: fontSize - 2, color: acc}}>{title}</span>}
        <span>SIG <span style={{color: '#fff'}}>{v(1, 0.6, 0.98)}</span></span>
        <span>Δ <span style={{color: acc}}>+{v(2, 0.001, 0.04)}</span></span>
        <span>LAT <span style={{color: '#fff'}}>{Math.round(+v(3, 120, 260, 0))} ms</span></span>
        <span>TOK <span style={{color: '#fff'}}>{Math.round(+v(4, 40, 90, 0))}/s</span></span>
      </div>
    );
  }
  return (
    <div style={{position: 'absolute', left: x, top: y, width, opacity: o}}>
      {title && (
        <div style={{...lbl, fontSize: fontSize - 2, color: acc, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10}}>
          <span style={{width: 6, height: 6, background: acc, display: 'inline-block', opacity: Math.floor(f / 20) % 2 ? 1 : 0.3}} />
          {title}
          <span style={{flex: 1, height: 1, background: rgba(col, 0.35)}} />
        </div>
      )}
      <div style={{position: 'relative', height: rows * lh, overflow: 'hidden', maskImage: 'linear-gradient(180deg, transparent 0%, black 30%, black 100%)', WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, black 30%, black 100%)'}}>
        <div style={{position: 'absolute', left: 0, top: 0, transform: `translateY(${(1 - easeOutExpo(Math.min(1, frac * 3))) * lh}px)`}}>
          {Array.from({length: rows}).map((_, r) => {
            const i = n - (rows - 1) + r;
            if (i < 0) return <div key={r} style={{height: lh}} />;
            const newest = r === rows - 1;
            const txt = rowText(i);
            return (
              <div key={r} style={{...mono, fontSize, height: lh, lineHeight: `${lh}px`, color: newest ? '#fff' : col, opacity: newest ? 1 : 0.35 + 0.5 * (r / rows), overflow: 'hidden', textOverflow: 'clip'}}>
                <span style={{color: newest ? acc : rgba(col, 0.6)}}>{mode === 'hex' ? '' : '› '}</span>
                {newest ? typeOn(txt, Math.min(1, frac * 2.2), f, 3) : txt}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
