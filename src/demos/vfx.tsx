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
  0: () => null,
  1: ({f}) => <X.SpaceBackdrop frame={f} />,
  2: ({f}) => <X.GodRays x={960} y={440} frame={f} />,
  3: ({f}) => <X.LensFlare x={500 + f} y={300} frame={f} />,
  4: ({f}) => <X.Glitch amount={1} frame={f}><Panel /></X.Glitch>,
  5: ({f}) => <X.ChromaticAberration amount={8}><Panel /></X.ChromaticAberration>,
  6: ({f}) => <X.Bloom intensity={0.8}><Panel /></X.Bloom>,
  7: ({f}) => <X.VolumetricBeams beams={[{x: 500, y: -80, angle: 72, sweep: 5}, {x: 1400, y: -80, angle: 110, sweep: 5}]} frame={f} />,
};
export const Scene: React.FC<SceneProps> = () => {
  const f = useCurrentFrame();
  const id = Math.floor(f / 100);
  const C = T[id] ?? T[0];
  return <AbsoluteFill style={{background: '#120726'}}><C f={f} /></AbsoluteFill>;
};
