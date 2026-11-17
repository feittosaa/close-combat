import type { ArcadeRoute } from '../engine/combat/ArcadeController';
import comboRoutes from './comboRoutes.json';
import { routeInputs, type FighterRoutes } from './comboRoute';

/** Combos avançados de autoria manual do lutador, como entradas que a IA do Arcade pode executar. */
export function arcadeRoutes(fighterId: string): readonly ArcadeRoute[] {
  const routes = (comboRoutes as Record<string, FighterRoutes>)[fighterId]?.advanced ?? [];
  return routes.map(route => ({ frames: routeInputs(route.steps), firstMoveId: route.moveIds[0], hits: route.hits, damage: route.damage, difficulty: route.difficulty }));
}
