import type Phaser from 'phaser';
import type { CharacterState } from '../../engine/characters/CharacterState';
import { cowboy } from '../../engine/data/fighters/cowboy';
import { recoveryFrames } from '../../engine/combat/frameData';
import { getPhaseAnimationFrame, getTimedAnimationFrame, type AnimationClip } from './AnimationPlayback';
import { ULTIMATE_ACTIVATION_FRAMES } from '../../engine/combat/ultimateActivation';
import { flightFramesRemaining } from '../../engine/combat/airPhysics';
import { loadGraphicsQuality } from '../../ui/graphicsSettings';
import { autoSpriteScale, bodyCenterShift, lyingFloorAnchor } from './spriteScale';
import cowboyCalibration from '../../assets/sprites/characters/cowboy/calibration.json';
import cowboyMeasurements from '../../assets/sprites/characters/cowboy/measurements.json';

const images = import.meta.glob<string>('../../assets/sprites/characters/cowboy/*.png', { eager: true, query: '?url', import: 'default' });
const atlases = import.meta.glob<Record<string, unknown>>('../../assets/sprites/characters/cowboy/*.atlas.json', { eager: true, import: 'default' });
const highImages = import.meta.glob<string>('../../assets/sprites/characters/cowboy/high/*.png', { eager: true, query: '?url', import: 'default' });
const highAtlases = import.meta.glob<Record<string, unknown>>('../../assets/sprites/characters/cowboy/high/*.atlas.json', { eager: true, import: 'default' });
const quality = loadGraphicsQuality();
export const cowboyFrameSize = quality === 'high' ? 1280 : 640;

/** Sprite positions remain authored in the source grid and anchored to the feet. */
export const cowboyFootAnchor = 465 / 640;
export const cowboyDisplayHeight = 225 * 1.6 / 1.85 * 640 / 512;
export function getCowboyFrameSize(texture: string): number {
  const name = texture.replace(/^cowboy-/, '');
  const base = `../../assets/sprites/characters/cowboy/high/${name}`;
  return quality === 'high' && highImages[`${base}.png`] && highAtlases[`${base}.atlas.json`] ? 1280 : 640;
}

export function preloadCowboySprites(scene: Phaser.Scene): void {
  for (const [path, image] of Object.entries(images)) {
    const name = path.split('/').pop()!.replace('.png', '');
    const key = `cowboy-${name}`;
    const highBase = `../../assets/sprites/characters/cowboy/high/${name}`;
    const useHigh = getCowboyFrameSize(key) === 1280;
    const atlas = useHigh ? highAtlases[`${highBase}.atlas.json`] : atlases[path.replace(/\.png$/, '.atlas.json')];
    if (atlas && !scene.textures.exists(key)) scene.load.atlas(key, useHigh ? highImages[`${highBase}.png`] : image, atlas);
  }
}
export const cowboySheetScale = (name: string, frame = 0): number => autoSpriteScale(cowboy, cowboyMeasurements, name, frame, cowboyCalibration);
const pose = (name: string, frame: number, state: CharacterState) => {
  const horizontal: Record<string, readonly number[]> = {
    'enter-taunt': [-4, -5, -5, -11, -16, -30],
    taunt: [-1, -8, -11, 9, 29, 42],
  };
  const direction = state.facing === 'left' ? -1 : 1, scale = cowboySheetScale(name, frame);
  // A lying drawing on the floor rests on its lowest row instead of the feet line.
  const floor = state.grounded ? lyingFloorAnchor(cowboy, cowboyMeasurements, name, frame) : undefined;
  return {
    texture: `cowboy-${name}`, frame, scale, alpha: 1,
    flipX: direction === -1,
    offsetX: ((horizontal[name]?.[frame] ?? 0) / 640 + bodyCenterShift(cowboy, cowboyMeasurements, name, frame) * scale) * cowboyDisplayHeight * direction,
    offsetY: floor === undefined ? 0 : (cowboyFootAnchor - floor) * cowboyDisplayHeight * scale,
  };
};
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
  idleSpecial: {key:'idle-special',start:0,end:5,frameRate:8,frameDurations:[9,8,12,10,10,9],repeat:0},
  turn: {key:'turn',start:0,end:5,frameRate:24,frameDurations:[2,3,2,3,2,3],repeat:0},
  enterWalk: {key:'enter-walk',start:0,end:5,frameRate:30,frameDurations:[2,2,2,2,2,2],repeat:0},
  hurt: {key:'hurt',start:0,end:5,frameRate:16,frameDurations:[2,3,3,4,5,5],repeat:0},
};
const attackRhythm: Readonly<Record<string, {startup: readonly number[]; recovery: readonly number[]}>> = {
  'light-punch':{startup:[3,1],recovery:[1,2,3]}, 'heavy-punch':{startup:[3,2],recovery:[1,2,3]},
  'air-light-punch':{startup:[2,1],recovery:[1,2,3]}, 'air-heavy-punch':{startup:[2,1],recovery:[1,2,3]},
  'anti-air':{startup:[3,2],recovery:[1,2,3]}, 'quick-shot':{startup:[3,1],recovery:[1,2,3]},
  'heavy-shot':{startup:[3,2],recovery:[1,2,3]}, 'crouch-combo-shot':{startup:[3,2],recovery:[1,2,3]},
  'heavy-kick':{startup:[3,1],recovery:[1,2,3]}, 'air-light-kick':{startup:[2,1],recovery:[1,2,3]},
  'air-heavy-kick':{startup:[3,1],recovery:[1,2,3]}, 'crouch-punch':{startup:[2,1],recovery:[1,2,3]},
  'crouch-light-kick':{startup:[2,1],recovery:[1,2,3]}, 'crouch-heavy-kick':{startup:[3,1],recovery:[1,2,3]},
  'push-away':{startup:[3,1],recovery:[1,2,3]},
  'power-kick':{startup:[3,2,1],recovery:[1,2]}, 'double-shot':{startup:[3,2,1],recovery:[1,2]},
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

/** Round-end drawings are presentation only and never change combat geometry. */
const LYING_HOLD_FRAMES = 999;
/**
 * A fighter still in the air when the round ends keeps falling from that moment, whatever the title on screen:
 * it lands as soon as physics says so, the loser already lying down and the winner back on its feet.
 */
export function settleAfterRound(state: CharacterState, ageSinceRoundEnd: number, floorY: number, gravity: number, lost: boolean): CharacterState {
  if (!['cowboy', 'shoto'].includes(state.fighterId) || state.grounded) return state;
  const landing = flightFramesRemaining(state.y, state.verticalVelocity, floorY, gravity);
  const ticks = Math.min(Math.max(0, ageSinceRoundEnd), landing);
  if (ticks < landing) {
    return { ...state, y: Math.min(floorY, state.y + ticks * state.verticalVelocity + gravity * ticks * (ticks - 1) / 2), verticalVelocity: state.verticalVelocity + gravity * ticks };
  }
  // A loser lands already lying: plenty of knockdown time left, so neither fighter's pose reads as getting up.
  const lying = lost ? { mode: 'knockdown' as const, remainingStateFrames: LYING_HOLD_FRAMES, stateStartedFrame: Number.NEGATIVE_INFINITY } : { mode: 'neutral' as const };
  return { ...state, y: floorY, grounded: true, verticalVelocity: 0, attack: undefined, juggle: undefined, ...lying };
}

export function getCowboyRoundEndPose(state: CharacterState, winner: boolean, elapsed: number) {
  if (state.fighterId !== 'cowboy' || !state.grounded) return undefined;
  if (!winner && state.mode === 'knockdown') return undefined;
  const durations = winner ? [10, 9, 14, 12, 11, 24] : [8, 8, 10, 10, 12, 32];
  return pose(winner ? 'victory' : 'defeat', getPhaseAnimationFrame([0,1,2,3,4,5], durations, Math.max(0, elapsed), 80), state);
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
    if (move.id === 'throw-24') {
      if (elapsed < startup) return pose('throw-close-anticipation', getPhaseAnimationFrame([0,1,2,3,4,5],[3,4,4,3,2,2],elapsed,startup), state);
      const shotAge = state.attack.throwConfirmedFrame === undefined ? -1 : frame - state.attack.throwConfirmedFrame;
      const grabFrame = !state.attack.hasHit ? getPhaseAnimationFrame([1,5],[1,2],elapsed-startup,move.activeFrames + recovery) :
        shotAge < 8 ? 2 : shotAge < 24 ? 3 : shotAge < 34 ? 4 : 5;
      return pose('throw-low', grabFrame, state);
    }
    if (move.category === 'throw' && !state.attack.chargeReleased && elapsed === startup - 1 && (state.attack.chargeFrames ?? 0) >= startup - 1) {
      return pose('charge-throw', Math.floor(((state.attack.chargeFrames ?? 0) - startup + 1) / 5) % 6, state);
    }
    if (move.category === 'throw' && elapsed >= startup && elapsed < activeEnd) return pose('throw-active', 0, state);
    if (move.id === 'heavy-punch' && !isShotCombo(state) && !state.attack.chargeReleased && (state.attack.chargeFrames ?? 0) >= startup) {
      const frames = [2,3,4,5,4,3];
      return pose('charge-heavy-punch', frames[Math.floor(((state.attack.chargeFrames ?? 0) - startup) / 8) % frames.length], state);
    }
    if (move.screenVolley) {
      const age = Math.max(0, elapsed - startup);
      const shot = Math.min(5, Math.floor(age / move.screenVolley.interval));
      const drawing = (shot === 1 || shot === 3) && age % move.screenVolley.interval < 2
        ? shot : [0,2,2,4,4,5][shot];
      return pose('ultimate-body', drawing, state);
    }
    if (move.id === 'quick-shot' || move.id === 'heavy-shot') {
      const bodyFrame = elapsed < startup ? getPhaseAnimationFrame([0,1],[2,3],elapsed,startup) :
        elapsed < activeEnd ? 2 : getPhaseAnimationFrame([3,4,5],[1,2,3],elapsed-activeEnd,recovery);
      return pose('dynamite-throw', bodyFrame, state);
    }
    if (move.id === 'light-kick') {
      const step = Math.min(2, Math.max(0, (state.chain?.length ?? 1) - 1));
      return pose('light-kick', step * 2 + (elapsed >= startup ? 1 : 0), state);
    }
    if (move.id === 'heavy-kick') {
      const frame = elapsed < startup - 1 ? getPhaseAnimationFrame([0,1], [3,1], elapsed, startup - 1) :
        elapsed < startup ? 2 : elapsed < activeEnd ? 3 :
          getPhaseAnimationFrame([4,1,0], [1,2,3], elapsed - activeEnd, recovery);
      return pose('heavy-kick', frame, state);
    }
    if (move.category === 'throw' && state.attack.hitOutcome === 'hit' && state.attack.throwDirection !== 'backward' && elapsed >= startup + 8) {
      return pose('push-away', Math.min(5, 2 + Math.floor((elapsed - startup - 8) / 6)), state);
    }
    if (move.category === 'throw' && !state.attack.hasHit && elapsed >= activeEnd) {
      return pose('throw-miss', getPhaseAnimationFrame([0,1,2,3,4,5],[1,1,1,1,1,1],elapsed-activeEnd,recovery), state);
    }
    const firingFrame: Record<string, number> = { 'anti-air': 2, 'crouch-combo-shot': 2, 'double-shot': 3, 'power-kick': 3, 'throw-13': 3, 'throw-24': 3 };
    const active = firingFrame[move.id] ?? 2;
    const safeStartup = Array.from({length:active}, (_, index) => index);
    const rhythm = attackRhythm[move.id];
    const before = elapsed < startup ? getPhaseAnimationFrame(safeStartup, rhythm.startup, elapsed, startup) : active;
    const recoveryPoses = move.id === 'push-away' ? [3,1,0] : Array.from({length:5-active}, (_, index) => active+index+1);
    const after = elapsed >= activeEnd ? getPhaseAnimationFrame(recoveryPoses, rhythm.recovery, elapsed-activeEnd, recovery) : before;
    const combo = isShotCombo(state);
    const texture = combo ? state.chain!.length % 2 === 0 ? 'combo-left-shot' : 'combo-right-shot' : move.category === 'throw' ? 'throw' : move.id;
    return pose(texture, after, state);
  }
  if (state.mode === 'knockdown') {
    if (state.grounded && state.pushbackMotion && !state.throwFlight) {
      return pose('push-fall', Math.min(5, Math.floor(Math.max(0, frame - state.stateStartedFrame) / 2)), state);
    }
    if (state.grounded && state.throwPull) return pose('grabbed', 0, state);
    if (!state.grounded) {
      const drawing = Math.min(2, Math.floor(Math.max(0, frame - state.stateStartedFrame) / 4));
      return pose('fall-landing', drawing, state);
    }
    const remaining = state.remainingStateFrames;
    return remaining > 12 ? pose('fall-landing', 5, state) : pose('knockdown', remaining > 8 ? 3 : remaining > 4 ? 4 : 5, state);
  }
  if (state.mode === 'hitstun') {
    const bounce = state.wallBounceEffect;
    const bounceAge = bounce ? frame - bounce.frame : -1;
    if (!state.grounded && bounce && bounceAge >= 0 && bounceAge < 24 && (state.hitReaction?.startedFrame ?? -1) <= bounce.frame) {
      return pose('wall-bounce', Math.min(3, Math.floor(bounceAge / 6)), state);
    }
    if (state.grounded && state.grabbedStartedFrame !== undefined && frame - state.grabbedStartedFrame < 16) {
      return pose('grabbed', 0, state);
    }
    const reaction = state.hitReaction;
    if (!state.grounded && state.juggle) return pose('launch-hit', Math.min(5, Math.floor(Math.max(0, frame - (reaction?.startedFrame ?? state.stateStartedFrame)) / 4)), state);
    const name = reaction?.level === 'high' ? 'hurt-high' : !state.grounded ? 'air-hurt' : state.crouching ? (reaction?.level === 'low' ? 'crouch-hurt-low' : 'crouch-hurt') : reaction?.level === 'low' ? 'hurt-low' : 'hurt';
    const age = frame - (reaction?.startedFrame ?? state.stateStartedFrame);
    const index = sample('hurt', Math.max(0, age));
    const reactionPose = pose(name, name === 'hurt-low' ? Math.min(5, index + 1) : name === 'hurt-high' ? Math.min(5, index + 2) : index, state);
    return state.grabbedHold ? {...reactionPose, scale: reactionPose.scale * 1.05} : reactionPose;
  }
  const transition = state.animationTransition;
  const elapsed = Math.max(0, frame - (transition?.startedFrame ?? state.stateStartedFrame));
  const turn = state.facingTransition;
  if (turn && frame >= turn.startedFrame && frame - turn.startedFrame < 15 && state.mode !== 'blocking' && state.mode !== 'blockstun') {
    const name = !state.grounded ? 'turn-air' : state.crouching ? 'turn-crouch' : state.mode === 'moving' ? 'turn-walk' : 'turn-idle';
    return {...pose(name, sample('turn', frame - turn.startedFrame), state), flipX:turn.from === 'left'};
  }
  if (state.mode === 'blocking' || state.mode === 'blockstun') {
    const perfectAge = frame - (state.perfectBlockStartedFrame ?? -Infinity);
    if (state.mode === 'blockstun' && state.grounded && !state.crouching && perfectAge >= 0 && perfectAge < 12) {
      return pose('perfect-block', perfectAge < 3 ? 1 : perfectAge < 9 ? 2 : 3, state);
    }
    const name = !state.grounded ? 'air-guard' : state.crouching ? 'crouch-guard' : 'guard';
    return pose(name, state.mode === 'blockstun' ? 2 : sample('guardEnter', elapsed), state);
  }
  if (!state.grounded) {
    if ((transition?.from.mode === 'blocking' || transition?.from.mode === 'blockstun') && !transition.from.grounded && elapsed < 6) {
      return pose('air-guard', sample('exit', elapsed), state);
    }
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
    if (age >= 88) return pose('exit-taunt', Math.min(5, Math.floor((age - 88) * 6 / 44)), state);
    return age < 44 ? pose('enter-taunt', Math.floor(age * 6 / 44), state) : pose('taunt', Math.floor((age - 44) * 6 / 44), state);
  }
  const idleAge = frame - (state.idleStartedFrame ?? state.stateStartedFrame);
  const idleCycle = idleAge % 600;
  if (idleAge >= 600 && idleCycle < 58) return pose('idle-special', sample('idleSpecial', idleCycle), state);
  return pose('idle', sample('idle', frame - state.stateStartedFrame), state);
}

/** Defensive arms appear in front; attacking arms materialize behind the fighter. */
export function getCowboySpriteLayers(state: CharacterState, frame: number) {
  const character = getCowboySpritePose(state, frame);
  if (!character) return [];
  if (!state.attack) {
    const defending = state.mode === 'blocking' || state.mode === 'blockstun';
    const transition = state.animationTransition;
    const exiting = !defending && transition && (transition.from.mode === 'blocking' || transition.from.mode === 'blockstun') &&
      frame - transition.startedFrame >= 0 && frame - transition.startedFrame < 6;
    if (defending || exiting) {
      const source = defending ? state : transition!.from;
      const age = Math.max(0, frame - (defending ? state.stateStartedFrame : transition!.startedFrame));
      const crouching = source.grounded && source.crouching;
      const name = crouching ? 'magic-crouch-guard' : 'magic-guard';
      const drawing = exiting ? sample('magicExit', age) : age < 6 ? sample('magic', age) : 2;
      return [character, {...pose(name, drawing, state), scale:crouching ? 1.02 : 1.05, offsetY:crouching ? 25 : source.grounded ? 0 : 18}];
    }
    return [character];
  }
  const move = cowboy.moves.find(candidate => candidate.id === state.attack!.moveId);
  if (move?.id === 'throw-24' && state.attack.hasHit) {
    const shotAge = state.attack.throwConfirmedFrame === undefined ? -1 : frame - state.attack.throwConfirmedFrame;
    if (shotAge >= 0 && shotAge < 24) {
      const armFrame = shotAge < 4 ? 0 : shotAge < 8 ? 1 : shotAge < 20 ? 2 : shotAge < 22 ? 4 : 5;
      return [{...pose('magic-down', armFrame, state), scale:1.25, offsetY:-30}, character];
    }
    if (shotAge >= 24 && shotAge < 40) {
      const armFrame = shotAge < 28 ? 0 : shotAge < 34 ? 1 : shotAge < 38 ? 2 : 5;
      return [{...pose('magic-horizontal', armFrame, state), scale:1.25}, character];
    }
  }
  if (!move?.projectile) return [character];
  if (move.screenVolley) return [character];
  const elapsed = state.attack.elapsedFrames;
  const startup = state.attack.startupFrames ?? move.startup;
  const activeEnd = startup + move.activeFrames;
  const holdingSpecial = (move.id === 'quick-shot' || move.id === 'heavy-shot') &&
    !state.attack.chargeReleased && (state.attack.chargeFrames ?? 0) >= startup - 1;
  const holdingHeavy = move.id === 'heavy-punch' && !state.attack.chargeReleased &&
    (state.attack.chargeFrames ?? 0) >= startup - 1;
  if (move.id === 'quick-shot' || move.id === 'heavy-shot') {
    const armFrame = holdingSpecial ? 2 : elapsed < startup - 6 ? undefined : elapsed < startup - 3 ? 0 :
      elapsed < startup ? 2 : elapsed < activeEnd + 3 ? 4 : elapsed < activeEnd + 6 ? 5 : undefined;
    const arm = move.id === 'heavy-shot' ? 'magic-throw-up' : 'magic-throw';
    return armFrame === undefined ? [character] : [{...pose(arm, armFrame, state), scale:1.25}, character];
  }
  let effectFrame: number | undefined;
  if (elapsed >= Math.max(0, startup - 6) && elapsed < startup) effectFrame = sample('magic', elapsed - Math.max(0, startup - 6));
  if (elapsed >= startup && elapsed < activeEnd && ['light-punch','heavy-punch','air-light-punch','air-heavy-punch','anti-air','crouch-combo-shot','double-shot'].includes(move.id)) effectFrame = 2;
  if (elapsed >= activeEnd && elapsed < activeEnd + 6) effectFrame = sample('magicExit', elapsed - activeEnd);
  if (holdingHeavy) effectFrame = 2 + Math.floor(((state.attack.chargeFrames ?? 0) - startup + 1) / 8) % 2;
  const direction = (move.projectile.verticalSpeed ?? 0) < 0 ? 'up' : (move.projectile.verticalSpeed ?? 0) > 0 ? 'down' : 'horizontal';
  return effectFrame === undefined ? [character] : [{...pose(`magic-${direction}`, effectFrame, state), scale:1.25, offsetY:move.id === 'anti-air' ? 85 : move.id === 'crouch-combo-shot' ? 50 : 0}, character];
}
