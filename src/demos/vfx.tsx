import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import type {SceneProps} from '../cine/types';
import * as X from '../vfx';
const Panel: React.FC = () => (
  <div style={{position: 'absolute', left: 560, top: 330, width: 800, height: 420, borderRadius: 28, background: 'linear-gradient(160deg, #2a1846, #120a20)', border: '1px solid #8C6BEA'}}>
    {Array.from({length: 20}).map((_, i) => <div key={i} style={{position: 'absolute', left: 30 + i * 37, bottom: 30, width: 24, height: 100 + (i * 53) % 250, background: 'linear-gradient(#7FE7FF,#36997D)', borderRadius: 6}} />)}
    <div style={{position: 'absolute', left: 30, top: 24, color: '#fff', font: '700 28px Inter'}}>Signal Wall</div>
  </div>
);
const T: Record<number, React.FC<{f: number}>> = {
  0: ({f}) => <><X.SpaceBackdrop frame={f} /><X.HoloGrid frame={f} /></>,
  1: ({f}) => <><X.SpaceBackdrop frame={f} haze={0} /><X.GodRays x={960} y={440} frame={f} /></>,
  2: ({f}) => <><X.SpaceBackdrop frame={f} palette="mixed" /><X.LensFlare x={500 + f} y={300} frame={f} /></>,
};
export const Scene: React.FC<SceneProps> = () => {
  const f = useCurrentFrame();
  const id = Math.floor(f / 100);
  const C = T[id] ?? T[0];
  return <AbsoluteFill style={{background: '#120726'}}><C f={f} /></AbsoluteFill>;
};
