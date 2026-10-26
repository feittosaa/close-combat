import type Phaser from 'phaser';
import type { CharacterState } from '../../engine/characters/CharacterState';
import { getStateAnimationFrame, getTimedAnimationFrame, shouldFlipAnimation, validateAnimationManifest, type CharacterAnimationManifest } from './AnimationPlayback';
import idleImage from '../../assets/sprites/characters/shoto/idle.png';
import walkImage from '../../assets/sprites/characters/shoto/walk.png';
import crouchImage from '../../assets/sprites/characters/shoto/crouch.png';
import jumpImage from '../../assets/sprites/characters/shoto/jump.png';
import defenseImage from '../../assets/sprites/characters/shoto/defense.png';
import backwardImage from '../../assets/sprites/characters/shoto/walk-backward.png';
import dashImage from '../../assets/sprites/characters/shoto/dash.png';
import backstepImage from '../../assets/sprites/characters/shoto/backstep.png';
import idleAtlas from '../../assets/sprites/characters/shoto/idle.atlas.json';
import walkAtlas from '../../assets/sprites/characters/shoto/walk.atlas.json';
import crouchAtlas from '../../assets/sprites/characters/shoto/crouch.atlas.json';
import jumpAtlas from '../../assets/sprites/characters/shoto/jump.atlas.json';
import defenseAtlas from '../../assets/sprites/characters/shoto/defense.atlas.json';
import backwardAtlas from '../../assets/sprites/characters/shoto/walk-backward.atlas.json';
import dashAtlas from '../../assets/sprites/characters/shoto/dash.atlas.json';
import backstepAtlas from '../../assets/sprites/characters/shoto/backstep.atlas.json';

/** Approved locomotion/guard art only. Roots and scale are baked into fixed atlas cells. */
export const shotoSpriteManifest: CharacterAnimationManifest = {
  textureKey:'shoto-idle',frameSize:{width:768,height:768},totalFrames:56,
  footAnchorY:720,displaySize:{width:172.8,height:172.8},
  clips:[
    {key:'shoto-idle',start:0,end:7,frameRate:6,repeat:-1},
    {key:'shoto-walk',start:8,end:15,frameRate:10,repeat:-1},
    {key:'shoto-crouch',start:16,end:21,frames:[16,17,18,19,20,21,20,19,18,17],frameRate:6,repeat:-1},
    {key:'shoto-jump',start:22,end:29,frameDurations:[2,4,6,10,6,4,4,2],frameRate:13,repeat:0},
    {key:'shoto-defense',start:30,end:35,frames:[32,33,34,35,34,33],frameRate:8,repeat:-1},
    {key:'shoto-walk-backward',start:36,end:43,frameRate:10,repeat:-1},
    {key:'shoto-dash',start:44,end:49,frameRate:30,repeat:0},
    {key:'shoto-backstep',start:50,end:55,frameRate:30,repeat:0},
    {key:'shoto-run',start:45,end:48,frames:[45,46,47,48],frameRate:15,repeat:-1},
  ],
};
validateAnimationManifest(shotoSpriteManifest);
const sources=[
  {key:'shoto-idle',image:idleImage,atlas:idleAtlas},
  {key:'shoto-walk',image:walkImage,atlas:walkAtlas},
  {key:'shoto-crouch',image:crouchImage,atlas:crouchAtlas},
  {key:'shoto-jump',image:jumpImage,atlas:jumpAtlas},
  {key:'shoto-defense',image:defenseImage,atlas:defenseAtlas},
  {key:'shoto-walk-backward',image:backwardImage,atlas:backwardAtlas},
  {key:'shoto-dash',image:dashImage,atlas:dashAtlas},
  {key:'shoto-backstep',image:backstepImage,atlas:backstepAtlas},
];
export function preloadShotoSprites(scene:Phaser.Scene):void{
  for(const source of sources)if(!scene.textures.exists(source.key))scene.load.atlas(source.key,source.image,source.atlas);
}
export function getShotoSpritePose(state:CharacterState,frame:number){
  if(state.fighterId!=='shoto'||state.attack||state.mode==='hitstun')return undefined;
  const elapsed=Math.max(0,frame-state.stateStartedFrame);
  const action=!state.grounded?'jump':state.crouching?'crouch':
    state.mode==='neutral'?'idle':state.mode==='blocking'||state.mode==='blockstun'?'defense':
    state.mode==='dashing'?(state.movementDirection==='backward'?'backstep':'dash'):
    state.mode==='running'?'run':state.mode==='moving'?(state.movementDirection==='backward'?'walk-backward':'walk'):undefined;
  if(!action)return undefined;
  const clip=shotoSpriteManifest.clips.find(c=>c.key===`shoto-${action}`)!;
  let sampled=getStateAnimationFrame(state,clip,frame);
  // Guard enters once, then breathes in a closed guard instead of reopening every loop.
  if(action==='defense')sampled=state.mode==='blockstun'?getTimedAnimationFrame(clip,elapsed):
    elapsed<4?30+Math.floor(elapsed/2):getTimedAnimationFrame(clip,elapsed-4);
  return {scale:1,texture:action==='run'?'shoto-dash':`shoto-${action}`,frame:sampled,flipX:shouldFlipAnimation(state.facing,clip)};
}
