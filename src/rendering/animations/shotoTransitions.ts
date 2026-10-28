import type { AnimationClip } from './AnimationPlayback';
import walkImage from '../../assets/sprites/characters/shoto/enter-walk.png';
import walkAtlas from '../../assets/sprites/characters/shoto/enter-walk.atlas.json';
import backwardImage from '../../assets/sprites/characters/shoto/enter-backward.png';
import backwardAtlas from '../../assets/sprites/characters/shoto/enter-backward.atlas.json';
import crouchImage from '../../assets/sprites/characters/shoto/enter-crouch.png';
import crouchAtlas from '../../assets/sprites/characters/shoto/enter-crouch.atlas.json';
import jumpImage from '../../assets/sprites/characters/shoto/enter-jump.png';
import jumpAtlas from '../../assets/sprites/characters/shoto/enter-jump.atlas.json';
import defenseImage from '../../assets/sprites/characters/shoto/enter-defense.png';
import defenseAtlas from '../../assets/sprites/characters/shoto/enter-defense.atlas.json';
import dashImage from '../../assets/sprites/characters/shoto/enter-dash.png';
import dashAtlas from '../../assets/sprites/characters/shoto/enter-dash.atlas.json';
import backstepImage from '../../assets/sprites/characters/shoto/enter-backstep.png';
import backstepAtlas from '../../assets/sprites/characters/shoto/enter-backstep.atlas.json';

export const shotoTransitionSources=[
  {key:'shoto-enter-walk',image:walkImage,atlas:walkAtlas,start:56},
  {key:'shoto-enter-backward',image:backwardImage,atlas:backwardAtlas,start:60},
  {key:'shoto-enter-crouch',image:crouchImage,atlas:crouchAtlas,start:64},
  {key:'shoto-enter-jump',image:jumpImage,atlas:jumpAtlas,start:68},
  {key:'shoto-enter-defense',image:defenseImage,atlas:defenseAtlas,start:72},
  {key:'shoto-enter-dash',image:dashImage,atlas:dashAtlas,start:76},
  {key:'shoto-enter-backstep',image:backstepImage,atlas:backstepAtlas,start:80},
];
export const transitionClips:AnimationClip[]=shotoTransitionSources.map(s=>({key:s.key,start:s.start,end:s.start+3,frameRate:30,repeat:0}));
export const transitionByAction={
  'walk':{texture:'shoto-enter-walk',start:56,duration:8},
  'walk-backward':{texture:'shoto-enter-backward',start:60,duration:8},
  'crouch':{texture:'shoto-enter-crouch',start:64,duration:8},
  'jump':{texture:'shoto-enter-jump',start:68,duration:4},
  'defense':{texture:'shoto-enter-defense',start:72,duration:8},
  'dash':{texture:'shoto-enter-dash',start:76,duration:4},
  'backstep':{texture:'shoto-enter-backstep',start:80,duration:4},
} as const;
