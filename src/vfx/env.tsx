/* Environments: deep space backdrop, holographic grid floor, grid tunnel, scanlines, data rain. */
import React from 'react';
import {band, kick} from '../lib';
import {CX, CY, H, VC, W, clamp01, colorOf, full, glowSprite, hash2, mix, mixHex, noise2, prng, radialFill, rgba, scratchCanvas, starSprite, useCanvasDraw, useF, type CanvasBlend} from './util';

/* ======================================================================
 * Nebula texture (generated once per page, cached; domain-warped fbm)
 * ==================================================================== */
const fbm2 = (x: number, y: number, seed: number, oct = 4) => {
  let v = 0, a = 0.5, fr = 1, n = 0;
  for (let o = 0; o < oct; o++) { v += noise2(x * fr, y * fr, seed + o * 19) * a; n += a; a *= 0.5; fr *= 2.02; }
  return v / n;
};
const nebulaCache = new Map<string, HTMLCanvasElement>();
type NebulaPal = 'violet' | 'cyan' | 'mixed';
const NEB: Record<NebulaPal, [string, string, string]> = {
  violet: ['#5A35C8', '#9A3CC0', '#2A2690'],
  cyan: ['#3B6BFF', '#7FE7FF', '#6A45E0'],
  mixed: ['#6A45E0', '#C04FD0', '#2FA4D8'],
};
const nebulaTexture = (seed: number, pal: NebulaPal) => {
  const key = `${seed}|${pal}`;
  const hit = nebulaCache.get(key);
  if (hit) return hit;
  const w = 384, h = 216;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const [c1, c2, c3] = NEB[pal].map((x) => [parseInt(x.slice(1, 3), 16), parseInt(x.slice(3, 5), 16), parseInt(x.slice(5, 7), 16)]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = (x / w) * 3.4, v = (y / h) * 1.9;
      const q1 = fbm2(u + 1.7, v + 9.2, seed, 3);
      const q2 = fbm2(u + 8.3, v + 2.8, seed + 1, 3);
      const n = fbm2(u + 2.4 * q1, v + 2.4 * q2, seed + 2, 4);
      const ridge = 1 - Math.abs(2 * fbm2(u * 1.8 + 3.1 * q2, v * 1.8 + 1.3, seed + 3, 3) - 1);
      const macro = clamp01((fbm2(u * 0.45 + 5.1, v * 0.45 + 1.7, seed + 9, 3) - 0.36) / 0.3);
      const d = clamp01((n - 0.4) / 0.38) * macro * macro * (3 - 2 * macro);
      const dens = d * d * (3 - 2 * d);
      const wisp = Math.pow(ridge, 7) * dens;
      const m = clamp01((q1 - 0.35) * 2.2);
      const k = clamp01((q2 - 0.55) * 3);
      const r = mix(mix(c1[0], c2[0], m), c3[0], k), g = mix(mix(c1[1], c2[1], m), c3[1], k), b = mix(mix(c1[2], c2[2], m), c3[2], k);
      const a = clamp01(dens * 0.42 + wisp * 0.5);
      const i = (y * w + x) * 4;
      img.data[i] = Math.min(255, r + wisp * 70);
      img.data[i + 1] = Math.min(255, g + wisp * 60);
      img.data[i + 2] = Math.min(255, b + wisp * 60);
      img.data[i + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  nebulaCache.set(key, c);
  return c;
};

/* ======================================================================
 * SpaceBackdrop
 * ==================================================================== */
export type SpaceBackdropProps = {
  /** Nebula strength 0..1.5. */
  intensity?: number;
  palette?: NebulaPal;
  /** Star count. */
  stars?: number;
  /** Horizon haze band 0..1 (set 0 when no floor). */
  haze?: number;
  /** Horizon y for the haze (px). */
  horizon?: number;
  /** Audio-reactive breathing 0..1 (uses band(·,0) and kick on the GLOBAL frame). */
  audio?: number;
  /** Global frame offset of the current Sequence (scene `from`) — needed for audio sync. */
  from?: number;
  /** Camera parallax offset in px (nebula moves 0.15×, stars 0.05×). */
  camX?: number;
  camY?: number;
  seed?: number;
  frame?: number;
};

/** Deep violet space: gradient base, domain-warped nebula clouds, glow pools, twinkling stars, horizon haze,
 *  breathing with the music. Opaque — use as the bottom layer. Single canvas (soft layers at half-res). */
export const SpaceBackdrop: React.FC<SpaceBackdropProps> = ({intensity = 1, palette = 'violet', stars = 240, haze = 0.6, horizon = 640, audio = 1, from = 0, camX = 0, camY = 0, seed = 3, frame}) => {
  const f = useF(frame);
  const gf = f + from;
  const lo = band(gf, 0, 4), k = kick(gf, 12);
  const breath = 1 + audio * (0.22 * lo + 0.18 * k);
  const ref = useCanvasDraw((ctx) => {
    // ---- soft layers at half resolution
    const {c: S, ctx: s} = scratchCanvas('space', W / 2, H / 2);
    s.setTransform(0.5, 0, 0, 0.5, 0, 0);
    radialFill(s, W / 2, H * 0.4, W * 0.75, [[0, '#140828'], [0.42, '#0B051B'], [1, VC.space0]], 0.85);
    s.fillStyle = VC.space0;
    s.globalCompositeOperation = 'destination-over';
    s.fillRect(0, 0, W, H);
    s.globalCompositeOperation = 'screen';
    const gA = clamp01(intensity * (0.75 + 0.25 * breath));
    const glows: [number, number, number, string, number][] = [
      [0.26 + 0.05 * Math.sin(f / 300), 0.3 + 0.06 * Math.cos(f / 360), 650, VC.violetDeep, 0.3],
      [0.78 + 0.04 * Math.cos(f / 340), 0.62 + 0.05 * Math.sin(f / 280), 700, '#7A2FB0', 0.2],
      [0.6 + 0.06 * Math.sin(f / 420), 0.18, 450, '#2A36A8', 0.18],
      [0.12, 0.8, 400, VC.cyan, 0.04],
    ];
    for (const [gx, gy, r, c, a] of glows) radialFill(s, gx * W + camX * 0.1, gy * H + camY * 0.1, r, [[0, rgba(c, a * gA)], [0.5, rgba(c, a * gA * 0.35)], [1, rgba(c, 0)]]);
    const dx = Math.sin(f * 0.0021 + seed) * 40 + camX * 0.15;
    const dy = Math.cos(f * 0.0017 + seed) * 22 + camY * 0.15;
    const ns = 1.12 + 0.03 * Math.sin(f * 0.003) + 0.012 * k * audio;
    s.globalAlpha = clamp01(0.62 * intensity * breath);
    const nw = W * ns, nh = H * ns;
    s.drawImage(nebulaTexture(seed, palette as NebulaPal), W / 2 - nw / 2 + dx, H / 2 - nh / 2 + dy, nw, nh);
    s.globalAlpha = 1;
    if (haze > 0) {
      const hz = clamp01(haze * (0.8 + 0.2 * breath));
      radialFill(s, W / 2, horizon, W * 0.62, [[0, rgba('#8C6BEA', 0.26 * hz)], [0.45, rgba('#6A45E0', 0.1 * hz)], [1, 'rgba(0,0,0,0)']], 0.2);
    }
    ctx.drawImage(S, 0, 0, W, H);
    // ---- crisp layers at full resolution
    if (haze > 0) {
      const lg = ctx.createLinearGradient(0, 0, W, 0);
      lg.addColorStop(0, 'rgba(0,0,0,0)');
      lg.addColorStop(0.3, rgba(VC.lilac, 0.35 * haze * 0.5));
      lg.addColorStop(0.5, rgba('#ffffff', 0.5 * haze * 0.5));
      lg.addColorStop(0.7, rgba(VC.lilac, 0.35 * haze * 0.5));
      lg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(0, horizon - 1.5, W, 3);
    }
    const rnd = prng(seed + 501);
    ctx.globalCompositeOperation = 'lighter';
    const spr = glowSprite('#E8E4FF', 0.9);
    for (let i = 0; i < stars; i++) {
      const x0 = rnd() * (W + 200) - 100, y0 = rnd() * (H + 200) - 100;
      const m = Math.pow(rnd(), 3.5), ph = rnd() * 50, tint = rnd();
      const px = x0 + camX * 0.05 * (0.5 + m), py = y0 + camY * 0.05 * (0.5 + m);
      if (px < -20 || px > W + 20 || py < -20 || py > H + 20) continue;
      const tw = 0.55 + 0.45 * Math.sin(f * (0.03 + m * 0.05) + ph);
      const sz = 1.6 + m * 7;
      ctx.globalAlpha = clamp01((0.25 + 0.75 * m) * tw * (0.85 + 0.3 * k * audio));
      if (m > 0.55 && tint > 0.5) ctx.drawImage(starSprite(tint > 0.8 ? VC.cyan : '#E2D6FF'), px - sz * 3, py - sz * 3, sz * 6, sz * 6);
      else ctx.drawImage(spr, px - sz, py - sz, sz * 2, sz * 2);
    }
  });
  return <canvas ref={ref} width={W} height={H} style={{...full, background: VC.space0}} />;
};

/* ======================================================================
 * HoloGrid — perspective grid floor into fog (Canvas2D projection)
 * ==================================================================== */
export type HoloGridProps = {
  /** Screen y of the horizon / vanishing line. */
  horizon?: number;
  /** Camera height above the floor (world units). Lower = more grazing. */
  height?: number;
  /** Focal length in px. */
  focal?: number;
  /** Cell size (world units). */
  cell?: number;
  /** Scroll speed toward camera (world units / frame). */
  speed?: number;
  /** Explicit forward travel (overrides speed·frame). */
  scroll?: number;
  /** Lateral camera offset (world units). */
  camX?: number;
  /** Vanishing point x (px). */
  x?: number;
  color?: string;
  accent?: string;
  /** Fog distance (world units) — lines fade out by ~2× this. */
  fog?: number;
  lineWidth?: number;
  /** Light packets travelling along the grid lines. */
  pulses?: number;
  intensity?: number;
  /** Floor fill gradient + horizon glow. */
  fill?: boolean;
  /** Dutch roll in degrees (rotates the canvas). */
  roll?: number;
  /** Extra brightness 0..1 (e.g. kick(f)). */
  boost?: number;
  res?: number;
  seed?: number;
  frame?: number;
  style?: React.CSSProperties;
};

/** Holographic perspective grid floor fading into fog, optionally scrolling, with travelling light packets. */
export const HoloGrid: React.FC<HoloGridProps> = ({
  horizon = 640, height = 1.1, focal = 900, cell = 1, speed = 0.02, scroll, camX = 0, x = CX, color, accent, fog = 14, lineWidth = 1.3, pulses = 12, intensity = 1, fill = true, roll = 0, boost = 0, res = 1, seed = 8, frame, style,
}) => {
  const f = useF(frame);
  const col = colorOf(color, VC.lilac);
  const acc = colorOf(accent, VC.cyan);
  const ref = useCanvasDraw((ctx, cw) => {
    const s = cw / W;
    ctx.scale(s, s);
    const I = intensity * (1 + boost * 0.5);
    const zNear = 0.25, zFar = fog * 2.6;
    const travel = scroll ?? f * speed;
    const sy = (z: number) => horizon + (height * focal) / z;
    const sx = (X: number, z: number) => x + ((X - camX) * focal) / z;
    const fogA = (z: number) => Math.exp(-Math.pow(z / fog, 1.25));
    if (fill) {
      const g = ctx.createLinearGradient(0, horizon, 0, H);
      g.addColorStop(0, rgba(mixHex(col, '#000', 0.55), 0.22 * intensity));
      g.addColorStop(0.25, rgba('#1A0D33', 0.25 * intensity));
      g.addColorStop(1, rgba('#05020A', 0));
      ctx.fillStyle = g;
      ctx.fillRect(-400, horizon, W + 800, H - horizon + 400);
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'butt';
    // horizontal (cross) lines
    const off = ((travel % cell) + cell) % cell;
    const passes: [number, number][] = [[5, 0.12], [1, 0.85]];
    for (const [wm, am] of passes) {
      for (let k = 0; k < 400; k++) {
        const z = k * cell - off + cell;
        if (z < zNear) continue;
        if (z > zFar) break;
        const y = sy(z);
        if (y > H + 10) continue;
        const spacing = sy(z) - sy(z + cell);
        const a = fogA(z) * clamp01((spacing - 1.5) / 7) * I * am;
        if (a < 0.004) continue;
        ctx.strokeStyle = rgba(col, a);
        ctx.lineWidth = lineWidth * wm * Math.min(2.4, Math.max(0.5, 1.6 / z));
        ctx.beginPath();
        ctx.moveTo(-400, y);
        ctx.lineTo(W + 400, y);
        ctx.stroke();
      }
    }
    // longitudinal lines
    const m0 = Math.floor(camX / cell) - 40, m1 = Math.floor(camX / cell) + 40;
    const p0 = zNear, p1 = zFar;
    for (const [wm, am] of passes) {
      for (let m = m0; m <= m1; m++) {
        const X = m * cell;
        const xa = sx(X, p0), ya = sy(p0), xb = sx(X, p1), yb = sy(p1);
        if ((xa < -2000 && xb < -50) || (xa > W + 2000 && xb > W + 50)) continue;
        const g = ctx.createLinearGradient(xa, ya, xb, yb);
        for (const z of [p0, 0.6, 1.2, 2.5, 5, fog, fog * 1.6, p1]) {
          const t = clamp01((1 / p0 - 1 / z) / (1 / p0 - 1 / p1));
          g.addColorStop(t, rgba(col, fogA(z) * I * am * (m % 4 === 0 ? 1 : 0.7)));
        }
        ctx.strokeStyle = g;
        ctx.lineWidth = lineWidth * wm * 1.1;
        ctx.beginPath();
        ctx.moveTo(xa, ya);
        ctx.lineTo(xb, yb);
        ctx.stroke();
      }
    }
    // light packets
    const rnd = prng(seed);
    const spr = glowSprite(acc, 0.8);
    for (let i = 0; i < pulses; i++) {
      const m = Math.round((rnd() - 0.5) * 22 + camX / cell);
      const sp = 0.06 + rnd() * 0.1;
      const ph = rnd();
      const span = zFar * 0.7;
      const z = span - ((f * sp + ph * span + travel) % span) + 0.6;
      const z2 = z + 0.9;
      const X = m * cell;
      const a = fogA(z) * I * clamp01(z - 0.6);
      if (a < 0.02) continue;
      const hx = sx(X, z), hy = sy(z), tx = sx(X, z2), ty = sy(z2);
      const g = ctx.createLinearGradient(tx, ty, hx, hy);
      g.addColorStop(0, rgba(acc, 0));
      g.addColorStop(1, rgba(mixHex(acc, '#fff', 0.5), a));
      ctx.strokeStyle = g;
      ctx.lineWidth = Math.min(5, 2.2 / z + 0.6);
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      const r = Math.min(40, 10 / z + 4);
      ctx.globalAlpha = clamp01(a);
      ctx.drawImage(spr, hx - r, hy - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
    }
    if (fill) {
      // horizon glow
      const hg = ctx.createRadialGradient(x, horizon, 0, x, horizon, 900);
      hg.addColorStop(0, rgba(mixHex(col, '#fff', 0.3), 0.32 * I));
      hg.addColorStop(0.3, rgba(col, 0.1 * I));
      hg.addColorStop(1, rgba(col, 0));
      ctx.save();
      ctx.translate(x, horizon);
      ctx.scale(1, 0.12);
      ctx.translate(-x, -horizon);
      ctx.fillStyle = hg;
      ctx.fillRect(x - 900, horizon - 900, 1800, 1800);
      ctx.restore();
    }
  });
  return <canvas ref={ref} width={Math.round(W * res)} height={Math.round(H * res)} style={{...full, transform: roll ? `rotate(${roll}deg) scale(1.15)` : undefined, ...style}} />;
};

/* ======================================================================
 * HoloTunnel — grid tunnel for fly-throughs
 * ==================================================================== */
export type HoloTunnelProps = {
  /** Vanishing point. */
  x?: number;
  y?: number;
  shape?: 'rect' | 'circle' | 'hex';
  /** Tunnel cross-section half-size (world units). */
  width?: number;
  height?: number;
  /** Distance between frames (world). */
  gap?: number;
  /** Fly-through speed (world / frame). */
  speed?: number;
  /** Explicit travelled distance (overrides speed·frame). */
  travel?: number;
  /** Roll in degrees (static) + twist (deg per world unit of depth). */
  roll?: number;
  twist?: number;
  color?: string;
  accent?: string;
  fog?: number;
  /** Longitudinal rails per side. */
  rails?: number;
  pulses?: number;
  /** Glowing holo panels on the walls. */
  panels?: number;
  intensity?: number;
  boost?: number;
  focal?: number;
  seed?: number;
  frame?: number;
  style?: React.CSSProperties;
};

/** Holographic tunnel of glowing frames + rails receding to a vanishing point; fly through it with `speed`/`travel`. */
export const HoloTunnel: React.FC<HoloTunnelProps> = ({
  x = CX, y = CY, shape = 'rect', width = 3.2, height = 1.8, gap = 1.4, speed = 0.08, travel, roll = 0, twist = 0, color, accent, fog = 12, rails = 6, pulses = 16, panels = 10, intensity = 1, boost = 0, focal = 820, seed = 12, frame, style,
}) => {
  const f = useF(frame);
  const col = colorOf(color, VC.lilac);
  const acc = colorOf(accent, VC.cyan);
  const ref = useCanvasDraw((ctx) => {
    const I = intensity * (1 + 0.5 * boost);
    const tr = travel ?? f * speed;
    const zNear = 0.18, zFar = fog * 2.4;
    const fogA = (z: number) => Math.exp(-Math.pow(z / fog, 1.3)) * clamp01((z - zNear) / 0.5);
    // perimeter point at param s ∈ [0,1)
    const per = (s: number): [number, number] => {
      if (shape === 'circle') {
        const a = s * Math.PI * 2;
        return [Math.cos(a) * width, Math.sin(a) * height];
      }
      const nSides = shape === 'hex' ? 6 : 4;
      if (shape === 'hex') {
        const seg = Math.floor(s * nSides), t = s * nSides - seg;
        const a0 = (seg / nSides) * Math.PI * 2, a1 = ((seg + 1) / nSides) * Math.PI * 2;
        return [mix(Math.cos(a0), Math.cos(a1), t) * width, mix(Math.sin(a0), Math.sin(a1), t) * height];
      }
      // rect: perimeter walk
      const P = 4 * (width + height);
      let d = s * P;
      if (d < 2 * width) return [-width + d, -height];
      d -= 2 * width;
      if (d < 2 * height) return [width, -height + d];
      d -= 2 * height;
      if (d < 2 * width) return [width - d, height];
      d -= 2 * width;
      return [-width, height - d];
    };
    const proj = (px: number, py: number, z: number): [number, number] => {
      const a = ((roll + twist * z) * Math.PI) / 180;
      const c = Math.cos(a), s = Math.sin(a);
      const rx = px * c - py * s, ry = px * s + py * c;
      return [x + (rx * focal) / z, y + (ry * focal) / z];
    };
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round';
    const off = ((tr % gap) + gap) % gap;
    const segs = shape === 'circle' ? 64 : shape === 'hex' ? 6 : 4;
    // frames
    for (const [wm, am] of [[9, 0.07], [3.2, 0.22], [1, 1]] as const) {
      for (let k = 0; k < 200; k++) {
        const z = k * gap - off + gap * 0.5;
        if (z < zNear) continue;
        if (z > zFar) break;
        const major = Math.round((tr - off) / gap + k) % 4 === 0;
        const a = fogA(z) * I * am * (major ? 1.5 : 0.75);
        if (a < 0.004) continue;
        ctx.strokeStyle = rgba(major && wm === 1 ? mixHex(col, '#fff', 0.5) : col, a);
        ctx.lineWidth = Math.min(10, (2.2 * wm) / z + 0.4);
        ctx.beginPath();
        for (let i = 0; i <= segs; i++) {
          const [px, py] = per(i / segs);
          const [qx, qy] = proj(px, py, z);
          if (i === 0) ctx.moveTo(qx, qy);
          else ctx.lineTo(qx, qy);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
    // rails
    const nr = rails * 4;
    for (const [wm, am] of [[6, 0.12], [1, 0.95]] as const) {
      for (let i = 0; i < nr; i++) {
        const [px, py] = per((i + 0.5) / nr);
        const zs = [zNear + 0.05, 0.5, 1, 2, 4, fog * 0.7, fog * 1.3, zFar];
        // draw as polyline (twist makes it curve)
        for (let j = 0; j < zs.length - 1; j++) {
          const [ax, ay] = proj(px, py, zs[j]);
          const [bx, by] = proj(px, py, zs[j + 1]);
          ctx.strokeStyle = rgba(col, fogA((zs[j] + zs[j + 1]) / 2) * I * am * 0.6);
          ctx.lineWidth = Math.max(0.5, (1.2 * wm) / ((zs[j] + zs[j + 1]) / 2) * 0.6);
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }
      }
    }
    // wall panels (quads that travel with the tunnel)
    const rnd = prng(seed);
    for (let i = 0; i < panels; i++) {
      const s0 = rnd(), sl = 0.03 + rnd() * 0.05, zl = 0.6 + rnd() * 1.6, cyc = gap * (6 + Math.floor(rnd() * 10));
      const z0 = ((rnd() * cyc - tr) % cyc + cyc) % cyc + 0.4;
      if (z0 > zFar) continue;
      const a = fogA(z0 + zl / 2) * I * 0.5;
      if (a < 0.01) continue;
      const [p1x, p1y] = per(s0), [p2x, p2y] = per(Math.min(0.999, s0 + sl));
      const q = [proj(p1x * 0.98, p1y * 0.98, z0), proj(p2x * 0.98, p2y * 0.98, z0), proj(p2x * 0.98, p2y * 0.98, z0 + zl), proj(p1x * 0.98, p1y * 0.98, z0 + zl)];
      const pc = i % 3 === 0 ? acc : col;
      const pg = ctx.createLinearGradient(q[0][0], q[0][1], q[2][0], q[2][1]);
      pg.addColorStop(0, rgba(pc, a * 0.42));
      pg.addColorStop(0.5, rgba(pc, a * 0.12));
      pg.addColorStop(1, rgba(pc, a * 0.03));
      ctx.fillStyle = pg;
      ctx.beginPath();
      q.forEach(([qx, qy], j) => (j ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy)));
      ctx.closePath();
      ctx.fill();
      // bright leading edge + faint content lines
      ctx.strokeStyle = rgba(mixHex(pc, '#fff', 0.4), a * 1.2);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(q[0][0], q[0][1]);
      ctx.lineTo(q[1][0], q[1][1]);
      ctx.stroke();
      ctx.strokeStyle = rgba(pc, a * 0.4);
      ctx.lineWidth = 1;
      for (let li = 1; li <= 3; li++) {
        const t = li / 4.5;
        const ax = mix(q[0][0], q[3][0], t), ay = mix(q[0][1], q[3][1], t);
        const bx = mix(q[1][0], q[2][0], t), by = mix(q[1][1], q[2][1], t);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(mix(ax, bx, 0.3 + 0.6 * ((i * li) % 5) / 5), mix(ay, by, 0.3 + 0.6 * ((i * li) % 5) / 5));
        ctx.stroke();
      }
    }
    // light packets along rails
    const spr = glowSprite(acc, 0.8);
    for (let i = 0; i < pulses; i++) {
      const ri = Math.floor(rnd() * nr);
      const [px, py] = per((ri + 0.5) / nr);
      const sp = 0.05 + rnd() * 0.12;
      const span = zFar * 0.8;
      const z = span - ((f * sp + rnd() * span + tr) % span) + zNear + 0.1;
      const a = fogA(z) * I;
      if (a < 0.02) continue;
      const [hx, hy] = proj(px, py, z);
      const [tx, ty] = proj(px, py, z + 0.7);
      const g = ctx.createLinearGradient(tx, ty, hx, hy);
      g.addColorStop(0, rgba(acc, 0));
      g.addColorStop(1, rgba(mixHex(acc, '#fff', 0.5), a));
      ctx.strokeStyle = g;
      ctx.lineWidth = Math.min(6, 2 / z + 0.8);
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      const r = Math.min(46, 9 / z + 4);
      ctx.globalAlpha = clamp01(a);
      ctx.drawImage(spr, hx - r, hy - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
    }
    // vanishing glow
    const vg = ctx.createRadialGradient(x, y, 0, x, y, 420);
    vg.addColorStop(0, rgba('#ffffff', 0.18 * I));
    vg.addColorStop(0.2, rgba(col, 0.1 * I));
    vg.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = vg;
    ctx.fillRect(x - 420, y - 420, 840, 840);
  });
  return <canvas ref={ref} width={W} height={H} style={{...full, ...style}} />;
};

/* ======================================================================
 * Scanlines
 * ==================================================================== */
export type ScanlinesProps = {
  opacity?: number;
  /** Line period in px. */
  spacing?: number;
  /** Rolling bright band speed (px/frame); 0 = none. */
  roll?: number;
  color?: string;
  frame?: number;
  style?: React.CSSProperties;
};

/** CRT/holo scanlines with an optional rolling bright band. Cheap. */
export const Scanlines: React.FC<ScanlinesProps> = ({opacity = 0.18, spacing = 3, roll = 4, color, frame, style}) => {
  const f = useF(frame);
  const col = colorOf(color, VC.lilac);
  const by = roll ? ((f * roll) % (H + 400)) - 200 : -9999;
  return (
    <div style={{...full, overflow: 'hidden', ...style}}>
      <div style={{...full, opacity, mixBlendMode: 'multiply', background: `repeating-linear-gradient(180deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) ${spacing * 0.5}px, rgba(0,0,0,0.85) ${spacing * 0.5}px, rgba(0,0,0,0.85) ${spacing}px)`}} />
      {roll !== 0 && (
        <div style={{position: 'absolute', left: 0, right: 0, top: by, height: 160, mixBlendMode: 'screen', opacity: opacity * 1.4,
          background: `linear-gradient(180deg, transparent, ${rgba(col, 0.12)} 60%, ${rgba('#fff', 0.22)} 96%, transparent)`}} />
      )}
    </div>
  );
};

/* ======================================================================
 * DataRain
 * ==================================================================== */
export type DataRainProps = {
  /** Glyph size of the nearest layer (px). */
  fontSize?: number;
  /** Column density 0..1. */
  density?: number;
  /** Fall speed multiplier. */
  speed?: number;
  color?: string;
  accent?: string;
  /** Glyph alphabet. */
  glyphs?: string;
  /** Depth layers (1–3). */
  layers?: number;
  intensity?: number;
  /** Fade top/bottom edges. */
  fade?: boolean;
  area?: {x: number; y: number; w: number; h: number};
  /** Layer compositing (see CanvasBlend). */
  blend?: CanvasBlend;
  seed?: number;
  frame?: number;
  style?: React.CSSProperties;
};

const DEFAULT_GLYPHS = '01{}[]<>/=+*#$&|:;ABCDEF0123456789ƒλΣΔ∑≡→⟨⟩';

/** Falling monospace glyph streams with bright cyan heads and lilac trails, in up to 3 depth layers. */
export const DataRain: React.FC<DataRainProps> = ({fontSize = 22, density = 0.55, speed = 1, color, accent, glyphs = DEFAULT_GLYPHS, layers = 3, intensity = 1, fade = true, area, blend = 'normal', seed = 31, frame, style}) => {
  const f = useF(frame);
  const col = colorOf(color, VC.lilac);
  const acc = colorOf(accent, VC.cyan);
  const A = area ?? {x: 0, y: 0, w: W, h: H};
  const chars = Array.from(glyphs);
  const ref = useCanvasDraw((ctx) => {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const spr = glowSprite(acc, 0.7);
    for (let L = layers - 1; L >= 0; L--) {
      const scale = [1, 0.66, 0.45][L] ?? 0.45;
      const fs = fontSize * scale;
      const lh = fs * 1.15;
      const colW = fs * 1.05;
      const nCols = Math.floor(A.w / colW);
      const la = [1, 0.5, 0.28][L] ?? 0.25;
      ctx.font = `${L === 0 ? 600 : 500} ${fs.toFixed(1)}px 'DejaVu Sans Mono', monospace`;
      for (let c = 0; c < nCols; c++) {
        if (hash2(c * 7 + L * 1000, seed) > density) continue;
        const r1 = hash2(c, seed + L * 3 + 1), r2 = hash2(c, seed + L * 3 + 2), r3 = hash2(c, seed + L * 3 + 3);
        const sp = (0.18 + r1 * 0.35) * speed * scale * 1.5 * lh;
        const len = 8 + Math.floor(r2 * 22);
        const cycle = A.h + len * lh + 200;
        const head = ((f * sp + r3 * cycle) % cycle) - 100;
        const x = A.x + c * colW + colW / 2;
        for (let k = 0; k < len; k++) {
          const yy = A.y + Math.floor((head - k * lh) / lh) * lh;
          if (yy < A.y - lh || yy > A.y + A.h + lh) continue;
          const row = Math.floor((head - k * lh) / lh);
          const flick = Math.floor(f / (3 + Math.floor(hash2(c, row) * 9)));
          const ch = chars[Math.floor(hash2(c * 131 + row, flick + seed) * chars.length)];
          const t = k / len;
          let a = (1 - t) * (1 - t) * la * intensity;
          if (fade) {
            const ey = (yy - A.y) / A.h;
            a *= clamp01(ey / 0.12) * clamp01((1 - ey) / 0.12);
          }
          if (a < 0.01) continue;
          if (k === 0) {
            ctx.globalAlpha = clamp01(a * 0.8);
            ctx.drawImage(spr, x - fs * 1.4, yy - fs * 1.4, fs * 2.8, fs * 2.8);
            ctx.globalAlpha = 1;
            ctx.fillStyle = rgba('#ffffff', a);
          } else if (k < 3) ctx.fillStyle = rgba(mixHex(acc, col, k / 3), a);
          else ctx.fillStyle = rgba(col, a * 0.85);
          ctx.fillText(ch, x, yy);
        }
      }
    }
  });
  return <canvas ref={ref} width={W} height={H} style={{...full, mixBlendMode: blend, ...style}} />;
};
