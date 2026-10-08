// s10 Act C — the final hit (4298) and the end card: avatar, "Bot Studio", tagline, feature pills; calm hold, fade.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {DISPLAY, FONT, kick} from '../../lib';
import {World, Obj, addCam, drift, FloorGrid} from '../../cine';
import {SpaceBackdrop, GodRays, FlareBurst, Shockwave, EnergyBurst, Flash, DustField, Bokeh, Sparkles, LensFlare, ChromaticAberration, impulse, Glint} from '../../vfx';
import {Icon} from '../../ui';
import {HIT, lb, clamp01, mix, smoothstep, eo, decay, gradText, kf, qio} from './common';

const AV_Y = -205; // avatar centre (world y; frame centre = 0)
const TITLE_Y = 25;
const TAG_Y = 150;
const PILLS_Y = 262;

const PILLS: [string, string][] = [['Judge', 'scale'], ['Speaker', 'chat'], ['Clerk', 'doc'], ['BotScript', 'code'], ['Live Dashboard', 'chart']];

const GlassPill: React.FC<{label: string; icon: string; p: number; lit: number}> = ({label, icon, p, lit}) => {
  const I = Icon[icon] ?? Icon.sparkle;
  if (p <= 0) return null;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 22px 12px 16px', borderRadius: 999,
      fontFamily: FONT, fontWeight: 600, fontSize: 25, letterSpacing: '0.005em', color: '#F1ECFF', whiteSpace: 'nowrap',
      background: 'linear-gradient(160deg, rgba(120,90,200,0.34), rgba(40,22,80,0.42))',
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.45), inset 0 0 0 1.5px rgba(190,170,255,${0.42 + 0.4 * lit}), 0 0 ${18 + 30 * lit}px -4px rgba(127,231,255,${0.25 + 0.5 * lit})`,
      opacity: smoothstep(0, 0.5, p), transform: `translateY(${((1 - eo(p)) * 26).toFixed(1)}px) scale(${mix(0.86, 1, eo(p)).toFixed(4)})`,
    }}>
      <div style={{width: 30, height: 30, borderRadius: 15, background: 'rgba(205,187,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <I size={18} color="#CDBBFF" />
      </div>
      {label}
    </div>
  );
};

/** Local copy of the brand robot face with BOTH eyes open, so it can wink once (the shared Avatar is drawn winking).
 *  wink 0 = open · 0.5 = right eye shut · 1 = the brand "^" wink. */
const P = '#39294B';
const BotFace: React.FC<{size: number; wink: number}> = ({size, wink}) => {
  const w = clamp01(wink);
  const eyeRy = 3.6 * (1 - clamp01(w * 2));
  const arcH = 5.2 * clamp01(w * 2 - 1);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{overflow: 'visible'}}>
      <defs>
        <radialGradient id="s10avbg" cx="35%" cy="30%" r="80%"><stop offset="0%" stopColor="#E9E0FF" /><stop offset="100%" stopColor="#B49BF2" /></radialGradient>
        <linearGradient id="s10avface" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FFFFFF" /><stop offset="100%" stopColor="#F1ECFB" /></linearGradient>
      </defs>
      <circle cx="32" cy="32" r="31" fill="url(#s10avbg)" />
      <line x1="32" y1="9" x2="32" y2="15" stroke={P} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="32" cy="7.5" r="3" fill="#6A45E0" />
      <rect x="13" y="16" width="38" height="32" rx="14" fill="url(#s10avface)" stroke={P} strokeWidth="2.6" />
      <rect x="9" y="27" width="5" height="10" rx="2.5" fill="#8C6BEA" />
      <rect x="50" y="27" width="5" height="10" rx="2.5" fill="#8C6BEA" />
      <ellipse cx="24.5" cy="30" rx="3.2" ry="3.6" fill={P} />
      {eyeRy > 0.15 ? <ellipse cx="40.5" cy="30" rx="3.2" ry={eyeRy} fill={P} /> : <path d={`M36 ${(31 - arcH / 2).toFixed(2)} q 4.5 ${(-Math.max(0.6, arcH)).toFixed(2)} 9 0`} stroke={P} strokeWidth="2.8" fill="none" strokeLinecap="round" />}
      <path d={`M24 38.5 q 8 ${(6 + 1.2 * w).toFixed(2)} 16 0`} stroke={P} strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <circle cx="20" cy="37" r="2.4" fill="#F7B6D2" opacity={0.7 + 0.25 * w} />
      <circle cx="44" cy="37" r="2.4" fill="#F7B6D2" opacity={0.7 + 0.25 * w} />
    </svg>
  );
};

/** Avatar on a frosted glass disc with a luminous rim and halo. */
const AvatarBadge: React.FC<{t: number; wink: number; glow: number}> = ({t, wink, glow}) => (
  <div style={{position: 'relative', width: 300, height: 300}}>
    <div style={{position: 'absolute', left: -170, top: -170, width: 640, height: 640, borderRadius: '50%', background: `radial-gradient(closest-side, rgba(170,140,255,${0.42 * glow}), rgba(127,231,255,${0.10 * glow}) 55%, rgba(0,0,0,0) 100%)`}} />
    <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 35% 28%, rgba(255,255,255,0.32), rgba(190,168,255,0.14) 45%, rgba(60,30,120,0.22) 100%)',
      boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.7), inset 0 0 0 1.5px rgba(205,187,255,0.55), inset 0 -20px 40px rgba(127,231,255,0.12), 0 0 70px -10px rgba(140,107,234,0.7)'}} />
    {/* orbit ring */}
    <svg width={300} height={300} viewBox="0 0 300 300" style={{position: 'absolute', left: 0, top: 0, transform: `rotate(${(t * 0.5).toFixed(2)}deg)`}}>
      <defs>
        <linearGradient id="s10ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7FE7FF" stopOpacity="0.95" />
          <stop offset="0.5" stopColor="#B49BF2" stopOpacity="0.1" />
          <stop offset="1" stopColor="#E7F4B9" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <circle cx="150" cy="150" r="146" fill="none" stroke="url(#s10ring)" strokeWidth="2" />
      <circle cx="150" cy="4" r="4" fill="#BFF4FF" />
    </svg>
    <div style={{position: 'absolute', left: 40, top: 40}}><BotFace size={220} wink={wink} /></div>
  </div>
);

/** The end card. t = scene-local frame; HIT = cut. */
export const EndCard: React.FC<{t: number; f: number; from: number; dur: number}> = ({t, f, from, dur}) => {
  const lt = t - HIT; // frames since the hit
  // camera: a slow, elegant push + floating drift
  const push = eo(clamp01(lt / 40)) * 0.25 + clamp01(lt / 260) * 0.75;
  const cam = addCam({target: [0, 0, 0], yaw: mix(-3.5, 0.8, push), pitch: mix(-2.5, 0.5, push), dist: mix(2050, 1820, push), focal: 35, roll: mix(-1.2, 0, eo(clamp01(lt / 50)))}, drift(lt, 0.7, 7));
  // reveals
  const avP = eo(clamp01((lt - 1) / 22));
  const titleP = clamp01((lt - 3) / 40);
  const tagP = clamp01((t - lb(161.5)) / 22);
  const pillP = (i: number) => clamp01((t - (lb(162.5) + i * 5)) / 16);
  // wink once (eye open → wink → open)
  const W0 = lb(164.25);
  const wink = kf(t, [[W0, 0], [W0 + 4, 1], [W0 + 20, 1], [W0 + 26, 0]], (u) => u);
  const sheenP = clamp01((t - (HIT + 16)) / 40);
  const sheen2 = clamp01((t - lb(164.5)) / 44);
  // global fade to black (complete by ~4552, last ~40 frames pure black)
  const fadeOut = smoothstep(dur - 140, dur - 40, t);
  const rays = mix(1.35, 0.42, eo(clamp01(lt / 70))) * (1 - fadeOut);
  const ca = 2 + 16 * impulse(lt, 0, 1, 7);
  const tracking = mix(0.42, -0.045, eo(titleP));
  const titleO = smoothstep(0, 0.25, titleP);
  const titleBlur = (1 - eo(clamp01(titleP * 1.6))) * 14;

  const scene = (
    <AbsoluteFill>
      <World
        camera={cam}
        backdrop={
          <>
            <SpaceBackdrop from={from} frame={t} intensity={0.85} haze={0.5} horizon={760} audio={0.6} seed={11} />
            <FloorGrid y={520} step={160} extent={4200} center={[0, -1200]} fade={[700, 3600]} opacity={0.22} />
          </>
        }
      >
        <Obj y={AV_Y} z={40} s={mix(0.55, 1, avP)} o={smoothstep(0, 0.2, avP)}>
          <AvatarBadge t={t} wink={wink} glow={1 + 0.6 * decay(lt, 0, 20)} />
        </Obj>
        <Obj y={TITLE_Y} z={0} o={titleO} blur={titleBlur}>
          <div style={{position: 'relative', fontFamily: DISPLAY, fontWeight: 900, fontSize: 176, lineHeight: 1, letterSpacing: `${tracking.toFixed(4)}em`, whiteSpace: 'nowrap'}}>
            <div style={{position: 'absolute', left: 0, top: 0, color: 'rgba(150,115,255,0.18)', textShadow: '0 0 50px rgba(150,115,255,0.8), 0 0 140px rgba(127,231,255,0.28)'}}>Bot Studio</div>
            <div style={{position: 'relative', ...gradText('linear-gradient(178deg, #FFFFFF 0%, #FFFFFF 36%, #E4D9FF 54%, #A98BFF 78%, #D9F0A8 100%)')}}>Bot Studio</div>
            {/* chrome sheen sweep */}
            {[sheenP, sheen2].map((p, i) => p > 0 && p < 1 ? (
              <div key={i} style={{position: 'absolute', left: 0, top: 0, ...gradText(`linear-gradient(108deg, rgba(255,255,255,0) ${mix(-30, 120, p) - 14}%, rgba(255,255,255,0.95) ${mix(-30, 120, p)}%, rgba(255,255,255,0) ${mix(-30, 120, p) + 14}%)`)}}>Bot Studio</div>
            ) : null)}
          </div>
        </Obj>
        <Obj y={TAG_Y} z={-10}>
          <div style={{overflow: 'hidden', padding: '6px 10px'}}>
            <div style={{fontFamily: DISPLAY, fontWeight: 600, fontSize: 48, letterSpacing: '-0.015em', color: '#E6DDFF', whiteSpace: 'nowrap',
              transform: `translateY(${((1 - eo(tagP)) * 110).toFixed(1)}%)`, opacity: smoothstep(0, 0.4, tagP), textShadow: '0 0 26px rgba(150,115,255,0.55)'}}>
              Bots that think in the <span style={{...gradText('linear-gradient(90deg, #E7F4B9, #BFF4FF)')}}>open.</span>
            </div>
          </div>
        </Obj>
        <Obj y={PILLS_Y} z={20}>
          <div style={{display: 'flex', gap: 16, alignItems: 'center'}}>
            {PILLS.map(([l, ic], i) => <GlassPill key={l} label={l} icon={ic} p={pillP(i)} lit={decay(t, lb(162.5) + i * 5 + 10, 10)} />)}
          </div>
        </Obj>
      </World>
    </AbsoluteFill>
  );

  return (
    <AbsoluteFill style={{background: '#04020A'}}>
      {lt < 12 ? <ChromaticAberration amount={ca}>{scene}</ChromaticAberration> : scene}
      <GodRays x={960} y={335} intensity={rays} frame={t} lobes={20} length={1500} contrast={2.8} dust={0.8} speed={0.05} />
      <DustField frame={t} count={120} opacity={0.75 * (1 - fadeOut)} camX={-push * 40} boost={0.3 * kick(f, 10)} />
      <Bokeh frame={t} count={22} focus={0.9} opacity={0.55 * (1 - fadeOut)} camX={-push * 70} />
      <Sparkles frame={t} count={24} opacity={0.6 * (1 - fadeOut)} area={{x: 360, y: 120, w: 1200, h: 520}} />
      {/* final hit stack */}
      <Shockwave x={960} y={335} at={HIT} rings={3} distort radius={1500} frame={t} />
      <Shockwave x={960} y={835} at={HIT + 2} squash={0.2} radius={1700} rings={1} frame={t} />
      <EnergyBurst x={960} y={335} at={HIT} count={200} distance={900} frame={t} />
      <FlareBurst x={960} y={335} at={HIT} dur={64} peak={2.2} sustain={0} flash={0.6} frame={t} />
      <LensFlare x={mix(955, 968, push)} y={mix(262, 248, push)} intensity={0.32 * smoothstep(HIT + 40, HIT + 100, t) * (1 - fadeOut)} scale={0.45} ghosts={0.6} rays={10} ring={false} veil={0.3} frame={t} />
      <Glint x={960 + 104} y={335 - 96} size={150} intensity={1.3 * Math.max(0, Math.sin(Math.PI * clamp01((t - (W0 + 6)) / 22)))} frame={t} />
      <Flash at={HIT} dur={26} color="white" max={1} blend="normal" frame={t} />
      <Flash at={HIT} dur={40} color="cyan" max={0.4} bloom x={960} y={335} frame={t} />
      <AbsoluteFill style={{background: '#000', opacity: fadeOut}} />
    </AbsoluteFill>
  );
};
