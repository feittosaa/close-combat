import type { CharacterState } from '../../engine/characters/CharacterState';
import { getCharacterById } from '../../engine/data/characters';
import { getTimedAnimationFrame, type AnimationClip } from './AnimationPlayback';
import image0 from '../../assets/sprites/characters/shoto/light-punch.png';
import atlas0 from '../../assets/sprites/characters/shoto/light-punch.atlas.json';
import image1 from '../../assets/sprites/characters/shoto/heavy-punch.png';
import atlas1 from '../../assets/sprites/characters/shoto/heavy-punch.atlas.json';
import image2 from '../../assets/sprites/characters/shoto/light-kick.png';
import atlas2 from '../../assets/sprites/characters/shoto/light-kick.atlas.json';
import image3 from '../../assets/sprites/characters/shoto/heavy-kick.png';
import atlas3 from '../../assets/sprites/characters/shoto/heavy-kick.atlas.json';
import image4 from '../../assets/sprites/characters/shoto/crouch-defense.png';
import atlas4 from '../../assets/sprites/characters/shoto/crouch-defense.atlas.json';
import image5 from '../../assets/sprites/characters/shoto/air-defense.png';
import atlas5 from '../../assets/sprites/characters/shoto/air-defense.atlas.json';

export const shotoCombatSources = [
  {key:'shoto-light-punch',image:image0,atlas:atlas0,start:84},
  {key:'shoto-heavy-punch',image:image1,atlas:atlas1,start:90},
  {key:'shoto-light-kick',image:image2,atlas:atlas2,start:96},
  {key:'shoto-heavy-kick',image:image3,atlas:atlas3,start:102},
  {key:'shoto-crouch-defense',image:image4,atlas:atlas4,start:108},
  {key:'shoto-air-defense',image:image5,atlas:atlas5,start:112},
];

export const shotoCombatClips: AnimationClip[] = shotoCombatSources.map((source,index) => ({
  key:source.key,start:source.start,end:source.start+(index<4?5:3),
  ...(index>=4?{frames:[0,1,2,3,2,1].map(frame=>source.start+frame)}:{}),
  frameRate:6,repeat:index<4?0:-1,
}));

/** Strike contact is held throughout activity; preparation/recovery use the actual move timing. */
export function getShotoCombatPose(state:CharacterState,frame:number){
  const pose=(texture:string,sampled:number)=>({texture,frame:sampled,scale:1,flipX:state.facing==='left'});
  if(state.attack){
    const source=shotoCombatSources.slice(0,4).find(source=>source.key===`shoto-${state.attack!.moveId}`);
    const move=getCharacterById(state.fighterId)?.moves.find(move=>move.id===state.attack!.moveId);
    if(!source||!move)return undefined;
    const elapsed=state.attack.elapsedFrames;
    const local=elapsed<move.startup?Math.min(1,Math.floor(elapsed*2/move.startup)):
      elapsed<move.startup+move.activeFrames?2:
      3+Math.min(2,Math.floor((elapsed-move.startup-move.activeFrames)*3/move.recovery));
    return pose(source.key,source.start+local);
  }
  if((state.mode==='blocking'||state.mode==='blockstun')&&(!state.grounded||state.crouching)){
    const index=state.grounded?4:5;
    const source=shotoCombatSources[index];
    return pose(source.key,getTimedAnimationFrame(shotoCombatClips[index],frame-state.stateStartedFrame));
  }
  return undefined;
}
