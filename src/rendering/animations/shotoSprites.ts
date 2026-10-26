import type Phaser from 'phaser';
import type { CharacterState } from '../../engine/characters/CharacterState';
import { getStateAnimationFrame, shouldFlipAnimation, validateAnimationManifest, type CharacterAnimationManifest } from './AnimationPlayback';
import idleImage from '../../assets/sprites/characters/shoto/idle.png';
import walkImage from '../../assets/sprites/characters/shoto/walk.png';
import crouchImage from '../../assets/sprites/characters/shoto/crouch.png';
import idleAtlas from '../../assets/sprites/characters/shoto/idle.atlas.json';
import walkAtlas from '../../assets/sprites/characters/shoto/walk.atlas.json';
import crouchAtlas from '../../assets/sprites/characters/shoto/crouch.atlas.json';

/** Only the three manually approved actions have art. No move/physics data lives here. */
export const shotoSpriteManifest: CharacterAnimationManifest = {
  textureKey: 'shoto-idle', frameSize: { width: 512, height: 768 }, totalFrames: 22,
  frameTransforms: Object.fromEntries(Array.from({length:6},(_,i)=>[String(16+i),{scale:.9}])),
  footAnchorY: 720, displaySize: { width: 115.2, height: 172.8 },
  clips: [
    { key: 'shoto-idle', start: 0, end: 7, frameRate: 6, repeat: -1 },
    { key: 'shoto-walk', start: 8, end: 15, frameRate: 10, repeat: -1 },
    { key: 'shoto-walk-backward', start: 8, end: 15, frames: [15,14,13,12,11,10,9,8], frameRate: 8, repeat: -1 },
    { key: 'shoto-crouch', start: 16, end: 21, frameRate: 6, repeat: -1 },
  ],
};
validateAnimationManifest(shotoSpriteManifest);

const sources = [
  { key: 'shoto-idle', image: idleImage, atlas: idleAtlas },
  { key: 'shoto-walk', image: walkImage, atlas: walkAtlas },
  { key: 'shoto-crouch', image: crouchImage, atlas: crouchAtlas },
];
export function preloadShotoSprites(scene: Phaser.Scene): void {
  for (const source of sources) if (!scene.textures.exists(source.key)) scene.load.atlas(source.key, source.image, source.atlas);
}

export function getShotoSpritePose(state: CharacterState, frame: number) {
  if (state.fighterId !== 'shoto' || !state.grounded || state.attack) return undefined;
  const action = state.mode === 'neutral' ? 'idle' : state.mode === 'crouching' ? 'crouch'
    : state.mode === 'moving' ? (state.movementDirection === 'backward' ? 'walk-backward' : 'walk') : undefined;
  if (!action) return undefined;
  const clip = shotoSpriteManifest.clips.find(clip => clip.key === `shoto-${action}`)!;
  const sampledFrame = getStateAnimationFrame(state, clip, frame);
  return { scale: shotoSpriteManifest.frameTransforms?.[String(sampledFrame)]?.scale ?? 1, texture: action.startsWith('walk') ? 'shoto-walk' : `shoto-${action}`,
    frame: sampledFrame, flipX: shouldFlipAnimation(state.facing, clip) };
}
