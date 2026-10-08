// s06 Part A set pieces: the three role monoliths (holo smoked glass, role-tinted) and the runtime core.
import React from 'react';
import {DISPLAY, FONT, MONO, band} from '../../lib';
import {Icon} from '../../ui/kit';
import {Rim, Sheen} from '../../ui/skin';
import {SCANLINES, NOISE_URL} from '../../ui/theme';
import {EZ, clamp01, imp, pr} from './util';

export type RoleKey = 'judge' | 'speaker' | 'clerk';
export type Role = {key: RoleKey; idx: number; name: string; verb: string; icon: string; col: string; rgb: string; light: string; tag: string};
export const ROLES: Role[] = [
  {key: 'judge', idx: 1, name: 'Judge', verb: 'Measures meaning', icon: 'scale', col: '#45E3B0', rgb: '69,227,176', light: '#C9FFEC', tag: 'Noul · Score · Choice'},
  {key: 'speaker', idx: 2, name: 'Speaker', verb: 'Talks like a human', icon: 'chat', col: '#AA8CFF', rgb: '170,140,255', light: '#E9E0FF', tag: 'prompt chunks → reply'},
  {key: 'clerk', idx: 3, name: 'Clerk', verb: 'Does the real work', icon: 'gear', col: '#FFC04D', rgb: '255,192,77', light: '#FFF0C9', tag: 'fields · functions · async'},
];

export const MW = 430;
export const MH = 940;
/** local y (from monolith centre) of the emblem centre — the beam source */
export const EMBLEM_Y = -280;
/** local y of the mini-content panel centre */
export const MINI_Y = 135;

/* ------------------------------------------------------------------ */
/* Mini content                                                         */
/* ------------------------------------------------------------------ */
const BARS = [0.82, 0.56, 0.71, 0.24, 0.9, 0.44, 0.66, 0.35, 0.78];
const JudgeMini: React.FC<{t: number; f: number; land: number}> = ({t, f, land}) => (
  <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
    <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 15, color: 'rgba(201,255,236,0.75)', letterSpacing: '0.04em'}}>
      <span>LIVE SIGNALS</span>
      <span style={{color: '#45E3B0'}}>● 9</span>
    </div>
    <div style={{position: 'relative', flex: 1, display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 14, padding: '0 4px'}}>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: '62%', borderTop: '1.5px dashed rgba(69,227,176,0.5)'}} />
      <div style={{position: 'absolute', right: 0, bottom: 'calc(62% + 4px)', fontFamily: MONO, fontSize: 12, color: 'rgba(69,227,176,0.8)'}}>0.62</div>
      {BARS.map((b, i) => {
        const g = pr(t, land + 4 + i * 1.6, 16, EZ.expoOut);
        const v = Math.min(1, Math.max(0.08, b + 0.16 * Math.sin(f / 11 + i * 1.9) + 0.18 * (band(f, i % 5) - 0.4)));
        const c = v >= 0.62 ? '#45E3B0' : v < 0.3 ? '#FFC04D' : '#AA8CFF';
        return (
          <div key={i} style={{flex: 1, height: `${v * 100 * g}%`, borderRadius: 8, background: `linear-gradient(180deg, #FFFFFF 0%, ${c} 18%, ${c}55 100%)`, boxShadow: `0 0 16px ${c}AA`}} />
        );
      })}
    </div>
    <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 12, fontFamily: MONO, fontSize: 16}}>
      <span style={{color: 'rgba(230,224,255,0.75)'}}>enjoyment</span>
      <span style={{color: '#45E3B0', fontWeight: 700, textShadow: '0 0 10px rgba(69,227,176,0.8)'}}>1.7 · Score</span>
    </div>
  </div>
);

const Bubble: React.FC<{text: string; side: 'l' | 'r'; p: number; typing?: boolean; t: number}> = ({text, side, p, typing, t}) => {
  if (p <= 0) return null;
  const s = 0.6 + 0.4 * EZ.backOut(clamp01(p));
  return (
    <div style={{alignSelf: side === 'l' ? 'flex-start' : 'flex-end', maxWidth: '86%', transform: `scale(${s.toFixed(3)})`, transformOrigin: side === 'l' ? '0% 100%' : '100% 100%', opacity: clamp01(p * 2)}}>
      <div style={{
        padding: '11px 16px', borderRadius: 18, borderBottomLeftRadius: side === 'l' ? 5 : 18, borderBottomRightRadius: side === 'r' ? 5 : 18,
        fontFamily: FONT, fontSize: 17.5, lineHeight: 1.3, color: side === 'l' ? '#F3EEFF' : '#0E0818', fontWeight: 500,
        background: side === 'l' ? 'linear-gradient(160deg, rgba(170,140,255,0.36), rgba(106,69,224,0.28))' : 'linear-gradient(160deg, #F1ECFF, #CDBBFF)',
        boxShadow: side === 'l' ? 'inset 0 0 0 1.5px rgba(200,180,255,0.45), 0 0 18px rgba(170,140,255,0.35)' : '0 0 18px rgba(205,187,255,0.5)',
      }}>
        {typing ? (
          <span style={{display: 'inline-flex', gap: 6, padding: '4px 2px'}}>
            {[0, 1, 2].map((k) => <span key={k} style={{width: 8, height: 8, borderRadius: 4, background: '#E9E0FF', opacity: 0.35 + 0.65 * Math.max(0, Math.sin(t / 4 - k * 0.9))}} />)}
          </span>
        ) : text}
      </div>
    </div>
  );
};

const SpeakerMini: React.FC<{t: number; land: number}> = ({t, land}) => (
  <div style={{display: 'flex', flexDirection: 'column', gap: 10, height: '100%', justifyContent: 'flex-end'}}>
    <Bubble t={t} side="l" text="What should it help your visitors book?" p={pr(t, land + 13, 8, EZ.linear)} />
    <Bubble t={t} side="r" text="Haircuts, mostly." p={pr(t, land + 27, 8, EZ.linear)} />
    <Bubble t={t} side="l" text="Love it. Let’s set that up." typing={t < land + 50} p={pr(t, land + 40, 8, EZ.linear)} />
  </div>
);

const FIELDS: [string, string][] = [['full_name', 'Alex Morgan'], ['email', 'alex@morgan.co'], ['date', 'Thu · 3 pm']];
const ClerkMini: React.FC<{t: number; land: number}> = ({t, land}) => (
  <div style={{display: 'flex', flexDirection: 'column', gap: 10, height: '100%'}}>
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: MONO, fontSize: 15, color: 'rgba(255,240,201,0.75)', letterSpacing: '0.04em'}}>
      <span>create_lead · async</span>
      <span style={{display: 'inline-block', transform: `rotate(${(t * 6) % 360}deg)`}}><Icon.gear size={22} color="#FFC04D" sw={2.2} /></span>
    </div>
    {FIELDS.map(([k, v], i) => {
      const at = land + 13 + i * 13.5;
      const p = pr(t, at - 6, 10, EZ.expoOut);
      const ok = pr(t, at, 8, EZ.backOut);
      return (
        <div key={k} style={{display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 12, opacity: clamp01(0.25 + p), background: ok > 0 ? `rgba(255,192,77,${(0.1 + 0.12 * imp(t, at, 6)).toFixed(3)})` : 'rgba(255,255,255,0.04)', boxShadow: `inset 0 0 0 1.5px rgba(255,192,77,${(0.18 + 0.5 * ok).toFixed(3)})`}}>
          <div style={{width: 26, height: 26, borderRadius: 13, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: ok > 0 ? '#45E3B0' : 'rgba(255,255,255,0.08)', transform: `scale(${(0.5 + 0.5 * ok).toFixed(3)})`, boxShadow: ok > 0 ? '0 0 14px rgba(69,227,176,0.9)' : undefined}}>
            {ok > 0 && <Icon.check size={18} color="#0B1A14" sw={3.2} />}
          </div>
          <span style={{fontFamily: MONO, fontSize: 15.5, color: 'rgba(255,240,201,0.85)'}}>{k}</span>
          <span style={{marginLeft: 'auto', fontFamily: FONT, fontSize: 15.5, color: '#FFF6E2', fontWeight: 600, opacity: clamp01(ok * 1.5)}}>{v}</span>
        </div>
      );
    })}
  </div>
);

/* ------------------------------------------------------------------ */
/* Monolith                                                             */
/* ------------------------------------------------------------------ */
export const Monolith: React.FC<{role: Role; t: number; f: number; land: number; charge?: number; fire?: number; flash?: number; reflect?: number}> = ({role, t, f, land, charge = 0, fire = 0, flash = 0, reflect = 0.22}) => {
  const {col, rgb, light} = role;
  const I = Icon[role.icon];
  const live = 0.5 + 0.5 * Math.sin(f / 7 + role.idx);
  const em = 0.35 + 0.65 * Math.max(charge, fire);
  const sheenP = pr(t, land + 2, 26, EZ.sine);
  const nameP = pr(t, land + 1, 18, EZ.expoOut);
  const port = Math.max(charge * 0.7, fire);
  return (
    <div
      style={{
        position: 'relative', width: MW, height: MH, borderRadius: 34, fontFamily: FONT, color: '#F3EEFF',
        ...(reflect > 0 ? ({WebkitBoxReflect: `below 10px linear-gradient(to bottom, transparent 0%, transparent 55%, rgba(255,255,255,${reflect}) 100%)`} as React.CSSProperties) : {}),
      }}
    >
      {/* halo (gradient, cheap) */}
      <div style={{position: 'absolute', left: -150, right: -150, top: -120, bottom: -60, borderRadius: 200, background: `radial-gradient(closest-side, rgba(${rgb},${(0.2 + 0.25 * em + 0.35 * flash).toFixed(3)}), rgba(${rgb},0.06) 60%, transparent 100%)`, pointerEvents: 'none'}} />
      {/* glass body */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 34, overflow: 'hidden',
        background: `linear-gradient(180deg, rgba(${rgb},0.16) 0%, rgba(34,18,66,0.58) 22%, rgba(16,8,36,0.56) 64%, rgba(${rgb},0.2) 100%)`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.55), inset 0 0 60px rgba(${rgb},0.16), 0 40px 80px -30px rgba(0,0,0,0.85)`,
      }}>
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(220,235,255,0.2) 0%, rgba(220,235,255,0.04) 8%, transparent 22%)'}} />
        <div style={{position: 'absolute', inset: 0, background: `radial-gradient(120% 50% at 15% 0%, rgba(${rgb},0.25), transparent 60%)`}} />
        <div style={{position: 'absolute', inset: 0, background: SCANLINES(0.05)}} />
        <div style={{position: 'absolute', inset: 0, backgroundImage: NOISE_URL, backgroundSize: '180px 180px', opacity: 0.05}} />
        {/* vertical light seam */}
        <div style={{position: 'absolute', top: 40, bottom: 40, left: MW / 2 - 1, width: 2, background: `linear-gradient(180deg, transparent, rgba(${rgb},${(0.12 + 0.3 * port).toFixed(3)}) 30%, rgba(${rgb},${(0.2 + 0.6 * port).toFixed(3)}) 100%)`}} />
      </div>
      {/* edge light */}
      <div style={{position: 'absolute', top: 30, bottom: 30, left: 0, width: 3, borderRadius: 2, background: `linear-gradient(180deg, transparent, ${light} 30%, rgba(${rgb},0.6) 70%, transparent)`, opacity: 0.8}} />
      <div style={{position: 'absolute', top: 60, bottom: 60, right: 0, width: 2, borderRadius: 2, background: `linear-gradient(180deg, transparent, rgba(${rgb},0.7) 50%, transparent)`, opacity: 0.6}} />

      {/* content (absolute layout: EMBLEM_Y / MINI_Y are exact) */}
      <div style={{position: 'absolute', left: 34, right: 34, top: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: MONO, fontSize: 17, color: `rgba(${rgb},0.95)`, letterSpacing: '0.08em'}}>
        <span>{`0${role.idx} / 03`}</span>
        <span style={{fontFamily: FONT, fontWeight: 600, fontSize: 14, letterSpacing: '0.32em', color: 'rgba(230,224,255,0.7)'}}>MIND</span>
        <span style={{width: 10, height: 10, borderRadius: 5, background: col, boxShadow: `0 0 ${8 + 10 * live}px ${col}`, opacity: 0.6 + 0.4 * live}} />
      </div>
      <div style={{position: 'absolute', left: 34, right: 34, top: 68, height: 1.5, background: `linear-gradient(90deg, rgba(${rgb},0.8), rgba(255,255,255,0.15) 60%, transparent)`}} />
      {/* emblem */}
      <div style={{position: 'absolute', left: MW / 2 - 84, top: MH / 2 + EMBLEM_Y - 84, width: 168, height: 168, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{position: 'absolute', inset: -60, borderRadius: '50%', background: `radial-gradient(closest-side, rgba(${rgb},${(0.35 * em + 0.4 * flash).toFixed(3)}), transparent)`}} />
        <svg width={168} height={168} style={{position: 'absolute', inset: 0, transform: `rotate(${(t * 1.6 + role.idx * 40) % 360}deg)`}}>
          <circle cx={84} cy={84} r={80} fill="none" stroke={`rgba(${rgb},0.75)`} strokeWidth={2} strokeDasharray="3 9" />
          <circle cx={84} cy={84} r={80} fill="none" stroke={light} strokeWidth={3} strokeDasharray="60 443" strokeLinecap="round" />
        </svg>
        <div style={{width: 128, height: 128, borderRadius: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,${(0.5 + 0.3 * em).toFixed(3)}), rgba(${rgb},${(0.55 + 0.35 * em).toFixed(3)}) 45%, rgba(${rgb},0.2) 100%)`,
          boxShadow: `0 0 ${Math.round(30 + 50 * em)}px rgba(${rgb},${(0.5 + 0.4 * em).toFixed(3)}), inset 0 0 0 1.5px rgba(255,255,255,0.6)`}}>
          <I size={66} color="#0C0618" sw={2.3} />
        </div>
      </div>
      {/* name + verb */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 296, textAlign: 'center', fontFamily: DISPLAY, fontWeight: 900, fontSize: 96, lineHeight: 1.04, letterSpacing: `${(-0.045 + 0.06 * (1 - nameP)).toFixed(4)}em`,
        backgroundImage: `linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 40%, ${light} 70%, ${col} 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        filter: `drop-shadow(0 0 18px rgba(${rgb},0.55))`}}>{role.name}</div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 406, textAlign: 'center', fontSize: 28, fontWeight: 500, color: 'rgba(236,230,255,0.9)', letterSpacing: '-0.01em'}}>{role.verb}</div>
      {/* mini panel */}
      <div style={{position: 'absolute', left: 30, right: 30, top: MH / 2 + MINI_Y - 135, height: 270, padding: '18px 18px', borderRadius: 20, boxSizing: 'border-box',
        background: 'linear-gradient(180deg, rgba(8,4,20,0.55), rgba(8,4,20,0.3))', boxShadow: `inset 0 0 0 1.5px rgba(${rgb},0.3), inset 0 1px 0 rgba(255,255,255,0.12)`}}>
        {role.key === 'judge' ? <JudgeMini t={t} f={f} land={land} /> : role.key === 'speaker' ? <SpeakerMini t={t} land={land} /> : <ClerkMini t={t} land={land} />}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: MH / 2 + MINI_Y + 156, textAlign: 'center', fontFamily: MONO, fontSize: 15, color: `rgba(${rgb},0.8)`, letterSpacing: '0.06em'}}>{role.tag}</div>
      {/* runtime port */}
      <div style={{position: 'absolute', left: 34, right: 34, bottom: 34, display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONT, fontWeight: 600, fontSize: 14, letterSpacing: '0.3em', color: `rgba(${rgb},${(0.55 + 0.45 * port).toFixed(3)})`}}>
        <span>RUNTIME</span>
        <div style={{flex: 1, height: 6, borderRadius: 3, background: `linear-gradient(90deg, rgba(${rgb},${(0.25 + 0.75 * port).toFixed(3)}), rgba(255,255,255,${(0.1 + 0.8 * port).toFixed(3)}) ${Math.round(30 + 70 * port)}%, rgba(${rgb},0.1))`, boxShadow: port > 0.05 ? `0 0 ${Math.round(8 + 22 * port)}px rgba(${rgb},${(0.8 * port).toFixed(3)})` : undefined}} />
        <span style={{fontFamily: MONO, letterSpacing: 0, fontSize: 15}}>{fire > 0.5 ? 'LINKED' : charge > 0.05 ? `${Math.round(charge * 100)}%` : 'READY'}</span>
      </div>
      <Rim gradient={`linear-gradient(160deg, ${light} 0%, rgba(${rgb},0.9) 22%, rgba(${rgb},0.15) 55%, rgba(127,231,255,0.5) 100%)`} width={2} opacity={1 + flash} z={0} />
      {flash > 0.02 && <Rim gradient={`linear-gradient(150deg, #FFFFFF, rgba(${rgb},1) 40%, #FFFFFF)`} width={3.5} opacity={flash} z={0} />}
      {sheenP > 0 && sheenP < 1 && (
        <div style={{position: 'absolute', inset: 0, borderRadius: 34, overflow: 'hidden', pointerEvents: 'none'}}>
          <Sheen p={sheenP} color="220,240,255" strength={0.45} width={14} z={0} />
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Runtime core                                                         */
/* ------------------------------------------------------------------ */
/** The runtime core: a glass sphere with a plasma heart and orbit rings. `on` 0..1 = ignition. Rendered as a billboard. */
export const Core: React.FC<{t: number; f: number; on: number; charge: number; size?: number}> = ({t, f, on, charge, size = 300}) => {
  const k = Math.max(charge * 0.45, on);
  const pulse = 0.5 + 0.5 * Math.sin(t / (6 - 3 * charge));
  const S = size;
  const R = S / 2;
  const hot = 0.25 + 0.75 * k;
  return (
    <div style={{position: 'relative', width: S, height: S}}>
      {/* outer glow */}
      <div style={{position: 'absolute', left: -S, top: -S, width: S * 3, height: S * 3, borderRadius: '50%', background: `radial-gradient(closest-side, rgba(200,180,255,${(0.18 + 0.4 * k).toFixed(3)}), rgba(140,107,234,${(0.1 + 0.2 * k).toFixed(3)}) 35%, rgba(127,231,255,${(0.05 + 0.08 * k).toFixed(3)}) 60%, transparent)`}} />
      {/* rings */}
      <svg width={S * 2} height={S * 2} style={{position: 'absolute', left: -R, top: -R, overflow: 'visible'}}>
        <g transform={`translate(${S} ${S}) rotate(${(-18 + 4 * Math.sin(t / 40)).toFixed(2)})`}>
          <ellipse rx={S * 0.92} ry={S * 0.22} fill="none" stroke={`rgba(127,231,255,${(0.35 + 0.5 * k).toFixed(3)})`} strokeWidth={2} strokeDasharray="2 10" />
          <ellipse rx={S * 0.92} ry={S * 0.22} fill="none" stroke="#FFFFFF" strokeWidth={3} strokeDasharray={`${S * 0.5} ${S * 6}`} strokeDashoffset={-t * 9} strokeLinecap="round" opacity={0.4 + 0.6 * k} />
        </g>
        <g transform={`translate(${S} ${S}) rotate(${(52 + 3 * Math.cos(t / 50)).toFixed(2)})`}>
          <ellipse rx={S * 0.78} ry={S * 0.16} fill="none" stroke={`rgba(205,187,255,${(0.3 + 0.5 * k).toFixed(3)})`} strokeWidth={1.6} />
          <ellipse rx={S * 0.78} ry={S * 0.16} fill="none" stroke="#E7F4B9" strokeWidth={3} strokeDasharray={`${S * 0.3} ${S * 5}`} strokeDashoffset={t * 7} strokeLinecap="round" opacity={0.3 + 0.7 * k} />
        </g>
      </svg>
      {/* sphere */}
      <div style={{position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden',
        background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,${(0.35 + 0.65 * hot).toFixed(3)}) 0%, rgba(231,244,185,${(0.2 + 0.5 * k).toFixed(3)}) ${Math.round(10 + 8 * k)}%, rgba(170,140,255,${(0.45 + 0.4 * k).toFixed(3)}) ${Math.round(26 + 10 * k)}%, rgba(60,30,120,0.55) 62%, rgba(20,10,44,0.5) 100%)`,
        boxShadow: `0 0 ${Math.round(40 + 120 * k + 30 * pulse * k)}px rgba(170,140,255,${(0.5 + 0.4 * k).toFixed(3)}), inset 0 0 ${Math.round(S * 0.18)}px rgba(127,231,255,0.55), inset 0 0 0 2px rgba(220,240,255,0.55)`}}>
        {/* plasma swirl */}
        <div style={{position: 'absolute', inset: '-20%', borderRadius: '50%', opacity: 0.35 + 0.5 * k,
          background: `conic-gradient(from ${(t * 4) % 360}deg, rgba(127,231,255,0) 0deg, rgba(127,231,255,0.6) 40deg, rgba(127,231,255,0) 90deg, rgba(231,244,185,0.5) 160deg, rgba(231,244,185,0) 210deg, rgba(205,187,255,0.6) 280deg, rgba(205,187,255,0) 340deg)`,
          WebkitMaskImage: 'radial-gradient(closest-side, black 20%, transparent 75%)', maskImage: 'radial-gradient(closest-side, black 20%, transparent 75%)'}} />
        {/* specular */}
        <div style={{position: 'absolute', left: '16%', top: '9%', width: '44%', height: '26%', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,255,255,0.75), transparent)', transform: 'rotate(-24deg)'}} />
        <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 50% 50%, transparent 58%, rgba(127,231,255,0.35) 70%, rgba(205,187,255,0.5) 76%, transparent 80%)'}} />
      </div>
      {/* hot core */}
      <div style={{position: 'absolute', left: R - S * 0.2, top: R - S * 0.2, width: S * 0.4, height: S * 0.4, borderRadius: '50%', background: `radial-gradient(closest-side, rgba(255,255,255,${(0.5 + 0.5 * hot).toFixed(3)}), rgba(255,255,255,0) 100%)`, transform: `scale(${(0.7 + 0.5 * k + 0.12 * pulse * k).toFixed(3)})`}} />
    </div>
  );
};

/** Small HUD plate under the core (the big copy carries "One runtime."). */
export const CoreLabel: React.FC<{t: number; at: number}> = ({t, at}) => {
  const p = pr(t, at, 16, EZ.expoOut);
  if (p <= 0) return null;
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 12, padding: '10px 22px 10px 16px', borderRadius: 999, whiteSpace: 'nowrap', transform: `scale(${(0.7 + 0.3 * EZ.backOut(clamp01(p))).toFixed(3)})`, opacity: clamp01(p * 2),
      background: 'linear-gradient(135deg, rgba(46,26,86,0.85), rgba(16,8,34,0.8))', boxShadow: '0 0 30px rgba(140,107,234,0.6), inset 0 0 0 1.5px rgba(205,187,255,0.6)',
      fontFamily: FONT, fontWeight: 600, fontSize: 20, letterSpacing: '0.3em', color: '#EDE6FF'}}>
      <Icon.bolt size={22} color="#E7F4B9" sw={2.4} />
      RUNTIME
      <span style={{fontFamily: MONO, letterSpacing: 0, fontSize: 18, color: '#7FE7FF'}}>3/3 linked</span>
    </div>
  );
};
