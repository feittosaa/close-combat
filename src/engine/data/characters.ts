// src/engine/data/characters.ts
export interface CharacterDefinition {
  id: string;
  name: string;
  maxHealth: number;
  movement: { walkSpeed: number; jumpVelocity: number };
  moveIds: readonly string[];
  assets: { portrait?: string; spritesheet?: string };
}

// Personagens de teste serão definidos quando seus atributos iniciais forem decididos.
export const characters: readonly CharacterDefinition[] = [];
