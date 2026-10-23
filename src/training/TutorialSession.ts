import type { SimulationSnapshot } from '../engine/simulation/Simulation';
import type { FrameInput } from '../input/types';
import type { CharacterDefinition } from '../engine/data/characters';

export interface TutorialLesson {
  title: string;
  instruction: string;
  notation: string;
  distance: number;
  moves?: readonly string[];
  movement?: boolean;
  airborne?: boolean;
  guard?: boolean;
  healthRatio?: number;
}

/** Progress observes real input and connected move IDs from one uninterrupted combo. */
export class TutorialSession {
  index = 0;
  passed = false;
  private observedFrame = -1;
  private movementFrames = 0;
  readonly lessons: readonly TutorialLesson[];

  constructor(fighter: CharacterDefinition, kind: 'tutorial' | 'combo-tutorial') {
    const launch = fighter.combos![0].moveIds.slice(0, 3);
    this.lessons = kind === 'combo-tutorial' ? fighter.combos!.map((combo, i) => ({
      title: combo.name, instruction: i === 0 ? 'Conecte os três golpes do levantamento e finalize com os dois socos.' :
        'Repita o levantamento. Depois, conecte dois socos leves e finalize com os dois socos.',
      notation: combo.notation, moves: combo.moveIds, distance: 62,
    })) : [
      { title: 'Mover e escolher a distância', instruction: 'Ande para frente ou para trás por 20 frames. O soco será o mesmo nas duas direções.', notation: 'F / B', distance: 110, movement: true },
      { title: 'Soco leve', instruction: 'Aproxime-se e acerte um soco leve. Solte a tecla antes de atacar outra vez.', notation: '1', moves: ['standing-lp'], distance: 62 },
      { title: 'Agachar e atacar', instruction: 'Segure baixo e acerte o chute leve. As diagonais baixas usam a mesma postura.', notation: 'AG 3', moves: ['crouching-lk'], distance: 62 },
      { title: 'Ataque aéreo', instruction: 'Salte, depois pressione o chute leve durante o salto.', notation: 'U → AR 3', airborne: true, distance: 62 },
      { title: 'Dois socos juntos', instruction: 'Acerte pressionando os dois socos juntos. + significa simultâneo; vírgula indica sequência.', notation: '1+2', moves: ['standing-pp'], distance: 62 },
      { title: 'Defender', instruction: 'Segure trás e bloqueie o soco do adversário. Baixos exigem baixo + trás.', notation: 'B', guard: true, distance: 62 },
      { title: 'String e levantamento', instruction: 'Conecte a sequência no ritmo: soco leve, soco leve, soco forte. O último lança o alvo.', notation: '1,1,2', moves: launch, distance: 62 },
      { title: 'Especial à distância', instruction: 'Acerte o projétil com soco leve + chute forte. Nenhum movimento de direção é necessário.', notation: '1+4', moves: [fighter.moves.find(move => !move.legacy && move.projectile)!.id], distance: 220 },
      { title: 'Agarrão frontal', instruction: 'Perto do alvo, pressione soco leve + chute leve. O defensor pode escapar com 1 durante a captura.', notation: '1+3', moves: ['forward-throw'], distance: 58 },
      { title: 'Agarrão com troca de lado', instruction: 'Pressione soco forte + chute forte. Este agarrão troca os lados; a quebra usa 2.', notation: '2+4', moves: ['reverse-throw'], distance: 58 },
      { title: 'Ultimate', instruction: 'Com até 25% de vida, acerte os quatro botões juntos. Você tem uma tentativa por round; reinicie se errar.', notation: '1+2+3+4', moves: ['ultimate'], distance: 62, healthRatio: .25 },
    ];
  }
  get lesson(): TutorialLesson { return this.lessons[this.index]; }
  get complete(): boolean { return this.passed && this.index === this.lessons.length - 1; }
  resetAttempt(): void { this.observedFrame = -1; this.movementFrames = 0; this.passed = false; }
  next(): boolean {
    if (!this.passed || this.complete) return false;
    this.index += 1; this.resetAttempt(); return true;
  }
  observe(snapshot: SimulationSnapshot, input: FrameInput): void {
    if (this.passed || snapshot.frame === this.observedFrame) return;
    this.observedFrame = snapshot.frame;
    const lesson = this.lesson, [self, target] = snapshot.characters;
    if (lesson.movement) {
      if (self.mode === 'moving' && ['F', 'B'].includes(input.direction)) this.movementFrames += 1;
      this.passed = this.movementFrames >= 20;
    } else if (lesson.airborne) {
      this.passed = !self.grounded && self.attack?.airborne === true;
    } else if (lesson.guard) {
      this.passed = snapshot.hitEvents.some(event => event.targetId === self.characterId && event.outcome === 'block');
    } else if (lesson.moves?.length === 1 && lesson.moves[0].includes('throw')) {
      this.passed = snapshot.hitEvents.some(event => event.attackerId === self.characterId && event.moveId === lesson.moves![0] && event.outcome === 'throw');
    } else if (lesson.moves) {
      const combo = target.combo;
      // lastCombo is intentionally excluded: resetting must never pass a stale attempt.
      this.passed = combo?.attackerId === self.characterId && combo.moveIds.length === lesson.moves.length &&
        lesson.moves.every((id, i) => combo.moveIds[i] === id);
    }
  }
}
