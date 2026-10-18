// src/engine/simulation/Simulation.ts
import type { CharacterState } from '../characters/CharacterState';
import { AttackResolver, type HitEvent } from '../combat/AttackResolver';
import { defaultCharacter, type CharacterDefinition } from '../data/characters';
import type { GameConfig } from '../data/gameConfig';
import { getMoveForInput, getMoveById, type MoveDefinition } from '../data/moves';
import type { FrameInput, AttackButton } from '../../input/types';
import type { Hitbox } from '../collision/types';
import { FixedStepClock } from './FixedStepClock';

export interface SimulationSnapshot {
  frame: number;
  round: number;
  roundFramesRemaining: number;
  characters: readonly CharacterState[];
  activeHitboxes: readonly Hitbox[];
  hitEvents: readonly HitEvent[];
}

const BUTTON_PRIORITY: readonly AttackButton[] = ['1', '2', '3', '4'];

/** Simulação determinística inicial de movimento e ataques locais para dois jogadores. */
export class Simulation {
  private readonly clock = new FixedStepClock();
  private readonly attackResolver: AttackResolver;
  private frame = 0;
  private roundFramesRemaining: number;
  private readonly characters: [CharacterState, CharacterState];
  private readonly fighterDefinitions: readonly [CharacterDefinition, CharacterDefinition];
  private readonly jumpHeld = [false, false];
  private readonly previousButtons = [new Set<AttackButton>(), new Set<AttackButton>()];
  private readonly previousHorizontalAxis = [0, 0];
  private readonly lastTapAxis = [0, 0];
  private readonly lastTapFrame = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  private readonly dashFramesRemaining = [0, 0];
  private readonly dashAxis = [0, 0];
  private lastHitEvents: HitEvent[] = [];

  constructor(
    private readonly config: GameConfig,
    fighterDefinitions: readonly [CharacterDefinition, CharacterDefinition] = [defaultCharacter, defaultCharacter],
  ) {
    const { arena, match } = config;
    this.fighterDefinitions = fighterDefinitions;
    const inset = Math.min(190, (arena.right - arena.left) * 0.22);
    this.characters = [
      this.createCharacter('player-1', fighterDefinitions[0], arena.left + inset, 'right'),
      this.createCharacter('player-2', fighterDefinitions[1], arena.right - inset, 'left'),
    ];
    this.roundFramesRemaining = match.roundDurationFrames;
    this.attackResolver = new AttackResolver(config.movement.bodyWidth);
  }

  advance(
    deltaMs: number,
    readInputs: (characters: readonly CharacterState[]) => readonly FrameInput[],
  ): void {
    this.clock.advance(deltaMs, () => this.step(readInputs(this.characters)));
  }

  snapshot(): SimulationSnapshot {
    return {
      frame: this.frame,
      round: 1,
      roundFramesRemaining: this.roundFramesRemaining,
      characters: this.characters.map((character) => ({
        ...character,
        attack: character.attack ? { ...character.attack } : undefined,
      })),
      activeHitboxes: this.attackResolver.activeHitboxes(this.characters),
      hitEvents: [...this.lastHitEvents],
    };
  }

  private step(inputs: readonly FrameInput[]): void {
    const previousX = this.characters.map(({ x }) => x) as [number, number];
    const nextX = [...previousX] as [number, number];
    this.lastHitEvents = [];

    this.characters.forEach((character, index) => {
      const input = inputs[index] ?? neutralInput();
      const canControl = !character.attack && !isStunned(character);
      const airborneAtInput = !character.grounded;
      this.updateStunAndFeedback(character);
      this.updateVerticalMovement(character, input, index, canControl);

      if (canControl) {
        const horizontal = horizontalAxis(input.direction);
        const facingSign = character.facing === 'right' ? 1 : -1;
        const dashing = this.updateDash(index, horizontal, character.grounded);
        const speed = dashing
          ? this.config.movement.dashSpeed
          : this.fighterDefinitions[index].movement.walkSpeed;
        nextX[index] += horizontal * facingSign * speed;
        if (dashing) character.mode = 'dashing';
        else if (input.direction === 'B' || input.direction === 'DB') character.mode = 'blocking';
        else if (horizontal !== 0 && character.grounded && !character.crouching) character.mode = 'moving';

        const move = this.startAttack(character, input, index, airborneAtInput, this.fighterDefinitions[index].moveIds);
        if (move?.advance) nextX[index] += facingSign * move.advance;
      } else {
        this.previousHorizontalAxis[index] = horizontalAxis(input.direction);
        this.dashFramesRemaining[index] = 0;
        this.dashAxis[index] = 0;
      }

      const halfWidth = this.config.movement.bodyWidth / 2;
      nextX[index] = clamp(
        nextX[index],
        this.config.arena.left + halfWidth,
        this.config.arena.right - halfWidth,
      );
      this.previousButtons[index] = new Set(input.buttons);
    });

    this.characters.forEach((character, index) => { character.x = nextX[index]; });
    this.resolveBodySpacing(previousX);
    this.updateFacing();
    this.lastHitEvents = this.attackResolver.resolve(this.characters, inputs);
    this.lastHitEvents.forEach((event) => {
      const attacker = this.characters.find((character) => character.characterId === event.attackerId);
      const target = this.characters.find((character) => character.characterId === event.targetId);
      if (!attacker || !target) return;
      const direction = attacker.facing === 'right' ? 1 : -1;
      target.x = clamp(
        target.x + direction * event.pushback,
        this.config.arena.left + this.config.movement.bodyWidth / 2,
        this.config.arena.right - this.config.movement.bodyWidth / 2,
      );
    });
    this.resolveBodySpacing(this.characters.map(({ x }) => x));
    this.updateFacing();
    this.advanceAttacks();
    this.frame += 1;
    this.roundFramesRemaining = Math.max(0, this.roundFramesRemaining - 1);
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
      x,
      y: this.config.arena.floorY,
      facing,
      health: definition.maxHealth,
      maxHealth: definition.maxHealth,
      mode: 'neutral',
      remainingStateFrames: 0,
      verticalVelocity: 0,
      grounded: true,
      crouching: false,
      hitFlashFrames: 0,
    };
  }

  private updateStunAndFeedback(character: CharacterState): void {
    if (character.hitFlashFrames > 0) character.hitFlashFrames -= 1;
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
      ? getMoveById(character.attack.moveId)?.crouching === true
      : false;
    character.crouching = (canControl && character.grounded && vertical === 'down') || crouchingAttack;
    if (canControl && !character.attack) {
      character.mode = character.crouching ? 'crouching' : character.grounded ? 'neutral' : 'airborne';
    }
  }

  private startAttack(
    character: CharacterState,
    input: FrameInput,
    index: number,
    airborne: boolean,
    allowedMoveIds: readonly string[],
  ): MoveDefinition | undefined {
    const justPressed = BUTTON_PRIORITY.filter((button) =>
      input.buttons.has(button) && !this.previousButtons[index].has(button),
    );

    // Combinações ainda não têm golpes atribuídos; não separam um chord em ataques acidentais.
    if (justPressed.length !== 1 || input.buttons.size !== 1) return undefined;

    const button = justPressed[0];
    const crouchingInput = input.direction === 'D' && character.crouching;
    const move = button
      ? getMoveForInput(button, input.direction, airborne, crouchingInput, allowedMoveIds)
      : undefined;
    if (!button || !move) return undefined;

    character.attack = { moveId: move.id, button, elapsedFrames: 0, hasHit: false };
    character.crouching = move.crouching === true;
    character.mode = 'startup';
    return move;
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
      const move = attack ? getMoveById(attack.moveId) : undefined;
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
    const minimumDistance = this.config.movement.bodyWidth;
    const airborneCrossing = (!first.grounded || !second.grounded) &&
      Math.abs(first.y - second.y) >= minimumDistance;
    if (airborneCrossing) return;

    const firstWasLeft = previousX[0] <= previousX[1];
    const overlap = firstWasLeft
      ? first.x + minimumDistance > second.x
      : second.x + minimumDistance > first.x;

    if (!overlap) return;

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
}

function neutralInput(): FrameInput {
  return { direction: 'N', buttons: new Set() };
}

function horizontalAxis(direction: FrameInput['direction']): number {
  return direction.endsWith('F') ? 1 : direction.endsWith('B') ? -1 : 0;
}

function verticalAxis(direction: FrameInput['direction']): 'up' | 'down' | 'neutral' {
  if (direction.startsWith('U')) return 'up';
  if (direction.startsWith('D')) return 'down';
  return 'neutral';
}

function isStunned(character: CharacterState): boolean {
  return character.mode === 'hitstun' || character.mode === 'blockstun';
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
