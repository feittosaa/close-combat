import type { AttackButton } from '../../input/types';

export type HitLevel = 'high' | 'mid' | 'low';

/** Dados locais de um golpe básico. Não contém strings, cancelamentos ou recursos antigos. */
export interface MoveDefinition {
  id: string;
  name: string;
  input: { buttons: readonly AttackButton[] };
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
