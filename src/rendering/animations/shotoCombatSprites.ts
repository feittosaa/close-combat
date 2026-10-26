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
  {key:'shoto-air-defense',image:image5,atlas:atlas5,start:114},
];

export const shotoCombatClips: AnimationClip[] = shotoCombatSources.map((source,index) => ({
  key:source.key,start:source.start,end:source.start+5,
  ...(index>=4?{frames:[2,3,4,5,4,3].map(frame=>source.start+frame)}:{}),
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
    // Shared authored hand-close bridges idle to the attack without delaying contact.
    if(elapsed<2)return pose('shoto-enter-defense',72+elapsed);
    const remaining=move.startup+move.activeFrames+move.recovery-elapsed;
    if(move.id==='light-punch' && remaining<=2)return pose('shoto-enter-defense',71+remaining);
    const local=elapsed<move.startup?Math.min(1,Math.floor(elapsed*2/move.startup)):
      elapsed<move.startup+move.activeFrames?2:
      3+Math.min(2,Math.floor((elapsed-move.startup-move.activeFrames)*3/move.recovery));
    return pose(source.key,source.start+local);
  }
  if((state.mode==='blocking'||state.mode==='blockstun')&&(!state.grounded||state.crouching)){
    const index=state.grounded?4:5;
    const source=shotoCombatSources[index];
    const elapsed=Math.max(0,frame-(state.animationTransition?.startedFrame??state.stateStartedFrame));
    const enteringCrouch=state.grounded && state.animationTransition && !state.animationTransition.from.crouching;
    const postureDuration=enteringCrouch?4:0;
    if(state.mode!=='blockstun' && elapsed<postureDuration)return pose('shoto-enter-crouch',64+elapsed);
    const closing=Math.max(0,elapsed-postureDuration);
    const local=state.mode!=='blockstun'&&closing<4?Math.floor(closing/2):
      getTimedAnimationFrame(shotoCombatClips[index],Math.max(0,closing-4))-source.start;
    return pose(source.key,source.start+local);
  }
  const transition=state.animationTransition;
  const from=transition?.from;
  const previous=transition?.previous;
  const held=previous?transition!.startedFrame-previous.startedFrame:Infinity;
  const partial=from?.mode==='blocking'&&previous;
  const oldDescent=Boolean(partial&&from.grounded&&!previous!.from.crouching);
  if(from && (from.mode==='blocking'||from.mode==='blockstun') && from.crouching &&
      state.grounded && !state.crouching && ['neutral','moving'].includes(state.mode)){
    const elapsed=Math.max(0,frame-transition!.startedFrame);
    const last=oldDescent?Math.min(3,Math.max(0,held-1)):3;
    if(elapsed<=last)return pose('shoto-enter-crouch',64+last-elapsed);
  }
  if(from && (from.mode==='blocking'||from.mode==='blockstun') &&
      from.grounded===state.grounded && from.crouching===state.crouching &&
      (!state.grounded||state.crouching)){
    const elapsed=Math.max(0,frame-transition!.startedFrame);
    const source=shotoCombatSources[state.grounded?4:5];
    if(oldDescent&&held<4){
      if(elapsed<4-held)return pose('shoto-enter-crouch',64+held+elapsed);
      return undefined;
    }
    const closing=held-(oldDescent?4:0);
    const last=partial?Math.min(1,Math.max(0,Math.floor((closing-1)/2))):1;
    if(elapsed<(last+1)*2)return pose(source.key,source.start+last-Math.floor(elapsed/2));
  }
  return undefined;
}
