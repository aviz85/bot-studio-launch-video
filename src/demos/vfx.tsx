/* VFX showcase — 10 vignettes × 60 frames. Preview: node tools/preview.mjs demo:vfx --frames 10,30,50,... */
import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import type {SceneProps} from '../cine/types';
import {DISPLAY, FONT, MONO} from '../lib';
import {Avatar} from '../ui/kit';
import {
  Bloom, Bokeh, ChromaticAberration, DataRain, DataTicker, DustField, EnergyBurst, Embers, FilmGrain, Flash, FlareBurst, Glint, Glitch, GodRays,
  HoloGrid, HoloTunnel, HUDFrame, LensFlare, Letterbox, LightLeak, LightStreak, Reticle, Scanlines, Shockwave, SpaceBackdrop, Sparkles, SpeedLines,
  Strobe, Swoosh, Vignette, VolumetricBeams, easeInOutCubic, impulse, lin, mix,
} from '../vfx';

const V = 60; // vignette length

/** Sample frosted glass panel for context. */
const GlassPanel: React.FC<{x: number; y: number; w: number; h: number; title?: string; dark?: boolean}> = ({x, y, w, h, title = 'Signal Wall', dark}) => {
  const f = useCurrentFrame();
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 28, overflow: 'hidden',
      background: dark ? 'linear-gradient(160deg, rgba(40,24,70,0.62), rgba(14,8,28,0.72))' : 'linear-gradient(160deg, rgba(241,237,248,0.34), rgba(214,200,245,0.16))',
      backdropFilter: 'blur(18px) saturate(1.3)', border: '1px solid rgba(205,187,255,0.45)',
      boxShadow: '0 1px 0 rgba(255,255,255,0.5) inset, 0 0 40px rgba(140,107,234,0.25), 0 40px 90px -30px rgba(0,0,0,0.7)', fontFamily: FONT}}>
      <div style={{position: 'absolute', left: 0, top: 0, right: 0, height: 60, background: 'linear-gradient(180deg, rgba(255,255,255,0.22), transparent)'}} />
      <div style={{position: 'absolute', left: 28, top: 24, color: dark ? '#E2D6FF' : '#fff', fontWeight: 700, fontSize: 22, letterSpacing: '-0.01em'}}>{title}</div>
      <div style={{position: 'absolute', right: 28, top: 28, color: '#CDBBFF', fontFamily: MONO, fontSize: 14}}>LIVE ●</div>
      <div style={{position: 'absolute', left: 28, right: 28, bottom: 28, top: 80, display: 'flex', alignItems: 'flex-end', gap: 8}}>
        {Array.from({length: 22}).map((_, i) => {
          const v = 0.25 + 0.7 * Math.abs(Math.sin(i * 1.7 + f * 0.05));
          const pass = v > 0.6;
          return <div key={i} style={{flex: 1, height: `${v * 100}%`, borderRadius: 6, background: pass ? 'linear-gradient(180deg, #7FE7FF, #36997D)' : 'linear-gradient(180deg, #CDBBFF, #6A45E0)', opacity: 0.9, boxShadow: pass ? '0 0 14px rgba(127,231,255,0.6)' : undefined}} />;
        })}
      </div>
    </div>
  );
};

const Tag: React.FC<{n: number; title: string; sub?: string}> = ({n, title, sub}) => (
  <div style={{position: 'absolute', left: 120, top: 120, fontFamily: FONT, color: '#fff'}}>
    <div style={{fontSize: 13, fontWeight: 600, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#7FE7FF'}}>VFX {String(n).padStart(2, '0')}</div>
    <div style={{fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 6}}>{title}</div>
    {sub && <div style={{fontSize: 16, color: '#CDBBFF', marginTop: 4, fontFamily: MONO}}>{sub}</div>}
  </div>
);

const Headline: React.FC<{text: string; y?: number; size?: number}> = ({text, y = 470, size = 130}) => (
  <div style={{position: 'absolute', left: 0, right: 0, top: y, textAlign: 'center', fontFamily: DISPLAY, fontWeight: 900, fontSize: size, letterSpacing: '-0.04em',
    color: 'transparent', backgroundImage: 'linear-gradient(100deg, #FFFFFF 0%, #E2D6FF 45%, #B49BF2 75%, #E7F4B9 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text'}}>{text}</div>
);

/* ---- vignettes ---- */
const V0: React.FC = () => {
  const f = useCurrentFrame();
  const x = mix(260, 1660, easeInOutCubic(lin(f, 0, V)));
  return (
    <AbsoluteFill>
      <SpaceBackdrop from={0} />
      <HoloGrid speed={0.03} />
      <DustField />
      <GlassPanel x={560} y={380} w={800} h={420} />
      <LensFlare x={x} y={300} intensity={1} />
      <Tag n={1} title="LensFlare" sub="anamorphic · ghosts · rays · rainbow ring" />
    </AbsoluteFill>
  );
};
const V1: React.FC = () => {
  const at = 8;
  return (
    <AbsoluteFill>
      <SpaceBackdrop />
      <HoloGrid speed={0.02} />
      <Shockwave x={960} y={540} at={at} rings={3} distort />
      <Shockwave x={960} y={760} at={at + 2} squash={0.22} radius={1500} thickness={90} rings={1} />
      <EnergyBurst x={960} y={540} at={at} />
      <FlareBurst x={960} y={540} at={at} dur={60} />
      <Flash at={at} dur={10} color="cyan" max={0.35} bloom x={960} y={540} />
      <Tag n={2} title="FlareBurst · Shockwave · EnergyBurst · Flash" sub="drop / reveal impact stack" />
    </AbsoluteFill>
  );
};
const V2: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <SpaceBackdrop palette="mixed" haze={0} />
      <GodRays x={960} y={440} intensity={mix(0.4, 1.1, lin(f, 0, 30))} />
      <Bloom intensity={0.9} radius={16}>
        <div style={{position: 'absolute', left: 960 - 110, top: 440 - 110}}><Avatar size={220} glow={0.6} /></div>
        <Headline text="Bot Studio" y={600} size={120} />
      </Bloom>
      <Glint x={1062} y={352} size={160} intensity={0.5 + 0.5 * Math.sin(f * 0.15)} />
      <Tag n={3} title="GodRays · Bloom · Glint" sub="volumetric shafts w/ lit dust" />
    </AbsoluteFill>
  );
};
const V3: React.FC = () => {
  const f = useCurrentFrame();
  const I = Math.min(1, lin(f, 0, 25)) * (1 - lin(f, 48, 12));
  return (
    <AbsoluteFill>
      <SpaceBackdrop haze={0} />
      <SpeedLines intensity={I} travel={f * 0.02 + Math.pow(lin(f, 0, 60), 2) * 4} />
      <Swoosh start={22} dur={22} angle={-14} />
      <LightStreak start={8} dur={26} angle={180} offset={260} count={6} color="violet" />
      <Tag n={4} title="SpeedLines · Swoosh · LightStreak" sub="warp / whip transitions" />
    </AbsoluteFill>
  );
};
const V4: React.FC = () => (
  <AbsoluteFill>
    <SpaceBackdrop />
    <HoloGrid speed={0.02} />
    <GlassPanel x={560} y={330} w={800} h={420} />
    <LightLeak start={0} dur={46} palette="warm" side="left" />
    <LightLeak start={22} dur={38} palette="violet" side="tr" seed={6} />
    <Tag n={5} title="LightLeak" sub="warm · violet · cyan · lime" />
  </AbsoluteFill>
);
const V5: React.FC = () => {
  const f = useCurrentFrame();
  const ca = 16 * impulse(f, 6, 1, 8); // decays below 0.25 px → CA bypasses itself before the glitch starts (never nest both at full strength)
  const gl = f > 26 && f < 56 ? 0.25 + 0.75 * impulse(f, 30, 1, 10) : 0;
  return (
    <AbsoluteFill>
      <SpaceBackdrop />
      <ChromaticAberration amount={ca}>
        <Glitch amount={gl}>
          <GlassPanel x={560} y={330} w={800} h={420} dark />
          <Headline text="Why did it say that?" y={800} size={84} />
        </Glitch>
      </ChromaticAberration>
      <Scanlines opacity={0.12} />
      <Tag n={6} title="ChromaticAberration · Glitch · Scanlines" sub={`ca ${ca.toFixed(1)}px · glitch ${gl.toFixed(2)}`} />
    </AbsoluteFill>
  );
};
const V6: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#04020A'}}>
      <SpaceBackdrop haze={0} intensity={0.6} />
      <HoloTunnel travel={f * 0.12} roll={f * 0.15} />
      <DataRain intensity={0.6} density={0.35} area={{x: 0, y: 0, w: 1920, h: 1080}} />
      <Tag n={7} title="HoloTunnel · DataRain" sub="fly-through" />
    </AbsoluteFill>
  );
};
const V7: React.FC = () => (
  <AbsoluteFill>
    <SpaceBackdrop />
    <HoloGrid speed={0.02} />
    <GlassPanel x={460} y={300} w={760} h={440} dark title="Judgment · frustration" />
    <Reticle x={520} y={420} w={300} h={260} start={6} label="Judge · Score" value="0.31 · BELOW 0.6" />
    <DataTicker x={1330} y={330} title="Runtime log" rows={8} />
    <DataTicker x={460} y={780} mode="stats" width={900} title="Live" />
    <HUDFrame start={0} />
    <Tag n={8} title="HUDFrame · Reticle · DataTicker" />
  </AbsoluteFill>
);
const V8: React.FC = () => (
  <AbsoluteFill>
    <SpaceBackdrop haze={0} />
    <VolumetricBeams beams={[{x: 500, y: -80, angle: 72, width: 9, length: 1500, sweep: 6}, {x: 1400, y: -80, angle: 110, width: 11, length: 1500, color: 'cyan', sweep: 8}]} />
    <Bokeh />
    <DustField count={120} />
    <Embers />
    <Sparkles count={40} />
    <Tag n={9} title="Bokeh · Dust · Embers · Sparkles · VolumetricBeams" sub="Canvas2D, depth of field" />
  </AbsoluteFill>
);
const V9: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <SpaceBackdrop />
      <HoloGrid speed={0.03} />
      <GlassPanel x={560} y={330} w={800} h={420} />
      <Glint x={1350} y={340} size={220} intensity={lin(f, 0, 20)} />
      <Flash at={4} color="white" max={0.7} />
      <Flash at={18} color="violet" max={0.6} bloom x={960} y={540} />
      <Strobe frames={[34, 38, 42, 46]} color="cyan" max={0.45} />
      <Letterbox height={mix(0, 118, easeInOutCubic(lin(f, 0, 30)))} hairline />
      <Vignette amount={0.55} />
      <FilmGrain amount={0.08} />
      <Tag n={10} title="Flash · Strobe · Letterbox · Grain · Vignette" />
    </AbsoluteFill>
  );
};

const LIST = [V0, V1, V2, V3, V4, V5, V6, V7, V8, V9];

export const Scene: React.FC<SceneProps> = () => (
  <AbsoluteFill style={{background: '#04020A'}}>
    {LIST.map((C, i) => (
      <Sequence key={i} from={i * V} durationInFrames={V}>
        <C />
      </Sequence>
    ))}
  </AbsoluteFill>
);
