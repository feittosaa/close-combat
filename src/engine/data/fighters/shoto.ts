import type { CharacterDefinition } from '../characters';

/** Bancada provisória criada do zero. Valores técnicos, ainda sem homologação de balanceamento. */
export const shoto: CharacterDefinition = {
  id: 'shoto', name: 'Shoto', maxHealth: 1000,
  movement: { walkSpeed: 2.4, backwardWalkSpeed: 1.8, jumpVelocity: -10, dashSpeed: 4.6, backdashSpeed: 3.6, runSpeed: 5.2 },
  collision: {
    bodyWidth: 48,
    hurtboxes: {
      standing: { offsetX: 0, offsetY: -144, width: 48, height: 144 },
      crouching: { offsetX: 0, offsetY: -90, width: 48, height: 90 },
      airborne: { offsetX: 0, offsetY: -136, width: 48, height: 136 },
    },
  },
  combos: [],
  moves: [
    { id: 'light-punch', name: 'Soco fraco', input: { buttons: ['1'] }, startup: 6, activeFrames: 2, recovery: 12,
      damage: 20, hitstun: 10, blockstun: 6, pushback: { hit: 6, block: 4 }, hitLevel: 'high',
      hitbox: { forward: 20, yOffset: -120, width: 42, height: 28 } },
    { id: 'heavy-punch', name: 'Soco forte', input: { buttons: ['2'] }, startup: 10, activeFrames: 3, recovery: 18,
      damage: 35, hitstun: 14, blockstun: 8, pushback: { hit: 9, block: 6 }, hitLevel: 'high',
      hitbox: { forward: 20, yOffset: -122, width: 58, height: 32 } },
    { id: 'light-kick', name: 'Chute fraco', input: { buttons: ['3'] }, startup: 8, activeFrames: 3, recovery: 15,
      damage: 25, hitstun: 12, blockstun: 7, pushback: { hit: 7, block: 5 }, hitLevel: 'mid',
      hitbox: { forward: 20, yOffset: -74, width: 62, height: 30 } },
    { id: 'heavy-kick', name: 'Chute forte', input: { buttons: ['4'] }, startup: 13, activeFrames: 4, recovery: 22,
      damage: 45, hitstun: 16, blockstun: 9, pushback: { hit: 12, block: 8 }, hitLevel: 'mid',
      hitbox: { forward: 20, yOffset: -92, width: 78, height: 38 } },
  ],
};
