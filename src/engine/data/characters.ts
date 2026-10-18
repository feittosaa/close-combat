// src/engine/data/characters.ts
import { moves } from './moves';

export interface CharacterDefinition {
  id: string;
  name: string;
  maxHealth: number;
  movement: { walkSpeed: number; jumpVelocity: number };
  moveIds: readonly string[];
  assets: { portrait?: string; spritesheet?: string; animationManifest?: string };
}

export const DEFAULT_CHARACTER_ID = 'tester';

/** Primeiro personagem provisório; ambos os lados o usam até existir seleção. */
export const characters: readonly CharacterDefinition[] = [
  {
    id: DEFAULT_CHARACTER_ID,
    name: 'Tester',
    maxHealth: 1000,
    movement: { walkSpeed: 3, jumpVelocity: -11 },
    moveIds: moves.map((move) => move.id),
    assets: {
      spritesheet: 'sprites/characters/tester/tester.png',
      animationManifest: 'animations/tester.json',
    },
  },
];

export function getCharacterById(characterId: string): CharacterDefinition | undefined {
  return characters.find((character) => character.id === characterId);
}

export const defaultCharacter = getCharacterById(DEFAULT_CHARACTER_ID)!;
