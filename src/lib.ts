import {Easing, interpolate} from 'remotion';
import audio from './audio.json';

export const FPS = 60;
export const PER = 0.44776219579374094; // seconds per beat (134 BPM)
/** Frame of beat k (beat 0 = video start). */
export const B = (k: number) => Math.round(k * PER * FPS);
export const BEAT = PER * FPS; // ≈26.87 frames
export const DURATION = (audio as any).frames as number;

export const C = {
  canvas: '#F1EDF8',
  plum: '#39294B',
  plumSoft: '#6E5C86',
  purple: '#8C6BEA',
  purpleDeep: '#6A45E0',
  lilac: '#E4DBF7',
  lilac2: '#D6C8F5',
  pistachio: '#E7F4B9',
  green: '#36997D',
  amber: '#ECAF42',
  white: '#FFFFFF',
  night: '#0E0818',
  night2: '#1C1030',
};

export const FONT = "'Inter', 'Inter Display', system-ui, sans-serif";
export const DISPLAY = "'Inter Display', 'Inter', system-ui, sans-serif";
export const MONO = "'DejaVu Sans Mono', 'Liberation Mono', monospace";

export const expoOut = Easing.bezier(0.16, 1, 0.3, 1);
export const expoInOut = Easing.bezier(0.87, 0, 0.13, 1);
export const quintOut = Easing.bezier(0.22, 1, 0.36, 1);
export const backOut = Easing.bezier(0.34, 1.56, 0.64, 1);
export const smooth = Easing.bezier(0.45, 0, 0.2, 1);

/** 0→1 progress from start over dur frames with easing. */
export const prog = (f: number, start: number, dur: number, ease = expoOut) =>
  interpolate(f, [start, start + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

const A = audio as {bands: number[][]; rms: number[]; kicks: number[]};

/** Smoothed band energy (0..~1.5) at frame. */
export const band = (f: number, i: number, smoothN = 3) => {
  let s = 0, n = 0;
  for (let k = 0; k < smoothN; k++) {
    const row = A.bands[Math.max(0, Math.min(A.bands.length - 1, Math.round(f) - k))];
    if (row) { s += row[i]; n++; }
  }
  return n ? s / n : 0;
};
export const rms = (f: number) => A.rms[Math.max(0, Math.min(A.rms.length - 1, Math.round(f)))] ?? 0;

/** Decaying pulse after each detected kick (1 on the kick, → 0). */
export const kick = (f: number, decay = 7) => {
  let best = 0;
  for (const k of A.kicks) {
    if (k > f) break;
    const d = f - k;
    if (d < decay * 5) best = Math.max(best, Math.exp(-d / decay));
  }
  return best;
};

/** Deterministic pseudo random. */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
