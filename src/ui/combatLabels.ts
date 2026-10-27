import type { CharacterMode } from '../engine/characters/CharacterState';
import type { HitEvent } from '../engine/combat/AttackResolver';
import type { MoveDefinition } from '../engine/data/moves';
export const MODE_LABELS: Record<CharacterMode, string> = {
  neutral: 'NEUTRO', moving: 'MOVIMENTO', dashing: 'DASH', airborne: 'NO AR',
  crouching: 'AGACHADO', startup: 'PREPARO', active: 'ATIVO', recovery: 'RECUPERAÇÃO',
  knockdown: 'NO CHÃO', blocking: 'DEFESA', hitstun: 'ATORDOADO', blockstun: 'BLOQUEIO',
};
export function signedFrames(value: number): string { return `${value > 0 ? '+' : ''}${value}F`; }
export function moveInputLabel(move: MoveDefinition): string { return move.notation ?? move.input.buttons.join('+'); }
export function contactLabel(hit: HitEvent): string {
  const result = hit.outcome === 'block' ? 'BLOQUEADO' : hit.context === 'block-punish' ? 'PUNIÇÃO DE BLOQUEIO' :
    hit.context === 'whiff-punish' ? 'PUNIÇÃO DE ERRO' : hit.context === 'counter-hit' ? 'CONTRA-ATAQUE' : 'ACERTO';
  return `${hit.attackerId === 'player-1' ? 'P1' : 'P2'} ${result} · DANO ${hit.damage} · ADV ${signedFrames(hit.frameAdvantage)}`;
}
