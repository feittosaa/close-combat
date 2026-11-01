import type { CharacterState } from '../characters/CharacterState';
import type { MoveDefinition } from '../data/moves';
import type { Hitbox, Hurtbox } from './types';

/** Geometria única para resolvedor e inspeção; nunca inferida dos desenhos. */
export function createHitbox(character: CharacterState, move: MoveDefinition): Hitbox {
  const chargeDuration = (move.charge?.framesPerStep ?? 0) * (move.charge?.maxSteps ?? 0);
  const chargeProgress = character.attack?.moveId === move.id && chargeDuration > 1
    ? Math.max(0, Math.min(1, ((character.attack.chargeFrames ?? 1) - 1) / (chargeDuration - 1))) : 0;
  const width = move.hitbox.width * (1 + (move.charge?.maxRangeBonus ?? 0) * chargeProgress);
  return { ownerId: character.characterId, attackId: move.id,
    x: character.facing === 'right' ? character.x + move.hitbox.forward : character.x - move.hitbox.forward - width,
    y: character.y + move.hitbox.yOffset, width, height: move.hitbox.height };
}
export function createHurtbox(character: CharacterState): Hurtbox {
  let box = character.collision.hurtboxes[character.mode === 'knockdown' && character.grounded && !character.throwPull ? 'knockdown' : !character.grounded ? 'airborne' : character.crouching ? 'crouching' : 'standing'];
  const jump = character.collision.jumpHurtboxes;
  if (jump && !character.grounded && character.mode === 'airborne') {
    const elapsed = character.airborneElapsedFrames ?? 0;
    box = elapsed >= jump.compactFromFrame && elapsed < jump.compactUntilFrame ? jump.compact : jump.extended;
  }
  return { ownerId: character.characterId,
    x: character.x + box.offsetX * (character.facing === 'right' ? 1 : -1) - box.width / 2,
    y: character.y + box.offsetY, width: box.width, height: box.height };
}

/** Anatomical contact zones partition the existing box without changing guard rules. */
export function createHurtZones(character: CharacterState) {
  const box = createHurtbox(character);
  const highHeight = box.height * 0.23;
  const lowStart = box.height * 0.55;
  return {
    high: { ...box, height: highHeight },
    mid: { ...box, y: box.y + highHeight, height: lowStart - highHeight },
    low: { ...box, x: box.x - box.width * 0.125, y: box.y + lowStart, width: box.width * 1.25, height: box.height - lowStart },
  };
}

export function contactHeight(character: CharacterState, attack: Hitbox): 'high' | 'mid' | 'low' {
  const box = createHurtbox(character);
  const center = (Math.max(box.y, attack.y) + Math.min(box.y + box.height, attack.y + attack.height)) / 2;
  const relative = (center - box.y) / box.height;
  return relative < 0.23 ? 'high' : relative < 0.55 ? 'mid' : 'low';
}
