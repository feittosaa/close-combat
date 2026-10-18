// src/engine/data/moves.ts
import type { AttackButton, Direction } from '../../input/types';

export type HitLevel = 'high' | 'mid' | 'low' | 'air' | 'throw' | 'special';

export interface MoveDefinition {
  id: string;
  input: { direction?: Direction; buttons: readonly AttackButton[] };
  startup: number;
  activeFrames: number;
  recovery: number;
  damage: number;
  hitstun: number;
  hitLevel: HitLevel;
  hitbox: { forward: number; yOffset: number; width: number; height: number };
}

/** Valores de protótipo; correspondem à tabela provisória em base.md. */
export const moves: readonly MoveDefinition[] = [
  {
    id: 'test-jab',
    input: { buttons: ['1'] },
    startup: 4,
    activeFrames: 2,
    recovery: 10,
    damage: 45,
    hitstun: 12,
    hitLevel: 'high',
    hitbox: { forward: 25, yOffset: -118, width: 54, height: 34 },
  },
  {
    id: 'test-cross',
    input: { buttons: ['2'] },
    startup: 6,
    activeFrames: 3,
    recovery: 14,
    damage: 65,
    hitstun: 16,
    hitLevel: 'mid',
    hitbox: { forward: 25, yOffset: -126, width: 72, height: 48 },
  },
  {
    id: 'test-low-kick',
    input: { buttons: ['3'] },
    startup: 7,
    activeFrames: 3,
    recovery: 16,
    damage: 60,
    hitstun: 16,
    hitLevel: 'low',
    hitbox: { forward: 25, yOffset: -54, width: 68, height: 34 },
  },
  {
    id: 'test-heavy-kick',
    input: { buttons: ['4'] },
    startup: 9,
    activeFrames: 4,
    recovery: 19,
    damage: 85,
    hitstun: 21,
    hitLevel: 'mid',
    hitbox: { forward: 25, yOffset: -82, width: 86, height: 50 },
  },
];

export function getMoveByButton(button: AttackButton): MoveDefinition | undefined {
  return moves.find((move) => move.input.buttons.length === 1 && move.input.buttons[0] === button);
}

export function getMoveById(moveId: string): MoveDefinition | undefined {
  return moves.find((move) => move.id === moveId);
}
