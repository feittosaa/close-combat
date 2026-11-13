import type Phaser from 'phaser';
import type { CharacterState } from '../../engine/characters/CharacterState';
import { autoSpriteScale, bodyCenterShift, type SheetMeasurements } from './spriteScale';
import { framePlacement } from './frameAdjustments';
import measurements from '../../assets/sprites/characters/grappler/measurements.json';
import calibration from '../../assets/sprites/characters/grappler/calibration.json';
import { grappler } from '../../engine/data/fighters/grappler';
import { grapplerReaction } from '../grapplerReaction';
import { loadGraphicsQuality } from '../../ui/graphicsSettings';
import { GRAPPLER_ULTIMATE_ACTIVATION_FRAMES, GRAPPLER_ULTIMATE_LAST_FRAMES, GRAPPLER_ULTIMATE_SPIN_FRAMES, GRAPPLER_ULTIMATE_SPIN_POSE_FRAMES } from '../../engine/combat/ultimateActivation';

const images = import.meta.glob<string>('../../assets/sprites/characters/grappler/*.png', { eager: true, query: '?url', import: 'default' });
const layouts = import.meta.glob<string>('../../assets/sprites/characters/grappler/*.packed.json', { eager: true, query: '?url&no-inline', import: 'default' });
const highImages = import.meta.glob<string>('../../assets/sprites/characters/grappler/high/*.png', { eager: true, query: '?url', import: 'default' });
const highLayouts = import.meta.glob<string>('../../assets/sprites/characters/grappler/high/*.packed.json', { eager: true, query: '?url&no-inline', import: 'default' });
const quality = loadGraphicsQuality();
/** On-screen width of a 640-pixel frame, in world pixels: 10% over the first integration, like the hitboxes. */
export const GRAPPLER_DISPLAY = 345 * 1.1;
export function grapplerFrameSize(name: string): number {
  const path = `../../assets/sprites/characters/grappler/high/${name}`;
  return quality === 'high' && highImages[`${path}.png`] && highLayouts[`${path}.packed.json`] ? 1280 : 640;
}
export function preloadGrapplerSprites(scene: Phaser.Scene): void {
  for (const [path, image] of Object.entries(images)) {
    const name = path.split('/').pop()!.replace('.png', ''), key = `grappler-${name}`;
    const high = `../../assets/sprites/characters/grappler/high/${name}`;
    const useHigh = grapplerFrameSize(name) === 1280;
    const layout = useHigh ? highLayouts[`${high}.packed.json`] : layouts[path.replace(/\.png$/, '.packed.json')];
    if (layout && !scene.textures.exists(key)) scene.load.packedAtlas(key, useHigh ? highImages[`${high}.png`] : image, layout);
  }
}
/** Frames the engine pulls a thrown victim in before the throw flight starts (`throwPull` in the simulation). */
const THROW_PULL_FRAMES = 8;
/** One authored drawing; `facing` is set when a drawing is mirrored by something other than the fighter's facing (turns). */
export type GrapplerPose = { name: string; drawing: number; facing?: 'left' | 'right' };
/** Ticks each walk drawing is held, and the ticks of the entry into the walk. */
const WALK_STEP = 7, ENTER_WALK_FRAMES = 12;
const attacking = (mode: string) => ['startup', 'active', 'recovery'].includes(mode);
export function getGrapplerPose(state: CharacterState, frame: number, activationFrame?: number): GrapplerPose {
  const reaction = grapplerReaction(state, frame);
  if (reaction) return reaction;
  const rage = state.rageAnimation, rageAge = frame - (rage?.startedFrame ?? -Infinity);
  if (rage && rageAge >= 0 && rageAge < 24 && !state.attack && !['hitstun','knockdown'].includes(state.mode)) {
    return {name:rage.kind === 'air-recovery' ? 'air-recovery' : rage.airborne ? 'combo-breaker-air' : 'combo-breaker', drawing:Math.min(5, Math.floor(rageAge / 4))};
  }
  const age = Math.max(0, frame - (state.animationTransition?.startedFrame ?? state.stateStartedFrame));
  const step = (n: number) => Math.min(5, Math.floor(age / n));
  if (state.attack) {
    if (['ultimate-grab', 'ultimate-soco'].includes(state.attack.moveId) && activationFrame !== undefined) return {name:'ultimate-start',drawing:Math.min(5, Math.floor(activationFrame * 6 / GRAPPLER_ULTIMATE_ACTIVATION_FRAMES))};
    const move = grappler.moves.find(m => m.id === state.attack!.moveId)!;
    const t = state.attack.elapsedFrames, start = state.attack.startupFrames ?? move.startup;
    // The grab connects on the preceding drawing, which is held through contact hitstop.
    if (state.attack.hasHit && t === start && (move.id === 'grab-low' || move.id === 'grab-slam' || move.id === 'grab-throw')) return {name:move.id, drawing:move.id === 'grab-low' ? 2 : 1};
    if (move.id === 'ultimate-grab' && state.attack.hasHit && t >= start) {
      const age = t - start;
      if (age >= GRAPPLER_ULTIMATE_SPIN_FRAMES + GRAPPLER_ULTIMATE_LAST_FRAMES) return {name:'idle', drawing:Math.floor(frame / 12) % 6};
      return {name:move.id, drawing:age < GRAPPLER_ULTIMATE_SPIN_FRAMES ? 2 + Math.floor(age / GRAPPLER_ULTIMATE_SPIN_POSE_FRAMES) % 3 : 5};
    }
    if (move.id === 'ultimate-soco') {
      const drawing = t < start ? Math.min(2, Math.floor(t * 3 / start)) : t < start + move.activeFrames ? (t < start + 6 ? 3 : 4) : 5;
      return {name:move.id, drawing};
    }
    // The hammer's slam blur (fifth drawing) is brief; the guard that follows takes the rest of the recovery.
    if (move.id === 'hammer-punch' && t >= start + move.activeFrames) return {name:move.id, drawing:t < start + move.activeFrames + 6 ? 4 : 5};
    // A missed ultimate shows only the opening grab, then a long recovery: the spin belongs to a catch.
    if (move.id === 'ultimate-grab' && !state.attack.hasHit) return {name:move.id, drawing:t < start + move.activeFrames ? 0 : 1};
    const contact = move.id === 'crouch-heavy-kick' ? 2 : move.id === 'grab-low' ? 4 : 3;
    if (move.commandGrab && t < start && !['grab-headbutt', 'grab-slam', 'ultimate-grab'].includes(move.id)) {
      const drawing = t < start * .15 ? 0 : t < start * .3 ? 1 : t < start * .65 ? 2 : 3;
      return {name:move.id, drawing:move.id === 'grab-low' ? Math.min(2, drawing) : move.id === 'grab-throw' ? Math.min(1, drawing) : drawing};
    }
    if ((move.id === 'grab-headbutt' || move.id === 'grab-slam') && state.attack.hasHit && t >= start && t < start + 24) {
      return {name:move.id, drawing:t < start + 10 ? 2 : t < start + 16 ? 3 : 4};
    }
    if (move.id === 'grab-low' && state.attack.hasHit && t >= start && t < start + 14) return {name:move.id, drawing:t < start + 8 ? 3 : 4};
    if (move.id === 'grab-launcher' && state.attack.hasHit && t >= start) return {name:move.id, drawing:t === start ? 3 : t < start + 9 ? 4 : 5};
    if (move.id === 'grab-throw' && state.attack.hasHit && t >= start) return {name:move.id, drawing:t < start + 3 ? 2 : t < start + THROW_PULL_FRAMES ? 3 : t < start + 27 ? 4 : 5};
    if (move.id === 'grab-slam') {
      if (t < start) return {name:move.id, drawing:t < start * .35 ? 0 : 1};
      if (t < start + move.activeFrames) return {name:move.id, drawing:t < start + 2 ? 3 : 4};
    }
    const drawing = t < start ? Math.min(contact - 1, Math.floor(t * contact / Math.max(1, start))) : t < start + move.activeFrames ? contact : Math.min(5, contact + 1 + Math.floor((t - start - move.activeFrames) * (5 - contact) / Math.max(1, move.recovery)));
    return {name:move.id, drawing};
  }
  if (state.commandGrabbed && state.grabbedStartedFrame !== undefined) return {name:'grabbed',drawing:Math.min(5, Math.floor(Math.max(0, frame - state.grabbedStartedFrame) / 3))};
  if (state.grabbedStartedFrame !== undefined && frame - state.grabbedStartedFrame >= 0 && frame - state.grabbedStartedFrame < 16) {
    return {name:'grabbed', drawing:Math.min(5, Math.floor((frame - state.grabbedStartedFrame) / 3))};
  }
  const hitAge = Math.max(0, frame - (state.hitReaction?.startedFrame ?? state.stateStartedFrame));
  if (state.mode === 'knockdown' && state.grounded) {
    if (state.hitReaction?.level === 'low' && hitAge < 12) return {name:'hurt-low', drawing:Math.min(5, Math.floor(hitAge / 2))};
    if (state.remainingStateFrames <= 9) return {name:'getup', drawing:Math.min(5, Math.floor((9 - state.remainingStateFrames) * 6 / 9))};
    const landed = state.animationTransition && !state.animationTransition.from.grounded ? frame - state.animationTransition.startedFrame : Infinity;
    return landed < 12 ? {name:'fall-landing', drawing:Math.min(5, Math.floor(landed / 2))} : {name:'fall', drawing:5};
  }
  if (state.mode === 'hitstun' || state.mode === 'knockdown') {
    const name = !state.grounded ? 'air-hurt' : state.hitReaction?.level === 'low' ? 'hurt-low' : state.crouching ? 'crouch-hurt' : state.hitReaction?.level === 'high' ? 'hurt-high' : 'hurt';
    // All six drawings play within the stun, eased: the recoil flies by at the start and the return settles slowly at the end,
    // so the reaction reads as one fluid motion; a knockdown plays the same drawings at two frames each.
    if (state.mode === 'hitstun') {
      const progress = Math.min(1, hitAge / Math.max(1, hitAge + state.remainingStateFrames));
      const eased = (1 - (1 - Math.min(1, progress * 1.5)) ** 2) * 6;
      // The standing recoil peaks on the fourth drawing and straightens up in the recovery sheet, which starts from that pose.
      if (name === 'hurt' && eased >= 3) return {name:'hurt-recovery', drawing:Math.min(5, Math.floor((eased - 3) * 2))};
      return {name, drawing:Math.min(5, Math.floor(eased))};
    }
    return {name, drawing:Math.min(5, Math.floor(hitAge / 2))};
  }
  const turn = state.facingTransition, turning = turn ? frame - turn.startedFrame : Infinity;
  if (turn && turning >= 0 && turning < 12 && state.grounded && (state.mode === 'neutral' || state.mode === 'crouching')) {
    return {name:state.crouching ? 'turn-crouch' : 'turn-idle', drawing:Math.min(5, Math.floor(turning / 2)), facing:turn.from};
  }
  if (state.mode === 'blocking' || state.mode === 'blockstun') {
    const perfectAge = frame - (state.perfectBlockStartedFrame ?? -Infinity);
    if (state.grounded && !state.crouching && state.mode === 'blockstun' && perfectAge >= 0 && perfectAge < 12) return {name:'perfect-block', drawing:Math.min(5, Math.floor(perfectAge / 2))};
    const prefix = !state.grounded ? 'air-' : state.crouching ? 'crouch-' : '';
    return {name:`${prefix}guard`, drawing:5};
  }
  if (!state.grounded && (state.airborneElapsedFrames ?? 99) < 6 && state.movementDirection === undefined) return {name:'jump-takeoff', drawing:3 + Math.floor((state.airborneElapsedFrames ?? 0) / 2)};
  if (!state.grounded) return {name:state.movementDirection === 'forward' ? 'jump-forward' : state.movementDirection === 'backward' ? 'jump-backward' : 'jump-neutral', drawing:state.verticalVelocity < -2 ? 2 : state.verticalVelocity < 2 ? 3 : 4};
  if (state.crouching) {
    if (state.animationTransition && !state.animationTransition.from.crouching && age < 10) return {name:'crouch-enter',drawing:Math.min(4, Math.floor(age / 2))};
    return {name:'crouch',drawing:3};
  }
  if (state.animationTransition?.from.crouching && age < 12 && state.mode === 'neutral') return {name:'crouch-exit',drawing:Math.min(5, Math.floor(age / 2))};
  if (state.mode === 'neutral' && state.tauntStartedFrame !== undefined) {
    const tauntAge = Math.max(0, frame - state.tauntStartedFrame);
    if (tauntAge < 18) return {name:'taunt-enter', drawing:Math.floor(tauntAge / 3)};
    return tauntAge >= 42 ? {name:'taunt-exit', drawing:Math.min(5, Math.floor((tauntAge - 42) / 3))} : {name:'taunt', drawing:Math.floor(tauntAge / 6) % 6};
  }
  if (state.mode === 'moving') {
    if (state.movementDirection === 'backward') return {name:'backward', drawing:Math.floor(age / 7) % 6};
    if (state.animationTransition?.from.mode === 'neutral' && age < ENTER_WALK_FRAMES) return {name:'enter-walk', drawing:Math.floor(age / 2)};
    return {name:'walk', drawing:Math.floor((age - (state.animationTransition?.from.mode === 'neutral' ? ENTER_WALK_FRAMES : 0)) / WALK_STEP) % 6};
  }
  const from = state.animationTransition?.from, returning = age < 12 && state.mode === 'neutral' && from?.grounded && !from.crouching;
  if (returning && from && ['blocking', 'blockstun'].includes(from.mode)) return {name:'guard-recovery', drawing:Math.floor(age / 2)};
  // After a blow the last drawing is the guard; the recovery sheet's second half takes it back to the idle stance.
  if (returning && from && attacking(from.mode) && age < 8) return {name:'recovery-idle', drawing:2 + Math.floor(age / 2)};
  if (state.animationTransition && !state.animationTransition.from.grounded && age < 12) return {name:'jump-landing',drawing:Math.min(5, 2 + step(3))};
  return {name:'idle',drawing:Math.floor(frame / 12) % 6};
}

/** Show an approved in-between shortly before advancing to the next authored pose. */
export function getGrapplerInbetween(state: CharacterState, frame: number, activationFrame?: number): number | undefined {
  const attack = state.attack;
  const move = attack && grappler.moves.find(candidate => candidate.id === attack.moveId);
  if (attack && move && ['grab-low', 'grab-slam', 'grab-throw'].includes(move.id) && attack.elapsedFrames >= (attack.startupFrames ?? move.startup) - 2 && attack.elapsedFrames <= (attack.startupFrames ?? move.startup)) return undefined;
  if (!attack || activationFrame !== undefined || !images[`../../assets/sprites/characters/grappler/${attack.moveId}-between.png`]) return undefined;
  const current = getGrapplerPose(state, frame);
  for (const ahead of [1, 2]) {
    const next = getGrapplerPose({ ...state, attack: { ...attack, elapsedFrames: attack.elapsedFrames + ahead } }, frame + ahead);
    if (next.name === current.name && next.drawing === current.drawing + 1 && current.drawing < 5) return current.drawing;
  }
  return undefined;
}

/** Body-area adjustment and positioning follow the shared measurement pipeline; `lift` is the vertical placement of the drawing, in frames. */
export function grapplerAdjustment(name: string, frame: number) {
  const data = measurements as SheetMeasurements;
  const placement = framePlacement('grappler', name, frame);
  return { scale: autoSpriteScale(grappler, data, name, frame, calibration), center: bodyCenterShift(grappler, data, name, frame) + placement.x, lift: placement.y };
}
