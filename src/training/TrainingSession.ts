import type { CharacterState } from '../engine/characters/CharacterState';
import type { AttackButton, FrameInput } from '../input/types';
import type { SimulationSnapshot } from '../engine/simulation/Simulation';
import { getCharacterById } from '../engine/data/characters';
import type { MoveDefinition } from '../engine/data/moves';

export const OPPONENT_MODES = ['idle', 'guard-high', 'guard-low', 'repeat-cross', 'repeat-jab', 'repeat-kick', 'manual'] as const;
export type OpponentMode = typeof OPPONENT_MODES[number];

export const OPPONENT_LABELS: Record<OpponentMode, string> = {
  idle: 'PARADO',
  manual: 'SEGUNDO JOGADOR',
  'guard-high': 'GUARDA ALTA',
  'guard-low': 'GUARDA BAIXA',
  'repeat-cross': 'REPETE SOCO 2',
  'repeat-jab': 'REPETE SOCO 1',
  'repeat-kick': 'REPETE CHUTE 4',
};

/** Practice controls produce ordinary inputs; the combat engine never receives forced hits or blocks. */
export class TrainingSession {
  paused = false;
  showGeometry = true;
  showInputs = true;
  opponentMode: OpponentMode = 'idle';
  speed: 1 | 0.5 | 0.25 = 1;
  autoRestore = true;
  initialDistance = 96;
  readonly lastMoves: [MoveDefinition | undefined, MoveDefinition | undefined] = [undefined, undefined];

  cycleSpeed(): void {
    this.speed = this.speed === 1 ? 0.5 : this.speed === 0.5 ? 0.25 : 1;
  }

  cycleDistance(): void {
    this.initialDistance = this.initialDistance === 96 ? 144 : this.initialDistance === 144 ? 220 : 96;
  }

  observe(snapshot: SimulationSnapshot): void {
    snapshot.characters.forEach((character, index) => {
      if (!character.attack || index > 1) return;
      const move = getCharacterById(character.fighterId)?.moves.find(({ id }) => id === character.attack?.moveId);
      this.lastMoves[index] = move && character.attack.recoveryFrames !== undefined
        ? { ...move, recovery: character.attack.recoveryFrames } : move;
    });
  }

  resetInspection(): void {
    this.lastMoves.fill(undefined);
  }

  cycleOpponent(): void {
    this.opponentMode = OPPONENT_MODES[(OPPONENT_MODES.indexOf(this.opponentMode) + 1) % OPPONENT_MODES.length];
  }

  opponentInput(frame: number, characters: readonly CharacterState[]): FrameInput | undefined {
    if (this.opponentMode === 'manual') return undefined;
    if (this.opponentMode === 'idle') return { direction: 'N', buttons: new Set() };
    if (this.opponentMode.startsWith('repeat-')) {
      const button = this.opponentMode === 'repeat-jab' ? '1' : this.opponentMode === 'repeat-kick' ? '4' : '2';
      return { direction: 'N', buttons: new Set<AttackButton>(frame % 120 === 30 ? [button] : []) };
    }
    const opponent = characters[0];
    // Inputs are read immediately before a logic step. Release B as soon as the
    // opponent has no attack, avoiding an intentional retreat between repetitions.
    const shouldGuard = Boolean(opponent?.attack);
    return { direction: shouldGuard ? this.opponentMode === 'guard-low' ? 'DB' : 'B' : 'N', buttons: new Set() };
  }
}
