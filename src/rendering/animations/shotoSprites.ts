import type Phaser from 'phaser';
import type { CharacterState } from '../../engine/characters/CharacterState';
import { shoto } from '../../engine/data/fighters/shoto';
import { recoveryFrames } from '../../engine/combat/frameData';
import { getPhaseAnimationFrame } from './AnimationPlayback';
import { loadGraphicsQuality } from '../../ui/graphicsSettings';

const images = import.meta.glob<string>('../../assets/sprites/characters/shoto/*.png', { eager: true, query: '?url', import: 'default' });
const atlases = import.meta.glob<Record<string, unknown>>('../../assets/sprites/characters/shoto/*.atlas.json', { eager: true, import: 'default' });
const highImages = import.meta.glob<string>('../../assets/sprites/characters/shoto/high/*.png', { eager: true, query: '?url', import: 'default' });
const highAtlases = import.meta.glob<Record<string, unknown>>('../../assets/sprites/characters/shoto/high/*.atlas.json', { eager: true, import: 'default' });
const quality = loadGraphicsQuality();
export const shotoIdleTexture = 'shoto-idle';
export const shotoSpriteScale = 182 / 512;
export const shotoIdleScale = 182 / 640 * 1.01 * 1.01;

/** Return the relative atlas resolution used for the selected texture. */
export function getShotoResolution(texture: string): number {
  const name = texture.replace(/^shoto-/, '');
  const base = `../../assets/sprites/characters/shoto/high/${name}`;
  return quality === 'high' && highImages[`${base}.png`] && highAtlases[`${base}.atlas.json`] ? 2 : 1;
}

export function preloadShotoSprites(scene: Phaser.Scene): void {
  for (const [path, image] of Object.entries(images)) {
    const name = path.split('/').pop()!.replace('.png', '');
    const key = `shoto-${name}`;
    const highBase = `../../assets/sprites/characters/shoto/high/${name}`;
    const useHigh = getShotoResolution(key) === 2;
    const atlas = useHigh ? highAtlases[`${highBase}.atlas.json`] : atlases[path.replace(/\.png$/, '.atlas.json')];
    if (atlas && !scene.textures.exists(key)) scene.load.atlas(key, useHigh ? highImages[`${highBase}.png`] : image, atlas);
  }
}

/** Six drawings loop at five frames per second on the 60 Hz simulation clock. */
export function getShotoIdleFrame(frame: number, startedFrame: number): number {
  return Math.floor(Math.max(0, frame - startedFrame) / 12) % 6;
}

type ShotoPose = { texture: string; frame: number; footAnchor: number; offsetX: number; flipX: boolean; scale?: number };

export function getShotoVictoryExit(state: CharacterState, elapsed: number): ShotoPose | undefined {
  if (state.fighterId !== 'shoto' || !state.grounded || elapsed < 80) return undefined;
  const age = elapsed - 80;
  const direction = state.facing === 'right' ? -1 : 1;
  return { texture: 'shoto-victory-exit', frame: age < 6 ? 0 : age < 12 ? 1 : 2 + Math.floor((age - 12) / 4) % 4, footAnchor: 900 / 1024,
    offsetX: direction * Math.max(0, age - 12) * 6, flipX: direction < 0 };
}

export function hasShotoExited(state: CharacterState, elapsed: number, view: {left: number; right: number}): boolean {
  if (state.fighterId !== 'shoto') return true;
  const pose = getShotoVictoryExit(state, elapsed);
  if (!pose) return false;
  const x = state.x + pose.offsetX;
  return state.facing === 'right' ? x + 182 < view.left : x - 182 > view.right;
}
export function getShotoUltimatePose(state: CharacterState, elapsed: number, activation: boolean): ShotoPose {
  if (state.attack?.moveId === 'rake-ultimate') {
    const drawing = activation ? Math.min(5, Math.floor(Math.max(0, elapsed) / 15)) : Math.floor(Math.max(0, elapsed) / 2) % 6;
    return { texture: activation ? 'shoto-rake-ultimate-start' : 'shoto-rake-ultimate-spin', frame: drawing, footAnchor: 900 / 1024, offsetX: 0, flipX: state.facing === 'left' };
  }
  const drawing = activation ? Math.min(3, Math.floor(Math.max(0, elapsed) / 12)) : elapsed < 92 ? 3 : Math.min(5, 4 + Math.floor((elapsed - 92) / 12));
  return { texture: 'shoto-ultimate', frame: drawing, footAnchor: 900 / 1024, offsetX: 0, flipX: state.facing === 'left' };
}
export function getShotoSpritePose(state: CharacterState, frame: number): ShotoPose | undefined {
  const pose = (name: string, drawing: number, facesLeft = false): ShotoPose => ({
    texture: `shoto-${name}`, frame: drawing, footAnchor: name === 'idle' ? 670 / 724 : 900 / 1024,
    offsetX: 0,
    flipX: (state.facing === 'left') !== facesLeft,
  });
  const transition = state.animationTransition;
  const transitionAge = frame - (transition?.startedFrame ?? -Infinity);
  if (state.grounded && transition && transitionAge >= 0 && transitionAge < 3) {
    const fromIdle = transition.from.mode === 'neutral' && transition.from.grounded && transition.startedFrame - (transition.from.idleStartedFrame ?? transition.from.stateStartedFrame) >= 630;
    const leavingIdle = ['moving', 'dashing', 'crouching', 'blocking', 'startup'].includes(state.mode);
    if (fromIdle && leavingIdle) return pose('rake-transition', transitionAge);
  }
  const attackClips = ['light-punch', 'heavy-punch', 'light-kick', 'heavy-kick', 'power-punch', 'power-kick', 'crouch-punch', 'crouch-uppercut', 'crouch-light-kick', 'crouch-heavy-kick', 'air-light-punch', 'air-heavy-punch', 'air-light-kick', 'air-heavy-kick', 'tomato-light', 'tomato-heavy', 'reversal-kick', 'reversal-light', 'flying-kick-light', 'flying-kick-heavy', 'flying-kick-followup'];
  if (state.attack?.moveId === 'crow-ultimate' || state.attack?.moveId === 'rake-ultimate') return getShotoUltimatePose(state, state.attack.elapsedFrames, false);
  if (state.attack?.moveId === 'throw-13' || state.attack?.moveId === 'throw-24') {
    const move = shoto.moves.find(candidate => candidate.id === state.attack!.moveId)!;
    const elapsed = state.attack.elapsedFrames;
    const startup = state.attack.startupFrames ?? move.startup;
    const end = startup + move.activeFrames;
    const drawing = elapsed < startup ? getPhaseAnimationFrame([0, 1], [1, 1], elapsed, startup) :
      elapsed < end ? 2 : getPhaseAnimationFrame([3, 4, 5], [1, 1, 1], elapsed - end, recoveryFrames(move, state.attack));
    return pose('ippon', drawing);
  }
  if (state.attack && attackClips.includes(state.attack.moveId)) {
    const move = shoto.moves.find(candidate => candidate.id === state.attack!.moveId)!;
    const startup = state.attack.startupFrames ?? move.startup;
    const elapsed = state.attack.elapsedFrames;
    const end = startup + move.activeFrames;
    if (state.attack.moveId.startsWith('tomato-')) {
      const duration = Math.ceil((end + recoveryFrames(move, state.attack)) * 0.8);
      return pose('tomato-throw', getPhaseAnimationFrame([0, 1, 2, 3, 4, 5], [1, 1, 1, 1, 1, 1], elapsed, duration));
    }
    if (move.crouching && elapsed >= end) {
      if (move.id === 'crouch-uppercut' && !state.crouching) return pose('idle-normal', 0);
      return move.id === 'crouch-uppercut' && elapsed < end + 3 ? pose('crouch-uppercut', 5) : pose('crouch', 5);
    }
    const windmill = state.chain?.[0] === 'light-kick' && (state.chain?.[1] === 'light-kick' || state.chain?.[1] === 'heavy-kick');
    const lateContact = ['air-heavy-punch', 'power-punch', 'heavy-punch', 'crouch-uppercut'].includes(state.attack.moveId) || (state.attack.moveId === 'light-kick' && !windmill);
    const drawing = elapsed < startup ? getPhaseAnimationFrame(lateContact ? [0, 1, 2, 3] : [0, 1, 2], lateContact ? [1, 1, 1, 1] : [1, 1, 1], elapsed, startup) :
      elapsed < end ? state.attack.moveId === 'heavy-punch' && elapsed >= startup + Math.ceil(move.activeFrames / 2) ? 5 : lateContact ? 4 : 3 : lateContact ? 5 : getPhaseAnimationFrame([4, 5], [1, 1], elapsed - end, recoveryFrames(move, state.attack));
    const secondPunch = state.attack.moveId === 'light-punch' && state.chain?.length === 2 && state.chain.every(id => id === 'light-punch');
    const launcher = state.attack.moveId === 'heavy-punch';
    const heavySequence = launcher && state.chain?.every(id => id === 'heavy-punch') ? state.chain.length : 0;
    const name = heavySequence === 2 ? 'heavy-punch-2' : heavySequence === 3 ? 'heavy-punch-3' : launcher ? 'launcher-punch' :
      secondPunch ? 'alternate-punch' : windmill && state.chain?.length === 2 && state.attack.moveId === 'light-kick' ? 'windmill-2' :
      windmill && state.attack.moveId === 'heavy-kick' ? 'windmill-4' :
      state.attack.moveId.startsWith('flying-kick-') ? 'flying-kick' : state.attack.moveId;
    const selectedFrame = name === 'heavy-punch-3' && elapsed >= startup && elapsed < end ? 3 :
      name === 'heavy-punch-3' && elapsed >= end && elapsed < end + 3 ? 4 :
      name === 'flying-kick' && state.grounded && elapsed >= end ? 5 : drawing;
    const result = pose(name, selectedFrame);
    if (name === 'launcher-punch' && (state.chain?.length ?? 1) === 1) return { ...result, scale: 1.01 };
    return name === 'light-kick' && elapsed >= end ? { ...result, scale: drawing === 5 ? 0.97 * 0.97 * 0.98 : 0.97 } : result;
  }
  if (state.mode === 'knockdown') {
    const ipponAge = frame - (state.ipponReceivedFrame ?? -Infinity);
    if (ipponAge >= 0 && ipponAge < 24) return pose('ippon-victim', Math.min(5, Math.floor(ipponAge / 4)));
    if (state.grounded && state.remainingStateFrames <= 12) return pose('getup', Math.min(5, Math.floor((12 - state.remainingStateFrames) / 2)));
    const fall = pose('fall', state.grounded ? Math.min(5, Math.floor(Math.max(0, frame - state.stateStartedFrame) / 3)) : 3);
    return state.grounded ? { ...fall, scale: fall.frame <= 2 ? 1.3 : 1.08 } : fall;
  }
  if (state.mode === 'hitstun') {
    if (state.grounded && state.grabbedStartedFrame !== undefined && frame - state.grabbedStartedFrame < 16) {
      return pose('grabbed', Math.min(5, 2 + Math.floor(Math.max(0, frame - state.grabbedStartedFrame) / 5)));
    }
    const reaction = state.grounded ? state.hitReaction?.level === 'low' ? 'hurt-low' : state.hitReaction?.level === 'high' ? 'hurt-high' : 'hurt' : 'air-hurt';
    return pose(reaction, Math.min(5, Math.floor(Math.max(0, frame - (state.hitReaction?.startedFrame ?? state.stateStartedFrame)) / 3) + 1));
  }
  if (!state.grounded && (state.mode === 'blocking' || state.mode === 'blockstun')) {
    return pose('air-guard', state.mode === 'blockstun' ? 3 : Math.min(2, Math.floor(Math.max(0, frame - state.stateStartedFrame) / 2)));
  }
  if (!state.grounded) {
    if (state.mode !== 'airborne') return undefined;
    if (transition && !transition.from.grounded && ['blocking', 'blockstun'].includes(transition.from.mode) && transitionAge >= 0 && transitionAge < 6) {
      return pose('air-guard', Math.max(0, 2 - Math.floor(transitionAge / 2)));
    }
    const age = state.airborneElapsedFrames ?? 0;
    return pose('jump', age < 6 ? 1 : state.verticalVelocity < -2 ? 2 : state.verticalVelocity <= 2 ? 3 : 4);
  }
  if (state.mode === 'dashing') {
    return pose(state.movementDirection === 'backward' ? 'dash-backward' : 'dash-forward', Math.min(5, Math.floor(Math.max(0, frame - state.stateStartedFrame) / 3)));
  }
  if (state.mode === 'moving') {
    const name = state.movementDirection === 'backward' ? 'backward' : 'walk';
    if (name === 'walk' && transition?.from.mode === 'neutral' && transitionAge >= 0 && transitionAge < 12) {
      return pose('enter-walk', Math.floor(transitionAge / 2));
    }
    return pose(name, Math.floor(Math.max(0, frame - state.stateStartedFrame) / 8) % 6);
  }
  if (state.mode === 'blocking' || state.mode === 'blockstun') {
    const perfectAge = frame - (state.perfectBlockStartedFrame ?? -Infinity);
    if (!state.crouching && state.mode === 'blockstun' && perfectAge >= 0 && perfectAge < 12) {
      return pose('perfect-block', perfectAge < 3 ? 1 : perfectAge < 9 ? 3 : 4);
    }
    return pose(state.crouching ? 'crouch-guard' : 'guard', Math.min(3, Math.floor(Math.max(0, frame - state.stateStartedFrame) / 2)));
  }
  if (state.mode === 'crouching') return pose('crouch', transition?.from.crouching ? 5 : Math.min(5, Math.floor(Math.max(0, frame - state.stateStartedFrame) / 2)));
  if (state.mode === 'neutral' && !state.attack && transition && transitionAge >= 0 && transitionAge < 6) {
    if (['blocking', 'blockstun'].includes(transition.from.mode)) {
      return pose(transition.from.crouching ? 'crouch-guard' : 'guard', Math.max(0, 3 - Math.floor(transitionAge / 2)));
    }
    if (transition.from.grounded && transition.from.crouching) return pose('crouch', Math.max(0, 5 - transitionAge));
  }
  if (state.mode === 'neutral' && !state.attack && state.tauntStartedFrame !== undefined) {
    const age = Math.max(0, frame - state.tauntStartedFrame);
    return pose('taunt', getPhaseAnimationFrame([0, 1, 2, 3, 4, 5], [1, 1, 1, 5, 2, 1], age, 132));
  }
  if (state.mode === 'neutral' && !state.attack) {
    const age = frame - (state.idleStartedFrame ?? state.stateStartedFrame);
    if (age >= 600 && age < 630) return pose('rake-enter', Math.floor((age - 600) / 5));
    return pose(age >= 630 ? 'idle' : 'idle-normal', getShotoIdleFrame(frame, state.idleStartedFrame ?? state.stateStartedFrame));
  }
  return undefined;
}
