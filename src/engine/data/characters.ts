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
export const SECOND_TEST_CHARACTER_ID = 'dummy';

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
  {
    id: SECOND_TEST_CHARACTER_ID,
    name: 'Dummy',
    maxHealth: 900,
    movement: { walkSpeed: 2.5, jumpVelocity: -10.5 },
    moveIds: ['test-jab', 'test-cross', 'test-low-kick', 'test-heavy-kick'],
    assets: {
      spritesheet: 'sprites/characters/dummy/dummy.png',
      animationManifest: 'animations/dummy.json',
    },
  },
];

export function getCharacterById(characterId: string): CharacterDefinition | undefined {
  return characters.find((character) => character.id === characterId);
}

export const defaultCharacter = getCharacterById(DEFAULT_CHARACTER_ID)!;
