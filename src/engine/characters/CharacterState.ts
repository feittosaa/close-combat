// src/engine/characters/CharacterState.ts
import type { AttackButton } from '../../input/types';
import type { CharacterCollisionProfile } from '../data/characters';

export type CharacterMode =
  | 'neutral'
  | 'moving'
  | 'dashing'
  | 'airborne'
  | 'crouching'
  | 'startup'
  | 'active'
  | 'recovery'
  | 'blocking'
  | 'hitstun'
  | 'blockstun'
  | 'grabbed'
  | 'throwRecovery'
  | 'knockdown';

export interface CharacterAttack {
  moveId: string;
  buttons: readonly AttackButton[];
  elapsedFrames: number;
  hasHit: boolean;
  hitElapsedFrames?: number;
  hitOutcome?: 'hit' | 'block';
  preciseExecution: boolean;
  throwDirection?: 'forward' | 'backward';
}

export interface CharacterGrab {
  attackerId: string;
  moveId: string;
  remainingFrames: number;
  throwDirection: 'forward' | 'backward';
}

export interface CharacterState {
  characterId: string;
  fighterId: string;
  collision: CharacterCollisionProfile;
  x: number;
  y: number;
  facing: 'left' | 'right';
  health: number;
  maxHealth: number;
  mode: CharacterMode;
  remainingStateFrames: number;
  verticalVelocity: number;
  grounded: boolean;
  crouching: boolean;
  attack?: CharacterAttack;
  grab?: CharacterGrab;
  hitFlashFrames: number;
}
