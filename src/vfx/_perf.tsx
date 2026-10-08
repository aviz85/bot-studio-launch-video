import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import type {SceneProps} from '../cine/types';
import * as X from './index';
const Panel: React.FC<{f: number}> = ({f}) => (
  <div style={{position: 'absolute', left: 560, top: 330, width: 800, height: 420, borderRadius: 28, background: 'linear-gradient(160deg, #2a1846, #120a20)', border: '1px solid #8C6BEA'}}>
    {Array.from({length: 20}).map((_, i) => <div key={i} style={{position: 'absolute', left: 30 + i * 37, bottom: 30, width: 24, height: 100 + 150 * Math.abs(Math.sin(i + f * 0.1)), background: 'linear-gradient(#7FE7FF,#36997D)', borderRadius: 6}} />)}
    <div style={{position: 'absolute', left: 30, top: 24, color: '#fff', font: '700 28px Inter'}}>Signal Wall</div>
  </div>
);
const T: React.FC<{f: number}>[] = [
  () => null,
  ({f}) => <X.SpaceBackdrop frame={f} />,
  ({f}) => <X.HoloGrid frame={f} />,
  ({f}) => <X.HoloTunnel frame={f} />,
  ({f}) => <X.DataRain frame={f} />,
  ({f}) => <X.Scanlines frame={f} />,
  ({f}) => <X.LensFlare x={300 + (f % 60) * 20} y={300} frame={f} />,
  ({f}) => <X.FlareBurst x={960} y={540} at={0} frame={4 + (f % 30)} />,
  ({f}) => <X.Glint x={900} y={500} frame={f} />,
  ({f}) => <X.LightStreak start={0} frame={2 + (f % 18)} />,
  ({f}) => <X.Swoosh start={0} frame={2 + (f % 16)} />,
  ({f}) => <X.SpeedLines intensity={1} frame={f} />,
  ({f}) => <X.LightLeak start={0} dur={50} frame={10 + (f % 30)} />,
  ({f}) => <X.GodRays x={960} y={440} frame={f} />,
  ({f}) => <X.VolumetricBeams beams={[{x: 500, y: -80, angle: 72, sweep: 6}, {x: 1400, y: -80, angle: 110, sweep: 6}]} frame={f} />,
  ({f}) => <X.Bloom intensity={0.8}><Panel f={f} /></X.Bloom>,
  ({f}) => <X.Bloom intensity={0.8} cheap><Panel f={f} /></X.Bloom>,
  ({f}) => <X.ChromaticAberration amount={8}><Panel f={f} /></X.ChromaticAberration>,
  ({f}) => <X.Glitch amount={1} frame={f}><Panel f={f} /></X.Glitch>,
  ({f}) => <X.Shockwave x={960} y={540} at={0} frame={2 + (f % 36)} />,
  ({f}) => <X.Shockwave x={960} y={540} at={0} frame={2 + (f % 36)} distort />,
  ({f}) => <X.Shockwave x={960} y={540} at={0} frame={2 + (f % 36)} refract />,
  ({f}) => <X.EnergyBurst x={960} y={540} at={0} frame={2 + (f % 45)} />,
  ({f}) => <X.DustField frame={f} />,
  ({f}) => <X.Bokeh frame={f} />,
  ({f}) => <X.Sparkles frame={f} />,
  ({f}) => <X.Embers frame={f} />,
  ({f}) => <X.HUDFrame frame={f} />,
  ({f}) => <><X.Reticle x={600} y={400} w={300} h={200} start={0} frame={f % 60} label="Judge" value="0.92" /><X.DataTicker x={1300} y={300} title="Log" frame={f} /></>,
  ({f}) => <X.FilmGrain amount={0.06} frame={f} />,
  () => <X.Vignette amount={0.4} />,
  ({f}) => <X.GlobalGrade frame={f} />,
  ({f}) => <X.Flash at={0} bloom frame={f % 30} />,
  ({f}) => <Panel f={f} />,
];
export const Scene: React.FC<SceneProps> = () => {
  const f = useCurrentFrame();
  const C = T[Math.floor(f / 60)] ?? T[0];
  return <AbsoluteFill style={{background: '#120726'}}><C f={f} /></AbsoluteFill>;
};
