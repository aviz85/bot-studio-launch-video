import React from 'react';
import {AbsoluteFill, Audio, Composition, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {B, DURATION, FPS} from './lib';
import {SCENE_DEFS} from './scenes/registry';
import {GlobalGrade} from './vfx';
import {Scene as S01} from './scenes/s01';
import {Scene as S02} from './scenes/s02';
import {Scene as S03} from './scenes/s03';
import {Scene as S04} from './scenes/s04';
import {Scene as S05} from './scenes/s05';
import {Scene as S06} from './scenes/s06';
import {Scene as S07} from './scenes/s07';
import {Scene as S08} from './scenes/s08';
import {Scene as S09} from './scenes/s09';
import {Scene as S10} from './scenes/s10';

export const AUDIO_DELAY_FRAMES = 2;

export const SCENE_COMPONENTS: Record<string, React.FC<{from: number; dur: number}>> = {
  s01: S01, s02: S02, s03: S03, s04: S04, s05: S05, s06: S06, s07: S07, s08: S08, s09: S09, s10: S10,
};

export const sceneRange = (id: string) => {
  const d = SCENE_DEFS.find((s) => s.id === id)!;
  const from = B(d.startBeat);
  const to = d.endBeat === null ? DURATION : B(d.endBeat);
  return {from, dur: to - from};
};

const Grade: React.FC = () => {
  const f = useCurrentFrame();
  return <GlobalGrade frame={f} />;
};

export const Launch: React.FC = () => (
  <AbsoluteFill style={{background: '#05020A'}}>
    {SCENE_DEFS.map((d) => {
      const {from, dur} = sceneRange(d.id);
      const C = SCENE_COMPONENTS[d.id];
      return (
        <Sequence key={d.id} from={from} durationInFrames={dur} name={d.title}>
          <C from={from} dur={dur} />
        </Sequence>
      );
    })}
    <Grade />
    {/* The music's transients sit ~30 ms ahead of the B(k) grid the picture is cut to; a 2-frame
        (33 ms) delay puts the drops and flash cuts on the hits (measured at 860, 2794, 4298). */}
    <Sequence from={AUDIO_DELAY_FRAMES} name="Soundtrack">
      <Audio src={staticFile('mix.wav')} />
    </Sequence>
  </AbsoluteFill>
);

export const Root: React.FC = () => (
  <Composition id="Launch" component={Launch} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} />
);
