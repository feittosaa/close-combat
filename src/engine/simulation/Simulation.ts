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
        attack: character.attack ? { ...character.attack } : undefined,
        grab: character.grab ? { ...character.grab } : undefined,
      })),
      activeHitboxes: this.attackResolver.activeHitboxes(this.characters),
      hitEvents: [...this.lastHitEvents],
      recentContacts: this.recentContacts.map(({ frame, event }) => ({ frame, event: { ...event } })),
    };
  }

  isMatchOver(): boolean {
    return this.phase === 'match-over';
  }

  resetMatch(): void {
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
      const canControl = canControlAtInput[index];
      const airborneAtInput = !character.grounded;
      character.movementDirection = undefined;
      this.updateStunAndFeedback(character);
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
      Boolean(commands[index] && (canControlAtInput[index] || this.canCancel(character, commands[index]))));

    this.characters.forEach((character, index) => {
      const input = inputs[index] ?? neutralInput();
      const canControl = canControlAtInput[index];
      const moveCommand = commands[index];

      if (canControl) {
        const horizontal = horizontalAxis(input.direction);
        const facingSign = character.facing === 'right' ? 1 : -1;
        const guarding = character.grounded && (input.direction === 'B' || input.direction === 'DB') && attacking[1 - index];
        const stationary = guarding || (character.grounded && character.crouching);
        const dashing = this.updateDash(index, horizontal, character.grounded && !stationary);
        const speed = dashing
          ? this.config.movement.dashSpeed
          : this.fighterDefinitions[index].movement.walkSpeed;
        if (!stationary) nextX[index] += horizontal * facingSign * speed;
        if (guarding) character.mode = 'blocking';
        else if (dashing) character.mode = 'dashing';
        else if (horizontal !== 0 && character.grounded && !character.crouching) character.mode = 'moving';
        if (character.mode === 'moving' || character.mode === 'dashing') {
          character.movementDirection = horizontal < 0 ? 'backward' : 'forward';
        }

      } else {
        this.previousHorizontalAxis[index] = horizontalAxis(input.direction);
        this.dashFramesRemaining[index] = 0;
        this.dashAxis[index] = 0;
      }

      if (canControl || this.canCancel(character, moveCommand)) {
        const move = this.startAttack(character, moveCommand, input.direction);
        if (move?.advance && !move.airborne && !character.crouching) {
          const facingSign = character.facing === 'right' ? 1 : -1;
          nextX[index] += facingSign * move.advance;
        }
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
    this.updateFacing();
    this.lastHitEvents = this.attackResolver.resolve(this.characters, inputs, freshlyPressed, freshBack);
    this.lastHitEvents.forEach((event) => {
      const attacker = this.characters.find((character) => character.characterId === event.attackerId);
      const target = this.characters.find((character) => character.characterId === event.targetId);
      if (!attacker || !target) return;
      const direction = attacker.facing === 'right' ? 1 : -1;
      const displacedX = event.targetOffsetFromAttacker === undefined
        ? target.x + direction * event.pushback
        : attacker.x + direction * event.targetOffsetFromAttacker;
      target.x = clamp(displacedX, this.config.arena.left + target.collision.bodyWidth / 2,
        this.config.arena.right - target.collision.bodyWidth / 2);
    });
    this.resolveBodySpacing(this.characters.map(({ x }) => x));
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
    this.characters.forEach((character, index) => {
      const previous = previousStates[index];
      const renewedReaction = this.lastHitEvents.some((event) =>
        (event.targetId === character.characterId && ['hit', 'block', 'throw', 'throw-start'].includes(event.outcome)) ||
        (event.attackerId === character.characterId && event.outcome === 'parry'));
      if (character.mode !== previous.mode || character.attack !== previous.attack ||
          character.crouching !== previous.crouching || renewedReaction) character.stateStartedFrame = this.frame;
    });
  }

  private finishRound(reason: 'knockout' | 'time'): void {
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
        attack: undefined,
        grab: undefined,
        hitFlashFrames: 0,
      });
      this.commandParsers[index]?.clear();
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
    const initialDistance = this.options.initialDistance;
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

    character.remainingStateFrames -= 1;
    if (character.remainingStateFrames <= 0) {
      character.remainingStateFrames = 0;
      character.mode = 'neutral';
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
      character.verticalVelocity += this.config.movement.gravity;
      character.y += character.verticalVelocity;
      if (character.y >= this.config.arena.floorY) {
        character.y = this.config.arena.floorY;
        character.verticalVelocity = 0;
        character.grounded = true;
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
    move: MoveDefinition | undefined,
    direction: FrameInput['direction'],
  ): MoveDefinition | undefined {
    if (!move) return undefined;

    character.attack = {
      moveId: move.id,
      buttons: [...move.input.buttons],
      airborne: move.airborne === true,
      crouching: move.crouching === true,
      elapsedFrames: 0,
      hasHit: false,
      preciseExecution: move.precisionWindowFrames !== undefined,
      throwDirection: move.throw
        ? isBackwardDirection(direction) ? 'backward' : 'forward'
        : undefined,
    };
    character.crouching = move.crouching === true;
    character.mode = 'startup';
    character.movementDirection = undefined;
    return move;
  }

  private canCancel(character: CharacterState, nextMove: MoveDefinition | undefined): boolean {
    const attack = character.attack;
    const currentMove = attack ? this.moveFor(character, attack.moveId) : undefined;
    const cancelRule = currentMove?.cancelOnHit;
    if (!attack || !nextMove || attack.hitOutcome !== 'hit' || attack.hitElapsedFrames === undefined || !cancelRule) {
      return false;
    }
    return attack.elapsedFrames - attack.hitElapsedFrames <= cancelRule.windowFrames &&
      cancelRule.moveIds.includes(nextMove.id);
  }

  private updateDash(index: number, horizontal: number, grounded: boolean): boolean {
    if (!grounded) {
      this.previousHorizontalAxis[index] = horizontal;
      this.lastTapAxis[index] = 0;
      this.lastTapFrame[index] = Number.NEGATIVE_INFINITY;
      this.dashFramesRemaining[index] = 0;
      this.dashAxis[index] = 0;
      return false;
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
      this.dashFramesRemaining[index] = 0;
      return false;
    }
    if (this.dashFramesRemaining[index] <= 0) return false;

    this.dashFramesRemaining[index] -= 1;
    return true;
  }

  private advanceAttacks(): void {
    this.characters.forEach((character) => {
      const attack = character.attack;
      const move = attack ? this.moveFor(character, attack.moveId) : undefined;
      if (!attack || !move) return;

      attack.elapsedFrames += 1;
      const activeStartsAt = move.startup;
      const recoveryStartsAt = move.startup + move.activeFrames;
      const totalFrames = recoveryStartsAt + move.recovery;

      if (attack.elapsedFrames >= totalFrames) {
        character.attack = undefined;
        if (!isStunned(character)) character.mode = 'neutral';
      } else if (attack.elapsedFrames >= recoveryStartsAt) {
        character.mode = 'recovery';
      } else if (attack.elapsedFrames >= activeStartsAt) {
        character.mode = 'active';
      } else {
        character.mode = 'startup';
      }
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
    character.mode === 'grabbed' || character.mode === 'throwRecovery';
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
