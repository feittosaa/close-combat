/** Shared ultimate activation: six fixed ticks freeze world and round clock. */
export const ULTIMATE_ACTIVATION_FRAMES = 6;
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
