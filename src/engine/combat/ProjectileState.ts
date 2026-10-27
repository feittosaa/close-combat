import type { CharacterAttack } from '../characters/CharacterState';

/** Projectiles retain their own attack/contact state when the owner recovers or is interrupted. */
export interface ProjectileState {
  id: number;
  ownerId: string;
  fighterId: string;
  x: number;
  y: number;
  facing: 'left' | 'right';
  velocity: number;
  remainingFrames: number;
  visual: 'glass' | 'bottle' | 'molotov';
  attack: CharacterAttack;
}
