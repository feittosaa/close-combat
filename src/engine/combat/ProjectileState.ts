import type { CharacterAttack } from '../characters/CharacterState';

/** Projectiles retain their own attack/contact state when the owner recovers or is interrupted. */
export interface ProjectileState {
  id: number;
  ownerId: string;
  comboId?: number;
  comboStep?: number;
  volleyStep?: number;
  fighterId: string;
  x: number;
  y: number;
  facing: 'left' | 'right';
  velocity: number;
  verticalVelocity?: number;
  gravity?: number;
  remainingFrames: number;
  visual: 'tomato' | 'crow' | 'bullet' | 'volley' | 'dynamite';
  attack: CharacterAttack;
}
