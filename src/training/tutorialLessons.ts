import type { CharacterDefinition } from '../engine/data/characters';
import type { MoveDefinition } from '../engine/data/moves';
import type { FrameInput } from '../input/types';
import { Simulation, type ComboRecord } from '../engine/simulation/Simulation';
import { createGameConfig, type GameConfig } from '../engine/data/gameConfig';
import { trainingStage } from '../rendering/stages/stageCatalog';
import { createStageLayout, getStageArenaBounds } from '../rendering/stages/stageLayout';
import { LOGICAL_VIEW } from '../rendering/presentation';

/** Separation from which the combo routes were found and are replayed. */
export const TUTORIAL_DISTANCE = 64;
/** Every tutorial attempt starts a little apart; an example first walks in to `TUTORIAL_DISTANCE`. */
export const TUTORIAL_START_DISTANCE = 96;

/** Forward walk that brings the fighter from the starting separation to the routes' distance. */
export function approachInputs(fighter: CharacterDefinition): FrameInput[] {
  const frames = Math.ceil((TUTORIAL_START_DISTANCE - TUTORIAL_DISTANCE) / fighter.movement.walkSpeed);
  return Array.from({ length: frames }, () => ({ direction: 'F', buttons: new Set() }));
}

/** Same arena as the tutorial match: logical view inside the training room. */
export function tutorialGameConfig(): GameConfig {
  const config = createGameConfig(LOGICAL_VIEW.width, LOGICAL_VIEW.height);
  Object.assign(config.arena, getStageArenaBounds(createStageLayout(trainingStage, LOGICAL_VIEW.width, LOGICAL_VIEW.height, config.arena.floorY)));
  return config;
}

/**
 * Plays an example from the given separation with full rage, then waits until the ultimate cinematic, every projectile,
 * the attack and the opponent's reaction are over. Returns player one's combos. With `wall`, the opponent starts near the wall.
 */
export function playExample(fighter: CharacterDefinition, inputs: readonly FrameInput[], distance: number, wall = false): ComboRecord[] {
  const sim = new Simulation(tutorialGameConfig(), [fighter, fighter], { training: true, initialDistance: distance, wall });
  const idle: FrameInput = { direction: 'N', buttons: new Set() };
  sim.fillTrainingRage();
  for (const input of inputs) sim.stepFrame([input, idle]);
  const busy = () => {
    const now = sim.snapshot();
    return Boolean(now.ultimateActivation || now.projectiles.length || now.characters[0].attack || now.comboHistory.some(combo => combo.active));
  };
  for (let frame = 0; frame < 900 && busy(); frame++) sim.stepFrame([idle, idle]);
  return sim.snapshot().comboHistory.filter(combo => combo.attackerId === 'player-1');
}

/** Command of one move in the notation read by `routeInputs`. */
export function moveCommand(move: MoveDefinition): string {
  const press = `${move.crouching ? 'd+' : ''}${move.input.buttons.join('+')}`;
  return [...(move.input.sequence ?? []).map(direction => direction.toLowerCase()), press].join(',');
}

/** One step of a lesson as the player reads it: air moves keep their «no ar» prefix. */
export const moveStep = (move: MoveDefinition): string => move.airborne ? `no ar + ${moveCommand(move)}` : moveCommand(move);

/**
 * Notation of a found route by the moves it performs: two quarter circles pressed in a row can start an ultimate,
 * and the reader must see the ultimate, not two specials.
 */
export const routeNotation = (fighter: CharacterDefinition, moveIds: readonly string[]): string =>
  moveIds.map(id => moveStep(fighter.moves.find(move => move.id === id)!)).join(',');

export const isBasicLessonMove = (move: MoveDefinition): boolean =>
  !move.comboOnly && !move.shortcutOnly && !move.commandGrab && ['basic', 'crouching', 'power', 'throw', undefined].includes(move.category);
export const isComboLessonMove = (move: MoveDefinition): boolean =>
  !move.comboOnly && !move.shortcutOnly && (Boolean(move.commandGrab) || move.category === 'special' || move.category === 'ultimate');

/** Moves pressed by each lesson with a demonstration, keyed as in `comboRoutes.json`. */
export function lessonCommands(fighter: CharacterDefinition): Record<string, readonly string[]> {
  const byId = (id: string) => fighter.moves.find(move => move.id === id)!;
  // A jump precedes each air move that follows a ground one.
  const pressed = (moveIds: readonly string[]) => moveIds.map(byId).flatMap((move, index, moves) =>
    [...(move.airborne && !moves[index - 1]?.airborne ? ['uf'] : []), moveCommand(move)]);
  // A move that only connects with an airborne target is shown after the launcher that puts it there.
  const launcher = fighter.moves.find(move => move.commandGrab?.launch && !move.shortcutOnly);
  const groundSetup = (move: MoveDefinition) => {
    const combo = fighter.combos?.find(candidate => candidate.moveIds.indexOf(move.id) > 0 && fighter.moves.some(previous => previous.id === candidate.moveIds[candidate.moveIds.indexOf(move.id) - 1] && previous.knockdown));
    const index = combo?.moveIds.indexOf(move.id) ?? -1;
    return combo && index > 0 ? [combo.moveIds[index - 1], move.id] : [move.id];
  };
  const recipe = (id: string) => fighter.combos!.find(combo => combo.id === id)!.moveIds;
  return Object.fromEntries([
    ...fighter.moves.filter(move => isBasicLessonMove(move) || isComboLessonMove(move)).map(move => [`move:${move.id}`,
      pressed(move.commandGrab?.airTarget === 'only' && launcher ? [launcher.id, move.id] : move.commandGrab?.groundOnly ? groundSetup(move) : [move.id])]),
    ...(fighter.combos ?? []).map(combo => [`combo:${combo.id}`, pressed(combo.moveIds)]),
    ...(fighter.comboChains ?? []).map((chain, index) => [`chain:${index}`, pressed(chain.recipeIds.flatMap(recipe))]),
  ]);
}
