import type { CharacterDefinition } from '../data/characters';
import type { MoveDefinition } from '../data/moves';
import type { CharacterState } from '../characters/CharacterState';
import type { FrameInput } from '../../input/types';
import type { ProjectileState } from './ProjectileState';
import { attackDurationFrames } from './frameData';
import { RAGE_SEGMENT } from './rage';

export type ArcadeDifficulty = 'easy' | 'normal' | 'hard';
export const ARCADE_DIFFICULTIES = [
  { id: 'easy' }, { id: 'normal' }, { id: 'hard' },
] as const satisfies readonly { id: ArcadeDifficulty }[];

interface Profile {
  /** Quadros de golpe do adversário que passam até a IA reagir. */
  reaction: number;
  /** Chance de defender cada ataque ou projétil percebido. */
  guard: number;
  /** Pausa média entre investidas. */
  patience: number;
  /** Golpes extras após um acerto confirmado. */
  followUps: number;
  /** Chance de preferir um especial quando ele alcança o alvo. */
  special: number;
  punish: boolean; antiAir: boolean; throws: boolean; jumpIn: boolean; breaker: boolean; rage: boolean;
}
const PROFILES: Record<ArcadeDifficulty, Profile> = {
  easy: { reaction: 26, guard: .2, patience: 45, followUps: 0, special: 0, punish: false, antiAir: false, throws: false, jumpIn: false, breaker: false, rage: false },
  normal: { reaction: 12, guard: .6, patience: 18, followUps: 2, special: .25, punish: true, antiAir: true, throws: true, jumpIn: false, breaker: true, rage: true },
  hard: { reaction: 5, guard: .88, patience: 4, followUps: 5, special: .5, punish: true, antiAir: true, throws: true, jumpIn: true, breaker: true, rage: true },
};
const SEQUENCE_STEP_FRAMES = 2;
const THROW_RANGE = 76;
const neutral = (): FrameInput => ({ direction: 'N', buttons: new Set() });

/** IA determinística que joga somente por entradas legais, com perfil de dificuldade. */
export class ArcadeController {
  private readonly profile: Profile;
  private readonly grounded: readonly MoveDefinition[];
  private readonly specials: readonly MoveDefinition[];
  private readonly throwMoves: readonly MoveDefinition[];
  private readonly airMoves: readonly MoveDefinition[];
  private readonly ultimate?: MoveDefinition;
  private seed = 173;
  private queue: FrameInput[] = [];
  private nextDecisionFrame = 0;
  private stance: 'B' | 'DB' = 'B';
  private perceived = new Map<string, boolean>();
  private followUpsUsed = 0;
  private followedAttack = -1;
  private breakerTriedAt = -1;
  /** Desgaste por golpe: sobe quando ele é bloqueado ou repetido, e decai com o tempo. */
  private fatigue = new Map<string, number>();

  constructor(fighter: CharacterDefinition, private readonly opponent: CharacterDefinition, difficulty: ArcadeDifficulty = 'normal') {
    this.profile = PROFILES[difficulty];
    const usable = fighter.moves.filter(move => !move.comboOnly && !move.shortcutOnly);
    this.grounded = usable.filter(move => !move.airborne && ['basic', 'crouching', 'power'].includes(move.category ?? 'basic'));
    this.specials = usable.filter(move => move.category === 'special' && !move.airborne);
    this.throwMoves = usable.filter(move => move.category === 'throw');
    this.airMoves = usable.filter(move => move.airborne && move.category !== 'special');
    this.ultimate = usable.find(move => move.id === fighter.defaultUltimateId) ?? usable.find(move => move.category === 'ultimate');
    this.reset();
  }

  reset(): void {
    this.seed = 173; this.queue = []; this.nextDecisionFrame = 0; this.stance = 'B'; this.perceived.clear();
    this.followUpsUsed = 0; this.followedAttack = -1; this.breakerTriedAt = -1; this.blockedAt = -1; this.fatigue.clear();
  }

  readInput(frame: number, self: CharacterState, opponent: CharacterState, projectiles: readonly ProjectileState[] = []): FrameInput {
    if (frame % 60 === 0) this.fatigue.forEach((value, id) => this.fatigue.set(id, value * .8));
    const used = self.attack && this.grounded.concat(this.specials).find(move => move.id === self.attack!.moveId);
    if (used && self.attack!.hitOutcome === 'block') this.penalizeBlocked(frame, self, used);
    if (self.mode === 'hitstun' || self.mode === 'knockdown') { this.queue = []; return this.breakCombo(frame, self); }
    if (self.mode === 'blockstun') return { direction: this.stance, buttons: new Set() };
    if (this.queue.length) return this.queue.shift()!;
    if (self.attack) return this.followUp(frame, self, opponent);
    if (!self.grounded) return this.fightInAir(self, opponent);
    return this.defend(frame, self, opponent, projectiles) ?? this.useRage(self) ?? this.attack(frame, self, opponent) ?? this.approach(frame, self, opponent);
  }

  private blockedAt = -1;
  private penalizeBlocked(frame: number, self: CharacterState, move: MoveDefinition): void {
    const startedAt = frame - self.attack!.elapsedFrames;
    if (this.blockedAt === startedAt) return;
    this.blockedAt = startedAt; this.tire(move, 1.5);
  }

  private random(): number {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 2 ** 32;
  }
  private pick<T>(items: readonly T[]): T { return items[Math.floor(this.random() * items.length)]; }
  private reach(move: MoveDefinition, opponent: CharacterState): number {
    return move.hitbox.forward + move.hitbox.width + opponent.collision.bodyWidth / 2;
  }
  private rangedReach(move: MoveDefinition): number { return move.projectile ? move.projectile.speed * move.projectile.life : 0; }
  private moveScore(move: MoveDefinition): number { return move.damage / (move.startup + move.recovery * .5) / (1 + (this.fatigue.get(move.id) ?? 0)); }
  private tire(move: MoveDefinition, amount: number): void { this.fatigue.set(move.id, (this.fatigue.get(move.id) ?? 0) + amount); }

  /** Entradas que executam o golpe: sequência de direções, botões e uma soltura. */
  private motion(move: MoveDefinition): FrameInput[] {
    const buttons = new Set(move.input.buttons);
    const sequence = (move.input.sequence ?? []).flatMap(direction => Array.from({ length: SEQUENCE_STEP_FRAMES }, () => ({ direction, buttons: new Set<never>() }) as FrameInput));
    return [...sequence, { direction: move.crouching ? 'D' : (move.input.sequence?.[move.input.sequence.length - 1] ?? 'N'), buttons }, neutral()];
  }
  private begin(plan: FrameInput[]): FrameInput { this.queue = plan; return this.queue.shift()!; }

  private breakCombo(frame: number, self: CharacterState): FrameInput {
    const ready = this.profile.breaker && self.rage >= RAGE_SEGMENT && self.stateStartedFrame !== this.breakerTriedAt && frame - self.stateStartedFrame >= this.profile.reaction;
    if (!ready) return neutral();
    this.breakerTriedAt = self.stateStartedFrame;
    return this.random() < .6 ? { direction: 'N', rageAction: true, buttons: new Set(this.grounded[0].input.buttons.slice(0, 1)) } : neutral();
  }

  private followUp(frame: number, self: CharacterState, opponent: CharacterState): FrameInput {
    const attack = self.attack!;
    const startedAt = frame - attack.elapsedFrames;
    if (attack.hitOutcome !== 'hit' || this.followedAttack === startedAt) return neutral();
    this.followedAttack = startedAt;
    if (this.profile.rage && this.ultimate && self.rage >= (this.ultimate.rageCost ?? 0)) return { direction: 'N', ultimate: true, buttons: new Set() };
    if (this.followUpsUsed >= this.profile.followUps) return neutral();
    this.followUpsUsed += 1;
    const distance = Math.abs(self.x - opponent.x);
    const specials = this.specials.filter(move => distance <= Math.max(this.reach(move, opponent), this.rangedReach(move)));
    const strikes = this.grounded.filter(move => distance <= this.reach(move, opponent));
    const next = specials.length && this.random() < this.profile.special ? this.pick(specials) : strikes.length ? this.pick(strikes) : undefined;
    return next ? this.begin([neutral(), ...this.motion(next)]) : neutral();
  }

  private fightInAir(self: CharacterState, opponent: CharacterState): FrameInput {
    const distance = Math.abs(self.x - opponent.x);
    const moves = this.profile.jumpIn ? this.airMoves.filter(move => distance <= this.reach(move, opponent)) : [];
    return moves.length ? { direction: 'N', buttons: new Set(this.pick(moves).input.buttons) } : neutral();
  }

  /** Percebe golpes e projéteis do adversário e decide uma única vez se vai defendê-los. */
  private defend(frame: number, self: CharacterState, opponent: CharacterState, projectiles: readonly ProjectileState[]): FrameInput | undefined {
    const distance = Math.abs(self.x - opponent.x);
    const attack = opponent.attack;
    const move = attack && this.opponent.moves.find(entry => entry.id === attack.moveId);
    let low = false, threatened = false;
    if (attack && move && attack.elapsedFrames >= this.profile.reaction && attack.elapsedFrames < move.startup + move.activeFrames
      && (move.screenVolley || distance <= this.reach(move, self) + 30)) {
      const key = `m${frame - attack.elapsedFrames}`;
      if (!this.perceived.has(key)) this.perceived.set(key, this.random() < this.profile.guard);
      threatened = this.perceived.get(key)!; low = move.hitLevel === 'low';
    }
    for (const projectile of projectiles) {
      if (projectile.ownerId === self.characterId || Math.abs(projectile.x - self.x) > 150) continue;
      const key = `p${projectile.id}`;
      if (!this.perceived.has(key)) this.perceived.set(key, this.random() < this.profile.guard);
      if (this.perceived.get(key)) { threatened = true; low = projectile.attack.moveId.includes('crouch'); }
    }
    if (!threatened) return undefined;
    this.stance = low ? 'DB' : 'B';
    return { direction: this.stance, buttons: new Set() };
  }

  private useRage(self: CharacterState): FrameInput | undefined {
    if (!this.profile.rage || !self.maxRage || self.rush || self.rage < self.maxRage) return undefined;
    return { direction: 'N', taunt: true, rageAction: true, buttons: new Set() };
  }

  private attack(frame: number, self: CharacterState, opponent: CharacterState): FrameInput | undefined {
    if (frame < this.nextDecisionFrame) return undefined;
    const distance = Math.abs(self.x - opponent.x);
    const move = this.chooseMove(opponent, distance);
    if (!move) return undefined;
    this.nextDecisionFrame = frame + attackDurationFrames(move) + Math.round(this.profile.patience * (.5 + this.random()));
    this.followUpsUsed = 0; this.tire(move, .6);
    return this.begin(this.motion(move));
  }

  private chooseMove(opponent: CharacterState, distance: number): MoveDefinition | undefined {
    const p = this.profile;
    const reachable = (moves: readonly MoveDefinition[]) => moves.filter(move => distance <= this.reach(move, opponent));
    const best = (moves: readonly MoveDefinition[]) => p.patience > 20 ? this.pick(moves) : moves.reduce((a, b) => this.moveScore(b) * (.7 + this.random() * .6) > this.moveScore(a) ? b : a);
    const opposing = opponent.attack && this.opponent.moves.find(move => move.id === opponent.attack!.moveId);
    if (opposing) {
      const left = attackDurationFrames(opposing, opponent.attack) - opponent.attack!.elapsedFrames;
      const recovering = opponent.attack!.elapsedFrames >= opposing.startup + opposing.activeFrames;
      const punishers = reachable(this.grounded).filter(move => move.startup + 2 <= left);
      if (p.punish && recovering && punishers.length) return best(punishers);
    }
    if (p.antiAir && !opponent.grounded && distance <= 190) {
      const anti = reachable(this.grounded.filter(move => move.crouching)).sort((a, b) => (b.hitbox.height - b.hitbox.yOffset) - (a.hitbox.height - a.hitbox.yOffset));
      if (anti.length) return anti[0];
    }
    if (p.throws && distance <= THROW_RANGE && this.throwMoves.length && (opponent.mode === 'blocking' || opponent.mode === 'blockstun' || this.random() < .08)) return this.pick(this.throwMoves);
    if (p.special && this.random() < p.special) {
      const specials = this.specials.filter(move => distance <= Math.max(this.reach(move, opponent), this.rangedReach(move)));
      if (specials.length) return best(specials);
    }
    const near = reachable(this.grounded);
    if (near.length) return best(near);
    const shots = this.grounded.filter(move => this.rangedReach(move) >= distance);
    return p.special && distance > 220 && shots.length && this.random() < .3 ? best(shots) : undefined;
  }

  private approach(frame: number, self: CharacterState, opponent: CharacterState): FrameInput {
    const distance = Math.abs(self.x - opponent.x);
    if (this.profile.jumpIn && distance > 190 && distance < 330 && this.random() < .012) {
      return this.begin([{ direction: 'UF', buttons: new Set() }, { direction: 'F', buttons: new Set() }]);
    }
    const ideal = this.profile.patience > 20 ? 64 : Math.max(...this.grounded.map(move => this.reach(move, opponent))) * .8;
    if (distance > ideal) return { direction: 'F', buttons: new Set() };
    return distance < ideal * .45 && this.profile.punish && frame >= this.nextDecisionFrame ? { direction: 'B', buttons: new Set() } : neutral();
  }
}
