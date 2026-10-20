/* Deterministic Canvas2D particle fields with depth-of-field bokeh: dust, bokeh, sparkles, embers. */
import React from 'react';
import {VC, W, H, bokehSprite, clamp01, colorOf, full, glowSprite, mix, prng, starSprite, useCanvasDraw, useF, type CanvasBlend} from './util';

export type ParticleKind = 'dust' | 'bokeh' | 'sparkle' | 'ember';

export type ParticleFieldProps = {
  kind?: ParticleKind;
  count?: number;
  /** Palette (hex or named). */
  colors?: string[];
  /** Focus distance 0 (near) … 1 (far). Particles away from it become large soft bokeh discs. */
  focus?: number;
  /** Depth-of-field strength (bokeh disc size multiplier). */
  aperture?: number;
  /** Drift speed multiplier. */
  speed?: number;
  /** Drift direction in degrees (dust default −100 = slowly up; embers rise regardless). */
  direction?: number;
  /** Size multiplier. */
  size?: number;
  opacity?: number;
  /** Camera parallax offset in px (near particles move ~1.6×, far ~0.3×). */
  camX?: number;
  camY?: number;
  /** Extra brightness 0..1 (feed kick(f) / band(f, 3) for audio-reactive sparkle). */
  boost?: number;
  /** Restrict to a region (px). Default full frame. */
  area?: {x: number; y: number; w: number; h: number};
  /** Canvas resolution multiplier. */
  res?: number;
  /** Layer compositing (see CanvasBlend). */
  blend?: CanvasBlend;
  seed?: number;
  frame?: number;
  style?: React.CSSProperties;
};

const DEFAULT_COLORS: Record<ParticleKind, string[]> = {
  dust: ['#E8E0FF', '#CDBBFF', '#FFFFFF', '#B9A4F5'],
  bokeh: ['#7B4DFF', '#9A5CFF', '#C04FD0', '#4FC8FF', '#6A45E0', '#D9F08A'],
  sparkle: ['#FFFFFF', '#CFF6FF', '#E2D6FF'],
  ember: ['#E7F4B9', '#FFD58A', '#FF9DB8', '#CDBBFF'],
};

/** Deterministic particle field. Use the presets DustField / Bokeh / Sparkles / Embers for sane defaults. */
export const ParticleField: React.FC<ParticleFieldProps> = ({
  kind = 'dust', count, colors, focus, aperture = 1, speed = 1, direction, size = 1, opacity = 1, camX = 0, camY = 0, boost = 0, area, res = 1, blend = 'normal', seed = 21, frame, style,
}) => {
  const f = useF(frame);
  const pal = (colors ?? DEFAULT_COLORS[kind]).map((c) => colorOf(c, '#ffffff'));
  const n = count ?? (kind === 'dust' ? 170 : kind === 'bokeh' ? 34 : kind === 'sparkle' ? 50 : 90);
  const foc = focus ?? (kind === 'bokeh' ? 0.95 : 0.55);
  const dir = ((direction ?? (kind === 'ember' ? -90 : -100)) * Math.PI) / 180;
  const A = area ?? {x: 0, y: 0, w: W, h: H};
  const ref = useCanvasDraw((ctx, cw) => {
    const s = cw / W;
    ctx.scale(s, s);
    ctx.globalCompositeOperation = 'lighter';
    const rnd = prng(seed + kind.length * 7);
    const pad = 140;
    const spanX = A.w + pad * 2, spanY = A.h + pad * 2;
    for (let i = 0; i < n; i++) {
      const x0 = rnd(), y0 = rnd(), z = rnd(), r1 = rnd(), r2 = rnd(), r3 = rnd(), ph = rnd() * 100;
      const c = pal[Math.floor(r1 * pal.length) % pal.length];
      const depth = mix(1.6, 0.3, z); // near → far
      const vx = Math.cos(dir), vy = Math.sin(dir);
      let base = 0, alpha = 0, px = 0, py = 0;
      if (kind === 'ember') {
        // rising with lifetime cycle and turbulent sway
        const life = 200 + r2 * 260;
        const cyc = ((f * speed) / life + r3) % 1;
        const rise = cyc * (A.h + pad * 2);
        px = A.x - pad + x0 * spanX + Math.sin(f * 0.02 + ph) * 26 * depth + Math.sin(f * 0.053 + ph * 2) * 9 + camX * depth;
        py = A.y + A.h + pad - rise * (0.55 + 0.45 * depth) + camY * depth;
        base = (1.1 + r2 * 2.2) * depth * size;
        alpha = Math.sin(Math.PI * cyc) * (0.55 + 0.45 * Math.sin(f * 0.21 + ph)) * 0.9;
      } else {
        const sp = (kind === 'bokeh' ? 0.12 : kind === 'sparkle' ? 0.08 : 0.22) * speed * depth * (0.5 + r2);
        const wob = kind === 'bokeh' ? 18 : 10;
        px = A.x - pad + (((x0 * spanX + vx * f * sp + Math.sin(f * 0.011 + ph) * wob * depth + camX * depth) % spanX) + spanX) % spanX;
        py = A.y - pad + (((y0 * spanY + vy * f * sp + Math.cos(f * 0.009 + ph) * wob * depth + camY * depth) % spanY) + spanY) % spanY;
        base = (kind === 'bokeh' ? 6 + r2 * 10 : 0.9 + Math.pow(r2, 2) * 2.4) * depth * size;
        alpha = kind === 'sparkle' ? Math.pow(Math.max(0, Math.sin(f * (0.05 + r3 * 0.08) + ph)), 6) : 0.55 + 0.45 * Math.sin(f * (0.02 + r3 * 0.04) + ph);
      }
      if (px < -pad || px > W + pad || py < -pad || py > H + pad) continue;
      const coc = Math.abs(z - foc) * aperture * (kind === 'bokeh' ? 60 : 30) * depth; // circle of confusion radius (px)
      const b = 1 + boost * (0.6 + 0.4 * Math.sin(ph));
      if (kind === 'sparkle') {
        const sz = (10 + r2 * 26) * size * depth * (0.6 + 0.4 * alpha);
        ctx.globalAlpha = clamp01(alpha * opacity * b);
        if (ctx.globalAlpha < 0.01) continue;
        ctx.drawImage(starSprite(c), px - sz, py - sz, sz * 2, sz * 2);
        continue;
      }
      if (coc < 2.2) {
        // in focus: crisp glowing point
        const sz = base * 5;
        ctx.globalAlpha = clamp01(alpha * opacity * 0.95 * b);
        ctx.drawImage(glowSprite(c, 0.8), px - sz, py - sz, sz * 2, sz * 2);
      } else {
        // defocused: bokeh disc, energy spread over the disc
        const rad = base + coc;
        const en = kind === 'bokeh' ? Math.min(1, 0.32 + (base * base * 4) / (rad * rad)) : Math.min(1, (base * base * 6) / (rad * rad) + 0.1);
        ctx.globalAlpha = clamp01(alpha * opacity * (kind === 'bokeh' ? 0.55 : 0.8) * en * b);
        if (ctx.globalAlpha < 0.005) continue;
        ctx.drawImage(bokehSprite(c, kind === 'bokeh' ? 0.6 : 0.3), px - rad, py - rad, rad * 2, rad * 2);
      }
    }
  });
  return <canvas ref={ref} width={Math.round(W * res)} height={Math.round(H * res)} style={{...full, mixBlendMode: blend, ...style}} />;
};
/** Alias of ParticleField (name used in the style brief). */
export const Particles = ParticleField;

type Preset = Omit<ParticleFieldProps, 'kind'>;
/** Drifting dust motes with depth of field (near ones become soft discs). */
export const DustField: React.FC<Preset> = (p) => <ParticleField kind="dust" {...p} />;
/** Big soft out-of-focus bokeh discs (violet/cyan/pistachio). */
export const Bokeh: React.FC<Preset> = (p) => <ParticleField kind="bokeh" {...p} />;
/** Twinkling 4-point star sparkles. */
export const Sparkles: React.FC<Preset> = (p) => <ParticleField kind="sparkle" {...p} />;
/** Rising flickering embers (pistachio / warm / lilac). */
export const Embers: React.FC<Preset> = (p) => <ParticleField kind="ember" {...p} />;

export const PARTICLE_DEFAULTS = {colors: DEFAULT_COLORS, violet: VC.violet};
