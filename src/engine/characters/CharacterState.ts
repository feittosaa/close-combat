// src/engine/characters/CharacterState.ts
export type CharacterMode =
  | 'neutral'
  | 'moving'
  | 'startup'
  | 'active'
  | 'recovery'
  | 'blocking'
  | 'hitstun'
  | 'blockstun'
  | 'grabbed'
  | 'knockdown';

export interface CharacterState {
  characterId: string;
  x: number;
  y: number;
  facing: 'left' | 'right';
  health: number;
  mode: CharacterMode;
  remainingStateFrames: number;
}
