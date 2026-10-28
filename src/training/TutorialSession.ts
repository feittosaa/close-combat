import type { SimulationSnapshot } from '../engine/simulation/Simulation';
import type { FrameInput } from '../input/types';
import type { CharacterDefinition } from '../engine/data/characters';
export interface TutorialLesson {
  title: string; instruction: string; notation: string; distance: number;
  moves?: readonly string[]; movement?: boolean; guard?: boolean;
}
/** Ferramenta preservada, sem receitas antigas ou progressão por digitação isolada. */
export class TutorialSession {
  index = 0; passed = false;
  private observedFrame = -1;
  private movementFrames = 0;
  private connected: string[] = [];
  readonly lessons: readonly TutorialLesson[];
  constructor(fighter: CharacterDefinition, kind: 'tutorial' | 'combo-tutorial') {
    this.lessons = kind === 'combo-tutorial' ? (fighter.combos ?? []).map(combo => ({
      title: combo.name, instruction: 'Conecte os golpes na ordem da receita aprovada.', notation: combo.notation, moves: combo.moveIds, distance: 64,
    })) : [
      { title: 'Mover', instruction: 'Ande para frente ou para trás para ajustar a distância.', notation: 'F / B', distance: 110, movement: true },
      ...fighter.moves.filter(move => !move.airborne && (!move.category || move.category === 'basic')).map(move => ({ title: move.name, instruction: 'Aproxime-se e acerte. Solte o botão antes de atacar novamente.', notation: move.input.buttons.join('+'), moves: [move.id], distance: 64 })),
      { title: 'Defender', instruction: 'Segure trás para bloquear o soco do adversário.', notation: 'B', guard: true, distance: 64 },
    ];
  }
  get lesson(): TutorialLesson | undefined { return this.lessons[this.index]; }
  get complete(): boolean { return this.lessons.length > 0 && this.passed && this.index === this.lessons.length - 1; }
  resetAttempt(): void { this.observedFrame = -1; this.movementFrames = 0; this.connected = []; this.passed = false; }
  next(): boolean { if (!this.passed || this.complete) return false; this.index += 1; this.resetAttempt(); return true; }
  observe(snapshot: SimulationSnapshot, input: FrameInput): void {
    const lesson = this.lesson;
    if (!lesson || this.passed || snapshot.frame === this.observedFrame) return;
    this.observedFrame = snapshot.frame;
    const [self, target] = snapshot.characters;
    if (lesson.movement) {
      if (self.mode === 'moving' && ['F', 'B'].includes(input.direction)) this.movementFrames += 1;
      this.passed = this.movementFrames >= 20; return;
    }
    if (lesson.guard) { this.passed = snapshot.hitEvents.some(event => event.targetId === self.characterId && event.outcome === 'block'); return; }
    if (!lesson.moves) return;
    // Um defensor livre encerra a tentativa: não somar ataques independentes como combo.
    if (target.mode !== 'hitstun') this.connected = [];
    for (const event of snapshot.hitEvents) {
      if (event.attackerId !== self.characterId || event.outcome !== 'hit') { this.connected = []; continue; }
      if (event.moveId !== lesson.moves[this.connected.length]) this.connected = [];
      if (event.moveId === lesson.moves[this.connected.length]) this.connected.push(event.moveId);
    }
    this.passed = this.connected.length === lesson.moves.length;
  }
}
