// Small bitmap masks generated once with Canvas2D at module load (deterministic PNG data URLs). SVG filters
// sample them through <feImage> (upscaled, bilinear). Bitmaps decode once and are cached by the browser —
// far cheaper than SVG-image masks, which re-rasterize every frame.
import {rand} from '../lib';

const cache = new Map<string, string>();

/** Render a w×h alpha mask (white, alpha = fn(u, v) with u,v in 0..1) to a PNG data URL. '' outside a browser. */
export const maskPng = (key: string, w: number, h: number, fn: (u: number, v: number) => number) => {
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  if (typeof document === 'undefined') return '';
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  const im = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = Math.max(0, Math.min(1, fn((x + 0.5) / w, (y + 0.5) / h)));
    const i = (y * w + x) * 4;
    im.data[i] = 255;
    im.data[i + 1] = 255;
    im.data[i + 2] = 255;
    im.data[i + 3] = Math.round(v * 255);
  }
  ctx.putImageData(im, 0, 0);
  const url = c.toDataURL('image/png');
  cache.set(key, url);
  return url;
};

/** Angular sector mask for radial blurs, with a sharp centre. lr = left/right sectors (cos²θ), else top/bottom (sin²θ).
 *  `core` = radius (fraction of half-diagonal) that stays sharp. */
export const sectorMask = (lr: boolean, core = 0.1) =>
  maskPng(`sector-${lr ? 'lr' : 'tb'}-${core}`, 240, 135, (u, v) => {
    const dx = (u - 0.5) * 16, dy = (v - 0.5) * 9;
    const r = Math.hypot(dx / 8, dy / 4.5) / Math.SQRT2 * 1.25;
    const c2 = Math.cos(Math.atan2(dy, dx)) ** 2;
    const k = Math.min(1, Math.max(0, (r - core) / 0.55));
    return (lr ? c2 : 1 - c2) * k * k * (3 - 2 * k);
  });

/** Random full-width horizontal bands (glitch slices). Pattern `seed` (cached; keep seeds to a small set). */
export const bandMask = (seed: number, density = 0.5) =>
  maskPng(`band-${seed}-${density}`, 4, 1080, (_u, v) => {
    const y = v * 1080;
    // 7 bands of random height at random positions
    for (let i = 0; i < 7; i++) {
      const y0 = rand(seed * 3.17 + i * 7.31) * 1080;
      const h = 6 + rand(seed * 1.91 + i * 2.53) * 110 * density;
      if (y >= y0 && y < y0 + h) return 1;
    }
    return 0;
  });
