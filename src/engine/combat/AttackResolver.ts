import type { ProjectileState } from './ProjectileState';
import type { CharacterState } from '../characters/CharacterState';
import type { MoveDefinition } from '../data/moves';
import type { FrameInput } from '../../input/types';
import type { Hitbox } from '../collision/types';
import { createHitbox, createHurtbox } from '../collision/combatGeometry';
import { createProjectileHitbox } from '../collision/projectileGeometry';
import { intersects } from '../collision/intersects';
import { classifyHitContext, frameAdvantage, type HitContext } from './frameData';

export interface HitEvent {
  attackerId: string;
  targetId: string;
  moveId: string;
  damage: number;
  outcome: 'hit' | 'block';
  pushback: number;
  pushbackDirection?: 'left' | 'right';
  attackerRecoveryFrames: number;
  defenderStunFrames: number;
  frameAdvantage: number;
  context?: HitContext;
  stage?: 'confirm' | 'explosion';
}
export class AttackResolver {
  constructor(private readonly resolveMove: (fighterId: string, moveId: string) => MoveDefinition | undefined) {}
  activeHitboxes(characters: readonly CharacterState[], projectiles: readonly ProjectileState[] = []): Hitbox[] {
    return characters.flatMap(character => {
      const move = character.attack ? this.resolveMove(character.fighterId, character.attack.moveId) : undefined;
      return move && !move.projectile && character.mode === 'active' ? [createHitbox(character, move)] : [];
    }).concat(projectiles.flatMap(projectile => {
      const owner = characters.find(c => c.characterId === projectile.ownerId);
      const move = this.resolveMove(projectile.fighterId, projectile.attack.moveId);
      return owner && move ? [createProjectileHitbox(projectile, move)] : [];
    }));
  }
  resolve(characters: CharacterState[], inputs: readonly FrameInput[], projectiles: readonly ProjectileState[] = []): HitEvent[] {
    // Capturar todos os contatos antes de aplicar dano mantém trades simétricos.
    const sources = [
      ...characters.map((attacker, index) => ({ attacker, index, attack: attacker.attack, projectile: false, phase: undefined as ProjectileState['phase'], targetId: undefined as string | undefined })),
      ...projectiles.map(p => {
        const index = characters.findIndex(c => c.characterId === p.ownerId);
        return { attacker: { ...characters[index], x: p.x, y: p.y, facing: p.facing }, index, attack: p.attack, projectile: true, phase: p.phase, targetId: p.targetId };
      }),
    ];
    const pending = sources.flatMap(({ attacker, index, attack, projectile, phase, targetId }) => {
      const move = attack ? this.resolveMove(attacker.fighterId, attack.moveId) : undefined;
      const target = characters[1 - index];
      if (!attack || attack.hasHit || !move || (!projectile && (attacker.mode !== 'active' || move.projectile))) return [];
      if (targetId && target.characterId !== targetId) return [];
      if (target.mode === 'knockdown' || (target.wakeupInvulnerabilityFrames ?? 0) > 0) return [];
      const defense = target.attack ? this.resolveMove(target.fighterId, target.attack.moveId)?.invulnerability : undefined;
      if (defense && target.attack!.elapsedFrames < defense.until && (defense.kind === 'all' || projectile)) return [];
      if (move.category === 'throw' && (!target.grounded || !attacker.grounded || target.mode === 'hitstun' || target.mode === 'blockstun')) return [];
      if (move.hitLevel === 'high' && target.crouching) return [];
      const box = projectile ? createProjectileHitbox({ownerId:attacker.characterId,x:attacker.x,y:attacker.y,facing:attacker.facing,phase},move) : createHitbox(attacker,move);
      if (!intersects(box, createHurtbox(target))) return [];
      const guard = inputs[1 - index]?.direction;
      const blocked = move.category !== 'throw' && ['blocking', 'blockstun'].includes(target.mode) &&
        (move.hitLevel === 'low' ? target.grounded && guard === 'DB' : guard === 'B' || guard === 'DB');
      const owner = characters[index];
      const ownerMove = owner.attack ? this.resolveMove(owner.fighterId, owner.attack.moveId) : undefined;
      const recovery = projectile ? (ownerMove && owner.attack ? Math.max(0, ownerMove.startup + ownerMove.activeFrames + ownerMove.recovery - owner.attack.elapsedFrames - 1) : 0) : move.startup + move.activeFrames + move.recovery - attack.elapsedFrames - 1;
      const stun = blocked ? move.blockstun : phase === 'confirm' ? move.ultimateSequence!.confirmStun : move.hitstun;
      const event: HitEvent = { attackerId: attacker.characterId, targetId: target.characterId, moveId: move.id,
        stage: phase === 'confirm' ? 'confirm' : phase === 'lighter' ? 'explosion' : undefined,
        damage: blocked || phase === 'confirm' ? 0 : Math.min(target.health, move.damage), outcome: blocked ? 'block' : 'hit',
        pushback: phase === 'confirm' ? 0 : blocked ? move.pushback.block : move.pushback.hit, pushbackDirection: attacker.facing, attackerRecoveryFrames: recovery,
        defenderStunFrames: stun, frameAdvantage: frameAdvantage(recovery, stun),
        context: blocked ? undefined : classifyHitContext(target) };
      return [{ attack, target, event }];
    });
    for (const { attack, target, event } of pending) {
      attack.hasHit = true; attack.hitOutcome = event.outcome;
      event.damage = Math.min(target.health, event.damage);
      target.health = Math.max(0, target.health - event.damage);
      target.mode = event.outcome === 'block' ? 'blockstun' : 'hitstun';
      target.remainingStateFrames = event.defenderStunFrames;
      target.attack = undefined;
      target.hitFlashFrames = event.outcome === 'hit' ? 5 : 0;
    }
    return pending.map(({ event }) => event);
  }
}
