import type { AttackButton } from '../../input/types';
import type { CharacterCollisionProfile } from '../data/characters';

export type CharacterMode = 'neutral' | 'moving' | 'dashing' | 'airborne' | 'crouching' |
  'startup' | 'active' | 'recovery' | 'blocking' | 'hitstun' | 'blockstun' | 'knockdown';
export interface CharacterAttack {
  moveId: string;
  buttons: readonly AttackButton[];
  elapsedFrames: number;
  hasHit: boolean;
  startupFrames?: number;
  projectileId?: number;
  chargeFrames?: number;
  chargeReleased?: boolean;
  throwDirection?: 'forward' | 'backward';
  hitOutcome?: 'hit' | 'block';
  /** Recovery override for a confirmed combo or a blocked strike. */
  recoveryFrames?: number;
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
  ultimateUsed: boolean;
  mode: CharacterMode;
  stateStartedFrame: number;
  animationTransition?: { startedFrame: number; from: CharacterAnimationState; previous?: {startedFrame:number;from:CharacterAnimationState} };
  facingTransition?: { startedFrame: number; from: 'left' | 'right' };
  remainingStateFrames: number;
  /** Logical jump origin survives guard/stun pose changes; renderer never restarts a flight. */
  airborneStartedFrame?: number;
  airborneElapsedFrames?: number;
  airDashUsed?: boolean;
  verticalVelocity: number;
  grounded: boolean;
  crouching: boolean;
  tauntStartedFrame?: number;
  /** Start of uninterrupted, grounded neutral time for the idle animation. */
  idleStartedFrame?: number;
  attack?: CharacterAttack;
  hitFlashFrames: number;
  hitReaction?: { level: 'low' | 'mid' | 'high'; startedFrame: number };
  grabbedStartedFrame?: number;
  chain?: string[];
  /** Consecutive confirmed hits in an authored projectile sequence. */
  projectileComboHits?: number;
  projectileComboId?: number;
  /** Confirmed pressure keeps its strength floor until the defender regains control. */
  hitSequence?: { targetId: string; heavy: boolean; heavyButton?: '2' | '4' };
  knockdown?: { velocityX: number };
  pushbackMotion?: { distancePerFrame: number; remainingFrames: number };
  throwFlight?: boolean;
  throwPull?: { distancePerFrame: number; remainingFrames: number; launchDistance: number; launchFrames: number; liftSpeed: number };
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
