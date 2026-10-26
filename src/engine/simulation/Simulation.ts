import type { CharacterState, CharacterAnimationState } from '../characters/CharacterState';
import { AttackResolver, type HitEvent } from '../combat/AttackResolver';
import { defaultCharacter, type CharacterDefinition } from '../data/characters';
import type { GameConfig } from '../data/gameConfig';
import type { MoveDefinition } from '../data/moves';
import { CommandParser } from '../../input/CommandBuffer';
import type { FrameInput } from '../../input/types';
import type { Hitbox } from '../collision/types';
import { FixedStepClock } from './FixedStepClock';

export interface CombatLogEntry { frame: number; event: HitEvent }
export interface SimulationSnapshot {
  frame: number; round: number; roundFramesRemaining: number;
  phase: 'fight' | 'round-over' | 'match-over';
  roundWins: readonly [number, number]; roundWinnerId?: string;
  roundEndReason?: 'knockout' | 'time' | 'draw'; matchWinnerId?: string;
  characters: readonly CharacterState[]; activeHitboxes: readonly Hitbox[];
  hitEvents: readonly HitEvent[]; recentContacts: readonly CombatLogEntry[];
}
export interface SimulationOptions { training?: boolean; initialDistance?: number }
const neutral = (): FrameInput => ({ direction: 'N', buttons: new Set() });
const locked = (state: CharacterState): boolean => state.mode === 'hitstun' || state.mode === 'blockstun';
const axis = (input: FrameInput): number => input.direction.endsWith('F') ? 1 : input.direction.endsWith('B') ? -1 : 0;
const clamp = (value: number, low: number, high: number): number => Math.max(low, Math.min(high, value));

/** Base determinística: quatro básicos, guarda e locomoção. Sem regras do elenco removido. */
export class Simulation {
  private readonly clock = new FixedStepClock();
  private readonly parsers = [new CommandParser(), new CommandParser()];
  private readonly resolver: AttackResolver;
  private characters: [CharacterState, CharacterState];
  private frame = 0;
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
    return { frame: this.frame, round: this.round, roundFramesRemaining: this.roundFramesRemaining,
      phase: this.phase, roundWins: [...this.roundWins], roundWinnerId: this.roundWinnerId,
      roundEndReason: this.roundEndReason, matchWinnerId: this.matchWinnerId,
      characters: structuredClone(this.characters), activeHitboxes: this.phase === 'fight' ? this.resolver.activeHitboxes(this.characters) : [],
      hitEvents: this.lastHitEvents.map(event => ({ ...event })), recentContacts: this.recentContacts.map(entry => ({ frame: entry.frame, event: { ...entry.event } })) };
  }
  clearInputHistory(): void {
    this.clock.reset(); this.parsers.forEach(parser => parser.clear());
    this.jumpHeld.fill(false); this.previousAxis.fill(0); this.tapAxis.fill(0); this.tapFrame.fill(-Infinity);
    this.dashFrames.fill(0); this.dashAxis.fill(0);
  }
  isMatchOver(): boolean { return this.phase === 'match-over'; }
  resetMatch(distance?: number): void {
    if (this.options.training && distance !== undefined && Number.isFinite(distance)) this.trainingDistance = distance;
    this.frame = 0; this.round = 1; this.roundWins = [0, 0]; this.phase = 'fight'; this.matchWinnerId = undefined;
    this.resetRound();
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
      y: floorY, facing: index === 0 ? 'right' : 'left', health: fighter.maxHealth, maxHealth: fighter.maxHealth,
      mode: 'neutral', stateStartedFrame: this.frame, remainingStateFrames: 0, verticalVelocity: 0,
      grounded: true, crouching: false, hitFlashFrames: 0,
    })) as [CharacterState, CharacterState];
  }
  private resetRound(): void {
    this.clearInputHistory(); this.characters = this.createCharacters(); this.roundFramesRemaining = this.config.match.roundDurationFrames;
    this.roundWinnerId = undefined; this.roundEndReason = undefined; this.transitionFrames = 0;
    this.lastHitEvents = []; this.recentContacts = []; this.quietFrames = 0;
  }
  private step(inputs: readonly FrameInput[]): void {
    this.lastHitEvents = [];
    if (this.phase !== 'fight') {
      if (this.phase === 'round-over' && --this.transitionFrames <= 0) {
        if (this.roundWins.some(wins => wins >= this.config.match.roundCount) || this.roundEndReason === 'draw') {
          this.phase = 'match-over'; this.matchWinnerId = this.roundWinnerId;
        } else { this.round += 1; this.phase = 'fight'; this.resetRound(); }
      }
      this.frame += 1; return;
    }
    const previousAnimationStates:CharacterAnimationState[]=this.characters.map(c=>({mode:c.mode,stateStartedFrame:c.stateStartedFrame,grounded:c.grounded,crouching:c.crouching,movementDirection:c.movementDirection,facing:c.facing,verticalVelocity:c.verticalVelocity}));
    const previousTransitions=this.characters.map(c=>c.animationTransition?{startedFrame:c.animationTransition.startedFrame,from:c.animationTransition.from}:undefined);
    const previousX = this.characters.map(character => character.x);
    const attackingAtInput = this.characters.map(character => Boolean(character.attack));
    const lockedAtInput = this.characters.map(character => locked(character));
    // Ler ambos os comandos antes de avaliar guarda evita viés por ordem dos jogadores.
    const commands = this.characters.map((character, index) => {
      const input = inputs[index] ?? neutral();
      character.hitFlashFrames = Math.max(0, character.hitFlashFrames - 1);
      if (locked(character) && character.remainingStateFrames > 0) {
        character.remainingStateFrames -= 1;
        if (!character.remainingStateFrames) character.mode = character.grounded ? 'neutral' : 'airborne';
      }
      if (character.attack) {
        const move = this.move(index, character.attack.moveId)!;
        character.attack.elapsedFrames += 1;
        if (character.attack.elapsedFrames >= move.startup + move.activeFrames + move.recovery) character.attack = undefined;
      }
      const command = this.parsers[index].update(input, this.frame, this.definitions[index].moves,
        { airborne: !character.grounded, crouching: false });
      // Apenas os quatro básicos em pé: não criar versões agachadas/aéreas implicitamente.
      return input.buttons.size === 1 && character.grounded && !input.direction.startsWith('D') && !input.direction.startsWith('U') ? command : undefined;
    });
    this.characters.forEach((character, index) => {
      const input = inputs[index] ?? neutral();
      const opponent = this.characters[1 - index];
      const wasLocked = lockedAtInput[index];
      character.movementDirection = undefined;
      if (!character.attack && !wasLocked && commands[index]) {
        const move = commands[index]!;
        character.attack = { moveId: move.id, buttons: move.input.buttons, elapsedFrames: 0, hasHit: false };
        character.crouching = false; this.dashFrames[index] = 0;
      }
      if (character.attack) {
        const move = this.move(index, character.attack.moveId)!;
        const elapsed = character.attack.elapsedFrames;
        character.mode = elapsed < move.startup ? 'startup' : elapsed < move.startup + move.activeFrames ? 'active' : 'recovery';
      } else if (!wasLocked) {
        character.crouching = character.grounded && input.direction.startsWith('D');
        const threatening = Boolean(attackingAtInput[1 - index] || opponent.attack || commands[1 - index]);
        const guard = character.grounded && threatening && (input.direction === 'B' || input.direction === 'DB');
        if (guard) { character.mode = 'blocking'; this.dashFrames[index] = 0; }
        else this.moveCharacter(character, input, index);
      } else this.dashFrames[index] = 0;
      const up = input.direction.startsWith('U');
      if (up && !this.jumpHeld[index] && character.grounded && !character.attack && !wasLocked) {
        character.grounded = false; character.crouching = false; character.verticalVelocity = this.definitions[index].movement.jumpVelocity;
        character.mode = 'airborne'; this.dashFrames[index] = 0;
      }
      this.jumpHeld[index] = up;
      if (!character.grounded) {
        character.y += character.verticalVelocity;
        character.verticalVelocity += this.config.movement.gravity;
        if (character.y >= this.config.arena.floorY) {
          character.y = this.config.arena.floorY; character.grounded = true; character.verticalVelocity = 0;
          if (!locked(character) && !character.attack) character.mode = 'neutral';
        }
      }
      if (character.attack || wasLocked || character.mode === 'blocking' || !character.grounded) this.previousAxis[index] = axis(input);
    });
    this.resolveBodies(previousX); this.resolveScreenEdges(previousX); this.updateFacing();
    this.lastHitEvents = this.resolver.resolve(this.characters, inputs);
    this.lastHitEvents.forEach(event => {
      const attacker = this.characters.find(character => character.characterId === event.attackerId)!;
      const target = this.characters.find(character => character.characterId === event.targetId)!;
      target.x += event.pushback * (attacker.facing === 'right' ? 1 : -1);
      this.recentContacts.push({ frame: this.frame, event });
    });
    this.recentContacts = this.recentContacts.filter(entry => this.frame - entry.frame < 180).slice(-20);
    this.resolveBodies(); this.resolveScreenEdges(previousX);
    this.characters.forEach((character,index)=>{
      const previous=previousAnimationStates[index];
      if(character.mode!==previous.mode)character.stateStartedFrame=this.frame;
      const directionalPose=['moving','dashing'].includes(character.mode);
      if(character.mode!==previous.mode || character.grounded!==previous.grounded || character.crouching!==previous.crouching ||
        (directionalPose && character.movementDirection!==previous.movementDirection)){
        character.animationTransition={startedFrame:this.frame+1,from:previous,previous:previousTransitions[index]};
      }
    });
    if (this.options.training) {
      const quiet = this.characters.every(character => !character.attack && !locked(character));
      this.quietFrames = quiet ? this.quietFrames + 1 : 0;
      if (this.trainingAutoRestore && this.quietFrames >= 90) this.characters.forEach(character => { character.health = character.maxHealth; });
    } else {
      this.roundFramesRemaining = Math.max(0, this.roundFramesRemaining - 1);
      if (this.characters.some(character => character.health === 0) || this.roundFramesRemaining === 0) this.finishRound();
    }
    this.frame += 1;
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
    if (moveAxis) {
      character.x += moveAxis * speed * (character.facing === 'right' ? 1 : -1);
      character.movementDirection = moveAxis > 0 ? 'forward' : 'backward';
    }
  }
  /** Stop outward movement at the shared viewport edge; keep the other fighter anchored. */
  private resolveScreenEdges(previousX: readonly number[]): void {
    const limit = this.config.arena.maxSeparation;
    if (limit === undefined) return;
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
    this.characters.forEach(character => { character.x = clamp(character.x, left + character.collision.bodyWidth / 2, right - character.collision.bodyWidth / 2); });
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
    if (first.x < left + first.collision.bodyWidth / 2) {
      first.x = left + first.collision.bodyWidth / 2; second.x = first.x + minimum;
    }
    if (second.x > right - second.collision.bodyWidth / 2) {
      second.x = right - second.collision.bodyWidth / 2; first.x = second.x - minimum;
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
    this.characters.forEach(character => { character.attack = undefined; });
    this.phase = 'round-over'; this.transitionFrames = this.config.match.roundEndPauseFrames;
  }
}
