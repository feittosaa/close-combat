// src/engine/data/moves.ts
import type { AttackButton, Direction } from '../../input/types';
import { resolveCommand } from '../../input/CommandBuffer';

export type HitLevel = 'high' | 'mid' | 'low' | 'air' | 'throw' | 'special';

export interface MoveDefinition {
  id: string;
  input: { direction?: Direction; buttons: readonly AttackButton[] };
  airborne?: boolean;
  crouching?: boolean;
  startup: number;
  activeFrames: number;
  recovery: number;
  damage: number;
  hitstun: number;
  blockstun: number;
  pushback: { hit: number; block: number };
  advance?: number;
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
    blockstun: 10,
    pushback: { hit: 18, block: 12 },
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
    blockstun: 10,
    pushback: { hit: 18, block: 12 },
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
    blockstun: 10,
    pushback: { hit: 18, block: 12 },
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
    blockstun: 10,
    pushback: { hit: 18, block: 12 },
    hitLevel: 'mid',
    hitbox: { forward: 25, yOffset: -82, width: 86, height: 50 },
  },
  {
    id: 'test-advancing-jab',
    input: { direction: 'F', buttons: ['1'] },
    startup: 5,
    activeFrames: 2,
    recovery: 12,
    damage: 55,
    hitstun: 14,
    blockstun: 10,
    pushback: { hit: 20, block: 14 },
    advance: 12,
    hitLevel: 'high',
    hitbox: { forward: 27, yOffset: -116, width: 58, height: 36 },
  },
  {
    id: 'test-rising-punch',
    input: { direction: 'DF', buttons: ['2'] },
    startup: 8,
    activeFrames: 3,
    recovery: 17,
    damage: 75,
    hitstun: 19,
    blockstun: 11,
    pushback: { hit: 22, block: 16 },
    advance: 4,
    hitLevel: 'mid',
    hitbox: { forward: 24, yOffset: -144, width: 64, height: 52 },
  },
  {
    id: 'test-sweep',
    input: { direction: 'D', buttons: ['3'] },
    crouching: true,
    startup: 7,
    activeFrames: 3,
    recovery: 18,
    damage: 70,
    hitstun: 18,
    blockstun: 12,
    pushback: { hit: 20, block: 14 },
    hitLevel: 'low',
    hitbox: { forward: 23, yOffset: -46, width: 88, height: 34 },
  },
  {
    id: 'test-crouching-jab',
    input: { direction: 'D', buttons: ['1'] },
    crouching: true,
    startup: 5,
    activeFrames: 2,
    recovery: 12,
    damage: 42,
    hitstun: 13,
    blockstun: 10,
    pushback: { hit: 16, block: 10 },
    hitLevel: 'mid',
    hitbox: { forward: 22, yOffset: -88, width: 56, height: 36 },
  },
  {
    id: 'test-crouching-hook',
    input: { direction: 'D', buttons: ['2'] },
    crouching: true,
    startup: 7,
    activeFrames: 3,
    recovery: 16,
    damage: 62,
    hitstun: 17,
    blockstun: 10,
    pushback: { hit: 20, block: 13 },
    advance: 3,
    hitLevel: 'mid',
    hitbox: { forward: 24, yOffset: -112, width: 68, height: 46 },
  },
  {
    id: 'test-crouching-sweep-kick',
    input: { direction: 'D', buttons: ['4'] },
    crouching: true,
    startup: 8,
    activeFrames: 3,
    recovery: 19,
    damage: 72,
    hitstun: 18,
    blockstun: 12,
    pushback: { hit: 20, block: 14 },
    hitLevel: 'low',
    hitbox: { forward: 25, yOffset: -45, width: 84, height: 34 },
  },
  {
    id: 'test-jumping-kick',
    input: { direction: 'UF', buttons: ['4'] },
    startup: 8,
    activeFrames: 4,
    recovery: 20,
    damage: 80,
    hitstun: 20,
    blockstun: 11,
    pushback: { hit: 22, block: 16 },
    advance: 5,
    hitLevel: 'mid',
    hitbox: { forward: 24, yOffset: -176, width: 76, height: 48 },
  },
  {
    id: 'test-retreating-jab',
    input: { direction: 'B', buttons: ['1'] },
    startup: 6,
    activeFrames: 2,
    recovery: 14,
    damage: 50,
    hitstun: 14,
    blockstun: 10,
    pushback: { hit: 18, block: 12 },
    hitLevel: 'high',
    hitbox: { forward: 20, yOffset: -116, width: 56, height: 34 },
  },
  {
    id: 'test-retreating-elbow',
    input: { direction: 'DB', buttons: ['2'] },
    startup: 9,
    activeFrames: 3,
    recovery: 18,
    damage: 70,
    hitstun: 18,
    blockstun: 11,
    pushback: { hit: 20, block: 14 },
    hitLevel: 'mid',
    hitbox: { forward: 23, yOffset: -106, width: 68, height: 45 },
  },
  {
    id: 'test-backward-jumping-kick',
    input: { direction: 'UB', buttons: ['4'] },
    startup: 9,
    activeFrames: 4,
    recovery: 21,
    damage: 78,
    hitstun: 20,
    blockstun: 11,
    pushback: { hit: 22, block: 16 },
    advance: -5,
    hitLevel: 'mid',
    hitbox: { forward: 24, yOffset: -170, width: 76, height: 48 },
  },
  {
    id: 'test-air-jab',
    input: { buttons: ['1'] },
    airborne: true,
    startup: 5,
    activeFrames: 3,
    recovery: 13,
    damage: 50,
    hitstun: 14,
    blockstun: 10,
    pushback: { hit: 18, block: 12 },
    hitLevel: 'high',
    hitbox: { forward: 24, yOffset: -138, width: 58, height: 38 },
  },
  {
    id: 'test-air-strong',
    input: { buttons: ['2'] },
    airborne: true,
    startup: 7,
    activeFrames: 3,
    recovery: 17,
    damage: 68,
    hitstun: 18,
    blockstun: 10,
    pushback: { hit: 20, block: 14 },
    hitLevel: 'mid',
    hitbox: { forward: 27, yOffset: -132, width: 70, height: 48 },
  },
  {
    id: 'test-air-descending-kick',
    input: { buttons: ['3'] },
    airborne: true,
    startup: 6,
    activeFrames: 3,
    recovery: 16,
    damage: 62,
    hitstun: 16,
    blockstun: 10,
    pushback: { hit: 18, block: 12 },
    hitLevel: 'mid',
    hitbox: { forward: 28, yOffset: -98, width: 72, height: 44 },
  },
  {
    id: 'test-air-heavy-kick',
    input: { buttons: ['4'] },
    airborne: true,
    startup: 9,
    activeFrames: 4,
    recovery: 21,
    damage: 82,
    hitstun: 21,
    blockstun: 11,
    pushback: { hit: 22, block: 16 },
    hitLevel: 'mid',
    hitbox: { forward: 30, yOffset: -122, width: 84, height: 52 },
  },
];

export function getMoveByButton(button: AttackButton): MoveDefinition | undefined {
  return moves.find((move) => move.input.buttons.length === 1 && move.input.buttons[0] === button);
}

export function getMoveForInput(
  button: AttackButton,
  direction: Direction,
  airborne = false,
  crouching = false,
  allowedMoveIds?: readonly string[],
): MoveDefinition | undefined {
  const input = { direction, buttons: new Set([button]) };
  const availableMoves = allowedMoveIds
    ? moves.filter((move) => allowedMoveIds.includes(move.id))
    : moves;
  if (airborne) return resolveCommand(input, availableMoves.filter((move) => move.airborne));
  if (crouching) {
    const crouchingMove = resolveCommand(input, availableMoves.filter((move) => move.crouching));
    if (crouchingMove) return crouchingMove;
  }

  return resolveCommand(input, availableMoves.filter((move) => !move.airborne && !move.crouching));
}

export function getMoveById(moveId: string): MoveDefinition | undefined {
  return moves.find((move) => move.id === moveId);
}
