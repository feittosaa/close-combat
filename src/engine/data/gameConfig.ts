import { maximumFighterSeparation } from './fightFraming';
// src/engine/data/gameConfig.ts
export interface GameConfig {
  arena: { left: number; right: number; floorY: number; maxSeparation?: number };
  movement: {
    walkSpeed: number;
    jumpImpulse: number;
    gravity: number;
    dashSpeed: number;
    dashDurationFrames: number;
    doubleTapWindowFrames: number;
  };
  match: { maxHealth: number; roundDurationFrames: number; roundCount: number; roundEndPauseFrames: number };
}

/** Configuração técnica de arena e rounds; valores provisórios, separados do kit do Shoto. */
export function createGameConfig(width: number, height: number): GameConfig {
  const arenaInset = 24;
  return {
    arena: {
      left: arenaInset,
      right: width - arenaInset,
      floorY: height - 88,
      maxSeparation: maximumFighterSeparation(width),
    },
    movement: {
      walkSpeed: 2,
      jumpImpulse: -11,
      gravity: 0.55,
      dashSpeed: 4.2,
      dashDurationFrames: 24,
      doubleTapWindowFrames: 12,
    },
    match: {
      maxHealth: 1000,
      roundDurationFrames: 99 * 60,
      roundCount: 2,
      roundEndPauseFrames: 90,
    },
  };
}
