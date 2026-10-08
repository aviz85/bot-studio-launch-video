// Speed ramps / time remapping. Real (edit) time t → animation time τ with piecewise speeds blended by
// smoothstep, integrated analytically: τ is C2, speed is C1 — no velocity jumps, no stutter.
//
//   const r = heroRamp(B(4), 120);          // over 4 beats of screen time, play 120 frames of animation
//   const tau = r.time(t);                  // drive your animation / camPath with tau
//   const blurBoost = r.speed(t);           // ×speed for motion blur (3 = fast, 0.25 = slow-mo)

export type RampSeg = {
  /** playback speed during this segment (1 = real time, 3 = fast, 0.25 = slow-mo, 0 = freeze) */
  speed: number;
  /** real frame (local) where this segment ends; omit on the last segment */
  until?: number;
};

export type Ramp = {
  /** animation time at real time t */
  time: (t: number) => number;
  /** speed (dτ/dt) at real time t */
  speed: (t: number) => number;
  /** real time at which the animation reaches τ (bisection) */
  inverse: (tau: number) => number;
  segs: RampSeg[];
};

// ∫ smoothstep from -∞ to u (smoothstep clamped 0..1)
const I = (u: number) => (u <= 0 ? 0 : u >= 1 ? u - 0.5 : u * u * u - (u * u * u * u) / 2);
const S = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

/** Build a ramp from segments. `blend` = frames of smooth speed transition centred on each boundary (default 10). */
export const makeRamp = (segs: RampSeg[], blend = 10): Ramp => {
  const bounds = segs.slice(0, -1).map((s) => s.until ?? 0);
  const w = segs.slice(0, -1).map((_, j) => {
    // keep blends from overlapping neighbours
    const prev = j > 0 ? bounds[j] - bounds[j - 1] : Infinity;
    const next = j < bounds.length - 1 ? bounds[j + 1] - bounds[j] : Infinity;
    return Math.max(0.5, Math.min(blend, prev, next));
  });
  const raw = (t: number) => {
    let s = segs[0].speed * t;
    for (let j = 0; j < bounds.length; j++) {
      const ds = segs[j + 1].speed - segs[j].speed;
      const a = bounds[j] - w[j] / 2;
      s += ds * w[j] * (I((t - a) / w[j]) - I((0 - a) / w[j]));
    }
    return s;
  };
  const speed = (t: number) => {
    let s = segs[0].speed;
    for (let j = 0; j < bounds.length; j++) s += (segs[j + 1].speed - segs[j].speed) * S((t - bounds[j] + w[j] / 2) / w[j]);
    return s;
  };
  const inverse = (tau: number) => {
    let lo = -1e4, hi = 1e5;
    for (let i = 0; i < 60; i++) {
      const m = (lo + hi) / 2;
      if (raw(m) < tau) lo = m; else hi = m;
    }
    return (lo + hi) / 2;
  };
  return {time: raw, speed, inverse, segs};
};

/** Functional form: animation time at t for segments. */
export const ramp = (t: number, segs: RampSeg[], blend = 10) => makeRamp(segs, blend).time(t);

/** Scale a segment list so that `dur` real frames play exactly `animDur` animation frames. */
const normalize = (segs: RampSeg[], dur: number, animDur: number | undefined, blend: number): Ramp => {
  if (animDur === undefined) return makeRamp(segs, blend);
  const k = animDur / makeRamp(segs, blend).time(dur);
  return makeRamp(segs.map((s) => ({...s, speed: s.speed * k})), blend);
};

/** HERO RAMP: whip in fast, glide through a long slow-motion middle, snap out fast.
 *  dur = real frames on screen; animDur = animation frames to cover (default = dur). */
export const heroRamp = (dur: number, animDur?: number, o: {fast?: number; slow?: number; inFrac?: number; outFrac?: number; blend?: number} = {}) => {
  const {fast = 3.2, slow = 0.22, inFrac = 0.16, outFrac = 0.16, blend = Math.max(6, dur * 0.12)} = o;
  return normalize([{speed: fast, until: dur * inFrac}, {speed: slow, until: dur * (1 - outFrac)}, {speed: fast}], dur, animDur, blend);
};

/** SNAP IN: arrives very fast and settles to real time (speed fast → 1). */
export const snapIn = (dur: number, animDur?: number, o: {fast?: number; at?: number; blend?: number} = {}) => {
  const {fast = 4, at = 0.18, blend = Math.max(6, dur * 0.2)} = o;
  return normalize([{speed: fast, until: dur * at}, {speed: 1}], dur, animDur, blend);
};

/** SNAP OUT: real time, then accelerates out (speed 1 → fast) — leave a shot on a whoosh. */
export const snapOut = (dur: number, animDur?: number, o: {fast?: number; at?: number; blend?: number} = {}) => {
  const {fast = 4, at = 0.8, blend = Math.max(6, dur * 0.15)} = o;
  return normalize([{speed: 1, until: dur * at}, {speed: fast}], dur, animDur, blend);
};

/** SLOW-MO HOLD: real time, then drops into near-freeze slow motion that holds to the end. */
export const slowMoHold = (dur: number, animDur?: number, o: {slow?: number; at?: number; blend?: number} = {}) => {
  const {slow = 0.1, at = 0.3, blend = Math.max(8, dur * 0.25)} = o;
  return normalize([{speed: 1, until: dur * at}, {speed: slow}], dur, animDur, blend);
};

/** Speed ramp locked to beats: speeds per beat-interval. `beats` are LOCAL frames (e.g. beatsToLocal), length = speeds.length - 1. */
export const beatRamp = (beatFrames: number[], speeds: number[], blend = 8) =>
  makeRamp(speeds.map((s, i) => ({speed: s, until: i < beatFrames.length ? beatFrames[i] : undefined})), blend);
