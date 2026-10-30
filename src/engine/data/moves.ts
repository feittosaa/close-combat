import type { AttackButton, Direction } from '../../input/types';

export type HitLevel = 'high' | 'mid' | 'low';

/** Dados de combate e parâmetros provisórios de um golpe, separados da arte. */
export interface MoveDefinition {
  id: string;
  name: string;
  input: { buttons: readonly AttackButton[]; sequence?: readonly Direction[] };
  notation?: string;
  category?: 'basic' | 'crouching' | 'power' | 'throw' | 'special' | 'ultimate';
  crouching?: boolean;
  airborne?: boolean;
  /** Existing artwork only; this is a temporary pose alias, never new animation. */
  pose?: 'light-punch' | 'heavy-punch' | 'light-kick' | 'heavy-kick';
  movement?: { speed: number; until: number; launch?: number };
  invulnerability?: { kind: 'all' | 'projectile'; until: number };
  projectile?: { speed: number; life: number; verticalSpeed?: number; gravity?: number; visual: 'glass' | 'bottle' | 'molotov' | 'bullet' };
  ultimateSequence?: { lighterHitbox: MoveDefinition['hitbox']; lighterDelay: number; lighterSpeed: number; confirmStun: number; knockbackSpeed: number; launchSpeed: number; knockdownFrames: number };
  rageCost?: number;
  startup: number;
  activeFrames: number;
  recovery: number;
  damage: number;
  hitstun: number;
  blockstun: number;
  pushback: { hit: number; block: number };
  hitLevel: HitLevel;
  hitbox: { forward: number; yOffset: number; width: number; height: number };
}
