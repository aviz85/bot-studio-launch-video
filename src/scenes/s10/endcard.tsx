// s10 Act C — the final hit (4298) and the end card: avatar, "Bot Studio", tagline, feature pills; calm hold, fade.
import React from 'react';
import {AbsoluteFill, Img} from 'remotion';
import {DISPLAY, FONT, kick} from '../../lib';
import {World, Obj, addCam, drift, FloorGrid} from '../../cine';
import {SpaceBackdrop, GodRays, FlareBurst, Shockwave, EnergyBurst, Flash, DustField, Bokeh, Sparkles, LensFlare, ChromaticAberration, impulse, Glint} from '../../vfx';
import {Icon} from '../../ui';
import {HIT, lb, clamp01, mix, smoothstep, eo, decay, gradText} from './common';

const AV_Y = -238; // avatar centre (world y; frame centre = 0)
const TITLE_Y = 48;
const TAG_Y = 172;
const PILLS_Y = 282;

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

/* ------------------------------------------------------------------ */
/* Hero avatar — identical art to the s03 reveal (src/scenes/s03/art.tsx avatarSvg: brand "<" wink chevron), copied so
 * the logo matches at the start and the end of the film without depending on another scene's file.
 * wink: 0 = both eyes open, 0.5 = right eye half shut, 1 = brand wink "<". Quantised so each state decodes once. */
const AVR = 480;
const avatarSvg = (wink: number) => {
  const w = Math.round(clamp01(wink) * 2) / 2;
  const eye = w >= 1
    ? `<path d="M44.6 26.6 L37.6 30.4 L44.6 34.2" stroke="#39294B" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<ellipse cx="40.6" cy="30.2" rx="3.2" ry="${(3.6 * (1 - w * 1.4) + 0.4).toFixed(2)}" fill="#39294B"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${AVR * 2}" height="${AVR * 2}" viewBox="0 0 64 64">
<defs>
<radialGradient id="b" cx="32%" cy="26%" r="85%"><stop offset="0%" stop-color="#C9B6FF"/><stop offset="45%" stop-color="#9677F2"/><stop offset="100%" stop-color="#5B36D6"/></radialGradient>
<linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="100%" stop-color="#EEE8FB"/></linearGradient>
<radialGradient id="h" cx="30%" cy="18%" r="55%"><stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.55"/><stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
</defs>
<circle cx="32" cy="32" r="31.4" fill="url(#b)"/>
<circle cx="32" cy="32" r="31.4" fill="url(#h)"/>
<circle cx="32" cy="32" r="30.6" fill="none" stroke="#E9E0FF" stroke-opacity="0.55" stroke-width="0.8"/>
<line x1="32" y1="9.5" x2="32" y2="15.5" stroke="#39294B" stroke-width="2.4" stroke-linecap="round"/>
<circle cx="32" cy="7.6" r="3" fill="#2C1E40"/>
<rect x="13" y="16" width="38" height="32" rx="14" fill="url(#f)"/>
<rect x="9.2" y="27" width="4.6" height="10" rx="2.3" fill="#E4DBF7"/>
<rect x="50.2" y="27" width="4.6" height="10" rx="2.3" fill="#E4DBF7"/>
<ellipse cx="24.2" cy="30.2" rx="3.2" ry="3.6" fill="#39294B"/>
${eye}
<path d="M24 38.4 q 8 6.2 16 0" stroke="#39294B" stroke-width="2.9" fill="none" stroke-linecap="round"/>
<circle cx="19.6" cy="37.2" r="2.3" fill="#F7B6D2" opacity="0.75"/>
<circle cx="44.4" cy="37.2" r="2.3" fill="#F7B6D2" opacity="0.75"/>
</svg>`;
};
const URI_CACHE = new Map<number, string>();
export const avatarUri = (wink: number) => {
  const k = Math.round(clamp01(wink) * 2) / 2;
  let u = URI_CACHE.get(k);
  if (!u) {
    u = `data:image/svg+xml;utf8,${encodeURIComponent(avatarSvg(k))}`;
    URI_CACHE.set(k, u);
  }
  return u;
};
/** s03 title chrome (horizon band) so the end-card title matches the reveal. */
const CHROME_S03 = 'linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 24%, #E4DAFF 44%, #A58CF2 52.5%, #D9CDFF 57%, #FFFFFF 74%, #F1F8D6 92%, #E7F4B9 100%)';

/** The glass avatar medallion (same treatment as s03: halo, specular dome, fresnel rim, antenna bulb). */
const AvatarMedallion: React.FC<{wink: number; glow: number; bulb: number; rimHot: number}> = ({wink, glow, bulb, rimHot}) => {
  const D = 300;
  return (
    <div style={{position: 'relative', width: D, height: D}}>
      <div style={{position: 'absolute', left: -D * 0.8, top: -D * 0.8, width: D * 2.6, height: D * 2.6, borderRadius: '50%', background: `radial-gradient(circle, rgba(160,130,255,${(0.42 * glow).toFixed(3)}) 0%, rgba(127,231,255,${(0.12 * glow).toFixed(3)}) 28%, rgba(106,69,224,${(0.08 * glow).toFixed(3)}) 45%, transparent 68%)`}} />
      {/* glass thickness edge (offset ring behind) */}
      <div style={{position: 'absolute', left: 3, top: 9, width: D, height: D, borderRadius: '50%', background: 'radial-gradient(circle closest-side, rgba(90,54,214,0.9) 0%, rgba(90,54,214,0.9) 90%, rgba(190,170,255,0.95) 96%, rgba(127,231,255,0.76) 99%, transparent 100%)'}} />
      <div style={{position: 'relative', width: D, height: D, borderRadius: '50%'}}>
        <Img src={avatarUri(wink)} style={{width: D, height: D, display: 'block'}} />
        <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(120% 90% at 28% 12%, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.06) 38%, transparent 55%), radial-gradient(70% 50% at 70% 100%, rgba(127,231,255,0.18), transparent 70%)'}} />
        <div style={{position: 'absolute', inset: -2, borderRadius: '50%', background: `radial-gradient(circle closest-side, transparent 91%, rgba(255,255,255,${(0.35 + 0.65 * rimHot).toFixed(3)}) 97%, rgba(127,231,255,${(0.5 + 0.5 * rimHot).toFixed(3)}) 99.5%, transparent 100%)`}} />
        {bulb > 0.01 && (
          <div style={{position: 'absolute', left: D / 2 - 50, top: D * (7.6 / 64) - 50, width: 100, height: 100, borderRadius: '50%', background: `radial-gradient(circle, rgba(255,255,255,${(0.95 * bulb).toFixed(3)}) 0%, rgba(127,231,255,${(0.7 * bulb).toFixed(3)}) 14%, rgba(140,107,234,${(0.25 * bulb).toFixed(3)}) 40%, transparent 70%)`, mixBlendMode: 'screen'}} />
        )}
      </div>
    </div>
  );
};

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
  // wink once: both eyes open after the hit, then the right eye snaps shut into the brand "<" wink and holds — the
  // film ends on the exact logo that s03 revealed
  const W0 = lb(164.25);
  const wink = t < W0 ? 0 : t < W0 + 2 ? 0.5 : 1;
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
          <AvatarMedallion wink={wink} glow={1 + 0.6 * decay(lt, 0, 20)} bulb={0.35 + 0.65 * decay(t, W0 + 2, 14) + 0.5 * decay(lt, 0, 16)} rimHot={decay(lt, 0, 18) + 0.6 * decay(t, W0 + 2, 10)} />
        </Obj>
        <Obj y={TITLE_Y} z={0} o={titleO} blur={titleBlur}>
          <div style={{position: 'relative', fontFamily: DISPLAY, fontWeight: 900, fontSize: 176, lineHeight: 1, letterSpacing: `${tracking.toFixed(4)}em`, whiteSpace: 'nowrap'}}>
            <div style={{position: 'absolute', left: 0, top: 0, color: 'rgba(150,115,255,0.18)', textShadow: '0 0 50px rgba(150,115,255,0.8), 0 0 140px rgba(127,231,255,0.28)'}}>Bot Studio</div>
            <div style={{position: 'relative', ...gradText(CHROME_S03)}}>Bot Studio</div>
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
      <GodRays x={960} y={mix(323, 296, push)} intensity={rays} frame={t} lobes={20} length={1500} contrast={2.8} dust={0.8} speed={0.05} />
      <DustField frame={t} count={120} opacity={0.75 * (1 - fadeOut)} camX={-push * 40} boost={0.3 * kick(f, 10)} />
      <Bokeh frame={t} count={22} focus={0.9} opacity={0.55 * (1 - fadeOut)} camX={-push * 70} />
      <Sparkles frame={t} count={24} opacity={0.6 * (1 - fadeOut)} area={{x: 360, y: 120, w: 1200, h: 520}} />
      {/* final hit stack */}
      <Shockwave x={960} y={323} at={HIT} rings={3} distort radius={1500} frame={t} />
      <Shockwave x={960} y={835} at={HIT + 2} squash={0.2} radius={1700} rings={1} frame={t} />
      <EnergyBurst x={960} y={323} at={HIT} count={200} distance={900} frame={t} />
      <FlareBurst x={960} y={323} at={HIT} dur={64} peak={2.2} sustain={0} flash={0.6} frame={t} />
      <LensFlare x={mix(957, 962, push)} y={mix(220, 179, push)} intensity={0.32 * smoothstep(HIT + 40, HIT + 100, t) * (1 - fadeOut)} scale={0.45} ghosts={0.6} rays={10} ring={false} veil={0.3} frame={t} />
      <Glint x={mix(996, 1001, push)} y={mix(316, 288, push)} size={130} intensity={1.2 * Math.max(0, Math.sin(Math.PI * clamp01((t - (W0 + 1)) / 18)))} frame={t} />
      <Flash at={HIT} dur={26} color="white" max={1} blend="normal" frame={t} />
      <Flash at={HIT} dur={40} color="cyan" max={0.4} bloom x={960} y={323} frame={t} />
      <AbsoluteFill style={{background: '#000', opacity: fadeOut}} />
    </AbsoluteFill>
  );
};
