import { recoveryFrames } from '../combat/frameData';
import { CombatCommandParser, type CombatCommandResult } from '../combat/CombatCommandParser';
import { inWindow } from '../combat/strikeTimeline';
import { updateCombatState, applyCombatAction, finishCombo } from '../combat/CombatRuntime';
// src/engine/simulation/Simulation.ts
import type { CharacterState } from '../characters/CharacterState';
import { AttackResolver, type HitEvent } from '../combat/AttackResolver';
import { defaultCharacter, type CharacterDefinition } from '../data/characters';
import type { GameConfig } from '../data/gameConfig';
import type { MoveDefinition } from '../data/moves';
import { CommandParser } from '../../input/CommandBuffer';
import type { AttackButton, FrameInput } from '../../input/types';
import type { Hitbox } from '../collision/types';
import { FixedStepClock } from './FixedStepClock';
import { projectileHitbox, type ProjectileState } from '../combat/Projectile';
import { intersects } from '../collision/intersects';

export interface SimulationSnapshot {
  frame: number;
  round: number;
  roundFramesRemaining: number;
  phase: 'fight' | 'round-over' | 'match-over';
  roundWins: readonly [number, number];
  roundWinnerId?: string;
  roundEndReason?: 'knockout' | 'time' | 'draw';
  matchWinnerId?: string;
  characters: readonly CharacterState[];
  activeHitboxes: readonly Hitbox[];
  hitEvents: readonly HitEvent[];
  recentContacts: readonly CombatLogEntry[];
  projectiles: readonly ProjectileState[];
}

export interface CombatLogEntry { frame: number; event: HitEvent }

export interface SimulationOptions {
  training?: boolean;
  /** Distância inicial entre centros para exercícios; ausente preserva o spawn da partida. */
  initialDistance?: number;
}

/** Simulação determinística inicial de movimento e ataques locais para dois jogadores. */
export class Simulation {
  private readonly clock = new FixedStepClock();
  private readonly attackResolver: AttackResolver;
  private frame = 0;
  private roundFramesRemaining: number;
  private round = 1;
  private phase: SimulationSnapshot['phase'] = 'fight';
  private roundWins: [number, number] = [0, 0];
  private roundWinnerId?: string;
  private roundEndReason?: SimulationSnapshot['roundEndReason'];
  private matchWinnerId?: string;
  private roundEndFramesRemaining = 0;
  private readonly characters: [CharacterState, CharacterState];
  private readonly fighterDefinitions: readonly [CharacterDefinition, CharacterDefinition];
  private readonly fighterMoves: readonly [readonly MoveDefinition[], readonly MoveDefinition[]];
  private readonly commandParsers: [CommandParser, CommandParser] = [new CommandParser(), new CommandParser()];
  private readonly combatParsers = [new CombatCommandParser(), new CombatCommandParser()];
  private readonly jumpHeld = [false, false];
  private readonly previousInputButtons: [Set<AttackButton>, Set<AttackButton>] = [new Set(), new Set()];
  private readonly previousDirections: [FrameInput['direction'], FrameInput['direction']] = ['N', 'N'];
  private readonly previousHorizontalAxis = [0, 0];
  private readonly lastTapAxis = [0, 0];
  private readonly lastTapFrame = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  private readonly dashFramesRemaining = [0, 0];
  private readonly dashAxis = [0, 0];
  private lastHitEvents: HitEvent[] = [];
  private recentContacts: CombatLogEntry[] = [];
  private trainingDistance?: number;
  private trainingAutoRestore = false;
  private trainingQuietFrames = 0;
  private projectiles: ProjectileState[] = [];
  private nextProjectileId = 1;

  constructor(
    private readonly config: GameConfig,
    fighterDefinitions: readonly [CharacterDefinition, CharacterDefinition] = [defaultCharacter, defaultCharacter],
    private readonly options: SimulationOptions = {},
  ) {
    const { match } = config;
    this.fighterDefinitions = fighterDefinitions;
    this.fighterMoves = [
      fighterDefinitions[0].moves,
      fighterDefinitions[1].moves,
    ];
    const positions = this.spawnPositions();
    this.characters = [
      this.createCharacter('player-1', fighterDefinitions[0], positions[0], 'right'),
      this.createCharacter('player-2', fighterDefinitions[1], positions[1], 'left'),
    ];
    this.roundFramesRemaining = match.roundDurationFrames;
    const moveBooks = new Map(fighterDefinitions.map((definition, index) => [definition.id, this.fighterMoves[index]]));
    this.attackResolver = new AttackResolver(
      (fighterId, moveId) => moveBooks.get(fighterId)?.find((move) => move.id === moveId),
    );
  }

  advance(
    deltaMs: number,
    readInputs: (characters: readonly CharacterState[], frame: number) => readonly FrameInput[],
  ): void {
    this.clock.advance(deltaMs, () => this.step(readInputs(this.characters, this.frame)));
  }

  /** A training step uses exactly the same rules as normal fixed-clock playback. */
  stepFrame(inputs: readonly FrameInput[]): void {
    this.clock.reset();
    this.step(inputs);
  }

  snapshot(): SimulationSnapshot {
    return {
      frame: this.frame,
      round: this.round,
      roundFramesRemaining: this.roundFramesRemaining,
      phase: this.phase,
      roundWins: [...this.roundWins],
      roundWinnerId: this.roundWinnerId,
      roundEndReason: this.roundEndReason,
      matchWinnerId: this.matchWinnerId,
      characters: this.characters.map((character) => ({
        ...character,
        followup: character.followup ? { ...character.followup, buttons: [...character.followup.buttons], connectedStrikes: [...(character.followup.connectedStrikes ?? [])] } : undefined,
        attack: character.attack ? { ...character.attack, connectedStrikes: [...(character.attack.connectedStrikes ?? [])] } : undefined,
        combo: character.combo ? { ...character.combo, moveIds: [...character.combo.moveIds] } : undefined,
        lastCombo: character.lastCombo ? { ...character.lastCombo, moveIds: [...character.lastCombo.moveIds] } : undefined,
        grab: character.grab ? { ...character.grab } : undefined,
      })),
      activeHitboxes: [...this.attackResolver.activeHitboxes(this.characters), ...this.projectiles.map((p) => projectileHitbox(p))],
      projectiles: this.projectiles.map((projectile) => ({ ...projectile })),
      hitEvents: [...this.lastHitEvents],
      recentContacts: this.recentContacts.map(({ frame, event }) => ({ frame, event: { ...event } })),
    };
  }

  /** Drop UI navigation/held inputs on pause boundaries without resetting combat state. */
  clearInputHistory(): void {
    this.clock.reset();
    this.commandParsers.forEach(parser => parser.clear());
    this.combatParsers.forEach(parser => parser.clear());
    this.previousInputButtons.forEach(buttons => buttons.clear());
    this.previousDirections.fill('N');
    this.jumpHeld.fill(false);
  }

  isMatchOver(): boolean {
    return this.phase === 'match-over';
  }

  resetMatch(trainingDistance?: number): void {
    if (this.options.training && trainingDistance !== undefined && Number.isFinite(trainingDistance)) {
      this.trainingDistance = trainingDistance;
    }
    this.clock.reset();
    this.frame = 0;
    this.round = 1;
    this.roundWins = [0, 0];
    this.phase = 'fight';
    this.roundWinnerId = undefined;
    this.roundEndReason = undefined;
    this.matchWinnerId = undefined;
    this.roundEndFramesRemaining = 0;
    this.resetRoundState();
  }

  /** Training convenience only; health is restored at a quiet logical boundary. */
  setTrainingAutoRestore(enabled: boolean): void {
    if (!this.options.training) return;
    this.trainingAutoRestore = enabled;
    this.trainingQuietFrames = 0;
  }

  private step(inputs: readonly FrameInput[]): void {
    if (this.phase !== 'fight') {
      this.advanceRoundTransition();
      this.frame += 1;
      return;
    }
    const previousX = this.characters.map(({ x }) => x) as [number, number];
    const previousStates = this.characters.map(({ mode, attack, crouching }) => ({ mode, attack, crouching }));
    const nextX = [...previousX] as [number, number];
    this.lastHitEvents = [];
    const freshlyPressedFor = (index: number): ReadonlySet<AttackButton> => {
      const input = inputs[index];
      const previous = this.previousInputButtons[index];
      const pressed = new Set([...(input?.buttons ?? [])].filter((button) => !previous?.has(button)));
      this.previousInputButtons[index] = new Set(input?.buttons ?? []);
      return pressed;
    };
    const freshlyPressed: [ReadonlySet<AttackButton>, ReadonlySet<AttackButton>] = [
      freshlyPressedFor(0), freshlyPressedFor(1),
    ];
    const freshBack: [boolean, boolean] = [0, 1].map((index) => {
      const direction = inputs[index]?.direction ?? 'N';
      const pressed = direction === 'B' && this.previousDirections[index] !== 'B';
      this.previousDirections[index] = direction;
      return pressed;
    }) as [boolean, boolean];

    const canControlAtInput = this.characters.map((character) => !character.attack && !isStunned(character));
    // Read both commands before deciding guard, so a new attack is visible to
    // either defender on the same frame regardless of player iteration order.
    const commands = this.characters.map((character, index) => {
      const input = inputs[index] ?? neutralInput();
      const airborneAtInput = !character.grounded;
      character.movementDirection = undefined;
      if (character.followup) {
        character.followup.elapsedFrames += 1;
        const last = character.followup;
        if (!this.fighterMoves[index].some(move => (move.combat?.command.parentId === last.moveId || move.combat?.command.alternateParentIds?.includes(last.moveId)) && (move.combat.command.followupWindow?.to ?? -1) >= last.elapsedFrames)) character.followup = undefined;
      }
      if (isStunned(character)) character.followup = undefined;
      updateCombatState(character, input);
      this.updateStunAndFeedback(character);
      const canControl = !character.attack && !isStunned(character);
      canControlAtInput[index] = canControl;
      if (this.fighterMoves[index].some(move => move.combat && !move.legacy)) {
        // Optional string -> crouch-dash transition authored for Ayla's 3,1 family.
        const stringAttack = character.attack ?? character.followup;
        const current = stringAttack ? this.moveFor(character, stringAttack.moveId) : undefined;
        if (current?.combat?.reference?.command === '3,1' && input.direction === 'DF' &&
            stringAttack && stringAttack.elapsedFrames >= current.startup + current.activeFrames) {
          character.stance = 'crouch-dash'; character.stanceFrames = character.combatRules?.stanceFrames ?? 24; character.attack = undefined; character.followup = undefined;
        }
        const halfWidth = character.collision.bodyWidth / 2;
        const atWall = character.x - halfWidth <= this.config.arena.left + 12 || character.x + halfWidth >= this.config.arena.right - 12;
        const command = this.combatParsers[index].update(input, this.frame, character, this.characters[1 - index], this.fighterMoves[index], atWall);
        this.updateVerticalMovement(character, input, index, canControl && !command);
        return command;
      }
      this.updateVerticalMovement(character, input, index, canControl);
      const crouchingInput = input.direction === 'D' && character.crouching;
      return this.commandParsers[index].update(
        input,
        this.frame,
        this.fighterMoves[index],
        { airborne: airborneAtInput, crouching: crouchingInput },
      );
    });
    const attacking = this.characters.map((character, index) => Boolean(character.attack) ||
      this.projectiles.some((projectile) => projectile.ownerId === character.characterId) ||
      Boolean(commands[index] && (canControlAtInput[index] || this.canCancel(character, commands[index]))));

    this.characters.forEach((character, index) => {
      const input = inputs[index] ?? neutralInput();
      const canControl = canControlAtInput[index];
      const moveCommand = commands[index];

      if (canControl) {
        const horizontal = horizontalAxis(input.direction);
        const facingSign = character.facing === 'right' ? 1 : -1;
        const guarding = character.stance !== 'charging' && character.grounded && (input.direction === 'B' || input.direction === 'DB') && attacking[1 - index];
        const stationary = guarding || (character.grounded && character.crouching);
        const dashing = this.updateDash(index, horizontal, character.grounded && !stationary);
        const movement = this.fighterDefinitions[index].movement;
        const speed = dashing === 'run' ? movement.runSpeed ?? (movement.dashSpeed ?? this.config.movement.dashSpeed) * 1.25 : dashing
          ? (horizontal < 0 ? movement.backdashSpeed : undefined) ?? movement.dashSpeed ?? this.config.movement.dashSpeed
          : (horizontal < 0 ? movement.backwardWalkSpeed : undefined) ?? movement.walkSpeed;
        if (!stationary) nextX[index] += horizontal * facingSign * speed;
        if (guarding) character.mode = 'blocking';
        else if (dashing) character.mode = dashing === 'run' ? 'running' : 'dashing';
        else if (horizontal !== 0 && character.grounded && !character.crouching) character.mode = 'moving';
        if (character.mode === 'moving' || character.mode === 'dashing' || character.mode === 'running') {
          character.movementDirection = horizontal < 0 ? 'backward' : 'forward';
        }

      } else {
        this.previousHorizontalAxis[index] = horizontalAxis(input.direction);
        this.dashFramesRemaining[index] = 0;
        this.dashAxis[index] = 0;
      }

      if (canControl || this.canCancel(character, moveCommand) || (moveCommand && !character.attack && !isStunned(character))) {
        const move = this.startAttack(character, moveCommand, input.direction);
        if (move?.combat?.action?.move) nextX[index] += (character.facing === 'right' ? 1 : -1) * move.combat.action.move;
        if (move?.advance && !move.airborne && (move.combat || !character.crouching)) {
          const facingSign = character.facing === 'right' ? 1 : -1;
          nextX[index] += facingSign * move.advance;
        }
      }

      const travelingMove = character.attack ? this.moveFor(character, character.attack.moveId) : undefined;
      if (travelingMove?.travelSpeed && character.attack && !character.crouching &&
          character.attack.elapsedFrames >= travelingMove.startup &&
          character.attack.elapsedFrames < travelingMove.startup + travelingMove.activeFrames) {
        nextX[index] += (character.facing === 'right' ? 1 : -1) * travelingMove.travelSpeed;
      }

      const halfWidth = character.collision.bodyWidth / 2;
      nextX[index] = clamp(
        nextX[index],
        this.config.arena.left + halfWidth,
        this.config.arena.right - halfWidth,
      );
    });

    this.characters.forEach((character, index) => { character.x = nextX[index]; });
    this.resolveBodySpacing(previousX);
    this.constrainBodiesToArena();
    this.updateFacing();
    this.advanceProjectiles();
    this.lastHitEvents = this.attackResolver.resolve(this.characters, inputs, freshlyPressed, freshBack, this.projectiles);
    this.projectiles = this.projectiles.filter((projectile) => {
      const box = projectileHitbox(projectile);
      return !projectile.hasHit && box.x + box.width >= this.config.arena.left && box.x <= this.config.arena.right;
    });
    this.lastHitEvents.forEach((event) => {
      const attacker = this.characters.find((character) => character.characterId === event.attackerId);
      const target = this.characters.find((character) => character.characterId === event.targetId);
      if (!attacker || !target) return;
      const direction = (event.direction ?? attacker.facing) === 'right' ? 1 : -1;
      const displacedX = event.targetOffsetFromAttacker === undefined
        ? target.x + direction * event.pushback
        : attacker.x + direction * event.targetOffsetFromAttacker;
      target.x = clamp(displacedX, this.config.arena.left + target.collision.bodyWidth / 2,
        this.config.arena.right - target.collision.bodyWidth / 2);
      const move = this.moveFor(attacker, event.moveId);
      const strike = move?.combat?.strikes[event.strikeIndex ?? 0];
      if (event.outcome === 'hit' && target.combo && !target.combo.forcedFall && !target.combo.wallUsed &&
          !target.grounded && target.x !== displacedX && strike?.wallSplat) {
        target.combo.wallUsed = true;
        target.combo.wallFrames = attacker.combatRules?.wallStunFrames ?? 22;
        target.verticalVelocity = 0;
        target.y = Math.min(target.y, this.config.arena.floorY - 105);
        target.remainingStateFrames = Math.max(target.remainingStateFrames, target.combo.wallFrames + 12);
        if (strike.wallBounce) { target.combo.wallFrames = 0; target.verticalVelocity = -5; target.x -= direction * 75; }
      }
      if (event.outcome === 'hit' && move?.combat?.action?.sideSwitch) {
        const oldX = attacker.x; attacker.x = target.x; target.x = oldX;
      }
    });
    this.resolveBodySpacing(this.characters.map(({ x }) => x));
    this.constrainBodiesToArena();
    this.updateFacing();
    this.advanceAttacks();
    this.frame += 1;
    if (this.lastHitEvents.length) {
      this.recentContacts.push(...this.lastHitEvents.map((event) => ({ frame: this.frame, event })));
      this.recentContacts = this.recentContacts.slice(-32);
    }
    if (!this.options.training) {
      this.roundFramesRemaining = Math.max(0, this.roundFramesRemaining - 1);
      if (this.characters.some(({ health }) => health === 0)) this.finishRound('knockout');
      else if (this.roundFramesRemaining === 0) this.finishRound('time');
    }
    this.restoreTrainingHealthIfQuiet();
    this.characters.forEach((character, index) => {
      const previous = previousStates[index];
      const renewedReaction = this.lastHitEvents.some((event) =>
        (event.targetId === character.characterId && ['hit', 'block', 'throw', 'throw-start'].includes(event.outcome)) ||
        (event.attackerId === character.characterId && event.outcome === 'parry'));
      if (character.mode !== previous.mode || character.attack !== previous.attack ||
          character.crouching !== previous.crouching || renewedReaction) character.stateStartedFrame = this.frame;
    });
  }

  private restoreTrainingHealthIfQuiet(): void {
    if (!this.options.training || !this.trainingAutoRestore) return;
    const quiet = !this.lastHitEvents.length && !this.projectiles.length && this.characters.every((character) =>
      character.grounded && !character.attack && !character.grab && !isStunned(character));
    this.trainingQuietFrames = quiet ? this.trainingQuietFrames + 1 : 0;
    if (this.trainingQuietFrames < 90) return;
    this.characters.forEach((character) => { character.health = character.maxHealth; });
    this.trainingQuietFrames = 0;
  }

  private finishRound(reason: 'knockout' | 'time'): void {
    this.projectiles = [];
    const [first, second] = this.characters;
    let winnerIndex = -1;
    if (reason === 'knockout') {
      if (first.health !== second.health) winnerIndex = first.health > second.health ? 0 : 1;
    } else if (first.health !== second.health) {
      winnerIndex = first.health > second.health ? 0 : 1;
    }
    this.roundWinnerId = winnerIndex >= 0 ? this.characters[winnerIndex]?.characterId : undefined;
    this.roundEndReason = winnerIndex >= 0 ? reason : 'draw';
    if (winnerIndex >= 0) this.roundWins[winnerIndex] += 1;
    this.characters.forEach((character) => {
      character.attack = undefined;
      character.stateStartedFrame = this.frame + 1;
      character.hitFlashFrames = 0;
      if (['startup', 'active', 'recovery'].includes(character.mode)) character.mode = 'neutral';
    });
    this.phase = 'round-over';
    this.roundEndFramesRemaining = Math.max(0, this.config.match.roundEndPauseFrames);
    if (this.roundEndFramesRemaining === 0) this.advanceRoundTransition();
  }

  private advanceRoundTransition(): void {
    if (this.phase !== 'round-over') return;
    this.roundEndFramesRemaining -= 1;
    if (this.roundEndFramesRemaining > 0) return;
    if (this.round >= Math.max(1, this.config.match.roundCount)) {
      this.phase = 'match-over';
      this.matchWinnerId = this.roundWins[0] === this.roundWins[1]
        ? undefined
        : this.characters[this.roundWins[0] > this.roundWins[1] ? 0 : 1]?.characterId;
      return;
    }
    this.round += 1;
    this.phase = 'fight';
    this.roundWinnerId = undefined;
    this.roundEndReason = undefined;
    this.resetRoundState();
  }

  private resetRoundState(): void {
    this.projectiles = [];
    this.nextProjectileId = 1;
    this.trainingQuietFrames = 0;
    const positions = this.spawnPositions();
    this.characters.forEach((character, index) => {
      const definition = this.fighterDefinitions[index];
      if (!definition) return;
      Object.assign(character, {
        x: positions[index],
        y: this.config.arena.floorY,
        facing: index === 0 ? 'right' : 'left',
        movementDirection: undefined,
        health: this.configuredMaxHealth(definition),
        maxHealth: this.configuredMaxHealth(definition),
        mode: 'neutral',
        stateStartedFrame: this.frame,
        remainingStateFrames: 0,
        verticalVelocity: 0,
        grounded: true,
        crouching: false,
        attack: undefined, followup: undefined,
        grab: undefined,
        hitFlashFrames: 0,
        stance: 'standing', stanceFrames: 0, crouchFrames: 0, risingFrames: 0,
        powerFrames: 0, powerAvailable: true, rageUsed: false, lowParryFrames: 0, lowParryHeld: false,
        combo: undefined, lastCombo: undefined,
      });
      this.commandParsers[index]?.clear();
      this.combatParsers[index]?.clear();
      this.previousInputButtons[index]?.clear();
      this.previousDirections[index] = 'N';
      this.jumpHeld[index] = false;
      this.previousHorizontalAxis[index] = 0;
      this.lastTapAxis[index] = 0;
      this.lastTapFrame[index] = Number.NEGATIVE_INFINITY;
      this.dashFramesRemaining[index] = 0;
      this.dashAxis[index] = 0;
    });
    this.lastHitEvents = [];
    this.recentContacts = [];
    this.roundFramesRemaining = this.config.match.roundDurationFrames;
  }

  private spawnPositions(): readonly [number, number] {
    const { left, right } = this.config.arena;
    const initialDistance = this.trainingDistance ?? this.options.initialDistance;
    if (initialDistance !== undefined && Number.isFinite(initialDistance)) {
      const halfWidths = this.fighterDefinitions.map((definition) => definition.collision.bodyWidth / 2);
      const minimumDistance = halfWidths[0] + halfWidths[1];
      const distance = clamp(initialDistance, minimumDistance, right - left - minimumDistance);
      const center = (left + right) / 2;
      return [clamp(center - distance / 2, left + halfWidths[0], right - halfWidths[0]),
        clamp(center + distance / 2, left + halfWidths[1], right - halfWidths[1])];
    }
    const inset = Math.min(190, (right - left) * 0.22);
    return [left + inset, right - inset];
  }

  private createCharacter(
    characterId: string,
    definition: CharacterDefinition,
    x: number,
    facing: CharacterState['facing'],
  ): CharacterState {
    return {
      characterId,
      fighterId: definition.id,
      collision: definition.collision,
      combatRules: definition.combatRules,
      stance: 'standing', powerFrames: 0, powerAvailable: true, rageUsed: false,
      x,
      y: this.config.arena.floorY,
      facing,
      health: this.configuredMaxHealth(definition),
      maxHealth: this.configuredMaxHealth(definition),
      mode: 'neutral',
      stateStartedFrame: this.frame,
      remainingStateFrames: 0,
      verticalVelocity: 0,
      grounded: true,
      crouching: false,
      hitFlashFrames: 0,
    };
  }

  private configuredMaxHealth(definition: CharacterDefinition): number {
    return Math.min(definition.maxHealth, this.config.match.maxHealth);
  }

  private updateStunAndFeedback(character: CharacterState): void {
    if (character.hitFlashFrames > 0) character.hitFlashFrames -= 1;
    if (character.mode === 'grabbed') return;
    if (!isStunned(character)) return;

    if (!character.grounded && character.combo) { character.remainingStateFrames = Math.max(1, character.remainingStateFrames - 1); return; }
    character.remainingStateFrames -= 1;
    if (character.remainingStateFrames <= 0) {
      character.remainingStateFrames = 0;
      character.mode = 'neutral';
      finishCombo(character);
    }
  }

  private updateVerticalMovement(
    character: CharacterState,
    input: FrameInput,
    index: number,
    canControl: boolean,
  ): void {
    const vertical = verticalAxis(input.direction);
    const jumpPressed = vertical === 'up' && !this.jumpHeld[index];
    this.jumpHeld[index] = vertical === 'up';

    if (canControl && jumpPressed && character.grounded) {
      character.verticalVelocity = this.fighterDefinitions[index].movement.jumpVelocity;
      character.grounded = false;
    }

    if (!character.grounded) {
      if ((character.combo?.wallFrames ?? 0) > 0) { character.combo!.wallFrames -= 1; return; }
      const juggleRules = this.fighterDefinitions[1 - index].combatRules;
      const baseGravity = character.combo && (character.combo.airHits ?? 0) > 0 ? juggleRules?.juggleBaseGravity ?? this.config.movement.gravity : character.combo ? juggleRules?.launchGravity ?? this.config.movement.gravity : this.config.movement.gravity;
      character.verticalVelocity += character.combo?.forcedFall ? .8 : baseGravity + (character.combo ? (character.combo.airHits ?? 0) * (juggleRules?.juggleGravity ?? 0) : 0);
      character.y += character.verticalVelocity;
      if (character.y >= this.config.arena.floorY) {
        character.y = this.config.arena.floorY;
        character.verticalVelocity = 0;
        character.grounded = true;
        if (character.combo && character.mode === 'hitstun') {
          character.mode = 'knockdown';
          character.remainingStateFrames = this.fighterDefinitions[1 - index].combatRules?.knockdownFrames ?? 32;
        }
      }
    }

    const crouchingAttack = character.attack
      ? this.moveFor(character, character.attack.moveId)?.crouching === true
      : false;
    character.crouching = (character.grounded && vertical === 'down' && (canControl || character.mode === 'blockstun')) || crouchingAttack;
    if (canControl && !character.attack) {
      character.mode = character.crouching ? 'crouching' : character.grounded ? 'neutral' : 'airborne';
    }
  }

  private startAttack(
    character: CharacterState,
    move: CombatCommandResult | undefined,
    direction: FrameInput['direction'],
  ): MoveDefinition | undefined {
    if (!move) return undefined;
    character.followup = undefined;
    const charged = character.stance === 'charging';
    applyCombatAction(character, move);
    if (move.combat && !move.combat.strikes.length && !move.combat.action?.cancelRecovery) { character.attack = undefined; character.mode = character.grounded ? 'neutral' : 'airborne'; character.stateStartedFrame = this.frame; return move; }

    character.attack = {
      moveId: move.id,
      buttons: [...move.input.buttons],
      airborne: move.airborne === true,
      crouching: move.crouching === true,
      hurtboxStance: move.hurtboxStances?.startup,
      elapsedFrames: move.bufferedStartupFrames ?? 0,
      hasHit: false,
      preciseExecution: move.precisionWindowFrames !== undefined || move.combat?.command.preciseFrames !== undefined,
      connectedStrikes: [],
      forceCounterHit: charged,
      hurtboxOverride: move.combat?.hurtboxes.find(box => box.from <= 0 && box.to >= 0)?.box,
      throwDirection: move.throw
        ? isBackwardDirection(direction) ? 'backward' : 'forward'
        : undefined,
    };
    if (charged) { character.stance = 'standing'; character.stanceFrames = 0; }
    character.crouching = move.crouching === true;
    character.mode = 'startup';
    character.movementDirection = undefined;
    if (move.launchVelocity !== undefined) {
      character.verticalVelocity = move.launchVelocity;
      character.grounded = false;
      character.crouching = false;
    }
    return move;
  }

  private advanceProjectiles(): void {
    for (const projectile of this.projectiles) {
      projectile.previousX = projectile.x;
      projectile.x += (projectile.facing === 'right' ? 1 : -1) * projectile.definition.speed;
      projectile.ageFrames += 1;
      projectile.remainingFrames -= 1;
    }
    this.projectiles = this.projectiles.filter((projectile) => {
      const box = projectileHitbox(projectile, true);
      return projectile.remainingFrames > 0 && box.x + box.width >= this.config.arena.left && box.x <= this.config.arena.right;
    });
    for (const character of this.characters) {
      const attack = character.attack;
      const move = attack ? this.moveFor(character, attack.moveId) : undefined;
      const strikeIndex = move?.combat?.strikes.findIndex(strike => strike.projectile && attack?.elapsedFrames === strike.from) ?? -1;
      const definition = strikeIndex >= 0 ? move?.combat?.strikes[strikeIndex].projectile : move?.projectile;
      if (!attack || !move || !definition || (strikeIndex < 0 && attack.elapsedFrames !== (definition.spawnFrame ?? move.startup))) continue;
      const owned = this.projectiles.filter((p) => p.ownerId === character.characterId && p.moveId === move.id).length;
      if (owned >= (definition.maxActive ?? 1)) continue;
      const x = character.x + (character.facing === 'right' ? 1 : -1) * definition.forward;
      this.projectiles.push({ id: this.nextProjectileId++, ownerId: character.characterId, fighterId: character.fighterId,
        moveId: move.id, strikeIndex: strikeIndex >= 0 ? strikeIndex : undefined, x, previousX: x, y: character.y + definition.yOffset, facing: character.facing,
        ageFrames: 0, remainingFrames: definition.lifetimeFrames, hasHit: false, definition });
    }
    for (let i = 0; i < this.projectiles.length; i += 1) {
      const first = this.projectiles[i];
      if (first.hasHit || first.definition.clash === false) continue;
      for (let j = i + 1; j < this.projectiles.length; j += 1) {
        const second = this.projectiles[j];
        if (second.hasHit || second.ownerId === first.ownerId || second.definition.clash === false) continue;
        if (intersects(projectileHitbox(first, true), projectileHitbox(second, true))) {
          first.hasHit = true;
          second.hasHit = true;
          break;
        }
      }
    }
    this.projectiles = this.projectiles.filter((projectile) => !projectile.hasHit);
  }

  private canCancel(character: CharacterState, nextMove: MoveDefinition | undefined): boolean {
    const attack = character.attack;
    const currentMove = attack ? this.moveFor(character, attack.moveId) : undefined;
    if (attack && (nextMove?.combat?.command.parentId === attack.moveId || nextMove?.combat?.command.alternateParentIds?.includes(attack.moveId))) return true;
    const cancelRule = currentMove?.cancelOnHit;
    if (!attack || !nextMove || attack.hitOutcome !== 'hit' || attack.hitElapsedFrames === undefined || !cancelRule) {
      return false;
    }
    return attack.elapsedFrames - attack.hitElapsedFrames <= cancelRule.windowFrames &&
      cancelRule.moveIds.includes(nextMove.id);
  }

  private updateDash(index: number, horizontal: number, grounded: boolean): 'dash' | 'run' | undefined {
    if (!grounded) {
      this.previousHorizontalAxis[index] = horizontal;
      this.lastTapAxis[index] = 0;
      this.lastTapFrame[index] = Number.NEGATIVE_INFINITY;
      this.dashFramesRemaining[index] = 0;
      this.dashAxis[index] = 0;
      return undefined;
    }

    const wasPressed = this.previousHorizontalAxis[index] !== 0;
    const isPressed = horizontal !== 0;
    if (isPressed && (!wasPressed || horizontal !== this.previousHorizontalAxis[index])) {
      const withinWindow = this.frame - this.lastTapFrame[index] <= this.config.movement.doubleTapWindowFrames;
      if (horizontal === this.lastTapAxis[index] && withinWindow) {
        this.dashFramesRemaining[index] = this.config.movement.dashDurationFrames;
        this.dashAxis[index] = horizontal;
      }
      this.lastTapAxis[index] = horizontal;
      this.lastTapFrame[index] = this.frame;
    }

    this.previousHorizontalAxis[index] = horizontal;
    if (!isPressed || horizontal !== this.dashAxis[index]) {
      this.dashAxis[index] = 0;
      this.dashFramesRemaining[index] = 0;
      return undefined;
    }
    if (this.dashFramesRemaining[index] <= 0) return horizontal > 0 && this.dashAxis[index] === 1 ? 'run' : undefined;

    this.dashFramesRemaining[index] -= 1;
    return 'dash';
  }

  private advanceAttacks(): void {
    this.characters.forEach((character) => {
      const attack = character.attack;
      const move = attack ? this.moveFor(character, attack.moveId) : undefined;
      if (!attack || !move) return;

      attack.elapsedFrames += 1;
      const activeStartsAt = move.startup;
      const recoveryStartsAt = move.startup + move.activeFrames;
      const totalFrames = recoveryStartsAt + recoveryFrames(move, attack.wasBlocked ? 'block' : attack.hitOutcome);

      if (attack.elapsedFrames >= totalFrames) {
        character.followup = move.combat ? attack : undefined;
        character.attack = undefined;
        if (!isStunned(character)) character.mode = 'neutral';
      } else if (attack.elapsedFrames >= recoveryStartsAt) {
        character.mode = 'recovery';
      } else if (attack.elapsedFrames >= activeStartsAt) {
        character.mode = 'active';
      } else {
        character.mode = 'startup';
      }
      attack.hurtboxOverride = inWindow(attack.elapsedFrames, move.combat?.highCrush) ? character.collision.hurtboxes.crouching : move.combat?.hurtboxes.find(box => attack.elapsedFrames >= box.from && attack.elapsedFrames <= box.to)?.box;
      attack.hurtboxStance = character.mode === 'startup' || character.mode === 'active' || character.mode === 'recovery'
        ? move.hurtboxStances?.[character.mode] : undefined;
    });
  }

  private resolveBodySpacing(previousX: readonly number[]): void {
    const [first, second] = this.characters;
    const minimumDistance = (first.collision.bodyWidth + second.collision.bodyWidth) / 2;
    const airborneCrossing = (!first.grounded || !second.grounded) &&
      Math.abs(first.y - second.y) >= minimumDistance;
    if (airborneCrossing) return;

    const firstWasLeft = previousX[0] <= previousX[1];
    const overlap = firstWasLeft
      ? first.x + minimumDistance > second.x
      : second.x + minimumDistance > first.x;

    if (!overlap) return;

    // A moving opponent must not drag a guarding or crouching fighter along.
    // Actual hit/block displacement is applied separately from body spacing.
    const firstAnchored = isStationaryGrounded(first);
    const secondAnchored = isStationaryGrounded(second);
    if (firstAnchored && !secondAnchored) {
      second.x = first.x + (firstWasLeft ? minimumDistance : -minimumDistance);
      return;
    }
    if (secondAnchored && !firstAnchored) {
      first.x = second.x + (firstWasLeft ? -minimumDistance : minimumDistance);
      return;
    }

    const midpoint = (first.x + second.x) / 2;
    const halfDistance = minimumDistance / 2;
    if (firstWasLeft) {
      first.x = midpoint - halfDistance;
      second.x = midpoint + halfDistance;
    } else {
      second.x = midpoint - halfDistance;
      first.x = midpoint + halfDistance;
    }
  }

  private constrainBodiesToArena(): void {
    this.characters.forEach(character => {
      const half = character.collision.bodyWidth / 2;
      character.x = clamp(character.x, this.config.arena.left + half, this.config.arena.right - half);
    });
    const [left, right] = [...this.characters].sort((a, b) => a.x - b.x);
    const minimum = (left.collision.bodyWidth + right.collision.bodyWidth) / 2;
    if (Math.abs(left.y - right.y) >= minimum && (!left.grounded || !right.grounded)) return;
    if (right.x - left.x >= minimum) return;
    if (right.x + right.collision.bodyWidth / 2 >= this.config.arena.right) left.x = right.x - minimum;
    else right.x = left.x + minimum;
  }

  private updateFacing(): void {
    const [first, second] = this.characters;
    if (first.x < second.x) {
      first.facing = 'right';
      second.facing = 'left';
    } else if (first.x > second.x) {
      first.facing = 'left';
      second.facing = 'right';
    }
  }

  private moveFor(character: CharacterState, moveId: string): MoveDefinition | undefined {
    const index = character.characterId === 'player-1' ? 0 : 1;
    return this.fighterMoves[index].find((move) => move.id === moveId);
  }
}

function neutralInput(): FrameInput {
  return { direction: 'N', buttons: new Set() };
}

function isStationaryGrounded(character: CharacterState): boolean {
  return character.grounded && (character.crouching || character.mode === 'blocking' || character.mode === 'blockstun');
}

function horizontalAxis(direction: FrameInput['direction']): number {
  return direction.endsWith('F') ? 1 : direction.endsWith('B') ? -1 : 0;
}

function verticalAxis(direction: FrameInput['direction']): 'up' | 'down' | 'neutral' {
  if (direction.startsWith('U')) return 'up';
  if (direction.startsWith('D')) return 'down';
  return 'neutral';
}

function isBackwardDirection(direction: FrameInput['direction']): boolean {
  return direction === 'B' || direction === 'DB' || direction === 'UB';
}

function isStunned(character: CharacterState): boolean {
  return character.mode === 'hitstun' || character.mode === 'blockstun' ||
    character.mode === 'grabbed' || character.mode === 'throwRecovery' || character.mode === 'knockdown';
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
