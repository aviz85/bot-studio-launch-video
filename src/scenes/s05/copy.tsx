// s05 · States — headline typography and HUD garnish (screen space, GLOBAL frame driven).
import React from 'react';
import {DISPLAY, FONT, MONO, clamp} from '../../lib';

const eOut = (u: number) => 1 - Math.pow(1 - clamp(u), 4);
const eIn = (u: number) => Math.pow(clamp(u), 3);

export type Word = {text: string; at: number};

/** Big statement: per-word mask rise + blur + tracking-in, gradient chrome fill, light sweep, staggered exit. */
export const Headline: React.FC<{
  f: number; words: Word[]; out: number; kicker?: string; kickerAt?: number;
  x?: number; y?: number; size?: number; align?: 'left' | 'right';
}> = ({f, words, out, kicker, kickerAt, x = 120, y = 778, size = 132, align = 'left'}) => {
  const first = words[0].at;
  if (f < (kickerAt ?? first) - 2 || f > out + 16) return null;
  const sweep = clamp((f - words[words.length - 1].at - 4) / 30);
  const ko = kicker ? eOut((f - (kickerAt ?? first)) / 12) * (1 - eIn((f - out) / 10)) : 0;
  return (
    <div style={{position: 'absolute', left: align === 'left' ? x : undefined, right: align === 'right' ? 1920 - x : undefined, top: y, pointerEvents: 'none'}}>
      {/* soft scrim for legibility over light trails */}
      <div style={{position: 'absolute', left: -240, top: -120, width: 1500, height: 420, background: 'radial-gradient(50% 50% at 40% 55%, rgba(4,2,10,0.62), rgba(4,2,10,0) 100%)', opacity: Math.min(1, ko + 0.3)}} />
      {kicker && (
        <div style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6, opacity: ko, transform: `translateX(${(-24 * (1 - ko)).toFixed(1)}px)`}}>
          <div style={{width: 10, height: 10, borderRadius: 5, background: '#7FE7FF', boxShadow: '0 0 12px 2px rgba(127,231,255,0.8)'}} />
          <div style={{fontFamily: FONT, fontWeight: 600, fontSize: 19, letterSpacing: '0.34em', textTransform: 'uppercase', color: '#BFF4FF'}}>{kicker}</div>
          <div style={{width: 160 * ko, height: 1.5, background: 'linear-gradient(90deg, rgba(127,231,255,0.8), rgba(127,231,255,0))'}} />
        </div>
      )}
      <div style={{position: 'relative', display: 'flex', gap: size * 0.24, whiteSpace: 'nowrap', fontFamily: DISPLAY, fontWeight: 900, fontSize: size, lineHeight: 1.08}}>
        {words.map((w, i) => {
          const u = eOut((f - w.at) / 16);
          if (f < w.at) return <span key={i} style={{opacity: 0}}>{w.text}</span>;
          const xo = eIn((f - out - i * 2) / 9);
          const blur = 10 * (1 - eOut((f - w.at) / 10)) + 12 * xo;
          const track = -0.045 + 0.09 * (1 - u);
          return (
            <span key={i} style={{display: 'inline-block', overflow: 'hidden', padding: `0 ${size * 0.06}px ${size * 0.12}px`, margin: `0 ${-size * 0.06}px ${-size * 0.12}px`}}>
              <span style={{
                display: 'inline-block',
                transform: `translateY(${((1 - u) * 92 - xo * 70).toFixed(2)}%)`,
                letterSpacing: `${track.toFixed(4)}em`,
                opacity: (0.2 + 0.8 * u) * (1 - xo),
                filter: blur > 0.4 ? `blur(${blur.toFixed(2)}px)` : undefined,
                backgroundImage: `linear-gradient(100deg, rgba(255,255,255,0) ${(sweep * 140 - 30).toFixed(1)}%, rgba(255,255,255,0.95) ${(sweep * 140 - 18).toFixed(1)}%, rgba(255,255,255,0) ${(sweep * 140 - 6).toFixed(1)}%), linear-gradient(96deg, #FFFFFF 0%, #F1EAFF 34%, #CDBBFF 70%, #E7F4B9 104%)`,
                WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
              }}>{w.text}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

/** Top-left HUD block: label + live counters. */
export const GraphHud: React.FC<{f: number; start: number; end: number; nodes: number; edges: number; mode?: string}> = ({f, start, end, nodes, edges, mode = 'Map'}) => {
  const o = eOut((f - start) / 14) * (1 - eIn((f - end) / 8));
  if (o <= 0.01) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <div style={{position: 'absolute', left: 120, top: 128, fontFamily: FONT, color: '#E9E1FF', opacity: o}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
        <div style={{width: 18, height: 18, border: '1.5px solid rgba(127,231,255,0.9)', borderRadius: 4, position: 'relative'}}>
          <div style={{position: 'absolute', inset: 4, background: '#7FE7FF', borderRadius: 1, boxShadow: '0 0 8px #7FE7FF'}} />
        </div>
        <div style={{fontWeight: 600, fontSize: 17, letterSpacing: '0.32em', textTransform: 'uppercase'}}>States · {mode}</div>
      </div>
      <div style={{marginTop: 10, display: 'flex', gap: 22, fontFamily: MONO, fontSize: 16, color: 'rgba(191,244,255,0.85)'}}>
        <span>NODES <b style={{color: '#fff'}}>{pad(nodes)}</b></span>
        <span>EDGES <b style={{color: '#fff'}}>{pad(edges)}</b></span>
        <span style={{color: 'rgba(205,187,255,0.7)'}}>F {String(f).padStart(5, '0')}</span>
      </div>
      <div style={{marginTop: 10, width: 300, height: 1, background: 'linear-gradient(90deg, rgba(205,187,255,0.6), rgba(205,187,255,0))'}} />
    </div>
  );
};

/** "Current state ▸ xxx" product-truth readout (from the Try-your-bot panel), top-left HUD slot. */
export const CurrentState: React.FC<{f: number; start: number; end: number; id: string; changedAt: number}> = ({f, start, end, id, changedAt}) => {
  const o = eOut((f - start) / 12) * (1 - eIn((f - end) / 8));
  if (o <= 0.01) return null;
  const k = Math.exp(-Math.max(0, f - changedAt) / 7);
  return (
    <div style={{position: 'absolute', left: 120, top: 132, display: 'flex', alignItems: 'center', gap: 16, opacity: o, fontFamily: FONT, padding: '10px 18px 10px 0', background: 'linear-gradient(90deg, rgba(4,2,10,0.55), rgba(4,2,10,0))'}}>
      <div style={{fontWeight: 600, fontSize: 18, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(205,187,255,0.9)'}}>Current state</div>
      <div style={{
        padding: '9px 22px 10px', borderRadius: 999, fontFamily: MONO, fontSize: 26, fontWeight: 700, color: '#0B0618',
        background: `linear-gradient(180deg, rgba(${Math.round(231 + 24 * k)},${Math.round(244 + 11 * k)},${Math.round(185 + 70 * k)},1), rgba(205,230,160,1))`,
        boxShadow: `0 0 ${(18 + 40 * k).toFixed(1)}px rgba(231,244,185,${(0.45 + 0.4 * k).toFixed(3)}), inset 0 1px 0 rgba(255,255,255,0.8)`,
        transform: `scale(${(1 + 0.08 * k).toFixed(3)})`, transformOrigin: 'left center',
      }}>{id}</div>
    </div>
  );
};

/** Bold lock-on reticle for a moving target (screen px). Brackets converge from oversized + rotated, flash on
 *  lock, a dashed ring spins, and a tag reads the state. Size is clamped so it stays a HUD element. */
export const LockReticle: React.FC<{f: number; at: number; x: number; y: number; r: number; label: string; value: string; end?: number; color?: string; accent?: string}> = ({f, at, x, y, r, label, value, end, color = '127,231,255', accent = '231,244,185'}) => {
  const d = f - at;
  if (d < 0) return null;
  const out = end !== undefined ? clamp((f - end) / 6) : 0;
  if (out >= 1) return null;
  const lock = eOut(d / 9);
  const rr = clamp(r, 70, 300) * (1 + 0.6 * (1 - lock));
  const rot = 45 * (1 - lock);
  const o = clamp(d / 3) * (1 - out);
  const blink = d > 9 && d < 16 ? (Math.floor(d / 2) % 2 ? 0.45 : 1) : 1;
  const L = rr * 0.42;
  const flash = Math.exp(-Math.max(0, d - 8) / 4) * (d >= 8 ? 1 : 0);
  const br = (sx: number, sy: number, k: number) => (
    <path key={k} d={`M${sx * rr} ${sy * (rr - L)} L${sx * rr} ${sy * rr} L${sx * (rr - L)} ${sy * rr}`} fill="none" stroke={`rgb(${color})`} strokeWidth={4} strokeLinecap="square" />
  );
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, opacity: o * blink, pointerEvents: 'none'}}>
      {/* svg sized to the reticle so the glow filter only covers its own bounds */}
      <svg width={2 * (rr * 1.45 + 40)} height={2 * (rr * 1.45 + 40)} style={{position: 'absolute', left: x - rr * 1.45 - 40, top: y - rr * 1.45 - 40, overflow: 'visible', filter: `drop-shadow(0 0 6px rgba(${color},0.9))`}}>
        <g transform={`translate(${(rr * 1.45 + 40).toFixed(1)} ${(rr * 1.45 + 40).toFixed(1)}) rotate(${rot.toFixed(2)})`}>
          {br(-1, -1, 0)}{br(1, -1, 1)}{br(1, 1, 2)}{br(-1, 1, 3)}
          <circle r={rr * 0.86} fill="none" stroke={`rgba(${color},0.55)`} strokeWidth={1.5} strokeDasharray="6 10" transform={`rotate(${(f * 2.4).toFixed(1)})`} />
          <path d={`M${-rr - 26} 0 H${-rr - 8} M${rr + 8} 0 H${rr + 26} M0 ${-rr - 26} V${-rr - 8} M0 ${rr + 8} V${rr + 26}`} stroke={`rgba(${color},0.9)`} strokeWidth={2} />
          {flash > 0.02 && <circle r={rr * 0.95} fill="none" stroke={`rgba(255,255,255,${(0.9 * flash).toFixed(3)})`} strokeWidth={6 * flash + 1} />}
        </g>
      </svg>
      <div style={{position: 'absolute', left: x + rr * 0.72, top: y - rr - 50, display: 'flex', alignItems: 'stretch', fontFamily: MONO, fontSize: 19, fontWeight: 700, whiteSpace: 'nowrap', opacity: clamp((d - 6) / 5), transform: `translateX(${(16 * (1 - lock)).toFixed(1)}px)`}}>
        <div style={{padding: '6px 12px', background: `rgb(${accent})`, color: '#0B0618', letterSpacing: '0.08em'}}>{value}</div>
        <div style={{padding: '6px 14px', background: 'rgba(8,4,20,0.78)', color: `rgb(${color})`, boxShadow: `inset 0 0 0 1.5px rgba(${color},0.8)`}}>{label}</div>
      </div>
    </div>
  );
};
