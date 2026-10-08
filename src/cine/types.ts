/** Props every scene receives. `from` = global frame where the scene starts, `dur` = its length in frames.
 *  Inside a scene, useCurrentFrame() is LOCAL (0 at scene start); global frame = local + from (use for audio-reactive helpers). */
export type SceneProps = {from: number; dur: number};

/** 3D vector [x, y, z] in world px. World axes follow CSS: +x right, +y DOWN, +z toward the viewer. */
export type V3 = [number, number, number];

/** An easing: a named curve or any (u: 0..1) => number function (e.g. lib.ts `expoOut`). */
export type EaseName =
  | 'linear' | 'smooth' | 'sine'
  | 'quadIn' | 'quadOut' | 'quadInOut'
  | 'cubicIn' | 'cubicOut' | 'cubicInOut'
  | 'quintIn' | 'quintOut' | 'quintInOut'
  | 'expoIn' | 'expoOut' | 'expoInOut'
  | 'backIn' | 'backOut' | 'backInOut'
  | 'circOut' | 'hold';
export type Ease = EaseName | ((u: number) => number);
