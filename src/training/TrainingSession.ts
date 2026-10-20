import type { CharacterState } from '../engine/characters/CharacterState';
import type { AttackButton, FrameInput } from '../input/types';

export const DUMMY_MODES = ['manual', 'guard-high', 'guard-low', 'repeat-cross'] as const;
export type DummyMode = typeof DUMMY_MODES[number];

export const DUMMY_LABELS: Record<DummyMode, string> = {
  manual: 'SEGUNDO JOGADOR',
  'guard-high': 'GUARDA ALTA',
  'guard-low': 'GUARDA BAIXA',
  'repeat-cross': 'REPETE SOCO 2',
};

/** Practice controls produce ordinary inputs; the combat engine never receives forced hits or blocks. */
export class TrainingSession {
  paused = false;
  showGeometry = true;
  showInputs = true;
  dummyMode: DummyMode = 'manual';

  cycleDummy(): void {
    this.dummyMode = DUMMY_MODES[(DUMMY_MODES.indexOf(this.dummyMode) + 1) % DUMMY_MODES.length];
  }

  dummyInput(frame: number, characters: readonly CharacterState[]): FrameInput | undefined {
    if (this.dummyMode === 'manual') return undefined;
    if (this.dummyMode === 'repeat-cross') {
      return { direction: 'N', buttons: new Set<AttackButton>(frame % 120 === 30 ? ['2'] : []) };
    }
    const opponent = characters[0];
    // Inputs are read immediately before a logic step. Release B as soon as the
    // opponent has no attack, avoiding an intentional retreat between repetitions.
    const shouldGuard = Boolean(opponent?.attack);
    return { direction: shouldGuard ? this.dummyMode === 'guard-low' ? 'DB' : 'B' : 'N', buttons: new Set() };
  }
}
