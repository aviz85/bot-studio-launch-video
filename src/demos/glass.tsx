import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import type {SceneProps} from '../cine/types';

// TEMP experiment: backdrop-filter behaviour in headless Chromium.
const Pattern: React.FC = () => (
  <AbsoluteFill style={{background: 'repeating-linear-gradient(90deg, #ff3b6b 0 40px, #1a0b33 40px 80px, #39d0ff 80px 120px, #1a0b33 120px 160px)'}}>
    {Array.from({length: 12}).map((_, i) => (
      <div key={i} style={{position: 'absolute', left: 0, top: i * 90, fontSize: 64, fontWeight: 900, color: '#fff', fontFamily: 'Inter', whiteSpace: 'nowrap'}}>BACKDROP TEST BACKDROP TEST BACKDROP TEST</div>
    ))}
  </AbsoluteFill>
);

const pane = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  position: 'absolute', width: 360, height: 300, borderRadius: 28, background: 'rgba(250,247,255,0.35)', border: '1px solid rgba(255,255,255,0.8)',
  fontFamily: 'Inter', fontSize: 28, fontWeight: 800, color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', ...extra,
});
const BF = 'blur(18px) saturate(1.6)';

export const Scene: React.FC<SceneProps> = () => {
  const f = useCurrentFrame();
  if (f < 10) {
    return (
      <AbsoluteFill>
        <Pattern />
        <div style={pane({left: 60, top: 100})}>plain rgba</div>
        <div style={pane({left: 500, top: 100, backdropFilter: BF, WebkitBackdropFilter: BF} as any)}>backdrop flat</div>
        <div style={{position: 'absolute', left: 940, top: 100, opacity: 0.9}}><div style={pane({left: 0, top: 0, backdropFilter: BF} as any)}>parent opacity .9</div></div>
        <div style={{position: 'absolute', left: 1380, top: 100, filter: 'drop-shadow(0 0 20px #f0f)'}}><div style={pane({left: 0, top: 0, backdropFilter: BF} as any)}>parent filter</div></div>
        <div style={pane({left: 60, top: 600, backdropFilter: BF, opacity: 0.6} as any)}>self opacity .6</div>
        <div style={{position: 'absolute', left: 500, top: 600, transform: 'rotate(8deg) scale(1.1)'}}><div style={pane({left: 0, top: 0, backdropFilter: BF} as any)}>2D transform parent</div></div>
        <div style={{position: 'absolute', left: 940, top: 600, overflow: 'hidden', width: 400, height: 340}}><div style={pane({left: 0, top: 0, backdropFilter: BF} as any)}>overflow hidden parent</div></div>
        <div style={pane({left: 1380, top: 600, backdropFilter: BF, transform: 'perspective(800px) rotateY(35deg)'} as any)}>self perspective rotY</div>
      </AbsoluteFill>
    );
  }
  if (f < 20) {
    // Everything inside one preserve-3d context: pattern plane at -400, panes in Z.
    return (
      <AbsoluteFill style={{background: '#000', perspective: 1400}}>
        <AbsoluteFill style={{transformStyle: 'preserve-3d', transform: 'rotateY(-28deg) rotateX(8deg)'}}>
          <div style={{position: 'absolute', inset: 0, transform: 'translateZ(-400px) scale(1.4)'}}><Pattern /></div>
          <div style={pane({left: 200, top: 300, transform: 'translateZ(0px)', backdropFilter: BF} as any)}>3D z0 backdrop</div>
          <div style={pane({left: 700, top: 300, transform: 'translateZ(200px)', backdropFilter: BF} as any)}>3D z200 backdrop</div>
          <div style={pane({left: 1200, top: 300, transform: 'translateZ(200px)'} as any)}>3D z200 plain</div>
          <div style={pane({left: 700, top: 650, transform: 'translateZ(100px)', background: 'rgba(250,247,255,0.35)', backdropFilter: BF} as any)}>3D z100 overlapping</div>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  // Background flat outside 3D; panes inside preserve-3d context.
  return (
    <AbsoluteFill>
      <Pattern />
      <AbsoluteFill style={{perspective: 1400}}>
        <AbsoluteFill style={{transformStyle: 'preserve-3d', transform: 'rotateY(-28deg) rotateX(8deg)'}}>
          <div style={pane({left: 200, top: 300, transform: 'translateZ(0px)', backdropFilter: BF} as any)}>bg outside, z0</div>
          <div style={pane({left: 700, top: 300, transform: 'translateZ(300px)', backdropFilter: BF} as any)}>bg outside, z300</div>
          <div style={pane({left: 1200, top: 300, transform: 'translateZ(-300px)', backdropFilter: BF} as any)}>bg outside, z-300</div>
          <div style={pane({left: 700, top: 600, transform: 'translateZ(150px)', backdropFilter: BF} as any)}>overlap z150</div>
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
