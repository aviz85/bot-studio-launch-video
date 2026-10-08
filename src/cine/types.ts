/** Props every scene receives. `from` = global frame where the scene starts, `dur` = its length in frames.
 *  Inside a scene, useCurrentFrame() is LOCAL (0 at scene start); global frame = local + from (use for audio-reactive helpers). */
export type SceneProps = {from: number; dur: number};
