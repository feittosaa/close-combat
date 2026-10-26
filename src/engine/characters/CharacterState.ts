import type { AttackButton } from '../../input/types';
import type { CharacterCollisionProfile } from '../data/characters';

export type CharacterMode = 'neutral' | 'moving' | 'dashing' | 'airborne' | 'crouching' |
  'startup' | 'active' | 'recovery' | 'blocking' | 'hitstun' | 'blockstun';
export interface CharacterAttack {
  moveId: string;
  buttons: readonly AttackButton[];
  elapsedFrames: number;
  hasHit: boolean;
  hitOutcome?: 'hit' | 'block';
}
export interface CharacterState {
  characterId: string;
  fighterId: string;
  collision: CharacterCollisionProfile;
  x: number;
  y: number;
  facing: 'left' | 'right';
  movementDirection?: 'forward' | 'backward';
  health: number;
  maxHealth: number;
  mode: CharacterMode;
  stateStartedFrame: number;
  animationTransition?: { startedFrame: number; from: CharacterAnimationState; previous?: {startedFrame:number;from:CharacterAnimationState} };
  remainingStateFrames: number;
  verticalVelocity: number;
  grounded: boolean;
  crouching: boolean;
  attack?: CharacterAttack;
  hitFlashFrames: number;
}

/** Snapshot of the preceding pose state; contains no renderer objects or recursive history. */
export type CharacterAnimationState = Pick<CharacterState,'mode'|'stateStartedFrame'|'grounded'|'crouching'|'movementDirection'|'facing'|'verticalVelocity'>;
