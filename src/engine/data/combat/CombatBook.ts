import type { AttackButton, Direction } from '../../../input/types';
import type { MoveDefinition } from '../moves';

export type MoveCategory = 'basics' | 'strings' | 'specials' | 'throws' | 'starters' | 'crouching' | 'rising' | 'stances' | 'defense' | 'wall';
export const CATEGORY_LABELS: Record<MoveCategory, string> = {
  basics: 'Básicos', strings: 'Strings', specials: 'Especiais', throws: 'Agarrões', starters: 'Starters',
  crouching: 'Agachados', rising: 'Ao levantar', stances: 'Posturas', defense: 'Defesa', wall: 'Parede',
};
export type CombatStance = 'standing' | 'crouching' | 'rising' | 'crouch-dash' | 'sway' | 'backturned' | 'charging';
export interface CombatCommand {
  notation: string;
  directions?: readonly Direction[];
  directionAliases?: readonly (readonly Direction[])[];
  buttons: readonly AttackButton[];
  stance?: CombatStance;
  parentId?: string;
  alternateParentIds?: readonly string[];
  followupWindow?: { from: number; to: number; onHit?: boolean };
  holdFrames?: number;
  preciseFrames?: number;
  requiresPower?: boolean;
  requiresRage?: boolean;
  targetGrounded?: boolean;
  atWall?: boolean;
}
export interface StrikeFrame {
  from: number;
  to: number;
  damage: number;
  hitLevel: MoveDefinition['hitLevel'];
  hitbox: MoveDefinition['hitbox'];
  hitstun: number;
  blockstun: number;
  reaction?: 'launch' | 'knockdown';
  counterReaction?: 'launch' | 'knockdown';
  screw?: boolean;
  wallSplat?: boolean;
  wallBounce?: boolean;
  canHitGround?: boolean;
  requiresPriorHit?: boolean;
  projectile?: import('../moves').ProjectileDefinition;
}
export interface MoveCombatData {
  name: string;
  categories: readonly MoveCategory[];
  command: CombatCommand;
  strikes: readonly StrikeFrame[];
  /** Authored boxes are independent from borrowed placeholder art. */
  hurtboxes: readonly { from: number; to: number; box: { offsetX: number; offsetY: number; width: number; height: number } }[];
  reference?: { command: string; url: string; startup: string; block: string; hit: string; counter: string; damage: string };
  adaptation: string;
  estimatedFields?: readonly string[];
  recoveryOnContact?: number;
  animation: { clip: string; status: 'provisional' | 'authored' };
  highCrush?: { from: number; to: number };
  lowCrush?: { from: number; to: number };
  armor?: { from: number; to: number };
  parry?: { from: number; to: number; levels: readonly MoveDefinition['hitLevel'][]; limbs: readonly string[]; successDamage?: number; successHitstun?: number; successReaction?: 'launch' | 'knockdown' };
  unblockable?: boolean;
  nonLethal?: boolean;
  limb: 'punch' | 'kick' | 'knee' | 'elbow' | 'weapon' | 'body';
  action?: { stance?: CombatStance; duration?: number; move?: number; power?: 'activate' | 'consume' | 'activate-on-hit'; cancelRecovery?: boolean; powerCost?: number; powerCostOnHit?: number; sideSwitch?: boolean };
}
export interface ComboRecipe {
  id: string;
  name: string;
  category: 'beginner' | 'advanced' | 'wall' | 'small' | 'ender';
  notation: string;
  moveIds: readonly string[];
  starter?: string;
  condition?: string;
  source?: string;
}
export interface CombatRules {
  launchVelocity?: number;
  launchGravity?: number;
  juggleHitVelocity?: number;
  screwVelocity?: number;
  commandBufferFrames?: number;
  lowParryFrames: number;
  lowParryStunFrames: number;
  stanceFrames: number;
  comboScaling: readonly number[];
  juggleGravity: number;
  juggleBaseGravity: number;
  knockdownFrames: number;
  wallStunFrames: number;
  powerFrames: number;
}
