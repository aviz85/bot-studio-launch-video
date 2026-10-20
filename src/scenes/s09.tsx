/* =====================================================================================================
 * s09 · Conversation & code · beats 120–140 (global frames 3224–3761) · Drop 2 groove, kick every beat.
 *
 * SHOT LIST (cuts on B(k) / half beats; local frame = B(k) − 3224)
 *  ch.1 CONVERSATION — glass bubbles float in 3D as a depth "scroll"; copy column left: "Reacts instantly. / Talks naturally."
 *   S1  120   → 121.5  ASK        in: zoom-through (incoming half of s08's zoom-through out). Low-angle dutch push-in; user bubble slams in from in front
 *                                 of the lens; 121 ❤️ reaction bursts (energy sparks, sparkles, glint); chip "Instant reaction".
 *   S2  121.5 → 123.5  PACED      in: whip←. Lateral track along the bot side (DOF on the newest bubble); typing → "Absolutely! 🗓️"
 *                                 (122), typing → "Checking Thursday slots now…" (123); chip "Paced message groups".
 *   S3  123.5 → 125    LANE       in: soft flash. Crane up/tilt down + RACK FOCUS from the chat to the glowing background lane:
 *                                 Clerk create_booking · async scans slots, 3:00 PM ✓ (124.75); chip "Booking ran in the background".
 *   S4  125   → 126    CONFIRM    in: flash cut (impact). 85 mm macro: result beam lane → chat, "Thursday, 3:00 PM is yours."
 *                                 flare; ✓ "Booking confirmed" pill stamps on 125.5.
 *   S5  126   → 128    AMAZING    in: whip↑. Speed-ramped pull-back + crane to a low-angle hero of the whole floating chat;
 *                                 user "Amazing 🔥" (126), 🙌 (126.5); chip "Files · voice · GIFs".
 *  ch.2 TIMELINE — a playhead snaps marker→marker on half beats (speed ramp between events), ms counters roll.
 *   S6  128   → 130    TRACK      in: zoom-through. Macro tracking along the turn timeline, low angle, shallow DOF;
 *                                 Message sent 0 ms (128) · Judge 200 (128.5) · Fields 350 (129) · Prompt 420 (129.5).
 *   S7  130   → 132    REVEAL     in: whip→. Dutch high angle ahead of the playhead; First token 520 (130) · Function 780 (130.5)
 *                                 · Last token 1,240 ms (131: shockwave + flare), then pull back to the whole trace.
 *                                 Copy "Every millisecond, traced." 129.5–131.9 (+ rolling ms HUD readout).
 *  ch.3 BOTSCRIPT — holo code streams in 3D, stamps valid, projects into the UI it defines.
 *   S8  132   → 134    STREAM     in: glitch cut. Low-angle grazing crane along the holo code slab; lines fly in from the
 *                                 lens with light streaks (syntax colours), data rain behind.
 *   S9  134   → 136    MACRO      in: quick flash. Top-down-ish 50 mm macro tracking down the code, rack focus on landing lines.
 *   S10 136   → 137    VALID      in: flash cut (white, impact). "Valid ✓" stamp slams on 136: shockwave, flare, rim flash, sheen.
 *   S11 137   → 140    PROJECT    in: whip←, out: flash ramp + expo push-in peaking on 140 (s10 opens with an in-only flash
 *                                 cut). Orbiting wide: code lines fire
 *                                 light beams into the pieces they define — signal bar (137.5), policy pill goal_clear · yes (138),
 *                                 state orb discover (138.5), function chip create_lead · async (139). Copy "One script." /
 *                                 "For people and agents." (137 / 137.5).
 * ===================================================================================================== */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import type {SceneProps} from '../cine/types';
import {B, kick, clamp, lerp} from '../lib';
import {
  CamSpec, CamKey, V3, addCam, camPath, camMotion, handheld, drift, kickPush, kickZoom, kickShake, resolveCam, depthOf, rackFocus,
  beatShots, whip, flashCut, zoomThrough, glitchCut, heroRamp, Shots, EASES,
} from '../cine';
import {mkL, Title, GRAD_A, GRAD_B, GRAD_C, eo, p01} from './s09/kit';
import {ChatShot, chatCams, chatMsgs, msgPos, LANE, SLOT3} from './s09/chat';
import {TimelineShot, MsReadout, followX, playX, tlX, popAt} from './s09/timeline';
import {CodeShot, lineY, landAt, STAMP, PW} from './s09/code';

const DEBUG = false;

export const Scene: React.FC<SceneProps> = ({from, dur}) => {
  const t = useCurrentFrame();
  const f = t + from;
  const L = mkL(from);
  const cc = chatCams(L);
  const msgs = chatMsgs(L);

  /* ---------------- chapter 1 ---------------- */
  const S1 = (lt: number) => {
    const tt = lt + L(120);
    const cam = addCam(camPath(lt, cc.s1), handheld(lt, 0.8, 11), kickPush(tt + from, 22));
    return <ChatShot t={tt} from={from} L={L} cam={cam} aperture={5} focus={msgPos(msgs, 0, tt)} heartFx />;
  };
  const S2 = (lt: number) => {
    const tt = lt + L(121.5);
    const newest = tt < L(122.5) ? 1 : 2;
    const cam = addCam(camPath(lt, cc.s2), handheld(lt, 0.7, 12), kickPush(tt + from, 18));
    return <ChatShot t={tt} from={from} L={L} cam={cam} aperture={7} focus={msgPos(msgs, newest, tt)} />;
  };
  const S3 = (lt: number) => {
    const tt = lt + L(123.5);
    const cam = addCam(camPath(lt, cc.s3), drift(lt, 1, 13), kickZoom(tt + from, 0.012));
    const rc = resolveCam(cam);
    const fd = rackFocus(lt, depthOf(rc, msgPos(msgs, 2, tt)), depthOf(rc, LANE), 6, 16);
    return <ChatShot t={tt} from={from} L={L} cam={cam} aperture={9} focus={fd} near={[260, 900]} />;
  };
  const S4 = (lt: number) => {
    const tt = lt + L(125);
    const tg = msgPos(msgs, 3, tt);
    const cam = addCam({...camPath(lt, cc.s4), target: [tg[0] - 60, tg[1] + 30, tg[2]]}, handheld(lt, 0.9, 14), kickShake(tt + from, 0.6));
    return <ChatShot t={tt} from={from} L={L} cam={cam} aperture={80} maxBlur={16} focus={tg} />;
  };
  const r5 = heroRamp(L(128) - L(126), L(128) - L(126), {fast: 2.6, slow: 0.45, inFrac: 0.2, outFrac: 0.12});
  const S5 = (lt: number) => {
    const tt = lt + L(126);
    const at = (x: number) => camPath(r5.time(x), cc.s5);
    const m = camMotion(at, lt);
    const cam = addCam(at(lt), handheld(lt, 0.6, 15), kickPush(tt + from, 16));
    return <ChatShot t={tt} from={from} L={L} cam={cam} aperture={4} focus={msgPos(msgs, 4, tt)} blur={{vx: m.dx, vy: m.dy}} />;
  };

  /* ---------------- chapter 2 ---------------- */
  const tlCamA = (tt: number): CamSpec => {
    const cx = followX(L, tt, 5);
    return {pos: [cx - 600, 200, 1300], lookAt: [cx + 160, -95, 0], focal: 38, roll: -5};
  };
  const S6 = (lt: number) => {
    const tt = lt + L(128);
    const at = (x: number) => addCam(tlCamA(x + L(128)), handheld(x, 0.7, 16));
    const m = camMotion(at, lt);
    const cam = addCam(at(lt), kickPush(tt + from, 20));
    return <TimelineShot t={tt} from={from} L={L} cam={cam} aperture={9} focus={[playX(L, tt), 0, 0]} blur={{vx: m.dx * 0.8, vy: m.dy * 0.8}} />;
  };
  const tlCamB = (tt: number): CamSpec => {
    const cx = followX(L, tt, 5);
    const follow: CamSpec = {pos: [cx + 420, -400, 1500], lookAt: [cx - 150, -140, 0], focal: 36, roll: 6};
    const u = EASES.expoInOut(clamp((tt - L(131) - 3) / 24));
    if (u <= 0) return follow;
    const wide: CamSpec = {pos: [2450, -520, 2350], lookAt: [380, -150, -60], focal: 32, roll: 3};
    const mixV = (a: V3, b: V3): V3 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
    return {pos: mixV(follow.pos!, wide.pos!), lookAt: mixV(follow.lookAt!, wide.lookAt!), focal: lerp(36, 32, u), roll: lerp(6, 3, u)};
  };
  const S7 = (lt: number) => {
    const tt = lt + L(130);
    const at = (x: number) => addCam(tlCamB(x + L(130)), handheld(x, 0.6, 17));
    const m = camMotion(at, lt);
    const cam = addCam(at(lt), kickPush(tt + from, 18));
    return <TimelineShot t={tt} from={from} L={L} cam={cam} aperture={4 * (1 - eo((tt - L(131)) / 20))} focus={[playX(L, tt), 0, 0]} blur={{vx: m.dx * 0.8, vy: m.dy * 0.8}} />;
  };

  /* ---------------- chapter 3 ---------------- */
  // camera follows the newest landed code line (exp-smoothed)
  const followLine = (tt: number, lag = 4) => {
    let s = 0, w = 0;
    for (let k = 0; k < 14; k++) {
      let nn = 0;
      for (let i = 0; i < 22; i++) if (tt - k >= landAt(L, i) + 2) nn = i;
      const q = Math.exp(-k / lag);
      s += q * lineY(nn);
      w += q;
    }
    return s / w;
  };
  // starts tight on line 1, pulls back + cranes while the slab fills with code
  const s8: CamKey[] = [
    {at: 0, target: [-230, lineY(0) + 30, 0], yaw: 36, pitch: 11, dist: 640, roll: -9, focal: 24},
    {at: L(134) - L(132), ease: 'cubicInOut', target: [90, lineY(9), 0], yaw: 22, pitch: 5, dist: 1450, roll: -4},
  ];
  const S8 = (lt: number) => {
    const tt = lt + L(132);
    const cam = addCam(camPath(lt, s8), handheld(lt, 0.8, 18), kickPush(tt + from, 22));
    return <CodeShot t={tt} from={from} L={L} cam={cam} aperture={6} focus={[0, followLine(tt), 0]} rain={0.55} rays={0.55} />;
  };
  const S9 = (lt: number) => {
    const tt = lt + L(134);
    let n = 0;
    for (let i = 0; i < 22; i++) if (tt >= landAt(L, i) + 4) n = i;
    const ty = followLine(tt);
    const cam = addCam({target: [60 + lt * 1.2, ty - 20, 0], yaw: -17 + lt * 0.08, pitch: -22, dist: 1500 - lt * 2, roll: 5, focal: 50}, handheld(lt, 0.8, 19), kickPush(tt + from, 16));
    return <CodeShot t={tt} from={from} L={L} cam={cam} aperture={13} focus={[60, lineY(n), 0]} rain={0.35} />;
  };
  const S10 = (lt: number) => {
    const tt = lt + L(136);
    const cam = addCam({target: [STAMP[0] - 120, STAMP[1] + 150, 0], yaw: -12 + lt * 0.12, pitch: -3, dist: 1550 - 120 * eo(lt / 26), roll: 5 - lt * 0.1, focal: 45}, kickShake(tt + from, 1.3), handheld(lt, 1, 20));
    return <CodeShot t={tt} from={from} L={L} cam={cam} aperture={0} rain={0.3} />;
  };
  const s11: CamKey[] = [
    {at: 0, target: [640, 40, 120], yaw: -27, pitch: 5, dist: 2700, roll: -4, focal: 30},
    {at: L(140) - L(137) - 12, ease: 'sine', target: [660, 60, 160], yaw: -14, pitch: 8, dist: 2450, roll: -1.5},
    {at: L(140) - L(137), ease: 'expoIn', target: [700, 40, 200], yaw: -10, pitch: 7, dist: 1650, roll: 2},
  ];
  const S11 = (lt: number) => {
    const tt = lt + L(137);
    const cam = addCam(camPath(lt, s11), drift(lt, 1, 21), kickPush(tt + from, 20));
    return (
      <CodeShot t={tt} from={from} L={L} cam={cam} pieces rain={0.25} rays={0.45}>
        <Title t={tt} x={1790} y={760} align="right" w={1500} sheen={[L(138.5), L(139.5)]}
          lines={[{text: 'One script.', at: L(137) + 3, size: 104, grad: GRAD_A}, {text: 'For people and agents.', at: L(137.5) + 2, size: 64, grad: GRAD_B, weight: 800, tracking: -0.03, gap: 6}]} />
      </CodeShot>
    );
  };

  const shots = beatShots(from, dur, [
    {beat: 120, name: 'S1 ask', in: zoomThrough({dur: 16}), render: S1},
    {beat: 121.5, name: 'S2 paced', in: whip({dir: 'left', dur: 10, seed: 3}), render: S2},
    {beat: 123.5, name: 'S3 lane', in: flashCut({dur: 7, peak: 0.35, color: '#CFF6FF', punch: 0.03}), render: S3},
    {beat: 125, name: 'S4 confirm', in: flashCut({dur: 10, peak: 0.8, color: '#E8FFF4'}), render: S4},
    {beat: 126, name: 'S5 amazing', in: whip({dir: 'up', dur: 10, seed: 5}), render: S5},
    {beat: 128, name: 'S6 track', in: zoomThrough({dur: 14, depth: 2.2}), render: S6},
    {beat: 130, name: 'S7 reveal', in: whip({dir: 'right', dur: 10, seed: 7}), render: S7},
    {beat: 132, name: 'S8 stream', in: glitchCut({dur: 6, slices: false, seed: 4}), render: S8},
    {beat: 134, name: 'S9 macro', in: flashCut({dur: 6, peak: 0.4, color: '#CFF6FF', punch: 0.04}), render: S9},
    {beat: 136, name: 'S10 valid', in: flashCut({dur: 14, peak: 0.78, color: '#F4FFE0'}), render: S10},
    {beat: 137, name: 'S11 project', in: whip({dir: 'left', dur: 10, seed: 9}), out: flashCut({dur: 14, split: 0.35, peak: 0.85}), render: S11},
  ]);

  // screen-space copy that rides over the cuts
  const ch1 = t >= L(120.9) && t < L(125);
  const ch2 = t >= L(128) && t < L(132);
  return (
    <AbsoluteFill style={{background: '#04020A'}}>
      <Shots shots={shots} t={t} debug={DEBUG} />
      {ch1 ? (
        <Title t={t} x={124} y={262} w={720} out={L(124.5) + 1} sheen={[L(123.5)]} kicker={{text: 'Conversation', at: L(121)}}
          lines={[
            {text: 'Reacts', at: L(121), size: 118, grad: GRAD_A},
            {text: 'instantly.', at: L(121) + 4, size: 118, grad: GRAD_A},
            {text: 'Talks', at: L(122.25), size: 118, grad: GRAD_B, gap: 26},
            {text: 'naturally.', at: L(122.25) + 4, size: 118, grad: GRAD_B},
          ]} />
      ) : null}
      {ch2 ? (
        <>
          <MsReadout t={t} L={L} o={eo((t - L(128) - 6) / 10) * (1 - p01(t, L(131.75), 6))} x={1520} y={150} />
          <Title t={t} x={960} y={826} w={1700} align="center" out={L(131.8)} sheen={[L(131)]}
            lines={[{text: 'Every millisecond, traced.', at: L(129.5), size: 96, grad: GRAD_C}]} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};
