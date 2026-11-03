import type { CharacterState, CharacterAnimationState, CharacterAttack } from '../characters/CharacterState';
import { AttackResolver, type HitEvent } from '../combat/AttackResolver';
import { defaultCharacter, type CharacterDefinition } from '../data/characters';
import type { GameConfig } from '../data/gameConfig';
import { FIGHT_SIDE_MARGIN, FIGHT_WORLD_SCALE } from '../data/fightFraming';
import type { MoveDefinition } from '../data/moves';
import { CommandParser } from '../../input/CommandBuffer';
import type { AttackButton, FrameInput } from '../../input/types';
import type { Hitbox } from '../collision/types';
import { FixedStepClock } from './FixedStepClock';
import type { ProjectileState } from '../combat/ProjectileState';
import { ULTIMATE_ACTIVATION_FRAMES, type UltimateActivation, type PendingUltimateLighter, type ExplosionState } from '../combat/ultimateActivation';
import { createProjectileHitbox } from '../collision/projectileGeometry';
import { flightFramesRemaining } from '../combat/airPhysics';
import { attackDurationFrames } from '../combat/frameData';
import { CONTACT_HITSTOP_FRAMES } from '../combat/hitstop';
import { COWBOY_GRAB_LAUNCH, COWBOY_GRAB_SHOTS } from '../combat/cowboyGrab';

export interface CombatLogEntry { frame: number; event: HitEvent }
export interface ComboRecord { attackerId: string; targetId: string; hits: number; damage: number; active: boolean; lastFrame: number; usedLightPunch?: boolean; usedStandingLightKick?: boolean }
export interface SimulationSnapshot {
  /** frame is combat/animation time; elapsedFrames counts every fixed tick, including hitstop. */
  frame: number; elapsedFrames: number; round: number; roundFramesRemaining: number;
  hitstopFramesRemaining: number;
  ultimateActivation?: UltimateActivation;
  explosions: readonly ExplosionState[];
  phase: 'fight' | 'round-over' | 'match-over';
  roundWins: readonly [number, number]; roundWinnerId?: string;
  roundEndedFrame?: number;
  roundEndReason?: 'knockout' | 'time' | 'draw'; matchWinnerId?: string;
  characters: readonly CharacterState[]; activeHitboxes: readonly Hitbox[];
  projectiles: readonly ProjectileState[];
  hitEvents: readonly HitEvent[]; recentContacts: readonly CombatLogEntry[];
  comboHistory: readonly ComboRecord[];
}
export interface SimulationOptions { training?: boolean; initialDistance?: number }
export function volleyShotDamage(move: MoveDefinition, priorHits: number, shot: number): number {
  const volley = move.screenVolley!;
  const total = Math.max(0, move.damage * volley.shots - priorHits * (volley.damageReductionPerPriorHit ?? 0));
  return Math.floor(total / volley.shots) + (shot < total % volley.shots ? 1 : 0);
}
const knockdownRadius = (state: CharacterState): number => state.collision.hurtboxes.knockdown.width / 2 + 8;
const wallInset = (state: CharacterState): number => state.mode === 'knockdown' ? knockdownRadius(state) : state.collision.bodyWidth / 2;
const neutral = (): FrameInput => ({ direction: 'N', buttons: new Set() });
const chainStrike = (move: MoveDefinition): boolean => ['basic', 'crouching', 'power'].includes(move.category ?? '') && !move.projectile;
const heavyStrike = (move: MoveDefinition): boolean => move.input.buttons.some(button => button === '2' || button === '4');
const heavyButton = (move: MoveDefinition): '2' | '4' | undefined =>
  move.input.buttons.length === 1 && (move.input.buttons[0] === '2' || move.input.buttons[0] === '4') ? move.input.buttons[0] : undefined;
const permitsStrength = (sequence: CharacterState['hitSequence'], move: MoveDefinition): boolean => {
  if (!sequence?.heavy || move.category === 'ultimate') return true;
  if (!heavyStrike(move)) return false;
  return !sequence.heavyButton || move.input.buttons.every(button => button === sequence.heavyButton);
};
const locked = (state: CharacterState): boolean => state.mode === 'hitstun' || state.mode === 'blockstun' || state.mode === 'knockdown';
const axis = (input: FrameInput): number => input.direction.endsWith('F') ? 1 : input.direction.endsWith('B') ? -1 : 0;
const clamp = (value: number, low: number, high: number): number => Math.max(low, Math.min(high, value));
const PERFECT_BLOCK_WINDOW = 3;

/** Deterministic combat. Commands, resources and allowed routes belong to each fighter's data. */
export class Simulation {
  private readonly clock = new FixedStepClock();
  private readonly parsers = [new CommandParser(true, 36), new CommandParser(true, 36)];
  private readonly resolver: AttackResolver;
  private characters: [CharacterState, CharacterState];
  private ultimateActivation?: UltimateActivation;
  private pendingLighters: PendingUltimateLighter[] = [];
  private explosions: ExplosionState[] = [];
  private projectiles: ProjectileState[] = [];
  private nextProjectileId = 0;
  private pendingCommands: ({ move: MoveDefinition; expires: number; throwDirection?: CharacterAttack['throwDirection'] } | undefined)[] = [undefined, undefined];
  private frame = 0;
  private elapsedFrames = 0;
  private hitstopFramesRemaining = 0;
  private ultimateUsed: [boolean, boolean] = [false, false];
  private round = 1;
  private phase: SimulationSnapshot['phase'] = 'fight';
  private roundWins: [number, number] = [0, 0];
  private roundFramesRemaining: number;
  private roundWinnerId?: string;
  private roundEndedFrame?: number;
  private roundEndReason?: SimulationSnapshot['roundEndReason'];
  private matchWinnerId?: string;
  private transitionFrames = 0;
  private lastHitEvents: HitEvent[] = [];
  private recentContacts: CombatLogEntry[] = [];
  private comboHistory: ComboRecord[] = [];
  private volleyPriorHits = new Map<string, number>();
  private pendingThrow?: { event: HitEvent; remaining: number; previousButtons: Set<AttackButton>; attempted: boolean; confirmed?: boolean };
  private trainingDistance?: number;
  private trainingAutoRestore = false;
  private quietFrames = 0;
  private jumpHeld = [false, false];
  private ultimateHeld = [false, false];
  private tauntHeld = [false, false];
  private previousAxis = [0, 0];
  private guardHeld = [false, false];
  private guardStarted = [-Infinity, -Infinity];
  private tapAxis = [0, 0];
  private tapFrame = [-Infinity, -Infinity];
  private dashFrames = [0, 0];
  private dashAxis = [0, 0];

  constructor(private readonly config: GameConfig,
    private readonly definitions: readonly [CharacterDefinition, CharacterDefinition] = [defaultCharacter, defaultCharacter],
    private readonly options: SimulationOptions = {}) {
    this.roundFramesRemaining = config.match.roundDurationFrames;
    this.characters = this.createCharacters();
    this.resolver = new AttackResolver((fighterId, moveId) => definitions.find(fighter => fighter.id === fighterId)?.moves.find(move => move.id === moveId));
  }
  advance(delta: number, read: (characters: readonly CharacterState[], frame: number) => readonly FrameInput[], afterStep?: (snapshot: SimulationSnapshot) => void): void {
    this.clock.advance(delta, () => { this.step(read(this.characters, this.frame)); if (afterStep) afterStep(this.snapshot()); });
  }
  stepFrame(inputs: readonly FrameInput[]): void { this.clock.reset(); this.step(inputs); }
  snapshot(): SimulationSnapshot {
    return { frame: this.frame, elapsedFrames: this.elapsedFrames, round: this.round, roundFramesRemaining: this.roundFramesRemaining,
      hitstopFramesRemaining: this.hitstopFramesRemaining, ultimateActivation: structuredClone(this.ultimateActivation), explosions: structuredClone(this.explosions),
      phase: this.phase, roundWins: [...this.roundWins], roundWinnerId: this.roundWinnerId, roundEndedFrame: this.roundEndedFrame,
      roundEndReason: this.roundEndReason, matchWinnerId: this.matchWinnerId,
      characters: structuredClone(this.characters), activeHitboxes: this.phase === 'fight' ? this.resolver.activeHitboxes(this.characters, this.projectiles) : [],
      projectiles: structuredClone(this.projectiles),
      hitEvents: this.lastHitEvents.map(event => ({ ...event })), recentContacts: this.recentContacts.map(entry => ({ frame: entry.frame, event: { ...entry.event } })), comboHistory: structuredClone(this.comboHistory) };
  }
  clearInputHistory(): void {
    this.clock.reset(); this.parsers.forEach(parser => parser.clear());
    this.jumpHeld.fill(false); this.ultimateHeld.fill(false); this.tauntHeld.fill(false); this.previousAxis.fill(0); this.tapAxis.fill(0); this.tapFrame.fill(-Infinity);
    this.guardHeld.fill(false); this.guardStarted.fill(-Infinity);
    this.dashFrames.fill(0); this.dashAxis.fill(0); this.pendingCommands.fill(undefined);
  }
  isMatchOver(): boolean { return this.phase === 'match-over'; }
  resetMatch(distance?: number): void {
    if (this.options.training && distance !== undefined && Number.isFinite(distance)) this.trainingDistance = distance;
    this.frame = 0; this.elapsedFrames = 0; this.round = 1; this.roundWins = [0, 0]; this.phase = 'fight'; this.matchWinnerId = undefined;
    this.ultimateUsed = [false, false];
    this.resetRound(false);
  }
  fillTrainingRage(): void {
    if (this.options.training) this.characters.forEach(character => { if (!character.ultimateUsed || this.options.training) character.rage = character.maxRage; });
  }
  setTrainingAutoRestore(enabled: boolean): void { if (this.options.training) { this.trainingAutoRestore = enabled; this.quietFrames = 0; } }

  private createCharacters(): [CharacterState, CharacterState] {
    const { left, right, floorY } = this.config.arena;
    const center = (left + right) / 2;
    const distance = Math.min(this.config.arena.maxSeparation ?? Infinity,
      this.trainingDistance ?? this.options.initialDistance ?? Math.min(420, (right - left) * .55));
    return this.definitions.map((fighter, index) => ({
      characterId: `player-${index + 1}`, fighterId: fighter.id, collision: structuredClone(fighter.collision),
      x: clamp(center + (index === 0 ? -1 : 1) * distance / 2, left + fighter.collision.bodyWidth / 2, right - fighter.collision.bodyWidth / 2),
      y: floorY, facing: index === 0 ? 'right' : 'left', health: fighter.maxHealth, maxHealth: fighter.maxHealth, rage: 0, maxRage: fighter.rage?.maximum ?? 0, ultimateUsed: this.ultimateUsed[index],
      mode: 'neutral', stateStartedFrame: this.frame, remainingStateFrames: 0, verticalVelocity: 0,
      grounded: true, crouching: false, hitFlashFrames: 0,
    })) as [CharacterState, CharacterState];
  }
  private resetRound(preserveRage = true): void {
    const rage = preserveRage ? this.characters.map(character => character.rage) : [0, 0];
    this.clearInputHistory(); this.characters = this.createCharacters();
    this.characters.forEach((character, index) => { character.rage = rage[index]; }); this.roundFramesRemaining = this.config.match.roundDurationFrames;
    this.roundWinnerId = undefined; this.roundEndedFrame = undefined; this.roundEndReason = undefined; this.transitionFrames = 0;
    this.lastHitEvents = []; this.recentContacts = []; this.comboHistory = []; this.volleyPriorHits.clear(); this.pendingThrow = undefined; this.quietFrames = 0;
    this.hitstopFramesRemaining = 0; this.ultimateActivation = undefined; this.pendingLighters = []; this.explosions = []; this.projectiles = []; this.nextProjectileId = 0;
  }
  private step(inputs: readonly FrameInput[]): void {
    this.elapsedFrames += 1;
    this.lastHitEvents = [];
    if (this.phase !== 'fight') {
      if (this.phase === 'round-over' && --this.transitionFrames <= 0) {
        if (this.roundWins.some(wins => wins >= this.config.match.roundCount) || this.roundEndReason === 'draw') {
          this.phase = 'match-over'; this.matchWinnerId = this.roundWinnerId;
        } else { this.round += 1; this.phase = 'fight'; this.resetRound(); }
      }
      this.frame += 1; return;
    }
    if (this.ultimateActivation) {
      if (this.ultimateActivation.remainingFrames > 0) {
        this.ultimateActivation.remainingFrames -= 1;
        this.ultimateActivation.elapsedFrames += 1;
        return;
      }
      this.ultimateActivation = undefined;
    }
    this.clearFinishedHitSequences();
    // Read before any world/timer mutation so activation freezes both players symmetrically.
    if (!this.hitstopFramesRemaining) {
      this.characters.forEach((character,index) => this.readCommand(character,index,inputs[index] ?? neutral()));
      const owners: string[] = [];
      this.characters.forEach((character,index) => {
        const move = this.pendingCommands[index]?.move;
        if (move?.category === 'ultimate' && !locked(character) && this.canStart(character,index,move)) {
          this.startMove(character,index,move);
          character.mode = 'startup'; character.stateStartedFrame = this.frame;
          owners.push(character.characterId);
        }
      });
      if (owners.length) {
        this.ultimateActivation = { ownerIds: owners, elapsedFrames: 0, remainingFrames: ULTIMATE_ACTIVATION_FRAMES - 1 };
        return;
      }
    }
    // The round clock uses real fixed ticks, independently of combat/animation time.
    if (!this.options.training) this.roundFramesRemaining = Math.max(0, this.roundFramesRemaining - 1);
    if (this.hitstopFramesRemaining > 0) {
      this.characters.forEach((character, index) => this.readCommand(character, index, inputs[index] ?? neutral()));
      this.hitstopFramesRemaining -= 1;
      // Keep attacks/poses intact through the last impact tick, including KO/time-up.
      if (!this.hitstopFramesRemaining && !this.options.training && this.canEndRound()) this.finishRound();
      return;
    }
    let confirmedThrow: HitEvent | undefined;
    if (this.pendingThrow) {
      const pending = this.pendingThrow;
      const attackerIndex = this.characters.findIndex(c => c.characterId === pending.event.attackerId);
      const targetIndex = 1 - attackerIndex;
      const target = this.characters[targetIndex], attacker = this.characters[attackerIndex];
      const move = this.move(attackerIndex, pending.event.moveId)!;
      if (pending.confirmed && attacker.fighterId === 'cowboy' && move.id === 'throw-24' &&
          attacker.attack?.throwConfirmedFrame !== undefined &&
          COWBOY_GRAB_SHOTS.some(shot => this.frame - attacker.attack!.throwConfirmedFrame! === shot)) {
        target.hitReaction = { level: 'mid', startedFrame: this.frame };
      }
      const buttons = (inputs[targetIndex] ?? neutral()).buttons;
      const pressed = [...buttons].filter(button => !pending.previousButtons.has(button));
      const breaksThrow = !pending.attempted && pressed.length > 0 && pressed.every(button => move.input.buttons.includes(button));
      if (pressed.length) pending.attempted = true;
      if (!attacker.attack || locked(attacker)) {
        target.remainingStateFrames = 1; target.grabbedStartedFrame = undefined; target.grabbedHold = undefined;
        this.pendingThrow = undefined;
      } else if (!pending.confirmed && breaksThrow) {
        target.mode = 'hitstun'; target.remainingStateFrames = 1; target.grabbedStartedFrame = undefined; target.grabbedHold = undefined;
        this.pendingCommands[targetIndex] = undefined; this.parsers[targetIndex].clear();
        attacker.attack = undefined; attacker.mode = 'neutral'; attacker.remainingStateFrames = 0;
        this.pendingThrow = undefined;
      } else if (--pending.remaining <= 0 && !pending.confirmed && attacker.fighterId === 'cowboy' && move.id === 'throw-24') {
        pending.confirmed = true; pending.remaining = COWBOY_GRAB_LAUNCH;
        attacker.attack.throwConfirmedFrame = this.frame;
        target.remainingStateFrames = 2;
      } else if (pending.remaining <= 0) {
        confirmedThrow = pending.event;
        if (attacker.attack) attacker.attack.throwConfirmedFrame ??= this.frame;
        target.health = Math.max(0, target.health - confirmedThrow.damage);
        target.grabbedHold = undefined;
        target.mode = 'hitstun'; target.remainingStateFrames = confirmedThrow.defenderStunFrames;
        this.pendingThrow = undefined;
      } else {
        if (pending.confirmed) target.remainingStateFrames = 2;
        pending.previousButtons = new Set(buttons);
      }
    }
    const previousAnimationStates:CharacterAnimationState[]=this.characters.map(c=>({mode:c.mode,stateStartedFrame:c.stateStartedFrame,grounded:c.grounded,crouching:c.crouching,movementDirection:c.movementDirection,facing:c.facing,verticalVelocity:c.verticalVelocity}));
    const previousTransitions=this.characters.map(c=>c.animationTransition?{startedFrame:c.animationTransition.startedFrame,from:c.animationTransition.from}:undefined);
    const previousX = this.characters.map(character => character.x);
    const attackingAtInput = this.characters.map(character => Boolean(character.attack));
    const lockedAtInput = this.characters.map(character => locked(character) || this.heldByUltimate(character));
    this.characters.forEach((character, index) => {
      const direction = (inputs[index] ?? neutral()).direction;
      const held = direction === 'B' || direction === 'DB';
      if (held && !this.guardHeld[index] && !lockedAtInput[index] && !character.attack) this.guardStarted[index] = this.frame;
      if (!held) this.guardStarted[index] = -Infinity;
      this.guardHeld[index] = held;
    });
    // Ler ambos os comandos antes de avaliar guarda evita viés por ordem dos jogadores.
    const commands = this.characters.map((character, index) => {
      if (character.wakeupInvulnerabilityFrames) {
        character.wakeupInvulnerabilityFrames -= 1;
        if (!character.wakeupInvulnerabilityFrames) character.wakeupInvulnerabilityFrames = undefined;
      }
      character.hitFlashFrames = Math.max(0, character.hitFlashFrames - 1);
      const holdLastStunFrame = character.remainingStateFrames === 1 &&
        (character.juggle || character.ultimateCapture || (character.mode === 'knockdown' && !character.grounded));
      if (locked(character) && character.remainingStateFrames > 0 && !holdLastStunFrame) {
        character.remainingStateFrames -= 1;
        if (!character.remainingStateFrames) { character.mode = character.grounded ? 'neutral' : 'airborne'; character.knockdown = undefined; }
      }
      if (character.attack) {
        const move = this.move(index, character.attack.moveId)!;
        const attack = character.attack;
        let held = Boolean(move.charge && !attack.chargeReleased && move.input.buttons.every(button => (inputs[index] ?? neutral()).buttons.has(button)));
        if (move.charge && !attack.chargeReleased) {
          if (held) {
            attack.chargeFrames = Math.min((attack.chargeFrames ?? 0) + 1, move.charge.framesPerStep * move.charge.maxSteps);
            if (attack.chargeFrames >= move.charge.framesPerStep * move.charge.maxSteps) { attack.chargeReleased = true; held = false; }
          }
          else attack.chargeReleased = true;
        }
        if ((!held || attack.elapsedFrames < (attack.startupFrames ?? move.startup) - 1) && this.pendingThrow?.event.attackerId !== character.characterId) attack.elapsedFrames += 1;
        if (character.attack.elapsedFrames >= attackDurationFrames(move, character.attack)) character.attack = undefined;
      }
      return this.pendingCommands[index]?.move;
    });
    // Both sides may act on the same tick that synchronized recovery reaches zero.
    this.characters.forEach((character, index) => {
      if (!locked(character) && this.characters.some(owner => owner.hitSequence?.targetId === character.characterId)) lockedAtInput[index] = false;
    });
    this.clearFinishedHitSequences();
    this.characters.forEach((character, index) => {
      const input = inputs[index] ?? neutral();
      const opponent = this.characters[1 - index];
      const wasLocked = lockedAtInput[index];
      character.movementDirection = undefined;
      const requested = commands[index];
      if (!wasLocked && requested && requested.category !== 'ultimate' && this.canStart(character, index, requested)) {
        this.startMove(character,index,requested);
      }
      if (character.attack) {
        const move = this.move(index, character.attack.moveId)!;
        const elapsed = character.attack.elapsedFrames;
        if (!this.heldByUltimate(character)) {
          if (!character.grounded && !move.movement) this.moveInDirection(character, axis(input), index);
          if (move.movement && elapsed < move.movement.until) character.x += move.movement.speed * (character.facing === 'right' ? 1 : -1);
        }
        const volley = move.screenVolley;
        const volleyElapsed = elapsed - (character.attack.startupFrames ?? move.startup);
        const volleyShot = volley && volleyElapsed >= 0 && volleyElapsed % volley.interval === 0 ? volleyElapsed / volley.interval : -1;
        if (move.projectile && (volley ? volleyShot >= 0 && volleyShot < volley.shots : elapsed === (character.attack.startupFrames ?? move.startup))) {
          const recoil = !character.grounded && (character.chain?.length ?? 0) > 1 ? this.projectileRecipe(index, character.chain ?? [])?.projectileSequence?.airRecoil : undefined;
          if (recoil) character.verticalVelocity = recoil.liftSpeed;
          const volleyOrigin = this.volleyOrigin(character);
          character.attack.projectileId = this.nextProjectileId;
          this.projectiles.push({ id: this.nextProjectileId++, ownerId: character.characterId, fighterId: character.fighterId,
            x: volley ? volleyOrigin : character.x + (character.facing === 'right' ? 1 : -1) * character.collision.bodyWidth * 7 / 12, y: volley ? this.config.arena.floorY - (volleyShot + 1) * volley.bandHeight : character.y, facing: character.facing,
            ...(volley ? { volleyStep: volleyShot } : {}),
            ...(this.projectileRecipe(index, character.chain ?? []) ? { comboId: character.projectileComboId, comboStep: (character.chain?.length ?? 1) - 1 } : {}),
            velocity: move.projectile.speed * (character.facing === 'right' ? 1 : -1), remainingFrames: move.projectile.life,
            verticalVelocity: move.projectile.verticalSpeed ?? 0, gravity: move.projectile.gravity ?? 0, phase: move.ultimateSequence ? 'confirm' : undefined,
            visual: volley ? 'volley' : move.projectile.visual, attack: { ...character.attack, hasHit: false } });
        }
        const startup = character.attack.startupFrames ?? move.startup;
        character.mode = elapsed < startup ? 'startup' : elapsed < startup + move.activeFrames ? 'active' : 'recovery';
      } else if (!wasLocked) {
        character.crouching = character.grounded && input.direction.startsWith('D');
        const threatening = Boolean(attackingAtInput[1 - index] || opponent.attack || commands[1 - index] || this.projectiles.some(p => p.ownerId === opponent.characterId));
        const airDashTap = !character.grounded && this.definitions[index].movement.airDash && (!character.airDashUsed || this.dashFrames[index] > 0) &&
          (input.dash || this.dashFrames[index] > 0 || (axis(input) !== 0 && axis(input) !== this.previousAxis[index] &&
            this.tapAxis[index] === axis(input) && this.frame - this.tapFrame[index] <= this.config.movement.doubleTapWindowFrames));
        const guard = threatening && !airDashTap && (input.direction === 'B' || input.direction === 'DB');
        if (guard) {
          if(!character.grounded)this.moveCharacter(character,input,index);
          character.mode = 'blocking'; this.dashFrames[index] = 0;
        }
        else this.moveCharacter(character, input, index);
      } else this.dashFrames[index] = 0;
      const tauntPressed = Boolean(input.taunt) && !this.tauntHeld[index];
      this.tauntHeld[index] = Boolean(input.taunt);
      if (character.fighterId === 'cowboy' && tauntPressed && character.mode === 'neutral' && !character.attack) character.tauntStartedFrame = this.frame;
      if (character.tauntStartedFrame !== undefined && (character.mode !== 'neutral' || character.attack || this.frame - character.tauntStartedFrame >= 132)) character.tauntStartedFrame = undefined;
      if (character.knockdown) { character.x += character.knockdown.velocityX; character.knockdown.velocityX *= .94; }
      if (character.throwPull) {
        const pull = character.throwPull;
        character.x += pull.distancePerFrame;
        if (--pull.remainingFrames <= 0) {
          character.throwPull = undefined;
          character.pushbackMotion = { distancePerFrame: pull.launchDistance / pull.launchFrames, remainingFrames: pull.launchFrames };
          character.grounded = false; character.verticalVelocity = pull.liftSpeed; character.airborneStartedFrame = this.frame;
        }
      }
      if (character.pushbackMotion) {
        character.x += character.pushbackMotion.distancePerFrame;
        if (--character.pushbackMotion.remainingFrames <= 0) { character.pushbackMotion = undefined; character.throwFlight = undefined; }
      }
      const up = input.direction.startsWith('U');
      if (up && !this.jumpHeld[index] && character.grounded && !character.attack && !wasLocked) {
        character.airborneStartedFrame=this.frame;
        character.grounded = false; character.crouching = false; character.verticalVelocity = this.definitions[index].movement.jumpVelocity;
        character.mode = 'airborne'; this.dashFrames[index] = 0;
      }
      this.jumpHeld[index] = up;
      if (!character.grounded) {
        character.airborneElapsedFrames = this.frame + 1 - (character.airborneStartedFrame ?? this.frame);
        if (character.juggle?.suspensionFrames) {
          character.juggle.suspensionFrames -= 1;
        } else if (!(character.mode === 'dashing' && this.definitions[index].movement.airDash)) {
          character.y += character.verticalVelocity;
          const recoil = character.attack && (character.chain?.length ?? 0) > 1 ? this.projectileRecipe(index, character.chain ?? [])?.projectileSequence?.airRecoil : undefined;
          character.verticalVelocity += this.config.movement.gravity * (character.juggle?.gravityScale ?? recoil?.gravityScale ?? 1);
        }
        if (character.y >= this.config.arena.floorY) {
          if (character.mode === 'dashing') this.dashFrames[index] = 0;
          character.airborneStartedFrame=undefined; character.airborneElapsedFrames=undefined;
          character.y = this.config.arena.floorY; character.grounded = true; character.verticalVelocity = 0;
          character.airDashUsed = false;
          const juggleRules = this.definitions[index].juggle;
          if (character.juggle && juggleRules) {
            character.juggle = undefined;
            character.mode = 'knockdown'; character.attack = undefined;
            const owner = this.characters.find(candidate => candidate.hitSequence?.targetId === character.characterId);
            const move = owner?.attack ? this.move(this.characters.indexOf(owner), owner.attack.moveId) : undefined;
            const recovery = move && owner?.attack ? attackDurationFrames(move, owner.attack) - owner.attack.elapsedFrames : 0;
            character.remainingStateFrames = Math.max(juggleRules.getupFrames, recovery);
            character.knockdown = { velocityX: 0 };
          }
          if (character.mode === 'knockdown' && juggleRules) {
            character.wakeupInvulnerabilityFrames = character.remainingStateFrames + juggleRules.wakeupInvulnerabilityFrames;
          }
          // A missed air kick already in recovery remains vulnerable after landing.
          const landingMove = character.attack ? this.move(index, character.attack.moveId) : undefined;
          const recoveringMissedKick = landingMove?.airborne && character.mode === 'recovery' &&
            !character.attack?.hasHit && (landingMove.pose === 'light-kick' || landingMove.pose === 'heavy-kick');
          if (landingMove?.airborne && character.attack?.hitOutcome !== 'block' && !recoveringMissedKick) {
            character.attack = undefined; character.chain = undefined; character.mode = 'neutral';
          }
          if (!locked(character) && !character.attack && character.mode !== 'blocking') character.mode = 'neutral';
        }
      }
      if (character.attack || wasLocked || character.mode === 'blocking' || !character.grounded) this.previousAxis[index] = axis(input);
    });
    // Landing can end an air basic early; release its grounded target at that same boundary.
    for (const owner of this.characters) {
      const target = this.characters.find(character => character.characterId === owner.hitSequence?.targetId);
      if (!owner.attack && !locked(owner) && target?.grounded && target.mode === 'hitstun' && !target.juggle && !target.ultimateCapture) {
        target.mode = 'neutral'; target.remainingStateFrames = 0; owner.hitSequence = undefined;
      }
    }
    const intendedX = this.characters.map(character => character.x);
    this.resolveBodies(previousX); this.resolveScreenEdges(previousX); this.resolveWallBounces(previousX, intendedX); this.updateFacing();
    this.explosions = this.explosions.map(e => ({ ...e, remainingFrames: e.remainingFrames - 1 })).filter(e => e.remainingFrames > 0);
    this.updateLighters();
    this.projectiles.forEach(projectile => {
      if (projectile.targetId) {
        const target = this.characters.find(c => c.characterId === projectile.targetId)!;
        const dx = target.x - projectile.x, dy = target.y - projectile.y;
        const distance = Math.hypot(dx,dy) || 1;
        const speed = Math.abs(this.move(this.characters.findIndex(c=>c.characterId===projectile.ownerId),projectile.attack.moveId)!.ultimateSequence!.lighterSpeed);
        const step = Math.min(speed,distance);
        projectile.velocity = dx/distance*step; projectile.verticalVelocity = dy/distance*step;
        projectile.facing = dx >= 0 ? 'right' : 'left';
      }
      projectile.x += projectile.velocity;
      projectile.y += projectile.verticalVelocity ?? 0;
      projectile.verticalVelocity = (projectile.verticalVelocity ?? 0) + (projectile.gravity ?? 0);
      projectile.remainingFrames -= 1;
    });
    for (const combo of this.comboHistory) {
      const target = this.characters.find(character => character.characterId === combo.targetId);
      if (combo.active && target && !['hitstun','knockdown'].includes(target.mode)) combo.active = false;
    }
    this.lastHitEvents = this.resolver.resolve(this.characters, inputs, this.projectiles, (attackerId, targetId, move, shot) => {
      const priorHits = this.volleyPriorHits.get(attackerId) ??
        (this.comboHistory.find(combo => combo.active && combo.attackerId === attackerId && combo.targetId === targetId)?.hits ?? 0);
      this.volleyPriorHits.set(attackerId, priorHits);
      return volleyShotDamage(move, priorHits, shot);
    });
    for (const event of this.lastHitEvents) {
      const index = this.characters.findIndex(character => character.characterId === event.targetId);
      if (event.outcome === 'block' && !lockedAtInput[index] && this.frame - this.guardStarted[index] < PERFECT_BLOCK_WINDOW) {
        event.perfectBlock = true;
        this.characters[index].perfectBlockStartedFrame = this.frame;
        this.guardStarted[index] = -Infinity;
      }
    }
    this.lastHitEvents = this.lastHitEvents.filter(event => {
      const attackerIndex = this.characters.findIndex(c => c.characterId === event.attackerId);
      const move = this.move(attackerIndex, event.moveId);
      if (this.characters[attackerIndex].fighterId !== 'cowboy' || move?.category !== 'throw' || event.outcome !== 'hit' || this.pendingThrow) return true;
      const targetIndex = 1 - attackerIndex, target = this.characters[targetIndex];
      const attacker = this.characters[attackerIndex];
      if (attacker.attack) attacker.attack.throwCapturedFrame = this.frame;
      target.health += event.damage;
      target.mode = 'hitstun'; target.remainingStateFrames = 16; target.grabbedStartedFrame = this.frame;
      if (move.id === 'throw-24') target.grabbedHold = true;
      this.pendingThrow = { event, remaining: 15, previousButtons: new Set((inputs[targetIndex] ?? neutral()).buttons), attempted: false };
      return false;
    });
    if (confirmedThrow) this.lastHitEvents.push(confirmedThrow);
    for (const hit of this.lastHitEvents) {
      if (hit.outcome !== 'hit' || hit.stage === 'confirm') continue;
      let combo = this.comboHistory.find(entry => entry.active && entry.attackerId === hit.attackerId && entry.targetId === hit.targetId);
      if (!combo) {
        combo = { attackerId:hit.attackerId,targetId:hit.targetId,hits:0,damage:0,active:true,lastFrame:this.frame };
        this.comboHistory.push(combo);
      }
      combo.hits += 1; combo.damage += hit.damage; combo.lastFrame = this.frame;
      if (hit.moveId === 'light-punch' && this.characters.find(character => character.characterId === hit.attackerId)?.fighterId === 'cowboy') combo.usedLightPunch = true;
      if (hit.moveId === 'light-kick' && this.characters.find(character => character.characterId === hit.attackerId)?.fighterId === 'cowboy') combo.usedStandingLightKick = true;
    }
    this.comboHistory = this.comboHistory.slice(-12);
    for (const projectile of this.projectiles) {
      if (!projectile.attack.hasHit) continue;
      const owner = this.characters.find(character => character.characterId === projectile.ownerId);
      if (!owner) continue;
      if (owner.attack?.projectileId === projectile.id) {
        owner.attack.hasHit = true;
        owner.attack.hitOutcome = projectile.attack.hitOutcome;
      }
      if (projectile.comboId !== undefined && owner.projectileComboId === projectile.comboId &&
          projectile.comboStep !== undefined && projectile.attack.hitOutcome === 'hit') {
        owner.projectileComboHits = (owner.projectileComboHits ?? 0) | (1 << projectile.comboStep);
      }
    }
    this.projectiles = this.projectiles.filter(p => {
      const move = this.definitions.find(f=>f.id===p.fighterId)!.moves.find(m=>m.id===p.attack.moveId)!;
      const box = createProjectileHitbox(p,move);
      const alive = (!p.attack.hasHit || p.visual === 'volley') && p.remainingFrames > 0 && p.x >= this.config.arena.left - 100 && p.x <= this.config.arena.right + 100 && box.y+box.height <= this.config.arena.floorY;
      if (!alive && p.visual === 'dynamite') this.explosions.push({ x:box.x + box.width / 2, y:box.y + box.height / 2, remainingFrames:12, kind:'dynamite', id:p.id });
      return alive;
    });
    if (this.lastHitEvents.length) this.hitstopFramesRemaining = CONTACT_HITSTOP_FRAMES;
    const contactPositions = this.characters.map(character => character.x);
    this.lastHitEvents.forEach(event => {
      const attacker = this.characters.find(character => character.characterId === event.attackerId)!;
      const target = this.characters.find(character => character.characterId === event.targetId)!;
      const attackerIndex = this.characters.indexOf(attacker), targetIndex = this.characters.indexOf(target);
      const sourceMove = this.move(attackerIndex,event.moveId)!;
      if (sourceMove.screenVolley && event.outcome === 'hit') {
        target.grounded = false; target.crouching = false;
        target.airborneStartedFrame ??= this.frame;
        target.verticalVelocity = -6.5;
        if (event.volleyStep === 5) {
          target.mode = 'knockdown';
          target.knockdown = { velocityX: 0 };
          target.remainingStateFrames = (this.definitions[targetIndex].juggle?.getupFrames ?? 24) +
            flightFramesRemaining(target.y, target.verticalVelocity, this.config.arena.floorY, this.config.movement.gravity);
        }
      }
      if (event.outcome === 'hit') target.hitReaction = { level: event.contactHeight ?? sourceMove.hitLevel, startedFrame: this.frame };
      if (event.outcome === 'hit' && sourceMove.category === 'throw') target.grabbedStartedFrame = this.frame;
      const current = attacker.attack;
      const currentMove = current && this.move(attackerIndex, current.moveId);
      if (event.outcome === 'hit' && current && currentMove?.projectile && attacker.chain &&
          this.projectileRecipe(attackerIndex, attacker.chain) && (attacker.projectileComboHits ?? 0) === (1 << (attacker.chain.length - 1)) - 1 &&
          attacker.chain.length > 1 && target.grounded) {
        const travel = Math.ceil(Math.abs(target.x - attacker.x) / currentMove.projectile.speed);
        target.remainingStateFrames = Math.max(target.remainingStateFrames, Math.max(0, (current.startupFrames ?? currentMove.startup) - current.elapsedFrames) + travel + 2);
      }
      const completedCombo = this.definitions[attackerIndex].combos?.find(recipe =>
        recipe.moveIds.length === attacker.chain?.length && recipe.moveIds.every((id, step) => attacker.chain![step] === id));
      const launcher = completedCombo?.launch ? completedCombo : undefined;
      if (event.outcome === 'hit' && !event.stage && completedCombo?.recoveryFrames !== undefined && attacker.attack?.moveId === event.moveId) {
        attacker.attack.recoveryFrames = completedCombo.recoveryFrames;
      }
      const juggleRules = this.definitions[targetIndex].juggle;
      const repeatedLauncher = Boolean(launcher && target.juggle);
      if (event.outcome === 'hit' && !event.stage && juggleRules && !repeatedLauncher) {
        if (target.juggle && !target.grounded) {
          target.juggle.airHits += 1;
          target.juggle.suspensionFrames = juggleRules.airHitSuspensionFrames;
          target.juggle.gravityScale = Math.min(juggleRules.maximumGravityScale,
            juggleRules.initialGravityScale + target.juggle.airHits * juggleRules.gravityScalePerHit);
        } else if (launcher) {
          target.juggle = { gravityScale: juggleRules.initialGravityScale, airHits: 0 };
        }
      }
      if (launcher && event.outcome === 'hit' && !event.stage) {
        if (attacker.attack?.moveId === event.moveId) {
          attacker.attack.recoveryFrames = launcher.launch!.recoveryFrames;
          event.attackerRecoveryFrames = attackDurationFrames(sourceMove, attacker.attack) - attacker.attack.elapsedFrames;
        }
        attacker.chain = undefined;
        target.crouching = false;
        if (repeatedLauncher && juggleRules) {
          target.y = this.config.arena.floorY;
          target.grounded = true; target.verticalVelocity = 0;
          target.airborneStartedFrame = undefined; target.airborneElapsedFrames = undefined;
          target.juggle = undefined;
          target.mode = 'knockdown'; target.attack = undefined;
          target.knockdown = { velocityX: 0 };
          target.remainingStateFrames = Math.max(juggleRules.getupFrames, event.attackerRecoveryFrames);
          target.wakeupInvulnerabilityFrames = target.remainingStateFrames + juggleRules.wakeupInvulnerabilityFrames;
          event.defenderStunFrames = target.remainingStateFrames;
          event.frameAdvantage = event.defenderStunFrames - event.attackerRecoveryFrames;
        } else {
          target.grounded = false;
          target.verticalVelocity = launcher.launch!.velocity;
          target.airborneStartedFrame = this.frame;
        }
      }

      if (sourceMove.knockdown && event.outcome === 'hit' && !event.stage && target.grounded) {
        target.mode = 'knockdown'; target.attack = undefined; target.crouching = false;
        target.knockdown = { velocityX: 0 };
        target.remainingStateFrames = Math.max(juggleRules?.getupFrames ?? 24, event.attackerRecoveryFrames);
        target.wakeupInvulnerabilityFrames = target.remainingStateFrames + (juggleRules?.wakeupInvulnerabilityFrames ?? 0);
        event.defenderStunFrames = target.remainingStateFrames;
        event.frameAdvantage = event.defenderStunFrames - event.attackerRecoveryFrames;
      }

      if (event.stage === 'confirm' && event.outcome === 'hit') {
        target.juggle = undefined;
        target.ultimateCapture = { ownerId: attacker.characterId };
        target.crouching = false;
        target.knockdown = undefined;
        // Cancel upward momentum; the stunned defender falls upright before the lighter.
        target.verticalVelocity = Math.max(0, target.verticalVelocity);
        this.pendingLighters.push({ ownerId: attacker.characterId, targetId: target.characterId, fighterId: attacker.fighterId,
          moveId: event.moveId, remainingFrames: sourceMove.ultimateSequence!.lighterDelay });
      }
      if (event.stage === 'explosion' && event.outcome === 'hit') {
        const sequence = sourceMove.ultimateSequence!;
        target.juggle = undefined;
        target.ultimateCapture = undefined;
        target.mode = 'knockdown';
        target.remainingStateFrames = sequence.knockdownFrames + flightFramesRemaining(
          target.y, sequence.launchSpeed, this.config.arena.floorY, this.config.movement.gravity);
        event.defenderStunFrames = target.remainingStateFrames; event.frameAdvantage = event.defenderStunFrames - event.attackerRecoveryFrames;
        target.grounded = false; target.crouching = false; target.verticalVelocity = sequence.launchSpeed;
        target.airborneStartedFrame = this.frame;
        target.knockdown = { velocityX: sequence.knockbackSpeed * (event.pushbackDirection === 'right' ? 1 : -1) };
        this.explosions.push({x: target.x,y:target.y-85,remainingFrames:10});
      }
      if (target.juggle && juggleRules) {
        target.remainingStateFrames = juggleRules.getupFrames + (target.juggle.suspensionFrames ?? 0) + flightFramesRemaining(target.y, target.verticalVelocity,
          this.config.arena.floorY, this.config.movement.gravity * target.juggle.gravityScale);
        event.defenderStunFrames = target.remainingStateFrames;
        event.frameAdvantage = event.defenderStunFrames - event.attackerRecoveryFrames;
      }
      if (event.outcome === 'hit' && !event.stage && chainStrike(sourceMove) && attacker.attack?.moveId === event.moveId) {
        attacker.hitSequence = { targetId: target.characterId, heavy: !launcher && Boolean(attacker.hitSequence?.heavy || heavyStrike(sourceMove)),
          ...(!launcher && (attacker.hitSequence?.heavyButton ?? heavyButton(sourceMove)) ? { heavyButton: attacker.hitSequence?.heavyButton ?? heavyButton(sourceMove) } : {}) };
        if (target.grounded && !target.juggle && target.mode !== 'knockdown') {
          const remaining = attackDurationFrames(sourceMove, attacker.attack) - attacker.attack.elapsedFrames;
          target.remainingStateFrames = remaining;
          event.attackerRecoveryFrames = remaining;
          event.defenderStunFrames = remaining;
          event.frameAdvantage = 0;
        }
      }
      const gain = this.definitions[attackerIndex].rage;
      const received = this.definitions[targetIndex].rage;
      if (gain && event.stage !== 'confirm' && event.outcome === 'hit' && sourceMove.category !== 'ultimate') {
        attacker.rage = Math.min(attacker.maxRage, attacker.rage + gain.onHit);
      }
      if (received && event.stage !== 'confirm') target.rage = Math.min(target.maxRage, target.rage + (event.perfectBlock ? 50 : event.outcome === 'hit' ? received.onDamage : received.onBlock));
      const pushSign = (event.pushbackDirection ?? attacker.facing) === 'right' ? 1 : -1;
      target.wallBouncePending = event.outcome === 'hit' && sourceMove.wallBounce ? { direction: pushSign, attackerId: attacker.characterId, moveId: sourceMove.id } : undefined;
      target.pushbackMotion = undefined;
      target.throwFlight = undefined;
      target.throwPull = undefined;
      if (sourceMove.throwFlight && event.outcome === 'hit') {
        const destination = contactPositions[attackerIndex] + pushSign * (Math.abs(contactPositions[targetIndex] - contactPositions[attackerIndex]) + event.pushback);
        target.throwFlight = true;
        if (attacker.attack?.throwDirection !== 'backward' && !(attacker.fighterId === 'cowboy' && sourceMove.id === 'throw-24')) {
          const pullTo = attacker.x + pushSign * ((attacker.collision.bodyWidth + target.collision.bodyWidth) / 2 + 5);
          target.throwPull = { distancePerFrame: (pullTo - target.x) / 8, remainingFrames: 8,
            launchDistance: destination - pullTo, launchFrames: sourceMove.throwFlight.frames, liftSpeed: sourceMove.throwFlight.liftSpeed };
          target.remainingStateFrames += 8;
        } else {
          target.pushbackMotion = { distancePerFrame: (destination - target.x) / sourceMove.throwFlight.frames, remainingFrames: sourceMove.throwFlight.frames };
          target.grounded = false; target.verticalVelocity = sourceMove.throwFlight.liftSpeed; target.airborneStartedFrame = this.frame;
        }
      } else if (sourceMove.category === 'throw' && event.outcome === 'hit' && event.pushback !== 0) {
        target.x = contactPositions[attackerIndex] + pushSign * (Math.abs(contactPositions[targetIndex] - contactPositions[attackerIndex]) + event.pushback);
      } else if (event.outcome === 'hit' && sourceMove.hitPushbackFrames && event.pushback) {
        target.pushbackMotion = { distancePerFrame: event.pushback * pushSign / sourceMove.hitPushbackFrames, remainingFrames: sourceMove.hitPushbackFrames };
      } else target.x += event.pushback * pushSign;
      this.recentContacts.push({ frame: this.frame, event });
    });
    this.recentContacts = this.recentContacts.filter(entry => this.frame - entry.frame < 180).slice(-20);
    const contactX = this.characters.map(character => character.x);
    this.resolveBodies(); this.resolveScreenEdges(previousX); this.resolveWallBounces(previousX, contactX); this.updateFacing();
    this.characters.forEach((character,index)=>{
      if (!character.attack || locked(character)) character.chain = undefined;
      const previous=previousAnimationStates[index];
      // A held back direction at a wall or the shared screen limit cannot animate a walk in place.
      if (character.grounded && character.mode === 'moving' && character.movementDirection === 'backward' &&
          Math.abs(character.x - previousX[index]) < 1e-7) {
        character.mode = 'neutral'; character.movementDirection = undefined;
      }
      if (character.facing !== previous.facing) character.facingTransition = {startedFrame:this.frame+1, from:previous.facing};
      if(character.mode!==previous.mode)character.stateStartedFrame=this.frame;
      if (character.mode === 'neutral' && character.grounded && !character.crouching && !character.attack && character.tauntStartedFrame === undefined) {
        if (Math.abs(character.x - previousX[index]) >= 1e-7) character.idleStartedFrame = undefined;
        character.idleStartedFrame ??= this.frame;
      } else character.idleStartedFrame = undefined;
      const directionalPose=['moving','dashing'].includes(character.mode);
      if(character.mode!==previous.mode || character.grounded!==previous.grounded || character.crouching!==previous.crouching ||
        (directionalPose && character.movementDirection!==previous.movementDirection)){
        character.animationTransition={startedFrame:this.frame+1,from:previous,previous:previousTransitions[index]};
      }
    });
    if (this.options.training) {
      const quiet = this.characters.every(character => !character.attack && !locked(character) && this.projectiles.length === 0 && this.pendingLighters.length === 0);
      this.quietFrames = quiet ? this.quietFrames + 1 : 0;
      if (this.trainingAutoRestore && this.quietFrames >= 90) this.characters.forEach(character => { character.health = character.maxHealth; });
    } else {
      if (!this.hitstopFramesRemaining && this.canEndRound()) this.finishRound();
    }
    this.frame += 1;
  }
  private updateLighters(): void {
    this.pendingLighters = this.pendingLighters.filter(pending => {
      pending.remainingFrames = Math.max(0, pending.remainingFrames - 1);
      const target = this.characters.find(c => c.characterId === pending.targetId)!;
      if (pending.remainingFrames > 0 || !target.grounded) return true;
      const owner = this.characters.find(c => c.characterId === pending.ownerId)!;
      const move = this.definitions.find(f => f.id === pending.fighterId)!.moves.find(m => m.id === pending.moveId)!;
      owner.ultimateThrowStartedFrame = this.frame;
      this.projectiles.push({ id: this.nextProjectileId++, ownerId: owner.characterId, fighterId: owner.fighterId,
        x: owner.x, y: owner.y, facing: owner.facing, velocity: move.ultimateSequence!.lighterSpeed, verticalVelocity: 0, gravity: 0,
        remainingFrames: 100, visual: 'lighter', phase: 'lighter', targetId: target.characterId,
        attack: { moveId: move.id, buttons: move.input.buttons, elapsedFrames: 0, hasHit: false } });
      return false;
    });
  }
  private volleyOrigin(character: CharacterState): number {
    const halfView = (this.config.arena.viewportWidth ?? this.config.arena.right - this.config.arena.left) / (2 * FIGHT_WORLD_SCALE);
    const center = clamp((this.characters[0].x + this.characters[1].x) / 2, this.config.arena.left + halfView, this.config.arena.right - halfView);
    return character.facing === 'right' ? center - halfView + 156 : center + halfView - 156;
  }
  private startMove(character: CharacterState, index: number, move: MoveDefinition): void {
        if (move.screenVolley) this.volleyPriorHits.delete(character.characterId);
        const previous = character.attack;
        const opponent = this.characters[1 - index];
        if (move.screenVolley && move.projectile && previous?.hitOutcome === 'hit' && opponent.mode === 'hitstun' && opponent.grounded) {
          const origin = this.volleyOrigin(character);
          const travel = Math.ceil(Math.abs(opponent.x - origin) / move.projectile.speed);
          opponent.remainingStateFrames = Math.max(opponent.remainingStateFrames, move.startup + travel + 2);
        }
        const continuingRecipe = this.canContinueRecipe(character, index, move);
        const target = continuingRecipe ? this.characters[1 - index] : this.characters.find(candidate => candidate.characterId === character.hitSequence?.targetId);
        if (previous?.hitOutcome === 'hit' && (character.hitSequence || continuingRecipe) && (chainStrike(move) || continuingRecipe) &&
            target?.mode === 'hitstun' && target.grounded && !target.juggle && !target.ultimateCapture) {
          // A continuation started during hitstun keeps the defender exposed through its contact window.
          const travel = move.projectile ? Math.ceil(Math.abs(target.x - character.x) / Math.abs(move.projectile.speed)) : 0;
          target.remainingStateFrames = Math.max(target.remainingStateFrames, move.startup + move.activeFrames + travel + 1);
        }
        const promotion = previous && previous.elapsedFrames <= 3 && !previous.hasHit &&
          move.input.buttons.length > previous.buttons.length;
        const chain = previous && !promotion ? [...(character.chain ?? [previous.moveId]), move.id] : [move.id];
        character.chain = this.recipePrefix(index, chain) ? chain : [move.id];
        const completedRecipe = this.definitions[index].combos?.find(recipe => recipe.finisherMoveId &&
          recipe.moveIds.length === character.chain!.length && recipe.moveIds.every((id, step) => id === character.chain![step]));
        if (completedRecipe?.finisherMoveId) move = this.move(index, completedRecipe.finisherMoveId)!;
        const projectileRecipe = this.projectileRecipe(index, character.chain);
        if (!character.grounded && character.chain.length > 1 && projectileRecipe?.projectileSequence?.airRecoil) {
          character.verticalVelocity = Math.max(character.verticalVelocity, projectileRecipe.projectileSequence.airRecoil.liftSpeed);
        }
        if (character.chain.length === 1) { character.projectileComboHits = 0; character.projectileComboId = this.frame; }
        const startupFrames = projectileRecipe?.projectileSequence?.startupFrames[character.chain.length - 1];
        const projectileTarget = this.characters[1 - index];
        if (completedRecipe && move.projectile && previous?.hitOutcome === 'hit' && projectileTarget.mode === 'hitstun' && projectileTarget.grounded) {
          const travel = Math.ceil(Math.abs(projectileTarget.x - character.x) / move.projectile.speed);
          projectileTarget.remainingStateFrames = Math.max(projectileTarget.remainingStateFrames, move.startup + travel + 2);
        }
        if (projectileRecipe && ((character.projectileComboHits ?? 0) & ((1 << (character.chain.length - 1)) - 1)) === (1 << (character.chain.length - 1)) - 1 &&
            character.chain.length > 1 && projectileTarget.mode === 'hitstun' && projectileTarget.grounded && move.projectile) {
          const distance = Math.abs(projectileTarget.x - character.x);
          const travel = Math.ceil(distance / move.projectile.speed);
          projectileTarget.remainingStateFrames = Math.max(projectileTarget.remainingStateFrames, (startupFrames ?? move.startup) + travel + 2);
        }
        if (character.hitSequence && heavyStrike(move)) {
          character.hitSequence.heavy = true;
          character.hitSequence.heavyButton ??= heavyButton(move);
        }
        character.rage = Math.max(0, character.rage - (move.rageCost ?? 0));
        if (move.category === 'ultimate' && !this.options.training) { this.ultimateUsed[index] = true; character.ultimateUsed = true; }
        character.attack = { moveId: move.id, buttons: move.input.buttons, elapsedFrames: 0, hasHit: false,
          ...(move.charge ? { chargeFrames: 1 } : {}),
          ...(startupFrames !== undefined ? { startupFrames } : {}),
          ...(projectileRecipe && character.chain.length > 1 && move.projectile ? {
            recoveryFrames: Math.max(move.recovery, Math.ceil(Math.abs(projectileTarget.x - character.x) / move.projectile.speed) + 8 - move.activeFrames),
          } : {}),
          ...(move.category === 'throw' ? { throwDirection: this.pendingCommands[index]?.throwDirection ?? 'forward' } : {}) };
        character.crouching = Boolean(move.crouching); this.dashFrames[index] = 0;
        this.pendingCommands[index] = undefined;
        if (move.movement?.launch) {
          character.grounded = false; character.airborneStartedFrame = this.frame;
          character.verticalVelocity = move.movement.launch;
        }
  }
  private readCommand(character: CharacterState, index: number, input: FrameInput): void {
    if (this.pendingCommands[index] && this.pendingCommands[index]!.expires < this.frame) this.pendingCommands[index] = undefined;
    const moves = this.definitions[index].moves.filter(move => !move.comboOnly);
    const shortcut = Boolean(input.ultimate) && !this.ultimateHeld[index];
    this.ultimateHeld[index] = Boolean(input.ultimate);
    if (shortcut && !this.heldByUltimate(character)) {
      const ultimates = moves.filter(move => move.category === 'ultimate');
      if (ultimates.length === 1) { this.pendingCommands[index] = { move: ultimates[0], expires: this.frame + 6 }; return; }
    }
    const command = this.parsers[index].update(input, this.frame, moves.filter(move => !move.shortcutOnly),
      { airborne: !character.grounded, crouching: input.direction.startsWith('D') && character.grounded });
    if (this.heldByUltimate(character) || (command && !permitsStrength(character.hitSequence, command))) {
      this.pendingCommands[index] = undefined; return;
    }
    if (command && command.input.buttons.length === input.buttons.size && (!character.grounded || !input.direction.startsWith('U'))) this.pendingCommands[index] = { move: command, expires: this.frame + 6,
      ...(command.category === 'throw' ? { throwDirection: input.direction.endsWith('B') ? 'backward' : 'forward' } : {}) };
  }
  private clearFinishedHitSequences(): void {
    for (const owner of this.characters) {
      const target = this.characters.find(character => character.characterId === owner.hitSequence?.targetId);
      if (locked(owner) || !target || !locked(target)) owner.hitSequence = undefined;
    }
  }
  private heldByUltimate(character: CharacterState): boolean {
    return Boolean(character.ultimateCapture || this.characters.some(target => target.ultimateCapture?.ownerId === character.characterId));
  }
  private canStart(character: CharacterState, index: number, move: MoveDefinition): boolean {
    if (this.heldByUltimate(character)) return false;
    if ((move.rageCost ?? 0) > character.rage || (move.category === 'ultimate' &&
      (character.rage < character.maxRage || (character.ultimateUsed && !this.options.training)))) return false;
    if (Boolean(move.airborne) !== !character.grounded) return false;
    const previous = character.attack;
    if (this.definitions[index].id === 'cowboy' && move.id === 'light-kick' && previous?.moveId !== 'light-kick' &&
        this.comboHistory.some(combo => combo.active && combo.attackerId === character.characterId && combo.targetId === this.characters[1-index].characterId && combo.usedStandingLightKick)) return false;
    if (this.definitions[index].id === 'cowboy' && move.id === 'crouch-light-kick' &&
        this.comboHistory.some(combo => combo.active && combo.attackerId === character.characterId && combo.targetId === this.characters[1-index].characterId && combo.usedStandingLightKick)) return false;
    if (this.definitions[index].id === 'cowboy' && move.id === 'light-punch' && previous?.moveId !== 'light-punch' &&
        this.comboHistory.some(combo => combo.active && combo.attackerId === character.characterId && combo.targetId === this.characters[1-index].characterId && combo.usedLightPunch)) return false;
    if (!move.screenVolley && previous?.hitOutcome === 'hit' && character.chain && this.definitions[index].combos?.some(recipe =>
      !recipe.launch && recipe.moveIds.length === character.chain!.length &&
      recipe.moveIds.every((id, i) => id === character.chain![i]) && heavyStrike(this.move(index, previous.moveId)!))) return false;
    if (!permitsStrength(character.hitSequence, move)) return false;
    if (!previous) return true;
    if (this.canContinueRecipe(character, index, move)) return true;
    // A chord completed within the input grace window replaces its uncommitted single.
    if (!previous.hasHit && previous.elapsedFrames <= 3 && move.input.buttons.length > previous.buttons.length &&
      previous.buttons.every(button => move.input.buttons.includes(button))) return true;
    const chain = [...(character.chain ?? [previous.moveId]), move.id];
    const projectileRecipe = this.projectileRecipe(index, chain);
    if (projectileRecipe && previous.hitOutcome === 'block' && projectileRecipe.projectileSequence!.continueOnBlock) return true;
    if (projectileRecipe && previous.hitOutcome === 'hit') return true;
    if (!previous.hasHit) {
      const previousMove = this.move(index, previous.moveId)!;
      return previous.elapsedFrames >= (previous.startupFrames ?? previousMove.startup) + previousMove.activeFrames && this.recipePrefix(index, chain);
    }
    if (previous.hitOutcome === 'block') return this.definitions[index].id === 'cowboy' && this.recipePrefix(index, chain);
    if (move.screenVolley && previous.hitOutcome === 'hit' && this.characters[1-index].mode === 'hitstun') return true;
    if (previous.hitOutcome !== 'hit' || !character.hitSequence) return false;
    if (move.category === 'ultimate') return true;
    if (!chainStrike(move)) return false;
    const previousMove = this.move(index, previous.moveId)!;
    if (!chainStrike(previousMove)) return false;
    return previous.moveId !== move.id || this.recipePrefix(index, chain);
  }
  private projectileRecipe(index: number, chain: readonly string[]) {
    return this.definitions[index].combos?.find(recipe => recipe.projectileSequence &&
      chain.length <= recipe.moveIds.length && chain.every((id, step) => recipe.moveIds[step] === id));
  }
  private recipePrefix(index: number, chain: readonly string[]): boolean {
    return (this.definitions[index].combos ?? []).some(recipe =>
      chain.length <= recipe.moveIds.length && chain.every((id, step) => recipe.moveIds[step] === id));
  }

  private canContinueRecipe(character: CharacterState, index: number, move: MoveDefinition): boolean {
    if (character.attack?.hitOutcome !== 'hit' || !character.chain || this.characters[1 - index].mode !== 'hitstun') return false;
    const combos = this.definitions[index].combos ?? [];
    const starter = this.move(index, character.attack.moveId)?.startsComboOnHit && move.id !== character.attack.moveId;
    const completed = character.hitSequence && combos.find(recipe => recipe.continueOnHit && character.chain!.length <= recipe.moveIds.length &&
      character.chain!.every((id, step) => id === recipe.moveIds[step]));
    return Boolean(combos.some(recipe => recipe.moveIds[0] === move.id && (starter || (completed && recipe.id !== completed.id))));
  }

  private move(index: number, id: string): MoveDefinition | undefined { return this.definitions[index].moves.find(move => move.id === id); }
  private moveCharacter(character: CharacterState, input: FrameInput, index: number): void {
    const horizontal = axis(input);
    const movement = this.definitions[index].movement;
    const grounded = character.grounded;
    const canDash = grounded || Boolean(movement.airDash && (!character.airDashUsed || this.dashFrames[index] > 0));
    if (canDash && !character.crouching && horizontal && horizontal !== this.previousAxis[index]) {
      if (this.dashFrames[index] === 0 && this.tapAxis[index] === horizontal && this.frame - this.tapFrame[index] <= this.config.movement.doubleTapWindowFrames) {
        this.dashFrames[index] = this.config.movement.dashDurationFrames; this.dashAxis[index] = horizontal;
        if (!grounded) character.airDashUsed = true;
      }
      this.tapAxis[index] = horizontal; this.tapFrame[index] = this.frame;
    }
    if(canDash && !character.crouching && this.dashFrames[index]===0 && input.dash){
      this.dashAxis[index]=input.dash==='F'?1:-1;this.dashFrames[index]=this.config.movement.dashDurationFrames;
      if (!grounded) character.airDashUsed = true;
    }
    this.previousAxis[index] = horizontal;
    if (character.crouching) {
      this.dashFrames[index] = 0; this.dashAxis[index] = 0; character.mode = 'crouching'; return;
    }
    if (!canDash || (horizontal !== 0 && this.dashFrames[index] > 0 && horizontal !== this.dashAxis[index])) {
      this.dashFrames[index] = 0; this.dashAxis[index] = 0;
    }
    let speed = horizontal > 0 ? movement.walkSpeed : movement.backwardWalkSpeed;
    let moveAxis = horizontal;
    if (this.dashFrames[index] > 0 && canDash && !character.crouching) {
      moveAxis = this.dashAxis[index]; speed = moveAxis > 0 ? movement.dashSpeed : movement.backdashSpeed;
      this.dashFrames[index] -= 1; character.mode = 'dashing';
    } else character.mode = !grounded ? 'airborne' : character.crouching ? 'crouching' : horizontal ? 'moving' : 'neutral';
    if (character.crouching) { moveAxis = 0; this.dashFrames[index] = 0; }
    this.moveInDirection(character, moveAxis, index, speed);
  }
  private moveInDirection(character: CharacterState, direction: number, index: number, speed?: number): void {
    if (!direction) return;
    const movement = this.definitions[index].movement;
    const movementSpeed = speed ?? (direction > 0 ? movement.walkSpeed : movement.backwardWalkSpeed);
    character.x += direction * movementSpeed * (character.facing === 'right' ? 1 : -1);
    character.movementDirection = direction > 0 ? 'forward' : 'backward';
  }
  /** Stop outward movement at the shared viewport edge; keep the other fighter anchored. */
  private resolveScreenEdges(previousX: readonly number[]): void {
    const configuredLimit = this.config.arena.maxSeparation;
    if (configuredLimit === undefined) return;
    // Prone bodies occupy more horizontal space; reserve it without changing zoom or dragging the other fighter.
    const extraMargin = Math.max(0, ...this.characters.map(c => c.mode === 'knockdown' ? knockdownRadius(c) - FIGHT_SIDE_MARGIN : 0));
    const limit = Math.max(0, configuredLimit - extraMargin * 2);
    const leftIndex = this.characters[0].x <= this.characters[1].x ? 0 : 1;
    const rightIndex = 1 - leftIndex;
    const left = this.characters[leftIndex], right = this.characters[rightIndex];
    const excess = right.x - left.x - limit;
    if (excess <= 0) return;
    const leftOut = Math.max(0, previousX[leftIndex] - left.x);
    const rightOut = Math.max(0, right.x - previousX[rightIndex]);
    const total = leftOut + rightOut;
    const leftShare = total > 0 ? leftOut / total : .5;
    left.x += excess * leftShare;
    right.x -= excess * (1 - leftShare);
  }
  private resolveWallBounces(previousX: readonly number[], intendedX: readonly number[]): void {
    this.characters.forEach((character, index) => {
      const pending = character.wallBouncePending;
      if (!pending) return;
      const attempted = (intendedX[index] - previousX[index]) * pending.direction;
      const wall = pending.direction > 0 ? this.config.arena.right - wallInset(character) : this.config.arena.left + wallInset(character);
      const reachedWall = (intendedX[index] - wall) * pending.direction >= 0 && (character.x - wall) * pending.direction >= -0.001;
      // The prone collision box is wider than the airborne body. Once it reaches the wall,
      // place the upright bounce body next to the same wall without moving its opponent.
      const visibleWidth = (this.config.arena.viewportWidth ?? this.config.arena.right - this.config.arena.left) / FIGHT_WORLD_SCALE;
      const inset = character.collision.bodyWidth / 2 + visibleWidth * .01;
      const bounceX = pending.direction > 0 ? this.config.arena.right - inset : this.config.arena.left + inset;
      const opponent = this.characters[1 - index];
      const extraMargin = opponent.mode === 'knockdown' ? Math.max(0, knockdownRadius(opponent) - FIGHT_SIDE_MARGIN) : 0;
      const separationLimit = this.config.arena.maxSeparation === undefined ? Infinity : Math.max(0, this.config.arena.maxSeparation - extraMargin * 2);
      const bothVisible = Math.abs(bounceX - opponent.x) <= separationLimit + .001;
      if (attempted > 0 && reachedWall && bothVisible) {
        character.wallBouncePending = undefined;
        character.x = bounceX;
        character.wallBounceEffect = { x: character.x, y: character.y - character.collision.hurtboxes.standing.height / 2, frame: this.frame, direction: pending.direction };
        character.throwPull = undefined; character.throwFlight = undefined; character.knockdown = undefined;
        const frontSpacing = (character.collision.bodyWidth + opponent.collision.bodyWidth) / 2 + 40;
        const returnDistance = Math.max(0, (character.x - opponent.x) * pending.direction - frontSpacing);
        character.pushbackMotion = returnDistance > 0
          ? { distancePerFrame: -pending.direction * returnDistance / 25, remainingFrames: 25 } : undefined;
        character.grounded = false; character.crouching = false; character.mode = 'hitstun';
        character.verticalVelocity = -8; character.airborneStartedFrame = this.frame;
        character.juggle = { gravityScale: (this.definitions[index].juggle?.initialGravityScale ?? 1) * .65, airHits: 0 };
        const attacker = this.characters.find(candidate => candidate.characterId === pending.attackerId);
        if (attacker) {
          attacker.chain = undefined;
          attacker.hitSequence = undefined;
          const attackerIndex = this.characters.indexOf(attacker);
          this.parsers[attackerIndex].clear();
          this.pendingCommands[attackerIndex] = undefined;
          for (const combo of this.comboHistory) {
            if (combo.active && combo.attackerId === attacker.characterId && combo.targetId === character.characterId) combo.active = false;
          }
          const attack = attacker.attack;
          const move = attack && this.move(this.characters.indexOf(attacker), attack.moveId);
          if (attack && move && attack.moveId === pending.moveId && !locked(attacker)) {
            const activeEnd = (attack.startupFrames ?? move.startup) + move.activeFrames;
            attack.recoveryFrames = Math.min(attack.recoveryFrames ?? move.recovery, Math.max(0, attack.elapsedFrames - activeEnd + 4));
          }
        }
        character.remainingStateFrames = flightFramesRemaining(character.y, character.verticalVelocity, this.config.arena.floorY,
          this.config.movement.gravity * character.juggle.gravityScale) + (this.definitions[index].juggle?.getupFrames ?? 0);
      } else if (!character.pushbackMotion && !character.throwPull && !character.throwFlight) character.wallBouncePending = undefined;
    });
  }
  private resolveBodies(previousX = this.characters.map(character => character.x)): void {
    const { left, right } = this.config.arena;
    this.characters.forEach(character => { character.x = clamp(character.x, left + wallInset(character), right - wallInset(character)); });
    const [a, b] = this.characters;
    if (a.throwFlight || b.throwFlight) return;
    const minimum = (a.collision.bodyWidth + b.collision.bodyWidth) / 2;
    if ((!a.grounded || !b.grounded) && Math.abs(a.y - b.y) >= minimum) return;
    const aWasLeft = previousX[0] <= previousX[1];
    if ((aWasLeft ? b.x - a.x : a.x - b.x) >= minimum) return;
    const anchored = (character: CharacterState) => character.grounded &&
      (character.crouching || character.mode === 'blocking' || character.mode === 'blockstun');
    if (anchored(a) && !anchored(b)) b.x = a.x + (aWasLeft ? minimum : -minimum);
    else if (anchored(b) && !anchored(a)) a.x = b.x + (aWasLeft ? -minimum : minimum);
    else {
      const middle = (a.x + b.x) / 2;
      a.x = middle + (aWasLeft ? -minimum / 2 : minimum / 2);
      b.x = middle + (aWasLeft ? minimum / 2 : -minimum / 2);
    }
    const first = aWasLeft ? a : b, second = aWasLeft ? b : a;
    if (first.x < left + wallInset(first)) {
      first.x = left + wallInset(first); second.x = first.x + minimum;
    }
    if (second.x > right - wallInset(second)) {
      second.x = right - wallInset(second); first.x = second.x - minimum;
    }
  }
  private updateFacing(): void {
    const [first, second] = this.characters;
    if (first.x === second.x) return;
    first.facing = first.x < second.x ? 'right' : 'left'; second.facing = first.facing === 'right' ? 'left' : 'right';
  }
  private canEndRound(): boolean {
    if (this.characters.some(c => c.juggle || c.ultimateCapture || (c.knockdown && !c.grounded))) return false;
    const defeated = this.characters.filter(c => c.health === 0);
    if (defeated.length) {
      const ultimateInProgress = this.ultimateActivation || this.characters.some((c, index) => c.attack && this.move(index, c.attack.moveId)?.category === 'ultimate') ||
        this.projectiles.some(projectile => this.definitions.find(fighter => fighter.id === projectile.fighterId)?.moves.find(move => move.id === projectile.attack.moveId)?.category === 'ultimate');
      return !ultimateInProgress && defeated.every(c => c.mode !== 'hitstun' && !c.wallBouncePending && !c.pushbackMotion && !c.throwPull && !c.throwFlight) &&
        !this.pendingThrow && !this.pendingLighters.length;
    }
    return this.roundFramesRemaining === 0;
  }

  private finishRound(): void {
    const [first, second] = this.characters;
    const winner = first.health === second.health ? undefined : first.health > second.health ? 0 : 1;
    this.roundWinnerId = winner === undefined ? undefined : this.characters[winner].characterId;
    this.roundEndReason = winner === undefined ? 'draw' : this.characters.some(character => character.health === 0) ? 'knockout' : 'time';
    if (winner !== undefined) this.roundWins[winner] += 1;
    this.characters.forEach(character => { character.attack = undefined; }); this.projectiles = []; this.pendingLighters = []; this.ultimateActivation = undefined;
    this.phase = 'round-over'; this.roundEndedFrame = this.frame;
    this.transitionFrames = this.roundWins.some(wins => wins >= this.config.match.roundCount)
      ? Math.max(this.config.match.roundEndPauseFrames, 300) : this.config.match.roundEndPauseFrames;
  }
}
