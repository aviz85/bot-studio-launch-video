/*
 * s04 · "Build with AI" · beats 40–52 (global frames 1075–1397) · Drop 1 groove (kick every beat)
 * Story: you DESCRIBE a bot, and a whole system assembles. Copy: "Describe it." → "Get a whole bot."
 *
 * SHOT LIST (cuts on B(k); local frame = B(k) − 1075)
 *  #  beat   local  shot                                     camera / lens                         transition in
 *  A  40     0      MACRO TYPE — holo prompt line types        85 mm oblique macro, trucks with the  whip right (half,
 *                   fast; per-word DOF, newest word sharp,     caret, low + dutch −6°, rack focus     from s03)
 *                   older text recedes into bokeh              foreground sparkle → caret (40→40.9)
 *  B  42     53     "DESCRIBE IT." — the whole holo prompt     30 mm low-angle dutch +7°, slow push   flash cut (cyan)
 *                   card, typing completes, copy lands left    + orbit, lens flare on the button
 *  C  43.5   94     CHARGE — crash zoom onto "Build a          30→64 mm crash zoom, dutch −12°,       hard cut (half beat)
 *                   proposal", energy sucked in, click 43.75   handheld, motion blur
 *  D  44     107    BURST — press: shockwave across the glass, 24 mm high angle, recoil dolly back,   white flash cut (hit)
 *                   energy burst, flare burst; 3 bolts fire     kick shake
 *  E  45     134    SLAM 1 "4 states" from deep left            28 mm low angle, dutch −10°           hard cut
 *  F  46     161    SLAM 2 "6 judgments" from top right         30 mm high angle, dutch +9°           hard cut
 *  G  47     188    SLAM 3 "5 policies" from below, then a      26 mm extreme low → expo pull-back    hard cut
 *                   pull-back reveals the assembled row         to the full row
 *  H  48     215    PROPOSAL — rows fly in on half beats        32 mm high 3/4, lateral track down    whip down
 *                   (48, 48.5, 49, 49.5) and project holograms  the rows, focus follows newest row
 *                   (intent chip, state orb, ƒ card, judgment)
 *  I  50     268    "GET A WHOLE BOT." — fast pull-back to the  28→30 mm: expo pull-back, glide,      pistachio flash cut
 *                   page + the generated bot (orbs, trails,     expo-in push into collect_details
 *                   chips); dive into the orb at 51.5→52        → zoom-through OUT (half, into s05)
 *
 * Life: handheld everywhere, kickPush/kickShake on the GLOBAL frame, dust/bokeh parallax, HUD tags.
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import type {SceneProps} from '../cine/types';
import {Shots, beatShots, whip, flashCut, cut, zoomThrough} from '../cine';
import {MacroShot} from './s04/macro';
import {DescribeShot, ChargeShot, BurstShot} from './s04/prompt';
import {StatShot, KEYS_E, KEYS_F, KEYS_G} from './s04/stats';
import {ProposalShot} from './s04/proposal';
import {WholeShot} from './s04/whole';

export const Scene: React.FC<SceneProps> = ({from, dur}) => {
  const t = useCurrentFrame();
  const shots = beatShots(from, dur, [
    {beat: 40, name: 'A macro type', in: whip({dir: 'right', dur: 10}), render: (lt, _p, i) => <MacroShot lt={lt} t={i.from + lt} from={from} />},
    {beat: 42, name: 'B describe it', in: flashCut({dur: 8, peak: 0.55, color: '#CFF6FF'}), render: (lt, _p, i) => <DescribeShot lt={lt} t={i.from + lt} from={from} />},
    {beat: 43.5, name: 'C charge', in: cut(), render: (lt, _p, i) => <ChargeShot lt={lt} t={i.from + lt} from={from} />},
    {beat: 44, name: 'D burst', in: flashCut({dur: 12, split: 0.25, peak: 0.78, color: '#EAF9FF', punch: 0.08}), render: (lt, _p, i) => <BurstShot lt={lt} t={i.from + lt} from={from} />},
    {beat: 45, name: 'E slam states', in: cut(), render: (lt, _p, i) => <StatShot which={0} lt={lt} t={i.from + lt} from={from} keys={KEYS_E} label="States" />},
    {beat: 46, name: 'F slam judgments', in: cut(), render: (lt, _p, i) => <StatShot which={1} lt={lt} t={i.from + lt} from={from} keys={KEYS_F} label="Judgments" />},
    {beat: 47, name: 'G slam policies', in: cut(), render: (lt, _p, i) => <StatShot which={2} lt={lt} t={i.from + lt} from={from} keys={KEYS_G} label="Policies" />},
    {beat: 48, name: 'H proposal', in: whip({dir: 'down', dur: 10}), render: (lt, _p, i) => <ProposalShot lt={lt} t={i.from + lt} from={from} />},
    {beat: 50, name: 'I whole bot', in: flashCut({dur: 10, peak: 0.45, color: '#E7F4B9'}), out: zoomThrough({dur: 16}), render: (lt, _p, i) => <WholeShot lt={lt} t={i.from + lt} from={from} />},
  ]);
  return (
    <AbsoluteFill style={{background: '#04020A'}}>
      <Shots shots={shots} t={t} />
    </AbsoluteFill>
  );
};
