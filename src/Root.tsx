import React from 'react';
import {AbsoluteFill, Audio, Composition, Sequence, staticFile} from 'remotion';
import {B, DURATION, FPS} from './lib';
import {Intro, BuildUp, LogoDrop, BuildAI, States, Roles, Judgments, Policies, Clerk} from './scenes/part1';
import {Breakdown, Dashboard, ChatScene, TimelineScene, BotScript, Factory, Montage, Final} from './scenes/part2';

type S = [number, number, React.FC<{from: number}> | React.FC];
const SCENES: S[] = [
  [0, 16, Intro], [16, 32, BuildUp], [32, 40, LogoDrop], [40, 52, BuildAI], [52, 64, States], [64, 72, Roles],
  [72, 80, Judgments], [80, 88, Policies], [88, 96, Clerk], [96, 104, Breakdown], [104, 120, Dashboard],
  [120, 128, ChatScene], [128, 132, TimelineScene], [132, 140, BotScript], [140, 152, Factory], [152, 160, Montage], [160, -1, Final],
];

export const Launch: React.FC = () => (
  <AbsoluteFill style={{background: '#05020A'}}>
    {SCENES.map(([a, b, Comp], i) => {
      const from = B(a);
      const dur = (b < 0 ? DURATION : B(b)) - from;
      const C = Comp as React.FC<{from: number}>;
      return (
        <Sequence key={i} from={from} durationInFrames={dur}>
          <C from={from} />
        </Sequence>
      );
    })}
    <Audio src={staticFile('music.mp3')} />
  </AbsoluteFill>
);

export const Root: React.FC = () => (
  <>
    <Composition id="Launch" component={Launch} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} />
  </>
);
