import { AIR_RECOVERY_FREEZE_FRAMES, BREAKER_FREEZE_FRAMES, BREAKER_MISS_FREEZE_FRAMES, BREAKER_PUSH_DISTANCE, BREAKER_PUSH_FRAMES, BREAKER_INVULNERABLE_FRAMES, RAGE_BAR, RAGE_BUFF_COST, RAGE_SEGMENT, RUSH_FREEZE_FRAMES } from '../combat/rage';
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
import { ULTIMATE_ACTIVATION_FRAMES, type UltimateActivation, type ExplosionState } from '../combat/ultimateActivation';
import { createProjectileHitbox } from '../collision/projectileGeometry';
import { flightFramesRemaining } from '../combat/airPhysics';
import { attackDurationFrames } from '../combat/frameData';
import { CONTACT_HITSTOP_FRAMES } from '../combat/hitstop';
import { TEXAS_GRAB_LAUNCH, TEXAS_GRAB_SHOTS } from '../combat/texasGrab';

export interface CombatLogEntry { frame: number; event: HitEvent }
export interface ComboRecord { attackerId: string; targetId: string; hits: number; damage: number; active: boolean; lastFrame: number; starterWeakFamily?: '1' | '3'; usedLightPunch?: boolean; usedStandingLightKick?: boolean; usedWeakKick?: boolean; usedHeavyPunch?: boolean; usedHeavyKick?: boolean; usedAntiAir?: boolean; usedUltimate?: boolean }
export interface SimulationSnapshot {
  /** frame is combat/animation time; elapsedFrames counts every fixed tick, including hitstop. */
  frame: number; elapsedFrames: number; round: number; roundFramesRemaining: number;
  hitstopFramesRemaining: number;
  ultimateActivation?: UltimateActivation;
  explosions: readonly ExplosionState[];
  phase: 'fight' | 'round-over' | 'match-over';
  roundWins: readonly [number, number]; roundWinnerId?: string;
  roundEndedFrame?: number;
  knockoutStartedAt?: number;
  roundEndReason?: 'knockout' | 'time' | 'draw'; matchWinnerId?: string;
  characters: readonly CharacterState[]; activeHitboxes: readonly Hitbox[];
  projectiles: readonly ProjectileState[];
  hitEvents: readonly HitEvent[]; recentContacts: readonly CombatLogEntry[];
  comboHistory: readonly ComboRecord[];
  /** Latest combo breaker attempt per defender, for the HUD notice. */
  breakerNotices: readonly BreakerNotice[];
}
export interface SimulationOptions { training?: boolean; initialDistance?: number }
export function volleyShotDamage(move: MoveDefinition, priorHits: number, shot: number): number {
  if (move.multiHit) {
    const total = Math.max(0, move.damage - priorHits * move.multiHit.damageReductionPerPriorHit);
    return Math.floor(total / move.multiHit.hits) + (shot < total % move.multiHit.hits ? 1 : 0);
  }
  const volley = move.screenVolley!;
  const total = Math.max(0, move.damage * volley.shots - priorHits * (volley.damageReductionPerPriorHit ?? 0));
  return Math.floor(total / volley.shots) + (shot < total % volley.shots ? 1 : 0);
}
const knockdownRadius = (state: CharacterState): number => state.collision.hurtboxes.knockdown.width / 2 + 8;
const wallInset = (state: CharacterState): number => state.mode === 'knockdown' ? knockdownRadius(state) : state.collision.bodyWidth / 2;
const neutral = (): FrameInput => ({ direction: 'N', buttons: new Set() });
/** Single-button weak strike (basic or crouching) on the given button. */
const isWeakButton = (move: MoveDefinition, button: '1' | '3'): boolean =>
  ['basic', 'crouching'].includes(move.category ?? '') && move.input.buttons.length === 1 && move.input.buttons[0] === button;
const chainStrike = (move: MoveDefinition): boolean => ['basic', 'crouching', 'power'].includes(move.category ?? '') && !move.projectile;
const heavyStrike = (move: MoveDefinition): boolean => move.input.buttons.some(button => button === '2' || button === '4');
const heavyButton = (move: MoveDefinition): '2' | '4' | undefined =>
  move.input.buttons.length === 1 && (move.input.buttons[0] === '2' || move.input.buttons[0] === '4') ? move.input.buttons[0] : undefined;
const permitsStrength = (sequence: CharacterState['hitSequence'], move: MoveDefinition): boolean => {
  if (!sequence?.heavy || move.category === 'ultimate' || move.category === 'special') return true;
  if (!heavyStrike(move)) return false;
  return !sequence.heavyButton || move.input.buttons.every(button => button === sequence.heavyButton);
};
const locked = (state: CharacterState): boolean => state.mode === 'hitstun' || state.mode === 'blockstun' || state.mode === 'knockdown';
const axis = (input: FrameInput): number => input.direction.endsWith('F') ? 1 : input.direction.endsWith('B') ? -1 : 0;
const clamp = (value: number, low: number, high: number): number => Math.max(low, Math.min(high, value));
const PERFECT_BLOCK_WINDOW = 3;
const SHOTO_HEAVY_KICKS = new Set(['heavy-kick', 'crouch-heavy-kick']);

export interface BreakerNotice { characterId: string; outcome: 'broken' | 'missed'; frame: number }
/** Deterministic combat. Commands, resources and allowed routes belong to each fighter's data. */
/** Remaining-frame value just above the getup poses, so the lying pose is held. */
const DEFEATED_LYING_FRAMES = 13;

export class Simulation {
  private readonly clock = new FixedStepClock();
  private readonly parsers = [new CommandParser(true, 36), new CommandParser(true, 36)];
  private readonly resolver: AttackResolver;
  private characters: [CharacterState, CharacterState];
  private ultimateActivation?: UltimateActivation;
  private explosions: ExplosionState[] = [];
  private projectiles: ProjectileState[] = [];
  private nextProjectileId = 0;
  private pendingCommands: ({ move: MoveDefinition; expires: number; throwDirection?: CharacterAttack['throwDirection'] } | undefined)[] = [undefined, undefined];
  private frame = 0;
  private elapsedFrames = 0;
  private hitstopFramesRemaining = 0;
  private round = 1;
  private phase: SimulationSnapshot['phase'] = 'fight';
  private roundWins: [number, number] = [0, 0];
  private roundFramesRemaining: number;
  private roundWinnerId?: string;
  private roundEndedFrame?: number;
  private knockoutStartedAt?: number;
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
  private rageActionHeld = [false, false];
  private rushChordHeld = [false, false];
  /** True while the current freeze comes from a rage action (Rush, breaker, air recovery), which also stops the round clock. */
  private clockFrozen = false;
  private preFight = false;
  private breakerNotices: BreakerNotice[] = [];
  private breaker: ({ guess: 'light' | 'heavy'; combo: ComboRecord; failed: boolean } | undefined)[] = [undefined, undefined];
  private previousAxis = [0, 0];
  private guardHeld = [false, false];
  private guardStarted = [-Infinity, -Infinity];
  private tapAxis = [0, 0];
  private tapFrame = [-Infinity, -Infinity];
  private dashFrames = [0, 0];
  private dashAxis = [0, 0];
  /** Direction already held against a dash when it started (back held while dashing forward): it does not cancel it. */
  private dashAgainst = [0, 0];

  constructor(private readonly config: GameConfig,
    private readonly definitions: readonly [CharacterDefinition, CharacterDefinition] = [defaultCharacter, defaultCharacter],
    private readonly options: SimulationOptions = {}) {
    this.roundFramesRemaining = config.match.roundDurationFrames;
    this.characters = this.createCharacters();
    this.resolver = new AttackResolver((fighterId, moveId) => definitions.find(fighter => fighter.id === fighterId)?.moves.find(move => move.id === moveId));
  }
  advance(delta: number, read: (characters: readonly CharacterState[], frame: number) => readonly FrameInput[], afterStep?: (snapshot: SimulationSnapshot) => void | boolean): void {
    this.clock.advance(delta, () => { this.step(read(this.characters, this.frame)); return afterStep?.(this.snapshot()); });
  }
  hasKnockout(): boolean { return this.knockoutStartedAt !== undefined; }
  stepFrame(inputs: readonly FrameInput[]): void { this.clock.reset(); this.step(inputs); }
  snapshot(): SimulationSnapshot {
    return { frame: this.frame, elapsedFrames: this.elapsedFrames, round: this.round, roundFramesRemaining: this.roundFramesRemaining,
      hitstopFramesRemaining: this.hitstopFramesRemaining, ultimateActivation: structuredClone(this.ultimateActivation), explosions: structuredClone(this.explosions),
      phase: this.phase, roundWins: [...this.roundWins], roundWinnerId: this.roundWinnerId, roundEndedFrame: this.roundEndedFrame, knockoutStartedAt: this.knockoutStartedAt,
      roundEndReason: this.roundEndReason, matchWinnerId: this.matchWinnerId,
      characters: structuredClone(this.characters), activeHitboxes: this.phase === 'fight' ? this.resolver.activeHitboxes(this.characters, this.projectiles) : [],
      projectiles: structuredClone(this.projectiles),
      hitEvents: this.lastHitEvents.map(event => ({ ...event })), recentContacts: this.recentContacts.map(entry => ({ frame: entry.frame, event: { ...entry.event } })), comboHistory: structuredClone(this.comboHistory), breakerNotices: structuredClone(this.breakerNotices) };
  }
  clearInputHistory(): void {
    this.clock.reset(); this.parsers.forEach(parser => parser.clear());
    this.jumpHeld.fill(false); this.rageActionHeld.fill(false); this.rushChordHeld.fill(false); this.ultimateHeld.fill(false); this.tauntHeld.fill(false); this.previousAxis.fill(0); this.tapAxis.fill(0); this.tapFrame.fill(-Infinity);
    this.guardHeld.fill(false); this.guardStarted.fill(-Infinity);
    this.dashFrames.fill(0); this.dashAxis.fill(0); this.dashAgainst.fill(0); this.pendingCommands.fill(undefined);
  }
  isMatchOver(): boolean { return this.phase === 'match-over'; }
  /** Starts the match over; in training, `keepRage` only repositions the fighters and leaves their rage as it is. */
  resetMatch(distance?: number, keepRage = false): void {
    if (this.options.training && distance !== undefined && Number.isFinite(distance)) this.trainingDistance = distance;
    // Training only repositions the fighters: finished combos stay listed (closed, and old enough not to show on the HUD).
    const keptCombos = this.options.training ? this.comboHistory.map(combo => ({ ...combo, active: false, lastFrame: Number.NEGATIVE_INFINITY })) : [];
    this.frame = 0; this.elapsedFrames = 0; this.round = 1; this.roundWins = [0, 0]; this.phase = 'fight'; this.matchWinnerId = undefined;
    this.resetRound(keepRage && Boolean(this.options.training));
    this.comboHistory = keptCombos;
  }
  fillTrainingRage(): void {
    if (this.options.training) this.characters.forEach(character => { character.rage = character.maxRage; });
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
      y: floorY, facing: index === 0 ? 'right' : 'left', health: fighter.maxHealth, maxHealth: fighter.maxHealth, rage: 0, maxRage: fighter.rage?.maximum ?? 0,
      mode: 'neutral', stateStartedFrame: this.frame, remainingStateFrames: 0, verticalVelocity: 0,
      grounded: true, crouching: false, hitFlashFrames: 0,
    })) as [CharacterState, CharacterState];
  }
  private resetRound(preserveRage = true): void {
    const rage = preserveRage ? this.characters.map(character => character.rage) : [0, 0];
    this.clearInputHistory(); this.characters = this.createCharacters();
    this.characters.forEach((character, index) => { character.rage = rage[index]; }); this.roundFramesRemaining = this.config.match.roundDurationFrames;
    this.roundWinnerId = undefined; this.roundEndedFrame = undefined; this.knockoutStartedAt = undefined; this.roundEndReason = undefined; this.transitionFrames = 0;
    this.lastHitEvents = []; this.recentContacts = []; this.comboHistory = []; this.breaker = [undefined, undefined]; this.volleyPriorHits.clear(); this.pendingThrow = undefined; this.quietFrames = 0;
    this.hitstopFramesRemaining = 0; this.clockFrozen = false; this.breakerNotices = []; this.ultimateActivation = undefined; this.explosions = []; this.projectiles = []; this.nextProjectileId = 0;
  }
  /** While true fighters can move but no attack or rage input is read, and the round clock waits (the FIGHT title and the grace after it). */
  setPreFight(locked: boolean): void { this.preFight = locked; }
  private step(rawInputs: readonly FrameInput[]): void {
    const inputs = this.preFight ? rawInputs.map(input => ({ ...input, buttons: new Set<AttackButton>(), ultimate: false, taunt: false, rageAction: false })) : rawInputs;
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
    this.readRageActions(inputs);
    this.clearFinishedHitSequences();
    // Read before any world/timer mutation so activation freezes both players symmetrically.
    if (!this.hitstopFramesRemaining) {
      this.characters.forEach((character,index) => this.readCommand(character,index,inputs[index] ?? neutral()));
      const owners: string[] = [];
      this.characters.forEach((character,index) => {
        const move = this.pendingCommands[index]?.move;
        if (move?.category === 'ultimate' && !locked(character) && this.canStart(character,index,move)) {
          if (this.tryBreakerOnMove(index, move)) return;
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
    // The clock pauses until the complete ultimate sequence has finished.
    if (!this.options.training && !this.ultimateInProgress() && !this.clockFrozen && !this.preFight) this.roundFramesRemaining = Math.max(0, this.roundFramesRemaining - 1);
    if (this.hitstopFramesRemaining > 0) {
      this.characters.forEach((character, index) => this.readCommand(character, index, inputs[index] ?? neutral()));
      this.hitstopFramesRemaining -= 1;
      if (!this.hitstopFramesRemaining) this.clockFrozen = false;
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
      if (pending.confirmed && attacker.fighterId === 'texas' && move.id === 'throw-24' &&
          attacker.attack?.throwConfirmedFrame !== undefined &&
          TEXAS_GRAB_SHOTS.some(shot => this.frame - attacker.attack!.throwConfirmedFrame! === shot)) {
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
      } else if (--pending.remaining <= 0 && !pending.confirmed && attacker.fighterId === 'texas' && move.id === 'throw-24') {
        pending.confirmed = true; pending.remaining = TEXAS_GRAB_LAUNCH;
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
    const previousAnimationStates:CharacterAnimationState[]=this.characters.map(c=>({mode:c.mode,stateStartedFrame:c.stateStartedFrame,idleStartedFrame:c.idleStartedFrame,grounded:c.grounded,crouching:c.crouching,movementDirection:c.movementDirection,facing:c.facing,verticalVelocity:c.verticalVelocity}));
    const previousTransitions=this.characters.map(c=>c.animationTransition?{startedFrame:c.animationTransition.startedFrame,from:c.animationTransition.from}:undefined);
    const previousX = this.characters.map(character => character.x);
    const attackingAtInput = this.characters.map(character => Boolean(character.attack));
    const lockedAtInput = this.characters.map(character => locked(character));
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
      // A defeated fighter stays down: hold the lying frame instead of starting the getup.
      const defeatedDown = !this.options.training && character.health === 0 && character.mode === 'knockdown' && character.grounded &&
        character.remainingStateFrames > 0 && character.remainingStateFrames <= DEFEATED_LYING_FRAMES;
      if (defeatedDown) character.remainingStateFrames = DEFEATED_LYING_FRAMES;
      const holdLastStunFrame = defeatedDown || character.remainingStateFrames === 1 &&
        (character.juggle || (character.mode === 'knockdown' && !character.grounded));
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
        if (this.tryBreakerOnMove(index, requested)) return;
        this.startMove(character,index,requested);
      }
      if (character.attack) {
        const move = this.move(index, character.attack.moveId)!;
        const elapsed = character.attack.elapsedFrames;
        if (!character.grounded && !move.movement) this.moveInDirection(character, axis(input), index);
        // A special's own travel ends at contact: once it connects the attacker does not fly over and past the target.
        const stopped = move.category === 'special' && character.attack.hasHit;
        if (move.movement && elapsed < move.movement.until && !stopped) character.x += move.movement.speed * (character.facing === 'right' ? 1 : -1);
        const volley = move.screenVolley;
        const volleyElapsed = elapsed - (character.attack.startupFrames ?? move.startup);
        const volleyShots = volley?.pattern
          ? volley.pattern.flatMap((shot, shotIndex) => shot.frame === volleyElapsed ? [shotIndex] : [])
          : volley && volleyElapsed >= 0 && volleyElapsed % volley.interval === 0 && volleyElapsed / volley.interval < volley.shots
            ? [volleyElapsed / volley.interval] : [];
        const shots = volley ? volleyShots : elapsed === (character.attack.startupFrames ?? move.startup) ? [-1] : [];
        for (const volleyShot of move.projectile ? shots : []) {
          const projectile = move.projectile!;
          const recoil = !character.grounded && (character.chain?.length ?? 0) > 1 ? this.projectileRecipe(index, character.chain ?? [])?.projectileSequence?.airRecoil : undefined;
          if (recoil) character.verticalVelocity = recoil.liftSpeed;
          const volleyOrigin = this.volleyOrigin(character);
          for (const yOffset of projectile.spawnYOffsets ?? [0]) {
            character.attack.projectileId = this.nextProjectileId;
            this.projectiles.push({ id: this.nextProjectileId++, ownerId: character.characterId, fighterId: character.fighterId,
              x: volley ? volleyOrigin : character.x + (character.facing === 'right' ? 1 : -1) * character.collision.bodyWidth * 7 / 12, y: volley ? this.config.arena.floorY - (volley.pattern?.[volleyShot]?.height ?? (volleyShot + 1) * volley.bandHeight) : character.y + yOffset, facing: character.facing,
              ...(volley ? { volleyStep: volleyShot } : {}),
              ...(this.projectileRecipe(index, character.chain ?? []) ? { comboId: character.projectileComboId, comboStep: (character.chain?.length ?? 1) - 1 } : {}),
              velocity: projectile.speed * (character.facing === 'right' ? 1 : -1), remainingFrames: projectile.life,
              verticalVelocity: projectile.verticalSpeed ?? 0, gravity: projectile.gravity ?? 0,
              visual: volley && projectile.visual !== 'crow' ? 'volley' : projectile.visual, attack: { ...character.attack, hasHit: false } });
          }
        }
        const startup = character.attack.startupFrames ?? move.startup;
        character.mode = elapsed < startup ? 'startup' : elapsed < startup + move.activeFrames ? 'active' : 'recovery';
        if (character.fighterId === 'shoto' && move.id === 'crouch-uppercut' && character.mode === 'recovery') {
          character.crouching = character.grounded && input.direction.startsWith('D');
        }
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
      if ((character.fighterId === 'texas' || character.fighterId === 'shoto') && tauntPressed && !input.rageAction && character.mode === 'neutral' && !character.attack) character.tauntStartedFrame = this.frame;
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
          const attackMove = character.attack ? this.move(index, character.attack.moveId) : undefined;
          character.verticalVelocity += this.config.movement.gravity * (character.juggle?.gravityScale ?? recoil?.gravityScale ?? attackMove?.movement?.gravityScale ?? 1);
        }
        if (character.y >= this.config.arena.floorY) {
          if (character.mode === 'dashing') this.dashFrames[index] = 0;
          character.airborneStartedFrame=undefined; character.airborneElapsedFrames=undefined;
          character.y = this.config.arena.floorY; character.grounded = true; character.verticalVelocity = 0;
          character.airDashUsed = false; character.landingRequired = undefined;
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
      if (!owner.attack && !locked(owner) && target?.grounded && target.mode === 'hitstun' && !target.juggle) {
        target.mode = 'neutral'; target.remainingStateFrames = 0; owner.hitSequence = undefined;
      }
    }
    const intendedX = this.characters.map(character => character.x);
    this.resolveBodies(previousX); this.resolveScreenEdges(previousX); this.resolveWallBounces(previousX, intendedX); this.updateFacing();
    this.explosions = this.explosions.map(e => ({ ...e, remainingFrames: e.remainingFrames - 1 })).filter(e => e.remainingFrames > 0);
    this.projectiles.forEach(projectile => {
      projectile.x += projectile.velocity;
      projectile.y += projectile.verticalVelocity ?? 0;
      projectile.verticalVelocity = (projectile.verticalVelocity ?? 0) + (projectile.gravity ?? 0);
      projectile.remainingFrames -= 1;
    });
    for (const character of this.characters) {
      if (character.wallBounceProtection === 'receiving' && !['hitstun', 'knockdown'].includes(character.mode)) {
        character.wallBounceProtection = undefined;
      }
    }
    for (const combo of this.comboHistory) {
      const target = this.characters.find(character => character.characterId === combo.targetId);
      if (combo.active && target && !['hitstun','knockdown'].includes(target.mode)) combo.active = false;
    }
    this.lastHitEvents = this.resolver.resolve(this.characters, inputs, this.projectiles, (attackerId, targetId, move, shot) => {
      const priorHits = this.volleyPriorHits.get(attackerId) ??
        (this.comboHistory.find(combo => combo.active && combo.attackerId === attackerId && combo.targetId === targetId)?.hits ?? 0);
      this.volleyPriorHits.set(attackerId, priorHits);
      return volleyShotDamage(move, priorHits, shot);
    }, event => {
      if (event.outcome !== 'hit') return;
      const targetIndex = this.characters.findIndex(character => character.characterId === event.targetId);
      const attempt = this.breaker[targetIndex];
      if (attempt?.failed && attempt.combo.active) event.damage = Math.round(event.damage * 1.2);
    });
    if (!this.options.training && this.knockoutStartedAt === undefined && this.characters.some(character => character.health === 0)) {
      this.knockoutStartedAt = this.elapsedFrames;
    }
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
      if (event.armored || this.characters[attackerIndex].fighterId !== 'texas' || move?.category !== 'throw' || event.outcome !== 'hit' || this.pendingThrow) return true;
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
      if (hit.outcome !== 'hit') continue;
      let combo = this.comboHistory.find(entry => entry.active && entry.attackerId === hit.attackerId && entry.targetId === hit.targetId);
      if (!combo) {
        const attackerIndex = this.characters.findIndex(character => character.characterId === hit.attackerId);
        const starter = this.move(attackerIndex, hit.moveId);
        const weak = starter && ['basic', 'crouching'].includes(starter.category ?? '') && starter.input.buttons.length === 1 ? starter.input.buttons[0] : undefined;
        combo = { attackerId:hit.attackerId,targetId:hit.targetId,hits:0,damage:0,active:true,lastFrame:this.frame,
          ...(weak === '1' || weak === '3' ? { starterWeakFamily: weak } : {}) };
        this.comboHistory.push(combo);
      }
      combo.hits += 1; combo.damage += hit.damage; combo.lastFrame = this.frame;
      if (hit.moveId === 'light-punch' && this.characters.find(character => character.characterId === hit.attackerId)?.fighterId === 'texas') combo.usedLightPunch = true;
      if (hit.moveId === 'light-kick' && this.characters.find(character => character.characterId === hit.attackerId)?.fighterId === 'texas') combo.usedStandingLightKick = true;
      const hitMove = this.move(this.characters.findIndex(character => character.characterId === hit.attackerId), hit.moveId);
      if (this.characters.find(character => character.characterId === hit.attackerId)?.fighterId === 'shoto' && hitMove && isWeakButton(hitMove, '3')) combo.usedWeakKick = true;
      if (this.characters.find(character => character.characterId === hit.attackerId)?.fighterId === 'shoto' && hit.moveId === 'heavy-punch') combo.usedHeavyPunch = true;
      if (this.characters.find(character => character.characterId === hit.attackerId)?.fighterId === 'shoto' && SHOTO_HEAVY_KICKS.has(hit.moveId)) combo.usedHeavyKick = true;
      if (this.characters.find(character => character.characterId === hit.attackerId)?.fighterId === 'shoto' && hit.moveId === 'crouch-uppercut') combo.usedAntiAir = true;
      if (hitMove?.category === 'ultimate') combo.usedUltimate = true;
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
      const alive = (!p.attack.hasHit || p.volleyStep !== undefined) && p.remainingFrames > 0 && p.x >= this.config.arena.left - 100 && p.x <= this.config.arena.right + 100 && box.y+box.height <= this.config.arena.floorY;
      if (!alive && p.visual === 'dynamite') this.explosions.push({ x:box.x + box.width / 2, y:box.y + box.height / 2, remainingFrames:12, kind:'dynamite', id:p.id, ownerId:p.ownerId });
      return alive;
    });
    if (this.lastHitEvents.length) this.hitstopFramesRemaining = CONTACT_HITSTOP_FRAMES;
    const contactPositions = this.characters.map(character => character.x);
    this.lastHitEvents.forEach(event => {
      const attacker = this.characters.find(character => character.characterId === event.attackerId)!;
      const target = this.characters.find(character => character.characterId === event.targetId)!;
      const attackerIndex = this.characters.indexOf(attacker), targetIndex = this.characters.indexOf(target);
      const sourceMove = this.move(attackerIndex,event.moveId)!;
      if (event.outcome === 'hit' && target.wallBounceProtection === 'waiting') target.wallBounceProtection = 'receiving';
      if (chainStrike(sourceMove) && attacker.attack?.moveId === event.moveId) {
        const previous = attacker.contactSequence;
        const button = sourceMove.input.buttons.length === 1 ? sourceMove.input.buttons[0] : undefined;
        attacker.contactSequence = {
          heavy: Boolean(previous?.heavy || heavyStrike(sourceMove)),
          heavyButton: previous?.heavyButton ?? heavyButton(sourceMove),
          weakFamily: previous?.weakFamily ?? (button === '1' || button === '3' ? button : undefined),
        };
      }
      if (event.armored) {
        const gain = this.definitions[attackerIndex].rage;
        const received = this.definitions[targetIndex].rage;
        if (gain && sourceMove.category !== 'ultimate') attacker.rage = Math.min(attacker.maxRage, attacker.rage + gain.onHit);
        if (received) target.rage = Math.min(target.maxRage, target.rage + received.onDamage);
        this.recentContacts.push({ frame: this.frame, event });
        return;
      }
      if (sourceMove.screenVolley && event.outcome === 'hit') {
        target.grounded = false; target.crouching = false;
        target.airborneStartedFrame ??= this.frame;
        target.verticalVelocity = -6.5;
        if (event.volleyStep === sourceMove.screenVolley.shots - 1) {
          target.mode = 'knockdown';
          target.knockdown = { velocityX: 0 };
          target.remainingStateFrames = (this.definitions[targetIndex].juggle?.getupFrames ?? 36) +
            flightFramesRemaining(target.y, target.verticalVelocity, this.config.arena.floorY, this.config.movement.gravity);
        }
      }
      if (event.outcome === 'hit') target.hitReaction = { level: event.contactHeight ?? sourceMove.hitLevel, startedFrame: this.frame };
      // Taking a hit stands a crouching fighter up, so the combo can go on with a high attack; a block keeps the crouch.
      if (event.outcome === 'hit') target.crouching = false;
      if (event.outcome === 'hit' && sourceMove.category === 'throw') target.grabbedStartedFrame = this.frame;
      if (event.outcome === 'hit' && sourceMove.category === 'throw' && attacker.fighterId === 'shoto') target.ipponReceivedFrame = this.frame;
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
      if ((event.outcome === 'hit' || event.outcome === 'block') && completedCombo?.recoveryFrames !== undefined && attacker.attack?.moveId === event.moveId) {
        attacker.attack.recoveryFrames = completedCombo.recoveryFrames;
      }
      const juggleRules = this.definitions[targetIndex].juggle;
      const repeatedLauncher = Boolean(launcher && target.juggle);
      if (event.outcome === 'hit' && !target.grounded && !launcher && !sourceMove.screenVolley && sourceMove.category !== 'throw') {
        target.verticalVelocity = Math.min(target.verticalVelocity, -2.5);
      }
      if (event.outcome === 'hit' && juggleRules && !repeatedLauncher) {
        if (target.juggle && !target.grounded) {
          target.juggle.airHits += 1;
          target.juggle.suspensionFrames = juggleRules.airHitSuspensionFrames;
          target.juggle.gravityScale = Math.min(juggleRules.maximumGravityScale,
            juggleRules.initialGravityScale + target.juggle.airHits * juggleRules.gravityScalePerHit);
        } else if (launcher) {
          target.juggle = { gravityScale: juggleRules.initialGravityScale, airHits: 0 };
        }
      }
      if (launcher && event.outcome === 'hit') {
        attacker.contactSequence = undefined;
        if (attacker.attack?.moveId === event.moveId) {
          attacker.attack.recoveryFrames = launcher.launch!.recoveryFrames;
          event.attackerRecoveryFrames = attackDurationFrames(sourceMove, attacker.attack) - attacker.attack.elapsedFrames;
        }
        attacker.chain = undefined;
        target.crouching = false;
        if (repeatedLauncher && juggleRules) {
          target.verticalVelocity = Math.max(4, target.verticalVelocity);
          target.juggle = undefined;
          target.mode = 'knockdown'; target.attack = undefined;
          target.knockdown = { velocityX: 0 };
          const flight = flightFramesRemaining(target.y, target.verticalVelocity, this.config.arena.floorY, this.config.movement.gravity);
          target.remainingStateFrames = flight + Math.max(juggleRules.getupFrames, event.attackerRecoveryFrames);
          target.wakeupInvulnerabilityFrames = undefined;
          event.defenderStunFrames = target.remainingStateFrames;
          event.frameAdvantage = event.defenderStunFrames - event.attackerRecoveryFrames;
        } else {
          target.grounded = false;
          target.verticalVelocity = launcher.launch!.velocity;
          target.airborneStartedFrame = this.frame;
        }
      }

      // Multi-hit moves keep the target standing until their last hit, which alone knocks down and pushes.
      if (sourceMove.knockdown && event.outcome === 'hit' && target.grounded && (!sourceMove.multiHit || event.volleyStep === sourceMove.multiHit.hits - 1)) {
        target.mode = 'knockdown'; target.attack = undefined; target.crouching = false;
        target.knockdown = { velocityX: 0 };
        target.remainingStateFrames = Math.max(juggleRules?.getupFrames ?? 36, event.attackerRecoveryFrames);
        target.wakeupInvulnerabilityFrames = target.remainingStateFrames + (juggleRules?.wakeupInvulnerabilityFrames ?? 0);
        event.defenderStunFrames = target.remainingStateFrames;
        event.frameAdvantage = event.defenderStunFrames - event.attackerRecoveryFrames;
      }

      if (target.juggle && juggleRules) {
        target.remainingStateFrames = juggleRules.getupFrames + (target.juggle.suspensionFrames ?? 0) + flightFramesRemaining(target.y, target.verticalVelocity,
          this.config.arena.floorY, this.config.movement.gravity * target.juggle.gravityScale);
        event.defenderStunFrames = target.remainingStateFrames;
        event.frameAdvantage = event.defenderStunFrames - event.attackerRecoveryFrames;
      }
      if (event.outcome === 'hit' && chainStrike(sourceMove) && attacker.attack?.moveId === event.moveId) {
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
      if (event.outcome === 'hit' && sourceMove.id.startsWith('flying-kick-') && attacker.fighterId === 'shoto' && attacker.attack?.moveId === event.moveId) {
        attacker.hitSequence ??= { targetId: target.characterId, heavy: false };
      }
      const gain = this.definitions[attackerIndex].rage;
      const received = this.definitions[targetIndex].rage;
      if (gain && event.outcome === 'hit' && sourceMove.category !== 'ultimate') {
        attacker.rage = Math.min(attacker.maxRage, attacker.rage + gain.onHit);
      }
      if (received) target.rage = Math.min(target.maxRage, target.rage + (event.perfectBlock ? 50 : event.outcome === 'hit' ? received.onDamage : received.onBlock));
      const pushSign = (event.pushbackDirection ?? attacker.facing) === 'right' ? 1 : -1;
      target.wallBouncePending = event.outcome === 'hit' && sourceMove.wallBounce && !target.wallBounceProtection ? { direction: pushSign, attackerId: attacker.characterId, moveId: sourceMove.id } : undefined;
      target.pushbackMotion = undefined;
      target.throwFlight = undefined;
      target.throwPull = undefined;
      if (sourceMove.throwFlight && event.outcome === 'hit') {
        const destination = contactPositions[attackerIndex] + pushSign * (Math.abs(contactPositions[targetIndex] - contactPositions[attackerIndex]) + event.pushback);
        target.throwFlight = true;
        if (attacker.attack?.throwDirection !== 'backward' && !(attacker.fighterId === 'texas' && sourceMove.id === 'throw-24')) {
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
      if (!character.attack || locked(character)) { character.chain = undefined; character.contactSequence = undefined; }
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
      const quiet = this.characters.every(character => !character.attack && !locked(character) && this.projectiles.length === 0);
      this.quietFrames = quiet ? this.quietFrames + 1 : 0;
      if (this.trainingAutoRestore && this.quietFrames >= 90) this.characters.forEach(character => { character.health = character.maxHealth; });
    } else {
      if (!this.hitstopFramesRemaining && this.canEndRound()) this.finishRound();
    }
    this.frame += 1;
  }
  private volleyOrigin(character: CharacterState): number {
    const halfView = (this.config.arena.viewportWidth ?? this.config.arena.right - this.config.arena.left) / (2 * FIGHT_WORLD_SCALE);
    const center = clamp((this.characters[0].x + this.characters[1].x) / 2, this.config.arena.left + halfView, this.config.arena.right - halfView);
    const inset = character.fighterId === 'shoto' ? 0 : 156;
    const edge = character.facing === 'right' ? center - halfView + inset : center + halfView - inset;
    // The volley starts behind both fighters, so an opponent glued to the shooter (or cornered behind the edge point) is still crossed.
    const rearmost = Math.min(character.x, this.characters.find(other => other !== character)?.x ?? character.x);
    const frontmost = Math.max(character.x, this.characters.find(other => other !== character)?.x ?? character.x);
    return character.facing === 'right' ? Math.min(edge, rearmost - 60) : Math.max(edge, frontmost + 60);
  }
  private startMove(character: CharacterState, index: number, move: MoveDefinition): void {
        if (move.screenVolley) this.volleyPriorHits.delete(character.characterId);
        if (move.multiHit) this.volleyPriorHits.set(character.characterId,
          this.comboHistory.find(combo => combo.active && combo.attackerId === character.characterId && combo.targetId === this.characters[1-index].characterId)?.hits ?? 0);
        const previous = character.attack;
        const opponent = this.characters[1 - index];
        if (move.screenVolley && move.projectile && previous?.hitOutcome === 'hit' && opponent.mode === 'hitstun' && opponent.grounded) {
          const origin = this.volleyOrigin(character);
          const travel = Math.ceil(Math.abs(opponent.x - origin) / move.projectile.speed);
          opponent.remainingStateFrames = Math.max(opponent.remainingStateFrames, move.startup + travel + 2);
        }
        const continuingRecipe = this.canContinueRecipe(character, index, move);
        const specialCancel = move.category === 'special' && previous?.hitOutcome === 'hit';
        const target = continuingRecipe || specialCancel ? this.characters[1 - index] : this.characters.find(candidate => candidate.characterId === character.hitSequence?.targetId);
        if (previous?.hitOutcome === 'hit' && (character.hitSequence || continuingRecipe || specialCancel) && (chainStrike(move) || continuingRecipe || specialCancel) &&
            target?.mode === 'hitstun' && target.grounded && !target.juggle) {
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
        const timedRecipe = this.definitions[index].combos?.find(recipe => recipe.startupFrames &&
          character.chain!.length <= recipe.moveIds.length && character.chain!.every((id, step) => id === recipe.moveIds[step]));
        const startupFrames = projectileRecipe?.projectileSequence?.startupFrames[character.chain.length - 1] ??
          timedRecipe?.startupFrames?.[character.chain.length - 1];
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
        character.attack = { moveId: move.id, buttons: move.input.buttons, elapsedFrames: 0, hasHit: false,
          ...(move.charge ? { chargeFrames: 1 } : {}),
          ...(startupFrames !== undefined ? { startupFrames } : {}),
          ...(projectileRecipe && character.chain.length > 1 && move.projectile ? {
            recoveryFrames: Math.max(move.recovery, Math.ceil(Math.abs(projectileTarget.x - character.x) / move.projectile.speed) + 8 - move.activeFrames),
          } : {}),
          ...(move.category === 'throw' ? { throwDirection: this.pendingCommands[index]?.throwDirection ?? 'forward' } : {}) };
        character.crouching = Boolean(move.crouching); this.dashFrames[index] = 0;
        if (character.fighterId === 'shoto' && move.id.startsWith('flying-kick-')) character.landingRequired = true;
        this.pendingCommands[index] = undefined;
        if (move.movement?.launch) {
          character.grounded = false; character.airborneStartedFrame = this.frame;
          character.verticalVelocity = move.movement.launch;
        }
  }
  private readCommand(character: CharacterState, index: number, input: FrameInput): void {
    if (input.rageAction) { this.parsers[index].clear(); this.pendingCommands[index] = undefined; return; }
    if (this.pendingCommands[index] && this.pendingCommands[index]!.expires < this.frame) this.pendingCommands[index] = undefined;
    const moves = this.definitions[index].moves.filter(move => !move.comboOnly);
    const shortcut = Boolean(input.ultimate) && !this.ultimateHeld[index];
    this.ultimateHeld[index] = Boolean(input.ultimate);
    if (shortcut) {
      const ultimates = moves.filter(move => move.category === 'ultimate');
      const selected = ultimates.find(move => move.id === this.definitions[index].defaultUltimateId) ?? (ultimates.length === 1 ? ultimates[0] : undefined);
      if (selected) { this.pendingCommands[index] = { move: selected, expires: this.frame + 6 }; return; }
    }
    let command = this.parsers[index].update(input, this.frame, moves.filter(move => !move.shortcutOnly),
      { airborne: !character.grounded, crouching: input.direction.startsWith('D') && character.grounded });
    if (character.attack?.moveId === 'flying-kick-light' && !character.grounded && command?.id === 'air-light-kick') {
      command = this.move(index, 'flying-kick-followup');
    }
    const authoredContinuation = command && character.chain && this.recipePrefix(index, [...character.chain, command.id]);
    if (command && !authoredContinuation && !permitsStrength(character.hitSequence, command)) {
      this.pendingCommands[index] = undefined; return;
    }
    if (command && command.input.buttons.length === input.buttons.size && (!character.grounded || !input.direction.startsWith('U'))) this.pendingCommands[index] = { move: command, expires: this.frame + 6,
      ...(command.category === 'throw' ? { throwDirection: input.direction.endsWith('B') ? 'backward' : 'forward' } : {}) };
  }
  private readRageActions(inputs: readonly FrameInput[]): void {
    this.characters.forEach((character, index) => {
      const input = inputs[index] ?? neutral();
      if (!input.rageAction) { this.rageActionHeld[index] = false; this.rushChordHeld[index] = false; return; }
      const chord = Boolean(input.taunt), chordStarted = chord && !this.rushChordHeld[index];
      this.rushChordHeld[index] = chord;
      if (chord) { if (chordStarted) this.startRush(character); this.rageActionHeld[index] = true; return; }
      if (this.rageActionHeld[index]) return;
      if (character.rage >= RAGE_BUFF_COST && this.empowerSpecial(character, index)) return;
      if (character.rage < RAGE_SEGMENT) return;
      const combo = this.comboHistory.find(entry => entry.active && entry.targetId === character.characterId);
      const button = [...input.buttons][0];
      if (combo && (character.mode === 'hitstun' || character.mode === 'knockdown') && button && input.buttons.size === 1 && !this.breaker[index]) {
        character.rage -= RAGE_SEGMENT;
        this.breaker[index] = { guess: button === '1' || button === '3' ? 'light' : 'heavy', combo, failed: false };
        this.rageActionHeld[index] = true;
        this.parsers[index].clear(); this.pendingCommands[index] = undefined;
      } else if (!button && !character.grounded && (character.mode === 'hitstun' || character.mode === 'knockdown')) {
        character.rage -= RAGE_SEGMENT; this.rageActionHeld[index] = true;
        character.mode = 'airborne'; character.remainingStateFrames = 0;
        character.juggle = undefined; character.knockdown = undefined; character.throwFlight = false;
        character.wallBouncePending = undefined; character.throwPull = undefined; character.pushbackMotion = undefined;
        character.verticalVelocity = 0;
        for (const entry of this.comboHistory) if (entry.targetId === character.characterId) entry.active = false;
        this.breaker[index] = undefined;
        this.freeze(AIR_RECOVERY_FREEZE_FRAMES);
      }
    });
    this.breaker.forEach((attempt, index) => { if (attempt && !attempt.combo.active) this.breaker[index] = undefined; });
  }

  /** Rush (E + provocação): gasta uma barra cheia, congela os quadros por um instante e não trava o lutador. */
  private startRush(character: CharacterState): void {
    if (character.rush || character.rage < RAGE_BAR || character.mode === 'hitstun' || character.mode === 'knockdown') return;
    character.rage -= RAGE_BAR; character.rush = true; character.tauntStartedFrame = undefined;
    this.freeze(RUSH_FREEZE_FRAMES);
  }

  /** Reforço de especial ou agarrão (E durante o golpe): gasta um segmento de 100. */
  private empowerSpecial(character: CharacterState, index: number): boolean {
    const attack = character.attack;
    const category = attack && this.move(index, attack.moveId)?.category;
    if (!attack || attack.empowered || (category !== 'special' && category !== 'throw')) return false;
    attack.empowered = true;
    this.projectiles.forEach(projectile => { if (projectile.ownerId === character.characterId && projectile.attack.moveId === attack.moveId) projectile.attack.empowered = true; });
    character.rage -= RAGE_BUFF_COST; this.rageActionHeld[index] = true;
    return true;
  }

  private tryBreakerOnMove(attackerIndex: number, move: MoveDefinition): boolean {
    const targetIndex = 1 - attackerIndex;
    const attempt = this.breaker[targetIndex];
    if (!attempt || attempt.failed || !attempt.combo.active || attempt.combo.attackerId !== this.characters[attackerIndex].characterId) return false;
    const strength = move.input.buttons.some(button => button === '2' || button === '4') ? 'heavy' : 'light';
    if (attempt.guess !== strength) {
      attempt.failed = true;
      this.noteBreaker(targetIndex, 'missed'); this.freeze(BREAKER_MISS_FREEZE_FRAMES);
      return false;
    }
    this.breakCombo(targetIndex, this.characters[attackerIndex].characterId);
    return true;
  }

  /** Freezes both fighters, projectiles and the round clock, as rage actions do. */
  private freeze(frames: number): void {
    this.hitstopFramesRemaining = Math.max(this.hitstopFramesRemaining, frames); this.clockFrozen = true;
  }
  private noteBreaker(targetIndex: number, outcome: BreakerNotice['outcome']): void {
    const characterId = this.characters[targetIndex].characterId;
    this.breakerNotices = [...this.breakerNotices.filter(notice => notice.characterId !== characterId), { characterId, outcome, frame: this.frame }];
  }

  private breakCombo(targetIndex: number, attackerId: string): void {
    const target = this.characters[targetIndex];
    const attacker = this.characters.find(character => character.characterId === attackerId);
    if (!attacker) return;
    this.breaker[targetIndex] = undefined;
    for (const entry of this.comboHistory) if (entry.targetId === target.characterId) entry.active = false;
    for (const character of [target, attacker]) {
      character.attack = undefined; character.chain = undefined; character.hitSequence = undefined; character.contactSequence = undefined;
      // A fighter still in the air keeps its height and falls on its own; only grounded ones return to neutral.
      const inAir = !character.grounded;
      character.mode = inAir ? 'airborne' : 'neutral'; character.remainingStateFrames = 0; character.crouching = false; character.airDashUsed = false;
      if (!inAir) { character.y = this.config.arena.floorY; character.airborneStartedFrame = undefined; character.airborneElapsedFrames = undefined; }
      character.grabbedStartedFrame = undefined; character.grabbedHold = undefined; character.wakeupInvulnerabilityFrames = undefined;
      character.juggle = undefined; character.knockdown = undefined; character.throwFlight = false;
      character.wallBouncePending = undefined; character.throwPull = undefined; character.pushbackMotion = undefined; character.verticalVelocity = 0;
    }
    this.projectiles = this.projectiles.filter(projectile => projectile.ownerId !== attackerId);
    this.pendingCommands.fill(undefined); this.parsers.forEach(parser => parser.clear());
    this.pendingThrow = undefined;
    // The broken attacker is shoved away, still standing and with nothing queued.
    const away = attacker.x >= target.x ? 1 : -1;
    attacker.pushbackMotion = { distancePerFrame: away * BREAKER_PUSH_DISTANCE / BREAKER_PUSH_FRAMES, remainingFrames: BREAKER_PUSH_FRAMES };
    // The defender who broke the combo cannot be hit again until both fighters have repositioned.
    target.wakeupInvulnerabilityFrames = BREAKER_INVULNERABLE_FRAMES;
    this.noteBreaker(targetIndex, 'broken'); this.freeze(BREAKER_FREEZE_FRAMES);
  }

  private clearFinishedHitSequences(): void {
    for (const owner of this.characters) {
      const target = this.characters.find(character => character.characterId === owner.hitSequence?.targetId);
      if (locked(owner) || !target || !locked(target)) owner.hitSequence = undefined;
    }
  }
  private canStart(character: CharacterState, index: number, move: MoveDefinition): boolean {
    if ((move.rageCost ?? 0) > character.rage) return false;
    if (Boolean(move.airborne) !== !character.grounded) return false;
    const previous = character.attack;
    // Bob: after a flying kick he must reach the floor before another attack; only its authored follow-up stays.
    if (character.landingRequired && move.airborne && move.id !== 'flying-kick-followup') return false;
    // An ultimate is always the last attack of a combo: nothing new starts until its target has recovered.
    if (this.comboHistory.some(combo => combo.active && combo.attackerId === character.characterId && combo.usedUltimate)) return false;
    // Bob: the power kick (3+4) finishes a combo; nothing, not even a special or the ultimate, continues after it connects.
    if (this.definitions[index].id === 'shoto' && previous?.moveId === 'power-kick' && previous.hasHit) return false;
    if (move.id === 'flying-kick-followup') {
      const starter = previous?.moveId === 'flying-kick-light' ? this.move(index, previous.moveId) : undefined;
      return Boolean(starter && previous && previous.elapsedFrames >= starter.startup);
    }
    if (move.category === 'special' && previous) {
      const previousMove = this.move(index, previous.moveId);
      return (previous.hitOutcome === 'hit' || previous.hitOutcome === 'block') && ['basic', 'crouching', 'power'].includes(previousMove?.category ?? '');
    }
    if (this.definitions[index].id === 'shoto' && ['basic', 'crouching'].includes(move.category ?? '') && move.input.buttons.length === 1 && (move.input.buttons[0] === '1' || move.input.buttons[0] === '2')) {
      const combo = this.comboHistory.find(entry => entry.active && entry.attackerId === character.characterId && entry.targetId === this.characters[1 - index].characterId);
      if (combo?.starterWeakFamily === '3' || character.contactSequence?.weakFamily === '3') return false;
      // A weak kick may follow a weak punch, never the reverse, so 1,1,3,3,1,1,3,3… cannot loop.
      if (combo?.usedWeakKick && isWeakButton(move, '1')) return false;
    }
    // Bob: once a standing heavy punch connects, or the anti-air (d+2) itself, the anti-air is out for the rest of that combo.
    if (this.definitions[index].id === 'shoto' && move.id === 'crouch-uppercut' &&
        this.comboHistory.some(combo => combo.active && combo.attackerId === character.characterId && (combo.usedHeavyPunch || combo.usedAntiAir))) return false;
    // Bob: one heavy kick per combo; a flying kick in between does not grant another.
    if (this.definitions[index].id === 'shoto' && SHOTO_HEAVY_KICKS.has(move.id) &&
        this.comboHistory.some(combo => combo.active && combo.attackerId === character.characterId && combo.usedHeavyKick)) return false;
    // Bob: a standing and a crouching heavy kick never follow each other, in either order.
    if (this.definitions[index].id === 'shoto' && previous && SHOTO_HEAVY_KICKS.has(move.id) && SHOTO_HEAVY_KICKS.has(previous.moveId) && previous.moveId !== move.id) return false;
    if (this.definitions[index].id === 'texas' && move.id === 'light-kick' && previous?.moveId !== 'light-kick' &&
        this.comboHistory.some(combo => combo.active && combo.attackerId === character.characterId && combo.targetId === this.characters[1-index].characterId && combo.usedStandingLightKick)) return false;
    if (this.definitions[index].id === 'texas' && move.id === 'crouch-light-kick' &&
        this.comboHistory.some(combo => combo.active && combo.attackerId === character.characterId && combo.targetId === this.characters[1-index].characterId && combo.usedStandingLightKick)) return false;
    if (this.definitions[index].id === 'texas' && move.id === 'light-punch' && previous?.moveId !== 'light-punch' &&
        this.comboHistory.some(combo => combo.active && combo.attackerId === character.characterId && combo.targetId === this.characters[1-index].characterId && combo.usedLightPunch)) return false;
    if (move.category !== 'ultimate' && !move.screenVolley && (previous?.hitOutcome === 'hit' || previous?.hitOutcome === 'block') && character.chain && this.definitions[index].combos?.some(recipe =>
      !recipe.launch && recipe.moveIds.length === character.chain!.length &&
      recipe.moveIds.every((id, i) => id === character.chain![i]) && (recipe.endsBasicChain || heavyStrike(this.move(index, previous.moveId)!)))) return false;
    const authoredContinuation = character.chain && this.recipePrefix(index, [...character.chain, move.id]);
    if (!authoredContinuation && !permitsStrength(character.hitSequence, move)) return false;
    if (!authoredContinuation && character.contactSequence && !permitsStrength({ ...character.contactSequence, targetId: this.characters[1 - index].characterId }, move)) return false;
    if (!previous) return true;
    if (authoredContinuation && previous.hitOutcome === 'hit') return true;
    if (this.canContinueRecipe(character, index, move)) return true;
    // A chord completed within the input grace window replaces its uncommitted single. Never a move that spent rage:
    // an ultimate's activation freezes its frame count, so its end would still look like that window.
    if (!this.move(index, previous.moveId)?.rageCost && !previous.hasHit && previous.elapsedFrames <= 3 && move.input.buttons.length > previous.buttons.length &&
      previous.buttons.every(button => move.input.buttons.includes(button))) return true;
    const chain = [...(character.chain ?? [previous.moveId]), move.id];
    const projectileRecipe = this.projectileRecipe(index, chain);
    if (projectileRecipe && previous.hitOutcome === 'block' && projectileRecipe.projectileSequence!.continueOnBlock) return true;
    if (projectileRecipe && previous.hitOutcome === 'hit') return true;
    if (!previous.hasHit) {
      const previousMove = this.move(index, previous.moveId)!;
      return previous.elapsedFrames >= (previous.startupFrames ?? previousMove.startup) + previousMove.activeFrames && this.recipePrefix(index, chain);
    }
    if (previous.hitOutcome === 'block') {
      const previousMove = this.move(index, previous.moveId)!;
      return ['basic', 'crouching', 'power'].includes(move.category ?? '') &&
        ['basic', 'crouching', 'power'].includes(previousMove.category ?? '') &&
        (previous.moveId !== move.id || this.recipePrefix(index, chain));
    }
    if (move.screenVolley && previous.hitOutcome === 'hit' && this.characters[1-index].mode === 'hitstun') return true;
    if (previous.hitOutcome !== 'hit' || !character.hitSequence) return false;
    if (move.category === 'ultimate') return true;
    // Power moves (1+2 / 3+4) may finish a chain even when they fire a projectile, like Texas's double shot.
    if (!chainStrike(move) && move.category !== 'power') return false;
    const previousMove = this.move(index, previous.moveId)!;
    if (!chainStrike(previousMove) && !(character.fighterId === 'shoto' && previousMove.id.startsWith('flying-kick-'))) return false;
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
    // The next recipe never begins with the move that just hit, so a recipe that continues cannot restart itself
    // through another recipe opening with that move (3,3,3 then 3 again).
    if (move.id === character.attack.moveId) return false;
    const combos = this.definitions[index].combos ?? [];
    const starter = this.move(index, character.attack.moveId)?.startsComboOnHit;
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
        this.dashFrames[index] = movement.dashDurationFrames ?? this.config.movement.dashDurationFrames; this.dashAxis[index] = horizontal; this.dashAgainst[index] = 0;
        if (!grounded) character.airDashUsed = true;
      }
      this.tapAxis[index] = horizontal; this.tapFrame[index] = this.frame;
    }
    if(canDash && !character.crouching && this.dashFrames[index]===0 && input.dash){
      this.dashAxis[index]=input.dash==='F'?1:-1;this.dashAgainst[index]=this.previousAxis[index]===-this.dashAxis[index]?this.previousAxis[index]:0;this.dashFrames[index]=movement.dashDurationFrames ?? this.config.movement.dashDurationFrames;
      if (!grounded) character.airDashUsed = true;
    }
    this.previousAxis[index] = horizontal;
    if (character.crouching) {
      this.dashFrames[index] = 0; this.dashAxis[index] = 0; character.mode = 'crouching'; return;
    }
    if (!canDash || (horizontal !== 0 && this.dashFrames[index] > 0 && horizontal !== this.dashAxis[index] && horizontal !== this.dashAgainst[index])) {
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
        character.wallBounceProtection = 'waiting';
        character.x = bounceX;
        character.wallBounceEffect = { x: character.x, y: character.y - character.collision.hurtboxes.standing.height / 2, frame: this.frame, direction: pending.direction };
        character.throwPull = undefined; character.throwFlight = undefined; character.knockdown = undefined;
        // The knockdown that carried the fighter into the wall must not keep it invulnerable after the bounce.
        character.wakeupInvulnerabilityFrames = undefined;
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
  private ultimateInProgress(): boolean {
    return Boolean(this.ultimateActivation || this.characters.some((character, index) =>
      (character.attack && this.move(index, character.attack.moveId)?.category === 'ultimate')) ||
      this.projectiles.some(projectile => this.definitions.find(fighter => fighter.id === projectile.fighterId)?.moves
        .find(move => move.id === projectile.attack.moveId)?.category === 'ultimate'));
  }

  private canEndRound(): boolean {
    if (this.characters.some(c => c.juggle || (c.knockdown && !c.grounded))) return false;
    const defeated = this.characters.filter(c => c.health === 0);
    if (defeated.length) {
      return (this.knockoutStartedAt === undefined || this.elapsedFrames - this.knockoutStartedAt >= 30) &&
        !this.ultimateInProgress() && this.characters.every(c => !c.attack) && defeated.every(c => c.mode !== 'hitstun' && !c.wallBouncePending && !c.pushbackMotion && !c.throwPull && !c.throwFlight) &&
        !this.pendingThrow;
    }
    return this.roundFramesRemaining === 0;
  }

  private finishRound(): void {
    const [first, second] = this.characters;
    const winner = first.health === second.health ? undefined : first.health > second.health ? 0 : 1;
    this.roundWinnerId = winner === undefined ? undefined : this.characters[winner].characterId;
    this.roundEndReason = winner === undefined ? 'draw' : this.characters.some(character => character.health === 0) ? 'knockout' : 'time';
    if (winner !== undefined) this.roundWins[winner] += 1;
    this.characters.forEach(character => { character.attack = undefined; }); this.projectiles = []; this.ultimateActivation = undefined;
    this.phase = 'round-over'; this.roundEndedFrame = this.frame;
    this.transitionFrames = this.config.match.roundEndPauseFrames;
  }
}
