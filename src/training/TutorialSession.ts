import type { SimulationSnapshot } from '../engine/simulation/Simulation';
import type { Direction, FrameInput } from '../input/types';
import type { CharacterDefinition } from '../engine/data/characters';
import { nameOf, t } from '../i18n/i18n';
import { routeInputs, type ComboRoute, type FighterRoutes } from './comboRoute';
import { TUTORIAL_START_DISTANCE, approachInputs, isBasicLessonMove, isComboLessonMove, moveCommand, moveStep, playExample } from './tutorialLessons';
import comboRoutes from './comboRoutes.json';

export type TutorialCheck = 'walk' | 'jump' | 'crouch' | 'guard';
export interface TutorialLesson {
  key: string; title: string; instruction: string; notation: string;
  /** Moves that must connect in this order within one combo. */
  moves?: readonly string[];
  /** Command of each move in `moves`, shown as the steps of the lesson. */
  steps?: readonly string[];
  check?: TutorialCheck;
  /** Inputs shown by the example key. */
  demo?: readonly FrameInput[];
  /** The lesson starts with the opponent near the wall, so a throw can bounce him off it. */
  wall?: boolean;
}
export interface TutorialSection { id: 'basic' | 'combos' | 'advanced'; title: string; lessons: readonly TutorialLesson[] }

const held = (direction: Direction, frames: number): FrameInput[] => Array.from({ length: frames }, () => ({ direction, buttons: new Set() }));
const CHECK_DEMOS: Readonly<Record<TutorialCheck, readonly FrameInput[]>> = {
  walk: [...held('F', 40), ...held('N', 15), ...held('B', 40), ...held('N', 15)],
  jump: [...held('U', 1), ...held('N', 50), ...held('UF', 1), ...held('N', 60)],
  crouch: [...held('D', 60), ...held('N', 20)],
  guard: held('B', 200),
};
const routesOf = (fighterId: string): FighterRoutes | undefined => (comboRoutes as Record<string, FighterRoutes>)[fighterId];
const demoOf = (fighter: CharacterDefinition, route?: ComboRoute) => route && [...approachInputs(fighter), ...routeInputs(route.steps, 90)];
/** Frames a walk or crouch must be held to count. */
const HOLD_FRAMES = 20;

/** Free tutorial: three sections whose lessons can be chosen in any order and replayed by an example. */
export class TutorialSession {
  readonly sections: readonly TutorialSection[];
  sectionIndex = 0; lessonIndex = 0; passed = false;
  readonly completed = new Set<string>();
  private observedFrame = -1;
  private checkFrames = 0;
  private connected: string[] = [];
  private demo?: { frames: readonly FrameInput[]; index: number };

  private readonly measured = new Map<TutorialLesson, { hits: number; damage: number } | undefined>();

  constructor(private readonly fighter: CharacterDefinition) {
    const routes = routesOf(fighter.id);
    const stepOf = (id: string) => moveStep(fighter.moves.find(move => move.id === id)!);
    const moveLesson = (key: string, title: string, notation: string, moves: readonly string[], instruction: string): TutorialLesson => {
      const route = routes?.lessons[key];
      return { key, title, notation, moves, steps: moves.map(stepOf), instruction, demo: demoOf(fighter, route) };
    };
    const lessonOfMove = (instruction: string) => (move: CharacterDefinition['moves'][number]) =>
      moveLesson(`move:${move.id}`, nameOf(`move.${fighter.id}.${move.id}`, move.name), move.notation ?? moveCommand(move), [move.id], instruction);
    const recipeMoves = (id: string) => {
      const combo = fighter.combos!.find(recipe => recipe.id === id)!;
      return combo.finisherMoveId ? [...combo.moveIds.slice(0, -1), combo.finisherMoveId] : combo.moveIds;
    };
    const check = (key: TutorialCheck, notation: string): TutorialLesson =>
      ({ key, title: t(`tutorial.${key}`), instruction: t(`tutorial.${key}Hint`), notation, check: key, demo: CHECK_DEMOS[key] });
    const comboHint = t('tutorial.comboHint');
    const advanced: TutorialLesson[] = [...(routes?.advanced ?? []).map((route, index) => ({
        key: `advanced:${index}`, title: t('tutorial.advancedTitle', { number: index + 1 }), instruction: t('tutorial.advancedHint'),
        notation: route.notation, moves: route.moveIds, steps: route.moveIds.map(stepOf), demo: demoOf(fighter, route),
      })),
      // The bounce combo closes the section: it starts near the wall.
      ...(routes?.wall ? [{ key: 'wall', title: t('tutorial.wallTitle'), instruction: t('tutorial.wallHint'), wall: true,
        notation: routes.wall.notation, moves: routes.wall.moveIds, steps: routes.wall.moveIds.map(stepOf), demo: demoOf(fighter, routes.wall) }] : [])];
    this.sections = [
      { id: 'basic', title: t('tutorial.sectionBasic'), lessons: [
        check('walk', 'f / b'), check('jump', 'u'), check('crouch', 'd'), check('guard', 'b'),
        ...fighter.moves.filter(isBasicLessonMove).map(lessonOfMove(t('tutorial.basicHint'))),
      ] },
      { id: 'combos', title: t('tutorial.sectionCombos'), lessons: [
        ...(fighter.combos ?? []).map(combo => moveLesson(`combo:${combo.id}`, nameOf(`combo.${fighter.id}.${combo.id}`, combo.name), combo.notation, recipeMoves(combo.id), comboHint)),
        ...(fighter.comboChains ?? []).map((chain, index) => moveLesson(`chain:${index}`, nameOf(`chain.${fighter.id}.${index}`, chain.name),
          chain.recipeIds.map(id => fighter.combos!.find(recipe => recipe.id === id)!.notation).join(','), chain.recipeIds.flatMap(recipeMoves), comboHint)),
        ...fighter.moves.filter(isComboLessonMove).map(lessonOfMove(t('tutorial.specialHint'))),
      ] },
      { id: 'advanced', title: t('tutorial.sectionAdvanced'), lessons: advanced },
    ];
  }
  /**
   * Hits and damage of a lesson's example, measured by playing it with the fighter's current data,
   * so a changed move never leaves stale numbers on screen. Measured once per lesson, when first shown.
   */
  stats(lesson: TutorialLesson): { hits: number; damage: number } | undefined {
    if (!lesson.moves || !lesson.demo) return undefined;
    if (!this.measured.has(lesson)) {
      const combos = playExample(this.fighter, lesson.demo, TUTORIAL_START_DISTANCE, lesson.wall);
      // The wall bounce closes a combo and the sequence goes on in another: the lesson adds them up.
      const counted = lesson.wall ? combos : combos.sort((a, b) => b.hits - a.hits).slice(0, 1);
      this.measured.set(lesson, counted.length ? { hits: counted.reduce((total, combo) => total + combo.hits, 0), damage: counted.reduce((total, combo) => total + combo.damage, 0) } : undefined);
    }
    return this.measured.get(lesson);
  }
  get section(): TutorialSection { return this.sections[this.sectionIndex]; }
  get lesson(): TutorialLesson | undefined { return this.section.lessons[this.lessonIndex]; }
  get demonstrating(): boolean { return Boolean(this.demo); }

  /** Moves to another section (wrapping) and opens its first lesson. */
  changeSection(delta: number): void {
    this.sectionIndex = (this.sectionIndex + delta + this.sections.length) % this.sections.length;
    this.lessonIndex = 0; this.resetAttempt();
  }
  /** Lessons in reading order: past the end of a section comes the next section, after the last one the first again. */
  private position(delta: number): { sectionIndex: number; lessonIndex: number } {
    const order = this.sections.flatMap((section, sectionIndex) => section.lessons.map((_, lessonIndex) => ({ sectionIndex, lessonIndex })));
    const current = order.findIndex(entry => entry.sectionIndex === this.sectionIndex && entry.lessonIndex === this.lessonIndex);
    return order[(current + delta + order.length) % order.length] ?? { sectionIndex: this.sectionIndex, lessonIndex: 0 };
  }
  changeLesson(delta: number): void {
    ({ sectionIndex: this.sectionIndex, lessonIndex: this.lessonIndex } = this.position(delta));
    this.resetAttempt();
  }
  /** Where the next-lesson command leads, for the HUD. */
  get upcoming(): { section: TutorialSection; lesson: TutorialLesson } | undefined {
    const next = this.position(1), section = this.sections[next.sectionIndex], lesson = section.lessons[next.lessonIndex];
    return lesson && { section, lesson };
  }
  /** Steps of the current lesson connected in this attempt. */
  get connectedSteps(): number { return this.passed ? this.lesson?.moves?.length ?? 0 : Math.min(this.connected.length, this.lesson?.moves?.length ?? 0); }
  /** Share of a walk or crouch already held. */
  get holdProgress(): number { return this.passed ? 1 : Math.min(1, this.checkFrames / HOLD_FRAMES); }
  /** The fight is reset by the scene; the example then replaces player one's inputs. */
  startDemo(): boolean {
    const frames = this.lesson?.demo;
    this.resetAttempt();
    if (frames) this.demo = { frames, index: 0 };
    return Boolean(frames);
  }
  /** Example input for the next simulation step; undefined when no example is playing or it has ended. */
  demoInput(): FrameInput | undefined {
    const demo = this.demo;
    return demo && demo.index < demo.frames.length ? demo.frames[demo.index++] : undefined;
  }
  /** The example played its last input; the scene then resets the attempt for the player. */
  get demoFinished(): boolean { return Boolean(this.demo && this.demo.index >= this.demo.frames.length); }
  resetAttempt(): void { this.observedFrame = -1; this.checkFrames = 0; this.connected = []; this.passed = false; this.demo = undefined; }

  observe(snapshot: SimulationSnapshot, input: FrameInput): void {
    const lesson = this.lesson;
    // During an example the steps light up as well, but only the player can complete the lesson.
    if (!lesson || this.passed || snapshot.frame === this.observedFrame) return;
    this.observedFrame = snapshot.frame;
    const [self, target] = snapshot.characters;
    if (lesson.check === 'walk' || lesson.check === 'crouch') {
      const doing = lesson.check === 'walk' ? self.mode === 'moving' && ['F', 'B'].includes(input.direction) : self.crouching && self.grounded;
      if (doing) this.checkFrames += 1;
      this.finish(this.checkFrames >= HOLD_FRAMES);
    } else if (lesson.check === 'jump') this.finish(!self.grounded);
    else if (lesson.check === 'guard') this.finish(snapshot.hitEvents.some(event => event.targetId === self.characterId && event.outcome === 'block'));
    else if (lesson.moves) {
      // A free defender ends the attempt: independent attacks never add up to a combo.
      if (target.mode !== 'hitstun' && target.mode !== 'knockdown') this.connected = [];
      for (const event of snapshot.hitEvents) {
        if (event.attackerId !== self.characterId || event.outcome !== 'hit') { this.connected = []; continue; }
        const expected = lesson.moves[this.connected.length];
        if (event.moveId === expected) this.connected.push(event.moveId);
        // Further hits of a multi-hit move or volley belong to the step already counted.
        else if (event.moveId !== this.connected[this.connected.length - 1]) this.connected = event.moveId === lesson.moves[0] ? [event.moveId] : [];
      }
      this.finish(this.connected.length === lesson.moves.length);
    }
  }
  private finish(passed: boolean): void {
    if (!passed || this.demo) return;
    this.passed = true;
    this.completed.add(`${this.section.id}/${this.lesson!.key}`);
  }
  isCompleted(section: TutorialSection, lesson: TutorialLesson): boolean { return this.completed.has(`${section.id}/${lesson.key}`); }
}
