/** Shared ultimate activation: extended preparation freezes world and round clock. */
export const ULTIMATE_ACTIVATION_FRAMES = 150;
export const GRAPPLER_ULTIMATE_ACTIVATION_FRAMES = 75;
/** The victim stays in the hands through the spin and the last drawing, and only then flies off spinning. */
export const GRAPPLER_ULTIMATE_HOLD_FRAMES = 74;
export const GRAPPLER_ULTIMATE_SPIN_POSE_FRAMES = 4;
/** The Grappler keeps spinning through the middle drawings this long after the grab, then shows the last one briefly. */
export const GRAPPLER_ULTIMATE_SPIN_FRAMES = 68;
/** Grounded recovery after the ultimate throw or punch lands. */
export const GRAPPLER_ULTIMATE_GROUND_RECOVERY_FRAMES = 72;
/** The raised-hand drawing lasts until the victim is released. */
export const GRAPPLER_ULTIMATE_LAST_FRAMES = GRAPPLER_ULTIMATE_HOLD_FRAMES - GRAPPLER_ULTIMATE_SPIN_FRAMES;
export interface UltimateActivation {
  ownerIds: readonly string[];
  elapsedFrames: number;
  remainingFrames: number;
}
export interface ExplosionState { x: number; y: number; remainingFrames: number; kind?: 'dynamite'; id?: number; ownerId?: string }
