import type { ProjectileState } from './ProjectileState';
import type { CharacterState } from '../characters/CharacterState';
import type { MoveDefinition } from '../data/moves';
import type { FrameInput } from '../../input/types';
import type { Hitbox } from '../collision/types';
import { contactHeight, createHitbox, createHurtbox, createHurtZones } from '../collision/combatGeometry';
import { createProjectileHitbox } from '../collision/projectileGeometry';
import { intersects } from '../collision/intersects';
import { RAGE_BUFF_DAMAGE } from './rage';
import { attackDurationFrames, classifyHitContext, frameAdvantage, type HitContext } from './frameData';

export interface HitEvent {
  attackerId: string;
  targetId: string;
  moveId: string;
  damage: number;
  outcome: 'hit' | 'block';
  armored?: boolean;
  perfectBlock?: boolean;
  pushback: number;
  pushbackDirection?: 'left' | 'right';
  attackerRecoveryFrames: number;
  defenderStunFrames: number;
  frameAdvantage: number;
  context?: HitContext;
  volleyStep?: number;
  contactHeight?: 'low' | 'mid' | 'high';
  /** Geometric center of the contact, captured before either fighter moves. */
  contactPoint?: { x: number; y: number };
  /** Target's body at contact, before the resulting reaction changes its posture. */
  contactBody?: { centerY: number; height: number };
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
  resolve(characters: CharacterState[], inputs: readonly FrameInput[], projectiles: readonly ProjectileState[] = [], damageOverride?: (attackerId: string, targetId: string, move: MoveDefinition, volleyStep: number) => number, contact?: (event: HitEvent) => void): HitEvent[] {
    // Capturar todos os contatos antes de aplicar dano mantém trades simétricos.
    const sources = [
      ...characters.map((attacker, index) => {
        const move = attacker.attack && this.resolveMove(attacker.fighterId, attacker.attack.moveId);
        const elapsed = attacker.attack ? attacker.attack.elapsedFrames - (attacker.attack.startupFrames ?? move?.startup ?? 0) : -1;
        const volleyStep = move?.multiHit && elapsed >= 0 && elapsed % move.multiHit.interval === 0 ? elapsed / move.multiHit.interval : undefined;
        return { attacker, index, attack: attacker.attack, projectile: false, volleyStep };
      }),
      ...projectiles.map(p => {
        const index = characters.findIndex(c => c.characterId === p.ownerId);
        return { attacker: { ...characters[index], x: p.x, y: p.y, facing: p.facing }, index, attack: p.attack, projectile: true, volleyStep: p.volleyStep };
      }),
    ];
    const pending = sources.flatMap(({ attacker, index, attack, projectile, volleyStep }) => {
      const move = attack ? this.resolveMove(attacker.fighterId, attack.moveId) : undefined;
      const target = characters[1 - index];
      if (!attack || !move || (attack.hasHit && !move.multiHit) || (!projectile && (attacker.mode !== 'active' || move.projectile))) return [];
      if (move.multiHit && (volleyStep === undefined || volleyStep >= move.multiHit.hits)) return [];
      if (target.mode === 'knockdown' || (target.wakeupInvulnerabilityFrames ?? 0) > 0) return [];
      const defenseMove = target.attack ? this.resolveMove(target.fighterId, target.attack.moveId) : undefined;
      const armored = defenseMove?.category === 'ultimate';
      if (projectile && !armored && defenseMove?.projectileInvulnerable) return [];
      const defense = armored ? undefined : defenseMove?.invulnerability;
      if (defense && target.attack!.elapsedFrames < defense.until && (defense.kind === 'all' || projectile)) return [];
      if (move.category === 'throw' && (!target.grounded || !attacker.grounded || target.mode === 'hitstun' || target.mode === 'blockstun')) return [];
      const hitLevel = volleyStep === 0 ? move.screenVolley?.firstHitLevel ?? move.hitLevel : move.hitLevel;
      if (hitLevel === 'high' && target.crouching) return [];
      const box = projectile ? createProjectileHitbox({ownerId:attacker.characterId,x:attacker.x,y:attacker.y,facing:attacker.facing},move) : createHitbox(attacker,move);
      const zonedTarget = target.fighterId === 'cowboy' || target.fighterId === 'shoto';
      const hurtboxes = zonedTarget && move.category !== 'throw'
        ? Object.values(createHurtZones(target)) : [createHurtbox(target)];
      const contacted = hurtboxes.find(hurtbox => intersects(box, hurtbox));
      if (!contacted) return [];
      const targetBody = createHurtbox(target);
      const guard = inputs[1 - index]?.direction;
      const blocked = move.category !== 'throw' && ['blocking', 'blockstun'].includes(target.mode) &&
        (hitLevel === 'low' ? target.grounded && guard === 'DB' :
          move.overhead ? guard === 'B' : guard === 'B' || guard === 'DB');
      const owner = characters[index];
      const ownerMove = owner.attack ? this.resolveMove(owner.fighterId, owner.attack.moveId) : undefined;
      // Allow a manual response after guard stun: 0.4s for light inputs and 0.6s for heavy inputs.
      // Detached projectiles do not interrupt an owner who has already recovered or started another move.
      if (blocked && owner.attack === attack && !projectile) {
        const window = move.input.buttons.some(button => button === '2' || button === '4') ? 36 : 24;
        const minimumRecovery = attack.elapsedFrames + move.blockstun + window + 1 - move.startup - move.activeFrames;
        attack.recoveryFrames = Math.max(attack.recoveryFrames ?? move.recovery, minimumRecovery);
      }
      const recovery = projectile ? (ownerMove && owner.attack ? Math.max(0, attackDurationFrames(ownerMove, owner.attack) - owner.attack.elapsedFrames - 1) : 0) : attackDurationFrames(move, attack) - attack.elapsedFrames - 1;
      const stun = blocked ? move.blockstun : move.hitstun;
      const pushbackDirection = move.category === 'throw' && attack.throwDirection === 'backward' && !(attacker.fighterId === 'cowboy' && move.id === 'throw-24')
        ? (attacker.facing === 'right' ? 'left' : 'right') : attacker.facing;
      const chargeSteps = move.charge ? Math.min(move.charge.maxSteps, Math.floor((attack.chargeFrames ?? 0) / move.charge.framesPerStep)) : 0;
      const baseDamage = !blocked && volleyStep !== undefined && damageOverride
        ? damageOverride(attacker.characterId, target.characterId, move, volleyStep)
        : move.damage * (1 + chargeSteps * (move.charge?.damagePerStep ?? 0));
      const buff = (attacker.rush ? RAGE_BUFF_DAMAGE : 1) * (attack.empowered && (move.category === 'special' || move.category === 'throw') ? RAGE_BUFF_DAMAGE : 1);
      const damage = Math.round(baseDamage * buff);
      const event: HitEvent = { attackerId: attacker.characterId, targetId: target.characterId, moveId: move.id,
        ...(volleyStep !== undefined ? { volleyStep } : {}),
        // The event describes the move that connected. Training keeps reporting that
        // value after a depleted target is hit; only the health bar is capped at zero.
        damage: blocked ? 0 : armored ? Math.round(damage / 2) : damage, outcome: blocked ? 'block' : 'hit',
        ...(armored && !blocked ? { armored: true } : {}),
        pushback: armored ? 0 : blocked ? move.pushback.block : move.multiHit && volleyStep !== move.multiHit.hits - 1 ? 0 : move.pushback.hit, pushbackDirection, attackerRecoveryFrames: recovery,
        defenderStunFrames: armored ? 0 : stun, frameAdvantage: frameAdvantage(recovery, armored ? 0 : stun),
        context: blocked ? undefined : classifyHitContext(target),
        contactPoint: {
          x: (Math.max(box.x, contacted.x) + Math.min(box.x + box.width, contacted.x + contacted.width)) / 2,
          y: (Math.max(box.y, contacted.y) + Math.min(box.y + box.height, contacted.y + contacted.height)) / 2,
        },
        contactBody: { centerY: targetBody.y + targetBody.height / 2, height: targetBody.height },
        ...(zonedTarget && move.category !== 'throw' ? { contactHeight: contactHeight(target, box) } : {}) };
      return [{ attack, target, event }];
    });
    const resolved: HitEvent[] = [];
    for (const { attack, target, event } of pending) {
      contact?.(event);
      resolved.push(event);
      attack.hasHit = true; attack.hitOutcome = event.outcome;
      target.health = Math.max(0, target.health - event.damage);
      if (event.armored) { target.hitFlashFrames = 5; continue; }
      target.mode = event.outcome === 'block' ? 'blockstun' : 'hitstun';
      target.remainingStateFrames = event.defenderStunFrames;
      target.attack = undefined;
      target.hitFlashFrames = event.outcome === 'hit' ? 5 : 0;
    }
    return resolved;
  }
}
