import type { CharacterState, CharacterAnimationState, CharacterAttack } from '../characters/CharacterState';
import { AttackResolver, type HitEvent } from '../combat/AttackResolver';
import { defaultCharacter, type CharacterDefinition } from '../data/characters';
import type { GameConfig } from '../data/gameConfig';
import { FIGHT_SIDE_MARGIN } from '../data/fightFraming';
import type { MoveDefinition } from '../data/moves';
import { CommandParser } from '../../input/CommandBuffer';
import type { FrameInput } from '../../input/types';
import type { Hitbox } from '../collision/types';
import { FixedStepClock } from './FixedStepClock';
import type { ProjectileState } from '../combat/ProjectileState';
import { ULTIMATE_ACTIVATION_FRAMES, type UltimateActivation, type PendingUltimateLighter, type ExplosionState } from '../combat/ultimateActivation';
import { createProjectileHitbox } from '../collision/projectileGeometry';
import { flightFramesRemaining } from '../combat/airPhysics';
import { attackDurationFrames } from '../combat/frameData';
import { CONTACT_HITSTOP_FRAMES } from '../combat/hitstop';

export interface CombatLogEntry { frame: number; event: HitEvent }
export interface SimulationSnapshot {
  /** frame is combat/animation time; elapsedFrames counts every fixed tick, including hitstop. */
  frame: number; elapsedFrames: number; round: number; roundFramesRemaining: number;
  hitstopFramesRemaining: number;
  ultimateActivation?: UltimateActivation;
  explosions: readonly ExplosionState[];
  phase: 'fight' | 'round-over' | 'match-over';
  roundWins: readonly [number, number]; roundWinnerId?: string;
  roundEndReason?: 'knockout' | 'time' | 'draw'; matchWinnerId?: string;
  characters: readonly CharacterState[]; activeHitboxes: readonly Hitbox[];
  projectiles: readonly ProjectileState[];
  hitEvents: readonly HitEvent[]; recentContacts: readonly CombatLogEntry[];
}
export interface SimulationOptions { training?: boolean; initialDistance?: number }
const knockdownRadius = (state: CharacterState): number => state.collision.hurtboxes.knockdown.width / 2 + 8;
const wallInset = (state: CharacterState): number => state.mode === 'knockdown' ? knockdownRadius(state) : state.collision.bodyWidth / 2;
const neutral = (): FrameInput => ({ direction: 'N', buttons: new Set() });
const chainStrike = (move: MoveDefinition): boolean => ['basic', 'crouching', 'power'].includes(move.category ?? '') && !move.projectile;
const heavyStrike = (move: MoveDefinition): boolean => move.input.buttons.some(button => button === '2' || button === '4');
const locked = (state: CharacterState): boolean => state.mode === 'hitstun' || state.mode === 'blockstun' || state.mode === 'knockdown';
const axis = (input: FrameInput): number => input.direction.endsWith('F') ? 1 : input.direction.endsWith('B') ? -1 : 0;
const clamp = (value: number, low: number, high: number): number => Math.max(low, Math.min(high, value));

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
  private roundEndReason?: SimulationSnapshot['roundEndReason'];
  private matchWinnerId?: string;
  private transitionFrames = 0;
  private lastHitEvents: HitEvent[] = [];
  private recentContacts: CombatLogEntry[] = [];
  private trainingDistance?: number;
  private trainingAutoRestore = false;
  private quietFrames = 0;
  private jumpHeld = [false, false];
  private previousAxis = [0, 0];
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
  advance(delta: number, read: (characters: readonly CharacterState[], frame: number) => readonly FrameInput[]): void {
    this.clock.advance(delta, () => this.step(read(this.characters, this.frame)));
  }
  stepFrame(inputs: readonly FrameInput[]): void { this.clock.reset(); this.step(inputs); }
  snapshot(): SimulationSnapshot {
    return { frame: this.frame, elapsedFrames: this.elapsedFrames, round: this.round, roundFramesRemaining: this.roundFramesRemaining,
      hitstopFramesRemaining: this.hitstopFramesRemaining, ultimateActivation: structuredClone(this.ultimateActivation), explosions: structuredClone(this.explosions),
      phase: this.phase, roundWins: [...this.roundWins], roundWinnerId: this.roundWinnerId,
      roundEndReason: this.roundEndReason, matchWinnerId: this.matchWinnerId,
      characters: structuredClone(this.characters), activeHitboxes: this.phase === 'fight' ? this.resolver.activeHitboxes(this.characters, this.projectiles) : [],
      projectiles: structuredClone(this.projectiles),
      hitEvents: this.lastHitEvents.map(event => ({ ...event })), recentContacts: this.recentContacts.map(entry => ({ frame: entry.frame, event: { ...entry.event } })) };
  }
  clearInputHistory(): void {
    this.clock.reset(); this.parsers.forEach(parser => parser.clear());
    this.jumpHeld.fill(false); this.previousAxis.fill(0); this.tapAxis.fill(0); this.tapFrame.fill(-Infinity);
    this.dashFrames.fill(0); this.dashAxis.fill(0); this.pendingCommands.fill(undefined);
  }
  isMatchOver(): boolean { return this.phase === 'match-over'; }
  resetMatch(distance?: number): void {
    if (this.options.training && distance !== undefined && Number.isFinite(distance)) this.trainingDistance = distance;
    this.frame = 0; this.elapsedFrames = 0; this.round = 1; this.roundWins = [0, 0]; this.phase = 'fight'; this.matchWinnerId = undefined;
    this.ultimateUsed = [false, false];
    this.resetRound();
  }
  fillTrainingRage(): void {
    if (this.options.training) this.characters.forEach(character => { if (!character.ultimateUsed) character.rage = character.maxRage; });
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
  private resetRound(): void {
    this.clearInputHistory(); this.characters = this.createCharacters(); this.roundFramesRemaining = this.config.match.roundDurationFrames;
    this.roundWinnerId = undefined; this.roundEndReason = undefined; this.transitionFrames = 0;
    this.lastHitEvents = []; this.recentContacts = []; this.quietFrames = 0;
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
      if (!this.hitstopFramesRemaining && !this.options.training && !this.characters.some(c=>c.juggle || c.ultimateCapture || (c.knockdown && !c.grounded)) &&
        (this.characters.some(character => character.health === 0) || this.roundFramesRemaining === 0)) this.finishRound();
      return;
    }
    const previousAnimationStates:CharacterAnimationState[]=this.characters.map(c=>({mode:c.mode,stateStartedFrame:c.stateStartedFrame,grounded:c.grounded,crouching:c.crouching,movementDirection:c.movementDirection,facing:c.facing,verticalVelocity:c.verticalVelocity}));
    const previousTransitions=this.characters.map(c=>c.animationTransition?{startedFrame:c.animationTransition.startedFrame,from:c.animationTransition.from}:undefined);
    const previousX = this.characters.map(character => character.x);
    const attackingAtInput = this.characters.map(character => Boolean(character.attack));
    const lockedAtInput = this.characters.map(character => locked(character) || this.heldByUltimate(character));
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
        character.attack.elapsedFrames += 1;
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
        if (move.projectile && elapsed === move.startup) {
          this.projectiles.push({ id: this.nextProjectileId++, ownerId: character.characterId, fighterId: character.fighterId,
            x: character.x + (character.facing === 'right' ? 1 : -1) * character.collision.bodyWidth * 7 / 12, y: character.y, facing: character.facing,
            velocity: move.projectile.speed * (character.facing === 'right' ? 1 : -1), remainingFrames: move.projectile.life,
            verticalVelocity: move.projectile.verticalSpeed ?? 0, gravity: move.projectile.gravity ?? 0, phase: move.ultimateSequence ? 'confirm' : undefined,
            visual: move.projectile.visual, attack: { ...character.attack, hasHit: false } });
        }
        character.mode = elapsed < move.startup ? 'startup' : elapsed < move.startup + move.activeFrames ? 'active' : 'recovery';
      } else if (!wasLocked) {
        character.crouching = character.grounded && input.direction.startsWith('D');
        const threatening = Boolean(attackingAtInput[1 - index] || opponent.attack || commands[1 - index] || this.projectiles.some(p => p.ownerId === opponent.characterId));
        const guard = threatening && (input.direction === 'B' || input.direction === 'DB');
        if (guard) {
          if(!character.grounded)this.moveCharacter(character,input,index);
          character.mode = 'blocking'; this.dashFrames[index] = 0;
        }
        else this.moveCharacter(character, input, index);
      } else this.dashFrames[index] = 0;
      if (character.knockdown) { character.x += character.knockdown.velocityX; character.knockdown.velocityX *= .94; }
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
        } else {
          character.y += character.verticalVelocity;
          character.verticalVelocity += this.config.movement.gravity * (character.juggle?.gravityScale ?? 1);
        }
        if (character.y >= this.config.arena.floorY) {
          character.airborneStartedFrame=undefined; character.airborneElapsedFrames=undefined;
          character.y = this.config.arena.floorY; character.grounded = true; character.verticalVelocity = 0;
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
    this.resolveBodies(previousX); this.resolveScreenEdges(previousX); this.updateFacing();
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
    this.lastHitEvents = this.resolver.resolve(this.characters, inputs, this.projectiles);
    this.projectiles = this.projectiles.filter(p => {
      const move = this.definitions.find(f=>f.id===p.fighterId)!.moves.find(m=>m.id===p.attack.moveId)!;
      const box = createProjectileHitbox(p,move);
      return !p.attack.hasHit && p.remainingFrames > 0 && p.x >= this.config.arena.left - 100 && p.x <= this.config.arena.right + 100 && box.y+box.height <= this.config.arena.floorY;
    });
    if (this.lastHitEvents.length) this.hitstopFramesRemaining = CONTACT_HITSTOP_FRAMES;
    const contactPositions = this.characters.map(character => character.x);
    this.lastHitEvents.forEach(event => {
      const attacker = this.characters.find(character => character.characterId === event.attackerId)!;
      const target = this.characters.find(character => character.characterId === event.targetId)!;
      const attackerIndex = this.characters.indexOf(attacker), targetIndex = this.characters.indexOf(target);
      const sourceMove = this.move(attackerIndex,event.moveId)!;
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
        attacker.hitSequence = { targetId: target.characterId, heavy: !launcher && Boolean(attacker.hitSequence?.heavy || heavyStrike(sourceMove)) };
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
      if (gain && !attacker.ultimateUsed && !this.move(attackerIndex, event.moveId)?.rageCost) attacker.rage = Math.min(attacker.maxRage, attacker.rage + (event.outcome === 'hit' ? gain.onHit : gain.onBlock));
      if (received && !target.ultimateUsed && event.stage !== 'confirm') target.rage = Math.min(target.maxRage, target.rage + (event.outcome === 'hit' ? received.onDamage : received.onBlock));
      const pushSign = (event.pushbackDirection ?? attacker.facing) === 'right' ? 1 : -1;
      if (sourceMove.category === 'throw' && event.outcome === 'hit') {
        target.x = contactPositions[attackerIndex] + pushSign * (Math.abs(contactPositions[targetIndex] - contactPositions[attackerIndex]) + event.pushback);
      } else target.x += event.pushback * pushSign;
      this.recentContacts.push({ frame: this.frame, event });
    });
    this.recentContacts = this.recentContacts.filter(entry => this.frame - entry.frame < 180).slice(-20);
    this.resolveBodies(); this.resolveScreenEdges(previousX); this.updateFacing();
    this.characters.forEach((character,index)=>{
      if (!character.attack || locked(character)) character.chain = undefined;
      const previous=previousAnimationStates[index];
      if(character.mode!==previous.mode)character.stateStartedFrame=this.frame;
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
      if (!this.hitstopFramesRemaining && !this.characters.some(c=>c.juggle || c.ultimateCapture || (c.knockdown && !c.grounded)) &&
        (this.characters.some(character => character.health === 0) || this.roundFramesRemaining === 0)) this.finishRound();
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
  private startMove(character: CharacterState, index: number, move: MoveDefinition): void {
        const previous = character.attack;
        const target = this.characters.find(candidate => candidate.characterId === character.hitSequence?.targetId);
        if (previous?.hitOutcome === 'hit' && character.hitSequence && chainStrike(move) &&
            target?.mode === 'hitstun' && target.grounded && !target.juggle && !target.ultimateCapture) {
          // A continuation started during hitstun keeps the defender exposed through its contact window.
          target.remainingStateFrames = Math.max(target.remainingStateFrames, move.startup + move.activeFrames + 1);
        }
        const promotion = previous && previous.elapsedFrames <= 3 && !previous.hasHit &&
          move.input.buttons.length > previous.buttons.length;
        const chain = previous && !promotion ? [...(character.chain ?? [previous.moveId]), move.id] : [move.id];
        character.chain = this.recipePrefix(index, chain) ? chain : [move.id];
        if (character.hitSequence && heavyStrike(move)) character.hitSequence.heavy = true;
        character.rage = Math.max(0, character.rage - (move.rageCost ?? 0));
        if (move.category === 'ultimate') { this.ultimateUsed[index] = true; character.ultimateUsed = true; }
        character.attack = { moveId: move.id, buttons: move.input.buttons, elapsedFrames: 0, hasHit: false,
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
    const moves = this.definitions[index].moves;
    const command = this.parsers[index].update(input, this.frame, moves,
      { airborne: !character.grounded, crouching: input.direction.startsWith('D') && character.grounded });
    if (this.heldByUltimate(character) || (command && character.hitSequence?.heavy && !heavyStrike(command))) {
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
    if ((move.rageCost ?? 0) > character.rage || (move.category === 'ultimate' && character.ultimateUsed)) return false;
    if (Boolean(move.airborne) !== !character.grounded) return false;
    const previous = character.attack;
    if (character.hitSequence?.heavy && !heavyStrike(move)) return false;
    if (!previous) return true;
    // A chord completed within the input grace window replaces its uncommitted single.
    if (!previous.hasHit && previous.elapsedFrames <= 3 && move.input.buttons.length > previous.buttons.length &&
      previous.buttons.every(button => move.input.buttons.includes(button))) return true;
    const chain = [...(character.chain ?? [previous.moveId]), move.id];
    if (!previous.hasHit) {
      const previousMove = this.move(index, previous.moveId)!;
      return previous.elapsedFrames >= previousMove.startup + previousMove.activeFrames && this.recipePrefix(index, chain);
    }
    if (previous.hitOutcome === 'block') return false;
    if (previous.hitOutcome !== 'hit' || !character.hitSequence) return false;
    if (move.category === 'ultimate') return true;
    if (!chainStrike(move)) return false;
    const previousMove = this.move(index, previous.moveId)!;
    if (!chainStrike(previousMove)) return false;
    return previous.moveId !== move.id || this.recipePrefix(index, chain);
  }
  private recipePrefix(index: number, chain: readonly string[]): boolean {
    return (this.definitions[index].combos ?? []).some(recipe =>
      chain.length <= recipe.moveIds.length && chain.every((id, step) => recipe.moveIds[step] === id));
  }

  private move(index: number, id: string): MoveDefinition | undefined { return this.definitions[index].moves.find(move => move.id === id); }
  private moveCharacter(character: CharacterState, input: FrameInput, index: number): void {
    const horizontal = axis(input);
    const movement = this.definitions[index].movement;
    const grounded = character.grounded;
    if (grounded && !character.crouching && horizontal && horizontal !== this.previousAxis[index]) {
      if (this.dashFrames[index] === 0 && this.tapAxis[index] === horizontal && this.frame - this.tapFrame[index] <= this.config.movement.doubleTapWindowFrames) {
        this.dashFrames[index] = this.config.movement.dashDurationFrames; this.dashAxis[index] = horizontal;
      }
      this.tapAxis[index] = horizontal; this.tapFrame[index] = this.frame;
    }
    if(grounded && !character.crouching && this.dashFrames[index]===0 && input.dash){
      this.dashAxis[index]=input.dash==='F'?1:-1;this.dashFrames[index]=this.config.movement.dashDurationFrames;
    }
    this.previousAxis[index] = horizontal;
    if (character.crouching) {
      this.dashFrames[index] = 0; this.dashAxis[index] = 0; character.mode = 'crouching'; return;
    }
    if (!grounded || (horizontal !== 0 && this.dashFrames[index] > 0 && horizontal !== this.dashAxis[index])) {
      this.dashFrames[index] = 0; this.dashAxis[index] = 0;
    }
    let speed = horizontal > 0 ? movement.walkSpeed : movement.backwardWalkSpeed;
    let moveAxis = horizontal;
    if (this.dashFrames[index] > 0 && grounded && !character.crouching) {
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
  private resolveBodies(previousX = this.characters.map(character => character.x)): void {
    const { left, right } = this.config.arena;
    this.characters.forEach(character => { character.x = clamp(character.x, left + wallInset(character), right - wallInset(character)); });
    const [a, b] = this.characters;
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
  private finishRound(): void {
    const [first, second] = this.characters;
    const winner = first.health === second.health ? undefined : first.health > second.health ? 0 : 1;
    this.roundWinnerId = winner === undefined ? undefined : this.characters[winner].characterId;
    this.roundEndReason = winner === undefined ? 'draw' : this.characters.some(character => character.health === 0) ? 'knockout' : 'time';
    if (winner !== undefined) this.roundWins[winner] += 1;
    this.characters.forEach(character => { character.attack = undefined; }); this.projectiles = []; this.pendingLighters = []; this.ultimateActivation = undefined;
    this.phase = 'round-over'; this.transitionFrames = this.config.match.roundEndPauseFrames;
  }
}
