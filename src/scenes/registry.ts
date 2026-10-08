// Scene registry — owned by the director. Beat ranges are FIXED (B(k) = frame of beat k).
export type SceneDef = {id: string; title: string; startBeat: number; endBeat: number | null};
export const SCENE_DEFS: SceneDef[] = [
  {id: 's01', title: 'Black box', startBeat: 0, endBeat: 16},
  {id: 's02', title: 'See it think', startBeat: 16, endBeat: 32},
  {id: 's03', title: 'Reveal', startBeat: 32, endBeat: 40},
  {id: 's04', title: 'Build with AI', startBeat: 40, endBeat: 52},
  {id: 's05', title: 'States', startBeat: 52, endBeat: 64},
  {id: 's06', title: 'Minds & judgments', startBeat: 64, endBeat: 80},
  {id: 's07', title: 'Rules & real work', startBeat: 80, endBeat: 96},
  {id: 's08', title: 'Live', startBeat: 96, endBeat: 120},
  {id: 's09', title: 'Conversation & code', startBeat: 120, endBeat: 140},
  {id: 's10', title: 'Factory & finale', startBeat: 140, endBeat: null},
];
