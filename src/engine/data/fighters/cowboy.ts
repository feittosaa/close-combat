import type { CharacterDefinition } from '../characters';

/** Protótipo jogável; comandos, medidas e balanceamento aguardam revisão. */
export const cowboy: CharacterDefinition = {
  id: 'cowboy', name: 'Cowboy', maxHealth: 1000,
  movement: { walkSpeed: 2.2, backwardWalkSpeed: 1.8, jumpVelocity: -10, dashSpeed: 4.4, backdashSpeed: 3.6 },
  collision: {
    bodyWidth: 52,
    hurtboxes: {
      standing: { offsetX: 0, offsetY: -157.54, width: 52, height: 157.54 },
      crouching: { offsetX: 0, offsetY: -95.14, width: 52, height: 95.14 },
      airborne: { offsetX: 0, offsetY: -147.03, width: 52, height: 147.03 },
      knockdown: { offsetX: 0, offsetY: -39, width: 157.54, height: 39 },
    },
  },
  juggle: { initialGravityScale: 0.7, gravityScalePerHit: 0.15, maximumGravityScale: 1.6, getupFrames: 24, wakeupInvulnerabilityFrames: 8, airHitSuspensionFrames: 6 },
  rage: { maximum: 200, onHit: 10, onDamage: 15, onBlock: 5 },
  combos: [],
  moves: [
    { id: 'light-punch', name: 'Soco fraco', category: 'basic', input: { buttons: ['1'] }, startup: 8, activeFrames: 3, recovery: 17, damage: 20, hitstun: 16, blockstun: 8, pushback: { hit: 3, block: 4 }, hitLevel: 'mid', projectile: { speed: 9, life: 100, visual: 'bullet' }, hitbox: { forward: 0, yOffset: -120, width: 28, height: 18 } },
    { id: 'heavy-punch', name: 'Soco forte', category: 'basic', input: { buttons: ['2'] }, startup: 14, activeFrames: 4, recovery: 26, damage: 38, hitstun: 20, blockstun: 10, pushback: { hit: 5, block: 6 }, hitLevel: 'mid', projectile: { speed: 6, life: 150, visual: 'bullet' }, hitbox: { forward: 0, yOffset: -120, width: 36, height: 22 } },
    { id: 'light-kick', name: 'Chute fraco', category: 'basic', input: { buttons: ['3'] }, startup: 10, activeFrames: 4, recovery: 20, damage: 24, hitstun: 18, blockstun: 9, pushback: { hit: 4, block: 5 }, hitLevel: 'low', hitbox: { forward: 25, yOffset: -35, width: 55, height: 30 } },
    { id: 'heavy-kick', name: 'Chute forte', category: 'basic', input: { buttons: ['4'] }, startup: 17, activeFrames: 5, recovery: 31, damage: 45, hitstun: 22, blockstun: 11, pushback: { hit: 7, block: 8 }, hitLevel: 'low', hitbox: { forward: 25, yOffset: -38, width: 70, height: 33 } },
    { id: 'air-light-punch', name: 'Soco fraco aéreo', category: 'basic', airborne: true, notation: 'no ar + 1', input: { buttons: ['1'] }, startup: 8, activeFrames: 3, recovery: 17, damage: 20, hitstun: 16, blockstun: 8, pushback: { hit: 4, block: 5 }, hitLevel: 'mid', projectile: { speed: 7, verticalSpeed: 7, life: 100, visual: 'bullet' }, hitbox: { forward: 0, yOffset: -110, width: 28, height: 18 } },
    { id: 'air-heavy-punch', name: 'Soco forte aéreo', category: 'basic', airborne: true, notation: 'no ar + 2', input: { buttons: ['2'] }, startup: 14, activeFrames: 4, recovery: 26, damage: 38, hitstun: 20, blockstun: 10, pushback: { hit: 4, block: 5 }, hitLevel: 'mid', projectile: { speed: 6, verticalSpeed: 6, life: 100, visual: 'bullet' }, hitbox: { forward: 0, yOffset: -110, width: 36, height: 22 } },
    { id: 'air-light-kick', name: 'Chute fraco aéreo', category: 'basic', airborne: true, notation: 'no ar + 3', input: { buttons: ['3'] }, startup: 10, activeFrames: 4, recovery: 20, damage: 24, hitstun: 18, blockstun: 9, pushback: { hit: 4, block: 5 }, hitLevel: 'mid', hitbox: { forward: 25, yOffset: -85, width: 55, height: 38 } },
    { id: 'air-heavy-kick', name: 'Chute forte aéreo', category: 'basic', airborne: true, notation: 'no ar + 4', input: { buttons: ['4'] }, startup: 17, activeFrames: 5, recovery: 31, damage: 45, hitstun: 22, blockstun: 11, pushback: { hit: 4, block: 5 }, hitLevel: 'mid', hitbox: { forward: 25, yOffset: -95, width: 70, height: 38 } },
    { id: 'crouch-punch', name: 'Coronhada', category: 'crouching', crouching: true, notation: 'd+1', input: { buttons: ['1'] }, startup: 7, activeFrames: 3, recovery: 16, damage: 18, hitstun: 14, blockstun: 8, pushback: { hit: 3, block: 3 }, hitLevel: 'mid', hitbox: { forward: 25, yOffset: -80, width: 50, height: 30 } },
    { id: 'anti-air', name: 'Antiaéreo', category: 'crouching', crouching: true, notation: 'd+2', input: { buttons: ['2'] }, startup: 9, activeFrames: 6, recovery: 29, damage: 42, hitstun: 24, blockstun: 11, pushback: { hit: 8, block: 7 }, hitLevel: 'mid', projectile: { speed: 7, verticalSpeed: -7, life: 100, visual: 'bullet' }, hitbox: { forward: 0, yOffset: -95, width: 30, height: 22 } },
    { id: 'crouch-light-kick', name: 'Chute baixo fraco', category: 'crouching', crouching: true, notation: 'd+3', input: { buttons: ['3'] }, startup: 6, activeFrames: 4, recovery: 20, damage: 22, hitstun: 16, blockstun: 9, pushback: { hit: 4, block: 4 }, hitLevel: 'low', hitbox: { forward: 25, yOffset: -35, width: 55, height: 30 } },
    { id: 'crouch-heavy-kick', name: 'Rasteira', category: 'crouching', crouching: true, notation: 'd+4', input: { buttons: ['4'] }, startup: 16, activeFrames: 5, recovery: 32, damage: 40, hitstun: 23, blockstun: 12, pushback: { hit: 7, block: 8 }, hitLevel: 'low', knockdown: true, hitbox: { forward: 25, yOffset: -38, width: 70, height: 33 } },
    { id: 'quick-shot', name: 'Tiro à queima-roupa', category: 'special', notation: 'd,df,f,1', input: { buttons: ['1'], sequence: ['D','DF','F'] }, startup: 14, activeFrames: 1, recovery: 30, damage: 120, hitstun: 24, blockstun: 14, pushback: { hit: 16, block: 8 }, hitLevel: 'high', projectile: { speed: 7, life: 6, visual: 'bullet' }, hitbox: { forward: 0, yOffset: -135, width: 38, height: 45 } },
    { id: 'heavy-shot', name: 'Tiro antiaéreo à queima-roupa', category: 'special', notation: 'd,df,f,2', input: { buttons: ['2'], sequence: ['D','DF','F'] }, startup: 23, activeFrames: 1, recovery: 38, damage: 140, hitstun: 28, blockstun: 16, pushback: { hit: 18, block: 9 }, hitLevel: 'high', projectile: { speed: 6, verticalSpeed: -6, life: 8, visual: 'bullet' }, hitbox: { forward: 0, yOffset: -155, width: 42, height: 65 } },
    { id: 'push-away', name: 'Afastamento', category: 'special', notation: 'd,df,f,4', input: { buttons: ['4'], sequence: ['D','DF','F'] }, startup: 9, activeFrames: 4, recovery: 34, damage: 28, hitstun: 24, blockstun: 12, pushback: { hit: 110, block: 18 }, hitLevel: 'mid', hitbox: { forward: 15, yOffset: -125, width: 65, height: 95 } },
  ],
};
