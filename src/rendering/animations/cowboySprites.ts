import type Phaser from 'phaser';
import type { CharacterState } from '../../engine/characters/CharacterState';
import { cowboy } from '../../engine/data/fighters/cowboy';
import { recoveryFrames } from '../../engine/combat/frameData';
import { getPhaseAnimationFrame, getTimedAnimationFrame, type AnimationClip } from './AnimationPlayback';
import { ULTIMATE_ACTIVATION_FRAMES } from '../../engine/combat/ultimateActivation';

const images = import.meta.glob<string>('../../assets/sprites/characters/cowboy/*.png', { eager: true, query: '?url', import: 'default' });
const atlases = import.meta.glob<Record<string, unknown>>('../../assets/sprites/characters/cowboy/*.atlas.json', { eager: true, import: 'default' });

/** Each source has six fixed 640px cells; positions remain authored in the source grid. */
export const cowboyFootAnchor = 465 / 640;
export const cowboyDisplayHeight = 225 * 1.6 / 1.85 * 640 / 512;
export function preloadCowboySprites(scene: Phaser.Scene): void {
  for (const [path, image] of Object.entries(images)) {
    const name = path.split('/').pop()!.replace('.png', '');
    const key = `cowboy-${name}`;
    const atlas = atlases[path.replace(/\.png$/, '.atlas.json')];
    if (atlas && !scene.textures.exists(key)) scene.load.atlas(key, image, atlas);
  }
}
const pose = (name: string, frame: number, state: CharacterState) => ({
  texture: `cowboy-${name}`, frame, scale: 1, alpha: 1, flipX: state.facing === 'left',
});
const isShotCombo = (state: CharacterState) => state.attack?.moveId === 'heavy-punch' &&
  state.chain?.[0] === 'light-punch' && state.chain.every((id,index) => id === (index ? 'heavy-punch' : 'light-punch'));
/** Per-action drawing cadence in simulation ticks; contact remains tied to combat. */
export const cowboyAnimationClips: Readonly<Record<string, AnimationClip>> = {
  idle: {key:'idle',start:0,end:5,frameRate:4,frameDurations:[15,12,12,15,12,12],repeat:-1},
  walk: {key:'walk',start:0,end:5,frameRate:10,frameDurations:[7,5,6,7,5,6],repeat:-1},
  backward: {key:'backward',start:0,end:5,frameRate:8,frameDurations:[8,7,8,8,7,8],repeat:-1},
  crouchIdle: {key:'crouch-idle',start:2,end:3,frameRate:5,frameDurations:[12,12],repeat:-1},
  dashForward: {key:'dash-forward',start:0,end:5,frameRate:15,frameDurations:[3,4,3,5,5,4],repeat:0},
  dashBackward: {key:'dash-backward',start:0,end:5,frameRate:15,frameDurations:[3,3,4,5,5,4],repeat:0},
  crouchEnter: {key:'crouch-enter',start:0,end:2,frameRate:30,repeat:0},
  guardEnter: {key:'guard-enter',start:0,end:2,frameRate:30,repeat:0},
  exit: {key:'exit',start:3,end:5,frameRate:30,repeat:0},
  magic: {key:'magic',start:0,end:2,frameRate:30,repeat:0},
  magicExit: {key:'magic-exit',start:3,end:5,frameRate:30,repeat:0},
  taunt: {key:'taunt',start:0,end:5,frameRate:10,frameDurations:[6,6,6,6,6,6],repeat:0},
  turn: {key:'turn',start:0,end:5,frameRate:24,frameDurations:[2,3,2,3,2,3],repeat:0},
  enterWalk: {key:'enter-walk',start:0,end:5,frameRate:30,frameDurations:[2,2,2,2,2,2],repeat:0},
  hurt: {key:'hurt',start:0,end:5,frameRate:16,frameDurations:[2,3,3,4,5,5],repeat:0},
};
const attackRhythm: Readonly<Record<string, {startup: readonly number[]; recovery: readonly number[]}>> = {
  'light-punch':{startup:[3,1],recovery:[1,2,3]}, 'heavy-punch':{startup:[3,2],recovery:[1,2,3]},
  'air-light-punch':{startup:[2,1],recovery:[1,2,3]}, 'air-heavy-punch':{startup:[2,1],recovery:[1,2,3]},
  'anti-air':{startup:[3,2,1],recovery:[1,2]}, 'quick-shot':{startup:[3,1],recovery:[1,2,3]},
  'heavy-shot':{startup:[3,2],recovery:[1,2,3]}, 'crouch-combo-shot':{startup:[3,2,1],recovery:[1,2]},
  'heavy-kick':{startup:[3,1],recovery:[1,2,3]}, 'air-light-kick':{startup:[2,1],recovery:[1,2,3]},
  'air-heavy-kick':{startup:[3,1],recovery:[1,2,3]}, 'crouch-punch':{startup:[2,1],recovery:[1,2,3]},
  'crouch-light-kick':{startup:[2,1],recovery:[1,2,3]}, 'crouch-heavy-kick':{startup:[3,1],recovery:[1,2,3]},
  'push-away':{startup:[3,1],recovery:[1,2,3]},
  'power-kick':{startup:[3,2,1],recovery:[1,2]},
  'throw-13':{startup:[3,2,1],recovery:[1,2]}, 'throw-24':{startup:[3,2,1],recovery:[1,2]},
};
const sample = (name: string, elapsed: number) => getTimedAnimationFrame(cowboyAnimationClips[name], elapsed);

export function getCowboyUltimateActivationPose(state: CharacterState, elapsed: number) {
  if (elapsed >= ULTIMATE_ACTIVATION_FRAMES - 18) {
    return pose('exit-taunt', Math.min(5, Math.floor((elapsed - (ULTIMATE_ACTIVATION_FRAMES - 18)) / 3)), state);
  }
  const entranceDuration = 42;
  if (elapsed < entranceDuration) {
    return pose('enter-taunt', sample('enterWalk', Math.floor(elapsed * 12 / entranceDuration)), state);
  }
  const middleDuration = ULTIMATE_ACTIVATION_FRAMES - 18 - entranceDuration;
  const frames = [0,1,2,3,1,2,3,4,5];
  const durations = [12,8,8,8,8,8,8,10,20];
  return pose('taunt', getPhaseAnimationFrame(frames,durations,elapsed - entranceDuration,middleDuration), state);
}

export function getCowboySpritePose(state: CharacterState, frame: number) {
  if (state.fighterId !== 'cowboy') return undefined;
  if (state.attack) {
    const move = cowboy.moves.find(candidate => candidate.id === state.attack!.moveId);
    if (!move) return undefined;
    const elapsed = state.attack.elapsedFrames;
    const startup = state.attack.startupFrames ?? move.startup;
    const activeEnd = startup + move.activeFrames;
    const recovery = recoveryFrames(move, state.attack);
    if (move.category === 'throw' && !state.attack.chargeReleased && elapsed === startup - 1 && (state.attack.chargeFrames ?? 0) >= startup - 1) {
      return pose('charge-throw', Math.floor(((state.attack.chargeFrames ?? 0) - startup + 1) / 5) % 6, state);
    }
    if (move.id === 'heavy-punch' && !isShotCombo(state) && !state.attack.chargeReleased && (state.attack.chargeFrames ?? 0) >= startup) {
      const frames = [2,3,4,5,4,3];
      return pose('charge-heavy-punch', frames[Math.floor(((state.attack.chargeFrames ?? 0) - startup) / 8) % frames.length], state);
    }
    if (move.screenVolley) {
      return pose('ultimate-body', Math.min(5, Math.max(0, Math.floor((elapsed - startup) / move.screenVolley.interval))), state);
    }
    if (move.id === 'light-kick') {
      const step = Math.min(2, Math.max(0, (state.chain?.length ?? 1) - 1));
      return pose('light-kick', step * 2 + (elapsed >= startup ? 1 : 0), state);
    }
    if (move.category === 'throw' && state.attack.hitOutcome === 'hit' && state.attack.throwDirection !== 'backward' && elapsed >= startup + 8) {
      return pose('push-away', Math.min(5, 2 + Math.floor((elapsed - startup - 8) / 6)), state);
    }
    const firingFrame: Record<string, number> = { 'anti-air': 3, 'crouch-combo-shot': 3, 'power-kick': 3, 'throw-13': 3, 'throw-24': 3 };
    const active = firingFrame[move.id] ?? 2;
    const safeStartup = Array.from({length:active}, (_, index) => index);
    const rhythm = attackRhythm[move.id];
    const before = elapsed < startup ? getPhaseAnimationFrame(safeStartup, rhythm.startup, elapsed, startup) : active;
    const recoveryPoses = move.id === 'push-away' ? [3,1,0] :
      move.id === 'heavy-kick' ? [3,4,1] : Array.from({length:5-active}, (_, index) => active+index+1);
    const after = elapsed >= activeEnd ? getPhaseAnimationFrame(recoveryPoses, rhythm.recovery, elapsed-activeEnd, recovery) : before;
    const combo = isShotCombo(state);
    const texture = combo ? state.chain!.length % 2 === 0 ? 'combo-left-shot' : 'combo-right-shot' : move.category === 'throw' ? 'throw' : move.id;
    return pose(texture, after, state);
  }
  if (state.mode === 'knockdown') {
    if (state.grounded && state.grabbedStartedFrame !== undefined && frame - state.grabbedStartedFrame < 8) {
      return pose('grabbed', Math.min(5, Math.floor((frame - state.grabbedStartedFrame) * 6 / 8)), state);
    }
    if (!state.grounded) return pose('air-hurt', 1, state);
    const remaining = state.remainingStateFrames;
    return pose('knockdown', remaining > 12 ? 2 : remaining > 8 ? 3 : remaining > 4 ? 4 : 5, state);
  }
  if (state.mode === 'hitstun') {
    const reaction = state.hitReaction;
    const name = reaction?.level === 'high' ? 'hurt-high' : !state.grounded ? 'air-hurt' : state.crouching ? (reaction?.level === 'low' ? 'crouch-hurt-low' : 'crouch-hurt') : reaction?.level === 'low' ? 'hurt-low' : 'hurt';
    const age = frame - (reaction?.startedFrame ?? state.stateStartedFrame);
    const index = sample('hurt', Math.max(0, age));
    return pose(name, name === 'hurt-low' ? Math.min(5, index + 1) : name === 'hurt-high' ? Math.min(5, index + 2) : index, state);
  }
  const transition = state.animationTransition;
  const elapsed = Math.max(0, frame - (transition?.startedFrame ?? state.stateStartedFrame));
  const turn = state.facingTransition;
  if (turn && frame >= turn.startedFrame && frame - turn.startedFrame < 15 && state.mode !== 'blocking' && state.mode !== 'blockstun') {
    const name = !state.grounded ? 'turn-air' : state.crouching ? 'turn-crouch' : state.mode === 'moving' ? 'turn-walk' : 'turn-idle';
    return {...pose(name, sample('turn', frame - turn.startedFrame), state), flipX:turn.from === 'left'};
  }
  if (state.mode === 'blocking' || state.mode === 'blockstun') {
    const name = state.crouching && state.grounded ? 'crouch-guard' : 'guard';
    return pose(name, state.mode === 'blockstun' ? 2 : sample('guardEnter', elapsed), state);
  }
  if (!state.grounded) {
    if (state.mode === 'dashing') {
      const backward = state.movementDirection === 'backward';
      return pose(backward ? 'air-dash-backward' : 'air-dash-forward', sample(backward ? 'dashBackward' : 'dashForward', elapsed), state);
    }
    const age = state.airborneElapsedFrames ?? 0;
    if (age < 5) return pose('enter-jump', age < 2 ? 4 : 5, state);
    return pose('jump', state.verticalVelocity < -2 ? 2 : state.verticalVelocity < 2 ? 3 : 4, state);
  }
  if (state.crouching) {
    if ((!transition || !transition.from.crouching) && elapsed < 6) return pose('crouch', sample('crouchEnter', elapsed), state);
    return pose('crouch', sample('crouchIdle', elapsed - 6), state);
  }
  if (transition?.from.crouching && transition.from.grounded && elapsed < 6) return pose('crouch', sample('exit', elapsed), state);
  if ((transition?.from.mode === 'blocking' || transition?.from.mode === 'blockstun') && elapsed < 6) {
    return pose(transition.from.crouching ? 'crouch-guard' : 'guard', sample('exit', elapsed), state);
  }
  if (state.mode === 'dashing') return pose(state.movementDirection === 'backward' ? 'dash-backward' : 'dash-forward', sample(state.movementDirection === 'backward' ? 'dashBackward' : 'dashForward', elapsed), state);
  if (state.mode === 'moving') {
    const backward = state.movementDirection === 'backward';
    if (transition?.from.mode === 'neutral' && elapsed < 12) return pose(backward ? 'enter-backward' : 'enter-walk', sample('enterWalk', elapsed), state);
    return pose(backward ? 'backward' : 'walk', sample(backward ? 'backward' : 'walk', frame-state.stateStartedFrame), state);
  }
  if (state.tauntStartedFrame !== undefined) {
    const age = frame - state.tauntStartedFrame;
    if (age >= 78) return pose('exit-taunt', Math.min(5, Math.floor((age - 78) / 2)), state);
    return age < 12 ? pose('enter-taunt', sample('enterWalk', age), state) : pose('taunt', Math.floor((age - 12) / 11), state);
  }
  return pose('idle', sample('idle', frame - state.stateStartedFrame), state);
}

/** Spectral arms materialize behind the opaque fighter; the firing drawings already contain them. */
export function getCowboySpriteLayers(state: CharacterState, frame: number) {
  const character = getCowboySpritePose(state, frame);
  if (!character || !state.attack) return character ? [character] : [];
  const move = cowboy.moves.find(candidate => candidate.id === state.attack!.moveId);
  if (!move?.projectile) return [character];
  if (move.screenVolley) return [character];
  const elapsed = state.attack.elapsedFrames;
  const startup = state.attack.startupFrames ?? move.startup;
  const activeEnd = startup + move.activeFrames;
  const holdingSpecial = (move.id === 'quick-shot' || move.id === 'heavy-shot') &&
    !state.attack.chargeReleased && (state.attack.chargeFrames ?? 0) >= startup - 1;
  const holdingHeavy = move.id === 'heavy-punch' && !state.attack.chargeReleased &&
    (state.attack.chargeFrames ?? 0) >= startup - 1;
  let effectFrame: number | undefined;
  if (elapsed >= Math.max(0, startup - 6) && elapsed < startup) effectFrame = sample('magic', elapsed - Math.max(0, startup - 6));
  if (elapsed >= startup && elapsed < activeEnd && ['light-punch','heavy-punch','air-light-punch','air-heavy-punch'].includes(move.id)) effectFrame = 2;
  if (elapsed >= activeEnd && elapsed < activeEnd + 6) effectFrame = sample('magicExit', elapsed - activeEnd);
  if (holdingSpecial || holdingHeavy) effectFrame = 2 + Math.floor(((state.attack.chargeFrames ?? 0) - startup + 1) / 8) % 2;
  const direction = (move.projectile.verticalSpeed ?? 0) < 0 ? 'up' : (move.projectile.verticalSpeed ?? 0) > 0 ? 'down' : 'horizontal';
  return effectFrame === undefined ? [character] : [{...pose(`magic-${direction}`, effectFrame, state), scale:1.25}, character];
}
