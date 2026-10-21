import type { CharacterDefinition } from '../characters';
import type { MoveDefinition } from '../moves';
import type { AttackButton } from '../../../input/types';

const strike = (id: string, button: AttackButton, startup: number, recovery: number, damage: number,
  hitbox: MoveDefinition['hitbox'], options: Partial<MoveDefinition> = {}): MoveDefinition => ({
    id, kind: 'normal', input: { buttons: [button] }, startup, activeFrames: 4, recovery,
    damage, hitstun: 19, blockstun: 12, pushback: { hit: 22, block: 7 }, hitLevel: 'mid', hitbox, ...options,
  });

/** Alcances da arma e movimento são autorados para Gris, sem clonar o livro de outro lutador. */
export const grisMoves: readonly MoveDefinition[] = [
  strike('standing-lp', '1', 8, 15, 42, { forward: 18, yOffset: -119, width: 57, height: 28 }, { hitLevel: 'high', parryable: true }),
  strike('standing-rp', '2', 14, 25, 82, { forward: 20, yOffset: -123, width: 112, height: 51 }),
  strike('standing-lk', '3', 9, 18, 49, { forward: 18, yOffset: -117, width: 108, height: 31 }),
  strike('standing-rk', '4', 13, 24, 76, { forward: 22, yOffset: -135, width: 85, height: 43 }),
  strike('crouching-lp', '1', 7, 15, 35, { forward: 17, yOffset: -80, width: 54, height: 26 }, { input: { direction: 'D', buttons: ['1'] }, crouching: true }),
  strike('crouching-rp', '2', 13, 24, 73, { forward: 19, yOffset: -75, width: 109, height: 41 }, { input: { direction: 'D', buttons: ['2'] }, crouching: true }),
  strike('crouching-lk', '3', 8, 19, 44, { forward: 16, yOffset: -57, width: 88, height: 28 }, { input: { direction: 'D', buttons: ['3'] }, crouching: true, hitLevel: 'low' }),
  strike('crouching-rk', '4', 14, 27, 76, { forward: 18, yOffset: -57, width: 91, height: 28 }, { input: { direction: 'D', buttons: ['4'] }, crouching: true, hitLevel: 'low' }),
  strike('air-lp', '1', 7, 15, 39, { forward: 17, yOffset: -114, width: 65, height: 30 }, { airborne: true }),
  strike('air-rp', '2', 12, 23, 78, { forward: 18, yOffset: -115, width: 101, height: 110 }, { airborne: true }),
  strike('air-lk', '3', 8, 18, 47, { forward: 17, yOffset: -115, width: 100, height: 36 }, { airborne: true }),
  strike('air-rk', '4', 12, 24, 72, { forward: 20, yOffset: -115, width: 94, height: 36 }, { airborne: true }),
  {
    id: 'golden-arc', kind: 'special', input: { sequence: ['D', 'DF', 'F'], buttons: ['1'] },
    startup: 18, activeFrames: 3, recovery: 28, damage: 79, hitstun: 24, blockstun: 16,
    hitLevel: 'mid', pushback: { hit: 25, block: 10 },
    hitbox: { forward: 22, yOffset: -110, width: 108, height: 48 },
    projectile: {
      forward: 58, yOffset: -68, speed: 7.4, lifetimeFrames: 100,
      hitbox: { forward: 0, yOffset: -23, width: 66, height: 46 }, animationId: 'fx-golden-arc', maxActive: 1
    },
  },
  {
    id: 'rising-shear', kind: 'special', input: { sequence: ['D', 'DB', 'B'], buttons: ['3'] },
    startup: 11, activeFrames: 9, recovery: 32, damage: 93, hitstun: 26, blockstun: 14,
    hitLevel: 'mid', pushback: { hit: 26, block: 9 }, launchVelocity: -10,
    strikeInvulnerableStartupFrames: 2,
    hitbox: { forward: 8, yOffset: -266, width: 72, height: 180 },
  },
  {
    id: 'silk-step', kind: 'special', input: { sequence: ['D', 'DF', 'F'], buttons: ['2'] },
    startup: 15, activeFrames: 9, recovery: 28, damage: 88, hitstun: 24, blockstun: 14,
    hitLevel: 'mid', pushback: { hit: 30, block: 11 }, travelSpeed: 4.4,
    hurtboxStances: { startup: 'standing', active: 'crouching', recovery: 'standing' },
    hitbox: { forward: 22, yOffset: -105, width: 118, height: 58 },
  },
  {
    id: 'royal-cleave', kind: 'special', input: { sequence: ['D', 'DB', 'B'], buttons: ['4'] },
    startup: 20, activeFrames: 6, recovery: 34, damage: 108, hitstun: 29, blockstun: 17,
    hitLevel: 'mid', pushback: { hit: 33, block: 12 },
    hitbox: { forward: 18, yOffset: -132, width: 130, height: 80 },
  },
  {
    id: 'forward-throw', kind: 'throw', input: { buttons: ['1', '3'] }, startup: 7,
    activeFrames: 1, recovery: 26, damage: 108, hitstun: 25, blockstun: 0,
    hitLevel: 'throw', pushback: { hit: 0, block: 0 },
    hitbox: { forward: 17, yOffset: -129, width: 53, height: 105 },
    throw: {
      range: 64, breakButtons: ['2', '4'], breakFrames: 6, breakRecovery: 12,
      launchDistance: { forward: 118, backward: 132 }
    },
  },
];

export const gris: CharacterDefinition = {
  id: 'gris', name: 'Gris', maxHealth: 1000,
  movement: { walkSpeed: 1.85, backwardWalkSpeed: 1.4, dashSpeed: 4.3, backdashSpeed: 3.5, runSpeed: 5.4, jumpVelocity: -12.2 },
  moves: grisMoves,
  collision: {
    bodyWidth: 44, hurtboxes: {
      standing: { offsetX: 0, offsetY: -152, width: 44, height: 152 },
      crouching: { offsetX: 0, offsetY: -91, width: 46, height: 91 },
      airborne: { offsetX: 0, offsetY: -139, width: 43, height: 139 },
      juggled: { offsetX: 0, offsetY: -40, width: 88, height: 90 },
    }
  },
  assets: { animationManifest: 'animations/gris.json' },
};
