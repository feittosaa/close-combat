import { getPlayerLayout, keyLabel } from '../input/controlSettings';
import type { CharacterMode } from '../engine/characters/CharacterState';
import type { HitEvent } from '../engine/combat/AttackResolver';
import type { MoveDefinition } from '../engine/data/moves';

export const MODE_LABELS: Record<CharacterMode, string> = {
  neutral: 'NEUTRO', moving: 'MOVIMENTO', dashing: 'DASH', running: 'CORRIDA', airborne: 'NO AR',
  crouching: 'AGACHADO', startup: 'PREPARO', active: 'ATIVO', recovery: 'RECUPERAÇÃO',
  blocking: 'DEFESA', hitstun: 'ATORDOADO', blockstun: 'BLOQUEIO', grabbed: 'AGARRADO',
  throwRecovery: 'RECUPERAÇÃO DO AGARRÃO', knockdown: 'CAÍDO',
};

export function signedFrames(value: number): string {
  return `${value > 0 ? '+' : ''}${value}F`;
}

export function moveInputLabel(move: MoveDefinition): string {
  if (move.combat) return move.combat.command.notation;
  const direction = move.input.sequence?.join(',') ?? move.input.direction;
  return `${direction ? `${direction}+` : ''}${move.input.buttons.join('+')}`;
}

export function contactLabel(hit: HitEvent): string {
  const attacker = hit.attackerId === 'player-1' ? 'P1' : 'P2';
  if (hit.forcedFall) return `${attacker} · LIMITE DE LEVANTAMENTOS · QUEDA IMUNE`;
  if (hit.outcome === 'throw-start') return `${attacker} AGARRÃO · QUEBRA ${hit.breakButtons?.map(button=>keyLabel(getPlayerLayout(hit.targetId === 'player-1' ? 0 : 1).buttons[button])).join('+') ?? '—'}`;
  if (hit.outcome === 'throw-break') return 'AGARRÃO QUEBRADO';
  if (hit.outcome === 'parry' && hit.lowParry) return 'LOW PARRY · ALVO LANÇADO';
  if (hit.outcome === 'parry') return `PARRY · ATACANTE ATORDOADO ${hit.attackerStunFrames}F`;
  const result = hit.outcome === 'block' ? 'BLOQUEADO'
    : hit.outcome === 'throw' ? 'AGARRÃO'
    : hit.context === 'block-punish' ? 'PUNIÇÃO DE BLOQUEIO'
    : hit.context === 'whiff-punish' ? 'PUNIÇÃO DE ERRO'
    : hit.context === 'counter-hit' ? 'CONTRA-ATAQUE' : 'ACERTO';
  return `${attacker} ${result}${hit.damage ? ` · -${hit.damage}` : ''}${hit.frameAdvantage !== undefined ? ` · ADV ${signedFrames(hit.frameAdvantage)}` : hit.reaction === 'launch' ? ' · JUGGLE' : ''}`;
}
