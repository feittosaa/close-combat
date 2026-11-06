import type { SimulationSnapshot } from '../engine/simulation/Simulation';
import type { FrameInput } from '../input/types';
import type { CharacterDefinition } from '../engine/data/characters';
import { nameOf, t } from '../i18n/i18n';
export interface TutorialLesson {
  part: string; title: string; instruction: string; notation: string; distance: number;
  moves?: readonly string[]; movement?: boolean; guard?: boolean;
}
/** Tutorial único: movimento, básicos, defesa e, por fim, combos do mais leve ao mais pesado. */
export class TutorialSession {
  index = 0; passed = false;
  private observedFrame = -1;
  private movementFrames = 0;
  private connected: string[] = [];
  readonly lessons: readonly TutorialLesson[];
  constructor(fighter: CharacterDefinition) {
    const damage = (moveIds: readonly string[]) => moveIds.reduce((total, id) => total + (fighter.moves.find(move => move.id === id)?.damage ?? 0), 0);
    const recipes = (fighter.combos ?? []).map(combo => ({
      id: combo.id, title: nameOf(`combo.${fighter.id}.${combo.id}`, combo.name), notation: combo.notation,
      moves: combo.finisherMoveId ? [...combo.moveIds.slice(0, -1), combo.finisherMoveId] : combo.moveIds,
    }));
    const chains = (fighter.comboChains ?? []).map((chain, index) => {
      const parts = chain.recipeIds.map(id => recipes.find(recipe => recipe.id === id)!);
      return { title: nameOf(`chain.${fighter.id}.${index}`, chain.name), notation: parts.map(part => part.notation).join(','), moves: parts.flatMap(part => part.moves) };
    });
    const combos = [...recipes.map(({ id, ...recipe }) => recipe), ...chains].sort((a, b) => damage(a.moves) - damage(b.moves)).map(combo => ({
      part: t('tutorial.partCombos'), ...combo, instruction: t('tutorial.comboHint'), distance: 64,
    }));
    this.lessons = [
      { part: t('tutorial.partMovement'), title: t('tutorial.move'), instruction: t('tutorial.moveHint'), notation: 'F / B', distance: 110, movement: true },
      ...fighter.moves.filter(move => !move.airborne && (!move.category || move.category === 'basic')).map(move => ({ part: t('tutorial.partBasics'), title: nameOf(`move.${fighter.id}.${move.id}`, move.name), instruction: t('tutorial.basicHint'), notation: move.input.buttons.join('+'), moves: [move.id], distance: 64 })),
      { part: t('tutorial.partDefense'), title: t('tutorial.guard'), instruction: t('tutorial.guardHint'), notation: 'B', guard: true, distance: 64 },
      ...combos,
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
    if (target.mode !== 'hitstun' && target.mode !== 'knockdown') this.connected = [];
    for (const event of snapshot.hitEvents) {
      if (event.attackerId !== self.characterId || event.outcome !== 'hit') { this.connected = []; continue; }
      if (event.moveId !== lesson.moves[this.connected.length]) this.connected = [];
      if (event.moveId === lesson.moves[this.connected.length]) this.connected.push(event.moveId);
    }
    this.passed = this.connected.length === lesson.moves.length;
  }
}
