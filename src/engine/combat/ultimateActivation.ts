/** Shared ultimate activation: extended preparation freezes world and round clock. */
export const ULTIMATE_ACTIVATION_FRAMES = 150;
export interface UltimateActivation {
  ownerIds: readonly string[];
  elapsedFrames: number;
  remainingFrames: number;
}
export interface PendingUltimateLighter {
  ownerId: string;
  targetId: string;
  fighterId: string;
  moveId: string;
  remainingFrames: number;
}
export interface ExplosionState { x: number; y: number; remainingFrames: number }
