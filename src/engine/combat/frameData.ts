import type { MoveDefinition } from '../data/moves';
import type { CharacterState } from '../characters/CharacterState';
export type HitContext = 'block-punish' | 'whiff-punish' | 'counter-hit';
/** Contagens excluem o frame de contato; positivo favorece o atacante. */
export function frameAdvantage(recovery: number, stun: number): number { return stun - recovery; }
export function classifyHitContext(target: CharacterState): HitContext | undefined {
  if (!target.attack) return undefined;
  if (target.mode === 'recovery') return target.attack.hitOutcome === 'block' ? 'block-punish' : !target.attack.hasHit ? 'whiff-punish' : undefined;
  if (target.mode === 'startup' || target.mode === 'active') return 'counter-hit';
  return undefined;
}
/** Recuperação nominal; rotas explicitamente cadastradas podem cancelar após contato. */
export function recoveryFrames(move: MoveDefinition): number { return move.recovery; }
