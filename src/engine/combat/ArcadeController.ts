import type { CharacterDefinition } from '../data/characters';
import type { CharacterState } from '../characters/CharacterState';
import type { MoveDefinition } from '../data/moves';
import type { ProjectileState } from './Projectile';
import type { Direction, FrameInput } from '../../input/types';

const neutral = (): FrameInput => ({ direction: 'N', buttons: new Set() });
const direction = (value: Direction): FrameInput => ({ direction: value, buttons: new Set() });

/** Adversário do arcade: gera entradas comuns, sem forçar golpes, acertos ou teleporte. */
export class ArcadeController {
  private plan: FrameInput[] = [];
  private threatSince?: number;
  private nextDecisionFrame = 0;
  private seed = 1;

  constructor(private readonly fighter: CharacterDefinition, private readonly opponent: CharacterDefinition) { this.reset(); }

  reset(): void {
    this.plan = [];
    this.threatSince = undefined;
    this.nextDecisionFrame = 0;
    this.seed = [...this.fighter.id].reduce((seed, char) => (seed * 31 + char.charCodeAt(0)) >>> 0, 173);
  }

  readInput(frame: number, self: CharacterState, opponent: CharacterState, projectiles: readonly ProjectileState[]): FrameInput {
    const distance = Math.abs(self.x - opponent.x);
    const incoming = projectiles.find((p) => p.ownerId !== self.characterId && Math.abs(p.x - self.x) < 300 &&
      (p.definition.speed === 0 || (p.facing === 'right' ? p.x <= self.x : p.x >= self.x)));
    const enemyMove = opponent.attack ? this.opponent.moves.find((move) => move.id === opponent.attack?.moveId) : undefined;
    const threat = incoming || (distance < 210 ? enemyMove : undefined);
    if (threat && this.threatSince === undefined) this.threatSince = frame;
    if (!threat) this.threatSince = undefined;
    if (self.attack) { this.plan = []; return neutral(); }
    if (self.grounded && this.threatSince !== undefined && frame - this.threatSince >= 10 &&
      !['hitstun', 'grabbed', 'throwRecovery'].includes(self.mode)) {
      const move = incoming ? this.opponent.moves.find((m) => m.id === incoming.moveId) : enemyMove;
      this.plan = [];
      return direction(move?.hitLevel === 'low' ? 'DB' : 'B');
    }
    if (['hitstun', 'blockstun', 'grabbed', 'throwRecovery'].includes(self.mode)) {
      this.plan = [];
      return neutral();
    }
    const planned = this.plan.shift();
    if (planned) return planned;
    if (!self.grounded) {
      const aerial = this.fighter.moves.filter((move) => move.airborne);
      if (frame >= this.nextDecisionFrame && distance < 160 && aerial.length) return this.execute(aerial[this.random() % aerial.length], frame);
      return neutral();
    }
    const ranged = this.fighter.moves.filter((move) => move.projectile && !move.airborne && move.projectile.speed > 0);
    if (frame >= this.nextDecisionFrame && distance > 170 && ranged.length && this.random() % 4 === 0) {
      return this.execute(ranged[this.random() % ranged.length], frame);
    }
    const candidates = this.fighter.moves.filter((move) => !move.airborne &&
      (move.throw ? distance <= move.throw.range && !opponent.crouching :
        distance <= move.hitbox.forward + move.hitbox.width + opponent.collision.bodyWidth / 2 + (move.travelSpeed ? 40 : 0)));
    if (frame >= this.nextDecisionFrame && candidates.length) {
      return this.execute(candidates[this.random() % candidates.length], frame);
    }
    if (distance > 80) return direction('F');
    return neutral();
  }

  private execute(move: MoveDefinition, frame: number): FrameInput {
    const sequence = move.input.sequence ?? [move.input.direction ?? (move.crouching ? 'D' : 'N')];
    this.plan = sequence.flatMap((value, index) => {
      const buttons = index === sequence.length - 1 ? move.input.buttons : [];
      return Array.from({ length: 2 }, () => ({ direction: value, buttons: new Set(buttons) }));
    });
    this.plan.push(...Array.from({ length: 5 }, neutral));
    this.nextDecisionFrame = frame + move.startup + move.activeFrames + move.recovery + 10;
    return this.plan.shift() ?? neutral();
  }

  private random(): number {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed;
  }
}
