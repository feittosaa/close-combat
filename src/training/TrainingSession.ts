import type { CharacterState } from '../engine/characters/CharacterState';
import type { AttackButton, FrameInput } from '../input/types';
import type { SimulationSnapshot } from '../engine/simulation/Simulation';
import { getCharacterById } from '../engine/data/characters';
import type { MoveDefinition } from '../engine/data/moves';

export const DUMMY_MODES = ['manual', 'guard-high', 'guard-low', 'repeat-cross', 'repeat-jab', 'repeat-kick'] as const;
export type DummyMode = typeof DUMMY_MODES[number];

export const DUMMY_LABELS: Record<DummyMode, string> = {
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
  dummyMode: DummyMode = 'manual';
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
      this.lastMoves[index] = getCharacterById(character.fighterId)?.moves.find(({ id }) => id === character.attack?.moveId);
    });
  }

  resetInspection(): void {
    this.lastMoves.fill(undefined);
  }

  cycleDummy(): void {
    this.dummyMode = DUMMY_MODES[(DUMMY_MODES.indexOf(this.dummyMode) + 1) % DUMMY_MODES.length];
  }

  dummyInput(frame: number, characters: readonly CharacterState[], projectiles: SimulationSnapshot['projectiles'] = []): FrameInput | undefined {
    if (this.dummyMode === 'manual') return undefined;
    const self = characters[1];
    if (self?.mode === 'knockdown') {
      // Automated practice partners must explicitly choose a manual wake-up.
      // Alternate release/press to recover even if guard was held on landing.
      return { direction: self.grounded && self.remainingStateFrames <= 1 && frame % 2 === 1 ? 'B' : 'N', buttons: new Set() };
    }
    if (this.dummyMode.startsWith('repeat-')) {
      const button = this.dummyMode === 'repeat-jab' ? '1' : this.dummyMode === 'repeat-kick' ? '4' : '2';
      return { direction: 'N', buttons: new Set<AttackButton>(frame % 120 === 30 ? [button] : []) };
    }
    const opponent = characters[0];
    // Inputs are read immediately before a logic step. Release B as soon as the
    // opponent has no attack, avoiding an intentional retreat between repetitions.
    const shouldGuard = Boolean(opponent?.attack) || projectiles.some((projectile) => projectile.ownerId === opponent?.characterId);
    return { direction: shouldGuard ? this.dummyMode === 'guard-low' ? 'DB' : 'B' : 'N', buttons: new Set() };
  }
}
