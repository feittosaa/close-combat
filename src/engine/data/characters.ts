import type { MoveDefinition } from './moves';
import { shoto } from './fighters/shoto';

export interface CharacterHurtbox {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}
export interface CharacterCollisionProfile {
  bodyWidth: number;
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
  /** Upward velocity applied only by the confirmed final hit of this exact recipe. */
  launchVelocity?: number;
}
export interface CharacterDefinition {
  id: string;
  name: string;
  maxHealth: number;
  movement: { walkSpeed: number; backwardWalkSpeed: number; jumpVelocity: number; dashSpeed: number; backdashSpeed: number };
  moves: readonly MoveDefinition[];
  juggle?: {
    initialGravityScale: number; gravityScalePerHit: number; maximumGravityScale: number;
    getupFrames: number; wakeupInvulnerabilityFrames: number; airHitSuspensionFrames: number;
  };
  rage?: { maximum: number; onHit: number; onDamage: number; onBlock: number };
  /** Receitas de autoria manual, independentes das sequências abertas de acertos. */
  combos?: readonly ComboRecipe[];
  collision: CharacterCollisionProfile;
}
export const DEFAULT_CHARACTER_ID = 'shoto';
export const characters: readonly CharacterDefinition[] = [shoto];
export const playableCharacters = characters;
export const defaultCharacter = shoto;
export function getCharacterById(id: string): CharacterDefinition | undefined {
  return characters.find(character => character.id === id);
}
