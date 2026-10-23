import type { CharacterState } from '../characters/CharacterState';
import type { MoveDefinition } from '../data/moves';
import type { Direction, FrameInput } from '../../input/types';
import type { CombatCommand } from '../data/combat/CombatBook';

/** Commands use real edges, contextual follow-ups and a bounded exit-stun buffer. */
export type CombatCommandResult = MoveDefinition & { bufferedStartupFrames?: number };

export class CombatCommandParser {
  private previous: FrameInput = { direction: 'N', buttons: new Set() };
  private directions: { direction: Direction; frame: number }[] = [];
  private physicalButtons = new Set<string>();
  private chord?: { frame: number; direction: FrameInput['direction']; buttons: Set<import('../../input/types').AttackButton> };
  private previousPosture: 'standing' | 'crouching' = 'standing';
  private held = new Map<string, number>();
  private pending?: { move: MoveDefinition; frame: number; attack?: CharacterState['attack']; charge?: boolean };

  clear(): void {
    this.previous = { direction: 'N', buttons: new Set() };
    this.directions = [];
    this.held.clear();
    this.physicalButtons.clear(); this.chord = undefined;
    this.pending = undefined;
  }

  update(input: FrameInput, frame: number, state: CharacterState, target: CharacterState,
    moves: readonly MoveDefinition[], atWall: boolean): CombatCommandResult | undefined {
    if (moves.some(move => !move.legacy && move.combat?.command.horizontalNeutral)) input = this.sampleChord(input, frame);
    this.previousPosture = input.direction.startsWith('D') ? 'crouching' : 'standing';
    const directionEdge = input.direction !== this.previous.direction;
    if (directionEdge) this.directions.push({ direction: input.direction, frame });
    this.directions = this.directions.filter(edge => frame - edge.frame <= 24);
    for (const button of ['1', '2', '3', '4']) {
      if (input.buttons.has(button as '1')) this.held.set(button, (this.held.get(button) ?? 0) + 1);
      else this.held.delete(button);
    }
    const buttonEdge = [...input.buttons].some(button => !this.previous.buttons.has(button));
    const released = [...this.previous.buttons].some(button => !input.buttons.has(button));
    const candidates = moves.filter(move => move.combat && !move.legacy && this.context(move.combat.command, state, target, atWall));
    if (buttonEdge || directionEdge) {
      const matching = candidates.filter(move => {
        const command = move.combat!.command;
        if (command.holdFrames) return false;
        if (command.buttons.length !== input.buttons.size || !command.buttons.every(button => input.buttons.has(button))) return false;
        if (command.buttons.length && !buttonEdge) return false;
        if (!command.buttons.length && !directionEdge) return false;
        return this.matchesDirections(command, input, frame, state);
      }).sort((a, b) => this.priority(b.combat!.command) - this.priority(a.combat!.command));
      const move = matching[0];
      if (move) {
        const charged = candidates.some(other => other.combat?.command.holdFrames &&
          other.combat.command.parentId === move.combat!.command.parentId &&
          other.combat.command.buttons.join() === move.combat!.command.buttons.join());
        this.pending = { move, frame, attack: this.parentAttack(move.combat!.command, state), charge: charged };
      }
    }
    this.previous = { direction: input.direction, buttons: new Set(input.buttons) };
    const pending = this.pending;
    if (!pending) return undefined;
    let move = pending.move;
    let command = move.combat!.command;
    if (!this.context(command, state, target, atWall) || (command.parentId && this.parentAttack(command, state) !== pending.attack)) {
      this.pending = undefined;
      return undefined;
    }
    if (pending.charge) {
      const charged = candidates.find(other => other.combat?.command.holdFrames &&
        other.combat.command.parentId === command.parentId &&
        other.combat.command.buttons.join() === command.buttons.join() &&
        other.combat.command.buttons.every(button => (this.held.get(button) ?? 0) >= other.combat!.command.holdFrames!));
      if (charged) { move = charged; command = move.combat!.command; }
      else if (!released) return undefined;
    }
    if (command.parentId) {
      const attack = this.parentAttack(command, state)!;
      const window = command.followupWindow!;
      if (attack.elapsedFrames > window.to || (window.onHit && attack.hitOutcome === 'block')) {
        this.pending = undefined;
        return undefined;
      }
      if (attack.elapsedFrames < window.from || (window.onHit && attack.hitOutcome !== 'hit')) return undefined;
    } else {
      if (frame - pending.frame > (state.combatRules?.commandBufferFrames ?? 6)) { this.pending = undefined; return undefined; }
      if (state.attack || ['hitstun', 'blockstun', 'grabbed', 'throwRecovery', 'knockdown'].includes(state.mode)) return undefined;
    }
    this.pending = undefined;
    return pending.charge ? { ...move, bufferedStartupFrames: Math.min(Math.max(0, frame - pending.frame), Math.max(0, move.startup - 1)) } : move;
  }

  private sampleChord(input: FrameInput, frame: number): FrameInput {
    const pressed = [...input.buttons].filter(button => !this.physicalButtons.has(button));
    this.physicalButtons = new Set(input.buttons);
    if (pressed.length) {
      if (!this.chord) this.chord = { frame, direction: input.direction, buttons: new Set() };
      pressed.forEach(button => this.chord!.buttons.add(button));
    }
    if (this.chord && frame - this.chord.frame >= 3) {
      const chord = this.chord; this.chord = undefined;
      return { direction: chord.direction, buttons: chord.buttons };
    }
    return { direction: input.direction, buttons: new Set() };
  }

  private parentAttack(command: CombatCommand, state: CharacterState): CharacterState['attack'] {
    if (!command.parentId) return undefined;
    return [state.attack,state.followup].find(attack => attack && (attack.moveId === command.parentId || command.alternateParentIds?.includes(attack.moveId)));
  }

  private priority(command: CombatCommand): number {
    return Number(Boolean(command.parentId)) * 1000 + Number(command.requiresPower === true) * 100 +
      Number(Boolean(command.stance)) * 50 + (command.directions?.length ?? 0) * 5 + Number(command.preciseFrames !== undefined) * 2;
  }

  private context(command: CombatCommand, state: CharacterState, target: CharacterState, atWall: boolean): boolean {
    if (command.posture) {
      const posture = !state.grounded ? 'air' : this.previousPosture;
      if (posture !== command.posture) return false;
    }
    if (command.parentId && !this.parentAttack(command,state)) return false;
    if (command.parentId && this.parentAttack(command,state)!.elapsedFrames > (command.followupWindow?.to ?? -1)) return false;
    if (command.notation === '2+3' && (state.powerAvailable === false || (state.powerFrames ?? 0) > 0)) return false;
    if (command.requiresPower && !(state.powerFrames && state.powerFrames > 0)) return false;
    if (command.requiresRage && (state.rageUsed || state.health > state.maxHealth * .25)) return false;
    if (command.targetGrounded && target.mode !== 'knockdown') return false;
    if (command.atWall && !atWall) return false;
    if (command.stance === 'crouching' && (state.crouchFrames ?? 0) < 6) return false;
    if (command.stance === 'rising' && (state.risingFrames ?? 0) <= 0) return false;
    if (command.stance && !['crouching', 'rising', 'standing'].includes(command.stance) && state.stance !== command.stance) return false;
    return state.grounded || command.posture === 'air' || Boolean(command.parentId) || Boolean(command.directions?.some(direction => direction.startsWith('U')));
  }

  private matchesDirections(command: CombatCommand, input: FrameInput, frame: number, state: CharacterState): boolean {
    return [command.directions ?? [], ...(command.directionAliases ?? [])].some(sequence => this.matchesSequence(sequence, command, input, frame, state));
  }

  private matchesSequence(sequence: readonly Direction[], command: CombatCommand, input: FrameInput, frame: number, state: CharacterState): boolean {
    if (!sequence.length && command.horizontalNeutral) return true;
    if (!sequence.length) return input.direction === 'N' || Boolean(command.parentId) || Boolean(command.stance);
    if (input.direction !== sequence[sequence.length - 1]) return false;
    if (sequence.length === 1) return true;
    if (state.stance === 'crouch-dash' && sequence[0] === 'F' && sequence[1] === 'N') {
      const finalEdge = this.directions[this.directions.length - 1];
      return command.preciseFrames === undefined || Boolean(finalEdge && frame - finalEdge.frame <= command.preciseFrames);
    }
    let position = sequence.length - 1;
    let finalFrame = frame;
    for (let i = this.directions.length - 1; i >= 0; i -= 1) {
      const edge = this.directions[i];
      if (edge.direction === sequence[position]) {
        if (position === sequence.length - 1) finalFrame = edge.frame;
        position -= 1;
        if (position < 0) return command.preciseFrames === undefined || frame - finalFrame <= command.preciseFrames;
      } else if (edge.direction !== 'N' || sequence[position] === 'N') return false;
    }
    return false;
  }
}
