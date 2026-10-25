import type { AttackButton } from '../../input/types';
import type { CharacterCollisionProfile } from '../data/characters';

export type CharacterMode = 'neutral' | 'moving' | 'dashing' | 'running' | 'airborne' | 'crouching' |
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
  remainingStateFrames: number;
  verticalVelocity: number;
  grounded: boolean;
  crouching: boolean;
  attack?: CharacterAttack;
  hitFlashFrames: number;
}
