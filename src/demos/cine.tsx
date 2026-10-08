// Cine toolkit demo: one 3D set filmed with 13 shots cut on beats, using every transition, camera path,
// speed ramp, rack focus, motion blur and echo trail. Preview:
//   node tools/preview.mjs demo:cine --from 860 --dur 900 --range 860-1760:9
import React from 'react';
import {AbsoluteFill, Img, useCurrentFrame} from 'remotion';
import {FONT, DISPLAY, MONO, kick, band} from '../lib';
import type {SceneProps} from '../cine/types';
import {
  World, Obj, CamSpec, CamKey, addCam, handheld, drift, kickPush, kickShake, kickZoom, camPath, camMotion, moves, heroAngle,
  heroRamp, rackFocus, depthOf, resolveCam, MotionBlur, Echo, Shots, Shot, whip, zoomThrough, flashCut, glitchCut, lightLeakDissolve,
  irisShockwave, spinBlur, cut, FloorGrid, ZoomBlur, SpinBlur, GlitchFx, beatsToLocal, strobe, onBeat, p01, mix, project, V3,
} from '../cine';

/* ------------------------------------------------------------------ */
const PROFILE: string = "bench";
/* Set pieces                                                           */
/* ------------------------------------------------------------------ */
const Glass: React.FC<{w: number; h: number; tone?: 'holo' | 'frost'; title?: string; seed?: number; glow?: number; children?: React.ReactNode}> = ({w, h, tone = 'holo', title, seed = 1, glow = 0.5, children}) => {
  const holo = tone === 'holo';
  return (
    <div style={{
      width: w, height: h, borderRadius: 26, position: 'relative', boxSizing: 'border-box', padding: 26,
      background: holo ? 'linear-gradient(155deg, rgba(58,36,104,0.62) 0%, rgba(22,12,44,0.5) 55%, rgba(30,60,90,0.35) 100%)' : 'linear-gradient(155deg, rgba(246,242,253,0.78) 0%, rgba(228,219,247,0.6) 60%, rgba(214,200,245,0.5) 100%)',
      border: `1.5px solid ${holo ? 'rgba(200,180,255,0.55)' : 'rgba(255,255,255,0.9)'}`,
      boxShadow: PROFILE === 'noshadow' ? undefined : `inset 0 1px 0 rgba(255,255,255,${holo ? 0.45 : 0.9}), inset 0 0 40px rgba(140,107,234,${holo ? 0.25 : 0.12}), 0 0 ${40 + 60 * glow}px rgba(140,107,234,${0.25 + 0.3 * glow})`,
      fontFamily: FONT, color: holo ? '#EDE6FF' : '#39294B', overflow: 'hidden',
    }}>
      <div style={{position: 'absolute', inset: 0, borderRadius: 26, background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 18%)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 2, background: 'linear-gradient(90deg, transparent, #B49BF2, #7FE7FF, transparent)'}} />
      {title ? <div style={{fontWeight: 600, fontSize: 18, letterSpacing: '0.3em', textTransform: 'uppercase', opacity: 0.8, marginBottom: 18}}>{title}</div> : null}
      {children ?? Array.from({length: Math.max(1, Math.floor((h - 90) / 46))}, (_, i) => (
        <div key={i} style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18}}>
          <div style={{width: 22, height: 22, borderRadius: 11, background: i % 3 === 0 ? '#36997D' : i % 3 === 1 ? '#8C6BEA' : '#ECAF42', boxShadow: '0 0 14px currentColor'}} />
          <div style={{height: 12, borderRadius: 6, width: `${30 + 55 * Math.abs(Math.sin(seed * 3.1 + i * 1.7))}%`, background: holo ? 'rgba(220,210,255,0.55)' : 'rgba(57,41,75,0.35)'}} />
        </div>
      ))}
    </div>
  );
};

const Bars: React.FC<{f: number; n?: number}> = ({f, n = 14}) => (
  <div style={{display: 'flex', alignItems: 'flex-end', gap: 12, height: 300}}>
    {Array.from({length: n}, (_, i) => {
      const v = 0.25 + 0.75 * Math.abs(Math.sin(i * 1.37 + f / 9)) * (0.6 + 0.6 * band(f, i % 5));
      const c = v > 0.62 ? '#36997D' : v < 0.35 ? '#ECAF42' : '#8C6BEA';
      return <div key={i} style={{width: 22, height: `${Math.min(100, v * 100)}%`, borderRadius: 11, background: `linear-gradient(180deg, ${c}, rgba(140,107,234,0.2))`, boxShadow: `0 0 18px ${c}`}} />;
    })}
  </div>
);

const Backdrop: React.FC = () => (
  <AbsoluteFill style={{background: 'radial-gradient(120% 90% at 50% 38%, #2A1450 0%, #120726 45%, #04020A 85%)'}}>
    <div style={{position: 'absolute', left: '15%', top: '5%', width: 900, height: 900, borderRadius: '50%', background: 'radial-gradient(circle, rgba(140,107,234,0.32), transparent 65%)'}} />
    <div style={{position: 'absolute', right: '8%', top: '30%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(127,231,255,0.14), transparent 65%)'}} />
  </AbsoluteFill>
);

/** World positions of key set pieces (used for focus/targets). */
const P = {
  hero: [0, -40, 0] as V3,
  near: [-360, -60, 620] as V3,
  far: [520, -120, -900] as V3,
  wall: (i: number): V3 => [-1400 + i * 300, -40, -1100],
  layer: (i: number): V3 => [0, -40, -i * 300],
};

/** The whole set. f = global frame (for audio-reactive bits). */
const Set: React.FC<{f: number; explode?: number}> = ({f, explode = 1}) => (
  <>
    {/* hero: exploded app layers along z */}
    {[0, 1, 2, 3].map((i) => (
      <Obj key={`L${i}`} x={P.layer(i)[0] + i * 26 * explode} y={P.layer(i)[1] - i * 18 * explode} z={P.layer(i)[2] * explode} nearFade={[40, 320]}>
        <Glass w={880} h={540} title={['Live dashboard', 'Signals', 'Policies', 'States'][i]} seed={i + 1} tone={i === 0 ? 'holo' : 'holo'} glow={i === 0 ? 0.9 : 0.4}>
          {i === 1 ? <Bars f={f} /> : undefined}
        </Glass>
      </Obj>
    ))}
    {/* signal wall */}
    {Array.from({length: 10}, (_, i) => (
      <Obj key={`W${i}`} x={P.wall(i)[0]} y={P.wall(i)[1]} z={P.wall(i)[2]}>
        <Glass w={240} h={620} title={`S${i + 1}`} seed={i * 2.3} glow={0.3}>
          <div style={{position: 'absolute', left: 26, right: 26, bottom: 26, height: `${30 + 60 * Math.abs(Math.sin(i * 1.3 + f / 14))}%`, borderRadius: 14, background: 'linear-gradient(180deg, #7FE7FF, rgba(140,107,234,0.25))', boxShadow: '0 0 30px rgba(127,231,255,0.6)'}} />
        </Glass>
      </Obj>
    ))}
    {/* near + far panels (rack focus) */}
    <Obj x={P.near[0]} y={P.near[1]} z={P.near[2]} ry={18}>
      <Glass w={420} h={260} tone="frost" title="Judge · Noul" seed={7}>
        <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 72, letterSpacing: '-0.04em'}}>YES</div>
      </Glass>
    </Obj>
    <Obj x={P.far[0]} y={P.far[1]} z={P.far[2]} ry={-14}>
      <Glass w={520} h={320} title="Score" seed={9}>
        <div style={{fontFamily: MONO, fontSize: 64, color: '#E7F4B9'}}>0.82</div>
      </Glass>
    </Obj>
    {/* title in depth */}
    <Obj x={0} y={-520} z={-1900}>
      <div style={{fontFamily: DISPLAY, fontWeight: 900, fontSize: 260, letterSpacing: '-0.04em', whiteSpace: 'nowrap', backgroundImage: 'linear-gradient(100deg, #FFFFFF 0%, #E2D6FF 40%, #B49BF2 70%, #E7F4B9 100%)', WebkitBackgroundClip: 'text', color: 'transparent'}}>Bot Studio</div>
    </Obj>
    {/* floating chips (billboards) */}
    {Array.from({length: 8}, (_, i) => {
      const a = i * 0.8;
      return (
        <Obj key={`C${i}`} x={Math.cos(a) * 820} y={-260 + (i % 3) * 140} z={Math.sin(a) * 820 - 300} billboard="y">
          <div style={{padding: '12px 22px', borderRadius: 999, border: '1.5px solid rgba(127,231,255,0.7)', background: 'rgba(20,40,60,0.55)', color: '#BFF4FF', fontFamily: FONT, fontWeight: 600, fontSize: 22, letterSpacing: '0.2em', whiteSpace: 'nowrap', boxShadow: '0 0 24px rgba(127,231,255,0.45)'}}>
            {['NOUL', 'SCORE', 'CHOICE', 'CLERK', 'SPEAKER', 'POLICY', 'STATE', 'TRACE'][i]}
          </div>
        </Obj>
      );
    })}
  </>
);

/** Frame the set through a camera, with optional DOF and velocity-driven motion blur. */
const Cam: React.FC<{cam: CamSpec; f: number; focus?: number | V3; aperture?: number; mb?: {vx: number; vy: number}; explode?: number}> = ({cam, f, focus, aperture = 0, mb, explode}) => {
  const world = (
    <World camera={cam} focus={focus} aperture={aperture} backdrop={<><Backdrop />{PROFILE !== 'nogrid' ? <FloorGrid y={460} /> : null}</>}>
      <Set f={f} explode={explode} />
    </World>
  );
  return mb ? <MotionBlur vx={mb.vx} vy={mb.vy}>{world}</MotionBlur> : <AbsoluteFill>{world}</AbsoluteFill>;
};

const Label: React.FC<{text: string; sub?: string}> = ({text, sub}) => (
  <div style={{position: 'absolute', left: 120, top: 120, fontFamily: FONT, color: '#E7F4B9'}}>
    <div style={{fontWeight: 600, fontSize: 20, letterSpacing: '0.3em', textTransform: 'uppercase', opacity: 0.9}}>{text}</div>
    {sub ? <div style={{fontFamily: MONO, fontSize: 18, color: '#BFF4FF', marginTop: 8, opacity: 0.8}}>{sub}</div> : null}
  </div>
);


const uri = (x: string) => `data:image/svg+xml;utf8,${encodeURIComponent(x)}`;
const canvasPng = (w: number, h: number, fn: (x: number, y: number) => number) => {
  if (typeof document === 'undefined') return '';
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const im = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = Math.max(0, Math.min(1, fn((x + 0.5) / w, (y + 0.5) / h)));
    const i = (y * w + x) * 4;
    im.data[i] = 255; im.data[i + 1] = 255; im.data[i + 2] = 255; im.data[i + 3] = Math.round(v * 255);
  }
  ctx.putImageData(im, 0, 0);
  return c.toDataURL('image/png');
};
const sector = (lr: boolean) => canvasPng(240, 135, (u, v) => {
  const dx = (u - 0.5) * 16, dy = (v - 0.5) * 9;
  const r = Math.hypot(dx / 8, dy / 4.5);
  const th = Math.atan2(dy, dx);
  const horiz = Math.cos(th) ** 2;
  const rad = Math.min(1, Math.max(0, (r - 0.12) / 0.6));
  return (lr ? horiz : 1 - horiz) * rad * rad * (3 - 2 * rad);
});
const MLR = sector(true), MTB = sector(false);
const BANDS = uri('<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect y="100" width="1920" height="40" fill="#fff"/><rect y="400" width="1920" height="90" fill="#fff"/><rect y="700" width="1920" height="20" fill="#fff"/><rect y="820" width="1920" height="60" fill="#fff"/></svg>');
const BANDS2 = uri('<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect y="200" width="1920" height="70" fill="#fff"/><rect y="560" width="1920" height="30" fill="#fff"/><rect y="960" width="1920" height="50" fill="#fff"/></svg>');
const Bench: React.FC<{t: number; f: number}> = ({t, f}) => {
  const cam: CamSpec = {target: P.hero, yaw: -20, pitch: 6, dist: 1900, roll: -3, focal: 28};
  const w = <Cam cam={cam} f={f} />;
  const i = t % 8;
  const R = {x: 0, y: 0, width: 1920, height: 1080, filterUnits: 'userSpaceOnUse' as const, colorInterpolationFilters: 'sRGB' as const};
  const radial = (id: string, zoom: boolean, S: number) => (
    <filter id={id} {...R}>
      <feGaussianBlur in="SourceGraphic" stdDeviation={`${S} 0`} edgeMode="duplicate" result="h" />
      <feGaussianBlur in="SourceGraphic" stdDeviation={`0 ${S}`} edgeMode="duplicate" result="v" />
      <feImage href={MLR} x={0} y={0} width={1920} height={1080} preserveAspectRatio="none" result="mlr" />
      <feImage href={MTB} x={0} y={0} width={1920} height={1080} preserveAspectRatio="none" result="mtb" />
      <feComposite in="h" in2={zoom ? 'mlr' : 'mtb'} operator="in" result="a" />
      <feComposite in="v" in2={zoom ? 'mtb' : 'mlr'} operator="in" result="b" />
      <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="a" /><feMergeNode in="b" /></feMerge>
    </filter>
  );
  const defs = (
    <svg width={0} height={0} style={{position: 'absolute'}}><defs>
      {radial('z', true, 40)}
      <filter id="h1" {...R}><feGaussianBlur in="SourceGraphic" stdDeviation="40 0" edgeMode="duplicate" /></filter>
      <filter id="zl" {...R}>
        <feGaussianBlur in="SourceGraphic" stdDeviation="40 0" edgeMode="duplicate" result="h" />
        <feImage href={MLR} x={0} y={0} width={1920} height={1080} preserveAspectRatio="none" result="mlr" />
        <feComposite in="h" in2="mlr" operator="in" result="a" />
        <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="a" /></feMerge>
      </filter>
      <filter id="sl" {...R}>
        <feImage href={BANDS} x={0} y={0} width={1920} height={1080} preserveAspectRatio="none" result="m1" />
        <feOffset in="SourceGraphic" dx={120} result="o1" />
        <feComposite in="o1" in2="m1" operator="in" result="s1" />
        <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="s1" /></feMerge>
      </filter>
      <filter id="rgb" {...R}>
        <feOffset in="SourceGraphic" dx={14} result="sr" />
        <feColorMatrix in="sr" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="rr" />
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="gb" />
        <feComposite in="rr" in2="gb" operator="arithmetic" k2={1} k3={1} />
      </filter>
    </defs></svg>
  );
  const fl = (id: string) => <div style={{position: 'absolute', inset: 0, filter: `url(#${id})`}}>{w}</div>;
  const fx: Record<number, React.ReactNode> = {0: w, 1: fl('h1'), 2: fl('zl'), 3: fl('z'), 4: fl('sl'), 5: fl('rgb'), 6: <div style={{position: 'absolute', inset: 0, filter: 'blur(10px)'}}>{w}</div>, 7: <div style={{position: 'absolute', inset: 0, filter: 'blur(24px)'}}>{w}</div>};
  return <AbsoluteFill>{defs}<Img src={MLR} style={{position: 'absolute', width: 2, height: 2, opacity: 0}} /><Img src={MTB} style={{position: 'absolute', width: 2, height: 2, opacity: 0}} />{fx[i]}<div style={{position: 'absolute', left: 30, top: 30, color: '#fff', fontSize: 40, fontFamily: 'Inter'}}>bench {i}</div></AbsoluteFill>;
};
/* ------------------------------------------------------------------ */
/* Scene                                                                */
/* ------------------------------------------------------------------ */
export const Scene: React.FC<SceneProps> = ({from, dur}) => {
  const t = useCurrentFrame();
  const f = t + from;
  const L = (k: number) => beatsToLocal(from, k); // global beat → local frame

  // 1. ORBIT + CRANE + DUTCH: one flowing Catmull-Rom path through 4 keys.
  const s1: CamKey[] = [
    {at: 0, target: P.hero, yaw: -48, pitch: 14, dist: 2300, roll: -8, focal: 28},
    {at: L(33.5) - L(32), yaw: -20, pitch: 6, dist: 1900, roll: -3},
    {at: L(35) - L(32), yaw: 12, pitch: -16, dist: 1700, roll: 4},
    {at: L(36) - L(32) + 10, ease: 'quintOut', yaw: 30, pitch: -34, dist: 1550, roll: 9, target: [0, -120, -100]},
  ];
  // 2. LATERAL TRACK along the signal wall
  const s2 = moves.lateralTrack({at: 0, dur: L(38) - L(36) + 12, from: [-1500, -40, -1100], to: [600, -40, -1100], yaw: 34, pitch: 3, dist: 1150, roll: -2, focal: 32});
  // 3. HERO RAMP: low-angle push-in + orbit in slow-mo, snapping in/out (animation time = 220 f over 4 beats)
  const r3 = heroRamp(L(42) - L(38), 220);
  const s3: CamKey[] = [
    {at: 0, ...heroAngle(P.hero, {yaw: -60, pitch: 16, dist: 3400, roll: -6, focal: 24})},
    {at: 50, ease: 'linear', yaw: -26, dist: 1600, pitch: 12},
    {at: 170, ease: 'linear', yaw: 18, dist: 1350, pitch: 9, roll: -10},
    {at: 220, ease: 'expoIn', yaw: 70, dist: 1100, pitch: 4},
  ];
  // 4. RACK FOCUS near → far (macro: long lens, shallow)
  const cam4: CamSpec = {pos: [-120, -90, 1500], lookAt: [180, -90, -150], focal: 60};
  // 5. FLY-THROUGH exploded layers
  const s5 = moves.pushThrough({at: 0, dur: L(46) - L(44) + 14, target: [0, -40, -300], yaw: 8, pitch: 2, from: 1900, to: -900, ease: 'cubicIn', roll: -3, focal: 24});
  // 6. TOP-DOWN → HERO TILT
  const s6 = moves.topDownToHero({at: 4, dur: L(50) - L(46) - 10, target: P.hero, distTop: 3000, distHero: 1600, yawFrom: -70, yawTo: -12, heroPitch: 12, focal: 28});
  // 7. CRASH ZOOM + dutch roll on the near "YES" panel
  const s7: CamKey[] = [
    {at: 0, pos: [-700, -300, 2600], lookAt: P.near, focal: 24, roll: 0},
    ...moves.crashZoom({at: 8, dur: 8, from: 24, to: 85}),
    ...moves.dutchRoll({at: 8, dur: 14, from: 0, to: -11, ease: 'backOut'}),
  ];
  // 8. ORBIT (fast) for spin transition
  const s8 = moves.orbit({at: 0, dur: L(54) - L(52), target: P.hero, yawFrom: 40, yawTo: -40, pitch: 8, dist: 1700, ease: 'sine', focal: 30});
  // 10. IN-CAMERA WHIP PAN with echo trail + velocity motion blur
  const s10: CamKey[] = [
    {at: 0, target: P.hero, yaw: -20, pitch: 6, dist: 1800, focal: 30, pan: 0},
    {at: L(57) - L(56), pan: 0},
    ...moves.whipPan({at: L(57) - L(56), dur: 10, by: 62, fromPan: 0}),
    {at: L(59) - L(56), yaw: -10, pan: 62},
  ];
  // 11. DOLLY ZOOM finale on title
  const s11 = moves.dollyZoom({at: 0, dur: L(65.5) - L(60), target: [0, -400, -1900], yaw: 0, pitch: 4, from: 20, to: 70, framing: 0.55, ease: 'quintInOut'});

  const live = (lt: number, seed = 1) => addCam({}, handheld(lt, 0.8, seed), kickPush(lt + 0, 0), kickShake(f, 0.7));

  const shots: Shot[] = [
    {
      name: 'orbit+crane+dutch', from: L(32), to: L(36),
      render: (lt) => <><Cam cam={addCam(camPath(lt, s1), handheld(lt, 0.7), kickPush(f, 26))} f={f} /><Label text="Orbit · crane · dutch" sub="camPath (Catmull-Rom) + handheld + kickPush" /></>,
    },
    {
      name: 'lateral track', from: L(36), to: L(38), in: whip({dir: 'right', dur: 10}),
      render: (lt) => {
        const cam = addCam(camPath(lt, s2), drift(lt), kickZoom(f, 0.02));
        return <><Cam cam={cam} f={f} focus={P.wall(5)} aperture={7} /><Label text="Lateral track" sub="moves.lateralTrack + DOF" /></>;
      },
    },
    {
      name: 'hero ramp', from: L(38), to: L(42), in: flashCut({dur: 9}),
      render: (lt) => {
        const tau = r3.time(lt);
        const at = (x: number) => camPath(r3.time(x), s3);
        const m = camMotion(at, lt, P.hero);
        return <><Cam cam={addCam(at(lt), handheld(lt, 0.5))} f={f} mb={{vx: m.dx, vy: m.dy}} /><Label text="Hero speed ramp" sub={`heroRamp · speed ${r3.speed(lt).toFixed(2)}× · τ ${tau.toFixed(0)}`} /></>;
      },
    },
    {
      name: 'rack focus', from: L(42), to: L(44), in: glitchCut(),
      render: (lt) => {
        const cam = addCam(cam4, handheld(lt, 0.6, 4));
        const rc = resolveCam(cam);
        const fd = rackFocus(lt, depthOf(rc, P.near), depthOf(rc, P.far), 14, 22);
        return <><Cam cam={cam} f={f} focus={fd} aperture={16} /><Label text="Rack focus" sub={`near → far · focus ${fd.toFixed(0)}px`} /></>;
      },
    },
    {
      name: 'fly-through', from: L(44), to: L(46), in: zoomThrough(),
      render: (lt) => {
        const at = (x: number) => camPath(x, s5);
        return <><Cam cam={addCam(at(lt), handheld(lt, 0.6))} f={f} explode={1.25} /><Label text="Fly-through" sub="moves.pushThrough · nearFade" /></>;
      },
    },
    {
      name: 'top-down → hero', from: L(46), to: L(50), in: lightLeakDissolve({dur: 26}),
      render: (lt) => <><Cam cam={addCam(camPath(lt, s6), drift(lt, 1.2))} f={f} /><Label text="Top-down → hero tilt" sub="moves.topDownToHero" /></>,
    },
    {
      name: 'crash zoom', from: L(50), to: L(52), in: irisShockwave({dur: 20}),
      render: (lt) => <><Cam cam={addCam(camPath(lt, s7), kickShake(f, 1.5))} f={f} /><Label text="Crash zoom + dutch" sub="moves.crashZoom · moves.dutchRoll" /></>,
    },
    {
      name: 'orbit', from: L(52), to: L(54), in: spinBlur({dur: 12}),
      render: (lt) => <><Cam cam={addCam(camPath(lt, s8), handheld(lt, 0.5))} f={f} /><Label text="Orbit" sub="moves.orbit · spinBlur in" /></>,
    },
    // 9. half-beat strobe montage
    ...strobe(from, 54, 56, 0.5).map((c, i, arr): Shot => ({
      name: `strobe ${i}`, from: c, to: i < arr.length - 1 ? arr[i + 1] : L(56), in: i === 0 ? whip({dir: 'up', dur: 10}) : flashCut({dur: 5, peak: 0.6, color: i % 2 ? '#7FE7FF' : '#FFFFFF'}),
      render: (lt) => <><Cam cam={addCam({target: [0, -40, -i * 300], yaw: [-35, 25, -10, 40][i % 4], pitch: [10, -20, 4, -8][i % 4], dist: 1100 - lt * 6, roll: [-8, 6, -3, 10][i % 4], focal: 26}, handheld(lt, 1.5, i))} f={f} /><Label text="Half-beat strobe" sub={`strobe() cut ${i}`} /></>,
    })),
    {
      name: 'in-camera whip', from: L(56), to: L(60), in: cut(),
      render: (lt) => {
        const at = (x: number) => camPath(x, s10);
        const m = camMotion(at, lt);
        const fast = m.speed > 40;
        return (
          <>
            {fast
              ? <MotionBlur vx={m.dx} vy={m.dy}><Echo t={lt} n={3} span={2} render={(x) => <Cam cam={at(x)} f={f} />} /></MotionBlur>
              : <Cam cam={addCam(at(lt), handheld(lt, 0.6))} f={f} mb={{vx: m.dx, vy: m.dy}} />}
            <Label text="In-camera whip pan" sub={`moves.whipPan · camMotion ${m.speed.toFixed(0)} px/f · Echo`} />
          </>
        );
      },
    },
    {
      name: 'dolly zoom', from: L(60), to: dur, in: whip({dir: 'left', dur: 11}),
      render: (lt) => <><Cam cam={addCam(camPath(lt, s11), drift(lt))} f={f} /><Label text="Dolly zoom (vertigo)" sub="moves.dollyZoom" /></>,
    },
  ];

  if (PROFILE === 'bench') return <Bench t={t} f={f} />;
  const ob = onBeat(t, from);
  return (
    <AbsoluteFill style={{background: '#04020A'}}>
      <Shots shots={shots} t={t} debug />
      {/* beat tick (top right): lit exactly on beat frames */}
      <div style={{position: 'absolute', right: 40, top: 30, fontFamily: MONO, fontSize: 22, color: ob.hit ? '#04020A' : '#7FE7FF', background: ob.hit ? '#E7F4B9' : 'rgba(0,0,0,0.5)', padding: '6px 12px', borderRadius: 6}}>
        {`beat ${ob.beat}${ob.since ? ` +${ob.since}` : ' ●'} · f ${f}`}
      </div>
    </AbsoluteFill>
  );
};
