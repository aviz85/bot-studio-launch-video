// Shot A (beats 40–42): extreme macro along the holographic prompt line. Long lens, oblique angle, the caret
// is tracked by the camera; per-word depth of field keeps the newest word sharp while older text recedes into
// bokeh. Opens with a rack focus from a foreground holo sparkle to the caret.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {DISPLAY, FONT, kick} from '../../lib';
import {World, Obj, CamSpec, addCam, handheld, kickPush, depthOf, resolveCam, project, V3, rackFocus} from '../../cine';
import {DustField, Bokeh, Glint} from '../../vfx';
import {Icon} from '../../ui/kit';
import {Sky, HudTag, Brackets, layoutWords, caretX, typedAt, charTime, kf, sat, pr, N_CHARS, PROMPT} from './common';

const FS = 104; // native font size (render large → crisp macro)
const WORDS = layoutWords(FS);
const LINE_W = caretX(N_CHARS, FS);

/** one word of the prompt; characters typed in the last few frames glow hot cyan */
const Word: React.FC<{text: string; start: number; t: number; n: number; w: number}> = ({text, start, t, n, w}) => {
  const shown = Math.max(0, Math.min(text.length, Math.floor(n) - start));
  if (shown <= 0) return null;
  const recent = t - charTime(start + shown - 1) < 18;
  return (
    <div style={{width: w + 6, height: 140, fontFamily: FONT, fontWeight: 500, fontSize: FS, lineHeight: '140px', whiteSpace: 'pre', color: '#F1ECFF',
      textShadow: '0 0 22px rgba(160,130,255,0.85), 0 0 3px rgba(255,255,255,0.6)'}}>
      {recent
        ? [...text.slice(0, shown)].map((c, i) => {
            const age = t - charTime(start + i);
            const hot = sat(1 - age / 14);
            return (
              <span key={i} style={{color: hot > 0.02 ? `rgb(${Math.round(241 - 50 * hot)},${Math.round(236 + 19 * hot)},255)` : undefined,
                textShadow: hot > 0.02 ? `0 0 ${(22 + 30 * hot).toFixed(0)}px rgba(127,231,255,${(0.6 + 0.4 * hot).toFixed(2)}), 0 0 4px rgba(255,255,255,${(0.6 + 0.4 * hot).toFixed(2)})` : undefined}}>{c}</span>
            );
          })
        : text}
    </div>
  );
};

export const MacroShot: React.FC<{lt: number; t: number; from: number}> = ({lt, t, from}) => {
  const f = t + from;
  const n = typedAt(t);
  const cx = caretX(n, FS);
  // smoothed caret follow (camera lags slightly behind, then catches up)
  const follow = caretX(typedAt(t - 3), FS);
  const target: V3 = [follow - 120, -6, 0];
  const camAt = (x: number, tgt: V3): CamSpec => ({
    target: tgt,
    yaw: kf(x, [[0, -50], [53, -38]]),
    pitch: kf(x, [[0, 10], [53, 6]]),
    roll: kf(x, [[0, -7], [53, -4]]),
    dist: kf(x, [[0, 3500], [24, 3750], [53, 3900]]),
    focal: 85,
  });
  const base = camAt(lt, target);
  const cam = addCam(base, handheld(lt, 0.7, 4), kickPush(f, 40, 6));
  const rc = resolveCam(cam);
  // foreground holo sparkle: placed relative to the OPENING camera so it is framed (upper left) at the cut
  const c0 = resolveCam(camAt(0, [caretX(typedAt(-3), FS) - 120, -6, 0]));
  const SPARK: V3 = [c0.pos[0] + c0.f[0] * 1500 - c0.r[0] * 150 - c0.d[0] * 75, c0.pos[1] + c0.f[1] * 1500 - c0.r[1] * 150 - c0.d[1] * 75, c0.pos[2] + c0.f[2] * 1500 - c0.r[2] * 150 - c0.d[2] * 75];
  const caretP: V3 = [cx, 0, 0];
  const focus = rackFocus(lt, depthOf(rc, SPARK), depthOf(rc, caretP), 5, 17);
  const cp = project(rc, [cx + 6, -4, 0]);
  const blink = 1;
  const plateX = Math.max(-640 + 1900, follow - 300);
  const k = kick(f, 8);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <Sky cam={cam} from={from} t={t} intensity={0.75} stars={160} />
      <World camera={cam} focus={focus} aperture={34} maxBlur={42}>
        {/* far background: the rest of the prompt card, out of focus */}
        <Obj x={-300} y={-760} z={-2400}>
          <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 120, color: '#E9E1FF', whiteSpace: 'nowrap', letterSpacing: '-0.02em', textShadow: '0 0 40px rgba(160,130,255,0.8)'}}>Describe what you want to build</div>
        </Obj>
        <Obj x={LINE_W - 500} y={640} z={-1600}>
          <div style={{width: 760, height: 150, borderRadius: 75, background: 'linear-gradient(135deg, #A98BFF, #6A45E0)', boxShadow: '0 0 90px rgba(140,107,234,0.9)'}} />
        </Obj>
        {/* field glow + rim lines (holo input) */}
        <Obj x={plateX} y={-12} z={-60} dof={false}>
          <div style={{width: 3800, height: 360, borderRadius: 60, background: 'linear-gradient(180deg, rgba(40,22,80,0.55), rgba(10,5,26,0.62) 60%, rgba(30,14,60,0.5))', boxShadow: 'inset 0 0 0 3px rgba(127,231,255,0.42), inset 0 2px 0 rgba(200,240,255,0.5), 0 0 80px rgba(127,231,255,0.18)'}} />
        </Obj>
        <Obj x={plateX} y={-192} z={-56} dof={false}>
          <div style={{width: 3700, height: 3, background: 'linear-gradient(90deg, transparent, rgba(127,231,255,0.95) 4%, rgba(205,187,255,0.7) 50%, rgba(127,231,255,0.95) 96%, transparent)', boxShadow: '0 0 16px rgba(127,231,255,0.8)'}} />
        </Obj>
        {/* sparkle icon tile at the start of the field (product: prompt card icon) */}
        <Obj x={-420} y={-6} z={-20}>
          <div style={{width: 220, height: 220, borderRadius: 60, background: 'radial-gradient(circle at 40% 35%, rgba(169,139,255,0.55), rgba(40,20,80,0.5))', boxShadow: '0 0 60px -6px rgba(160,130,255,0.8), inset 0 0 0 2px rgba(127,231,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Icon.sparkle size={124} color="#EFE9FF" sw={2.2} />
          </div>
        </Obj>
        {/* the typed words */}
        {WORDS.map((w) => (
          <Obj key={w.start} x={w.x + w.w / 2 + 3} y={0} z={0} w={w.w + 6} h={140}>
            <Word text={w.text} start={w.start} t={t} n={n} w={w.w} />
          </Obj>
        ))}
        {/* caret */}
        {n < N_CHARS + 0.5 && (
          <Obj x={cx + 8} y={-2} z={4} w={9} h={132} dof={false}>
            <div style={{width: 9, height: 132, borderRadius: 5, background: '#CFF6FF', opacity: blink, boxShadow: `0 0 ${18 + 26 * k}px rgba(127,231,255,1), 0 0 4px #fff`}} />
          </Obj>
        )}
        {/* foreground holographic sparkle (rack-focus subject at the start) */}
        <Obj x={SPARK[0]} y={SPARK[1]} z={SPARK[2]} s={0.42} billboard>
          <div style={{width: 520, height: 520, display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'drop-shadow(0 0 30px rgba(127,231,255,0.9))', transform: `rotate(${(lt * 0.8).toFixed(2)}deg)`}}>
            <svg width={440} height={440} viewBox="0 0 24 24" style={{overflow: 'visible'}}>
              <defs>
                <radialGradient id="s04spark" cx="50%" cy="50%" r="50%">
                  <stop offset="0" stopColor="#FFFFFF" />
                  <stop offset="0.35" stopColor="#E9FBFF" />
                  <stop offset="0.7" stopColor="#9FDCFF" stopOpacity="0.75" />
                  <stop offset="1" stopColor="#8C6BEA" stopOpacity="0.25" />
                </radialGradient>
              </defs>
              <path d="M12 1.5l2.2 8.3L22.5 12l-8.3 2.2L12 22.5l-2.2-8.3L1.5 12l8.3-2.2z" fill="url(#s04spark)" stroke="#F2FDFF" strokeWidth={0.25} strokeLinejoin="round" />
            </svg>
          </div>
        </Obj>
        <Obj x={SPARK[0] + 520} y={SPARK[1] - 150} z={SPARK[2] - 500} s={0.5}>
          <div style={{width: 120, height: 120, borderRadius: 60, background: 'radial-gradient(circle, rgba(231,244,185,0.9), rgba(231,244,185,0) 70%)'}} />
        </Obj>
      </World>
      {/* hot glint on the caret */}
      {cp.visible && <Glint x={cp.x} y={cp.y} size={120 + 80 * k} intensity={0.5 + 0.6 * k} spin={0.8} frame={t} />}
      <DustField frame={t} count={90} camX={-follow * 0.35} focus={0.5} boost={k * 0.6} />
      <Bokeh frame={t} count={16} camX={-follow * 0.6} focus={0.05} opacity={0.6} />
      <Brackets t={lt - 2} o={0.7} />
      <HudTag x={150} y={150} t={lt - 4} label="Build with AI · Prompt" value={`${String(Math.floor(n)).padStart(3, '0')} / 1000 chars`} />
      <HudTag x={1770} y={150} t={lt - 8} align="right" label="Input · live" value={`caret ${Math.round(cx).toString().padStart(4, '0')} px`} />
    </AbsoluteFill>
  );
};
