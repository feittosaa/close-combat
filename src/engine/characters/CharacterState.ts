import type { AttackButton } from '../../input/types';
import type { CharacterCollisionProfile } from '../data/characters';

export type CharacterMode = 'neutral' | 'moving' | 'dashing' | 'airborne' | 'crouching' |
  'startup' | 'active' | 'recovery' | 'blocking' | 'hitstun' | 'blockstun' | 'knockdown';
export interface CharacterAttack {
  moveId: string;
  commandFrame?: number;
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
  rage: number;
  maxRage: number;
  mode: CharacterMode;
  stateStartedFrame: number;
  animationTransition?: { startedFrame: number; from: CharacterAnimationState; previous?: {startedFrame:number;from:CharacterAnimationState} };
  remainingStateFrames: number;
  /** Logical jump origin survives guard/stun pose changes; renderer never restarts a flight. */
  airborneStartedFrame?: number;
  airborneElapsedFrames?: number;
  verticalVelocity: number;
  grounded: boolean;
  crouching: boolean;
  attack?: CharacterAttack;
  hitFlashFrames: number;
  chain?: string[];
  chainLastFrame?: number;
  knockdown?: { velocityX: number };
  /** Confirmed launcher flight; independent of ordinary jumps and scripted captures. */
  juggle?: { gravityScale: number; airHits: number; suspensionFrames?: number };
  /** Counts combat ticks, including grounded getup, then a short protected return. */
  wakeupInvulnerabilityFrames?: number;
  /** Bottle confirmation holds the defender until the lighter arrives, including landing. */
  ultimateCapture?: { ownerId: string };
  ultimateThrowStartedFrame?: number;
}

/** Snapshot of the preceding pose state; contains no renderer objects or recursive history. */
export type CharacterAnimationState = Pick<CharacterState,'mode'|'stateStartedFrame'|'grounded'|'crouching'|'movementDirection'|'facing'|'verticalVelocity'>;
