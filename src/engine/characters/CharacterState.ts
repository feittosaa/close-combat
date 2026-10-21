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
  airborne?: boolean;
  crouching?: boolean;
  hurtboxStance?: 'standing' | 'crouching' | 'airborne';
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
  /** Direção da locomoção relativa ao oponente; não muda a orientação lógica do combate. */
  movementDirection?: 'forward' | 'backward';
  health: number;
  maxHealth: number;
  mode: CharacterMode;
  /** Frame lógico de entrada no estado atual; permite apresentação e inspeção determinísticas. */
  stateStartedFrame: number;
  remainingStateFrames: number;
  verticalVelocity: number;
  grounded: boolean;
  crouching: boolean;
  attack?: CharacterAttack;
  grab?: CharacterGrab;
  hitFlashFrames: number;
}
