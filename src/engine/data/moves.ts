// src/engine/data/moves.ts
import type { AttackButton, Direction } from '../../input/types';

export type HitLevel = 'high' | 'mid' | 'low' | 'air' | 'throw' | 'special';

export interface MoveDefinition {
  id: string;
  input: { direction?: Direction; buttons: readonly AttackButton[] };
  startup: number;
  active: readonly { start: number; end: number }[];
  recovery: number;
  hitstun?: number;
  blockstun?: number;
  hitLevel: HitLevel;
  range?: { forward: number; vertical: number };
  pushback?: { hit: number; block: number };
}

// O catálogo permanece vazio até haver definições de golpes aprovadas no documento-base.
export const moves: readonly MoveDefinition[] = [];
