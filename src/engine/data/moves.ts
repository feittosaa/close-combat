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
  /** Command grabs can connect against airborne and stunned opponents. */
  commandGrab?: { groundOnly?: boolean; downwardVelocity?: number; launch?: { velocity: number; forward: number; recovery: number };
    /** Against an airborne target: `only` connects solely with one in the air, `also` with either; absent, only with one on the floor. */
    airTarget?: 'only' | 'also' };
  /** Once it connects, nothing else can start in that combo. */
  comboFinisher?: boolean;
  /** Connects at most once per combo; moves with the same group name share that one use. */
  oncePerCombo?: boolean | string;
  crouching?: boolean;
  airborne?: boolean;
  /** Existing artwork only; this is a temporary pose alias, never new animation. */
  pose?: 'light-punch' | 'heavy-punch' | 'light-kick' | 'heavy-kick';
  movement?: { speed: number; until: number; launch?: number; gravityScale?: number };
  invulnerability?: { kind: 'all' | 'projectile'; until: number };
  /** Immunity to projectiles throughout this move, independently of other invulnerability. */
  projectileInvulnerable?: boolean;
  projectile?: { speed: number; life: number; spawnYOffsets?: readonly number[]; verticalSpeed?: number; gravity?: number; visual: 'tomato' | 'crow' | 'bullet' | 'dynamite' };
  screenVolley?: { shots: number; interval: number; bandHeight: number; pattern?: readonly { frame: number; height: number }[]; firstHitLevel?: HitLevel; damageReductionPerPriorHit?: number };
  /** Repeated contact windows distributed over the active portion of one move. */
  multiHit?: { hits: number; interval: number; damageReductionPerPriorHit: number };
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
  /** A mid attack that cannot be blocked while crouching. */
  overhead?: boolean;
  hitLevel: HitLevel;
  hitbox: { forward: number; yOffset: number; width: number; height: number };
}
