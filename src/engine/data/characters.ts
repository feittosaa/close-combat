// src/engine/data/characters.ts
import { testerMoves } from './moves';
import type { MoveDefinition } from './moves';

export interface CharacterHurtbox {
  /** Deslocamento relativo ao centro horizontal e aos pés do personagem. */
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

export interface CharacterCollisionProfile {
  bodyWidth: number;
  hurtboxes: {
    standing: CharacterHurtbox;
    crouching: CharacterHurtbox;
    airborne: CharacterHurtbox;
  };
}

export interface CharacterDefinition {
  id: string;
  name: string;
  maxHealth: number;
  movement: { walkSpeed: number; jumpVelocity: number };
  /** Livro de golpes exclusivo deste personagem; IDs só precisam ser únicos dentro do livro. */
  moves: readonly MoveDefinition[];
  collision: CharacterCollisionProfile;
  assets: { portrait?: string; spritesheet?: string; animationManifest?: string };
}

export const DEFAULT_CHARACTER_ID = 'tester';
export const SECOND_TEST_CHARACTER_ID = 'dummy';

const testerCollision: CharacterCollisionProfile = {
  bodyWidth: 54,
  hurtboxes: {
    standing: { offsetX: 0, offsetY: -152, width: 54, height: 152 },
    crouching: { offsetX: 0, offsetY: -96, width: 54, height: 96 },
    airborne: { offsetX: 0, offsetY: -144, width: 54, height: 144 },
  },
};

const dummyCollision: CharacterCollisionProfile = {
  bodyWidth: 60,
  hurtboxes: {
    standing: { offsetX: 0, offsetY: -148, width: 60, height: 148 },
    crouching: { offsetX: 0, offsetY: -88, width: 58, height: 88 },
    airborne: { offsetX: 0, offsetY: -136, width: 56, height: 136 },
  },
};

const dummyMoves: readonly MoveDefinition[] = testerMoves
  .filter((move) => ['test-jab', 'test-cross', 'test-low-kick', 'test-heavy-kick'].includes(move.id))
  .map((move) => move.id === 'test-jab'
    ? { ...move, id: 'dummy-jab', damage: 38, hitbox: { forward: 30, yOffset: -112, width: 48, height: 30 } }
    : move);

/** Primeiro personagem provisório; ambos os lados o usam até existir seleção. */
export const characters: readonly CharacterDefinition[] = [
  {
    id: DEFAULT_CHARACTER_ID,
    name: 'Tester',
    maxHealth: 1000,
    movement: { walkSpeed: 3, jumpVelocity: -11 },
    moves: testerMoves,
    collision: testerCollision,
    assets: {
      spritesheet: 'sprites/characters/tester/tester-atlas.png',
      animationManifest: 'animations/tester.json',
    },
  },
  {
    id: SECOND_TEST_CHARACTER_ID,
    name: 'Dummy',
    maxHealth: 900,
    movement: { walkSpeed: 2.5, jumpVelocity: -10.5 },
    moves: dummyMoves,
    collision: dummyCollision,
    assets: {
      spritesheet: 'sprites/characters/dummy/dummy-atlas-v01.png',
      animationManifest: 'animations/dummy.json',
    },
  },
];

export function getCharacterById(characterId: string): CharacterDefinition | undefined {
  return characters.find((character) => character.id === characterId);
}

export const defaultCharacter = getCharacterById(DEFAULT_CHARACTER_ID)!;
