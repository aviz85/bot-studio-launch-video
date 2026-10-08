// Depth of field. Inside a <World>, set `focus`/`aperture` on the World and every <Obj> blurs itself by its
// camera depth automatically. For plain 2.5D layers (v1 Stage/Layer style: translateZ under a perspective),
// use dof()/<Focus>.
import React from 'react';
import type {Ease, V3} from './types';
import {mix, p01} from './math';
import {coc, depthOf, focalToPersp, CamSpec, ResolvedCam} from './camera';

export {coc};

/** Blur in screen px for a 2.5D layer at translateZ `z` when the focal plane sits at `focusZ`.
 *  persp = the CSS perspective of the stage (default 35 mm ≈ 1867 px). aperture ≈ blur of a layer at infinity (6–16). */
export const dof = (z: number, focusZ: number, aperture = 10, persp = focalToPersp(35), maxBlur = 26) =>
  coc(persp - z, persp - focusZ, aperture, maxBlur);

/** Wrapper that blurs its children for depth `z` vs `focusZ` (2.5D layers). Renders no filter when sharp (<0.35 px). */
export const Focus: React.FC<{z: number; focusZ: number; aperture?: number; persp?: number; maxBlur?: number; style?: React.CSSProperties; children?: React.ReactNode}> = ({z, focusZ, aperture = 10, persp, maxBlur, style, children}) => {
  const b = dof(z, focusZ, aperture, persp, maxBlur);
  return <div style={{position: 'absolute', inset: 0, transformStyle: 'flat', filter: b > 0.35 ? `blur(${b.toFixed(2)}px)` : undefined, ...style}}>{children}</div>;
};

/** Rack focus: animated focus value (any unit: depth px or z) from `a` to `b` over [at, at+dur]. Default ease is the
 *  classic focus-puller curve (quick start, long settle). */
export const rackFocus = (t: number, a: number, b: number, at: number, dur = 24, e: Ease = 'cubicInOut') => mix(a, b, p01(t, at, dur, e));

/** Rack focus between two WORLD points for a moving camera: returns the focus DEPTH (px) to pass as World `focus`. */
export const rackBetween = (cam: CamSpec | ResolvedCam, a: V3, b: V3, p: number) => mix(depthOf(cam, a), depthOf(cam, b), p);
