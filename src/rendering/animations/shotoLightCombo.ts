import type { CharacterState } from '../../engine/characters/CharacterState';
import type { MoveDefinition } from '../../engine/data/moves';
import { recoveryFrames } from '../../engine/combat/frameData';
import { getPhaseAnimationFrame } from './AnimationPlayback';
import image from '../../assets/sprites/characters/shoto/light-combo.png';
import atlas from '../../assets/sprites/characters/shoto/light-combo.atlas.json';

export const shotoLightComboSource = { key:'shoto-light-combo', image, atlas };
export const shotoLightComboClip = { key:shotoLightComboSource.key, start:134, end:140, frameRate:6, repeat:0 };

// Original poses 3/6/7 are contacts; pose 5 is omitted. Poses 1/8 leave/enter idle.
// Each button samples only its authored strike; no input means no next strike.
const strikes = [
  { startup:[0,1], startupHolds:[3,1], active:2, recovery:[1,6], recoveryHolds:[1,2] },
  { startup:[3], startupHolds:[1], active:4, recovery:[3,6], recoveryHolds:[1,2] },
  { startup:[4], startupHolds:[1], active:5, recovery:[6], recoveryHolds:[1] },
];
export function getShotoLightComboPose(state:CharacterState, move:MoveDefinition) {
  if (move.id !== 'light-punch' || !state.attack) return undefined;
  const step = Math.min(2, (state.chain?.length ?? 1) - 1);
  const strike = strikes[step];
  const elapsed = state.attack.elapsedFrames;
  const local = elapsed < move.startup ? getPhaseAnimationFrame(strike.startup,strike.startupHolds,elapsed,move.startup) :
    elapsed < move.startup+move.activeFrames ? strike.active :
    getPhaseAnimationFrame(strike.recovery,strike.recoveryHolds,elapsed-move.startup-move.activeFrames,recoveryFrames(move,state.attack));
  return { texture:shotoLightComboSource.key, frame:134+local, scale:1, flipX:state.facing==='left' };
}
