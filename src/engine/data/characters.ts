import type { MoveDefinition } from './moves';
import { shoto } from './fighters/shoto';
import { cowboy } from './fighters/cowboy';

export interface CharacterHurtbox {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}
export interface CharacterCollisionProfile {
  bodyWidth: number;
  airborneActiveHurtboxes?: Record<string, CharacterHurtbox>;
  jumpHurtboxes?: {
    extended: CharacterHurtbox; compact: CharacterHurtbox;
    compactFromFrame: number; compactUntilFrame: number;
  };
  hurtboxes: { standing: CharacterHurtbox; crouching: CharacterHurtbox; airborne: CharacterHurtbox; knockdown: CharacterHurtbox };
}
export interface ComboRecipe {
  id: string;
  name: string;
  notation: string;
  moveIds: readonly string[];
  /** Startup for each step of an authored sequence. */
  startupFrames?: readonly number[];
  /** Replaces only the final authored input with a dedicated move. */
  finisherMoveId?: string;
  /** Optional authored timing and contact rules for a projectile recipe. */
  projectileSequence?: { startupFrames: readonly number[]; continueOnBlock: boolean; airRecoil?: { liftSpeed: number; gravityScale: number } };
  /** A confirmed final hit may begin another explicitly authored recipe. */
  continueOnHit?: boolean;
  /** Recovery after the final confirmed hit of this recipe. */
  recoveryFrames?: number;
  /** End ordinary strike chaining after this confirmed recipe; specials remain cancellable. */
  endsBasicChain?: boolean;
  /** Launch and shortened recovery applied only by the confirmed final hit of this exact recipe. */
  launch?: { velocity: number; recoveryFrames: number };
}
export interface CharacterDefinition {
  id: string;
  name: string;
  maxHealth: number;
  movement: { walkSpeed: number; backwardWalkSpeed: number; jumpVelocity: number; dashSpeed: number; backdashSpeed: number; dashDurationFrames?: number; airDash?: boolean };
  moves: readonly MoveDefinition[];
  /** Ultimate selected by the universal shortcut when a fighter has several. */
  defaultUltimateId?: string;
  juggle?: {
    initialGravityScale: number; gravityScalePerHit: number; maximumGravityScale: number;
    getupFrames: number; wakeupInvulnerabilityFrames: number; airHitSuspensionFrames: number;
  };
  rage?: { maximum: number; onHit: number; onDamage: number; onBlock: number };
  /** Receitas de autoria manual, independentes das sequências abertas de acertos. */
  combos?: readonly ComboRecipe[];
  /** Receitas encadeadas em sequência, também de autoria manual. */
  comboChains?: readonly { name: string; recipeIds: readonly string[] }[];
  collision: CharacterCollisionProfile;
}
export const DEFAULT_CHARACTER_ID = 'shoto';
export const characters: readonly CharacterDefinition[] = [shoto, cowboy];
export const playableCharacters = characters;
export const defaultCharacter = shoto;
export function getCharacterById(id: string): CharacterDefinition | undefined {
  return characters.find(character => character.id === id);
}
