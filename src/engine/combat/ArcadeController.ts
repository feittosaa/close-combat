import type { CharacterDefinition } from '../data/characters';
import type { MoveDefinition } from '../data/moves';
import type { CharacterState } from '../characters/CharacterState';
import type { FrameInput } from '../../input/types';
import type { ComboRecord } from '../simulation/Simulation';
import type { ProjectileState } from './ProjectileState';
import type { Box } from '../collision/types';
import { createHitbox, createHurtbox } from '../collision/combatGeometry';
import { createProjectileHitbox } from '../collision/projectileGeometry';
import { intersects } from '../collision/intersects';
import { attackDurationFrames } from './frameData';
import { RAGE_BAR, RAGE_MAX, RAGE_SEGMENT } from './rage';
import { ARCADE_STYLES, DEFAULT_STYLE, type ArcadeStyle } from './arcadeStyles';

export type ArcadeDifficulty = 'easy' | 'normal' | 'hard';
export const ARCADE_DIFFICULTIES = [
  { id: 'easy' }, { id: 'normal' }, { id: 'hard' },
] as const satisfies readonly { id: ArcadeDifficulty }[];

/** Combo de autoria manual já traduzido em entradas, relativas ao adversário. */
export interface ArcadeRoute { frames: readonly FrameInput[]; firstMoveId: string; hits: number; damage: number; difficulty: number }
export interface ArcadeOptions {
  routes?: readonly ArcadeRoute[];
  /** Gravidade da simulação, para prever onde um pulo vai estar. */
  gravity?: number;
  /** Semente das escolhas aleatórias; a mesma semente repete a mesma partida. */
  seed?: number;
}

interface Profile {
  /** Quadros de golpe do adversário que passam até a IA reagir (mais um atraso aleatório de até metade disso). */
  reaction: number;
  /** Chance de defender cada ataque ou projétil percebido. */
  guard: number;
  /** Chance de abaixar sob um golpe ou projétil alto que passa por cima, em vez de defender. */
  dodge: number;
  /** Pausa média entre investidas. */
  patience: number;
  /** Golpes extras após um acerto confirmado. */
  followUps: number;
  /** Chance de preferir um especial quando ele alcança o alvo. */
  special: number;
  /** Maior dificuldade de combo de autoria manual que ela executa (-1: nenhum). */
  routeLevel: number;
  /** Decide se vale gastar rage (breaker, ultimate, rush) em vez de usar sempre que possível. */
  rageSense: boolean;
  punish: boolean; antiAir: boolean; throws: boolean; jumpIn: boolean; breaker: boolean; rage: boolean;
}
const PROFILES: Record<ArcadeDifficulty, Profile> = {
  easy: { reaction: 26, guard: .2, dodge: 0, patience: 45, followUps: 0, special: 0, routeLevel: -1, rageSense: false, punish: false, antiAir: false, throws: false, jumpIn: false, breaker: false, rage: false },
  normal: { reaction: 12, guard: .6, dodge: .35, patience: 18, followUps: 2, special: .25, routeLevel: 2, rageSense: false, punish: true, antiAir: true, throws: true, jumpIn: false, breaker: true, rage: true },
  hard: { reaction: 5, guard: .88, dodge: .75, patience: 4, followUps: 5, special: .5, routeLevel: 99, rageSense: true, punish: true, antiAir: true, throws: true, jumpIn: true, breaker: true, rage: true },
};
const SEQUENCE_STEP_FRAMES = 2;
/** Um projétil só é lançado de uma distância mínima; colado, o jogador usa golpes de perto. */
const PROJECTILE_MIN_DISTANCE = 100;
const PROJECTILE_SIGHT = 220;
const STUCK_FRAMES = 40;
const neutral = (): FrameInput => ({ direction: 'N', buttons: new Set() });
const STUNNED = ['hitstun', 'knockdown', 'airborne'];

/**
 * IA determinística que joga somente por entradas legais, com perfil de dificuldade e estilo do personagem.
 * Só enxerga o que um jogador veria na tela (posições, animação do golpe em andamento, projéteis, barra de rage e o
 * combo em curso): nunca os comandos digitados pelo adversário, e sempre reage com atraso.
 */
export class ArcadeController {
  private readonly profile: Profile;
  private readonly style: ArcadeStyle;
  private readonly grounded: readonly MoveDefinition[];
  private readonly specials: readonly MoveDefinition[];
  private readonly throwMoves: readonly MoveDefinition[];
  private readonly airMoves: readonly MoveDefinition[];
  private readonly invulnerable: readonly MoveDefinition[];
  private readonly ultimate?: MoveDefinition;
  private readonly routes: readonly ArcadeRoute[];
  private readonly gravity: number;
  private seed: number;
  private readonly initialSeed: number;
  private queue: FrameInput[] = [];
  private nextDecisionFrame = 0;
  private stance: 'B' | 'DB' = 'B';
  private perceived = new Map<string, 'guard' | 'duck' | 'through' | 'ignore'>();
  private followUpsUsed = 0;
  private followedAttack = -1;
  private breakerTriedAt = -1;
  private blockedAt = -1;
  private route?: { age: number };
  private floor = 0;
  /** Deslocamento horizontal do adversário no último quadro, para prever pulos. */
  private drift = 0;
  private lastOpponentX?: number;
  private lastSelfX = 0;
  private stuckFrames = 0;
  /** Desgaste por golpe: sobe quando ele é bloqueado ou repetido, e decai com o tempo. */
  private fatigue = new Map<string, number>();

  constructor(fighter: CharacterDefinition, private readonly opponent: CharacterDefinition, difficulty: ArcadeDifficulty = 'normal', options: ArcadeOptions = {}) {
    this.profile = PROFILES[difficulty];
    this.style = ARCADE_STYLES[fighter.id] ?? DEFAULT_STYLE;
    this.routes = options.routes ?? [];
    this.gravity = options.gravity ?? .55;
    this.initialSeed = this.seed = options.seed ?? 173;
    const usable = fighter.moves.filter(move => !move.comboOnly && !move.shortcutOnly);
    this.grounded = usable.filter(move => !move.airborne && ['basic', 'crouching', 'power'].includes(move.category ?? 'basic'));
    this.specials = usable.filter(move => move.category === 'special' && !move.airborne);
    this.throwMoves = usable.filter(move => move.category === 'throw' && !move.airborne);
    this.airMoves = usable.filter(move => move.airborne && move.category !== 'special');
    this.invulnerable = this.specials.filter(move => move.projectileInvulnerable);
    this.ultimate = usable.find(move => move.id === fighter.defaultUltimateId) ?? usable.find(move => move.category === 'ultimate');
    this.reset();
  }

  reset(): void {
    this.seed = this.initialSeed; this.queue = []; this.nextDecisionFrame = 0; this.stance = 'B'; this.perceived.clear();
    this.followUpsUsed = 0; this.followedAttack = -1; this.breakerTriedAt = -1; this.blockedAt = -1; this.fatigue.clear();
    this.route = undefined; this.drift = 0; this.lastOpponentX = undefined; this.stuckFrames = 0;
  }

  readInput(frame: number, self: CharacterState, opponent: CharacterState, projectiles: readonly ProjectileState[] = [], combos: readonly ComboRecord[] = []): FrameInput {
    this.observe(self, opponent);
    if (frame % 60 === 0) this.fatigue.forEach((value, id) => this.fatigue.set(id, value * .8));
    const used = self.attack && this.grounded.concat(this.specials).find(move => move.id === self.attack!.moveId);
    if (used && self.attack!.hitOutcome === 'block') this.penalizeBlocked(frame, self, used);
    if (self.mode === 'hitstun' || self.mode === 'knockdown') { this.queue = []; this.route = undefined; return this.breakCombo(frame, self, combos); }
    if (self.mode === 'blockstun') { this.queue = []; this.route = undefined; return { direction: this.stance, buttons: new Set() }; }
    if (this.route && this.routeFailed(self, opponent)) { this.queue = []; this.route = undefined; }
    if (this.queue.length) return this.queue.shift()!;
    this.route = undefined;
    if (self.attack) return this.followUp(frame, self, opponent);
    if (!self.grounded) return this.fightInAir(self, opponent);
    return this.defend(frame, self, opponent, projectiles) ?? this.antiAir(self, opponent) ?? this.useRage(self, opponent)
      ?? this.escape(frame, opponent, self) ?? this.attack(frame, self, opponent) ?? this.approach(frame, self, opponent);
  }

  /** O que se vê de um quadro para o outro: onde o adversário está indo e se está andando para trás sem sair do lugar. */
  private observe(self: CharacterState, opponent: CharacterState): void {
    this.drift = this.lastOpponentX === undefined ? 0 : opponent.x - this.lastOpponentX;
    this.lastOpponentX = opponent.x;
    if (self.grounded) this.floor = self.y;
    this.stuckFrames = Math.abs(self.x - this.lastSelfX) < .01 ? this.stuckFrames + 1 : 0;
    this.lastSelfX = self.x;
  }

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
  private reaction(): number { return this.profile.reaction + Math.floor(this.random() * this.profile.reaction / 2); }
  private rangedReach(move: MoveDefinition): number { return move.projectile ? move.projectile.speed * move.projectile.life : 0; }
  private moveScore(move: MoveDefinition): number { return move.damage / (move.startup + move.recovery * .5) / (1 + (this.fatigue.get(move.id) ?? 0)); }
  private tire(move: MoveDefinition, amount: number): void { this.fatigue.set(move.id, (this.fatigue.get(move.id) ?? 0) + amount); }

  /** Distância que o golpe percorre sozinho até o quadro dado. */
  private travel(move: MoveDefinition, frame: number): number {
    const movement = move.movement;
    return movement ? Math.max(0, Math.min(frame, movement.until) - (movement.from ?? 0)) * movement.speed : 0;
  }
  private hitboxAt(self: CharacterState, move: MoveDefinition, frame: number): Box {
    const box = createHitbox(self, move), travel = this.travel(move, frame);
    return self.facing === 'right' ? { ...box, width: box.width + travel } : { ...box, x: box.x - travel, width: box.width + travel };
  }
  /** Onde o adversário estará daqui a alguns quadros: pulos seguem a gravidade e o deslocamento já observado. */
  private predict(opponent: CharacterState, frames: number): CharacterState {
    if (opponent.grounded) return opponent;
    let y = opponent.y, speed = opponent.verticalVelocity;
    for (let step = 0; step < frames && y < this.floor; step++) { y += speed; speed += this.gravity; }
    const landed = y >= this.floor;
    return { ...opponent, x: opponent.x + this.drift * frames, y: landed ? this.floor : y, grounded: landed };
  }
  /** O golpe acerta o corpo do adversário em algum quadro ativo, considerando o pulo e a altura em que ele está. */
  private canHit(move: MoveDefinition, self: CharacterState, opponent: CharacterState): boolean {
    for (let frame = move.startup; frame < move.startup + move.activeFrames; frame += 2) {
      if (intersects(this.hitboxAt(self, move, frame), createHurtbox(this.predict(opponent, frame)))) return true;
    }
    return false;
  }
  private usable(move: MoveDefinition, self: CharacterState, opponent: CharacterState, distance: number): boolean {
    return move.projectile && move.category !== 'basic' ? distance >= PROJECTILE_MIN_DISTANCE && distance <= this.rangedReach(move) : this.canHit(move, self, opponent);
  }
  private strikeReach(move: MoveDefinition, opponent: CharacterState): number {
    return move.hitbox.forward + move.hitbox.width + this.travel(move, move.movement?.until ?? 0) + opponent.collision.bodyWidth / 2;
  }

  /** Entradas que executam o golpe: sequência de direções, botões e uma soltura. */
  private motion(move: MoveDefinition): FrameInput[] {
    const buttons = new Set(move.input.buttons);
    const sequence = (move.input.sequence ?? []).flatMap(direction => Array.from({ length: SEQUENCE_STEP_FRAMES }, () => ({ direction, buttons: new Set<never>() }) as FrameInput));
    return [...sequence, { direction: move.crouching ? 'D' : (move.input.sequence?.[move.input.sequence.length - 1] ?? 'N'), buttons }, neutral()];
  }
  private begin(plan: FrameInput[]): FrameInput { this.queue = plan; return this.queue.shift()!; }

  /** Quebra o combo quando ele já machuca de verdade, guardando a rage da ultimate quando ela ainda vale mais. */
  private breakCombo(frame: number, self: CharacterState, combos: readonly ComboRecord[]): FrameInput {
    const ready = this.profile.breaker && self.rage >= RAGE_SEGMENT && self.stateStartedFrame !== this.breakerTriedAt && frame - self.stateStartedFrame >= this.reaction();
    if (!ready) return neutral();
    const combo = combos.find(entry => entry.active && entry.targetId === self.characterId);
    const damage = combo?.damage ?? 0, hits = combo?.hits ?? 0;
    if (this.profile.rageSense) {
      const spare = self.rage - RAGE_SEGMENT >= (this.ultimate?.rageCost ?? 0);
      const dying = damage + this.nextHitEstimate() >= self.health || self.health - damage <= self.maxHealth * .25;
      if (!(dying || hits >= (spare ? 3 : 5))) return neutral();
    }
    this.breakerTriedAt = self.stateStartedFrame;
    return this.random() < .75 ? { direction: 'N', rageAction: true, buttons: new Set() } : neutral();
  }
  private nextHitEstimate(): number { return Math.max(...this.opponent.moves.filter(move => move.category === 'basic').map(move => move.damage)); }

  /** Ultimate vale a pena quando mata, quando a rage vai transbordar ou quando a luta está perdida. */
  private ultimateWorth(self: CharacterState, opponent: CharacterState): boolean {
    const ultimate = this.ultimate;
    if (!this.profile.rage || !ultimate || self.rage < (ultimate.rageCost ?? 0)) return false;
    if (!this.profile.rageSense) return true;
    return ultimate.damage >= opponent.health * .9 || self.rage >= RAGE_MAX - RAGE_SEGMENT || self.health <= self.maxHealth * .35;
  }

  private followUp(frame: number, self: CharacterState, opponent: CharacterState): FrameInput {
    const attack = self.attack!;
    const startedAt = frame - attack.elapsedFrames;
    if (attack.hitOutcome !== 'hit' || this.followedAttack === startedAt) return neutral();
    this.followedAttack = startedAt;
    if (this.ultimateWorth(self, opponent)) return { direction: 'N', ultimate: true, buttons: new Set() };
    if (this.followUpsUsed >= this.profile.followUps) return neutral();
    this.followUpsUsed += 1;
    const distance = Math.abs(self.x - opponent.x);
    const specials = this.specials.filter(move => this.usable(move, self, opponent, distance));
    const strikes = this.grounded.filter(move => this.canHit(move, self, opponent));
    const next = specials.length && this.random() < this.profile.special ? this.pick(specials) : strikes.length ? this.pick(strikes) : undefined;
    return next ? this.begin([neutral(), ...this.motion(next)]) : neutral();
  }

  private fightInAir(self: CharacterState, opponent: CharacterState): FrameInput {
    const distance = Math.abs(self.x - opponent.x);
    if (this.style.airDash && !self.airDashUsed && this.profile.jumpIn) {
      const retreat = distance < this.style.range.min, advance = distance > this.style.range.max;
      if (retreat || advance) return { direction: 'N', dash: retreat ? 'B' : 'F', buttons: new Set() };
    }
    const moves = this.profile.jumpIn ? this.airMoves.filter(move => this.usable(move, self, opponent, distance)) : [];
    return moves.length ? { direction: 'N', buttons: new Set(this.pick(moves).input.buttons) } : neutral();
  }

  /** Percebe golpes e projéteis do adversário e decide uma única vez como lidar com cada um: defender, abaixar ou atravessar. */
  private defend(frame: number, self: CharacterState, opponent: CharacterState, projectiles: readonly ProjectileState[]): FrameInput | undefined {
    const distance = Math.abs(self.x - opponent.x);
    const attack = opponent.attack;
    const move = attack && this.opponent.moves.find(entry => entry.id === attack.moveId);
    let action: 'guard' | 'duck' | undefined, low = false;
    if (attack && move && attack.elapsedFrames >= this.profile.reaction && attack.elapsedFrames < move.startup + move.activeFrames
      && (move.screenVolley || distance <= this.strikeReach(move, self) + 30)) {
      const key = `m${frame - attack.elapsedFrames}`;
      if (!this.perceived.has(key)) this.perceived.set(key, this.chooseDefense(self, createHitbox(opponent, move), move));
      const decision = this.perceived.get(key)!;
      if (decision === 'guard' || decision === 'duck') action = decision;
      low = move.hitLevel === 'low';
    }
    for (const projectile of projectiles) {
      if (projectile.ownerId === self.characterId || Math.abs(projectile.x - self.x) > PROJECTILE_SIGHT || (projectile.velocity !== 0 && Math.sign(projectile.velocity) !== Math.sign(self.x - projectile.x))) continue;
      const shot = this.opponent.moves.find(entry => entry.id === projectile.attack.moveId);
      const key = `p${projectile.id}`;
      if (!this.perceived.has(key)) {
        const through = this.throughProjectile(self, opponent, projectile);
        this.perceived.set(key, through ? 'through' : this.chooseDefense(self, shot ? createProjectileHitbox(projectile, shot) : undefined, shot));
        if (through) return this.begin(this.motion(through));
      }
      const decision = this.perceived.get(key)!;
      if (decision === 'guard' || decision === 'duck') { action = action === 'guard' ? 'guard' : decision; low = low || shot?.hitLevel === 'low'; }
    }
    if (!action) return undefined;
    if (action === 'duck') return { direction: 'D', buttons: new Set() };
    this.stance = low ? 'DB' : 'B';
    return { direction: this.stance, buttons: new Set() };
  }

  /** Abaixar só vale quando o golpe passa por cima do corpo agachado; do contrário, defende (ou arrisca o golpe). */
  private chooseDefense(self: CharacterState, hitbox: Box | undefined, move: MoveDefinition | undefined): 'guard' | 'duck' | 'ignore' {
    const guards = this.random() < this.profile.guard;
    if (!guards) return 'ignore';
    if (hitbox && move && move.hitLevel !== 'low' && self.grounded && !move.overhead) {
      const crouched = createHurtbox({ ...self, crouching: true, mode: 'crouching' });
      if (!intersects(hitbox, crouched) && this.random() < this.profile.dodge) return 'duck';
    }
    return 'guard';
  }

  /** Golpe invulnerável a projéteis que o atravessa e ainda alcança o dono dele, usado quando o tiro chega. */
  private throughProjectile(self: CharacterState, opponent: CharacterState, projectile: ProjectileState): MoveDefinition | undefined {
    if (!this.style.throughProjectiles || !this.profile.punish || !this.invulnerable.length) return undefined;
    const distance = Math.abs(self.x - opponent.x), arrival = Math.abs(projectile.x - self.x) / Math.max(.1, Math.abs(projectile.velocity));
    const options = this.invulnerable.filter(move => move.startup <= arrival + 4 && this.strikeReach(move, opponent) >= distance && this.random() < .7);
    return options.length ? options.reduce((a, b) => this.moveScore(b) > this.moveScore(a) ? b : a) : undefined;
  }

  /** Anti-aéreo no momento certo: só quando o golpe encontraria o adversário descendo, e não só porque ele pulou. */
  private antiAir(self: CharacterState, opponent: CharacterState): FrameInput | undefined {
    if (!this.profile.antiAir || opponent.grounded || (opponent.airborneElapsedFrames ?? 0) < this.profile.reaction / 2) return undefined;
    const options = this.grounded.concat(this.specials).filter(move => !move.projectile && !move.movement && this.canHit(move, self, opponent));
    if (!options.length) return undefined;
    const fastest = options.reduce((a, b) => b.startup < a.startup || (b.startup === a.startup && b.damage > a.damage) ? b : a);
    return this.begin(this.motion(fastest));
  }

  private useRage(self: CharacterState, opponent: CharacterState): FrameInput | undefined {
    if (!this.profile.rage || !self.maxRage || self.rush) return undefined;
    const full = self.rage >= self.maxRage;
    const comeback = this.profile.rageSense && self.rage >= RAGE_BAR + (this.ultimate?.rageCost ?? 0) && self.health < opponent.health * .7;
    return full || comeback ? { direction: 'N', taunt: true, rageAction: true, buttons: new Set() } : undefined;
  }

  /** O adversário terminou um golpe e ainda não pode agir: quanto tempo sobra para punir. */
  private punishWindow(opponent: CharacterState): number | undefined {
    const attack = opponent.attack, move = attack && this.opponent.moves.find(entry => entry.id === attack.moveId);
    if (!attack || !move || attack.elapsedFrames < move.startup + move.activeFrames + this.profile.reaction / 2) return undefined;
    return attackDurationFrames(move, attack) - attack.elapsedFrames;
  }

  private attack(frame: number, self: CharacterState, opponent: CharacterState): FrameInput | undefined {
    if (frame < this.nextDecisionFrame) return undefined;
    const distance = Math.abs(self.x - opponent.x);
    const window = this.profile.punish ? this.punishWindow(opponent) : undefined;
    const route = window === undefined ? undefined : this.chooseRoute(self, opponent, window);
    if (route) {
      this.route = { age: 0 };
      this.nextDecisionFrame = frame + route.frames.length + Math.round(this.profile.patience * (.5 + this.random()));
      return this.begin([...route.frames, neutral()]);
    }
    const move = this.chooseMove(self, opponent, distance, window);
    if (!move) return undefined;
    this.nextDecisionFrame = frame + attackDurationFrames(move) + Math.round(this.profile.patience * (.5 + this.random()));
    this.followUpsUsed = 0; this.tire(move, .6);
    return this.begin(this.motion(move));
  }

  /** Combo de autoria manual cujo primeiro golpe acerta agora e cabe na janela de punição. */
  private chooseRoute(self: CharacterState, opponent: CharacterState, window: number): ArcadeRoute | undefined {
    const fits = this.routes.filter(route => route.difficulty <= this.profile.routeLevel).filter(route => {
      const first = this.grounded.concat(this.specials).find(move => move.id === route.firstMoveId);
      return first && first.startup + 2 <= window && this.canHit(first, self, opponent);
    });
    if (!fits.length) return undefined;
    const best = [...fits].sort((a, b) => b.damage - a.damage).slice(0, 3);
    return this.pick(this.profile.rageSense ? best : fits);
  }
  /** O combo parou de funcionar: o primeiro golpe foi defendido ou o adversário saiu do combo. */
  private routeFailed(self: CharacterState, opponent: CharacterState): boolean {
    this.route!.age += 1;
    return self.attack?.hitOutcome === 'block' || opponent.mode === 'blocking' || opponent.mode === 'blockstun'
      || (this.route!.age > 30 && !STUNNED.includes(opponent.mode));
  }

  private chooseMove(self: CharacterState, opponent: CharacterState, distance: number, window: number | undefined): MoveDefinition | undefined {
    const p = this.profile;
    const reachable = (moves: readonly MoveDefinition[]) => moves.filter(move => this.usable(move, self, opponent, distance));
    const best = (moves: readonly MoveDefinition[]) => p.patience > 20 ? this.pick(moves) : moves.reduce((a, b) => this.moveScore(b) * (.7 + this.random() * .6) > this.moveScore(a) ? b : a);
    if (window !== undefined) {
      const punishers = reachable(this.grounded).filter(move => move.startup + 2 <= window);
      if (punishers.length) return best(punishers);
    }
    const grabbing = this.throwMoves.filter(move => this.canHit(move, self, opponent));
    const guarding = opponent.mode === 'blocking' || opponent.mode === 'blockstun';
    if (p.throws && grabbing.length && (guarding || this.random() < .08 + (this.style.grapple ?? 0))) return this.pick(grabbing);
    if (this.style.zoning && distance > this.style.range.min) {
      const shots = this.grounded.concat(this.specials).filter(move => move.projectile && this.usable(move, self, opponent, distance));
      if (shots.length && this.random() < .6) return best(shots);
    }
    if (p.special && this.random() < p.special) {
      const specials = reachable(this.specials);
      if (specials.length) return best(specials);
    }
    const near = reachable(this.grounded);
    if (near.length) return best(near);
    const shots = this.grounded.filter(move => this.rangedReach(move) >= distance && distance >= PROJECTILE_MIN_DISTANCE);
    return p.special && distance > 220 && shots.length && this.random() < .3 ? best(shots) : undefined;
  }

  private approach(frame: number, self: CharacterState, opponent: CharacterState): FrameInput {
    const distance = Math.abs(self.x - opponent.x), range = this.style.range;
    if (this.style.zoning) return this.keepDistance(frame, distance);
    if (this.style.throughProjectiles && this.profile.punish && distance > 170 && this.opponent.moves.some(move => move.projectile) && this.random() < .03) {
      const closers = this.invulnerable.filter(move => this.strikeReach(move, opponent) >= distance);
      if (closers.length) return this.begin(this.motion(this.pick(closers)));
    }
    if (this.profile.jumpIn && distance > 190 && distance < 330 && this.random() < .012) {
      return this.begin([{ direction: 'UF', buttons: new Set() }, { direction: 'F', buttons: new Set() }]);
    }
    const ideal = this.profile.patience > 20 ? 64 : Math.max(range.min, Math.min(range.max, Math.max(...this.grounded.map(move => this.strikeReach(move, opponent))) * .8));
    if (distance > ideal) {
      const fast = this.profile.jumpIn && distance > ideal + 160 && this.random() < .02;
      return fast ? { direction: 'N', dash: 'F', buttons: new Set() } : { direction: 'F', buttons: new Set() };
    }
    return distance < ideal * .45 && this.profile.punish && frame >= this.nextDecisionFrame ? { direction: 'B', buttons: new Set() } : neutral();
  }

  /** Zoner pressionada de perto: em vez de trocar golpes, foge pelo ar (com dash) ou com um dash para trás. */
  private escape(frame: number, opponent: CharacterState, self: CharacterState): FrameInput | undefined {
    if (!this.style.zoning || !this.profile.punish || frame < this.nextDecisionFrame || Math.abs(self.x - opponent.x) > this.style.range.min * .55 || this.random() > .12) return undefined;
    this.nextDecisionFrame = frame + this.profile.patience;
    return this.profile.jumpIn ? this.begin([{ direction: 'UB', buttons: new Set() }, { direction: 'B', buttons: new Set() }]) : { direction: 'N', dash: 'B', buttons: new Set() };
  }

  /** Zoner: segura a distância atirando, afasta-se com dash e, se encurralada, passa por cima pelo ar. */
  private keepDistance(frame: number, distance: number): FrameInput {
    const { min, max } = this.style.range;
    if (distance > max) return { direction: 'F', buttons: new Set() };
    if (distance >= min) return neutral();
    if (this.stuckFrames > STUCK_FRAMES && this.profile.jumpIn) return this.begin([{ direction: 'UF', buttons: new Set() }, { direction: 'F', buttons: new Set() }]);
    if (this.profile.jumpIn && this.random() < .03) return this.begin([{ direction: 'UB', buttons: new Set() }, { direction: 'B', buttons: new Set() }]);
    return frame >= this.nextDecisionFrame && this.random() < .05 ? { direction: 'N', dash: 'B', buttons: new Set() } : { direction: 'B', buttons: new Set() };
  }
}
