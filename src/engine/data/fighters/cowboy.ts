import type { CharacterDefinition } from '../characters';

/** Protótipo jogável; comandos, medidas e balanceamento aguardam revisão. */
export const cowboy: CharacterDefinition = {
  id: 'cowboy', name: 'Cowboy', maxHealth: 1000,
  movement: { walkSpeed: 2.2, backwardWalkSpeed: 1.8, jumpVelocity: -10, dashSpeed: 4.4, backdashSpeed: 3.6 },
  collision: {
    bodyWidth: 60,
    hurtboxes: {
      standing: { offsetX: 0, offsetY: -180, width: 60, height: 180 },
      crouching: { offsetX: 0, offsetY: -110, width: 60, height: 110 },
      airborne: { offsetX: 0, offsetY: -170, width: 60, height: 170 },
      knockdown: { offsetX: 0, offsetY: -45, width: 180, height: 45 },
    },
  },
  juggle: { initialGravityScale: 0.7, gravityScalePerHit: 0.15, maximumGravityScale: 1.6, getupFrames: 24, wakeupInvulnerabilityFrames: 8, airHitSuspensionFrames: 6 },
  rage: { maximum: 200, onHit: 10, onDamage: 15, onBlock: 5 },
  combos: [],
  moves: [
    { id: 'light-punch', name: 'Soco fraco', category: 'basic', input: { buttons: ['1'] }, startup: 8, activeFrames: 3, recovery: 17, damage: 20, hitstun: 16, blockstun: 8, pushback: { hit: 3, block: 4 }, hitLevel: 'mid', hitbox: { forward: 25, yOffset: -145, width: 90, height: 35 } },
    { id: 'heavy-punch', name: 'Soco forte', category: 'basic', input: { buttons: ['2'] }, startup: 14, activeFrames: 4, recovery: 26, damage: 38, hitstun: 20, blockstun: 10, pushback: { hit: 5, block: 6 }, hitLevel: 'mid', hitbox: { forward: 25, yOffset: -150, width: 145, height: 38 } },
    { id: 'light-kick', name: 'Chute fraco', category: 'basic', input: { buttons: ['3'] }, startup: 10, activeFrames: 4, recovery: 20, damage: 24, hitstun: 18, blockstun: 9, pushback: { hit: 4, block: 5 }, hitLevel: 'mid', hitbox: { forward: 25, yOffset: -100, width: 115, height: 38 } },
    { id: 'heavy-kick', name: 'Chute forte', category: 'basic', input: { buttons: ['4'] }, startup: 17, activeFrames: 5, recovery: 31, damage: 45, hitstun: 22, blockstun: 11, pushback: { hit: 7, block: 8 }, hitLevel: 'mid', hitbox: { forward: 25, yOffset: -115, width: 175, height: 45 } },
    { id: 'air-light-punch', name: 'light-punch aéreo', category: 'basic', airborne: true, notation: 'no ar + 1', input: { buttons: ['1'] }, startup: 8, activeFrames: 3, recovery: 17, damage: 20, hitstun: 16, blockstun: 8, pushback: { hit: 4, block: 5 }, hitLevel: 'mid', hitbox: { forward: 25, yOffset: -145, width: 80, height: 38 } },
    { id: 'air-heavy-punch', name: 'heavy-punch aéreo', category: 'basic', airborne: true, notation: 'no ar + 2', input: { buttons: ['2'] }, startup: 14, activeFrames: 4, recovery: 26, damage: 38, hitstun: 20, blockstun: 10, pushback: { hit: 4, block: 5 }, hitLevel: 'mid', hitbox: { forward: 25, yOffset: -150, width: 115, height: 38 } },
    { id: 'air-light-kick', name: 'light-kick aéreo', category: 'basic', airborne: true, notation: 'no ar + 3', input: { buttons: ['3'] }, startup: 10, activeFrames: 4, recovery: 20, damage: 24, hitstun: 18, blockstun: 9, pushback: { hit: 4, block: 5 }, hitLevel: 'mid', hitbox: { forward: 25, yOffset: -100, width: 100, height: 38 } },
    { id: 'air-heavy-kick', name: 'heavy-kick aéreo', category: 'basic', airborne: true, notation: 'no ar + 4', input: { buttons: ['4'] }, startup: 17, activeFrames: 5, recovery: 31, damage: 45, hitstun: 22, blockstun: 11, pushback: { hit: 4, block: 5 }, hitLevel: 'mid', hitbox: { forward: 25, yOffset: -115, width: 130, height: 38 } },
    { id: 'crouch-punch', name: 'Soco abaixado', category: 'crouching', crouching: true, notation: 'd+1', input: { buttons: ['1'] }, startup: 7, activeFrames: 3, recovery: 16, damage: 18, hitstun: 14, blockstun: 8, pushback: { hit: 3, block: 3 }, hitLevel: 'mid', hitbox: { forward: 25, yOffset: -80, width: 85, height: 30 } },
    { id: 'anti-air', name: 'Antiaéreo', category: 'crouching', crouching: true, notation: 'd+2', input: { buttons: ['2'] }, startup: 9, activeFrames: 6, recovery: 29, damage: 42, hitstun: 24, blockstun: 11, pushback: { hit: 8, block: 7 }, hitLevel: 'mid', hitbox: { forward: 15, yOffset: -260, width: 100, height: 210 } },
    { id: 'crouch-light-kick', name: 'Chute baixo fraco', category: 'crouching', crouching: true, notation: 'd+3', input: { buttons: ['3'] }, startup: 10, activeFrames: 4, recovery: 20, damage: 22, hitstun: 16, blockstun: 9, pushback: { hit: 4, block: 4 }, hitLevel: 'low', hitbox: { forward: 25, yOffset: -35, width: 115, height: 30 } },
    { id: 'crouch-heavy-kick', name: 'Chute baixo forte', category: 'crouching', crouching: true, notation: 'd+4', input: { buttons: ['4'] }, startup: 16, activeFrames: 5, recovery: 32, damage: 40, hitstun: 23, blockstun: 12, pushback: { hit: 7, block: 8 }, hitLevel: 'low', hitbox: { forward: 25, yOffset: -38, width: 165, height: 33 } },
    { id: 'quick-shot', name: 'Disparo rápido', category: 'special', notation: 'd,df,f,1', input: { buttons: ['1'], sequence: ['D','DF','F'] }, startup: 14, activeFrames: 1, recovery: 30, damage: 30, hitstun: 20, blockstun: 12, pushback: { hit: 8, block: 6 }, hitLevel: 'mid', projectile: { speed: 9, life: 100, visual: 'bullet' }, hitbox: { forward: 0, yOffset: -130, width: 28, height: 18 } },
    { id: 'heavy-shot', name: 'Disparo pesado', category: 'special', notation: 'd,df,f,2', input: { buttons: ['2'], sequence: ['D','DF','F'] }, startup: 23, activeFrames: 1, recovery: 38, damage: 55, hitstun: 28, blockstun: 16, pushback: { hit: 16, block: 9 }, hitLevel: 'mid', projectile: { speed: 5, life: 180, visual: 'bullet' }, hitbox: { forward: 0, yOffset: -125, width: 36, height: 24 } },
    { id: 'push-away', name: 'Afastamento', category: 'special', notation: 'd,df,f,4', input: { buttons: ['4'], sequence: ['D','DF','F'] }, startup: 9, activeFrames: 4, recovery: 34, damage: 28, hitstun: 24, blockstun: 12, pushback: { hit: 110, block: 18 }, hitLevel: 'mid', hitbox: { forward: 15, yOffset: -145, width: 65, height: 95 } },
  ],
};
