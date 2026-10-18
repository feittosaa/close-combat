// src/engine/characters/CharacterState.ts
import type { AttackButton } from '../../input/types';

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
  | 'knockdown';

export interface CharacterAttack {
  moveId: string;
  button: AttackButton;
  elapsedFrames: number;
  hasHit: boolean;
}

export interface CharacterState {
  characterId: string;
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
  hitFlashFrames: number;
}
