import type { CombatStance, CombatRules } from '../data/combat/CombatBook';
// src/engine/characters/CharacterState.ts
import type { AttackButton } from '../../input/types';
import type { CharacterCollisionProfile } from '../data/characters';

export type CharacterMode =
  | 'neutral'
  | 'moving'
  | 'dashing'
  | 'running'
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
  wasBlocked?: boolean;
  preciseExecution: boolean;
  forceCounterHit?: boolean;
  parryConfirmed?: boolean;
  connectedStrikes?: number[];
  hurtboxOverride?: { offsetX: number; offsetY: number; width: number; height: number };
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
  combatRules?: CombatRules;
  stance?: CombatStance;
  stanceFrames?: number;
  crouchFrames?: number;
  risingFrames?: number;
  powerFrames?: number;
  powerAvailable?: boolean;
  rageUsed?: boolean;
  lowParryFrames?: number;
  lowParryHeld?: boolean;
  combo?: { airHits?: number; attackerId: string; hits: number; damage: number; screwUsed: boolean; wallUsed: boolean; wallFrames: number; moveIds: string[] };
  lastCombo?: { hits: number; damage: number; moveIds: string[] };
  attack?: CharacterAttack;
  /** String continuation context; never prevents movement or a fresh root command. */
  followup?: CharacterAttack;
  grab?: CharacterGrab;
  hitFlashFrames: number;
}
