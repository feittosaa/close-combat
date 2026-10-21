import { aylaCombatMoves, aylaCombatRules, aylaCombos } from '../combat/aylaCombatBook';
import type { CharacterDefinition } from '../characters';
import type { MoveDefinition } from '../moves';
import type { AttackButton } from '../../../input/types';

// Todos os números são locais da Ayla; não dependem do livro do Tester.
const normal = (id: string, button: AttackButton, startup: number, recovery: number,
  damage: number, hitbox: MoveDefinition['hitbox'], options: Partial<MoveDefinition> = {}): MoveDefinition => ({
    id, kind: 'normal', input: { buttons: [button] }, startup, activeFrames: 3, recovery,
    damage, hitstun: 16, blockstun: 10, pushback: { hit: 16, block: 5 },
    hitLevel: 'mid', hitbox, ...options,
  });

export const aylaLegacyMoves: readonly MoveDefinition[] = [
  normal('standing-lp', '1', 6, 12, 38, { forward: 18, yOffset: -116, width: 47, height: 28 }, { hitLevel: 'high', parryable: true }),
  normal('standing-rp', '2', 10, 19, 64, { forward: 22, yOffset: -118, width: 64, height: 38 }),
  normal('standing-lk', '3', 8, 16, 48, { forward: 20, yOffset: -77, width: 68, height: 30 }),
  normal('standing-rk', '4', 12, 23, 78, { forward: 22, yOffset: -132, width: 78, height: 44 }, { activeFrames: 4 }),
  normal('crouching-lp', '1', 6, 13, 32, { forward: 18, yOffset: -76, width: 47, height: 24 }, { input: { direction: 'D', buttons: ['1'] }, crouching: true }),
  normal('crouching-rp', '2', 9, 18, 54, { forward: 20, yOffset: -91, width: 53, height: 40 }, { input: { direction: 'D', buttons: ['2'] }, crouching: true }),
  normal('crouching-lk', '3', 7, 17, 42, { forward: 18, yOffset: -30, width: 66, height: 25 }, { input: { direction: 'D', buttons: ['3'] }, crouching: true, hitLevel: 'low' }),
  normal('crouching-rk', '4', 12, 25, 72, { forward: 18, yOffset: -25, width: 91, height: 22 }, { input: { direction: 'D', buttons: ['4'] }, crouching: true, hitLevel: 'low', activeFrames: 4 }),
  normal('air-lp', '1', 6, 13, 36, { forward: 18, yOffset: -104, width: 48, height: 30 }, { airborne: true }),
  normal('air-rp', '2', 9, 18, 57, { forward: 20, yOffset: -105, width: 59, height: 35 }, { airborne: true }),
  normal('air-lk', '3', 7, 17, 46, { forward: 20, yOffset: -73, width: 70, height: 30 }, { airborne: true }),
  normal('air-rk', '4', 11, 22, 70, { forward: 22, yOffset: -85, width: 83, height: 38 }, { airborne: true, activeFrames: 4 }),
  {
    id: 'crimson-wave', kind: 'special', input: { sequence: ['D', 'DF', 'F'], buttons: ['1'] },
    hurtboxStances: { startup: 'standing', active: 'crouching', recovery: 'standing' },
    startup: 16, activeFrames: 3, recovery: 26, damage: 72, hitstun: 23, blockstun: 15,
    hitLevel: 'low', pushback: { hit: 24, block: 9 },
    hitbox: { forward: 22, yOffset: -32, width: 40, height: 28 },
    projectile: {
      forward: 48, yOffset: 0, speed: 6, lifetimeFrames: 120,
      hitbox: { forward: 0, yOffset: -30, width: 48, height: 30 }, animationId: 'fx-crimson-wave', maxActive: 1
    },
  },
  {
    id: 'scarlet-rush', kind: 'special', input: { sequence: ['D', 'DF', 'F'], buttons: ['2'] },
    startup: 12, activeFrames: 8, recovery: 25, damage: 85, hitstun: 24, blockstun: 14,
    hitLevel: 'mid', pushback: { hit: 34, block: 10 }, travelSpeed: 4,
    hitbox: { forward: 22, yOffset: -111, width: 74, height: 41 },
  },
  {
    id: 'rising-kick', kind: 'special', input: { sequence: ['D', 'DB', 'B'], buttons: ['3'] },
    startup: 9, activeFrames: 9, recovery: 30, damage: 88, hitstun: 25, blockstun: 13,
    hitLevel: 'mid', pushback: { hit: 25, block: 8 }, launchVelocity: -9,
    strikeInvulnerableStartupFrames: 3,
    hitbox: { forward: -35, yOffset: -185, width: 120, height: 137 },
  },
  {
    id: 'leaping-kick', kind: 'special', input: { sequence: ['D', 'DB', 'B'], buttons: ['4'] },
    startup: 14, activeFrames: 8, recovery: 24, damage: 82, hitstun: 22, blockstun: 12,
    hitLevel: 'mid', pushback: { hit: 26, block: 10 }, launchVelocity: -6, travelSpeed: 3,
    hitbox: { forward: 20, yOffset: -151, width: 82, height: 70 },
  },
  {
    id: 'ruby-eruption', kind: 'special', input: { sequence: ['D', 'DF', 'F'], buttons: ['1', '2'] },
    hurtboxStances: { startup: 'standing', active: 'crouching', recovery: 'standing' },
    startup: 24, activeFrames: 3, recovery: 38, damage: 120, hitstun: 30, blockstun: 20,
    hitLevel: 'mid', pushback: { hit: 30, block: 12 },
    hitbox: { forward: 20, yOffset: -40, width: 42, height: 34 },
    projectile: {
      forward: 90, yOffset: 0, speed: 0, lifetimeFrames: 18,
      hitbox: { forward: -52, yOffset: -168, width: 104, height: 168 }, animationId: 'fx-ruby-eruption', maxActive: 1
    },
  },
  {
    id: 'forward-throw', kind: 'throw', input: { buttons: ['1', '3'] }, startup: 6,
    activeFrames: 1, recovery: 24, damage: 102, hitstun: 24, blockstun: 0,
    hitLevel: 'throw', pushback: { hit: 0, block: 0 },
    hitbox: { forward: 18, yOffset: -120, width: 54, height: 100 },
    throw: {
      range: 65, breakButtons: ['2', '4'], breakFrames: 6, breakRecovery: 12,
      launchDistance: { forward: 110, backward: 125 }
    },
  },
];

export const ayla: CharacterDefinition = {
  id: 'ayla', name: 'Ayla', maxHealth: 950,
  movement: { walkSpeed: 2, backwardWalkSpeed: 1.5, dashSpeed: 4.6, backdashSpeed: 3.8, jumpVelocity: -11.6 },
  moves: [...aylaCombatMoves, ...aylaLegacyMoves.map(move => ({ ...move, legacy: true }))],
  combos: aylaCombos,
  combatRules: aylaCombatRules,
  collision: {
    bodyWidth: 46, hurtboxes: {
      juggled: { offsetX: 0, offsetY: -35, width: 86, height: 80 },
      knockdown: { offsetX: 0, offsetY: -34, width: 98, height: 34 },
      standing: { offsetX: 0, offsetY: -140, width: 46, height: 140 },
      crouching: { offsetX: 0, offsetY: -87, width: 48, height: 87 },
      airborne: { offsetX: 0, offsetY: -132, width: 44, height: 132 },
    }
  },
  assets: { animationManifest: 'animations/ayla.json' },
};

export const aylaMoves = ayla.moves;
