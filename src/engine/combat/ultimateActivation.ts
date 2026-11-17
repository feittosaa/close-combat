/** Shared ultimate activation: extended preparation freezes world and round clock. */
export const ULTIMATE_ACTIVATION_FRAMES = 150;
export const SM0G_ULTIMATE_ACTIVATION_FRAMES = 75;
/** The victim stays in the hands through the spin and the last drawing, and only then flies off spinning. */
export const SM0G_ULTIMATE_HOLD_FRAMES = 74;
export const SM0G_ULTIMATE_SPIN_POSE_FRAMES = 4;
/** SM0G-000 keeps spinning through the middle drawings this long after the grab, then shows the last one briefly. */
export const SM0G_ULTIMATE_SPIN_FRAMES = 68;
/** Grounded recovery after the ultimate throw or punch lands. */
export const SM0G_ULTIMATE_GROUND_RECOVERY_FRAMES = 72;
/** The raised-hand drawing lasts until the victim is released. */
export const SM0G_ULTIMATE_LAST_FRAMES = SM0G_ULTIMATE_HOLD_FRAMES - SM0G_ULTIMATE_SPIN_FRAMES;
export interface UltimateActivation {
  ownerIds: readonly string[];
  elapsedFrames: number;
  remainingFrames: number;
}
export interface ExplosionState { x: number; y: number; remainingFrames: number; kind?: 'dynamite'; id?: number; ownerId?: string }
