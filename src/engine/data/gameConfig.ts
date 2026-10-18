// src/engine/data/gameConfig.ts
export interface GameConfig {
  arena: { left: number; right: number; floorY: number };
  movement: {
    bodyWidth: number;
    walkSpeed: number;
    jumpImpulse: number;
    gravity: number;
    dashSpeed: number;
    dashDurationFrames: number;
    doubleTapWindowFrames: number;
  };
  match: { maxHealth: number; roundDurationFrames: number; roundCount: number };
}

/** Valores temporários de protótipo documentados em base.md §20. */
export function createGameConfig(width: number, height: number): GameConfig {
  const arenaInset = 24;
  return {
    arena: {
      left: arenaInset,
      right: width - arenaInset,
      floorY: height - 88,
    },
    movement: {
      bodyWidth: 54,
      walkSpeed: 3,
      jumpImpulse: -11,
      gravity: 0.55,
      dashSpeed: 8,
      dashDurationFrames: 8,
      doubleTapWindowFrames: 12,
    },
    match: {
      maxHealth: 1000,
      roundDurationFrames: 99 * 60,
      roundCount: 2,
    },
  };
}
