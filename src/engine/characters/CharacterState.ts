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
  throwCapturedFrame?: number;
  throwConfirmedFrame?: number;
  hitOutcome?: 'hit' | 'block';
  /** Recovery override for a confirmed combo or a blocked strike. */
  recoveryFrames?: number;
  /** Especial reforçado com uma barra de rage; vale para seus projéteis. */
  empowered?: boolean;
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
  /** Rage Rush ativo até o fim do round. */
  rush?: boolean;
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
  /** Presentation of the last Grappler grab while the victim is held or recovering from it. */
  grapplerGrabReaction?: { moveId: string; startedFrame: number; startedLying: boolean };
  rageAnimation?: { kind: 'breaker' | 'air-recovery'; startedFrame: number; airborne: boolean };
  perfectBlockStartedFrame?: number;
  hitReaction?: { level: 'low' | 'mid' | 'high'; startedFrame: number };
  grabbedStartedFrame?: number;
  /** Start of the Shoto ippon victim reaction. */
  ipponReceivedFrame?: number;
  grabbedHold?: boolean;
  commandGrabbed?: boolean;
  spinStartedFrame?: number;
  ultimateImpactFrame?: number;
  ultimateImpactPosition?: { x: number; y: number };
  chain?: string[];
  /** Consecutive confirmed hits in an authored projectile sequence. */
  projectileComboHits?: number;
  projectileComboId?: number;
  /** Confirmed pressure keeps its strength floor until the defender regains control. */
  hitSequence?: { targetId: string; heavy: boolean; heavyButton?: '2' | '4' };
  /** Contacted normal attacks in the current uninterrupted string, including guards. */
  contactSequence?: { heavy: boolean; heavyButton?: '2' | '4'; weakFamily?: '1' | '3'; usedPunch?: boolean };
  knockdown?: { velocityX: number };
  /** Move that caused the current grounded knockdown. */
  knockdownBy?: { attackerId: string; moveId: string };
  pushbackMotion?: { distancePerFrame: number; remainingFrames: number };
  /** A bounce blocks the next received combo until its reaction ends. */
  wallBounceProtection?: 'waiting' | 'receiving';
  /** After Bob's flying kick no ordinary air attack starts until he lands. */
  landingRequired?: boolean;
  wallBouncePending?: { direction: -1 | 1; attackerId: string; moveId: string };
  wallBounceEffect?: { x: number; y: number; frame: number; direction: -1 | 1 };
  throwFlight?: boolean;
  throwPull?: { distancePerFrame: number; remainingFrames: number; launchDistance: number; launchFrames: number; liftSpeed: number };
  /** Confirmed launcher flight; independent of ordinary jumps and scripted captures. */
  juggle?: { gravityScale: number; airHits: number; suspensionFrames?: number };
  /** Counts combat ticks, including grounded getup, then a short protected return. */
  wakeupInvulnerabilityFrames?: number;
}

/** Snapshot of the preceding pose state; contains no renderer objects or recursive history. */
export type CharacterAnimationState = Pick<CharacterState,'mode'|'stateStartedFrame'|'idleStartedFrame'|'grounded'|'crouching'|'movementDirection'|'facing'|'verticalVelocity'>;
