// s02 teaser fragments: holographic product pieces for the strobe montage (beats 24–30), all in the GLASS holo look.
import React from 'react';
import {DISPLAY, FONT, MONO, clamp, expoOut, backOut, lerp} from '../../lib';
import {GlassPane, Icon, Avatar} from '../../ui';

export const HOLO = {
  text: '#F6F2FF',
  soft: '#CDBBFF',
  faint: 'rgba(205,187,255,0.55)',
  cyan: '#7FE7FF',
  green: '#45E3B0',
  amber: '#FFC04D',
  purple: '#AA8CFF',
  pist: '#E7F4B9',
};

/** `when enjoyment ≥ 1.7` typed onto a smoked-glass policy strip. p = type-on 0..1. */
export const CodeLine: React.FC<{p: number; t: number; sheen?: number; flash?: number; w?: number}> = ({p, t, sheen, flash = 0, w = 1640}) => {
  const tokens: [string, string, number?][] = [
    ['when', HOLO.purple, 800],
    [' ', HOLO.text],
    ['enjoyment', HOLO.text, 600],
    [' ≥ ', HOLO.cyan, 700],
    ['1.7', HOLO.pist, 800],
  ];
  const total = tokens.reduce((s, x) => s + x[0].length, 0);
  let left = Math.round(total * clamp(p));
  const caretOn = p < 1 || Math.floor(t / 7) % 2 === 0;
  return (
    <GlassPane look="holo" w={w} h={330} radius={30} titleBar="policy · acknowledge_happy_start" glow={0.9} sheen={sheen} flash={flash} padding="34px 64px">
      <div style={{display: 'flex', alignItems: 'center', gap: 22, marginTop: 6}}>
        <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 30, letterSpacing: '0.24em', color: HOLO.cyan, padding: '8px 18px', borderRadius: 12, boxShadow: `inset 0 0 0 1.5px rgba(127,231,255,0.6), 0 0 22px rgba(127,231,255,0.35)`}}>IF</div>
        <div style={{fontFamily: MONO, fontSize: 112, lineHeight: 1.15, whiteSpace: 'pre', textShadow: '0 0 26px rgba(170,140,255,0.55)'}}>
          {tokens.map(([s, c, wgt], i) => {
            const n = Math.max(0, Math.min(s.length, left));
            left -= s.length;
            if (n <= 0) return null;
            return <span key={i} style={{color: c, fontWeight: wgt ?? 400, textShadow: c === HOLO.pist ? '0 0 30px rgba(231,244,185,0.8)' : undefined}}>{s.slice(0, n)}</span>;
          })}
          <span style={{display: 'inline-block', width: 54, height: 104, marginLeft: 6, verticalAlign: '-12px', background: HOLO.cyan, opacity: caretOn ? 0.85 : 0, boxShadow: '0 0 20px rgba(127,231,255,0.9)'}} />
        </div>
      </div>
      <div style={{display: 'flex', gap: 16, marginTop: 20, fontFamily: MONO, fontSize: 24, color: HOLO.faint}}>
        <span>Σ score · judge</span><span>·</span><span>conf 0.91</span><span>·</span><span style={{color: HOLO.green}}>PASS</span>
      </div>
    </GlassPane>
  );
};

/** Decision pill "Happy start matched" (green neon) — lands with a scale pop at `p`. */
export const DecisionPill: React.FC<{p: number; t: number; size?: number; pulse?: number}> = ({p, t, size = 64, pulse = 0}) => {
  const e = backOut(clamp(p));
  const ring = clamp((t - 2) / 22);
  return (
    <div style={{position: 'relative', display: 'inline-flex', alignItems: 'center', gap: size * 0.38, padding: `${size * 0.34}px ${size * 0.7}px ${size * 0.34}px ${size * 0.34}px`, borderRadius: 999, whiteSpace: 'nowrap', transform: `scale(${lerp(0.6, 1, e).toFixed(4)})`, opacity: clamp(p * 3),
      fontFamily: FONT, fontWeight: 700, fontSize: size, letterSpacing: '-0.015em', color: '#EFFFF8',
      background: 'linear-gradient(160deg, rgba(30,90,72,0.78), rgba(10,34,30,0.82))',
      boxShadow: `inset 0 0 0 2px rgba(69,227,176,${(0.75 + 0.25 * pulse).toFixed(3)}), inset 0 2px 0 rgba(255,255,255,0.3), 0 0 ${Math.round(size * (1.1 + pulse))}px rgba(69,227,176,0.55), 0 ${size * 0.4}px ${size}px -${size * 0.4}px rgba(0,0,0,0.6)`}}
    >
      {/* expanding confirmation ring */}
      {ring > 0 && ring < 1 && <div style={{position: 'absolute', inset: -size * 0.5 * ring, borderRadius: 999, boxShadow: `0 0 0 ${(3 * (1 - ring)).toFixed(2)}px rgba(69,227,176,${(0.9 * (1 - ring)).toFixed(3)})`}} />}
      <div style={{width: size * 1.25, height: size * 1.25, borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at 35% 30%, #E9FFF6, #45E3B0 60%, #1F8F6C)', boxShadow: '0 0 30px rgba(69,227,176,0.9)'}}>
        <Icon.check size={size * 0.8} color="#06261C" sw={3.4} />
      </div>
      <span style={{textShadow: '0 0 24px rgba(69,227,176,0.7)'}}>Happy start matched</span>
    </div>
  );
};

/** Second, dimmer decision row (amber, waiting). */
export const DecisionRow: React.FC<{size?: number; o?: number}> = ({size = 40, o = 0.7}) => (
  <div style={{display: 'inline-flex', alignItems: 'center', gap: size * 0.4, padding: `${size * 0.3}px ${size * 0.6}px`, borderRadius: 999, whiteSpace: 'nowrap', opacity: o, fontFamily: FONT, fontWeight: 600, fontSize: size, color: '#FFE9C2', background: 'rgba(60,40,10,0.6)', boxShadow: `inset 0 0 0 1.5px rgba(255,192,77,0.7), 0 0 ${size}px rgba(255,192,77,0.35)`}}>
    <Icon.clock size={size * 0.95} color={HOLO.amber} sw={2.4} />
    Collect details → follow up
  </div>
);

/** Clerk activity card: create_lead · async, extracted fields ✓, big result check landing at `p`. */
export const ClerkCard: React.FC<{p: number; t: number; flash?: number}> = ({p, t, flash = 0}) => {
  const e = backOut(clamp(p));
  const rows: [string, string][] = [['Name', 'Alex Morgan'], ['Email', 'alex@example.com']];
  return (
    <GlassPane look="holo" w={980} h={560} radius={34} glow={0.9} flash={flash} padding="40px 48px">
      <div style={{display: 'flex', alignItems: 'center', gap: 16, fontFamily: DISPLAY, fontWeight: 800, fontSize: 46, color: HOLO.text, letterSpacing: '-0.02em', textShadow: '0 0 22px rgba(170,140,255,0.6)'}}>
        <Icon.gear size={46} color={HOLO.soft} />Clerk
        <div style={{flex: 1}} />
        <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 22, letterSpacing: '0.2em', color: HOLO.amber, padding: '8px 18px', borderRadius: 999, boxShadow: 'inset 0 0 0 1.5px rgba(255,192,77,0.7), 0 0 18px rgba(255,192,77,0.3)'}}>ASYNC</div>
      </div>
      <div style={{display: 'flex', marginTop: 26, gap: 40, alignItems: 'center'}}>
        <div style={{flex: 1}}>
          <div style={{display: 'inline-block', fontFamily: MONO, fontSize: 40, color: HOLO.cyan, padding: '10px 22px', borderRadius: 14, background: 'rgba(127,231,255,0.08)', boxShadow: 'inset 0 0 0 1.5px rgba(127,231,255,0.5), 0 0 26px -6px rgba(127,231,255,0.6)'}}>create_lead()</div>
          {rows.map(([k, v], i) => (
            <div key={k} style={{display: 'flex', alignItems: 'center', gap: 16, marginTop: 22, fontFamily: FONT, fontSize: 32, color: HOLO.soft}}>
              <div style={{width: 34, height: 34, borderRadius: 17, background: HOLO.green, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 14px rgba(69,227,176,0.9)'}}><Icon.check size={22} color="#06261C" sw={3.6} /></div>
              <span style={{color: HOLO.faint, width: 100}}>{k}</span>
              <span style={{color: HOLO.text, fontWeight: 600}}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{position: 'relative', width: 250, height: 250, flex: 'none', transform: `scale(${lerp(1.7, 1, e).toFixed(4)})`, opacity: clamp(p * 2.5)}}>
          <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 36% 30%, #F0FFF9 0%, #45E3B0 52%, #13664D 100%)', boxShadow: `0 0 ${Math.round(70 + 60 * (1 - clamp(p)))}px rgba(69,227,176,0.95), inset 0 0 0 3px rgba(255,255,255,0.6)`}} />
          <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Icon.check size={170} color="#05241A" sw={3.2} /></div>
          <div style={{position: 'absolute', left: -40, right: -40, bottom: -64, textAlign: 'center', fontFamily: MONO, fontSize: 26, color: HOLO.green, textShadow: '0 0 14px rgba(69,227,176,0.9)'}}>lead_id · L-2048</div>
        </div>
      </div>
    </GlassPane>
  );
};

/** The winking avatar inside a holo halo. wink 0..1. */
export const AvatarHalo: React.FC<{size?: number; wink: number; t: number; glow?: number}> = ({size = 420, wink, t, glow = 1}) => {
  const ringA = (t * 2.2) % 360;
  return (
    <div style={{position: 'relative', width: size * 1.6, height: size * 1.6}}>
      <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(closest-side, rgba(170,140,255,${(0.55 * glow).toFixed(3)}), rgba(127,231,255,${(0.12 * glow).toFixed(3)}) 60%, transparent 100%)`}} />
      <div style={{position: 'absolute', inset: size * 0.08, borderRadius: '50%', border: '2px solid rgba(127,231,255,0.55)', borderTopColor: 'rgba(255,255,255,0.95)', borderRightColor: 'transparent', transform: `rotate(${ringA.toFixed(1)}deg)`, boxShadow: '0 0 30px rgba(127,231,255,0.35)'}} />
      <div style={{position: 'absolute', inset: size * 0.02, borderRadius: '50%', border: '1.5px dashed rgba(205,187,255,0.45)', transform: `rotate(${(-ringA * 0.6).toFixed(1)}deg)`}} />
      <div style={{position: 'absolute', left: size * 0.3, top: size * 0.3}}>
        <Avatar size={size} wink={wink} glow={glow} />
      </div>
    </div>
  );
};

/** A simple reveal helper: expo-out 0..1 from `at` over `dur`. */
export const rv = (t: number, at: number, dur: number) => expoOut(clamp((t - at) / dur));

/* ------------------------------------------------------------------------------------------------------------------
 * HoloOrb — local version of ui/GlassOrbNode (holo look). The shared component draws its bloom as a child that
 * overflows the orb's s×s box; inside a 3D World Chromium clips that gradient to the box → a visible light SQUARE
 * around every orb (also visible in demo:glass). Here the root box is the full bloom extent, so nothing overflows.
 * ------------------------------------------------------------------------------------------------------------------ */
const ORB_RGB = {lilac: '160,130,255', cyan: '127,231,255', green: '69,227,176', amber: '255,192,77'} as const;
export const HoloOrb: React.FC<{size?: number; label?: string; icon?: string; active?: number; t?: number; tone?: keyof typeof ORB_RGB; p?: number}> = ({size = 300, label, icon, active = 0, t = 0, tone = 'lilac', p = 1}) => {
  const s = size, R = s * 1.1; // root half-size (bloom radius)
  const rgb = ORB_RGB[tone];
  const a = clamp(active);
  const I = icon ? Icon[icon] : null;
  if (p <= 0) return null;
  const sc = lerp(0.4, 1, backOut(clamp(p)));
  const o = (x: number) => ({position: 'absolute' as const, left: R - x / 2, top: R - x / 2, width: x, height: x, borderRadius: '50%'});
  const ang = t * 0.05, W = s * 1.5, H = s * 0.38;
  const dx = Math.cos(ang) * W / 2, dy = Math.sin(ang) * H / 2;
  const half = (which: 'back' | 'front') => (
    <div style={{position: 'absolute', left: R - W / 2, top: which === 'back' ? R - H / 2 : R, width: W, height: H / 2 + 8, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: which === 'back' ? 0 : -H / 2, width: W, height: H, borderRadius: '50%', boxShadow: `inset 0 0 0 2px rgba(${rgb},${(which === 'back' ? 0.45 : 0.85) * a}), 0 0 12px rgba(${rgb},${0.45 * a})`}} />
      {(Math.sin(ang) > 0) === (which === 'front') && <div style={{position: 'absolute', left: W / 2 + dx - 7, top: (which === 'back' ? H / 2 : 0) + dy - 7, width: 14, height: 14, borderRadius: 7, background: '#fff', boxShadow: `0 0 14px 5px rgba(${rgb},${a})`}} />}
    </div>
  );
  return (
    <div style={{position: 'relative', width: R * 2, height: R * 2, transform: `scale(${sc.toFixed(4)})`, opacity: p < 0.34 ? clamp(p * 3) : undefined, fontFamily: FONT}}>
      <div style={{...o(R * 2), background: `radial-gradient(closest-side, rgba(${rgb},${(0.34 * (0.45 + a)).toFixed(3)}), rgba(${rgb},${(0.1 * (0.45 + a)).toFixed(3)}) 55%, rgba(${rgb},0) 100%)`}} />
      {a > 0.01 && [0, 0.5].map((k) => {
        const ph = ((t / 46 + k) % 1 + 1) % 1;
        const d = s * (1.04 + 0.75 * ph);
        return <div key={k} style={{...o(d), boxShadow: `inset 0 0 0 ${(2.5 - 1.5 * ph).toFixed(2)}px rgba(${rgb},${(a * (1 - ph) * 0.9).toFixed(3)}), 0 0 ${(14 * (1 - ph)).toFixed(1)}px rgba(${rgb},${(a * (1 - ph) * 0.6).toFixed(3)})`}} />;
      })}
      {a > 0.01 && half('back')}
      <div style={{...o(s), background: `radial-gradient(circle at 34% 27%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.18) 9%, rgba(255,255,255,0) 22%), radial-gradient(circle at 50% 58%, rgba(${rgb},${0.08 + 0.12 * a}) 0%, rgba(${rgb},${0.16 + 0.14 * a}) 48%, rgba(${rgb},${0.5 + 0.2 * a}) 86%, rgba(235,250,255,0.75) 100%), rgba(14,8,30,0.55)`,
        boxShadow: `inset 0 0 0 1.5px rgba(255,255,255,0.45), inset ${-s * 0.06}px ${-s * 0.09}px ${s * 0.18}px rgba(${rgb},0.55), inset ${s * 0.04}px ${s * 0.05}px ${s * 0.12}px rgba(255,255,255,0.25)${a > 0 ? `, 0 0 ${(s * 0.45 * a).toFixed(1)}px rgba(${rgb},${(0.85 * a).toFixed(3)})` : ''}`}}>
        <div style={{position: 'absolute', left: '14%', right: '14%', bottom: '5%', height: '34%', borderRadius: '50%', background: `radial-gradient(50% 60% at 50% 100%, rgba(${rgb},${0.55 + 0.35 * a}), rgba(${rgb},0) 100%)`}} />
        <div style={{position: 'absolute', left: '18%', top: '11%', width: '32%', height: '17%', borderRadius: '50%', transform: 'rotate(-32deg)', background: 'radial-gradient(closest-side, rgba(255,255,255,0.95), rgba(255,255,255,0) 100%)'}} />
      </div>
      <div style={{...o(s), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: s * 0.04}}>
        {I && <I size={s * 0.22} color="#fff" sw={2} />}
        {label && <div style={{fontSize: Math.max(13, s * 0.105), fontWeight: 650, color: '#F6F2FF', textShadow: `0 0 ${s * 0.06}px rgba(${rgb},0.9)`, whiteSpace: 'nowrap'}}>{label}</div>}
      </div>
      {a > 0.01 && half('front')}
    </div>
  );
};
