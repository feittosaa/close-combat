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
  hurtboxes: { standing: CharacterHurtbox; crouching: CharacterHurtbox; airborne: CharacterHurtbox };
}
export interface ComboRecipe {
  id: string;
  name: string;
  notation: string;
  moveIds: readonly string[];
}
export interface CharacterDefinition {
  id: string;
  name: string;
  maxHealth: number;
  movement: { walkSpeed: number; backwardWalkSpeed: number; jumpVelocity: number; dashSpeed: number; backdashSpeed: number };
  moves: readonly MoveDefinition[];
  rage?: { maximum: number; onHit: number; onDamage: number; onBlock: number };
  /** Receitas de autoria manual; cancelamentos só seguem os prefixos declarados. */
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
