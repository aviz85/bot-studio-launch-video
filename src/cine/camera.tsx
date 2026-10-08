// True 3D camera for CSS 3D. A <World> holds absolutely positioned 3D objects (<Obj>) in world px and
// renders them through a cinematic camera (orbit/free/lookAt, roll, focal length → CSS perspective).
//
// World axes follow CSS: +x right, +y DOWN, +z toward the viewer. World origin = frame centre when the
// camera is at its default (orbit target [0,0,0], yaw 0, pitch 0, dist = persp → objects at z=0 are 1:1).
import React, {createContext, useContext} from 'react';
import type {V3} from './types';
import {DEG, M4, fbm, m4apply, m4css, m4id, m4mul, m4rotX, m4rotY, m4rotZ, m4scale, m4translate, noise1, smoothstep} from './math';
import {kick} from '../lib';

export const FRAME_W = 1920;
export const FRAME_H = 1080;

/** 35mm-equivalent focal length (mm) → CSS perspective (px) for a 1920 px wide frame (36 mm sensor width). */
export const focalToPersp = (mm: number) => (FRAME_W / 2) * (mm / 18);
/** CSS perspective (px) → 35mm-equivalent focal length. */
export const perspToFocal = (p: number) => (p * 18) / (FRAME_W / 2);
/** Horizontal field of view (deg) for a focal length. */
export const focalToHFov = (mm: number) => (2 * Math.atan(18 / mm)) / DEG;
/** Focal length for a horizontal FOV (deg). */
export const hFovToFocal = (deg: number) => 18 / Math.tan((deg * DEG) / 2);
/** Camera distance at which an object appears at screen scale `s` (1 = native px) for a perspective. */
export const distForScale = (persp: number, s = 1) => persp / s;

/** Cinematic camera description. Every field is optional and numeric/V3 so it can be keyframed (see camPath).
 *
 *  Aim modes (first match wins):
 *   1. `pos` + `lookAt`  — free camera aimed at a point.
 *   2. `pos` (+ yaw/pitch) — free camera with explicit orientation.
 *   3. orbit (default)   — `target` + `yaw` + `pitch` + `dist`: camera sits `dist` px from target, looking at it.
 *
 *  Angles in degrees: yaw + = camera swings/pans to the RIGHT; pitch + = camera looks UP (low-angle hero),
 *  pitch −90 = top-down god shot; roll + = image rotated clockwise (dutch).
 *  After aiming, in-camera offsets apply: pan/tilt rotate in place (whips, handheld), truck/pedestal/dolly move
 *  along the camera's right/up/forward axes. shiftX/shiftY/zoom are 2D post-projection (cheap kick punches). */
export type CamSpec = {
  target?: V3;
  yaw?: number;
  pitch?: number;
  /** Orbit distance from target (px). Default = persp (target plane renders 1:1). Negative = camera past the target. */
  dist?: number;
  pos?: V3;
  lookAt?: V3;
  roll?: number;
  /** 35mm-equivalent focal length in mm (default 35 → persp ≈ 1867 px). */
  focal?: number;
  /** CSS perspective px; overrides focal. */
  persp?: number;
  pan?: number;
  tilt?: number;
  truck?: number;
  pedestal?: number;
  dolly?: number;
  shiftX?: number;
  shiftY?: number;
  zoom?: number;
};

/** A camera offset (additive fields only) — returned by handheld(), kickPush(), kickShake()… combine with addCam(). */
export type CamOffset = Pick<CamSpec, 'pan' | 'tilt' | 'roll' | 'truck' | 'pedestal' | 'dolly' | 'shiftX' | 'shiftY' | 'zoom'>;

export type ResolvedCam = {
  pos: V3;
  yaw: number;
  pitch: number;
  roll: number;
  persp: number;
  /** camera basis in world space: right, down (screen-down), back (= −forward), forward */
  r: V3;
  d: V3;
  b: V3;
  f: V3;
  shiftX: number;
  shiftY: number;
  zoom: number;
  /** world → CSS lens space (eye at z = persp) */
  view: M4;
};

const fwdOf = (yaw: number, pitch: number): V3 => {
  const cy = Math.cos(yaw * DEG), sy = Math.sin(yaw * DEG), cp = Math.cos(pitch * DEG), sp = Math.sin(pitch * DEG);
  return [sy * cp, -sp, -cy * cp];
};

/** Resolve a CamSpec into position + basis + view matrix. */
export const resolveCam = (c: CamSpec = {}): ResolvedCam => {
  const persp = c.persp ?? focalToPersp(c.focal ?? 35);
  let yaw = c.yaw ?? 0, pitch = c.pitch ?? 0;
  let pos: V3;
  if (c.pos) {
    pos = c.pos;
    if (c.lookAt) {
      const dx = c.lookAt[0] - pos[0], dy = c.lookAt[1] - pos[1], dz = c.lookAt[2] - pos[2];
      const l = Math.hypot(dx, dy, dz) || 1;
      yaw = Math.atan2(dx, -dz) / DEG;
      pitch = Math.asin(Math.max(-1, Math.min(1, -dy / l))) / DEG;
    }
  } else {
    const tg = c.target ?? [0, 0, 0];
    const dist = c.dist ?? persp;
    const f = fwdOf(yaw, pitch);
    pos = [tg[0] - f[0] * dist, tg[1] - f[1] * dist, tg[2] - f[2] * dist];
  }
  yaw += c.pan ?? 0;
  pitch += c.tilt ?? 0;
  const roll = c.roll ?? 0;
  const Y = yaw * DEG, P = pitch * DEG, R = roll * DEG;
  const cy = Math.cos(Y), sy = Math.sin(Y), cp = Math.cos(P), sp = Math.sin(P), cr = Math.cos(R), sr = Math.sin(R);
  const f: V3 = [sy * cp, -sp, -cy * cp];
  const b: V3 = [-f[0], -f[1], -f[2]];
  const r0: V3 = [cy, 0, sy];
  const d0: V3 = [sp * sy, cp, -sp * cy];
  const r: V3 = [r0[0] * cr - d0[0] * sr, r0[1] * cr - d0[1] * sr, r0[2] * cr - d0[2] * sr];
  const d: V3 = [d0[0] * cr + r0[0] * sr, d0[1] * cr + r0[1] * sr, d0[2] * cr + r0[2] * sr];
  // in-camera translation offsets
  const tr = c.truck ?? 0, pe = c.pedestal ?? 0, dl = c.dolly ?? 0;
  if (tr || pe || dl) pos = [pos[0] + r[0] * tr - d[0] * pe + f[0] * dl, pos[1] + r[1] * tr - d[1] * pe + f[1] * dl, pos[2] + r[2] * tr - d[2] * pe + f[2] * dl];
  const dot = (a: V3, q: V3) => a[0] * q[0] + a[1] * q[1] + a[2] * q[2];
  const view: M4 = [r[0], d[0], b[0], 0, r[1], d[1], b[1], 0, r[2], d[2], b[2], 0, -dot(r, pos), -dot(d, pos), -dot(b, pos) + persp, 1];
  return {pos, yaw, pitch, roll, persp, r, d, b, f, shiftX: c.shiftX ?? 0, shiftY: c.shiftY ?? 0, zoom: c.zoom ?? 1, view};
};

/** Camera-space depth (px in front of the lens; ≤0 = behind the camera) of a world point. */
export const depthOf = (cam: ResolvedCam | CamSpec, p: V3) => {
  const c = 'view' in cam ? (cam as ResolvedCam) : resolveCam(cam as CamSpec);
  return -((p[0] - c.pos[0]) * c.b[0] + (p[1] - c.pos[1]) * c.b[1] + (p[2] - c.pos[2]) * c.b[2]);
};

/** Project a world point to screen px (frame coords, 0..1920 × 0..1080). `scale` = on-screen size of 1 world px there. */
export const project = (cam: ResolvedCam | CamSpec, p: V3) => {
  const c = 'view' in cam ? (cam as ResolvedCam) : resolveCam(cam as CamSpec);
  const q: V3 = [p[0] - c.pos[0], p[1] - c.pos[1], p[2] - c.pos[2]];
  const xc = q[0] * c.r[0] + q[1] * c.r[1] + q[2] * c.r[2];
  const yc = q[0] * c.d[0] + q[1] * c.d[1] + q[2] * c.d[2];
  const depth = -(q[0] * c.b[0] + q[1] * c.b[1] + q[2] * c.b[2]);
  const s = depth > 1e-3 ? c.persp / depth : 0;
  return {x: FRAME_W / 2 + (xc * s) * c.zoom + c.shiftX, y: FRAME_H / 2 + (yc * s) * c.zoom + c.shiftY, scale: s * c.zoom, depth, visible: depth > 1e-3};
};

/** Merge a base CamSpec with additive offsets (handheld, kick push…): pan/tilt/roll/truck/pedestal/dolly/shift add, zoom multiplies. */
export const addCam = (base: CamSpec, ...offs: (CamOffset | CamSpec | undefined | null | false)[]): CamSpec => {
  const o: CamSpec = {...base};
  for (const x of offs) {
    if (!x) continue;
    for (const k of ['pan', 'tilt', 'roll', 'truck', 'pedestal', 'dolly', 'shiftX', 'shiftY'] as const) if (x[k] !== undefined) o[k] = (o[k] ?? 0) + (x[k] as number);
    if (x.zoom !== undefined) o.zoom = (o.zoom ?? 1) * x.zoom;
  }
  return o;
};

/* ------------------------------------------------------------------ */
/* Life: handheld + kick-synced micro motion                            */
/* ------------------------------------------------------------------ */
/** Handheld micro-motion (deterministic smooth noise). amp 1 ≈ a steady operator; 2–3 = nervous/action.
 *  t = any frame counter (local is fine). Returns an offset for addCam(). */
export const handheld = (t: number, amp = 1, seed = 1): CamOffset => {
  if (!amp) return {};
  const s = seed * 13.7;
  const slow = (o: number, per: number) => fbm(t / per + o, s + o, 2);
  const jit = (o: number) => noise1(t / 9 + o, s + o * 3);
  return {
    pan: amp * (0.32 * slow(1, 70) + 0.04 * jit(1)),
    tilt: amp * (0.24 * slow(2, 80) + 0.035 * jit(2)),
    roll: amp * (0.28 * slow(3, 95) + 0.03 * jit(3)),
    truck: amp * 3.5 * slow(4, 110),
    pedestal: amp * 2.5 * slow(5, 120),
  };
};
/** Slow, smooth "floating" drift for calm shots (no jitter). */
export const drift = (t: number, amp = 1, seed = 2): CamOffset => ({
  pan: amp * 0.6 * noise1(t / 160, seed),
  tilt: amp * 0.4 * noise1(t / 190 + 7, seed),
  roll: amp * 0.35 * noise1(t / 230 + 3, seed),
  truck: amp * 8 * noise1(t / 210 + 11, seed),
  pedestal: amp * 6 * noise1(t / 240 + 5, seed),
});
/** Kick-synced micro push (camera dollies forward `px` on each kick and eases back). f = GLOBAL frame. */
export const kickPush = (f: number, px = 22, decay = 7): CamOffset => ({dolly: px * kick(f, decay)});
/** Kick-synced 2D lens punch (zoom 1 + amt on the kick). Cheapest kick accent. f = GLOBAL frame. */
export const kickZoom = (f: number, amt = 0.018, decay = 7): CamOffset => ({zoom: 1 + amt * kick(f, decay)});
/** Kick-synced shake: short jolt in rotation + 2D shift on each kick. f = GLOBAL frame. amp 1 = subtle. */
export const kickShake = (f: number, amp = 1, decay = 5, seed = 3): CamOffset => {
  const k = kick(f, decay) * amp;
  if (k < 0.002) return {};
  return {
    pan: k * 0.35 * noise1(f / 2.3, seed),
    tilt: k * 0.3 * noise1(f / 2.1 + 5, seed),
    roll: k * 0.35 * noise1(f / 2.7 + 9, seed),
    shiftX: k * 7 * noise1(f / 1.7 + 13, seed),
    shiftY: k * 6 * noise1(f / 1.9 + 17, seed),
  };
};

/* ------------------------------------------------------------------ */
/* World + Obj                                                          */
/* ------------------------------------------------------------------ */
export type FocusSpec = {
  /** focus distance in px from the lens, or a world point to keep in focus */
  focus?: number | V3;
  /** blur (screen px) of something at infinity when focused near; 0 = DOF off. Typical 6–16. */
  aperture?: number;
  /** clamp for screen blur px (default 26) */
  maxBlur?: number;
};

type Ctx = {cam: ResolvedCam; parent: M4; focusDepth: number; aperture: number; maxBlur: number; near: number};
const WorldCtx = createContext<Ctx | null>(null);
/** Access the resolved camera (inside a <World>). Useful for billboards/HUD reticles via project(). */
export const useCam = () => useContext(WorldCtx)?.cam ?? null;

export type WorldProps = FocusSpec & {
  camera: CamSpec | ResolvedCam;
  children?: React.ReactNode;
  /** objects whose centre is closer than this (px) are culled (default 8) */
  near?: number;
  style?: React.CSSProperties;
  /** extra content drawn in screen space BEHIND the 3D world (backgrounds) — inside the zoom/shift transform */
  backdrop?: React.ReactNode;
};

/** A 3D world seen through `camera`. Full-frame, no overflow clipping, preserve-3d throughout. */
export const World: React.FC<WorldProps> = ({camera, children, focus, aperture = 0, maxBlur = 26, near = 8, style, backdrop}) => {
  const cam = 'view' in camera ? (camera as ResolvedCam) : resolveCam(camera as CamSpec);
  const focusDepth = focus === undefined ? cam.persp : typeof focus === 'number' ? focus : depthOf(cam, focus);
  const lensT = cam.zoom !== 1 || cam.shiftX || cam.shiftY ? `translate(${cam.shiftX.toFixed(2)}px, ${cam.shiftY.toFixed(2)}px) scale(${cam.zoom.toFixed(5)})` : undefined;
  const ctx: Ctx = {cam, parent: m4id(), focusDepth, aperture, maxBlur, near};
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: FRAME_W, height: FRAME_H, perspective: `${cam.persp.toFixed(2)}px`, perspectiveOrigin: '50% 50%', transform: lensT, transformOrigin: '50% 50%', ...style}}>
      {backdrop ? <WorldCtx.Provider value={ctx}>{backdrop}</WorldCtx.Provider> : null}
      <div style={{position: 'absolute', left: FRAME_W / 2, top: FRAME_H / 2, width: 0, height: 0, transformStyle: 'preserve-3d', transform: m4css(cam.view)}}>
        <WorldCtx.Provider value={ctx}>{children}</WorldCtx.Provider>
      </div>
    </div>
  );
};

/** Project a world point WITHOUT the 2D lens zoom/shift (for drawing inside the World's backdrop/lens space). */
const projRaw = (c: ResolvedCam, p: V3) => {
  const q0 = p[0] - c.pos[0], q1 = p[1] - c.pos[1], q2 = p[2] - c.pos[2];
  const depth = -(q0 * c.b[0] + q1 * c.b[1] + q2 * c.b[2]);
  const xc = q0 * c.r[0] + q1 * c.r[1] + q2 * c.r[2];
  const yc = q0 * c.d[0] + q1 * c.d[1] + q2 * c.d[2];
  const s = c.persp / depth;
  return {x: FRAME_W / 2 + xc * s, y: FRAME_H / 2 + yc * s, depth};
};

export type FloorGridProps = {
  /** world y of the plane (floor below the subject: positive, e.g. 460; ceiling: negative) */
  y?: number;
  /** grid spacing (px) */
  step?: number;
  /** half extent of the grid around `center` (px) */
  extent?: number;
  center?: [number, number];
  color?: string;
  /** line width at 1:1 scale (px) — thins with distance */
  width?: number;
  /** opacity falloff: fully visible within fade[0] of `center`, gone at fade[1] (world px) */
  fade?: [number, number];
  /** extra fade by camera distance: gone beyond this depth (px) */
  far?: number;
  opacity?: number;
  /** segments per line (smoothness of the fade) */
  seg?: number;
  /** segments closer than this to the lens fade out (px, default 350) — avoids fat lines at the lens */
  nearFade?: number;
  /** also draw when the camera is on the other side of the plane (default false: floors vanish from below) */
  twoSided?: boolean;
};

/** Camera-projected grid floor drawn as 2D SVG — exact perspective for the World camera, near-plane clipped,
 *  ~1 ms per frame (a CSS 3D plane of the same size costs 0.5–2 s!). Put it in <World backdrop={…}> so all
 *  3D objects draw over it. Must be rendered inside a <World> (uses useCam()). */
export const FloorGrid: React.FC<FloorGridProps> = ({y = 460, step = 140, extent = 3500, center = [0, -600], color = 'rgb(180,155,242)', width = 2, fade = [600, 3200], far = 9000, opacity = 0.4, seg = 10, nearFade = 350, twoSided = false}) => {
  const c = useCam();
  if (!c) return null;
  // floor (plane below the subject, y-down world): camera must be above it (c.pos[1] < y) unless twoSided
  if (!twoSided && c.pos[1] >= y - 1) return null;
  const near = 30;
  // segments are batched into one <path> per (opacity, width) bucket → a handful of DOM nodes
  const buckets = new Map<string, string[]>();
  const n = Math.floor(extent / step);
  const [cx, cz] = center;
  const push = (a: V3, b: V3, key: string) => {
    for (let k = 0; k < seg; k++) {
      let p: V3 = [a[0] + (b[0] - a[0]) * (k / seg), y, a[2] + (b[2] - a[2]) * (k / seg)];
      let q: V3 = [a[0] + (b[0] - a[0]) * ((k + 1) / seg), y, a[2] + (b[2] - a[2]) * ((k + 1) / seg)];
      const mx = (p[0] + q[0]) / 2 - cx, mz = (p[2] + q[2]) / 2 - cz;
      let o = opacity * (1 - smoothstep(fade[0], fade[1], Math.hypot(mx, mz)));
      if (o < 0.01) continue;
      let pp = projRaw(c, p), qq = projRaw(c, q);
      if (pp.depth < near && qq.depth < near) continue;
      if (pp.depth < near || qq.depth < near) {
        // clip the segment at the near plane
        const tcl = (near - pp.depth) / (qq.depth - pp.depth);
        const m: V3 = [p[0] + (q[0] - p[0]) * tcl, y, p[2] + (q[2] - p[2]) * tcl];
        if (pp.depth < near) { p = m; pp = projRaw(c, m); } else { q = m; qq = projRaw(c, m); }
      }
      const dm = (pp.depth + qq.depth) / 2;
      o *= (1 - smoothstep(far * 0.5, far, dm)) * smoothstep(nearFade * 0.3, nearFade, dm);
      if (o < 0.01) continue;
      const sw = Math.max(0.5, Math.min(6, (width * c.persp) / dm));
      const bk = `${Math.round(o * 24) / 24}|${Math.round(sw * 4) / 4}`;
      const arr = buckets.get(bk) ?? [];
      arr.push(`M${pp.x.toFixed(1)} ${pp.y.toFixed(1)}L${qq.x.toFixed(1)} ${qq.y.toFixed(1)}`);
      buckets.set(bk, arr);
    }
  };
  for (let i = -n; i <= n; i++) {
    push([cx + i * step, y, cz - extent], [cx + i * step, y, cz + extent], `x${i}`);
    push([cx - extent, y, cz + i * step], [cx + extent, y, cz + i * step], `z${i}`);
  }
  return (
    <svg width={FRAME_W} height={FRAME_H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} aria-hidden>
      {[...buckets.entries()].map(([k, segs]) => {
        const [o, sw] = k.split('|').map(Number);
        return <path key={k} d={segs.join('')} stroke={color} strokeOpacity={o} strokeWidth={sw} fill="none" />;
      })}
    </svg>
  );
};

/** Circle-of-confusion blur (screen px) for an object at camera depth `depth` with focus at `focusDepth`. */
export const coc = (depth: number, focusDepth: number, aperture: number, maxBlur = 26) => {
  if (!aperture || depth <= 1) return 0;
  return Math.min(maxBlur, (aperture * Math.abs(depth - focusDepth)) / depth);
};

export type ObjProps = {
  x?: number; y?: number; z?: number;
  /** rotation (deg), applied in CSS order rotateY(ry) rotateX(rx) rotateZ(rz). rx=90 lays a card flat as a floor (face up). */
  rx?: number; ry?: number; rz?: number;
  s?: number;
  /** box size (optional; content is centred on x,y,z either way) */
  w?: number; h?: number;
  /** opacity (applied on the content wrapper — flattens nested Objs, so prefer it on leaves) */
  o?: number;
  /** extra manual blur (screen px) */
  blur?: number;
  /** participate in World depth of field (default true when the World has an aperture). Number = multiplier. */
  dof?: boolean | number;
  /** face the camera: true = fully screen-aligned sprite, 'y' = only turn around the vertical axis */
  billboard?: boolean | 'y';
  /** fade out when closer than [hidden, visible] px to the lens — for fly-throughs (e.g. [60, 400]) */
  nearFade?: [number, number];
  /** cull when behind the near plane (default true) */
  cull?: boolean;
  style?: React.CSSProperties;
  /** style for the inner content box (where opacity/filter go) */
  innerStyle?: React.CSSProperties;
  children?: React.ReactNode;
};

/** A 3D object in the World, centred at (x, y, z). Nest Objs to build rigs (child coords are relative). */
export const Obj: React.FC<ObjProps> = ({x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1, w, h, o = 1, blur = 0, dof = true, billboard, nearFade, cull = true, style, innerStyle, children}) => {
  const ctx = useContext(WorldCtx);
  let local = m4translate(x, y, z);
  let rotCss = '';
  if (billboard && ctx) {
    const c = ctx.cam;
    // orient the object to the camera basis (undo parent rotation approximately: assumes parent is unrotated)
    const R: M4 = billboard === 'y'
      ? m4rotY(-c.yaw)
      : [c.r[0], c.r[1], c.r[2], 0, c.d[0], c.d[1], c.d[2], 0, c.b[0], c.b[1], c.b[2], 0, 0, 0, 0, 1];
    local = m4mul(local, R);
    rotCss = billboard === 'y' ? ` rotateY(${(-c.yaw).toFixed(3)}deg)` : ` ${m4css(R)}`;
  }
  if (ry) local = m4mul(local, m4rotY(ry));
  if (rx) local = m4mul(local, m4rotX(rx));
  if (rz) local = m4mul(local, m4rotZ(rz));
  if (s !== 1) local = m4mul(local, m4scale(s));
  const world = ctx ? m4mul(ctx.parent, local) : local;

  let opacity = o;
  let blurPx = blur;
  let depth = 0;
  if (ctx) {
    const wp: V3 = [world[12], world[13], world[14]];
    depth = depthOf(ctx.cam, wp);
    if (cull && depth < ctx.near) return null;
    if (nearFade) opacity *= smoothstep(nearFade[0], nearFade[1], depth);
    if (dof && ctx.aperture > 0) blurPx += coc(depth, ctx.focusDepth, ctx.aperture * (typeof dof === 'number' ? dof : 1), ctx.maxBlur);
  }
  if (opacity <= 0.002) return null;
  // filter blur is applied in the element's local px before projection: convert screen px → local px
  const localBlur = ctx && blurPx > 0 ? (blurPx * Math.max(1, depth)) / (ctx.cam.persp * Math.abs(s || 1)) : blurPx;
  const transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(2)}px)${rotCss}${ry ? ` rotateY(${ry.toFixed(3)}deg)` : ''}${rx ? ` rotateX(${rx.toFixed(3)}deg)` : ''}${rz ? ` rotateZ(${rz.toFixed(3)}deg)` : ''}${s !== 1 ? ` scale(${s.toFixed(5)})` : ''} translate(-50%, -50%)`;
  const needInner = opacity < 1 || localBlur > 0.3 || innerStyle;
  const content = needInner ? (
    <div style={{width: '100%', height: '100%', opacity: opacity < 1 ? opacity : undefined, filter: localBlur > 0.3 ? `blur(${localBlur.toFixed(2)}px)` : undefined, ...innerStyle}}>{children}</div>
  ) : children;
  const inner = ctx ? <WorldCtx.Provider value={{...ctx, parent: world}}>{content}</WorldCtx.Provider> : content;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: w, height: h, transformOrigin: '0 0', transformStyle: 'preserve-3d', transform, ...style}}>
      {inner}
    </div>
  );
};

/** Screen-space depth info for an object position — e.g. to drive custom fog/glow by distance. */
export const useDepth = (p: V3) => {
  const cam = useCam();
  return cam ? depthOf(cam, p) : 0;
};
