import type { AttackButton, Direction } from '../../input/types';

export type HitLevel = 'high' | 'mid' | 'low';

/** Dados de combate e parâmetros provisórios de um golpe, separados da arte. */
export interface MoveDefinition {
  id: string;
  name: string;
  input: { buttons: readonly AttackButton[]; sequence?: readonly Direction[] };
  notation?: string;
  /** Available only as an explicitly authored combo finisher. */
  comboOnly?: boolean;
  shortcutOnly?: boolean;
  /** A confirmed hit can start another authored combo while the target is stunned. */
  startsComboOnHit?: boolean;
  /** Hold the button to charge; thresholds use simulation frames. */
  charge?: { framesPerStep: number; maxSteps: number; damagePerStep: number; maxRangeBonus?: number };
  category?: 'basic' | 'crouching' | 'power' | 'throw' | 'special' | 'ultimate';
  crouching?: boolean;
  airborne?: boolean;
  /** Existing artwork only; this is a temporary pose alias, never new animation. */
  pose?: 'light-punch' | 'heavy-punch' | 'light-kick' | 'heavy-kick';
  movement?: { speed: number; until: number; launch?: number };
  invulnerability?: { kind: 'all' | 'projectile'; until: number };
  projectile?: { speed: number; life: number; verticalSpeed?: number; gravity?: number; visual: 'glass' | 'bottle' | 'molotov' | 'bullet' | 'dynamite' };
  ultimateSequence?: { lighterHitbox: MoveDefinition['hitbox']; lighterDelay: number; lighterSpeed: number; confirmStun: number; knockbackSpeed: number; launchSpeed: number; knockdownFrames: number };
  screenVolley?: { shots: number; interval: number; bandHeight: number; firstHitLevel?: HitLevel; damageReductionPerPriorHit?: number };
  rageCost?: number;
  /** Derruba no chão apenas quando o golpe acerta. */
  knockdown?: boolean;
  startup: number;
  activeFrames: number;
  recovery: number;
  damage: number;
  hitstun: number;
  blockstun: number;
  pushback: { hit: number; block: number };
  /** Spread hit pushback over combat ticks; blocked pushback remains immediate. */
  hitPushbackFrames?: number;
  /** On outward impact with a stage or visible-screen boundary, launch the target back into the arena. */
  wallBounce?: boolean;
  /** Launch a thrown opponent over several simulation frames. */
  throwFlight?: { frames: number; liftSpeed: number };
  hitLevel: HitLevel;
  hitbox: { forward: number; yOffset: number; width: number; height: number };
}
