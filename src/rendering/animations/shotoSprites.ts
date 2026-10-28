import { ULTIMATE_ACTIVATION_FRAMES } from '../../engine/combat/ultimateActivation';
import { shotoCombatSources, shotoCombatClips, getShotoCombatPose } from './shotoCombatSprites';
import { shotoTransitionSources, transitionClips, transitionByAction } from './shotoTransitions';
import type Phaser from 'phaser';
import type { CharacterState } from '../../engine/characters/CharacterState';
import { getStateAnimationFrame, getTimedAnimationFrame, shouldFlipAnimation, validateAnimationManifest, type CharacterAnimationManifest } from './AnimationPlayback';
import drinkImage from '../../assets/sprites/characters/shoto/ultimate-drink.png';
import drinkAtlas from '../../assets/sprites/characters/shoto/ultimate-drink.atlas.json';
import idleImage from '../../assets/sprites/characters/shoto/idle.png';
import walkImage from '../../assets/sprites/characters/shoto/walk.png';
import walkInbetweensImage from '../../assets/sprites/characters/shoto/walk-inbetweens.png';
import crouchImage from '../../assets/sprites/characters/shoto/crouch.png';
import jumpImage from '../../assets/sprites/characters/shoto/jump.png';
import defenseImage from '../../assets/sprites/characters/shoto/defense.png';
import backwardImage from '../../assets/sprites/characters/shoto/walk-backward.png';
import dashImage from '../../assets/sprites/characters/shoto/dash.png';
import backstepImage from '../../assets/sprites/characters/shoto/backstep.png';
import idleAtlas from '../../assets/sprites/characters/shoto/idle.atlas.json';
import walkAtlas from '../../assets/sprites/characters/shoto/walk.atlas.json';
import walkInbetweensAtlas from '../../assets/sprites/characters/shoto/walk-inbetweens.atlas.json';
import crouchAtlas from '../../assets/sprites/characters/shoto/crouch.atlas.json';
import jumpAtlas from '../../assets/sprites/characters/shoto/jump.atlas.json';
import defenseAtlas from '../../assets/sprites/characters/shoto/defense.atlas.json';
import backwardAtlas from '../../assets/sprites/characters/shoto/walk-backward.atlas.json';
import dashAtlas from '../../assets/sprites/characters/shoto/dash.atlas.json';
import backstepAtlas from '../../assets/sprites/characters/shoto/backstep.atlas.json';

const ultimateDrinkClip = {key:'shoto-ultimate-drink',start:128,end:133,frameRate:360/ULTIMATE_ACTIVATION_FRAMES,repeat:0};

/** Approved locomotion, four basics and posture guards. Roots and body scale are atlas-authored. */
export const shotoSpriteManifest: CharacterAnimationManifest = {
  textureKey:'shoto-idle',frameSize:{width:768,height:768},totalFrames:134,
  footAnchorY:720,displaySize:{width:172.8*1.03*1.15,height:172.8*1.03*1.15},
  clips:[
    {key:'shoto-idle',start:0,end:7,frameRate:6,repeat:-1},
    {key:'shoto-walk',start:8,end:127,frames:[8,120,9,121,10,122,11,123,12,124,13,125,14,126,15,127],frameRate:20,repeat:-1},
    {key:'shoto-crouch',start:16,end:21,frames:[16,17,18,19,20,21,20,19,18,17],frameRate:6,repeat:-1},
    {key:'shoto-jump',start:22,end:29,frameDurations:[2,4,6,10,6,4,4,2],frameRate:13,repeat:0},
    {key:'shoto-defense',start:30,end:35,frames:[32,33,34,35,34,33],frameRate:8,repeat:-1},
    {key:'shoto-walk-backward',start:36,end:43,frameRate:10,repeat:-1},
    {key:'shoto-dash',start:44,end:49,frameDurations:[3,4,4,4,3,2],frameRate:18,repeat:0},
    {key:'shoto-backstep',start:50,end:55,frameDurations:[3,4,4,4,3,2],frameRate:18,repeat:0},
    ...transitionClips,
    ...shotoCombatClips,
    ultimateDrinkClip,
  ],
};
validateAnimationManifest(shotoSpriteManifest);

export function getShotoUltimateActivationPose(elapsedFrames: number, facing: CharacterState['facing']) {
  return {texture:ultimateDrinkClip.key,frame:getTimedAnimationFrame(ultimateDrinkClip,elapsedFrames),scale:1,alpha:1,flipX:facing==='left'};
}
const sources=[
  {key:'shoto-ultimate-drink',image:drinkImage,atlas:drinkAtlas},
  {key:'shoto-idle',image:idleImage,atlas:idleAtlas},
  {key:'shoto-walk',image:walkImage,atlas:walkAtlas},
  {key:'shoto-walk-inbetweens',image:walkInbetweensImage,atlas:walkInbetweensAtlas},
  {key:'shoto-crouch',image:crouchImage,atlas:crouchAtlas},
  {key:'shoto-jump',image:jumpImage,atlas:jumpAtlas},
  {key:'shoto-defense',image:defenseImage,atlas:defenseAtlas},
  {key:'shoto-walk-backward',image:backwardImage,atlas:backwardAtlas},
  {key:'shoto-dash',image:dashImage,atlas:dashAtlas},
  {key:'shoto-backstep',image:backstepImage,atlas:backstepAtlas},
  ...shotoTransitionSources,
  ...shotoCombatSources,
];
export function preloadShotoSprites(scene:Phaser.Scene):void{
  for(const source of sources)if(!scene.textures.exists(source.key))scene.load.atlas(source.key,source.image,source.atlas);
}
function actionFor(state:Pick<CharacterState,'mode'|'grounded'|'crouching'|'movementDirection'>){
  return !state.grounded?'jump':state.crouching?'crouch':
    state.mode==='neutral'?'idle':state.mode==='blocking'||state.mode==='blockstun'?'defense':
    state.mode==='dashing'?(state.movementDirection==='backward'?'backstep':'dash'):
    state.mode==='moving'?(state.movementDirection==='backward'?'walk-backward':'walk'):undefined;
}
function transitionFor(action:ReturnType<typeof actionFor>){
  return action && action!=='idle'?transitionByAction[action]:undefined;
}
export function getShotoSpritePose(state:CharacterState,frame:number){
  if(state.fighterId!=='shoto')return undefined;
  const lighterElapsed = frame - (state.ultimateThrowStartedFrame ?? -Infinity);
  if (lighterElapsed >= 0 && lighterElapsed < 8) return {texture:'shoto-heavy-punch',frame:92+Math.min(3,Math.floor(lighterElapsed/2)),scale:1,flipX:state.facing==='left'};
  if (state.ultimateCapture) return {texture:'shoto-idle',frame:0,scale:1,flipX:state.facing==='left'};
  if(state.mode==='hitstun')return undefined;
  const combat=getShotoCombatPose(state,frame);
  if(combat)return combat;
  if(state.attack)return undefined;
  const action=actionFor(state);
  if(!action)return undefined;
  const transition=state.animationTransition;
  const from=transition? actionFor(transition.from):undefined;
  const elapsed=Math.max(0,frame-(transition?.startedFrame??state.stateStartedFrame));
  const pose=(texture:string,sampled:number)=>({scale:1,texture,frame:sampled,flipX:shouldFlipAnimation(state.facing)});
  // Returning to idle reverses the authored connector; movement remains engine-owned.
  const exitAction=from;
  const exit=transitionFor(exitAction);
  if(action==='idle' && exit && from!=='dash' && from!=='backstep'){
    const previous=transition?.previous;
    const oldEntry=previous && transitionFor(from) && actionFor(previous.from)!==from;
    const last=from==='jump'?2:oldEntry?Math.min(3,Math.floor((transition!.startedFrame-previous!.startedFrame)*4/exit.duration)):3;
    if(elapsed<(last+1)*2)return pose(exit.texture,exit.start+Math.max(0,last-Math.floor(elapsed/2)));
  }
  const entry=transitionFor(action);
  const enter=Boolean(transition && from!==action && state.mode!=='blockstun' && entry);
  const entryDuration=enter?entry!.duration:0;
  if(enter && elapsed<entryDuration)return pose(entry!.texture,entry!.start+Math.min(3,Math.floor(elapsed*4/entryDuration)));
  const clip=shotoSpriteManifest.clips.find(c=>c.key===`shoto-${action}`)!;
  const start=action==='jump'?(state.airborneStartedFrame??state.stateStartedFrame):(transition?.startedFrame??state.stateStartedFrame)+entryDuration;
  let sampled=getStateAnimationFrame({...state,stateStartedFrame:start},clip,frame);
  if(action==='defense')sampled=state.mode==='blockstun'||enter?getTimedAnimationFrame(clip,Math.max(0,elapsed-entryDuration)):
    elapsed<4?30+Math.floor(elapsed/2):getTimedAnimationFrame(clip,elapsed-4);
  return pose(action==='walk' && sampled>=120?'shoto-walk-inbetweens':`shoto-${action}`,sampled);
}

/** Authored connectors handle motion. Keep every pose opaque to avoid source-over flicker. */
export function getShotoSpriteLayers(state:CharacterState,frame:number){
  const pose=getShotoSpritePose(state,frame);
  return pose?[{...pose,alpha:1}]:[];
}
