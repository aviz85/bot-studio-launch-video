import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import type {SceneProps} from '../cine/types';

// STUB — owned by the s05 scene agent.
export const Scene: React.FC<SceneProps> = ({from, dur}) => {
  const t = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#05020A', color: '#CDBBFF', justifyContent: 'center', alignItems: 'center', fontFamily: 'Inter', fontSize: 60}}>
      s05 · frame {t + from} · {dur}f
    </AbsoluteFill>
  );
};
